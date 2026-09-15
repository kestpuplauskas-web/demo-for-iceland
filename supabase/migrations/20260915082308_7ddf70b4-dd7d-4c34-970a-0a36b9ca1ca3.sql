-- 1) Revoke public/authenticated EXECUTE on internal SECURITY DEFINER functions
REVOKE EXECUTE ON FUNCTION public.cancel_expired_pending_bookings() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.claim_invoice_number() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_system_snapshot(text, uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.restore_system_snapshot(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_active_booked_dates() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_property_booked_dates(uuid) FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.create_room_status_for_property() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.ensure_single_active_template() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_api_clients_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_booking_number() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.set_property_settings_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_content_translations_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_room_status_updated_at() FROM anon, authenticated, PUBLIC;
REVOKE EXECUTE ON FUNCTION public.touch_updated_at() FROM anon, authenticated, PUBLIC;

-- Keep only what the app needs, signed-in only
REVOKE EXECUTE ON FUNCTION public.admin_get_door_code(uuid) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_door_code(uuid) TO authenticated, service_role;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

GRANT EXECUTE ON FUNCTION public.cancel_expired_pending_bookings() TO service_role;
GRANT EXECUTE ON FUNCTION public.claim_invoice_number() TO service_role;
GRANT EXECUTE ON FUNCTION public.create_system_snapshot(text, uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.restore_system_snapshot(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.get_active_booked_dates() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_property_booked_dates(uuid) TO service_role;

-- 2) Column-level protection for properties.door_code
REVOKE SELECT ON public.properties FROM anon, authenticated;
GRANT SELECT (
  id, name, category, year, price_per_night, cover_image_url, image_urls, features,
  price_tiers, is_active, sort_order, created_at, updated_at, status, property_type,
  description, address, city, country, lat, lng, area_m2, max_guests, beds, rooms,
  amenities, extra_services, ical_import_url, ical_last_sync_at, ical_last_status,
  location_note
) ON public.properties TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.properties TO authenticated;
GRANT ALL ON public.properties TO service_role;