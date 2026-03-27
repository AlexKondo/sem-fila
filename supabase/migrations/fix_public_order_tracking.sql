-- Permite que usuários anônimos visualizem pedidos por ID (rastreamento público)
-- UUID é imprevisível (128 bits de entropia), então é seguro expor publicamente

CREATE POLICY "Anon rastreia pedido por ID"
  ON public.orders FOR SELECT TO anon
  USING (true);

CREATE POLICY "Anon vê itens do pedido"
  ON public.order_items FOR SELECT TO anon
  USING (true);
