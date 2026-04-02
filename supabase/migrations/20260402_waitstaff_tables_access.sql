-- Permite que waitstaff (garçom) atualize e leia mesas e fila do vendor

-- vendor_tables: staff ativo pode ler e atualizar (mudar status, merge, split)
DROP POLICY IF EXISTS "waitstaff_vendor_tables_write" ON public.vendor_tables;
CREATE POLICY "waitstaff_vendor_tables_write" ON public.vendor_tables
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_schedules ss
      WHERE ss.user_id = auth.uid()
        AND ss.vendor_id = vendor_tables.vendor_id
        AND ss.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_schedules ss
      WHERE ss.user_id = auth.uid()
        AND ss.vendor_id = vendor_tables.vendor_id
        AND ss.active = true
    )
  );

-- queue_entries: staff ativo pode ler e atualizar (chamar, sentar, cancelar)
DROP POLICY IF EXISTS "waitstaff_queue_entries_write" ON public.queue_entries;
CREATE POLICY "waitstaff_queue_entries_write" ON public.queue_entries
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_schedules ss
      WHERE ss.user_id = auth.uid()
        AND ss.vendor_id = queue_entries.vendor_id
        AND ss.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_schedules ss
      WHERE ss.user_id = auth.uid()
        AND ss.vendor_id = queue_entries.vendor_id
        AND ss.active = true
    )
  );

NOTIFY pgrst, 'reload schema';
