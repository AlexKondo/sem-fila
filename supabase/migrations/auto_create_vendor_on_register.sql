-- Migração: auto-criar vendor ao registrar + tornar event_id opcional
-- Execute este SQL no SQL Editor do Supabase

-- 1. Torna event_id opcional (vendors independentes, sem evento)
ALTER TABLE public.vendors ALTER COLUMN event_id DROP NOT NULL;

-- 2. Adiciona policy para vendor inserir seu próprio registro
CREATE POLICY "Vendor cria próprio registro"
  ON public.vendors FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid() OR has_role('platform_admin') OR has_role('org_admin'));

-- 3. Atualiza o trigger para também criar o vendor ao registrar
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  -- Cria o perfil do usuário
  INSERT INTO public.profiles (id, name, phone, cnpj, address, role)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'name',
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'cnpj',
    NEW.raw_user_meta_data->>'address',
    'vendor'
  );

  -- Auto-cria o registro de vendor vinculado ao usuário
  INSERT INTO public.vendors (owner_id, name, event_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', 'Meu Negócio'),
    NULL
  );

  RETURN NEW;
END;
$$;
