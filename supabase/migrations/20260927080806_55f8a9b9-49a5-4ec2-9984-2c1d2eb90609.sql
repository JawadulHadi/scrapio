CREATE TYPE public.app_role AS ENUM ('operator');
CREATE TYPE public.triage_status AS ENUM ('open','resolved','dismissed');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  role public.app_role NOT NULL,
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.human_triage_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL,
  error_type text NOT NULL DEFAULT 'layout_shift',
  error_message text NOT NULL DEFAULT '',
  raw_payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  status public.triage_status NOT NULL DEFAULT 'open',
  notes text,
  logged_at timestamptz NOT NULL DEFAULT now(),
  resolved_by uuid,
  resolved_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.human_triage_queue TO authenticated;
GRANT ALL ON public.human_triage_queue TO service_role;
ALTER TABLE public.human_triage_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operators manage triage" ON public.human_triage_queue FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'operator')) WITH CHECK (public.has_role(auth.uid(),'operator'));

CREATE TABLE public.scraped_warehouse (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url text NOT NULL UNIQUE,
  title text NOT NULL,
  price numeric NOT NULL DEFAULT 0,
  extracted_at timestamptz NOT NULL DEFAULT now(),
  source_triage_id uuid REFERENCES public.human_triage_queue(id) ON DELETE SET NULL,
  approved_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scraped_warehouse TO authenticated;
GRANT ALL ON public.scraped_warehouse TO service_role;
ALTER TABLE public.scraped_warehouse ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Operators manage warehouse" ON public.scraped_warehouse FOR ALL TO authenticated
  USING (public.has_role(auth.uid(),'operator')) WITH CHECK (public.has_role(auth.uid(),'operator'));

CREATE OR REPLACE FUNCTION public.promote_triage_record(_id uuid, _title text, _price numeric, _notes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE r public.human_triage_queue;
BEGIN
  IF NOT public.has_role(auth.uid(),'operator') THEN RAISE EXCEPTION 'Forbidden'; END IF;
  IF _title IS NULL OR length(trim(_title)) = 0 OR length(_title) > 500 THEN RAISE EXCEPTION 'Title is required'; END IF;
  IF _price IS NULL OR _price < 0 THEN RAISE EXCEPTION 'Price must be zero or more'; END IF;
  SELECT * INTO r FROM public.human_triage_queue WHERE id = _id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Record not found'; END IF;
  INSERT INTO public.scraped_warehouse(url,title,price,extracted_at,source_triage_id,approved_by)
  VALUES (r.url, trim(_title), _price, now(), r.id, auth.uid())
  ON CONFLICT (url) DO UPDATE SET title=EXCLUDED.title, price=EXCLUDED.price, extracted_at=now(),
    source_triage_id=EXCLUDED.source_triage_id, approved_by=EXCLUDED.approved_by;
  UPDATE public.human_triage_queue SET status='resolved', notes=_notes, resolved_by=auth.uid(), resolved_at=now() WHERE id=_id;
END $$;
REVOKE EXECUTE ON FUNCTION public.promote_triage_record(uuid,text,numeric,text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.promote_triage_record(uuid,text,numeric,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.handle_first_operator()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE role='operator') THEN
    INSERT INTO public.user_roles(user_id, role) VALUES (NEW.id, 'operator');
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created_operator AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_first_operator();

INSERT INTO public.human_triage_queue (url, error_type, error_message, raw_payload, logged_at) VALUES
('https://shop.example.com/products/aurora-headphones','layout_shift','AttributeError: ''NoneType'' object has no attribute ''text''\n  at parser.py:42 soup.select_one(".product-title").text','{"engine":"static","selector":".product-title","partial":{"price":"$129.99"}}', now() - interval '2 hours'),
('https://store.example.net/item/88412','captcha','BlockedError: Cloudflare challenge detected (cf-chl-bypass)\n  status=403','{"engine":"interactive","status":403}', now() - interval '5 hours'),
('https://market.example.org/listing/solar-lamp-v2','validation','ValidationError: 1 validation error for ScrapedItemSchema\n  title: String should have at least 1 character','{"engine":"static","partial":{"title":"","price":"1,249.00"}}', now() - interval '9 hours'),
('https://deals.example.com/p/ergonomic-chair','network','httpx.ReadTimeout: timed out after 30.0s','{"engine":"static","retries":3}', now() - interval '1 day'),
('https://spa.example.io/#/product/7731','layout_shift','TimeoutError: waiting for selector ".price-tag" failed: timeout 15000ms exceeded','{"engine":"interactive","selector":".price-tag","partial":{"title":"Nordic Wool Throw"}}', now() - interval '1 day 3 hours'),
('https://outlet.example.com/sku/KX-220','validation','ValueError: could not convert string to float: ''Call for price''','{"engine":"static","partial":{"title":"KX-220 Mechanical Keyboard","price":"Call for price"}}', now() - interval '2 days');