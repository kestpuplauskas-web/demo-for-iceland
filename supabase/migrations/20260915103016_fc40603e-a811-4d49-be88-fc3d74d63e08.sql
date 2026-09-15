DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'bookings','booking_notifications','properties','property_settings','property_documents',
    'property_events','property_investments','property_maintenance','expenses','invoices',
    'payment_transactions','content_templates','content_translations','contract_templates',
    'signed_contracts','housekeeping_tasks','housekeeping_comments','room_status','page_views'
  ] LOOP
    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (public.has_role(auth.uid(), ''viewer''::public.app_role))',
      'Viewers read ' || t, t
    );
  END LOOP;
END $$;