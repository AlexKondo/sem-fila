-- Adiciona coluna full_name à tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS full_name text;

-- Preenche full_name com name para registros existentes
UPDATE public.profiles SET full_name = name WHERE full_name IS NULL AND name IS NOT NULL;

-- Atualiza o trigger de criação de usuário para também preencher full_name
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, name, full_name, phone, cnpj, address, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'cnpj',
    NEW.raw_user_meta_data->>'address',
    'vendor'
  );
  RETURN NEW;
END;
$$;
