-- =============================================================================
-- QuickPick - Fix Realtime & RLS for Vendor Dashboard
-- Garante que o painel receba atualizações instantâneas (skill: zero-trust-security)
-- =============================================================================

-- 1. Habilita REPLICA IDENTITY FULL na tabela de pedidos
-- Sem isso, o evento de UPDATE do Realtime vem incompleto (apenas ID no 'old')
-- Isso ajuda na comparação de status no frontend
ALTER TABLE public.orders REPLICA IDENTITY FULL;

-- 2. Habilita a publicação Realtime (caso não esteja ativa)
-- Redundante se já estiver no schema.sql, mas garante o funcionamento
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE public.orders, public.waiter_calls;

-- 3. Abre política de SELECT irrestrita para o dono do quiosque
-- O Realtime respeita o RLS. Se o RLS bloquear pedidos 'pending', o Realtime não envia o evento.
-- O vendedor precisa ver TODOS os seus pedidos para que o painel capture o momento do pagamento.
DROP POLICY IF EXISTS "Vendors can view their own orders" ON public.orders;
CREATE POLICY "Vendors can view their own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (SELECT id FROM vendors WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

-- 4. Notifica o PostgREST para recarregar o schema
NOTIFY pgrst, 'reload schema';
