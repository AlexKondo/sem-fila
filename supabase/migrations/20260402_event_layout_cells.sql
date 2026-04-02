-- Células estruturais do layout de evento (corredor, entrada, saída, parede)

CREATE TABLE IF NOT EXISTS public.event_layout_cells (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  position_x integer NOT NULL CHECK (position_x >= 0 AND position_x < 12),
  position_y integer NOT NULL CHECK (position_y >= 0 AND position_y < 12),
  cell_type  text NOT NULL CHECK (cell_type IN ('corridor', 'entrance', 'exit', 'wall')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(event_id, position_x, position_y)
);

CREATE INDEX IF NOT EXISTS idx_event_layout_cells_event ON public.event_layout_cells(event_id);

ALTER TABLE public.event_layout_cells ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_layout_cells TO authenticated;

DROP POLICY IF EXISTS "event_layout_cells_owner" ON public.event_layout_cells;
CREATE POLICY "event_layout_cells_owner" ON public.event_layout_cells
  FOR ALL TO authenticated
  USING (
    public.is_org_admin_of_event(event_id)
    OR public.has_role('platform_admin')
  )
  WITH CHECK (
    public.is_org_admin_of_event(event_id)
    OR public.has_role('platform_admin')
  );

NOTIFY pgrst, 'reload schema';
