-- Owner columns
ALTER TABLE public.human_triage_queue ADD COLUMN owner_id uuid DEFAULT auth.uid();
ALTER TABLE public.scraped_warehouse ADD COLUMN owner_id uuid DEFAULT auth.uid();
UPDATE public.human_triage_queue SET owner_id = (SELECT user_id FROM public.user_roles WHERE role='operator' LIMIT 1) WHERE owner_id IS NULL;
UPDATE public.scraped_warehouse SET owner_id = (SELECT user_id FROM public.user_roles WHERE role='operator' LIMIT 1) WHERE owner_id IS NULL;
DELETE FROM public.scraped_warehouse WHERE owner_id IS NULL;
DELETE FROM public.human_triage_queue WHERE owner_id IS NULL;
ALTER TABLE public.human_triage_queue ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.scraped_warehouse ALTER COLUMN owner_id SET NOT NULL;
ALTER TABLE public.scraped_warehouse DROP CONSTRAINT IF EXISTS scraped_warehouse_url_key;
ALTER TABLE public.scraped_warehouse ADD CONSTRAINT scraped_warehouse_owner_url_key UNIQUE (owner_id, url);

-- Jobs
CREATE TABLE public.scraper_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  target_url text NOT NULL CHECK (length(target_url) BETWEEN 1 AND 2048),
  schedule text NOT NULL DEFAULT 'daily' CHECK (schedule IN ('hourly','daily','weekly','manual')),
  engine text NOT NULL DEFAULT 'static' CHECK (engine IN ('static','interactive')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scraper_jobs TO authenticated;
GRANT ALL ON public.scraper_jobs TO service_role;
ALTER TABLE public.scraper_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage jobs" ON public.scraper_jobs FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

ALTER TABLE public.human_triage_queue ADD COLUMN job_id uuid REFERENCES public.scraper_jobs(id) ON DELETE SET NULL;

-- Personal ingest keys
CREATE TABLE public.ingest_keys (
  owner_id uuid PRIMARY KEY DEFAULT auth.uid(),
  key text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24),'hex'),
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.ingest_keys TO authenticated;
GRANT ALL ON public.ingest_keys TO service_role;
ALTER TABLE public.ingest_keys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners manage key" ON public.ingest_keys FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

-- Replace operator policies with owner policies
DROP POLICY IF EXISTS "Operators manage triage" ON public.human_triage_queue;
DROP POLICY IF EXISTS "Operators manage warehouse" ON public.scraped_warehouse;
CREATE POLICY "Owners manage triage" ON public.human_triage_queue FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners manage warehouse" ON public.scraped_warehouse FOR ALL TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());

CREATE OR REPLACE FUNCTION public.promote_triage_record(_id uuid, _title text, _price numeric, _notes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.human_triage_queue;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _title IS NULL OR length(trim(_title)) = 0 OR length(_title) > 500 THEN RAISE EXCEPTION 'Title is required'; END IF;
  IF _price IS NULL OR _price < 0 THEN RAISE EXCEPTION 'Price must be zero or more'; END IF;
  SELECT * INTO r FROM public.human_triage_queue WHERE id = _id AND owner_id = auth.uid() FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Record not found'; END IF;
  INSERT INTO public.scraped_warehouse(owner_id,url,title,price,extracted_at,source_triage_id,approved_by)
  VALUES (auth.uid(), r.url, trim(_title), _price, now(), r.id, auth.uid())
  ON CONFLICT (owner_id,url) DO UPDATE SET title=EXCLUDED.title, price=EXCLUDED.price, extracted_at=now(),
    source_triage_id=EXCLUDED.source_triage_id, approved_by=EXCLUDED.approved_by;
  UPDATE public.human_triage_queue SET status='resolved', notes=_notes, resolved_by=auth.uid(), resolved_at=now() WHERE id=_id;
END $$;

-- Sample data loader for a new workspace
CREATE OR REPLACE FUNCTION public.load_sample_data()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE u uuid := auth.uid(); j1 uuid; j2 uuid;
BEGIN
  IF u IS NULL THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF EXISTS (SELECT 1 FROM public.scraper_jobs WHERE owner_id=u) THEN RETURN; END IF;
  INSERT INTO public.scraper_jobs(owner_id,name,target_url,schedule,engine) VALUES (u,'Shop catalogue','https://shop.example.com/products','daily','static') RETURNING id INTO j1;
  INSERT INTO public.scraper_jobs(owner_id,name,target_url,schedule,engine) VALUES (u,'Marketplace listings','https://market.example.org/listing','hourly','interactive') RETURNING id INTO j2;
  INSERT INTO public.scraper_jobs(owner_id,name,target_url,schedule,engine,active) VALUES (u,'Outlet prices','https://outlet.example.com/sku','weekly','static',false);
  INSERT INTO public.human_triage_queue(owner_id,job_id,url,error_type,error_message,raw_payload,logged_at) VALUES
  (u,j1,'https://shop.example.com/products/aurora-headphones','layout_shift','AttributeError: ''NoneType'' object has no attribute ''text''','{"selector":".product-title","partial":{"price":"$129.99"}}', now()-interval '2 hours'),
  (u,j2,'https://market.example.org/listing/88412','captcha','BlockedError: challenge page detected (403)','{"status":403}', now()-interval '5 hours'),
  (u,j2,'https://market.example.org/listing/solar-lamp-v2','validation','title: String should have at least 1 character','{"partial":{"title":"","price":"1,249.00"}}', now()-interval '1 day'),
  (u,j1,'https://shop.example.com/products/ergonomic-chair','network','ReadTimeout: timed out after 30s','{"retries":3}', now()-interval '2 days'),
  (u,j1,'https://shop.example.com/products/wool-throw','layout_shift','waiting for selector ".price-tag" failed','{"partial":{"title":"Nordic Wool Throw"}}', now()-interval '3 days');
  INSERT INTO public.human_triage_queue(owner_id,job_id,url,error_type,error_message,raw_payload,status,logged_at,resolved_at,resolved_by) VALUES
  (u,j1,'https://shop.example.com/products/desk-lamp','layout_shift','selector changed','{}','resolved',now()-interval '4 days',now()-interval '3 days',u),
  (u,j2,'https://market.example.org/listing/spam','other','duplicate listing','{}','dismissed',now()-interval '5 days',now()-interval '5 days',u);
  INSERT INTO public.scraped_warehouse(owner_id,url,title,price,extracted_at,approved_by) VALUES
  (u,'https://shop.example.com/products/desk-lamp','Brass Desk Lamp',89.00,now()-interval '3 days',u),
  (u,'https://shop.example.com/products/oak-shelf','Oak Wall Shelf',145.50,now()-interval '6 days',u),
  (u,'https://market.example.org/listing/kettle','Copper Kettle 1.7L',59.99,now()-interval '1 day',u);
END $$;
REVOKE EXECUTE ON FUNCTION public.load_sample_data() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.load_sample_data() TO authenticated;