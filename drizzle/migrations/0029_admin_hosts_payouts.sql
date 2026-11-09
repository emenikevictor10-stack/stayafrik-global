CREATE TABLE public.host_status (
  host_id uuid PRIMARY KEY,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','approved','suspended')),
  reason text,
  paused_listing_ids uuid[] NOT NULL DEFAULT '{}',
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.host_status TO authenticated;
GRANT ALL ON public.host_status TO service_role;
ALTER TABLE public.host_status ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Hosts read own status" ON public.host_status FOR SELECT TO authenticated USING (auth.uid() = host_id);
CREATE POLICY "Admins read host status" ON public.host_status FOR SELECT TO authenticated USING (private.has_role(auth.uid(), 'admin'));

ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS verified_at timestamptz, ADD COLUMN IF NOT EXISTS verified_by uuid, ADD COLUMN IF NOT EXISTS account_name text;
ALTER TABLE public.payouts ADD COLUMN IF NOT EXISTS due_at timestamptz, ADD COLUMN IF NOT EXISTS hold_reason text, ADD COLUMN IF NOT EXISTS held_at timestamptz, ADD COLUMN IF NOT EXISTS paid_reference text;
UPDATE public.payouts SET due_at = created_at WHERE due_at IS NULL;

-- hosts cannot self-mark a bank account verified
CREATE OR REPLACE FUNCTION public.payment_method_verify_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF private.has_role(auth.uid(), 'admin') OR auth.uid() IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'INSERT' THEN NEW.verified_at := NULL; NEW.verified_by := NULL; RETURN NEW; END IF;
  IF NEW.account_number IS DISTINCT FROM OLD.account_number OR NEW.bank_code IS DISTINCT FROM OLD.bank_code THEN
    NEW.verified_at := NULL; NEW.verified_by := NULL; NEW.account_name := NULL;
  ELSE
    NEW.verified_at := OLD.verified_at; NEW.verified_by := OLD.verified_by; NEW.account_name := OLD.account_name;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER payment_method_verify_guard BEFORE INSERT OR UPDATE ON public.payment_methods FOR EACH ROW EXECUTE FUNCTION public.payment_method_verify_guard();

CREATE OR REPLACE FUNCTION public.queue_payout_on_release() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE _host uuid;
BEGIN
  IF NEW.status = 'released' AND OLD.status IS DISTINCT FROM 'released' AND NEW.source <> 'rayprop' AND NEW.listing_id IS NOT NULL THEN
    _host := coalesce(NEW.host_id, (SELECT host_id FROM public.listings WHERE id = NEW.listing_id));
    IF _host IS NOT NULL THEN
      INSERT INTO public.payouts (host_id, booking_id, amount, currency, status, due_at)
      VALUES (_host, NEW.id, coalesce(NEW.host_payout_kobo / 100.0, round(NEW.total_price / 1.08)), 'NGN', 'pending', now())
      ON CONFLICT (booking_id) WHERE booking_id IS NOT NULL DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END $function$;

-- why a payout can't be paid yet (null = ok)
CREATE OR REPLACE FUNCTION public.payout_block_reason(_host uuid) RETURNS text LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE _idreq boolean;
BEGIN
  IF EXISTS (SELECT 1 FROM host_status WHERE host_id = _host AND status = 'suspended') THEN RETURN 'Host is suspended'; END IF;
  IF NOT EXISTS (SELECT 1 FROM payment_methods WHERE user_id = _host AND is_default AND account_number IS NOT NULL) THEN RETURN 'No bank account added'; END IF;
  IF NOT EXISTS (SELECT 1 FROM payment_methods WHERE user_id = _host AND is_default AND verified_at IS NOT NULL) THEN RETURN 'Bank account not checked'; END IF;
  SELECT coalesce((value->>'id_required')::boolean, false) INTO _idreq FROM app_settings WHERE key = 'features';
  IF coalesce(_idreq,false) AND NOT EXISTS (SELECT 1 FROM kyc_submissions WHERE user_id = _host AND status = 'approved') THEN RETURN 'ID not approved'; END IF;
  RETURN NULL;
END $$;
REVOKE ALL ON FUNCTION public.payout_block_reason(uuid) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.payout_block_reason(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.staff_payout_action(_payout_id uuid, _action text, _reason text DEFAULT NULL, _reference text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE p payouts; _block text;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  SELECT * INTO p FROM payouts WHERE id = _payout_id FOR UPDATE;
  IF p.id IS NULL THEN RAISE EXCEPTION 'Payout not found'; END IF;
  IF _action = 'hold' THEN
    IF p.status NOT IN ('pending','failed') THEN RAISE EXCEPTION 'Only due or failed payouts can be held'; END IF;
    IF coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'A reason is required'; END IF;
    UPDATE payouts SET status='on_hold', hold_reason=trim(_reason), held_at=now(), updated_at=now() WHERE id=p.id;
    PERFORM public.send_alert_email(p.host_id, 'Your payout is on hold', 'Payout on hold', 'Reason: '||trim(_reason), '/host/payouts');
  ELSIF _action = 'release_hold' THEN
    IF p.status <> 'on_hold' THEN RAISE EXCEPTION 'Payout is not on hold'; END IF;
    UPDATE payouts SET status='pending', hold_reason=NULL, held_at=NULL, updated_at=now() WHERE id=p.id;
  ELSIF _action = 'mark_paid' THEN
    IF p.status NOT IN ('pending','processing') THEN RAISE EXCEPTION 'Only due or sending payouts can be marked paid'; END IF;
    IF coalesce(trim(_reference),'') = '' THEN RAISE EXCEPTION 'A transfer reference is required'; END IF;
    IF p.status = 'pending' THEN _block := public.payout_block_reason(p.host_id); IF _block IS NOT NULL THEN RAISE EXCEPTION '%', _block; END IF; END IF;
    UPDATE payouts SET status='paid', paid_reference=trim(_reference), processed_at=now(), processed_by=auth.uid(), failure_reason=NULL, updated_at=now() WHERE id=p.id;
  ELSIF _action = 'retry' THEN
    IF p.status <> 'failed' THEN RAISE EXCEPTION 'Payout has not failed'; END IF;
    UPDATE payouts SET status='pending', failure_reason=NULL, updated_at=now() WHERE id=p.id;
  ELSIF _action = 'cancel' THEN
    IF p.status NOT IN ('pending','on_hold','failed') THEN RAISE EXCEPTION 'This payout cannot be cancelled'; END IF;
    IF coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'A reason is required'; END IF;
    UPDATE payouts SET status='cancelled', failure_reason=trim(_reason), updated_at=now() WHERE id=p.id;
  ELSE RAISE EXCEPTION 'Unknown action'; END IF;
  INSERT INTO admin_audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'payout_'||_action, 'payout', p.id::text, jsonb_build_object('amount', p.amount, 'host_id', p.host_id, 'reason', _reason, 'reference', _reference));
END $$;
REVOKE ALL ON FUNCTION public.staff_payout_action(uuid,text,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.staff_payout_action(uuid,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.staff_host_action(_host_id uuid, _action text, _reason text DEFAULT NULL) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _ids uuid[]; _pm payment_methods;
BEGIN
  IF NOT private.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Admins only'; END IF;
  IF _action = 'approve' THEN
    INSERT INTO host_status(host_id, status, reason, updated_by) VALUES (_host_id, 'approved', _reason, auth.uid())
    ON CONFLICT (host_id) DO UPDATE SET status = CASE WHEN host_status.status='suspended' THEN 'suspended' ELSE 'approved' END, updated_by=auth.uid(), updated_at=now();
  ELSIF _action = 'suspend' THEN
    IF coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'A reason is required'; END IF;
    IF EXISTS (SELECT 1 FROM host_status WHERE host_id=_host_id AND status='suspended') THEN RAISE EXCEPTION 'Already suspended'; END IF;
    SELECT coalesce(array_agg(id),'{}') INTO _ids FROM listings WHERE host_id=_host_id AND is_available;
    UPDATE listings SET is_available=false WHERE id = ANY(_ids);
    INSERT INTO host_status(host_id, status, reason, paused_listing_ids, updated_by) VALUES (_host_id,'suspended',trim(_reason),_ids,auth.uid())
    ON CONFLICT (host_id) DO UPDATE SET status='suspended', reason=trim(_reason), paused_listing_ids=_ids, updated_by=auth.uid(), updated_at=now();
    PERFORM public.send_alert_email(_host_id, 'Your hosting account is paused', 'Hosting paused', 'Reason: '||trim(_reason)||'. Existing bookings continue. Contact support@stayglobal.app.', '/host');
  ELSIF _action = 'unsuspend' THEN
    SELECT paused_listing_ids INTO _ids FROM host_status WHERE host_id=_host_id AND status='suspended';
    IF _ids IS NULL THEN RAISE EXCEPTION 'Host is not suspended'; END IF;
    UPDATE listings SET is_available=true WHERE id = ANY(_ids) AND host_id=_host_id;
    UPDATE host_status SET status='active', reason=NULL, paused_listing_ids='{}', updated_by=auth.uid(), updated_at=now() WHERE host_id=_host_id;
  ELSIF _action = 'verify_bank' THEN
    SELECT * INTO _pm FROM payment_methods WHERE user_id=_host_id AND is_default LIMIT 1;
    IF _pm.id IS NULL OR _pm.account_number IS NULL THEN RAISE EXCEPTION 'Host has no bank account'; END IF;
    UPDATE payment_methods SET verified_at=now(), verified_by=auth.uid(), account_name=coalesce(nullif(trim(_reason),''), holder_name) WHERE id=_pm.id;
  ELSIF _action = 'unverify_bank' THEN
    UPDATE payment_methods SET verified_at=NULL, verified_by=NULL WHERE user_id=_host_id AND is_default;
  ELSE RAISE EXCEPTION 'Unknown action'; END IF;
  INSERT INTO admin_audit_log(actor_id, action, entity_type, entity_id, metadata)
  VALUES (auth.uid(), 'host_'||_action, 'user', _host_id::text, jsonb_build_object('reason', _reason));
END $$;
REVOKE ALL ON FUNCTION public.staff_host_action(uuid,text,text) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.staff_host_action(uuid,text,text) TO authenticated;

-- hosts can't re-list while suspended
CREATE OR REPLACE FUNCTION public.listing_suspension_guard() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.is_available AND NOT private.has_role(auth.uid(),'admin') AND EXISTS (SELECT 1 FROM host_status WHERE host_id=NEW.host_id AND status='suspended') THEN
    NEW.is_available := false;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER listing_suspension_guard BEFORE INSERT OR UPDATE OF is_available ON public.listings FOR EACH ROW EXECUTE FUNCTION public.listing_suspension_guard();

-- admins change payouts only via staff_payout_action
DROP POLICY IF EXISTS "Admins manage payouts" ON public.payouts;
