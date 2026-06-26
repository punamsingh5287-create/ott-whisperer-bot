import { createFileRoute } from '@tanstack/react-router';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createHash, timingSafeEqual } from 'crypto';

const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';

function deriveTelegramWebhookSecret(telegramApiKey: string): string {
  return createHash('sha256')
    .update(`telegram-webhook:${telegramApiKey}`)
    .digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

let _supabase: SupabaseClient | null = null;
function getSupabase() {
  if (!_supabase) {
    _supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
  }
  return _supabase;
}

async function sendMessage(chatId: number, text: string, replyMarkup?: unknown) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) return;
  await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': TELEGRAM_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      reply_markup: replyMarkup,
    }),
  });
}

async function answerCallback(callbackId: string, text?: string) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) return;
  await fetch(`${GATEWAY_URL}/answerCallbackQuery`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      'X-Connection-Api-Key': TELEGRAM_API_KEY,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ callback_query_id: callbackId, text }),
  });
}

async function upsertBotUser(from: {
  id: number;
  username?: string;
  first_name?: string;
}) {
  const supabase = getSupabase();
  // Try update first to bump last_active without overwriting joined_at/is_subscribed
  const { data: existing } = await supabase
    .from('bot_users')
    .select('id')
    .eq('telegram_id', from.id)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('bot_users')
      .update({
        username: from.username ?? null,
        first_name: from.first_name ?? null,
        last_active: new Date().toISOString(),
      })
      .eq('telegram_id', from.id);
    return existing.id as string;
  }

  const { data: inserted, error } = await supabase
    .from('bot_users')
    .insert({
      telegram_id: from.id,
      username: from.username ?? null,
      first_name: from.first_name ?? null,
    })
    .select('id')
    .single();
  if (error) throw error;
  return inserted.id as string;
}

async function listPlansKeyboard() {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('pricing_plans')
    .select('id, name, price, duration_days')
    .eq('is_active', true)
    .order('price', { ascending: true });
  const plans = data ?? [];
  return {
    plans,
    keyboard: {
      inline_keyboard: plans.map((p) => [
        {
          text: `${p.name} — ₹${p.price} / ${p.duration_days}d`,
          callback_data: `buy:${p.id}`,
        },
      ]),
    },
  };
}

async function handleMessage(message: any) {
  if (!message?.from?.id || !message?.chat?.id) return;
  const botUserId = await upsertBotUser(message.from);
  const text: string = message.text ?? '';
  const chatId = message.chat.id;

  if (text.startsWith('/start')) {
    await sendMessage(
      chatId,
      `👋 Welcome to <b>OTT Bot</b>!\n\nBrowse plans with /plans, see catalog with /catalog.`,
    );
    return;
  }

  if (text.startsWith('/plans') || text.startsWith('/buy')) {
    const { plans, keyboard } = await listPlansKeyboard();
    if (plans.length === 0) {
      await sendMessage(chatId, 'No plans available right now.');
      return;
    }
    await sendMessage(chatId, '💎 <b>Choose a plan:</b>', keyboard);
    return;
  }

  if (text.startsWith('/catalog')) {
    const { data } = await getSupabase()
      .from('ott_content')
      .select('title, content_type, category')
      .eq('is_active', true)
      .limit(20);
    const lines = (data ?? []).map(
      (c) => `• <b>${c.title}</b> (${c.content_type}${c.category ? ` · ${c.category}` : ''})`,
    );
    await sendMessage(
      chatId,
      lines.length ? `🎬 <b>Catalog</b>\n\n${lines.join('\n')}` : 'Catalog is empty.',
    );
    return;
  }

  // Default: log activity (already bumped via upsertBotUser)
  void botUserId;
}

async function handleCallback(cb: any) {
  if (!cb?.from?.id || !cb?.message?.chat?.id) return;
  const botUserId = await upsertBotUser(cb.from);
  const chatId = cb.message.chat.id;
  const data: string = cb.data ?? '';

  if (data.startsWith('buy:')) {
    const planId = data.slice(4);
    const supabase = getSupabase();
    const { data: plan } = await supabase
      .from('pricing_plans')
      .select('id, name, price')
      .eq('id', planId)
      .maybeSingle();
    if (!plan) {
      await answerCallback(cb.id, 'Plan not found');
      return;
    }
    // Record conversion + flip subscription
    await supabase.from('conversions').insert({
      bot_user_id: botUserId,
      plan_id: plan.id,
      amount: plan.price,
      status: 'completed',
    });
    await supabase
      .from('bot_users')
      .update({ is_subscribed: true })
      .eq('id', botUserId);

    await answerCallback(cb.id, 'Subscribed!');
    await sendMessage(
      chatId,
      `✅ You're subscribed to <b>${plan.name}</b>. Enjoy! 🎉`,
    );
    return;
  }

  await answerCallback(cb.id);
}

export const Route = createFileRoute('/api/public/telegram/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
        if (!TELEGRAM_API_KEY) {
          return new Response('Not configured', { status: 500 });
        }

        const expected = deriveTelegramWebhookSecret(TELEGRAM_API_KEY);
        const actual = request.headers.get('X-Telegram-Bot-Api-Secret-Token') ?? '';
        if (!safeEqual(actual, expected)) {
          return new Response('Unauthorized', { status: 401 });
        }

        let update: any;
        try {
          update = await request.json();
        } catch {
          return new Response('Bad request', { status: 400 });
        }

        try {
          if (update.message || update.edited_message) {
            await handleMessage(update.message ?? update.edited_message);
          } else if (update.callback_query) {
            await handleCallback(update.callback_query);
          }
        } catch (e) {
          console.error('telegram webhook error', e);
          // 200 to avoid Telegram retries on app bugs
        }

        return Response.json({ ok: true });
      },
    },
  },
});
