GRANT EXECUTE ON FUNCTION public.refresh_location_counts() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.retag_local_listings() TO service_role, authenticated;
GRANT EXECUTE ON FUNCTION public.set_listing_location(text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.location_audit_summary() TO authenticated;
GRANT EXECUTE ON FUNCTION public.location_merge_report() TO authenticated;