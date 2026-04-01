-- Atualiza get_vendor_orders para:
-- 1. Mostrar pedidos em dinheiro mesmo quando payment_status = 'pending'
-- 2. Retornar payment_method no resultado (para o board mostrar botão de confirmação)

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
  IF NOT (
    EXISTS (
      SELECT 1 FROM public.vendors
      WHERE id = p_vendor_id AND owner_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'platform_admin'
    )
    OR EXISTS (
      SELECT 1 FROM public.staff_schedules
      WHERE user_id = auth.uid()
        AND vendor_id = p_vendor_id
        AND active = true
    )
  ) THEN
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
    'payment_method', o.payment_method,
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
    AND (
      o.payment_status = 'paid'
      OR (o.payment_method = 'dinheiro' AND o.payment_status = 'pending')
    )
    AND o.status != 'cancelled'
  ORDER BY o.created_at ASC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_vendor_orders(uuid, timestamptz) TO authenticated;

NOTIFY pgrst, 'reload schema';
