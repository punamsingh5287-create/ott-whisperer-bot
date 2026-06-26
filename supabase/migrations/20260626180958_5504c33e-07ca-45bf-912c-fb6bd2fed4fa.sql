
-- payment-proofs: admin read/write
CREATE POLICY "admins read payment-proofs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins write payment-proofs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'payment-proofs' AND public.has_role(auth.uid(), 'admin'));

-- branding: admin manage
CREATE POLICY "admins read branding" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins write branding" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update branding" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete branding" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'branding' AND public.has_role(auth.uid(), 'admin'));

-- wallet-qrs: admin manage
CREATE POLICY "admins read wallet-qrs" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'wallet-qrs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins write wallet-qrs" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'wallet-qrs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins update wallet-qrs" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'wallet-qrs' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "admins delete wallet-qrs" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'wallet-qrs' AND public.has_role(auth.uid(), 'admin'));
