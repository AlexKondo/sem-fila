-- Admin pode editar qualquer perfil (role, nome, telefone etc.)
-- IMPORTANTE: usa has_role() (SECURITY DEFINER) para evitar recursão RLS

-- Recria a policy de UPDATE para incluir admin
DROP POLICY IF EXISTS "Usuário ou dono do vendor edita perfil" ON public.profiles;

CREATE POLICY "Usuário ou dono do vendor edita perfil"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    id = auth.uid()
    OR public.is_staff_owner(id)
    OR public.has_role('platform_admin')
  )
  WITH CHECK (
    id = auth.uid()
    OR public.is_staff_owner(id)
    OR public.has_role('platform_admin')
  );

-- Admin pode deletar perfis (exceto o próprio)
DROP POLICY IF EXISTS "Admin deleta perfis" ON public.profiles;

CREATE POLICY "Admin deleta perfis"
  ON public.profiles FOR DELETE TO authenticated
  USING (
    public.has_role('platform_admin')
    AND id != auth.uid()
  );

-- Recria SELECT — usa has_role() para evitar recursão
DROP POLICY IF EXISTS "Usuário vê perfis" ON public.profiles;
DROP POLICY IF EXISTS "Usuário vê o próprio perfil" ON public.profiles;

CREATE POLICY "Usuário vê perfis"
  ON public.profiles FOR SELECT TO authenticated
  USING (
    id = auth.uid()
    OR public.has_role('platform_admin')
  );
