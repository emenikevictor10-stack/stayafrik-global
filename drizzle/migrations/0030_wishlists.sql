CREATE TABLE public.wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 60),
  is_default boolean NOT NULL DEFAULT false,
  share_token text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX wishlists_one_default ON public.wishlists(user_id) WHERE is_default;
CREATE TABLE public.wishlist_items (
  wishlist_id uuid NOT NULL REFERENCES public.wishlists(id) ON DELETE CASCADE,
  listing_ref text NOT NULL CHECK (char_length(listing_ref) BETWEEN 1 AND 80),
  added_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (wishlist_id, listing_ref)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlists TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.wishlist_items TO authenticated;
GRANT ALL ON public.wishlists TO service_role;
GRANT ALL ON public.wishlist_items TO service_role;
ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wishlist_items ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own wishlists" ON public.wishlists FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "own wishlist items" ON public.wishlist_items FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.wishlists w WHERE w.id = wishlist_id AND w.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.wishlists w WHERE w.id = wishlist_id AND w.user_id = auth.uid()));

-- Anyone with the share link can read that one list (name + stays only).
CREATE OR REPLACE FUNCTION public.get_shared_wishlist(_token text)
RETURNS TABLE(name text, listing_refs text[])
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT w.name, COALESCE(array_agg(i.listing_ref ORDER BY i.added_at DESC) FILTER (WHERE i.listing_ref IS NOT NULL), '{}')
  FROM public.wishlists w LEFT JOIN public.wishlist_items i ON i.wishlist_id = w.id
  WHERE _token IS NOT NULL AND char_length(_token) >= 16 AND w.share_token = _token
  GROUP BY w.name
$$;
GRANT EXECUTE ON FUNCTION public.get_shared_wishlist(text) TO anon, authenticated;