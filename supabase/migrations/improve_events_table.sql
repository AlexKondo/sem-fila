-- Migration: Melhorar tabela events
-- Adiciona campos de data/hora, endereço e descrição

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS address     text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS start_date  timestamptz,
  ADD COLUMN IF NOT EXISTS end_date    timestamptz,
  ADD COLUMN IF NOT EXISTS start_time  time,
  ADD COLUMN IF NOT EXISTS end_time    time;

-- Adicionar role affiliate ao enum (referenciado no admin dashboard)
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'affiliate';

-- Comentários para documentar
COMMENT ON COLUMN public.events.address     IS 'Endereço completo do evento (rua, número, cidade, estado)';
COMMENT ON COLUMN public.events.description IS 'Descrição/observação do evento ex: Festa beneficente para o Instituto do Câncer';
COMMENT ON COLUMN public.events.start_date  IS 'Data de início do evento';
COMMENT ON COLUMN public.events.end_date    IS 'Data de término do evento';
COMMENT ON COLUMN public.events.start_time  IS 'Horário de abertura (ex: 09:00)';
COMMENT ON COLUMN public.events.end_time    IS 'Horário de encerramento (ex: 22:00)';
