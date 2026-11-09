DO $$ DECLARE src text; BEGIN
  src := pg_get_functiondef('public.admin_insights(date,date)'::regprocedure);
  src := replace(src, $q$status IN ('success','processed','completed','paid')$q$, $q$status IN ('refunded','success','processed','completed','paid')$q$);
  EXECUTE src;
END $$;