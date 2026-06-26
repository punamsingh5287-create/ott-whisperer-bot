import { db } from './db.server';
import { sendMessage, sendPhoto, editMessage, answerCallback, getMe, type InlineKeyboard } from './gateway.server';
import { renderEmoji, escapeHtml } from './emoji';

type TgUser = { id: number; username?: string; first_name?: string };

/* ─── helpers ─────────────────────────────────────────────────────── */

function genReferralCode(telegramId: number) {
  return `R${telegramId.toString(36).toUpperCase()}`;
}

async function upsertBotUser(from: TgUser, startPayload?: string): Promise<string> {
  const supabase = db();
  const { data: existing } = await supabase
    .from('bot_users')
    .select('id, referral_code, referred_by')
    .eq('telegram_id', from.id)
    .maybeSingle();

  if (existing) {
    await supabase.from('bot_users').update({
      username: from.username ?? null,
      first_name: from.first_name ?? null,
      last_active: new Date().toISOString(),
    }).eq('telegram_id', from.id);
    return existing.id as string;
  }

  // Referral attribution
  let referredBy: string | null = null;
  if (startPayload?.startsWith('R')) {
    const { data: ref } = await supabase
      .from('bot_users')
      .select('id')
      .eq('referral_code', startPayload)
      .maybeSingle();
    if (ref) referredBy = ref.id as string;
  }

  const { data: inserted, error } = await supabase
    .from('bot_users')
    .insert({
      telegram_id: from.id,
      username: from.username ?? null,
      first_name: from.first_name ?? null,
      referral_code: genReferralCode(from.id),
      referred_by: referredBy,
    })
    .select('id')
    .single();
  if (error) throw error;

  if (referredBy) {
    await supabase.from('referrals').insert({
      referrer_bot_user_id: referredBy,
      referred_bot_user_id: inserted.id,
    });
  }
  return inserted.id as string;
}

async function getSettings() {
  const { data } = await db().from('settings').select('*').eq('id', 1).maybeSingle();
  return data ?? { welcome_text: 'Welcome!', support_handle: '@support', bot_name: 'OTT Store', bot_username: null };
}

/* ─── menus ───────────────────────────────────────────────────────── */

function mainMenu(): InlineKeyboard {
  return {
    inline_keyboard: [
      [{ text: '🗂 Categories', callback_data: 'menu:cats' }, { text: '🔎 Search', callback_data: 'menu:search' }],
      [{ text: '🧾 My Orders', callback_data: 'menu:orders' }, { text: '👤 Profile', callback_data: 'menu:profile' }],
      [{ text: '🎁 Referrals', callback_data: 'menu:ref' }, { text: '💬 Support', callback_data: 'menu:support' }],
    ],
  };
}

function backMenu(): InlineKeyboard {
  return { inline_keyboard: [[{ text: '« Back to menu', callback_data: 'menu:home' }]] };
}

/* ─── views ───────────────────────────────────────────────────────── */

async function viewHome(chatId: number, name?: string) {
  const s = await getSettings();
  const greet = name ? `, <b>${escapeHtml(name)}</b>` : '';
  const text =
    `✨ <b>${escapeHtml(s.bot_name || 'OTT & AI Store')}</b>\n\n` +
    `Hey${greet}! ${escapeHtml(s.welcome_text || '')}\n\n` +
    `Browse our catalog of premium <b>OTT</b>, <b>AI</b>, <b>Gaming</b> & <b>Utility</b> subscriptions. Instant delivery, low prices, lifetime support.\n\n` +
    `Pick an option below 👇`;
  await sendMessage(chatId, text, { reply_markup: mainMenu() });
}

async function viewCategories(chatId: number, messageId?: number) {
  const { data } = await db()
    .from('categories')
    .select('id, name, icon_emoji')
    .eq('is_active', true)
    .order('sort_order');
  const cats = data ?? [];
  const kb: InlineKeyboard = {
    inline_keyboard: [
      ...cats.map((c) => [{ text: `${c.icon_emoji || '📦'}  ${c.name}`, callback_data: `cat:${c.id}` }]),
      [{ text: '« Back', callback_data: 'menu:home' }],
    ],
  };
  const text = '🗂 <b>Categories</b>\n\nChoose a category to browse:';
  if (messageId) await editMessage(chatId, messageId, text, kb);
  else await sendMessage(chatId, text, { reply_markup: kb });
}

async function viewCategoryProducts(chatId: number, categoryId: string, messageId?: number) {
  const supabase = db();
  const [{ data: cat }, { data: prods }] = await Promise.all([
    supabase.from('categories').select('name, icon_emoji').eq('id', categoryId).maybeSingle(),
    supabase
      .from('products')
      .select('id, name, price, fallback_emoji, premium_emoji_id, stock')
      .eq('category_id', categoryId)
      .eq('status', 'active')
      .order('sort_order')
      .limit(50),
  ]);
  const items = prods ?? [];
  const kb: InlineKeyboard = {
    inline_keyboard: [
      ...items.map((p) => [{
        text: `${p.fallback_emoji || '✨'}  ${p.name}  —  ₹${p.price}${p.stock <= 0 ? '  (sold out)' : ''}`,
        callback_data: `prod:${p.id}`,
      }]),
      [{ text: '« Back', callback_data: 'menu:cats' }],
    ],
  };
  const header = `${cat?.icon_emoji || '📦'} <b>${escapeHtml(cat?.name || 'Products')}</b>`;
  const text = items.length
    ? `${header}\n\nTap a product for details:`
    : `${header}\n\nNo products available yet.`;
  if (messageId) await editMessage(chatId, messageId, text, kb);
  else await sendMessage(chatId, text, { reply_markup: kb });
}

async function viewProduct(chatId: number, productId: string) {
  const { data: p } = await db()
    .from('products')
    .select('*, categories(name, icon_emoji)')
    .eq('id', productId)
    .maybeSingle();
  if (!p) {
    await sendMessage(chatId, '⚠️ Product not found.', { reply_markup: backMenu() });
    return;
  }
  const emoji = renderEmoji(p.premium_emoji_id, p.fallback_emoji);
  const stockLine = p.stock > 0 ? `✅ In stock (${p.stock})` : `⛔ Out of stock`;
  const tagLine = (p.tags && p.tags.length) ? `\n🏷 ${p.tags.map((t: string) => `<code>${escapeHtml(t)}</code>`).join(' ')}` : '';
  const caption =
    `${emoji}  <b>${escapeHtml(p.name)}</b>\n\n` +
    `${escapeHtml(p.description || '')}\n\n` +
    `💰 <b>₹${p.price}</b>\n` +
    `⏳ ${p.duration_days} days\n` +
    `${stockLine}${tagLine}`;
  const kb: InlineKeyboard = {
    inline_keyboard: [
      ...(p.stock > 0 ? [[{ text: `🛒 Buy now — ₹${p.price}`, callback_data: `buy:${p.id}` }]] : []),
      [{ text: '« Back', callback_data: p.category_id ? `cat:${p.category_id}` : 'menu:cats' }],
    ],
  };
  if (p.image_url) await sendPhoto(chatId, p.image_url, caption, kb);
  else await sendMessage(chatId, caption, { reply_markup: kb });
}

async function buyProduct(chatId: number, productId: string, botUserId: string, callbackId: string) {
  const { data, error } = await db().rpc('purchase_product', {
    _product_id: productId,
    _bot_user_id: botUserId,
  });
  const row = Array.isArray(data) ? data[0] : data;
  if (error || !row || row.error) {
    const msg = row?.error === 'out_of_stock' ? 'Out of stock 😔'
      : row?.error === 'inactive' ? 'Product unavailable'
      : 'Purchase failed';
    await answerCallback(callbackId, msg, true);
    return;
  }
  await answerCallback(callbackId, '✅ Confirmed!');
  await sendMessage(
    chatId,
    `🎉 <b>Order confirmed!</b>\n\n` +
    `<b>${escapeHtml(row.product_name)}</b>\n` +
    `Amount: ₹${row.amount}\n` +
    `Order ID: <code>${row.order_id.slice(0, 8)}</code>\n\n` +
    `Your credentials will be delivered shortly. Reach out via Support if you need help.`,
    { reply_markup: mainMenu() },
  );
}

async function viewOrders(chatId: number, botUserId: string) {
  const { data } = await db()
    .from('orders')
    .select('id, amount, status, created_at, products(name, fallback_emoji)')
    .eq('bot_user_id', botUserId)
    .order('created_at', { ascending: false })
    .limit(10);
  const rows = data ?? [];
  const lines = rows.length
    ? rows.map((o: any) => {
        const d = new Date(o.created_at).toLocaleDateString();
        return `${o.products?.fallback_emoji || '🧾'} <b>${escapeHtml(o.products?.name || 'Product')}</b> — ₹${o.amount} · ${o.status} · ${d}`;
      }).join('\n')
    : 'You have no orders yet.';
  await sendMessage(chatId, `🧾 <b>Your last orders</b>\n\n${lines}`, { reply_markup: backMenu() });
}

async function viewProfile(chatId: number, botUserId: string) {
  const { data: u } = await db()
    .from('bot_users')
    .select('first_name, username, joined_at, total_spent, is_subscribed, referral_code')
    .eq('id', botUserId)
    .maybeSingle();
  if (!u) return;
  const joined = new Date(u.joined_at).toLocaleDateString();
  await sendMessage(
    chatId,
    `👤 <b>Your Profile</b>\n\n` +
    `Name: ${escapeHtml(u.first_name || '—')}\n` +
    `Username: @${escapeHtml(u.username || '—')}\n` +
    `Joined: ${joined}\n` +
    `Total spent: ₹${u.total_spent}\n` +
    `Status: ${u.is_subscribed ? '⭐ Active' : '⚪ Free'}\n` +
    `Referral code: <code>${u.referral_code}</code>`,
    { reply_markup: backMenu() },
  );
}

async function viewReferrals(chatId: number, botUserId: string) {
  const supabase = db();
  const [{ data: u }, { count }, settings] = await Promise.all([
    supabase.from('bot_users').select('referral_code').eq('id', botUserId).maybeSingle(),
    supabase.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_bot_user_id', botUserId),
    getSettings(),
  ]);
  const username = settings.bot_username;
  const link = username
    ? `https://t.me/${username.replace(/^@/, '')}?start=${u?.referral_code}`
    : `Share your code: ${u?.referral_code}`;
  await sendMessage(
    chatId,
    `🎁 <b>Referrals</b>\n\n` +
    `Invite friends and earn rewards on every paid order.\n\n` +
    `Your code: <code>${u?.referral_code}</code>\n` +
    `Invited: <b>${count ?? 0}</b>\n\n` +
    (username ? `Share link:\n${link}` : `<i>${link}</i>`),
    { reply_markup: backMenu() },
  );
}

async function viewSupport(chatId: number, botUserId: string) {
  await db().from('bot_users').update({
    pending_action: { type: 'support_message' },
  }).eq('id', botUserId);
  const s = await getSettings();
  await sendMessage(
    chatId,
    `💬 <b>Support</b>\n\nSend your message in the next reply and our team will respond. You can also reach us at ${escapeHtml(s.support_handle || '@support')}.`,
    { reply_markup: backMenu() },
  );
}

async function viewSearchPrompt(chatId: number, botUserId: string) {
  await db().from('bot_users').update({
    pending_action: { type: 'search' },
  }).eq('id', botUserId);
  await sendMessage(chatId, '🔎 <b>Search</b>\n\nSend a keyword (e.g. <i>netflix</i>, <i>chatgpt</i>) and I will look it up.', { reply_markup: backMenu() });
}

async function runSearch(chatId: number, query: string) {
  const q = `%${query.replace(/[%_]/g, '')}%`;
  const { data } = await db()
    .from('products')
    .select('id, name, price, fallback_emoji, stock')
    .or(`name.ilike.${q},description.ilike.${q}`)
    .eq('status', 'active')
    .limit(20);
  const items = data ?? [];
  const kb: InlineKeyboard = {
    inline_keyboard: [
      ...items.map((p) => [{
        text: `${p.fallback_emoji || '✨'}  ${p.name} — ₹${p.price}`,
        callback_data: `prod:${p.id}`,
      }]),
      [{ text: '« Menu', callback_data: 'menu:home' }],
    ],
  };
  await sendMessage(
    chatId,
    items.length ? `🔎 Results for "<b>${escapeHtml(query)}</b>":` : `No matches for "<b>${escapeHtml(query)}</b>".`,
    { reply_markup: kb },
  );
}

async function captureSupportMessage(chatId: number, botUserId: string, body: string) {
  const supabase = db();
  // Reuse open ticket or open a new one
  const { data: open } = await supabase
    .from('support_tickets')
    .select('id')
    .eq('bot_user_id', botUserId)
    .eq('status', 'open')
    .maybeSingle();
  let ticketId = open?.id as string | undefined;
  if (!ticketId) {
    const { data: t } = await supabase
      .from('support_tickets')
      .insert({ bot_user_id: botUserId, subject: body.slice(0, 80), last_message: body })
      .select('id')
      .single();
    ticketId = t!.id as string;
  } else {
    await supabase.from('support_tickets').update({
      last_message: body,
      updated_at: new Date().toISOString(),
    }).eq('id', ticketId);
  }
  await supabase.from('support_messages').insert({
    ticket_id: ticketId,
    from_admin: false,
    body,
  });
  await supabase.from('bot_users').update({ pending_action: null }).eq('id', botUserId);
  await sendMessage(chatId, '✅ Got it — our team will get back to you here.', { reply_markup: backMenu() });
}

/* ─── entry points ────────────────────────────────────────────────── */

export async function handleMessage(message: any) {
  if (!message?.from?.id || !message?.chat?.id) return;
  const chatId = message.chat.id;
  const text: string = message.text ?? '';
  const startPayload = text.startsWith('/start') ? text.split(' ')[1] : undefined;
  const botUserId = await upsertBotUser(message.from, startPayload);

  // Pending actions (search / support reply)
  const { data: u } = await db().from('bot_users').select('pending_action').eq('id', botUserId).maybeSingle();
  const pending = u?.pending_action as { type?: string } | null;
  if (pending?.type && !text.startsWith('/')) {
    if (pending.type === 'search') {
      await db().from('bot_users').update({ pending_action: null }).eq('id', botUserId);
      await runSearch(chatId, text);
      return;
    }
    if (pending.type === 'support_message') {
      await captureSupportMessage(chatId, botUserId, text);
      return;
    }
  }

  if (text.startsWith('/start')) { await viewHome(chatId, message.from.first_name); return; }
  if (text.startsWith('/menu')) { await viewHome(chatId, message.from.first_name); return; }
  if (text.startsWith('/categories')) { await viewCategories(chatId); return; }
  if (text.startsWith('/orders')) { await viewOrders(chatId, botUserId); return; }
  if (text.startsWith('/profile')) { await viewProfile(chatId, botUserId); return; }
  if (text.startsWith('/referrals')) { await viewReferrals(chatId, botUserId); return; }
  if (text.startsWith('/support')) { await viewSupport(chatId, botUserId); return; }
  if (text.startsWith('/search')) {
    const q = text.slice(7).trim();
    if (q) await runSearch(chatId, q);
    else await viewSearchPrompt(chatId, botUserId);
    return;
  }

  // Default: nudge with menu
  await viewHome(chatId, message.from.first_name);
}

export async function handleCallback(cb: any) {
  if (!cb?.from?.id || !cb?.message?.chat?.id) return;
  const chatId = cb.message.chat.id;
  const messageId = cb.message.message_id;
  const data: string = cb.data ?? '';
  const botUserId = await upsertBotUser(cb.from);

  if (data === 'menu:home') { await answerCallback(cb.id); await viewHome(chatId, cb.from.first_name); return; }
  if (data === 'menu:cats') { await answerCallback(cb.id); await viewCategories(chatId, messageId); return; }
  if (data === 'menu:search') { await answerCallback(cb.id); await viewSearchPrompt(chatId, botUserId); return; }
  if (data === 'menu:orders') { await answerCallback(cb.id); await viewOrders(chatId, botUserId); return; }
  if (data === 'menu:profile') { await answerCallback(cb.id); await viewProfile(chatId, botUserId); return; }
  if (data === 'menu:ref') { await answerCallback(cb.id); await viewReferrals(chatId, botUserId); return; }
  if (data === 'menu:support') { await answerCallback(cb.id); await viewSupport(chatId, botUserId); return; }

  if (data.startsWith('cat:')) {
    await answerCallback(cb.id);
    await viewCategoryProducts(chatId, data.slice(4), messageId);
    return;
  }
  if (data.startsWith('prod:')) {
    await answerCallback(cb.id);
    await viewProduct(chatId, data.slice(5));
    return;
  }
  if (data.startsWith('buy:')) {
    await buyProduct(chatId, data.slice(4), botUserId, cb.id);
    return;
  }

  await answerCallback(cb.id);
}

/* ─── bot username sync (used at boot) ────────────────────────────── */

export async function syncBotUsername() {
  try {
    const me = await getMe();
    const username = me?.result?.username;
    if (username) {
      await db().from('settings').update({ bot_username: username }).eq('id', 1);
    }
  } catch (e) {
    console.error('syncBotUsername failed', e);
  }
}
