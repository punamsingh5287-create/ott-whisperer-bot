
ALTER TABLE public.bot_users
  ADD COLUMN IF NOT EXISTS balance numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'en';

CREATE TABLE IF NOT EXISTS public.wallet_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_user_id uuid NOT NULL REFERENCES public.bot_users(id) ON DELETE CASCADE,
  network wallet_network NOT NULL,
  wallet_id uuid REFERENCES public.wallets(id),
  amount numeric NOT NULL,
  tx_hash text,
  screenshot_url text,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wallet_topups TO authenticated;
GRANT ALL ON public.wallet_topups TO service_role;
ALTER TABLE public.wallet_topups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admins manage topups" ON public.wallet_topups FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));
