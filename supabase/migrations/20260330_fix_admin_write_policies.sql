-- Políticas de escrita para platform_admin em platform_config e subscription_plans

-- ========== platform_config ==========
CREATE POLICY "Admin insere configs"
  ON public.platform_config
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

CREATE POLICY "Admin atualiza configs"
  ON public.platform_config
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

-- ========== subscription_plans ==========
CREATE POLICY "Admin insere planos"
  ON public.subscription_plans
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

CREATE POLICY "Admin atualiza planos"
  ON public.subscription_plans
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

CREATE POLICY "Admin deleta planos"
  ON public.subscription_plans
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );
