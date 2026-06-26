/**
 * Render a Telegram Premium custom emoji.
 * Premium users see the animated/custom emoji; everyone else sees the fallback.
 * Requires parse_mode: "HTML" on the message.
 */
export function renderEmoji(premiumId?: string | null, fallback?: string | null): string {
  const fb = fallback || '✨';
  if (!premiumId) return fb;
  const safe = String(premiumId).replace(/[^0-9]/g, '');
  if (!safe) return fb;
  return `<tg-emoji emoji-id="${safe}">${fb}</tg-emoji>`;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
