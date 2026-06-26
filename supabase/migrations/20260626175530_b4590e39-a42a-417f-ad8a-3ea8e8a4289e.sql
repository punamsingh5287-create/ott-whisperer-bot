
REVOKE EXECUTE ON FUNCTION public.purchase_product(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purchase_product(uuid, uuid) TO service_role;
