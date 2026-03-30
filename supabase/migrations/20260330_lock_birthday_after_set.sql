-- Impede que o usuário altere birthday depois de definido.
-- Apenas platform_admin pode alterar.
-- Isso evita fraude em benefícios de aniversário.

CREATE OR REPLACE FUNCTION public.protect_birthday()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF OLD.birthday IS NOT NULL
     AND NEW.birthday IS DISTINCT FROM OLD.birthday
     AND NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
  THEN
    RAISE EXCEPTION 'Data de nascimento não pode ser alterada. Contate o administrador.';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_birthday_update ON public.profiles;

CREATE TRIGGER protect_birthday_update
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_birthday();
