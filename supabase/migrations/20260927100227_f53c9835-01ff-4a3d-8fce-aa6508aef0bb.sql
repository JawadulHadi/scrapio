CREATE TABLE public.sheet_exports (
  owner_id uuid PRIMARY KEY DEFAULT auth.uid(),
  spreadsheet_id text NOT NULL CHECK (length(spreadsheet_id) BETWEEN 10 AND 200),
  sheet_name text NOT NULL DEFAULT 'Scrapefix' CHECK (length(sheet_name) BETWEEN 1 AND 100),
  auto_sync boolean NOT NULL DEFAULT true,
  last_synced_at timestamptz,
  last_error text,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.sheet_exports TO authenticated;
GRANT ALL ON public.sheet_exports TO service_role;
ALTER TABLE public.sheet_exports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage sheet export" ON public.sheet_exports FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());