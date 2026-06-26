import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc('has_role', { _user_id: ctx.userId, _role: 'admin' });
  if (!data) throw new Error('Forbidden');
}

/* ─── overview ────────────────────────────────────────────────────── */

export const getOverview = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const s = context.supabase;
    const since7 = new Date(Date.now() - 7 * 86400e3).toISOString();
    const since14 = new Date(Date.now() - 14 * 86400e3).toISOString();

    const [users, active, subs, orders, revenue, products, topProducts, joins14] = await Promise.all([
      s.from('bot_users').select('*', { count: 'exact', head: true }),
      s.from('bot_users').select('*', { count: 'exact', head: true }).gte('last_active', since7),
      s.from('bot_users').select('*', { count: 'exact', head: true }).eq('is_subscribed', true),
      s.from('orders').select('*', { count: 'exact', head: true }),
      s.from('orders').select('amount').eq('status', 'confirmed'),
      s.from('products').select('*', { count: 'exact', head: true }),
      s.from('orders').select('product_id, amount, products(name, fallback_emoji)').gte('created_at', since14),
      s.from('bot_users').select('joined_at').gte('joined_at', since14),
    ]);

    const totalRevenue = (revenue.data ?? []).reduce((a: number, r: any) => a + Number(r.amount), 0);

    // Top products
    const top = new Map<string, { name: string; emoji: string; count: number; revenue: number }>();
    for (const o of (topProducts.data ?? []) as any[]) {
      const id = o.product_id;
      if (!id) continue;
      const cur = top.get(id) ?? { name: o.products?.name ?? 'Unknown', emoji: o.products?.fallback_emoji ?? '✨', count: 0, revenue: 0 };
      cur.count += 1;
      cur.revenue += Number(o.amount);
      top.set(id, cur);
    }
    const topList = [...top.values()].sort((a, b) => b.count - a.count).slice(0, 5);

    // Daily joins (14d)
    const dayMap: Record<string, number> = {};
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400e3).toISOString().slice(0, 10);
      dayMap[d] = 0;
    }
    for (const u of (joins14.data ?? []) as any[]) {
      const d = String(u.joined_at).slice(0, 10);
      if (d in dayMap) dayMap[d] += 1;
    }
    const daily = Object.entries(dayMap).map(([date, count]) => ({ date, count }));

    return {
      totalUsers: users.count ?? 0,
      activeUsers: active.count ?? 0,
      subscribers: subs.count ?? 0,
      totalOrders: orders.count ?? 0,
      revenue: totalRevenue,
      products: products.count ?? 0,
      conversionRate: users.count ? Math.round(((subs.count ?? 0) / users.count) * 1000) / 10 : 0,
      topProducts: topList,
      dailyJoins: daily,
    };
  });

/* ─── categories ──────────────────────────────────────────────────── */

const categoryInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(80).regex(/^[a-z0-9-]+$/),
  icon_emoji: z.string().max(8).optional().nullable(),
  sort_order: z.number().int().default(0),
  is_active: z.boolean().default(true),
});

export const listCategories = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase.from('categories').select('*').order('sort_order');
    return data ?? [];
  });

export const upsertCategory = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => categoryInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from('categories').upsert(data);
    if (error) throw error;
    return { ok: true };
  });

export const deleteCategory = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await context.supabase.from('categories').delete().eq('id', data.id);
    return { ok: true };
  });

/* ─── products ────────────────────────────────────────────────────── */

const productInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(120),
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional().nullable(),
  category_id: z.string().uuid().nullable(),
  price: z.number().nonnegative(),
  duration_days: z.number().int().nonnegative(),
  stock: z.number().int().nonnegative(),
  status: z.enum(['active', 'disabled']).default('active'),
  image_url: z.string().url().nullable().optional(),
  tags: z.array(z.string().max(30)).max(10).default([]),
  premium_emoji_id: z.string().max(40).nullable().optional(),
  fallback_emoji: z.string().max(8).nullable().optional(),
  sort_order: z.number().int().default(0),
});

export const listProducts = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from('products')
      .select('*, categories(name, icon_emoji)')
      .order('sort_order')
      .order('created_at', { ascending: false });
    return data ?? [];
  });

export const upsertProduct = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => productInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from('products').upsert(data);
    if (error) throw error;
    return { ok: true };
  });

export const deleteProduct = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await context.supabase.from('products').delete().eq('id', data.id);
    return { ok: true };
  });

/* ─── orders ──────────────────────────────────────────────────────── */

export const listOrders = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from('orders')
      .select('*, products(name, fallback_emoji), bot_users(telegram_id, username, first_name)')
      .order('created_at', { ascending: false })
      .limit(200);
    return data ?? [];
  });

export const setOrderStatus = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({
      id: z.string().uuid(),
      status: z.enum(['awaiting_payment', 'pending_review', 'pending', 'confirmed', 'delivered', 'cancelled']),
    }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await context.supabase.from('orders').update({ status: data.status }).eq('id', data.id);
    return { ok: true };
  });

/* ─── users ───────────────────────────────────────────────────────── */

export const listBotUsers = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from('bot_users')
      .select('*')
      .order('joined_at', { ascending: false })
      .limit(500);
    return data ?? [];
  });

export const toggleBan = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), banned: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await context.supabase.from('bot_users').update({ is_banned: data.banned }).eq('id', data.id);
    return { ok: true };
  });

/* ─── broadcasts ──────────────────────────────────────────────────── */

const broadcastInput = z.object({
  title: z.string().min(1).max(120),
  message: z.string().min(1).max(4000),
  premium_emoji_id: z.string().max(40).nullable().optional(),
  fallback_emoji: z.string().max(8).nullable().optional(),
  target: z.enum(['all', 'subscribers']).default('all'),
});

export const listBroadcasts = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from('broadcasts')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    return data ?? [];
  });

export const sendBroadcast = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => broadcastInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    // Create row first
    const { data: row, error } = await context.supabase
      .from('broadcasts')
      .insert({ ...data, status: 'sending', created_by: context.userId })
      .select('id')
      .single();
    if (error) throw error;

    // Pull recipients
    let q = context.supabase.from('bot_users').select('telegram_id').eq('is_banned', false);
    if (data.target === 'subscribers') q = q.eq('is_subscribed', true);
    const { data: users } = await q;

    const { renderEmoji } = await import('@/lib/telegram/emoji');
    const { sendMessage } = await import('@/lib/telegram/gateway.server');
    const prefix = data.premium_emoji_id || data.fallback_emoji
      ? `${renderEmoji(data.premium_emoji_id, data.fallback_emoji)}  `
      : '';
    const body = `${prefix}<b>${data.title}</b>\n\n${data.message}`;

    let sent = 0; let failed = 0;
    const recipients = (users ?? []) as Array<{ telegram_id: number }>;
    // Throttle ~25 msgs/sec; cap per call
    const CAP = 1000;
    for (let i = 0; i < Math.min(recipients.length, CAP); i++) {
      try {
        const r = await sendMessage(recipients[i].telegram_id, body);
        if (r?.ok === false) failed += 1; else sent += 1;
      } catch { failed += 1; }
      if (i % 25 === 24) await new Promise((res) => setTimeout(res, 1000));
    }

    await context.supabase.from('broadcasts').update({
      status: 'sent', sent_count: sent, failed_count: failed,
    }).eq('id', row.id);

    return { ok: true, sent, failed };
  });

/* ─── support ─────────────────────────────────────────────────────── */

export const listTickets = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase
      .from('support_tickets')
      .select('*, bot_users(telegram_id, username, first_name)')
      .order('updated_at', { ascending: false })
      .limit(200);
    return data ?? [];
  });

export const ticketThread = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const [{ data: ticket }, { data: messages }] = await Promise.all([
      context.supabase.from('support_tickets').select('*, bot_users(telegram_id, username, first_name)').eq('id', data.id).single(),
      context.supabase.from('support_messages').select('*').eq('ticket_id', data.id).order('created_at'),
    ]);
    return { ticket, messages: messages ?? [] };
  });

export const replyTicket = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), body: z.string().min(1).max(4000) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: ticket } = await context.supabase
      .from('support_tickets')
      .select('id, bot_user_id, bot_users(telegram_id)')
      .eq('id', data.id)
      .single();
    if (!ticket) throw new Error('Ticket not found');
    await context.supabase.from('support_messages').insert({
      ticket_id: ticket.id, from_admin: true, body: data.body,
    });
    await context.supabase.from('support_tickets').update({
      last_message: data.body, updated_at: new Date().toISOString(),
    }).eq('id', ticket.id);
    const tg = (ticket as any).bot_users?.telegram_id;
    if (tg) {
      const { sendMessage } = await import('@/lib/telegram/gateway.server');
      await sendMessage(tg, `💬 <b>Support reply</b>\n\n${data.body}`);
    }
    return { ok: true };
  });

export const closeTicket = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await context.supabase.from('support_tickets').update({ status: 'closed' }).eq('id', data.id);
    return { ok: true };
  });

/* ─── settings ────────────────────────────────────────────────────── */

const settingsInput = z.object({
  bot_name: z.string().max(80).optional(),
  welcome_text: z.string().max(1000).optional(),
  support_handle: z.string().max(80).optional(),
  referral_reward: z.number().nonnegative().optional(),
  bot_username: z.string().max(80).optional().nullable(),
});

export const getSettings = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { data } = await context.supabase.from('settings').select('*').eq('id', 1).single();
    return data;
  });

export const updateSettings = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => settingsInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    await context.supabase.from('settings').update(data).eq('id', 1);
    return { ok: true };
  });

export const syncBotUsername = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context);
    const { syncBotUsername: sync } = await import('@/lib/telegram/router.server');
    await sync();
    return { ok: true };
  });
