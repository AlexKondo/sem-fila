-- Permite que vendors leiam eventos para os quais foram convidados ou estão vinculados
-- Sem isso, o join events(...) na query de convites falha por RLS

CREATE POLICY "Vendor lê evento vinculado" ON public.events
  FOR SELECT TO authenticated
  USING (
    -- Vendor vinculado ao evento
    id IN (SELECT event_id FROM public.vendors WHERE owner_id = auth.uid() AND event_id IS NOT NULL)
    -- Vendor convidado para o evento
    OR id IN (
      SELECT event_id FROM public.event_vendor_invitations
      WHERE vendor_id IN (SELECT v.id FROM public.vendors v WHERE v.owner_id = auth.uid())
         OR vendor_email = (SELECT email FROM public.profiles WHERE id = auth.uid())
    )
  );
