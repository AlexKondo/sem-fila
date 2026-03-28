-- Adiciona plano de assinatura no nível do USUÁRIO (vale para todas as marcas)
-- plan_id referencia subscription_plans; se NULL = plano gratuito (Iniciante)

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS plan_id uuid REFERENCES public.subscription_plans(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS plan_expires_at timestamptz;

-- Índice para consultas rápidas de plano
CREATE INDEX IF NOT EXISTS idx_profiles_plan_id ON public.profiles(plan_id);
