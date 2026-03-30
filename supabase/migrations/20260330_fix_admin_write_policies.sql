-- Políticas de escrita para platform_admin em platform_config e subscription_plans
-- Ambas tabelas só tinham SELECT, impedindo o admin de salvar qualquer coisa.

-- ========== platform_config ==========
CREATE POLICY "Admin gerencia configs"
  ON public.platform_config
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

-- ========== subscription_plans ==========
CREATE POLICY "Admin gerencia planos"
  ON public.subscription_plans
  FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );
