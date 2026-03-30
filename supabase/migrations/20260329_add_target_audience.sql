-- Adiciona campo target_audience nas tabelas de benefícios e regras
-- para indicar QUEM recebe: vendor, affiliate ou customer

-- Cria o enum
DO $$ BEGIN
  CREATE TYPE public.benefit_audience AS ENUM ('vendor', 'affiliate', 'customer');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Adiciona coluna em premium_features
ALTER TABLE public.premium_features
  ADD COLUMN IF NOT EXISTS target_audience public.benefit_audience NOT NULL DEFAULT 'vendor';

-- Adiciona coluna em auto_benefit_rules
ALTER TABLE public.auto_benefit_rules
  ADD COLUMN IF NOT EXISTS target_audience public.benefit_audience NOT NULL DEFAULT 'vendor';
