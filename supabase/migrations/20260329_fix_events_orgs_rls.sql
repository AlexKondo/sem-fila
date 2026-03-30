-- Fix: platform_admin deve poder criar/editar/deletar eventos e organizações

-- ── EVENTS ──
-- Garante que INSERT funciona para platform_admin e org_admin
DROP POLICY IF EXISTS "Org admin cria eventos" ON public.events;
CREATE POLICY "Org admin cria eventos"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (has_role('platform_admin') OR has_role('org_admin'));

-- Garante que UPDATE funciona
DROP POLICY IF EXISTS "Org admin edita eventos" ON public.events;
CREATE POLICY "Org admin edita eventos"
  ON public.events FOR UPDATE TO authenticated
  USING (has_role('platform_admin') OR has_role('org_admin'));

-- Adiciona DELETE (não existia)
DROP POLICY IF EXISTS "Admin deleta eventos" ON public.events;
CREATE POLICY "Admin deleta eventos"
  ON public.events FOR DELETE TO authenticated
  USING (has_role('platform_admin') OR has_role('org_admin'));

-- ── ORGANIZATIONS ──
-- Adiciona DELETE para platform_admin
DROP POLICY IF EXISTS "platform_admin deleta org" ON public.organizations;
CREATE POLICY "platform_admin deleta org"
  ON public.organizations FOR DELETE TO authenticated
  USING (has_role('platform_admin'));

-- Garante GRANT nas tabelas
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
