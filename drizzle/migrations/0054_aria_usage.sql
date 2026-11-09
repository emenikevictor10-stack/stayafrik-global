CREATE TABLE public.aria_usage (id bigserial PRIMARY KEY, actor text NOT NULL, created_at timestamptz NOT NULL DEFAULT now());
GRANT ALL ON public.aria_usage TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.aria_usage_id_seq TO service_role;
ALTER TABLE public.aria_usage ENABLE ROW LEVEL SECURITY;
CREATE INDEX aria_usage_actor_at ON public.aria_usage (actor, created_at);