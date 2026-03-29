-- Função SECURITY DEFINER: verifica se auth.uid() é dono do vendor de um staff member
CREATE OR REPLACE FUNCTION public.is_staff_owner(p_staff_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM staff_schedules ss
      JOIN vendors v ON v.id = ss.vendor_id
    WHERE ss.user_id = p_staff_user_id
      AND ss.active = true
      AND v.owner_id = auth.uid()
  );
END;
$$;

-- Remove a policy antiga (só permitia editar o próprio perfil)
DROP POLICY IF EXISTS "Usuário edita o próprio perfil" ON public.profiles;

-- Nova policy: próprio perfil OU dono do vendor do staff
CREATE POLICY "Usuário ou dono do vendor edita perfil"
  ON public.profiles FOR UPDATE TO authenticated
  USING (
    id = auth.uid() OR public.is_staff_owner(id)
  );
