-- Adiciona 'bundle' como tipo válido na tabela ai_photo_usage
ALTER TABLE public.ai_photo_usage DROP CONSTRAINT IF EXISTS ai_photo_usage_type_check;
ALTER TABLE public.ai_photo_usage ADD CONSTRAINT ai_photo_usage_type_check CHECK (type IN ('image', 'description', 'bundle'));

-- Insere configs padrão de bundle (se não existirem)
INSERT INTO public.platform_config (key, value)
VALUES ('ai_images_per_credit', '10'), ('ai_descriptions_per_credit', '1')
ON CONFLICT (key) DO NOTHING;
