-- Adiciona campo free_for_all em premium_features
-- Quando true, todos os vendors têm acesso sem precisar comprar
ALTER TABLE public.premium_features
  ADD COLUMN IF NOT EXISTS free_for_all BOOLEAN NOT NULL DEFAULT false;
