CREATE OR REPLACE FUNCTION public.send_alert_email(_user_id uuid, _subject text, _heading text, _body text, _link text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _to text;
  _mid uuid := gen_random_uuid();
  _url text;
BEGIN
  SELECT email INTO _to FROM public.profiles WHERE user_id = _user_id;
  IF _to IS NULL OR _to = '' THEN RETURN; END IF;
  IF EXISTS (SELECT 1 FROM public.suppressed_emails WHERE email = _to) THEN RETURN; END IF;

  _url := 'https://stayglobal.app' || COALESCE(_link, '/');

  PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
    'message_id', _mid::text,
    'to', _to,
    'from', 'StayGlobal <noreply@notify.stayglobal.app>',
    'sender_domain', 'notify.stayglobal.app',
    'subject', _subject,
    'html', '<!doctype html><html><body style="margin:0;background:#0b0b0f;font-family:Helvetica,Arial,sans-serif;color:#f5f5f7">'
      || '<div style="max-width:520px;margin:0 auto;padding:32px 24px">'
      || '<div style="font-size:20px;font-weight:800;letter-spacing:-0.5px;margin-bottom:24px">Stay</div>'
      || '<div style="background:#15151c;border:1px solid #26262f;border-radius:16px;padding:24px">'
      || '<h1 style="margin:0 0 8px;font-size:18px">' || _heading || '</h1>'
      || '<p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#b9b9c4">' || _body || '</p>'
      || '<a href="' || _url || '" style="display:inline-block;background:#e0b64c;color:#0b0b0f;font-weight:700;font-size:14px;padding:12px 20px;border-radius:999px;text-decoration:none">Open StayGlobal</a>'
      || '</div>'
      || '<p style="margin:20px 0 0;font-size:11px;color:#6c6c7a">You are receiving this because you host on StayGlobal.</p>'
      || '</div></body></html>',
    'text', _heading || E'\n\n' || _body || E'\n\n' || _url,
    'purpose', 'transactional',
    'label', 'host_alert',
    'idempotency_key', 'host-alert-' || _mid::text,
    'queued_at', now()
  ));
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'send_alert_email failed: %', SQLERRM;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_alert_email(uuid, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.send_alert_email(uuid, text, text, text, text) TO service_role;

CREATE OR REPLACE FUNCTION public.notify_on_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _host uuid; _title text;
BEGIN
  SELECT host_id, title INTO _host, _title FROM public.listings WHERE id = NEW.listing_id;
  IF _host IS NOT NULL THEN
    INSERT INTO public.notifications(user_id, type, title, body, link)
    VALUES (_host, 'booking', 'New booking request', 'A guest booked: ' || COALESCE(_title,'your listing'), '/escrow');

    PERFORM public.send_alert_email(
      _host,
      'New booking on StayGlobal',
      'You have a new booking',
      'A guest just booked <strong>' || COALESCE(_title,'your listing') || '</strong>. Come online to confirm the details and chat with your guest.',
      '/escrow'
    );
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_on_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _from text; _recent boolean;
BEGIN
  SELECT COALESCE(full_name, email, 'Someone') INTO _from FROM public.profiles WHERE user_id = NEW.sender_id;

  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (NEW.receiver_id, 'message', 'New message', _from || ': ' || left(NEW.content, 80), '/messages/' || NEW.sender_id::text);

  -- Throttle: at most one email per conversation every 30 minutes
  SELECT EXISTS (
    SELECT 1 FROM public.messages m
    WHERE m.sender_id = NEW.sender_id
      AND m.receiver_id = NEW.receiver_id
      AND m.id <> NEW.id
      AND m.created_at > now() - INTERVAL '30 minutes'
  ) INTO _recent;

  IF NOT _recent THEN
    PERFORM public.send_alert_email(
      NEW.receiver_id,
      'New message on StayGlobal',
      _from || ' sent you a message',
      'Come online to reply: “' || left(replace(NEW.content, '<', '&lt;'), 120) || '”',
      '/messages/' || NEW.sender_id::text
    );
  END IF;

  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.notify_on_reservation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _title text;
BEGIN
  SELECT title INTO _title FROM public.listings WHERE id = NEW.listing_id;
  INSERT INTO public.notifications(user_id, type, title, body, link)
  VALUES (NEW.host_id, 'reservation', 'New viewing request', 'A guest requested a 4h hold on: ' || COALESCE(_title,'your listing'), '/reservations');

  PERFORM public.send_alert_email(
    NEW.host_id,
    'Viewing request on StayGlobal',
    'A guest wants to view your place',
    'Someone requested a 4-hour hold on <strong>' || COALESCE(_title,'your listing') || '</strong>. Approve or decline it before it lapses.',
    '/reservations'
  );

  RETURN NEW;
END; $$;