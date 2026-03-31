-- Função SECURITY DEFINER para verificar se o usuário é vendor convidado/vinculado ao evento
-- Evita recursão de RLS ao consultar outras tabelas com RLS ativo
CREATE OR REPLACE FUNCTION public.is_vendor_of_event(p_event_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.vendors WHERE owner_id = auth.uid() AND event_id = p_event_id
  )
  OR EXISTS (
    SELECT 1 FROM public.event_vendor_invitations evi
    WHERE evi.event_id = p_event_id
      AND (
        evi.vendor_id IN (SELECT v.id FROM public.vendors v WHERE v.owner_id = auth.uid())
        OR evi.vendor_email = (SELECT p.email FROM public.profiles p WHERE p.id = auth.uid())
      )
  );
$$;

-- Permite que vendors leiam eventos para os quais foram convidados ou vinculados
DROP POLICY IF EXISTS "Vendor lê evento vinculado" ON public.events;
CREATE POLICY "Vendor lê evento vinculado" ON public.events
  FOR SELECT TO authenticated
  USING (public.is_vendor_of_event(id));
