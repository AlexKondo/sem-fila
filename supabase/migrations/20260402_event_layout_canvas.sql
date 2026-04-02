-- Canvas livre de layout do evento (armazenado como JSON do Fabric.js)

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS layout_canvas jsonb;

NOTIFY pgrst, 'reload schema';
