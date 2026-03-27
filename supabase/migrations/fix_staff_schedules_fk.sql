-- Corrige o FK de staff_schedules.user_id para referenciar profiles(id)
-- Necessário para PostgREST conseguir fazer embedded selects (profiles(...))
ALTER TABLE public.staff_schedules
  DROP CONSTRAINT IF EXISTS staff_schedules_user_id_fkey;

ALTER TABLE public.staff_schedules
  ADD CONSTRAINT staff_schedules_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
