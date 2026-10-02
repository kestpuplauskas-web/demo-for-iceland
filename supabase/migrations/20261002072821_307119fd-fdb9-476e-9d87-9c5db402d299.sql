CREATE POLICY property_images_admin_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'property-images' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'developer')));
CREATE POLICY property_images_admin_update ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'property-images' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'developer')))
  WITH CHECK (bucket_id = 'property-images' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'developer')));
CREATE POLICY property_images_admin_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'property-images' AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'developer')));