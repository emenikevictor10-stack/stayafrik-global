
ALTER TABLE public.listings ADD COLUMN IF NOT EXISTS video_url text;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'admin' AND enumtypid = 'public.app_role'::regtype) THEN
    ALTER TYPE public.app_role ADD VALUE 'admin';
  END IF;
END $$;

ALTER TABLE public.payment_methods ADD COLUMN IF NOT EXISTS bank_code text;
ALTER TABLE public.payment_methods ALTER COLUMN exp_month DROP NOT NULL;
ALTER TABLE public.payment_methods ALTER COLUMN exp_year DROP NOT NULL;
