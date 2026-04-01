-- =============================================================================
-- Permite que staff acesse pedidos do vendor
-- =============================================================================

-- 1. Atualiza RPC get_vendor_orders para incluir staff
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
  -- Autoriza: dono do vendor, platform_admin ou staff ativo vinculado ao vendor
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

-- 2. Garante que a policy do dono do vendor ainda existe (restaura caso tenha sido removida)
DROP POLICY IF EXISTS "Vendors can view their own orders" ON public.orders;
CREATE POLICY "Vendors can view their own orders"
  ON public.orders
  FOR SELECT
  TO authenticated
  USING (
    vendor_id IN (SELECT id FROM public.vendors WHERE owner_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

-- 3. Permite que staff leia sua própria entrada em staff_schedules
--    (necessário para que a policy de orders abaixo funcione corretamente)
DROP POLICY IF EXISTS "Staff can read own schedule" ON public.staff_schedules;
CREATE POLICY "Staff can read own schedule"
  ON public.staff_schedules
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- 4. Permite que staff leia pedidos do vendor via RLS (Realtime funciona)
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

-- 5. Permite que staff atualize status dos pedidos do vendor
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
