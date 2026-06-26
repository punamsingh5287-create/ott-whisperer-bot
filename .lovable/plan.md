# Phase 2 Upgrade Plan

Building on the existing OTT/AI Store bot + admin dashboard. Four feature areas plus a UI polish pass.

## 1. USDT / Crypto Payment System

**Database (new migration)**
- `wallets` — `network` (`USDT_TRC20` | `USDT_BEP20` | `SOL`), `address`, `label`, `qr_url`, `is_active`.
- `payments` — `order_id`, `bot_user_id`, `network`, `amount`, `wallet_id`, `tx_hash`, `screenshot_url`, `status` (`pending` | `approved` | `rejected`), `admin_note`, `reviewed_by`, `reviewed_at`.
- Extend `orders.status` flow: `awaiting_payment` → `pending_review` → `confirmed`/`rejected`. Modify `purchase_product()` so it no longer auto-confirms; it creates an `awaiting_payment` order without decrementing stock. Stock is decremented on payment approval via a new `approve_payment(payment_id, admin_id)` function.
- Storage bucket `payment-proofs` (private) with signed-URL reads for admin.

**Bot flow**
- Buy button → pick network (3 inline buttons w/ premium emoji) → bot replies with wallet address, QR, exact amount, order ID, and "I've Paid" button.
- "I've Paid" → user sends tx hash (text) or screenshot (photo). Saved to `payments` row, order set to `pending_review`, admin gets notification in support channel/log.
- `/orders` shows full payment history with status badges.

**Admin**
- New "Payments" page: list with filters (pending / approved / rejected), screenshot preview, approve/reject buttons with note.
- New "Wallets" page: CRUD wallet addresses per network, toggle active, upload QR.

## 2. Premium Emoji Manager

**Database**
- `emoji_presets` — `key` (slug), `name`, `premium_emoji_id`, `fallback_emoji`, `scope` (`button` | `product` | `category` | `system`).
- Seed defaults for menu/buttons (catalog, search, support, profile, orders, plans, pay, approve, reject, success, error, welcome, broadcast).

**Admin**
- "Emojis" page: CRUD + live `<tg-emoji>` preview rendering.
- Existing Products & Categories pages get an emoji picker (dropdown from `emoji_presets` or custom).

**Bot**
- Replace hardcoded emojis in `src/lib/telegram/*` with `getEmoji(key)` that reads cached presets and renders `<tg-emoji emoji-id="…">fallback</tg-emoji>`. Used in main menu, category list, product cards, order messages, payment instructions, broadcast headers, welcome, success/error, profile, stats.

## 3. Branding Settings

**Database**
- Extend `settings` table with brand keys: `site_name`, `panel_title`, `footer_text`, `logo_url`, `panel_logo_url`, `bot_logo_url`, `favicon_url`.
- Storage bucket `branding` (public) for logo/favicon uploads.

**Admin**
- "Branding" tab in Settings: upload fields + text inputs, live preview.
- Apply to: sidebar logo, dashboard header, `/auth` page, `<link rel="icon">` (injected via `__root.tsx` head loader), invoice/report headers.

## 4. UI Polish — Glassmorphism

- Update `src/styles.css` tokens: deeper black bg, accent retained, add glass utility (`backdrop-blur-xl bg-white/[0.04] border-white/10`), gradient borders, soft glow shadows.
- Refactor admin cards, sidebar, stat tiles, and tables to glass surfaces with framer-motion fade/slide-in on mount.
- Premium SaaS feel — Stripe/Vercel inspired spacing & typography (Geist-style via system font stack + tracking).

## Technical Notes

- All new tables follow the required GRANT + RLS pattern; admin-only writes via `has_role(auth.uid(), 'admin')`, payments readable by owning bot user via service-role bot path.
- Webhook handler extended with payment-network callback queries and photo/text message routing for proof submission.
- Branding loaded via a public `get_branding` server function called from `__root.tsx` loader so favicon + site name SSR correctly.

## Out of Scope (explicitly)

- On-chain auto-verification of tx hashes (admin manual approve for now — can add Tronscan/BscScan/Solscan API later).
- Multi-language, escrow, refunds.

Proceed?
