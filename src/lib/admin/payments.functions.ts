import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc('has_role', { _user_id: ctx.userId, _role: 'admin' });
  if (!data) throw new Error('Forbidden');
}

/* ───── WALLETS ───────────────────────────────────────────────── */
const walletInput = z.object({
  id: z.string().uuid().optional(),
  network: z.enum(['USDT_TRC20', 'USDT_BEP20', 'SOL']),
  address: z.string().min(4).max(200),
  label: z.string().max(80).optional().nullable(),
  qr_url: z.string().url().optional().nullable(),
  is_active: z.boolean().default(true),
});

export const listWallets = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase.from('wallets').select('*').order('network');
    return data ?? [];
  });

export const upsertWallet = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => walletInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from('wallets').upsert(data);
    if (error) throw error;
    return { ok: true };
  });

export const deleteWallet = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await context.supabase.from('wallets').delete().eq('id', data.id);
    return { ok: true };
  });

/* ───── PAYMENTS ──────────────────────────────────────────────── */
export const listPayments = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ status: z.enum(['pending', 'approved', 'rejected', 'all']).default('pending') }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from('payments')
      .select('*, orders(id, status, products(name, fallback_emoji)), bot_users(telegram_id, username, first_name)')
      .order('created_at', { ascending: false }).limit(200);
    if (data.status !== 'all') q = q.eq('status', data.status);
    const { data: rows } = await q;
    // Sign screenshot urls
    const out: any[] = [];
    for (const r of (rows ?? []) as any[]) {
      let signed: string | null = null;
      if (r.screenshot_url) {
        const { data: s } = await context.supabase.storage.from('payment-proofs')
          .createSignedUrl(r.screenshot_url, 60 * 60);
        signed = s?.signedUrl ?? null;
      }
      out.push({ ...r, screenshot_signed_url: signed });
    }
    return out;
  });

export const reviewPayment = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({
    id: z.string().uuid(),
    action: z.enum(['approve', 'reject']),
    note: z.string().max(500).optional().nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const note = data.note ?? '';
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    if (data.action === 'approve') {
      const { data: res, error } = await supabaseAdmin.rpc('approve_payment', {
        _payment_id: data.id, _admin_id: context.userId, _note: note,
      });
      if (error) throw error;
      const row: any = Array.isArray(res) ? res[0] : res;
      if (row?.error === 'expired') throw new Error('Payment expired — cannot approve.');
      if (row?.error === 'payment_not_found') throw new Error('Payment not found.');
    } else {
      const { error } = await supabaseAdmin.rpc('reject_payment', {
        _payment_id: data.id, _admin_id: context.userId, _note: note,
      });
      if (error) throw error;
    }
    try {
      const { notifyPaymentReviewed } = await import('@/lib/telegram/router.server');
      await notifyPaymentReviewed(data.id, data.action === 'approve', note ?? undefined);
    } catch (e) { console.error('notify failed', e); }
    return { ok: true };
  });


/* ───── EMOJIS ────────────────────────────────────────────────── */
const emojiInput = z.object({
  id: z.string().uuid().optional(),
  key: z.string().min(1).max(60).regex(/^[a-z0-9_]+$/),
  name: z.string().min(1).max(80),
  premium_emoji_id: z.string().max(40).nullable().optional(),
  fallback_emoji: z.string().min(1).max(8),
  scope: z.enum(['button', 'product', 'category', 'system']).default('button'),
  label: z.string().max(120).nullable().optional(),
});


export const listEmojis = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase.from('emoji_presets').select('*').order('scope').order('key');
    return data ?? [];
  });

export const upsertEmoji = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => emojiInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from('emoji_presets').upsert({
      ...data,
      premium_emoji_id: data.premium_emoji_id || null,
      label: data.label ?? null,
    }, { onConflict: 'key' });
    if (error) throw error;
    try {
      const { clearEmojiCache } = await import('@/lib/telegram/emoji');
      clearEmojiCache();
    } catch {}
    return { ok: true };
  });


export const deleteEmoji = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await context.supabase.from('emoji_presets').delete().eq('id', data.id);
    return { ok: true };
  });

/* ───── BRANDING ──────────────────────────────────────────────── */
const brandingInput = z.object({
  site_name: z.string().max(80).optional(),
  panel_title: z.string().max(80).optional(),
  footer_text: z.string().max(200).optional(),
  logo_url: z.string().nullable().optional(),
  panel_logo_url: z.string().nullable().optional(),
  bot_logo_url: z.string().nullable().optional(),
  favicon_url: z.string().nullable().optional(),
});

export const updateBranding = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => brandingInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from('settings').update(data).eq('id', 1);
    if (error) throw error;
    return { ok: true };
  });

/** Public branding (used by __root.tsx loader) — exposes only display fields. */
export const getPublicBranding = createServerFn({ method: 'GET' })
  .handler(async () => {
    const { createClient } = await import('@supabase/supabase-js');
    const supa = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_PUBLISHABLE_KEY!, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data } = await supa.from('settings')
      .select('site_name, panel_title, footer_text, logo_url, panel_logo_url, favicon_url')
      .eq('id', 1).maybeSingle();
    return data ?? null;
  });
