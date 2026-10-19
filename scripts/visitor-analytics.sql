-- One first-party browser per East Africa calendar day. No email, IP, or page history.
CREATE TABLE IF NOT EXISTS public.site_visits (
  visit_day date NOT NULL,
  visitor_hash text NOT NULL CHECK (visitor_hash ~ '^[a-f0-9]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (visit_day, visitor_hash)
);
ALTER TABLE public.site_visits ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='ccd_vps_runtime') THEN
    GRANT SELECT, INSERT ON public.site_visits TO ccd_vps_runtime;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='site_visits' AND policyname='runtime_read_visits') THEN
      CREATE POLICY runtime_read_visits ON public.site_visits FOR SELECT TO ccd_vps_runtime USING (true);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='site_visits' AND policyname='runtime_insert_visits') THEN
      CREATE POLICY runtime_insert_visits ON public.site_visits FOR INSERT TO ccd_vps_runtime WITH CHECK (true);
    END IF;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='anon') THEN
    REVOKE ALL ON public.site_visits FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname='authenticated') THEN
    REVOKE ALL ON public.site_visits FROM authenticated;
  END IF;
END $$;
