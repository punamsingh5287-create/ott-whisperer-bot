import { db } from './db.server';

/** Render `<tg-emoji>` HTML for Telegram Premium custom emojis. */
export function renderEmoji(premiumId?: string | null, fallback?: string | null): string {
  const fb = fallback || '✨';
  if (!premiumId) return fb;
  const safe = String(premiumId).replace(/[^0-9]/g, '');
  if (!safe) return fb;
  return `<tg-emoji emoji-id="${safe}">${fb}</tg-emoji>`;
}

export function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* ── Emoji preset cache (60s) ──────────────────────────────────── */
type Preset = { premium_emoji_id: string | null; fallback_emoji: string };
let cache: { at: number; map: Record<string, Preset> } | null = null;

async function load(): Promise<Record<string, Preset>> {
  if (cache && Date.now() - cache.at < 60_000) return cache.map;
  const { data } = await db().from('emoji_presets').select('key, premium_emoji_id, fallback_emoji');
  const map: Record<string, Preset> = {};
  for (const r of (data ?? []) as any[]) {
    map[r.key] = { premium_emoji_id: r.premium_emoji_id, fallback_emoji: r.fallback_emoji ?? '✨' };
  }
  cache = { at: Date.now(), map };
  return map;
}

/** Render emoji HTML for a named preset key (e.g. "menu_home"). */
export async function e(key: string, fallback = '✨'): Promise<string> {
  const m = await load();
  const p = m[key];
  if (!p) return fallback;
  return renderEmoji(p.premium_emoji_id, p.fallback_emoji);
}

/** Plain emoji (no `<tg-emoji>` wrapper) for button labels — Telegram strips HTML there. */
export async function eb(key: string, fallback = '✨'): Promise<string> {
  const m = await load();
  return m[key]?.fallback_emoji ?? fallback;
}

/**
 * Build an inline-keyboard button. Telegram's InlineKeyboardButton does NOT
 * support `icon_custom_emoji_id` — including it causes Telegram to reject
 * the entire sendMessage/editMessageText request, so menus appear broken.
 * We always render the fallback unicode emoji in the label.
 */
export async function mkBtn(
  key: string,
  fallback: string,
  label: string,
  action: Record<string, any>,
): Promise<any> {
  const m = await load();
  const fb = m[key]?.fallback_emoji ?? fallback;
  return { text: `${fb}  ${label}`, ...action };
}

