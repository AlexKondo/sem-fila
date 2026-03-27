-- Permite que o dono do vendor leia os staff_schedules dos seus vendors
CREATE POLICY "vendor owner read staff schedules"
  ON public.staff_schedules
  FOR SELECT
  USING (
    vendor_id IN (
      SELECT id FROM public.vendors WHERE owner_id = auth.uid()
    )
  );

-- Permite que o dono do vendor atualize (permissões, dias) e desative funcionários
CREATE POLICY "vendor owner update staff schedules"
  ON public.staff_schedules
  FOR UPDATE
  USING (
    vendor_id IN (
      SELECT id FROM public.vendors WHERE owner_id = auth.uid()
    )
  );

-- Permite que o dono do vendor insira staff_schedules (cadastro direto)
CREATE POLICY "vendor owner insert staff schedules"
  ON public.staff_schedules
  FOR INSERT
  WITH CHECK (
    vendor_id IN (
      SELECT id FROM public.vendors WHERE owner_id = auth.uid()
    )
  );
