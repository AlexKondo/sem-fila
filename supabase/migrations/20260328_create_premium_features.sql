-- ============================================================
-- Migration: Tabela premium_features (benefícios configuráveis pelo admin)
-- ============================================================

-- 1. Criar tabela premium_features
CREATE TABLE IF NOT EXISTS public.premium_features (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL UNIQUE,
  name          text NOT NULL,
  description   text,
  price         numeric(10,2) NOT NULL DEFAULT 0,
  duration_days int NOT NULL DEFAULT 30,
  active        boolean DEFAULT true,
  sort_order    int DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- 2. RLS na premium_features
ALTER TABLE public.premium_features ENABLE ROW LEVEL SECURITY;

-- Leitura pública (vendors precisam ver os benefícios disponíveis)
DROP POLICY IF EXISTS "premium_features_read_all" ON public.premium_features;
CREATE POLICY "premium_features_read_all"
  ON public.premium_features FOR SELECT
  USING (true);

-- Escrita apenas para platform_admin
DROP POLICY IF EXISTS "premium_features_admin_write" ON public.premium_features;
CREATE POLICY "premium_features_admin_write"
  ON public.premium_features FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role::text = 'platform_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role::text = 'platform_admin'
    )
  );

-- 3. Ajustar RLS do vendor_subscriptions (vendor pode ler as próprias)
DROP POLICY IF EXISTS "vendor_read_own" ON public.vendor_subscriptions;
DROP POLICY IF EXISTS "vendor_read_own_subs" ON public.vendor_subscriptions;
CREATE POLICY "vendor_read_own_subs"
  ON public.vendor_subscriptions FOR SELECT
  USING (
    vendor_id IN (
      SELECT id FROM public.vendors WHERE owner_id = auth.uid()
    )
  );

-- Admin tem acesso total ao vendor_subscriptions
DROP POLICY IF EXISTS "admin_full_access" ON public.vendor_subscriptions;
DROP POLICY IF EXISTS "admin_full_access_subs" ON public.vendor_subscriptions;
CREATE POLICY "admin_full_access_subs"
  ON public.vendor_subscriptions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role::text = 'platform_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role::text = 'platform_admin'
    )
  );

-- 4. Índices de performance
CREATE INDEX IF NOT EXISTS idx_premium_features_active ON public.premium_features(active);
CREATE INDEX IF NOT EXISTS idx_premium_features_sort ON public.premium_features(sort_order);
CREATE INDEX IF NOT EXISTS idx_vendor_subscriptions_vendor ON public.vendor_subscriptions(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_subscriptions_feature ON public.vendor_subscriptions(feature);

-- 5. Seed de benefícios premium padrão
INSERT INTO public.premium_features (slug, name, description, price, duration_days, active, sort_order) VALUES
  ('destaque_plataforma',
   'Destaque na Plataforma',
   'Sua barraca aparece em destaque no topo da listagem do evento, com badge exclusivo.',
   49.90, 30, true, 1),

  ('relatorio_faturamento',
   'Relatório por Faixa de Faturamento',
   'Acesse relatórios detalhados de faturamento por faixa: diário, semanal e mensal, com comparativo entre períodos.',
   29.90, 30, true, 2),

  ('painel_eficiencia',
   'Painel de Eficiência de Atendimento',
   'Acompanhe o tempo médio de preparo, taxa de cancelamento e ranking de velocidade da sua barraca.',
   39.90, 30, true, 3),

  ('selo_top_vendas',
   'Selo Top Vendas',
   'Ganhe o selo "Top Vendas" visível para clientes quando sua barraca atingir o top 3 do evento.',
   19.90, 30, true, 4),

  ('analise_cardapio',
   'Análise de Cardápio Inteligente',
   'Saiba quais pratos vendem mais, quais têm maior margem e receba sugestões de otimização.',
   34.90, 30, true, 5),

  ('prioridade_suporte',
   'Suporte Prioritário',
   'Atendimento prioritário via chat com tempo de resposta reduzido.',
   14.90, 30, true, 6)
ON CONFLICT (slug) DO NOTHING;

-- 6. Tabela de regras automáticas de benefícios
CREATE TABLE IF NOT EXISTS public.auto_benefit_rules (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  metric        text NOT NULL,          -- 'monthly_revenue' | 'rating_avg' | 'order_count' | 'cancellation_rate' | 'avg_prep_time'
  operator      text NOT NULL DEFAULT '>=', -- '>=' | '<=' | '>' | '<' | '='
  threshold     numeric(12,2) NOT NULL,
  benefit_slug  text NOT NULL REFERENCES public.premium_features(slug),
  duration_days int NOT NULL DEFAULT 30,
  active        boolean DEFAULT true,
  sort_order    int DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.auto_benefit_rules ENABLE ROW LEVEL SECURITY;

-- Leitura pública (vendors veem as regras para saber como ganhar benefícios)
DROP POLICY IF EXISTS "auto_rules_read_all" ON public.auto_benefit_rules;
CREATE POLICY "auto_rules_read_all"
  ON public.auto_benefit_rules FOR SELECT
  USING (true);

-- Escrita apenas para platform_admin
DROP POLICY IF EXISTS "auto_rules_admin_write" ON public.auto_benefit_rules;
CREATE POLICY "auto_rules_admin_write"
  ON public.auto_benefit_rules FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role::text = 'platform_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role::text = 'platform_admin'
    )
  );

CREATE INDEX IF NOT EXISTS idx_auto_benefit_rules_active ON public.auto_benefit_rules(active);
CREATE INDEX IF NOT EXISTS idx_auto_benefit_rules_metric ON public.auto_benefit_rules(metric);

GRANT SELECT ON public.auto_benefit_rules TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.auto_benefit_rules TO authenticated;

-- Seed de regras automáticas padrão
INSERT INTO public.auto_benefit_rules (name, description, metric, operator, threshold, benefit_slug, duration_days, active, sort_order) VALUES
  ('Destaque por Faturamento',
   'Vendors com faturamento mensal acima de R$ 5.000 ganham destaque na plataforma.',
   'monthly_revenue', '>=', 5000.00, 'destaque_plataforma', 30, true, 1),

  ('Selo Top Vendas por Volume',
   'Vendors com mais de 200 pedidos no mês ganham o selo Top Vendas.',
   'order_count', '>=', 200, 'selo_top_vendas', 30, true, 2),

  ('Destaque por Avaliação',
   'Vendors com avaliação média acima de 4.5 ganham destaque na plataforma.',
   'rating_avg', '>=', 4.50, 'destaque_plataforma', 30, true, 3),

  ('Eficiência no Atendimento',
   'Vendors com taxa de cancelamento abaixo de 5% ganham o painel de eficiência.',
   'cancellation_rate', '<=', 5.00, 'painel_eficiencia', 30, true, 4),

  ('Rapidez no Preparo',
   'Vendors com tempo médio de preparo abaixo de 15 minutos ganham análise de cardápio.',
   'avg_prep_time', '<=', 15.00, 'analise_cardapio', 30, true, 5)
ON CONFLICT DO NOTHING;

-- 7. GRANT para authenticated
GRANT SELECT ON public.premium_features TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.premium_features TO authenticated;
GRANT SELECT ON public.vendor_subscriptions TO authenticated;
GRANT INSERT, UPDATE ON public.vendor_subscriptions TO authenticated;
