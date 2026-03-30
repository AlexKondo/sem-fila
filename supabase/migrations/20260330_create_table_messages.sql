-- Mensagens do garçom para mesas (aparece como alerta na tela do cliente)
CREATE TABLE IF NOT EXISTS public.table_messages (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id  uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  table_number text NOT NULL,
  message    text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_table_messages_vendor ON public.table_messages(vendor_id);
CREATE INDEX idx_table_messages_lookup ON public.table_messages(vendor_id, table_number);

ALTER TABLE public.table_messages ENABLE ROW LEVEL SECURITY;

-- Qualquer um pode ler (cliente precisa ver a mensagem)
CREATE POLICY "Leitura publica de mensagens"
  ON public.table_messages FOR SELECT USING (true);

-- Apenas vendor/staff pode inserir
CREATE POLICY "Vendor insere mensagens"
  ON public.table_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.vendors v
      JOIN public.profiles p ON p.id = auth.uid()
      WHERE v.id = vendor_id
        AND (v.owner_id = auth.uid() OR p.vendor_id = v.id)
    )
  );

-- Admin pode tudo
CREATE POLICY "Admin gerencia mensagens"
  ON public.table_messages FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'platform_admin')
  );

GRANT ALL ON public.table_messages TO authenticated;
GRANT SELECT ON public.table_messages TO anon;
