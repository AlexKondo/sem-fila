-- Tipo de vendor: kiosk (barraca/quiosque), restaurant, food_truck
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS vendor_type text NOT NULL DEFAULT 'kiosk'
    CHECK (vendor_type IN ('kiosk', 'food_truck', 'restaurant'));
