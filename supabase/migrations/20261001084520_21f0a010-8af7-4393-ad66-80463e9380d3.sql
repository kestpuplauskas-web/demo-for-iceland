DROP POLICY IF EXISTS "Public read property images" ON storage.objects;
CREATE POLICY "Staff can list property images" ON storage.objects FOR SELECT TO authenticated
USING (bucket_id IN ('car-images','property-images') AND (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'developer')));

DROP POLICY IF EXISTS "Anyone can submit an inquiry" ON public.inquiries;
CREATE POLICY "Anyone can submit a valid inquiry" ON public.inquiries FOR INSERT TO anon, authenticated
WITH CHECK (
  char_length(btrim(name)) BETWEEN 1 AND 200
  AND char_length(email) BETWEEN 3 AND 320 AND email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'
  AND char_length(btrim(message)) BETWEEN 1 AND 5000
  AND (phone IS NULL OR char_length(phone) <= 50)
  AND read_at IS NULL AND archived_at IS NULL
);