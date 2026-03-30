-- Fix: handle_new_user() agora lê o role dos metadados do signUp
-- e salva email do auth.users no perfil.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, email, phone, cnpj, address, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'cnpj',
    NEW.raw_user_meta_data->>'address',
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')::app_role
  );
  RETURN NEW;
END;
$$;
