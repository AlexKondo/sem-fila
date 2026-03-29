-- ============================================================
-- Tabela: point_rules (parâmetros de pontuação configuráveis)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.point_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  target TEXT NOT NULL CHECK (target IN ('customer', 'vendor')),
  points INTEGER NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_point_rules_active ON public.point_rules(active);
CREATE INDEX IF NOT EXISTS idx_point_rules_action ON public.point_rules(action);

-- RLS
ALTER TABLE public.point_rules ENABLE ROW LEVEL SECURITY;

-- Leitura pública (necessário para triggers/funções consultarem os valores)
CREATE POLICY "point_rules_read_all"
  ON public.point_rules FOR SELECT
  USING (true);

-- Escrita apenas platform_admin
CREATE POLICY "point_rules_admin_write"
  ON public.point_rules FOR ALL
  USING (public.has_role('platform_admin'))
  WITH CHECK (public.has_role('platform_admin'));

-- GRANT
GRANT SELECT ON public.point_rules TO authenticated, anon;
GRANT INSERT, UPDATE, DELETE ON public.point_rules TO authenticated;

-- Seed: valores padrão de pontuação
INSERT INTO public.point_rules (action, label, target, points, active, sort_order) VALUES
  ('order_placed',    'Pedido realizado',         'customer', 10, true, 1),
  ('order_delivered',  'Pedido entregue',          'customer',  5, true, 2),
  ('review_given',     'Avaliação dada',           'customer',  5, true, 3),
  ('referral_signup',  'Indicação cadastrada',     'customer', 15, true, 4),
  ('sale_made',        'Venda realizada',          'vendor',   10, true, 5),
  ('fast_delivery',    'Entrega rápida (< 10min)', 'vendor',    5, true, 6),
  ('five_star_review', 'Avaliação 5 estrelas',     'vendor',    3, true, 7)
ON CONFLICT (action) DO NOTHING;

-- Trigger updated_at
CREATE OR REPLACE FUNCTION public.trigger_point_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_point_rules_updated_at ON public.point_rules;
CREATE TRIGGER trg_point_rules_updated_at
  BEFORE UPDATE ON public.point_rules
  FOR EACH ROW EXECUTE FUNCTION public.trigger_point_rules_updated_at();
