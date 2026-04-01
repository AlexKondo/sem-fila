-- Permite que staff (waitstaff, deliverer, org_admin) acesse pedidos do vendor via RPC
CREATE OR REPLACE FUNCTION public.get_vendor_orders(
  p_vendor_id uuid,
  p_since timestamptz
)
RETURNS SETOF json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Dono do vendor
  IF EXISTS (
    SELECT 1 FROM public.vendors
    WHERE id = p_vendor_id AND owner_id = auth.uid()
  ) THEN
    NULL; -- autorizado
  -- 2. Platform admin
  ELSIF EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'platform_admin'
  ) THEN
    NULL; -- autorizado
  -- 3. Staff ativo vinculado ao vendor
  ELSIF EXISTS (
    SELECT 1 FROM public.staff_schedules
    WHERE user_id = auth.uid()
      AND vendor_id = p_vendor_id
      AND active = true
  ) THEN
    NULL; -- autorizado
  ELSE
    RAISE EXCEPTION 'Não autorizado';
  END IF;

  RETURN QUERY
  SELECT json_build_object(
    'id', o.id,
    'status', o.status,
    'pickup_code', o.pickup_code,
    'table_number', o.table_number,
    'total_price', o.total_price,
    'notes', o.notes,
    'created_at', o.created_at,
    'updated_at', o.updated_at,
    'payment_status', o.payment_status,
    'order_items', COALESCE(
      (SELECT json_agg(json_build_object(
        'id', oi.id,
        'quantity', oi.quantity,
        'unit_price', oi.unit_price,
        'extras', oi.extras,
        'menu_items', json_build_object('id', mi.id, 'name', mi.name)
      ))
      FROM public.order_items oi
      LEFT JOIN public.menu_items mi ON mi.id = oi.menu_item_id
      WHERE oi.order_id = o.id),
      '[]'::json
    )
  )
  FROM public.orders o
  WHERE o.vendor_id = p_vendor_id
    AND o.created_at >= p_since
    AND o.payment_status = 'paid'
    AND o.status != 'cancelled'
  ORDER BY o.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_vendor_orders(uuid, timestamptz) TO authenticated;

-- Permite que staff leia pedidos do seu vendor via RLS (para Realtime funcionar)
DROP POLICY IF EXISTS "Staff can view vendor orders" ON public.orders;
CREATE POLICY "Staff can view vendor orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_schedules ss
      WHERE ss.user_id = auth.uid()
        AND ss.vendor_id = orders.vendor_id
        AND ss.active = true
    )
  );

-- Permite que staff atualize status dos pedidos do seu vendor
DROP POLICY IF EXISTS "Staff can update vendor orders status" ON public.orders;
CREATE POLICY "Staff can update vendor orders status"
  ON public.orders
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.staff_schedules ss
      WHERE ss.user_id = auth.uid()
        AND ss.vendor_id = orders.vendor_id
        AND ss.active = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.staff_schedules ss
      WHERE ss.user_id = auth.uid()
        AND ss.vendor_id = orders.vendor_id
        AND ss.active = true
    )
  );

NOTIFY pgrst, 'reload schema';
