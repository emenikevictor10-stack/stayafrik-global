CREATE TABLE public.partner_catalogue (
  rayprop_listing_id text PRIMARY KEY,
  record jsonb NOT NULL,
  refreshed_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.partner_catalogue TO service_role;
ALTER TABLE public.partner_catalogue ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.partner_sync_state (
  id integer PRIMARY KEY DEFAULT 1,
  last_full_refresh_at timestamptz,
  blocked_until timestamptz,
  blocked_reason text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.partner_sync_state TO service_role;
GRANT SELECT ON public.partner_sync_state TO authenticated;
ALTER TABLE public.partner_sync_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read partner sync state" ON public.partner_sync_state FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
INSERT INTO public.partner_sync_state(id) VALUES (1) ON CONFLICT DO NOTHING;