-- =============================================================================
-- QuickPick - Seed de desenvolvimento
-- Execute APÓS o schema.sql para ter dados de teste
-- =============================================================================

-- Organização de exemplo
INSERT INTO public.organizations (id, name, slug, created_by)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Festa Junina Escola Estadual',
  'festa-junina-escola',
  NULL
);

-- Evento de exemplo
INSERT INTO public.events (id, organization_id, name, location, start_date, end_date, active)
VALUES (
  '00000000-0000-0000-0000-000000000002',
  '00000000-0000-0000-0000-000000000001',
  'Festa Junina 2025',
  'Pátio da Escola Estadual São João',
  '2025-06-21 10:00:00+00',
  '2025-06-21 22:00:00+00',
  true
);

-- Vendor de exemplo (owner_id precisa ser um user real - atualize após criar o usuário)
INSERT INTO public.vendors (id, event_id, owner_id, name, description, avg_prep_time, payment_mode, accept_pix, accept_cash, accept_card)
VALUES (
  '00000000-0000-0000-0000-000000000003',
  '00000000-0000-0000-0000-000000000002',
  NULL, -- Atualize para o UUID do usuário após registro
  'Barraca da Coxinha',
  'Coxinhas, esfihas e salgados artesanais 🍗',
  8,
  'prepaid',
  true,
  true,
  true
);

-- Itens do cardápio de exemplo
INSERT INTO public.menu_items (vendor_id, name, description, price, available, position)
VALUES
  ('00000000-0000-0000-0000-000000000003', 'Coxinha de Frango', 'Massa crocante com recheio cremoso de frango desfiado', 6.00, true, 1),
  ('00000000-0000-0000-0000-000000000003', 'Esfiha de Carne', 'Aberta com carne moída temperada', 5.00, true, 2),
  ('00000000-0000-0000-0000-000000000003', 'Risole de Presunto e Queijo', 'Frito na hora', 5.50, true, 3),
  ('00000000-0000-0000-0000-000000000003', 'Combo 5 Salgados', 'Escolha 5 salgados variados', 22.00, true, 4),
  ('00000000-0000-0000-0000-000000000003', 'Refrigerante Lata', 'Coca-Cola, Guaraná ou Fanta', 5.00, true, 5);
