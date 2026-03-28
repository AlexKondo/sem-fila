-- Tabela de histórico de uso de créditos de IA
CREATE TABLE IF NOT EXISTS public.ai_photo_usage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
    type text NOT NULL CHECK (type IN ('image', 'description')),
    credits_used int NOT NULL DEFAULT 1,
    prompt text,
    menu_item_name text, -- snapshot do nome no momento do uso
    created_at timestamptz DEFAULT now()
);

-- Índices para queries frequentes
CREATE INDEX IF NOT EXISTS idx_ai_photo_usage_vendor ON public.ai_photo_usage(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ai_photo_usage_created ON public.ai_photo_usage(created_at DESC);

-- RLS
ALTER TABLE public.ai_photo_usage ENABLE ROW LEVEL SECURITY;

-- Vendor pode ver seu próprio histórico
CREATE POLICY "Vendor vê próprio uso de IA"
    ON public.ai_photo_usage FOR SELECT
    USING (
        vendor_id IN (
            SELECT id FROM public.vendors WHERE owner_id = auth.uid()
        )
    );

-- Insert via API (service role ou authenticated com vendor ownership)
CREATE POLICY "Vendor insere próprio uso"
    ON public.ai_photo_usage FOR INSERT
    WITH CHECK (
        vendor_id IN (
            SELECT id FROM public.vendors WHERE owner_id = auth.uid()
        )
    );

-- GRANT necessário
GRANT SELECT, INSERT ON public.ai_photo_usage TO authenticated;

-- Tabela para idempotência de pagamentos de vendor (evitar crédito duplo via webhook + checkout)
CREATE TABLE IF NOT EXISTS public.vendor_payment_log (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    asaas_payment_id text UNIQUE NOT NULL,
    vendor_id uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
    external_reference text NOT NULL,
    credits_added int NOT NULL DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_vendor_payment_log_asaas ON public.vendor_payment_log(asaas_payment_id);

ALTER TABLE public.vendor_payment_log ENABLE ROW LEVEL SECURITY;
-- Sem policy de SELECT para authenticated — apenas service role usa esta tabela
