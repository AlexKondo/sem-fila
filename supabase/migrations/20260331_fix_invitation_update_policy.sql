-- Corrige política de UPDATE para convites
-- Convites sempre têm vendor_id (só enviados para cadastrados)
-- Remove referência a auth.users que causa 403

-- Corrige política de UPDATE para convites e vinculação de vendor
DROP POLICY IF EXISTS "Atualizar convites" ON public.event_vendor_invitations;

CREATE POLICY "Atualizar convites" ON public.event_vendor_invitations
  FOR UPDATE TO authenticated
  USING (
    public.has_role('platform_admin')
    OR public.is_org_admin_of_event(event_id)
    OR vendor_id IN (SELECT id FROM public.vendors WHERE owner_id = auth.uid())
    OR (vendor_id IS NULL AND vendor_email ILIKE (SELECT email FROM public.profiles WHERE id = auth.uid()))
  )
  WITH CHECK (
    public.has_role('platform_admin')
    OR public.is_org_admin_of_event(event_id)
    OR vendor_id IN (SELECT id FROM public.vendors WHERE owner_id = auth.uid())
  );

-- Permite que o vendor se vincule ao evento na sua própria tabela
DROP POLICY IF EXISTS "Vendor vincula evento" ON public.vendors;
CREATE POLICY "Vendor vincula evento" ON public.vendors
  FOR UPDATE TO authenticated
  USING (owner_id = auth.uid())
  WITH CHECK (owner_id = auth.uid());
