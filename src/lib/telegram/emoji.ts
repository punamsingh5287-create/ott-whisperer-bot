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
let cache: { at: number; map: Record<string, Preset>; defaultPremiumId: string | null } | null = null;

async function load(): Promise<{ map: Record<string, Preset>; defaultPremiumId: string | null }> {
  if (cache && Date.now() - cache.at < 60_000) return { map: cache.map, defaultPremiumId: cache.defaultPremiumId };
  const { data } = await db().from('emoji_presets').select('key, premium_emoji_id, fallback_emoji');
  const map: Record<string, Preset> = {};
  for (const r of (data ?? []) as any[]) {
    map[r.key] = { premium_emoji_id: r.premium_emoji_id, fallback_emoji: r.fallback_emoji ?? '✨' };
  }
  const defaultPremiumId = String(
    map.welcome?.premium_emoji_id
    ?? Object.values(map).find((p) => p.premium_emoji_id)?.premium_emoji_id
    ?? '',
  ).replace(/[^0-9]/g, '') || null;
  cache = { at: Date.now(), map, defaultPremiumId };
  return { map, defaultPremiumId };
}

/** Render emoji HTML for a named preset key (e.g. "menu_home"). */
export async function e(key: string, fallback = '✨'): Promise<string> {
  const { map: m, defaultPremiumId } = await load();
  const p = m[key];
  if (!p) return renderEmoji(defaultPremiumId, fallback);
  return renderEmoji(p.premium_emoji_id || defaultPremiumId, p.fallback_emoji);
}

/** Plain emoji (no `<tg-emoji>` wrapper) for button labels — the custom icon is sent separately. */
export async function eb(key: string, fallback = '✨'): Promise<string> {
  const { map: m } = await load();
  return m[key]?.fallback_emoji ?? fallback;
}

/** Render dynamic emoji values (products/categories) with the global premium fallback when needed. */
export async function premiumEmoji(premiumId?: string | null, fallback = '✨'): Promise<string> {
  const { defaultPremiumId } = await load();
  return renderEmoji(premiumId || defaultPremiumId, fallback);
}

/** Build a dynamic inline button (product/category) with a premium icon fallback. */
export async function mkEmojiBtn(
  fallback: string,
  label: string,
  action: Record<string, any>,
  premiumId?: string | null,
): Promise<any> {
  const { defaultPremiumId } = await load();
  const safePremiumId = String(premiumId ?? defaultPremiumId ?? '').replace(/[^0-9]/g, '');
  return {
    text: safePremiumId ? label : `${fallback}  ${label}`,
    ...(safePremiumId ? { icon_custom_emoji_id: safePremiumId } : {}),
    ...action,
  };
}

/**
 * Build an inline-keyboard button with Telegram Premium custom emoji support.
 * Newer Telegram Bot API versions support `icon_custom_emoji_id` on buttons.
 * The gateway layer safely retries without this field if Telegram rejects it,
 * so buttons remain clickable even on unsupported clients/API versions.
 */
export async function mkBtn(
  key: string,
  fallback: string,
  label: string,
  action: Record<string, any>,
): Promise<any> {
  const { map: m, defaultPremiumId } = await load();
  const preset = m[key];
  const fb = preset?.fallback_emoji ?? fallback;
  const premiumId = String(preset?.premium_emoji_id ?? defaultPremiumId ?? '').replace(/[^0-9]/g, '');
  return {
    text: premiumId ? label : `${fb}  ${label}`,
    ...(premiumId ? { icon_custom_emoji_id: premiumId } : {}),
    ...action,
  };
}

