-- Barracas/kiosks colocados no canvas do evento

CREATE TABLE IF NOT EXISTS public.event_canvas_booths (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         uuid NOT NULL REFERENCES public.events(id) ON DELETE CASCADE,
  canvas_layout_id uuid NOT NULL REFERENCES public.event_canvas_layouts(id) ON DELETE CASCADE,
  label            text NOT NULL DEFAULT 'Kiosk',
  element_type     text NOT NULL DEFAULT 'kiosk',
  fee_amount       numeric(10,2) NOT NULL DEFAULT 0,
  vendor_id        uuid REFERENCES public.vendors(id) ON DELETE SET NULL,
  status           text NOT NULL DEFAULT 'available'
                   CHECK (status IN ('available', 'invited', 'confirmed', 'paid')),
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_event_canvas_booths_layout ON public.event_canvas_booths(canvas_layout_id);
CREATE INDEX IF NOT EXISTS idx_event_canvas_booths_event  ON public.event_canvas_booths(event_id);

ALTER TABLE public.event_canvas_booths ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.event_canvas_booths TO authenticated;

DROP POLICY IF EXISTS "event_canvas_booths_owner" ON public.event_canvas_booths;
CREATE POLICY "event_canvas_booths_owner" ON public.event_canvas_booths
  FOR ALL TO authenticated
  USING  (public.is_org_admin_of_event(event_id) OR public.has_role('platform_admin'))
  WITH CHECK (public.is_org_admin_of_event(event_id) OR public.has_role('platform_admin'));

-- Adiciona referência de canvas booth nas invitações (nullable)
ALTER TABLE public.event_vendor_invitations
  ADD COLUMN IF NOT EXISTS canvas_booth_id uuid REFERENCES public.event_canvas_booths(id) ON DELETE SET NULL;

NOTIFY pgrst, 'reload schema';
