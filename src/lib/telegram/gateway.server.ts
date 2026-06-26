const GATEWAY_URL = 'https://connector-gateway.lovable.dev/telegram';

function headers(json = true) {
  const LOVABLE_API_KEY = process.env.LOVABLE_API_KEY;
  const TELEGRAM_API_KEY = process.env.TELEGRAM_API_KEY;
  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) throw new Error('Telegram credentials not configured');
  const h: Record<string, string> = {
    Authorization: `Bearer ${LOVABLE_API_KEY}`,
    'X-Connection-Api-Key': TELEGRAM_API_KEY,
  };
  if (json) h['Content-Type'] = 'application/json';
  return h;
}

async function tg(method: string, body: Record<string, unknown>) {
  try {
    const res = await fetch(`${GATEWAY_URL}/${method}`, {
      method: 'POST', headers: headers(), body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || data?.ok === false) console.error(`tg ${method} failed`, res.status, data);
    return data;
  } catch (e) {
    console.error(`tg ${method} error`, e);
    return { ok: false };
  }
}

function stripTelegramCustomEmoji(html: string): string {
  return html.replace(/<tg-emoji\s+emoji-id="\d+"\s*>(.*?)<\/tg-emoji>/g, '$1');
}

function stripButtonCustomEmoji(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stripButtonCustomEmoji);
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value)) {
    if (key === 'icon_custom_emoji_id') continue;
    out[key] = stripButtonCustomEmoji(child);
  }
  return out;
}

function bodyHasButtonCustomEmoji(body: Record<string, unknown>): boolean {
  return JSON.stringify(body.reply_markup ?? '').includes('icon_custom_emoji_id');
}

function shouldRetryWithoutCustomEmoji(data: any): boolean {
  const description = String(data?.description ?? data?.error ?? '').toLowerCase();
  return description.includes('custom emoji') || description.includes('icon_custom_emoji_id') || description.includes('entity');
}

async function tgHtml(method: string, body: Record<string, unknown>, htmlKey: 'text' | 'caption') {
  const first = await tg(method, body);
  if (first?.ok !== false) {
    return first;
  }
  if (!shouldRetryWithoutCustomEmoji(first)) return first;

  const nextBody = {
    ...body,
    ...(typeof body[htmlKey] === 'string' && String(body[htmlKey]).includes('<tg-emoji')
      ? { [htmlKey]: stripTelegramCustomEmoji(String(body[htmlKey])) }
      : {}),
    ...(bodyHasButtonCustomEmoji(body) ? { reply_markup: stripButtonCustomEmoji(body.reply_markup) } : {}),
  };

  return tg(method, nextBody);
}

export type InlineKeyboard = {
  inline_keyboard: Array<Array<{ text: string; callback_data?: string; url?: string; icon_custom_emoji_id?: string }>>;
};

export async function sendMessage(
  chatId: number, text: string,
  opts: { reply_markup?: InlineKeyboard; disable_web_page_preview?: boolean } = {},
) {
  return tgHtml('sendMessage', {
    chat_id: chatId, text, parse_mode: 'HTML',
    disable_web_page_preview: opts.disable_web_page_preview ?? true,
    reply_markup: opts.reply_markup,
  }, 'text');
}

export async function editMessage(chatId: number, messageId: number, text: string, reply_markup?: InlineKeyboard) {
  return tgHtml('editMessageText', {
    chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML',
    disable_web_page_preview: true, reply_markup,
  }, 'text');
}

export async function editMessageCaption(chatId: number, messageId: number, caption: string, reply_markup?: InlineKeyboard) {
  return tgHtml('editMessageCaption', {
    chat_id: chatId, message_id: messageId, caption, parse_mode: 'HTML', reply_markup,
  }, 'caption');
}

export async function editMessageReplyMarkup(chatId: number, messageId: number, reply_markup?: InlineKeyboard) {
  const body = {
    chat_id: chatId, message_id: messageId, reply_markup,
  };
  const first = await tg('editMessageReplyMarkup', body);
  if (first?.ok !== false || !bodyHasButtonCustomEmoji(body) || !shouldRetryWithoutCustomEmoji(first)) return first;
  return tg('editMessageReplyMarkup', { ...body, reply_markup: stripButtonCustomEmoji(reply_markup) });
}

export async function sendPhoto(chatId: number, photoUrl: string, caption: string, reply_markup?: InlineKeyboard) {
  return tgHtml('sendPhoto', { chat_id: chatId, photo: photoUrl, caption, parse_mode: 'HTML', reply_markup }, 'caption');
}

export async function answerCallback(callbackId: string, text?: string, show_alert = false) {
  return tg('answerCallbackQuery', { callback_query_id: callbackId, text, show_alert });
}

export async function getMe() { return tg('getMe', {}); }

export async function getFile(fileId: string) { return tg('getFile', { file_id: fileId }); }

/** Download a Telegram file via the gateway /file/ endpoint and return its bytes. */
export async function downloadFile(filePath: string): Promise<ArrayBuffer> {
  const res = await fetch(`${GATEWAY_URL}/file/${filePath}`, { headers: headers(false) });
  if (!res.ok) throw new Error(`file download ${res.status}`);
  return res.arrayBuffer();
}
