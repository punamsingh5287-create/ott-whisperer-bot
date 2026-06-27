
ALTER TABLE public.payments
  ADD COLUMN IF NOT EXISTS expires_at timestamptz NOT NULL DEFAULT (now() + interval '5 minutes');

CREATE INDEX IF NOT EXISTS idx_payments_pending_expiry
  ON public.payments (expires_at) WHERE status = 'pending';

CREATE OR REPLACE FUNCTION public.expire_stale_payments()
RETURNS TABLE(
  payment_id uuid,
  order_id uuid,
  telegram_id bigint,
  language text,
  product_name text,
  amount numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH expired AS (
    UPDATE public.payments p
       SET status = 'expired',
           admin_note = COALESCE(p.admin_note, 'auto: timeout'),
           updated_at = now()
     WHERE p.status = 'pending'
       AND p.expires_at < now()
    RETURNING p.id, p.order_id, p.bot_user_id, p.amount
  ),
  cancelled_orders AS (
    UPDATE public.orders o
       SET status = 'cancelled', updated_at = now()
      FROM expired e
     WHERE o.id = e.order_id
       AND o.status IN ('awaiting_payment', 'pending_review')
    RETURNING o.id
  )
  SELECT e.id, e.order_id, bu.telegram_id, bu.language,
         pr.name, e.amount
    FROM expired e
    LEFT JOIN public.bot_users bu ON bu.id = e.bot_user_id
    LEFT JOIN public.orders o ON o.id = e.order_id
    LEFT JOIN public.products pr ON pr.id = o.product_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.approve_payment(_payment_id uuid, _admin_id uuid, _note text)
 RETURNS TABLE(order_id uuid, error text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pay public.payments%ROWTYPE;
  v_product public.products%ROWTYPE;
BEGIN
  SELECT * INTO v_pay FROM public.payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN QUERY SELECT NULL::uuid, 'payment_not_found'::text; RETURN; END IF;
  IF v_pay.status = 'approved' THEN RETURN QUERY SELECT v_pay.order_id, NULL::text; RETURN; END IF;
  IF v_pay.status = 'expired' OR v_pay.expires_at < now() THEN
    UPDATE public.payments SET status='expired', updated_at=now() WHERE id=_payment_id AND status<>'approved';
    UPDATE public.orders SET status='cancelled', updated_at=now() WHERE id=v_pay.order_id AND status<>'confirmed';
    RETURN QUERY SELECT v_pay.order_id, 'expired'::text; RETURN;
  END IF;

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
$function$;

DROP FUNCTION IF EXISTS public.submit_payment_proof(uuid, text, text);
CREATE FUNCTION public.submit_payment_proof(_payment_id uuid, _tx_hash text, _screenshot_url text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE v_pay public.payments%ROWTYPE;
BEGIN
  SELECT * INTO v_pay FROM public.payments WHERE id = _payment_id FOR UPDATE;
  IF NOT FOUND THEN RETURN 'payment_not_found'; END IF;
  IF v_pay.status = 'expired' OR (v_pay.status = 'pending' AND v_pay.expires_at < now()) THEN
    UPDATE public.payments SET status='expired', updated_at=now() WHERE id=_payment_id AND status<>'approved';
    UPDATE public.orders SET status='cancelled', updated_at=now() WHERE id=v_pay.order_id AND status<>'confirmed';
    RETURN 'expired';
  END IF;
  IF v_pay.status <> 'pending' THEN RETURN v_pay.status; END IF;
  UPDATE public.payments
     SET tx_hash = COALESCE(_tx_hash, tx_hash),
         screenshot_url = COALESCE(_screenshot_url, screenshot_url),
         status = 'pending',
         updated_at = now()
   WHERE id = _payment_id;
  UPDATE public.orders SET status = 'pending_review', updated_at = now()
   WHERE id = v_pay.order_id;
  RETURN 'ok';
END;
$function$;
