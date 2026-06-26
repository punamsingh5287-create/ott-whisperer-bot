import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/api/public/buy')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const body = await request.json().catch(() => null) as any;
        const tgId = Number(body?.tg_id);
        const productId = String(body?.product_id || '');
        if (!tgId || !productId) return Response.json({ error: 'tg_id and product_id required' }, { status: 400 });

        try {
          const { upsertBotUser } = await import('@/lib/telegram/router.server');
          // Ensure user row exists
          const botUserId = await upsertBotUser({ id: tgId, first_name: body?.first_name, username: body?.username, language_code: body?.language });

          const { sendMessage } = await import('@/lib/telegram/gateway.server');
          const { renderBuyNetworks } = await import('@/lib/telegram/router.server');
          const view = await renderBuyNetworks(productId);
          // navigation state set: we just send a fresh message so the bot picks up from there
          await sendMessage(tgId, view.text, { reply_markup: view.reply_markup });

          void botUserId;

          return Response.json({ ok: true });
        } catch (e: any) {
          console.error('buy bridge error', e);
          return Response.json({ error: e?.message || 'internal' }, { status: 500 });
        }
      },
    },
  },
});
