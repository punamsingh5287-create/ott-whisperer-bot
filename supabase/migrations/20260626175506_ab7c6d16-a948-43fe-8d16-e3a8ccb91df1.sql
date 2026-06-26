
-- Extend bot_users
ALTER TABLE public.bot_users
  ADD COLUMN IF NOT EXISTS referral_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS referred_by uuid REFERENCES public.bot_users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS total_spent numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_banned boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS pending_action jsonb;

-- Categories
CREATE TABLE IF NOT EXISTS public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon_emoji text DEFAULT '📦',
  sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.categories TO authenticated;
GRANT ALL ON public.categories TO service_role;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage categories" ON public.categories FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Products
CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text,
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  price numeric NOT NULL DEFAULT 0,
  duration_days int NOT NULL DEFAULT 30,
  stock int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  image_url text,
  tags text[] NOT NULL DEFAULT '{}',
  premium_emoji_id text,
  fallback_emoji text DEFAULT '✨',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage products" ON public.products FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products(category_id);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_user_id uuid REFERENCES public.bot_users(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.products(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  delivery_payload text,
  telegram_message_id bigint,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.orders TO authenticated;
GRANT ALL ON public.orders TO service_role;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage orders" ON public.orders FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_orders_bot_user ON public.orders(bot_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created ON public.orders(created_at DESC);

-- Broadcasts
CREATE TABLE IF NOT EXISTS public.broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  premium_emoji_id text,
  fallback_emoji text,
  target text NOT NULL DEFAULT 'all',
  sent_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcasts TO authenticated;
GRANT ALL ON public.broadcasts TO service_role;
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage broadcasts" ON public.broadcasts FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Support tickets
CREATE TABLE IF NOT EXISTS public.support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_user_id uuid REFERENCES public.bot_users(id) ON DELETE CASCADE,
  subject text NOT NULL DEFAULT 'Support request',
  last_message text,
  status text NOT NULL DEFAULT 'open',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage tickets" ON public.support_tickets FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE TABLE IF NOT EXISTS public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  from_admin boolean NOT NULL DEFAULT false,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.support_messages TO authenticated;
GRANT ALL ON public.support_messages TO service_role;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage ticket messages" ON public.support_messages FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
CREATE INDEX IF NOT EXISTS idx_support_messages_ticket ON public.support_messages(ticket_id);

-- Referrals
CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_bot_user_id uuid NOT NULL REFERENCES public.bot_users(id) ON DELETE CASCADE,
  referred_bot_user_id uuid NOT NULL REFERENCES public.bot_users(id) ON DELETE CASCADE,
  reward_status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(referred_bot_user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage referrals" ON public.referrals FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

-- Settings (singleton)
CREATE TABLE IF NOT EXISTS public.settings (
  id int PRIMARY KEY DEFAULT 1,
  bot_name text DEFAULT 'OTT & AI Store',
  welcome_text text DEFAULT 'Welcome to the premium OTT & AI Store!',
  support_handle text DEFAULT '@support',
  referral_reward numeric NOT NULL DEFAULT 0,
  bot_username text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT settings_singleton CHECK (id = 1)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage settings" ON public.settings FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));
INSERT INTO public.settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

-- updated_at triggers
DROP TRIGGER IF EXISTS trg_categories_updated ON public.categories;
CREATE TRIGGER trg_categories_updated BEFORE UPDATE ON public.categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_products_updated ON public.products;
CREATE TRIGGER trg_products_updated BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_orders_updated ON public.orders;
CREATE TRIGGER trg_orders_updated BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_broadcasts_updated ON public.broadcasts;
CREATE TRIGGER trg_broadcasts_updated BEFORE UPDATE ON public.broadcasts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_tickets_updated ON public.support_tickets;
CREATE TRIGGER trg_tickets_updated BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
DROP TRIGGER IF EXISTS trg_settings_updated ON public.settings;
CREATE TRIGGER trg_settings_updated BEFORE UPDATE ON public.settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- Purchase function (atomic stock decrement + order + spend bump)
CREATE OR REPLACE FUNCTION public.purchase_product(_product_id uuid, _bot_user_id uuid)
RETURNS TABLE(order_id uuid, product_name text, amount numeric, error text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_order_id uuid;
BEGIN
  SELECT * INTO v_product FROM public.products WHERE id = _product_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::numeric, 'product_not_found'::text; RETURN;
  END IF;
  IF v_product.status <> 'active' THEN
    RETURN QUERY SELECT NULL::uuid, v_product.name, v_product.price, 'inactive'::text; RETURN;
  END IF;
  IF v_product.stock <= 0 THEN
    RETURN QUERY SELECT NULL::uuid, v_product.name, v_product.price, 'out_of_stock'::text; RETURN;
  END IF;

  UPDATE public.products SET stock = stock - 1 WHERE id = _product_id;

  INSERT INTO public.orders (bot_user_id, product_id, amount, status)
  VALUES (_bot_user_id, _product_id, v_product.price, 'confirmed')
  RETURNING id INTO v_order_id;

  UPDATE public.bot_users
    SET total_spent = total_spent + v_product.price,
        is_subscribed = true,
        last_active = now()
    WHERE id = _bot_user_id;

  -- Mark referral rewarded on first paid order
  UPDATE public.referrals SET reward_status = 'rewarded'
    WHERE referred_bot_user_id = _bot_user_id AND reward_status = 'pending';

  RETURN QUERY SELECT v_order_id, v_product.name, v_product.price, NULL::text;
END;
$$;
GRANT EXECUTE ON FUNCTION public.purchase_product(uuid, uuid) TO service_role, authenticated;

-- Seed categories
INSERT INTO public.categories (name, slug, icon_emoji, sort_order) VALUES
  ('OTT Apps','ott','🎬',1),
  ('AI Apps','ai','🤖',2),
  ('Gaming','gaming','🎮',3),
  ('Utilities','utilities','🛠️',4)
ON CONFLICT (slug) DO NOTHING;

-- Seed sample products
WITH c AS (SELECT slug, id FROM public.categories)
INSERT INTO public.products (name, slug, description, category_id, price, duration_days, stock, status, fallback_emoji, sort_order)
VALUES
  ('Netflix Premium','netflix-premium','4K Ultra HD, 4 screens, shared profile',(SELECT id FROM c WHERE slug='ott'),199,30,50,'active','🎬',1),
  ('ChatGPT Plus','chatgpt-plus','GPT-4o access, faster responses, shared',(SELECT id FROM c WHERE slug='ai'),499,30,25,'active','🤖',1),
  ('Spotify Premium','spotify-premium','Ad-free music, offline downloads',(SELECT id FROM c WHERE slug='ott'),129,30,100,'active','🎧',2),
  ('Canva Pro','canva-pro','Premium templates and brand kit',(SELECT id FROM c WHERE slug='utilities'),149,30,40,'active','🎨',1)
ON CONFLICT (slug) DO NOTHING;
