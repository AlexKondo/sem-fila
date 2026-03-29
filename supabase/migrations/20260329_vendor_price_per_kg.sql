-- Adiciona coluna de preço por kg para restaurantes por kilo
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS price_per_kg NUMERIC(10,2) DEFAULT NULL;

COMMENT ON COLUMN public.vendors.price_per_kg IS 'Valor cobrado por kg (usado apenas quando business_type = restaurant_kilo)';
