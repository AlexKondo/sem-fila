-- Permite que platform_admin leia todos os staff_schedules
CREATE POLICY "platform_admin reads all staff schedules"
  ON public.staff_schedules
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
  );
