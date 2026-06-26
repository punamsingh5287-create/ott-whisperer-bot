
ALTER TABLE public.emoji_presets ADD COLUMN IF NOT EXISTS label text;

-- Seed/ensure all bot button rows exist with scope=button so they appear in the Buttons Manager.
INSERT INTO public.emoji_presets (key, name, fallback_emoji, premium_emoji_id, scope, label) VALUES
  ('menu_categories','Categories','🗂',NULL,'button','Categories'),
  ('menu_search','Search','🔎',NULL,'button','Search'),
  ('menu_orders','My Orders','🧾',NULL,'button','My Orders'),
  ('menu_profile','Profile','👤',NULL,'button','Profile'),
  ('menu_referrals','Referrals','🎁',NULL,'button','Referrals'),
  ('menu_support','Support','💬',NULL,'button','Support'),
  ('menu_close','Close','✕',NULL,'button','Close'),
  ('menu_back','Back','‹',NULL,'button','Back'),
  ('menu_home','Home','🏠',NULL,'button','Home'),
  ('action_buy','Buy now','🛒',NULL,'button','Buy now'),
  ('action_paid','I have paid','✅',NULL,'button','I have paid'),
  ('pay_trc20','USDT TRC20','💵',NULL,'button','Pay with USDT (TRC20)'),
  ('pay_bep20','USDT BEP20','🟡',NULL,'button','Pay with USDT (BEP20)'),
  ('pay_sol','Solana','🟣',NULL,'button','Pay with Solana (SOL)')
ON CONFLICT (key) DO UPDATE SET
  label = COALESCE(public.emoji_presets.label, EXCLUDED.label),
  scope = 'button';
