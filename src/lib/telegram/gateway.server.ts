const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';

function headers() {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
    throw new Error('Telegram credentials not configured');
  }
  return {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    'X-Connection-Api-Key': TELEGRAM_API_KEY,
    'Content-Type': 'application/json',
  };
}

async function tg(method: string, body: Record<string, unknown>) {
  try {
    const res = await fetch(`${GATEWAY_URL}/${method}`, {
      method: 'POST',
      headers: headers(),
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) {
      console.error(`tg ${method} failed`, res.status, data);
    }
    return data;
  } catch (e) {
    console.error(`tg ${method} error`, e);
    return { ok: false };
  }
}

export type InlineKeyboard = {
  inline_keyboard: Array<Array<{ text: string; callback_data?: string; url?: string; switch_inline_query_current_chat?: string }>>;
};

export async function sendMessage(
  chatId: number,
  text: string,
  opts: { reply_markup?: InlineKeyboard; disable_web_page_preview?: boolean } = {},
) {
  return tg('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: opts.disable_web_page_preview ?? true,
    reply_markup: opts.reply_markup,
  });
}

export async function editMessage(
  chatId: number,
  messageId: number,
  text: string,
  reply_markup?: InlineKeyboard,
) {
  return tg('editMessageText', {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: 'HTML',
    disable_web_page_preview: true,
    reply_markup,
  });
}

export async function sendPhoto(
  chatId: number,
  photoUrl: string,
  caption: string,
  reply_markup?: InlineKeyboard,
) {
  return tg('sendPhoto', {
    chat_id: chatId,
    photo: photoUrl,
    caption,
    parse_mode: 'HTML',
    reply_markup,
  });
}

export async function answerCallback(callbackId: string, text?: string, show_alert = false) {
  return tg('answerCallbackQuery', { callback_query_id: callbackId, text, show_alert });
}

export async function getMe() {
  return tg('getMe', {});
}
