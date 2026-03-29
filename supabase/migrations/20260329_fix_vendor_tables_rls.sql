-- Fix: usa is_vendor_owner() SECURITY DEFINER para evitar recursão RLS
-- nas policies de vendor_tables e queue_entries

-- Drop policies antigas com subquery recursiva
DROP POLICY IF EXISTS "vendor_tables_owner_write" ON public.vendor_tables;
DROP POLICY IF EXISTS "queue_entries_owner_write" ON public.queue_entries;

-- Recria com SECURITY DEFINER helper
CREATE POLICY "vendor_tables_owner_write" ON public.vendor_tables
  FOR ALL TO authenticated
  USING (public.is_vendor_owner(vendor_id))
  WITH CHECK (public.is_vendor_owner(vendor_id));

CREATE POLICY "queue_entries_owner_write" ON public.queue_entries
  FOR ALL TO authenticated
  USING (public.is_vendor_owner(vendor_id))
  WITH CHECK (public.is_vendor_owner(vendor_id));
