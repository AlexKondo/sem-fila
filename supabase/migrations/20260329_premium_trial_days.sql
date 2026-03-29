-- Adiciona campo trial_days em premium_features
-- Quando > 0, vendors ganham acesso gratuito por X dias na primeira vez
ALTER TABLE public.premium_features
  ADD COLUMN IF NOT EXISTS trial_days INT NOT NULL DEFAULT 0;

-- Permite que vendors criem trial subscriptions para suas próprias barracas
CREATE POLICY "vendor_insert_own_subs" ON public.vendor_subscriptions
  FOR INSERT TO authenticated
  WITH CHECK (
    vendor_id IN (SELECT id FROM public.vendors WHERE owner_id = auth.uid())
  );
