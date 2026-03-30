-- Adiciona campos de cliente ao profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cpf text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthday date;

-- Índice para busca por email
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
