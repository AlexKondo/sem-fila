-- =====================================================================
-- Event Manager Core: booths, invitations, event settings
-- =====================================================================

-- Helper: verifica se auth.uid() é org_admin do evento
CREATE OR REPLACE FUNCTION public.is_org_admin_of_event(_event_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.organization_members om ON om.organization_id = e.organization_id
    WHERE e.id = _event_id AND om.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.events e
    JOIN public.organizations o ON o.id = e.organization_id
    WHERE e.id = _event_id AND o.created_by = auth.uid()
  );
END;
$$;

-- Helper: verifica se auth.uid() é membro de uma organização
CREATE OR REPLACE FUNCTION public.is_org_member(_org_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE organization_id = _org_id AND user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.organizations
    WHERE id = _org_id AND created_by = auth.uid()
  );
END;
$$;

-- =====================================================================
-- 1. Novas colunas em events
-- =====================================================================
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS booth_selection_mode text NOT NULL DEFAULT 'choice'
    CHECK (booth_selection_mode IN ('choice', 'lottery')),
  ADD COLUMN IF NOT EXISTS default_booth_fee numeric(10,2) NOT NULL DEFAULT 0;

-- =====================================================================
-- 2. event_booths: posições físicas no mapa do evento
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.event_booths (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  label      text NOT NULL,
  position_x integer NOT NULL DEFAULT 0,
  position_y integer NOT NULL DEFAULT 0,
  width      integer NOT NULL DEFAULT 1,
  height     integer NOT NULL DEFAULT 1,
  vendor_id  uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  status     text NOT NULL DEFAULT 'available'
             CHECK (status IN ('available', 'reserved', 'confirmed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_booths_event ON public.event_booths(event_id);
CREATE INDEX IF NOT EXISTS idx_event_booths_vendor ON public.event_booths(vendor_id);

ALTER TABLE public.event_booths ENABLE ROW LEVEL SECURITY;

-- Qualquer autenticado pode ver booths (vendor precisa ver o mapa)
CREATE POLICY "Booths visíveis" ON public.event_booths
  FOR SELECT TO authenticated USING (true);

-- Org admin do evento ou platform_admin gerencia booths
CREATE POLICY "Org admin gerencia booths" ON public.event_booths
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_admin_of_event(event_id)
    OR public.has_role('platform_admin')
  );

CREATE POLICY "Org admin atualiza booths" ON public.event_booths
  FOR UPDATE TO authenticated
  USING (
    public.is_org_admin_of_event(event_id)
    OR public.has_role('platform_admin')
  )
  WITH CHECK (
    public.is_org_admin_of_event(event_id)
    OR public.has_role('platform_admin')
  );

CREATE POLICY "Org admin deleta booths" ON public.event_booths
  FOR DELETE TO authenticated
  USING (
    public.is_org_admin_of_event(event_id)
    OR public.has_role('platform_admin')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_booths TO authenticated;

-- =====================================================================
-- 3. event_vendor_invitations: convites + pagamento
-- =====================================================================
CREATE TABLE IF NOT EXISTS public.event_vendor_invitations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  vendor_id     uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  vendor_email  text NOT NULL,
  fee_amount    numeric(10,2) NOT NULL DEFAULT 0 CHECK (fee_amount >= 0),
  status        text NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'accepted', 'paid', 'rejected', 'expired')),
  payment_id    text,
  booth_id      uuid REFERENCES public.event_booths(id) ON DELETE SET NULL,
  invited_at    timestamptz NOT NULL DEFAULT now(),
  responded_at  timestamptz,
  paid_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_invitations_event ON public.event_vendor_invitations(event_id);
CREATE INDEX IF NOT EXISTS idx_invitations_vendor ON public.event_vendor_invitations(vendor_id);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.event_vendor_invitations(vendor_email);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.event_vendor_invitations(status);

ALTER TABLE public.event_vendor_invitations ENABLE ROW LEVEL SECURITY;

-- Org admin vê convites dos seus eventos; vendor vê os próprios
CREATE POLICY "Ler convites" ON public.event_vendor_invitations
  FOR SELECT TO authenticated
  USING (
    public.has_role('platform_admin')
    OR public.is_org_admin_of_event(event_id)
    OR vendor_id IN (SELECT id FROM public.vendors WHERE owner_id = auth.uid())
    OR vendor_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

-- Org admin cria convites
CREATE POLICY "Org admin cria convites" ON public.event_vendor_invitations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.is_org_admin_of_event(event_id)
    OR public.has_role('platform_admin')
  );

-- Org admin ou vendor (aceitar/rejeitar) pode atualizar
CREATE POLICY "Atualizar convites" ON public.event_vendor_invitations
  FOR UPDATE TO authenticated
  USING (
    public.has_role('platform_admin')
    OR public.is_org_admin_of_event(event_id)
    OR vendor_id IN (SELECT id FROM public.vendors WHERE owner_id = auth.uid())
    OR vendor_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  )
  WITH CHECK (
    public.has_role('platform_admin')
    OR public.is_org_admin_of_event(event_id)
    OR vendor_id IN (SELECT id FROM public.vendors WHERE owner_id = auth.uid())
    OR vendor_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
  );

-- Org admin pode deletar convites
CREATE POLICY "Org admin deleta convites" ON public.event_vendor_invitations
  FOR DELETE TO authenticated
  USING (
    public.is_org_admin_of_event(event_id)
    OR public.has_role('platform_admin')
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_vendor_invitations TO authenticated;

-- =====================================================================
-- 4. RLS adicionais para org_admin no organizations e events
-- =====================================================================

-- Org admin pode criar organizações
DROP POLICY IF EXISTS "Org admin cria orgs" ON public.organizations;
CREATE POLICY "Org admin cria orgs" ON public.organizations
  FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role('org_admin') OR public.has_role('platform_admin')
  );

-- Org admin vê suas orgs
DROP POLICY IF EXISTS "Org admin vê orgs" ON public.organizations;
CREATE POLICY "Org admin vê orgs" ON public.organizations
  FOR SELECT TO authenticated
  USING (
    public.has_role('platform_admin')
    OR public.is_org_member(id)
  );

-- Org admin edita suas orgs
DROP POLICY IF EXISTS "Org admin edita orgs" ON public.organizations;
CREATE POLICY "Org admin edita orgs" ON public.organizations
  FOR UPDATE TO authenticated
  USING (public.is_org_member(id) OR public.has_role('platform_admin'))
  WITH CHECK (public.is_org_member(id) OR public.has_role('platform_admin'));

-- Org admin deleta suas orgs
DROP POLICY IF EXISTS "Org admin deleta orgs" ON public.organizations;
CREATE POLICY "Org admin deleta orgs" ON public.organizations
  FOR DELETE TO authenticated
  USING (created_by = auth.uid() OR public.has_role('platform_admin'));

-- Events: org admin CRUD nos eventos da sua org
DROP POLICY IF EXISTS "Org admin gerencia eventos" ON public.events;
CREATE POLICY "Org admin gerencia eventos" ON public.events
  FOR ALL TO authenticated
  USING (
    public.has_role('platform_admin')
    OR public.is_org_member(organization_id)
  )
  WITH CHECK (
    public.has_role('platform_admin')
    OR public.is_org_member(organization_id)
  );

-- Organization members: org admin pode gerenciar
DROP POLICY IF EXISTS "Org members access" ON public.organization_members;
CREATE POLICY "Org members access" ON public.organization_members
  FOR ALL TO authenticated
  USING (
    user_id = auth.uid()
    OR public.has_role('platform_admin')
    OR public.is_org_member(organization_id)
  )
  WITH CHECK (
    public.has_role('platform_admin')
    OR public.is_org_member(organization_id)
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.organizations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.organization_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.events TO authenticated;
