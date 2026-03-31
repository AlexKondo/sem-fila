-- Corrige política de UPDATE para convites
-- Convites sempre têm vendor_id (só enviados para cadastrados)
-- Remove referência a auth.users que causa 403

DROP POLICY IF EXISTS "Atualizar convites" ON public.event_vendor_invitations;

CREATE POLICY "Atualizar convites" ON public.event_vendor_invitations
  FOR UPDATE TO authenticated
  USING (
    public.has_role('platform_admin')
    OR public.is_org_admin_of_event(event_id)
    OR vendor_id IN (SELECT id FROM public.vendors WHERE owner_id = auth.uid())
    OR (vendor_id IS NULL AND vendor_email IN (
      SELECT email FROM public.profiles WHERE id = auth.uid()
    ))
  )
  WITH CHECK (
    public.has_role('platform_admin')
    OR public.is_org_admin_of_event(event_id)
    OR vendor_id IN (SELECT id FROM public.vendors WHERE owner_id = auth.uid())
  );
