-- ============================================================
-- Migration: Tabela support_tickets (suporte prioritário)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id     uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  subject       text NOT NULL,
  message       text NOT NULL,
  status        text NOT NULL DEFAULT 'open',  -- open, in_progress, resolved, closed
  priority      boolean NOT NULL DEFAULT false, -- true = suporte prioritário (premium)
  admin_reply   text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Vendor pode ler e criar tickets do próprio vendor
CREATE POLICY "vendor_read_own_tickets" ON public.support_tickets
  FOR SELECT TO authenticated
  USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE owner_id = auth.uid())
  );

CREATE POLICY "vendor_insert_own_tickets" ON public.support_tickets
  FOR INSERT TO authenticated
  WITH CHECK (
    vendor_id IN (SELECT id FROM public.vendors WHERE owner_id = auth.uid())
  );

-- Admin tem acesso total
CREATE POLICY "admin_full_access_tickets" ON public.support_tickets
  FOR ALL TO authenticated
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

-- Índices
CREATE INDEX IF NOT EXISTS idx_support_tickets_vendor ON public.support_tickets(vendor_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_priority ON public.support_tickets(priority);

-- GRANTs
GRANT SELECT, INSERT ON public.support_tickets TO authenticated;
GRANT UPDATE, DELETE ON public.support_tickets TO authenticated;
