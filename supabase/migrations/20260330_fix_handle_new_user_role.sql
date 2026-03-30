-- Fix: handle_new_user() agora lê o role dos metadados do signUp
-- ao invés de sempre criar como 'vendor'.
-- Default é 'customer' caso nenhum role seja passado.

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
    COALESCE(NEW.raw_user_meta_data->>'role', 'customer')::app_role
  );
  RETURN NEW;
END;
$$;
