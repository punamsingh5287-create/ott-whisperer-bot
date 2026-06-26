
-- ============================================================
-- Phase 2: Crypto payments, emoji presets, branding settings
-- ============================================================

-- 1. WALLETS
CREATE TYPE public.wallet_network AS ENUM ('USDT_TRC20', 'USDT_BEP20', 'SOL');

CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  network public.wallet_network NOT NULL,
  address text NOT NULL,
  label text,
  qr_url text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallets TO authenticated;
GRANT ALL ON public.wallets TO service_role;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage wallets" ON public.wallets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_wallets_updated BEFORE UPDATE ON public.wallets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 2. PAYMENTS
CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE,
  bot_user_id uuid REFERENCES public.bot_users(id) ON DELETE SET NULL,
  wallet_id uuid REFERENCES public.wallets(id) ON DELETE SET NULL,
  network public.wallet_network NOT NULL,
  amount numeric NOT NULL,
  tx_hash text,
  screenshot_url text,
  status text NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_payments_order ON public.payments(order_id);
CREATE INDEX idx_payments_status ON public.payments(status);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage payments" ON public.payments
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_payments_updated BEFORE UPDATE ON public.payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 3. EMOJI PRESETS
CREATE TABLE public.emoji_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  premium_emoji_id text,
  fallback_emoji text NOT NULL DEFAULT '✨',
  scope text NOT NULL DEFAULT 'button', -- button|product|category|system
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.emoji_presets TO authenticated;
GRANT ALL ON public.emoji_presets TO service_role;
ALTER TABLE public.emoji_presets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage emoji_presets" ON public.emoji_presets
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER trg_emoji_presets_updated BEFORE UPDATE ON public.emoji_presets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- 4. SETTINGS — branding columns
ALTER TABLE public.settings
  ADD COLUMN IF NOT EXISTS site_name text DEFAULT 'OTT & AI Store',
  ADD COLUMN IF NOT EXISTS panel_title text DEFAULT 'Admin Console',
  ADD COLUMN IF NOT EXISTS footer_text text DEFAULT 'Built with Lovable · Telegram + Lovable Cloud',
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS panel_logo_url text,
  ADD COLUMN IF NOT EXISTS bot_logo_url text,
  ADD COLUMN IF NOT EXISTS favicon_url text;

-- 5. NEW: create_pending_order  (replaces direct purchase_product for crypto flow)
CREATE OR REPLACE FUNCTION public.create_pending_order(
  _product_id uuid,
  _bot_user_id uuid,
  _network public.wallet_network,
  _wallet_id uuid
)
RETURNS TABLE(order_id uuid, payment_id uuid, product_name text, amount numeric, wallet_address text, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_wallet public.wallets%ROWTYPE;
  v_order_id uuid;
  v_payment_id uuid;
BEGIN
  SELECT * INTO v_product FROM public.products WHERE id = _product_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::text, NULL::numeric, NULL::text, 'product_not_found'::text; RETURN;
  END IF;
  IF v_product.status <> 'active' THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, v_product.name, v_product.price, NULL::text, 'inactive'::text; RETURN;
  END IF;
  IF v_product.stock <= 0 THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, v_product.name, v_product.price, NULL::text, 'out_of_stock'::text; RETURN;
  END IF;

  SELECT * INTO v_wallet FROM public.wallets WHERE id = _wallet_id AND is_active = true;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, v_product.name, v_product.price, NULL::text, 'wallet_unavailable'::text; RETURN;
  END IF;

  INSERT INTO public.orders (bot_user_id, product_id, amount, status)
  VALUES (_bot_user_id, _product_id, v_product.price, 'awaiting_payment')
  RETURNING id INTO v_order_id;

  INSERT INTO public.payments (order_id, bot_user_id, wallet_id, network, amount, status)
  VALUES (v_order_id, _bot_user_id, _wallet_id, _network, v_product.price, 'pending')
  RETURNING id INTO v_payment_id;

  RETURN QUERY SELECT v_order_id, v_payment_id, v_product.name, v_product.price, v_wallet.address, NULL::text;
END;
$$;

-- 6. submit_payment_proof — bot calls when user uploads screenshot / tx_hash
CREATE OR REPLACE FUNCTION public.submit_payment_proof(
  _payment_id uuid,
  _tx_hash text,
  _screenshot_url text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.payments
     SET tx_hash = COALESCE(_tx_hash, tx_hash),
         screenshot_url = COALESCE(_screenshot_url, screenshot_url),
         status = 'pending',
         updated_at = now()
   WHERE id = _payment_id;
  UPDATE public.orders SET status = 'pending_review', updated_at = now()
   WHERE id = (SELECT order_id FROM public.payments WHERE id = _payment_id);
END;
$$;

-- 7. approve_payment / reject_payment
CREATE OR REPLACE FUNCTION public.approve_payment(_payment_id uuid, _admin_id uuid, _note text)
RETURNS TABLE(order_id uuid, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_pay public.payments%ROWTYPE;
  v_product public.products%ROWTYPE;
BEGIN
  SELECT * INTO v_pay FROM public.payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT NULL::uuid, 'payment_not_found'::text; RETURN; END IF;
  IF v_pay.status = 'approved' THEN RETURN QUERY SELECT v_pay.order_id, NULL::text; RETURN; END IF;

  SELECT p.* INTO v_product FROM public.products p
    JOIN public.orders o ON o.product_id = p.id
   WHERE o.id = v_pay.order_id FOR UPDATE;

  IF FOUND AND v_product.stock > 0 THEN
    UPDATE public.products SET stock = stock - 1 WHERE id = v_product.id;
  END IF;

  UPDATE public.payments SET status='approved', reviewed_by=_admin_id, reviewed_at=now(), admin_note=_note WHERE id=_payment_id;
  UPDATE public.orders SET status='confirmed' WHERE id=v_pay.order_id;
  UPDATE public.bot_users
     SET total_spent = total_spent + v_pay.amount,
         is_subscribed = true,
         last_active = now()
   WHERE id = v_pay.bot_user_id;
  UPDATE public.referrals SET reward_status='rewarded'
   WHERE referred_bot_user_id = v_pay.bot_user_id AND reward_status='pending';

  RETURN QUERY SELECT v_pay.order_id, NULL::text;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_payment(_payment_id uuid, _admin_id uuid, _note text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_oid uuid;
BEGIN
  UPDATE public.payments SET status='rejected', reviewed_by=_admin_id, reviewed_at=now(), admin_note=_note
    WHERE id=_payment_id RETURNING order_id INTO v_oid;
  UPDATE public.orders SET status='cancelled' WHERE id=v_oid;
END;
$$;

-- 8. Seed default emoji presets
INSERT INTO public.emoji_presets (key, name, fallback_emoji, scope) VALUES
  ('menu_home','Home','🏠','button'),
  ('menu_categories','Categories','🗂','button'),
  ('menu_search','Search','🔎','button'),
  ('menu_orders','My Orders','🧾','button'),
  ('menu_profile','Profile','👤','button'),
  ('menu_referrals','Referrals','🎁','button'),
  ('menu_support','Support','💬','button'),
  ('menu_back','Back','«','button'),
  ('action_buy','Buy now','🛒','button'),
  ('pay_trc20','USDT TRC20','💵','button'),
  ('pay_bep20','USDT BEP20','🟡','button'),
  ('pay_sol','Solana','🟣','button'),
  ('action_paid','I have paid','✅','button'),
  ('status_success','Success','🎉','system'),
  ('status_error','Error','⚠️','system'),
  ('status_pending','Pending','⏳','system'),
  ('status_approved','Approved','✅','system'),
  ('status_rejected','Rejected','❌','system'),
  ('welcome','Welcome','✨','system'),
  ('broadcast','Broadcast','📣','system'),
  ('stats','Statistics','📊','system'),
  ('subscription','Subscription','⭐','system')
ON CONFLICT (key) DO NOTHING;
