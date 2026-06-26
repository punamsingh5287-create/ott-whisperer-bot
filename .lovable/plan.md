## Goal

Upgrade the existing project into a complete OTT + AI Store Telegram bot with a premium dark-themed admin dashboard. Build on top of what's already there (`bot_users`, `conversions`, `pricing_plans`, `ott_content`, admin auth, webhook at `/api/public/telegram/webhook`).

## 1. Database changes (one migration)

New / updated tables in `public`:

- `categories` — name, slug, icon_emoji, sort_order, is_active
- `products` — name, slug, description, category_id, price, duration_days, stock, status (active/disabled), image_url, tags[], premium_emoji_id, fallback_emoji, sort_order
- `orders` — bot_user_id, product_id, amount, status (pending/confirmed/delivered/cancelled), delivery_payload, telegram_message_id, created_at
- `broadcasts` — title, message, premium_emoji_id, fallback_emoji, target (all/subscribers), sent_count, status, created_by, created_at
- `support_tickets` — bot_user_id, subject, last_message, status (open/closed), created_at, updated_at
- `support_messages` — ticket_id, from_admin (bool), body, created_at
- `referrals` — referrer_bot_user_id, referred_bot_user_id, reward_status
- `settings` — singleton key/value JSON (support handle, welcome text, etc.)
- Extend `bot_users` with `referral_code`, `referred_by`, `total_spent`

All tables: GRANT to authenticated + service_role, RLS on, admin-only policies via `has_role(auth.uid(), 'admin')`. Seed `categories` (OTT Apps, AI Apps, Gaming, Utilities) and a few sample products. Storage bucket `product-images` (public read, admin write) for logos.

## 2. Telegram bot (extend webhook route)

Rewrite `src/routes/api/public/telegram/webhook.ts` as a clean modular handler:

- `/start` — premium welcome, auto-create referral code, capture `?start=REF` for referral attribution
- Inline keyboard main menu: Categories · Search · My Orders · Profile · Referrals · Support
- Categories → product list (paginated) → product detail (image, premium emoji, price, duration, stock)
- Buy button → creates `orders` row (status=pending), decrements stock, sends confirmation with premium emoji, marks delivered
- `/search <query>` and inline "Search" prompt
- Profile shows joined date, total spent, active subscription
- Order history shows last 10 orders
- Referral screen shows code + share link `https://t.me/<bot>?start=REF`
- Support button opens a ticket (next user message becomes the first message)
- Premium emoji rendering helper: `<tg-emoji emoji-id="...">FALLBACK</tg-emoji>` everywhere products appear
- Broadcast worker: server function the admin triggers; iterates `bot_users`, sends with rate limiting

Modular file layout:

```text
src/lib/telegram/
  gateway.ts        // sendMessage, editMessage, sendPhoto, answerCallback
  emoji.ts          // renderPremiumEmoji()
  menus.ts          // keyboard builders
  handlers/
    start.ts
    categories.ts
    products.ts
    orders.ts
    profile.ts
    referrals.ts
    support.ts
    search.ts
  db.ts             // service-role supabase singleton
```

`webhook.ts` becomes a thin router calling these handlers.

## 3. Admin dashboard

Replace `/admin` with a sidebar layout and 8 sections, premium dark SaaS aesthetic.

```text
/admin
  /overview        analytics cards + charts
  /products        table + add/edit dialog (image upload, premium emoji, category, price, stock, tags)
  /categories      CRUD with emoji + sort order
  /orders          filterable table with status actions
  /users           bot users list, search, ban toggle, conversion history
  /broadcasts      composer (premium emoji preview) + history, "Send now" button
  /support         ticket inbox with reply thread (admin reply → Telegram message)
  /settings        bot welcome text, support handle, referral reward
```

Server functions in `src/lib/admin/*.functions.ts` for products / orders / broadcasts / tickets / settings, all gated by `requireSupabaseAuth` + `has_role` admin check.

Analytics (`/overview`):

- Total users, active 7d, total orders, revenue, conversion rate
- 14-day daily joins chart, 14-day revenue chart
- Top 5 selling products
- Recent orders table

## 4. Design system

- Black premium theme: deep neutral background, single bold accent (electric violet), subtle gradient cards, soft shadows
- Tokens added to `src/styles.css` (`--accent`, `--accent-glow`, `--gradient-card`, `--shadow-premium`)
- Replace generic shadcn defaults with premium variants for Card, Button, Badge
- Mobile responsive sidebar (collapses to drawer)

## 5. Webhook security & registration

Keep existing secret-token verification. After deploy, re-call `setWebhook` with `allowed_updates: ["message","edited_message","callback_query","chat_member"]`.

## Technical notes

- Service-role Supabase client loaded inside handlers only (route file is client-reachable)
- Image upload via Supabase storage signed upload from admin
- Broadcast respects Telegram's 30 msgs/sec — `setTimeout` chunking, status updates back to DB
- Premium emoji rendering uses `parse_mode: "HTML"` everywhere
- Stock decrement uses a Postgres function `purchase_product(product_id, bot_user_id)` to avoid race conditions
- Referral attribution: `/start REF` → write `referred_by` if user is new; on first paid order, mark referral rewarded

## Out of scope (confirm if needed)

- Real payment gateway (Razorpay/Stripe) — current flow marks orders as "confirmed" on button tap; we can wire payments next
- Multi-admin roles beyond the existing `admin` role
- i18n / Hindi UI strings for the dashboard
