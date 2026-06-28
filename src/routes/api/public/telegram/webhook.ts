import { createFileRoute } from '@tanstack/react-router';
import { createHash, timingSafeEqual } from 'crypto';

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

export const Route = createFileRoute('/api/public/telegram/webhook')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
        if (!TELEGRAM_API_KEY) return new Response('Not configured', { status: 500 });

        const expected = deriveTelegramWebhookSecret(TELEGRAM_API_KEY);
        const actual = request.headers.get('X-Telegram-Bot-Api-Secret-Token') ?? '';
        if (!safeEqual(actual, expected)) {
          return new Response('Unauthorized', { status: 401 });
        }

        let update: any;
        try { update = await request.json(); }
        catch { return new Response('Bad request', { status: 400 }); }

        try {
          const { handleMessage, handleCallback } = await import('@/lib/telegram/router.server');
          if (update.message || update.edited_message) {
            await handleMessage(update.message ?? update.edited_message);
          } else if (update.callback_query) {
            await handleCallback(update.callback_query);
          }
        } catch (e) {
          console.error('telegram webhook error', e);
          return Response.json({ ok: false, error: 'handler_failed' }, { status: 500 });
        }

        return Response.json({ ok: true });

      },
    },
  },
});
