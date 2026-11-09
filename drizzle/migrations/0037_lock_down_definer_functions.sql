-- Server-only helpers: nobody signed in or out may call them directly (edge functions use the service role).
REVOKE EXECUTE ON FUNCTION public.enqueue_email(text, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.delete_email(text, bigint) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.move_to_dlq(text, text, bigint, jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.read_email_batch(text, integer, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.email_queue_dispatch() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.send_alert_email(uuid, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.enqueue_email(text, jsonb), public.delete_email(text, bigint), public.move_to_dlq(text, text, bigint, jsonb),
  public.read_email_batch(text, integer, integer), public.email_queue_dispatch(), public.send_alert_email(uuid, text, text, text, text) TO service_role;

-- Trigger-only functions: never called directly.
REVOKE EXECUTE ON FUNCTION public.app_settings_audit(), public.booking_status_event(), public.email_queue_wake(), public.listing_suspension_guard(),
  public.listings_location_sync(), public.notify_on_reservation(), public.on_reservation_status_change(), public.payment_method_verify_guard(),
  public.recalc_listing_rating(), public.set_booking_listing_code(), public.support_issue_watch() FROM PUBLIC, anon, authenticated;

-- Signed-in only (each checks the caller inside).
REVOKE EXECUTE ON FUNCTION public.admin_health(), public.admin_insights(date, date), public.issue_invoice(uuid, text, text),
  public.staff_addon_action(uuid, text, text), public.staff_change_request_action(uuid, text, text),
  public.booking_actor(), public.setting_int(text, integer) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_health(), public.admin_insights(date, date), public.issue_invoice(uuid, text, text),
  public.staff_addon_action(uuid, text, text), public.staff_change_request_action(uuid, text, text),
  public.booking_actor(), public.setting_int(text, integer) TO authenticated;