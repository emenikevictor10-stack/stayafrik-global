ALTER TABLE public.kyc_submissions ADD COLUMN IF NOT EXISTS country text, ADD COLUMN IF NOT EXISTS full_name text;

CREATE OR REPLACE FUNCTION public.submit_guest_id(_type text, _number text, _path text, _country text, _full_name text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _cur text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Sign in first'; END IF;
  IF _type NOT IN ('nin','passport') THEN RAISE EXCEPTION 'Unknown ID type'; END IF;
  IF _type = 'nin' AND _number !~ '^\d{4}$' THEN RAISE EXCEPTION 'Enter the last 4 digits of your NIN'; END IF;
  IF _type = 'passport' AND (coalesce(trim(_number),'') = '' OR coalesce(_path,'') = '' OR coalesce(trim(_full_name),'') = '' OR coalesce(trim(_country),'') = '')
    THEN RAISE EXCEPTION 'Add your name, country, passport number and photo'; END IF;
  IF _path <> '' AND split_part(_path,'/',1) <> _uid::text THEN RAISE EXCEPTION 'Invalid file'; END IF;
  SELECT status INTO _cur FROM kyc_submissions WHERE user_id = _uid;
  IF _cur = 'approved' THEN RETURN 'approved'; END IF;
  INSERT INTO kyc_submissions (user_id, id_type, id_number, id_image_url, status, country, full_name, reviewer_notes, reviewed_at)
  VALUES (_uid, _type, CASE WHEN _type='nin' THEN '****'||_number ELSE left(trim(_number),40) END, coalesce(_path,''), 'pending',
          nullif(left(trim(coalesce(_country,'')),60),''), nullif(left(trim(coalesce(_full_name,'')),120),''), NULL, NULL)
  ON CONFLICT (user_id) DO UPDATE SET id_type=EXCLUDED.id_type, id_number=EXCLUDED.id_number, id_image_url=EXCLUDED.id_image_url,
    status='pending', country=EXCLUDED.country, full_name=EXCLUDED.full_name, reviewer_notes=NULL, reviewed_at=NULL, updated_at=now();
  PERFORM notify_admins('ID waiting', 'A guest sent an ID to check.', '/admin/kyc');
  RETURN 'pending';
END $$;
REVOKE ALL ON FUNCTION public.submit_guest_id(text,text,text,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.submit_guest_id(text,text,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.staff_kyc_action(_id uuid, _action text, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r kyc_submissions;
BEGIN
  IF NOT private.has_any_role(auth.uid(), '{admin,listings}'::app_role[]) THEN RAISE EXCEPTION 'Not allowed'; END IF;
  SELECT * INTO r FROM kyc_submissions WHERE id = _id FOR UPDATE;
  IF r.id IS NULL THEN RAISE EXCEPTION 'Not found'; END IF;
  IF r.status <> 'pending' THEN RAISE EXCEPTION 'This ID was already decided'; END IF;
  IF _action = 'approve' THEN
    UPDATE kyc_submissions SET status='approved', reviewer_notes=NULL, reviewed_at=now(), updated_at=now() WHERE id=_id;
    INSERT INTO notifications(user_id,type,title,body,link) VALUES (r.user_id,'kyc','Your ID was checked','You''re all set to book.','/details');
  ELSIF _action = 'reject' THEN
    IF coalesce(trim(_reason),'') = '' THEN RAISE EXCEPTION 'Add a reason'; END IF;
    UPDATE kyc_submissions SET status='rejected', reviewer_notes=left(trim(_reason),500), reviewed_at=now(), updated_at=now() WHERE id=_id;
    INSERT INTO notifications(user_id,type,title,body,link) VALUES (r.user_id,'kyc','Your ID wasn''t accepted','Reason: '||left(trim(_reason),300)||'. Please send it again.','/details');
  ELSE RAISE EXCEPTION 'Unknown action'; END IF;
  INSERT INTO admin_audit_log(actor_id,action,entity_type,entity_id,metadata)
  VALUES (auth.uid(),'kyc_'||_action,'kyc',_id::text,jsonb_build_object('user_id',r.user_id,'reason',_reason));
END $$;
REVOKE ALL ON FUNCTION public.staff_kyc_action(uuid,text,text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.staff_kyc_action(uuid,text,text) TO authenticated;