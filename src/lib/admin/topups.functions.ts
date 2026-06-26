import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

async function assertAdmin(ctx: { supabase: any; userId: string }) {
  const { data } = await ctx.supabase.rpc('has_role', { _user_id: ctx.userId, _role: 'admin' });
  if (!data) throw new Error('Forbidden');
}

export const listTopups = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ status: z.enum(['pending', 'approved', 'rejected', 'all']).default('pending') }).parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    let q = context.supabase
      .from('wallet_topups')
      .select('*, bot_users(telegram_id, username, first_name, balance)')
      .order('created_at', { ascending: false })
      .limit(200);
    if (data.status !== 'all') q = q.eq('status', data.status);
    const { data: rows, error } = await q;
    if (error) throw error;
    const out: any[] = [];
    for (const r of (rows ?? []) as any[]) {
      let signed: string | null = null;
      if (r.screenshot_url) {
        const { data: s } = await context.supabase.storage
          .from('payment-proofs')
          .createSignedUrl(r.screenshot_url, 60 * 60);
        signed = s?.signedUrl ?? null;
      }
      out.push({ ...r, screenshot_signed_url: signed });
    }
    return out;
  });

export const reviewTopup = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        action: z.enum(['approve', 'reject']),
        amount: z.number().positive().optional(),
        note: z.string().max(500).optional().nullable(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
    const { data: topup, error: fetchErr } = await supabaseAdmin
      .from('wallet_topups')
      .select('*')
      .eq('id', data.id)
      .maybeSingle();
    if (fetchErr) throw fetchErr;
    if (!topup) throw new Error('Topup not found');
    if (topup.status !== 'pending') throw new Error('Already reviewed');

    if (data.action === 'approve') {
      const amount = data.amount ?? Number(topup.amount) ?? 0;
      if (!amount || amount <= 0) throw new Error('Enter a valid amount');
      await supabaseAdmin
        .from('wallet_topups')
        .update({
          status: 'approved',
          amount,
          reviewed_by: context.userId,
          reviewed_at: new Date().toISOString(),
          admin_note: data.note ?? null,
        })
        .eq('id', data.id);
      const { data: u } = await supabaseAdmin
        .from('bot_users')
        .select('balance')
        .eq('id', topup.bot_user_id)
        .maybeSingle();
      const newBalance = Number((u as any)?.balance ?? 0) + amount;
      await supabaseAdmin.from('bot_users').update({ balance: newBalance }).eq('id', topup.bot_user_id);
    } else {
      await supabaseAdmin
        .from('wallet_topups')
        .update({
          status: 'rejected',
          reviewed_by: context.userId,
          reviewed_at: new Date().toISOString(),
          admin_note: data.note ?? null,
        })
        .eq('id', data.id);
    }

    try {
      const { notifyTopupReviewed } = await import('@/lib/telegram/router.server');
      await notifyTopupReviewed(data.id, data.action === 'approve', data.note ?? undefined);
    } catch (e) {
      console.error('notify topup failed', e);
    }
    return { ok: true };
  });
