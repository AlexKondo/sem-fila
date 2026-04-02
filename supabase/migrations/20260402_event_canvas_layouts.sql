-- Múltiplos layouts de canvas por evento

CREATE TABLE IF NOT EXISTS public.event_canvas_layouts (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  name       text NOT NULL DEFAULT 'Layout',
  canvas_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_canvas_layouts_event ON public.event_canvas_layouts(event_id);

ALTER TABLE public.event_canvas_layouts ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_canvas_layouts TO authenticated;

DROP POLICY IF EXISTS "event_canvas_layouts_owner" ON public.event_canvas_layouts;
CREATE POLICY "event_canvas_layouts_owner" ON public.event_canvas_layouts
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
