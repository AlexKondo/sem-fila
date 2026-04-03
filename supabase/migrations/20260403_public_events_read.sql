-- Permite leitura pública (anon) de eventos e vendors para a landing page

-- Eventos: leitura pública total (clientes precisam ver para achar os kiosks)
DROP POLICY IF EXISTS "Público lê eventos" ON public.events;
CREATE POLICY "Público lê eventos" ON public.events
  FOR SELECT TO anon
  USING (true);

GRANT SELECT ON public.events TO anon;

-- Convites confirmados: leitura pública (para mostrar quais vendors estão no evento)
DROP POLICY IF EXISTS "Público lê convites confirmados" ON public.event_vendor_invitations;
CREATE POLICY "Público lê convites confirmados" ON public.event_vendor_invitations
  FOR SELECT TO anon
  USING (status IN ('confirmed', 'accepted', 'paid'));

GRANT SELECT ON public.event_vendor_invitations TO anon;

-- Vendors ativos: leitura pública (para mostrar nome e ir ao menu)
DROP POLICY IF EXISTS "Público lê vendors ativos" ON public.vendors;
CREATE POLICY "Público lê vendors ativos" ON public.vendors
  FOR SELECT TO anon
  USING (active = true);

GRANT SELECT ON public.vendors TO anon;

NOTIFY pgrst, 'reload schema';
