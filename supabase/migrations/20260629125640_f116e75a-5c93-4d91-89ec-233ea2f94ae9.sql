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
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, 'payment_not_found'::text; RETURN;
  END IF;
  IF v_pay.status = 'approved' THEN
    RETURN QUERY SELECT v_pay.order_id, NULL::text; RETURN;
  END IF;

  SELECT p.* INTO v_product FROM public.products p
    JOIN public.orders o ON o.product_id = p.id
   WHERE o.id = v_pay.order_id FOR UPDATE;

  IF FOUND AND v_product.stock > 0 THEN
    UPDATE public.products SET stock = stock - 1 WHERE id = v_product.id;
  END IF;

  UPDATE public.payments
     SET status='approved', reviewed_by=_admin_id, reviewed_at=now(),
         admin_note=_note, updated_at=now()
   WHERE id=_payment_id;

  UPDATE public.orders SET status='confirmed', updated_at=now() WHERE id=v_pay.order_id;

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

REVOKE ALL ON FUNCTION public.approve_payment(uuid, uuid, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.approve_payment(uuid, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.approve_payment(uuid, uuid, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.approve_payment(uuid, uuid, text) TO service_role;