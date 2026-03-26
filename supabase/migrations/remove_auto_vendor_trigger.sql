-- Migration: remover auto-criação de vendor no registro de usuário
-- O vendor agora cria suas marcas manualmente via onboarding

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, phone, cnpj, address, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'cnpj',
    NEW.raw_user_meta_data->>'address',
    'vendor'
  );
  RETURN NEW;
END;
$$;
