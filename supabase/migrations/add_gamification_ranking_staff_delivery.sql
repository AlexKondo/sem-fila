-- ============================================================
-- Migration: Gamificação, Ranking, Gestão de Staff e Entregadores
-- ============================================================

-- 1. Novo role: deliverer
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'deliverer';

-- ============================================================
-- 2. GAMIFICAÇÃO
-- ============================================================

-- Configuração de níveis (editável pelo admin)
CREATE TABLE IF NOT EXISTS public.level_configs (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_type  text NOT NULL,        -- 'customer' | 'vendor' | 'org_admin'
  level_name    text NOT NULL,        -- 'bronze' | 'silver' | 'gold' | 'platinum'
  level_order   int  NOT NULL,
  min_points    int  NOT NULL DEFAULT 0,
  badge_color   text DEFAULT '#cd7f32',
  badge_emoji   text DEFAULT '🥉',
  benefits      jsonb DEFAULT '[]',   -- [{ "label": "5% desconto" }]
  active        boolean DEFAULT true,
  created_at    timestamptz DEFAULT now(),
  UNIQUE(profile_type, level_name)
);

-- Seed de níveis padrão
INSERT INTO public.level_configs (profile_type, level_name, level_order, min_points, badge_color, badge_emoji, benefits) VALUES
  ('customer','bronze',  1,    0, '#cd7f32', '🥉', '[{"label":"Acesso ao histórico de pedidos"}]'),
  ('customer','silver',  2,  200, '#c0c0c0', '🥈', '[{"label":"5% de desconto em pedidos"},{"label":"Prioridade no suporte"}]'),
  ('customer','gold',    3,  600, '#ffd700', '🥇', '[{"label":"10% de desconto"},{"label":"Ofertas exclusivas"}]'),
  ('customer','platinum',4, 1500, '#e5e4e2', '💎', '[{"label":"15% de desconto"},{"label":"Acesso antecipado a lançamentos"},{"label":"Suporte VIP"}]'),
  ('vendor',  'bronze',  1,    0, '#cd7f32', '🥉', '[{"label":"Dashboard básico"}]'),
  ('vendor',  'silver',  2,  500, '#c0c0c0', '🥈', '[{"label":"Taxa reduzida em 0.5%"},{"label":"Relatórios avançados"}]'),
  ('vendor',  'gold',    3, 2000, '#ffd700', '🥇', '[{"label":"Taxa reduzida em 1%"},{"label":"Destaque na plataforma"}]'),
  ('vendor',  'platinum',4, 5000, '#e5e4e2', '💎', '[{"label":"Taxa zerada"},{"label":"Account manager dedicado"}]')
ON CONFLICT (profile_type, level_name) DO NOTHING;

-- Log de pontos
CREATE TABLE IF NOT EXISTS public.points_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  vendor_id   uuid REFERENCES public.vendors(id)  ON DELETE CASCADE,
  action      text NOT NULL,   -- 'order_placed' | 'order_delivered' | 'review_given'
  points      int  NOT NULL,
  ref_id      uuid,            -- order_id, review_id, etc.
  created_at  timestamptz DEFAULT now()
);

-- Campos de pontos/nível nos profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS points     int  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level      text DEFAULT 'bronze';

-- Campos de pontos/nível nos vendors
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS points     int  DEFAULT 0,
  ADD COLUMN IF NOT EXISTS level      text DEFAULT 'bronze';

-- ============================================================
-- 3. RANKING & MONETIZAÇÃO
-- ============================================================

-- Configurações globais de ranking (master admin)
CREATE TABLE IF NOT EXISTS public.ranking_settings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  feature    text UNIQUE NOT NULL,  -- 'vendor_ranking' | 'dish_ranking' | 'user_ranking'
  active     boolean DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO public.ranking_settings (feature, active) VALUES
  ('vendor_ranking', true),
  ('dish_ranking',   true),
  ('user_ranking',   false)
ON CONFLICT (feature) DO NOTHING;

-- Assinaturas premium de vendors (pagar para features)
CREATE TABLE IF NOT EXISTS public.vendor_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  feature    text NOT NULL,    -- 'hide_ranking' | 'featured_badge' | 'featured_dishes'
  active     boolean DEFAULT true,
  price_paid numeric(10,2),
  expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(vendor_id, feature)
);

-- Scores de ranking em vendors
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS order_count  int            DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_avg   numeric(3,2),
  ADD COLUMN IF NOT EXISTS rating_count int            DEFAULT 0;

-- Scores de ranking em menu_items
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS order_count  int            DEFAULT 0,
  ADD COLUMN IF NOT EXISTS rating_avg   numeric(3,2),
  ADD COLUMN IF NOT EXISTS rating_count int            DEFAULT 0;

-- ============================================================
-- 4. GESTÃO DE STAFF / FUNCIONÁRIOS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.staff_schedules (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  vendor_id    uuid REFERENCES public.vendors(id)  ON DELETE CASCADE,
  days_of_week int[]    DEFAULT '{1,2,3,4,5}',  -- 0=Dom … 6=Sáb
  start_time   time,
  end_time     time,
  permissions  text[]   DEFAULT '{}',
  -- Ex: 'view_orders','manage_menu','call_waiter','deliver_orders'
  active       boolean  DEFAULT true,
  created_at   timestamptz DEFAULT now(),
  UNIQUE(user_id, vendor_id)
);

-- Convites de staff (vendor envia email de convite)
CREATE TABLE IF NOT EXISTS public.staff_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   uuid REFERENCES public.vendors(id) ON DELETE CASCADE,
  email       text NOT NULL,
  role        app_role NOT NULL DEFAULT 'waitstaff',
  token       text UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  accepted_at timestamptz,
  expires_at  timestamptz DEFAULT (now() + interval '7 days'),
  created_at  timestamptz DEFAULT now()
);

-- Vínculo direto staff → vendor (para busca rápida)
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES public.vendors(id);

-- ============================================================
-- 5. ENTREGAS / ENTREGADORES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.deliveries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      uuid REFERENCES public.orders(id)   ON DELETE CASCADE,
  deliverer_id  uuid REFERENCES public.profiles(id),
  vendor_id     uuid REFERENCES public.vendors(id),
  status        text    DEFAULT 'pending',
  -- pending | accepted | in_transit | delivered
  rating        smallint CHECK (rating BETWEEN 1 AND 5),
  rating_note   text,
  assigned_at   timestamptz DEFAULT now(),
  accepted_at   timestamptz,
  delivered_at  timestamptz,
  created_at    timestamptz DEFAULT now()
);

-- Rating agregado do entregador
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS deliverer_rating_avg   numeric(3,2),
  ADD COLUMN IF NOT EXISTS deliverer_rating_count int DEFAULT 0;

-- RLS básico
ALTER TABLE public.level_configs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.points_log            ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ranking_settings      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendor_subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_schedules       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_invites         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deliveries            ENABLE ROW LEVEL SECURITY;

-- Políticas permissivas (service role bypassa RLS, ajuste conforme necessidade)
CREATE POLICY "public read level_configs"    ON public.level_configs       FOR SELECT USING (true);
CREATE POLICY "public read ranking_settings" ON public.ranking_settings    FOR SELECT USING (true);
CREATE POLICY "auth read points_log"         ON public.points_log          FOR SELECT USING (auth.uid() = profile_id);
CREATE POLICY "auth read own deliveries"     ON public.deliveries          FOR SELECT USING (auth.uid() = deliverer_id);
CREATE POLICY "auth read own schedule"       ON public.staff_schedules     FOR SELECT USING (auth.uid() = user_id);
