-- Adiciona coluna para armazenar o ID de cobrança do Asaas em cada pedido
-- Necessário para processar estornos automáticos via API

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS asaas_payment_id text,
  ADD COLUMN IF NOT EXISTS payment_method text; -- 'pix' | 'cartão' | 'dinheiro'

-- Índice para lookup rápido por payment_id (ex: webhook Asaas)
CREATE INDEX IF NOT EXISTS orders_asaas_payment_id_idx ON public.orders (asaas_payment_id)
  WHERE asaas_payment_id IS NOT NULL;
