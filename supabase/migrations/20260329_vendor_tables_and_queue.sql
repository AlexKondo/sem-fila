-- ============================================================
-- Sistema de Gestão de Mesas + Fila de Espera
-- ============================================================

-- Tabela de mesas individuais do vendor (substitui num_tables simples)
CREATE TABLE IF NOT EXISTS public.vendor_tables (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  table_number TEXT NOT NULL,
  capacity    INT NOT NULL DEFAULT 4,
  status      TEXT NOT NULL DEFAULT 'free' CHECK (status IN ('free', 'occupied', 'dirty', 'reserved')),
  merged_with uuid REFERENCES public.vendor_tables(id) ON DELETE SET NULL,
  occupied_at TIMESTAMPTZ,
  notes       TEXT,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),
  UNIQUE(vendor_id, table_number)
);

-- Fila de espera
CREATE TABLE IF NOT EXISTS public.queue_entries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id     uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  party_size    INT NOT NULL DEFAULT 1,
  status        TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'called', 'seated', 'cancelled', 'no_show')),
  position      INT NOT NULL,
  called_at     TIMESTAMPTZ,
  seated_at     TIMESTAMPTZ,
  cancelled_at  TIMESTAMPTZ,
  table_id      uuid REFERENCES public.vendor_tables(id) ON DELETE SET NULL,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_vendor_tables_vendor ON public.vendor_tables(vendor_id);
CREATE INDEX IF NOT EXISTS idx_vendor_tables_status ON public.vendor_tables(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_entries_vendor ON public.queue_entries(vendor_id);
CREATE INDEX IF NOT EXISTS idx_queue_entries_status ON public.queue_entries(vendor_id, status);
CREATE INDEX IF NOT EXISTS idx_queue_entries_position ON public.queue_entries(vendor_id, position);

-- RLS
ALTER TABLE public.vendor_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.queue_entries ENABLE ROW LEVEL SECURITY;

-- vendor_tables: leitura pública (clientes precisam ver status das mesas), escrita pelo dono
CREATE POLICY "vendor_tables_read_all" ON public.vendor_tables
  FOR SELECT TO authenticated USING (true);

-- Leitura anônima (clientes sem login vendo fila)
ALTER TABLE public.vendor_tables FORCE ROW LEVEL SECURITY;
CREATE POLICY "vendor_tables_read_anon" ON public.vendor_tables
  FOR SELECT TO anon USING (true);

CREATE POLICY "vendor_tables_owner_write" ON public.vendor_tables
  FOR ALL TO authenticated USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE owner_id = auth.uid())
  ) WITH CHECK (
    vendor_id IN (SELECT id FROM public.vendors WHERE owner_id = auth.uid())
  );

CREATE POLICY "vendor_tables_admin_write" ON public.vendor_tables
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

-- queue_entries: leitura pública (clientes veem a fila), escrita pelo dono + inserção por anônimos
CREATE POLICY "queue_entries_read_all" ON public.queue_entries
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "queue_entries_read_anon" ON public.queue_entries
  FOR SELECT TO anon USING (true);

CREATE POLICY "queue_entries_owner_write" ON public.queue_entries
  FOR ALL TO authenticated USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE owner_id = auth.uid())
  ) WITH CHECK (
    vendor_id IN (SELECT id FROM public.vendors WHERE owner_id = auth.uid())
  );

CREATE POLICY "queue_entries_admin_write" ON public.queue_entries
  FOR ALL TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

-- Anônimos podem entrar na fila
CREATE POLICY "queue_entries_anon_insert" ON public.queue_entries
  FOR INSERT TO anon WITH CHECK (true);

ALTER TABLE public.queue_entries FORCE ROW LEVEL SECURITY;

-- GRANTs
GRANT SELECT ON public.vendor_tables TO anon;
GRANT SELECT ON public.vendor_tables TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.vendor_tables TO authenticated;

GRANT SELECT ON public.queue_entries TO anon;
GRANT SELECT, INSERT ON public.queue_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.queue_entries TO authenticated;

-- Habilitar Realtime para atualizações instantâneas
ALTER PUBLICATION supabase_realtime ADD TABLE public.vendor_tables;
ALTER PUBLICATION supabase_realtime ADD TABLE public.queue_entries;
