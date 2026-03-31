-- Adiciona colunas birthday_day e birthday_month que o ProfileForm espera
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthday_day smallint;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS birthday_month smallint;
