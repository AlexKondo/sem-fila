-- Migração: adiciona cnpj e address na tabela profiles
-- e atualiza o trigger para copiar todos os campos do registro

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS cnpj    text,
  ADD COLUMN IF NOT EXISTS address text;

-- Atualiza o trigger que cria o perfil ao registrar novo usuário
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
