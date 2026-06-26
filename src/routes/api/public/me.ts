import { createFileRoute } from '@tanstack/react-router';

async function loadUser(tgId: number) {
  const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
  const { data: user } = await supabaseAdmin
    .from('bot_users')
    .select('id, telegram_id, first_name, username, balance, language, total_spent, referral_code, joined_at, is_subscribed')
    .eq('telegram_id', tgId).maybeSingle();
  if (!user) return null;

  const [{ data: orders }, { data: wallets }, { count: refs }] = await Promise.all([
    supabaseAdmin.from('orders')
      .select('id, amount, status, created_at, products(name, image_url)')
      .eq('bot_user_id', user.id).order('created_at', { ascending: false }).limit(25),
    supabaseAdmin.from('wallets').select('id, network, address, qr_url, label').eq('is_active', true),
    supabaseAdmin.from('referrals').select('*', { count: 'exact', head: true }).eq('referrer_bot_user_id', user.id),
  ]);

  return { user, orders: orders ?? [], wallets: wallets ?? [], referrals_count: refs ?? 0 };
}

export const Route = createFileRoute('/api/public/me')({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const tgId = Number(url.searchParams.get('tg_id'));
        if (!tgId) return Response.json({ error: 'tg_id required' }, { status: 400 });
        const data = await loadUser(tgId);
        if (!data) return Response.json({ error: 'not_found' }, { status: 404 });
        return Response.json(data, { headers: { 'Cache-Control': 'no-store' } });
      },
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null) as any;
        if (!body?.tg_id) return Response.json({ error: 'tg_id required' }, { status: 400 });
        const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
        const patch: any = {};
        if (typeof body.language === 'string' && ['en','ru','zh','pl','vi'].includes(body.language)) {
          patch.language = body.language;
        }
        if (Object.keys(patch).length === 0) return Response.json({ error: 'nothing_to_update' }, { status: 400 });
        const { error } = await supabaseAdmin.from('bot_users').update(patch).eq('telegram_id', body.tg_id);
        if (error) return Response.json({ error: error.message }, { status: 500 });
        return Response.json({ ok: true });
      },
    },
  },
});
