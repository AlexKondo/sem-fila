-- Permite que qualquer usuário autenticado leia eventos
-- Dados de evento (nome, data, local) não são sensíveis e precisam ser visíveis
-- para vendors que recebem convites
DROP POLICY IF EXISTS "Authenticated users leem eventos" ON public.events;
CREATE POLICY "Authenticated users leem eventos" ON public.events
  FOR SELECT TO authenticated
  USING (true);

NOTIFY pgrst, 'reload schema';
