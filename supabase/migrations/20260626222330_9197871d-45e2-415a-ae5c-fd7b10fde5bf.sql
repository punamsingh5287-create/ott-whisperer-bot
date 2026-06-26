
CREATE OR REPLACE FUNCTION public.purchase_with_wallet(_product_id uuid, _bot_user_id uuid)
RETURNS TABLE(order_id uuid, product_name text, amount numeric, new_balance numeric, error text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_user public.bot_users%ROWTYPE;
  v_order_id uuid;
  v_new_balance numeric;
BEGIN
  SELECT * INTO v_product FROM public.products WHERE id = _product_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::text, NULL::numeric, NULL::numeric, 'product_not_found'::text; RETURN;
  END IF;
  IF v_product.status <> 'active' THEN
    RETURN QUERY SELECT NULL::uuid, v_product.name, v_product.price, NULL::numeric, 'inactive'::text; RETURN;
  END IF;
  IF v_product.stock <= 0 THEN
    RETURN QUERY SELECT NULL::uuid, v_product.name, v_product.price, NULL::numeric, 'out_of_stock'::text; RETURN;
  END IF;

  SELECT * INTO v_user FROM public.bot_users WHERE id = _bot_user_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, v_product.name, v_product.price, NULL::numeric, 'user_not_found'::text; RETURN;
  END IF;

  IF COALESCE(v_user.balance, 0) < v_product.price THEN
    RETURN QUERY SELECT NULL::uuid, v_product.name, v_product.price, v_user.balance, 'insufficient_balance'::text; RETURN;
  END IF;

  UPDATE public.products SET stock = stock - 1 WHERE id = _product_id;

  UPDATE public.bot_users
    SET balance = balance - v_product.price,
        total_spent = total_spent + v_product.price,
        is_subscribed = true,
        last_active = now()
    WHERE id = _bot_user_id
    RETURNING balance INTO v_new_balance;

  INSERT INTO public.orders (bot_user_id, product_id, amount, status)
  VALUES (_bot_user_id, _product_id, v_product.price, 'confirmed')
  RETURNING id INTO v_order_id;

  UPDATE public.referrals SET reward_status = 'rewarded'
    WHERE referred_bot_user_id = _bot_user_id AND reward_status = 'pending';

  RETURN QUERY SELECT v_order_id, v_product.name, v_product.price, v_new_balance, NULL::text;
END;
$$;
