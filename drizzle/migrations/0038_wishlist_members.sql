CREATE TABLE public.wishlist_members (
  wishlist_id uuid NOT NULL REFERENCES public.wishlists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  joined_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (wishlist_id, user_id)
);
GRANT SELECT, DELETE ON public.wishlist_members TO authenticated;
GRANT ALL ON public.wishlist_members TO service_role;
ALTER TABLE public.wishlist_members ENABLE ROW LEVEL SECURITY;

CREATE SCHEMA IF NOT EXISTS private;
CREATE OR REPLACE FUNCTION private.is_wishlist_member(_wl uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.wishlist_members WHERE wishlist_id = _wl AND user_id = _uid)
$$;
CREATE OR REPLACE FUNCTION private.is_wishlist_owner(_wl uuid, _uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.wishlists WHERE id = _wl AND user_id = _uid)
$$;
GRANT USAGE ON SCHEMA private TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_wishlist_member(uuid, uuid), private.is_wishlist_owner(uuid, uuid) TO authenticated;

CREATE POLICY "members see membership" ON public.wishlist_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR private.is_wishlist_owner(wishlist_id, auth.uid()));
CREATE POLICY "leave or remove member" ON public.wishlist_members FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR private.is_wishlist_owner(wishlist_id, auth.uid()));

CREATE POLICY "members read wishlists" ON public.wishlists FOR SELECT TO authenticated
  USING (private.is_wishlist_member(id, auth.uid()));
CREATE POLICY "members edit wishlist items" ON public.wishlist_items FOR ALL TO authenticated
  USING (private.is_wishlist_member(wishlist_id, auth.uid()))
  WITH CHECK (private.is_wishlist_member(wishlist_id, auth.uid()));

CREATE OR REPLACE FUNCTION public.join_wishlist(_token text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _id uuid; _owner uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Sign in to join'; END IF;
  SELECT id, user_id INTO _id, _owner FROM public.wishlists WHERE share_token = _token AND share_token IS NOT NULL;
  IF _id IS NULL THEN RAISE EXCEPTION 'List not found'; END IF;
  IF _owner <> auth.uid() THEN
    INSERT INTO public.wishlist_members(wishlist_id, user_id) VALUES (_id, auth.uid()) ON CONFLICT DO NOTHING;
  END IF;
  RETURN _id;
END $$;
REVOKE EXECUTE ON FUNCTION public.join_wishlist(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.join_wishlist(text) TO authenticated;