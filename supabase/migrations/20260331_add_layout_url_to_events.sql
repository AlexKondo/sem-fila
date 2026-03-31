-- Adiciona coluna layout_url à tabela events para armazenar link do mapa/layout
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS layout_url text;

COMMENT ON COLUMN public.events.layout_url IS 'URL do mapa ou layout visual do evento (imagem ou document share)';
