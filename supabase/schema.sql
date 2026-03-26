-- =============================================================================
-- QuickPick - Schema Supabase (PostgreSQL)
-- Segurança: RLS ativado em todas as tabelas (skill: zero-trust-security)
-- =============================================================================

-- ==========================================
-- TYPES / ENUMS
-- ==========================================

CREATE TYPE public.app_role AS ENUM (
  'platform_admin',  -- Master Admin da plataforma
  'org_admin',       -- Event Manager (dono/organizador do evento)
  'vendor',          -- Dono de barraca/quiosque
  'waitstaff',       -- Garçom
  'customer',        -- Cliente/usuário final
  'affiliate'        -- Afiliado da plataforma
);

CREATE TYPE public.order_status AS ENUM (
  'received',
  'preparing',
  'almost_ready',
  'ready',
  'delivered',
  'cancelled'
);

CREATE TYPE public.payment_status AS ENUM (
  'pending',
  'paid',
  'failed',
  'refunded'
);

CREATE TYPE public.payment_mode AS ENUM (
  'prepaid',
  'pay_on_pickup',
  'optional'
);

-- ==========================================
-- 1. PROFILES (Extensão do auth.users)
-- ==========================================

CREATE TABLE public.profiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text,
  phone      text,
  cnpj       text,
  address    text,
  role       app_role NOT NULL DEFAULT 'customer',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Trigger: cria perfil automaticamente ao registrar
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

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Trigger: atualiza updated_at
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==========================================
-- 2. HELPER: verificar role (evita loop RLS)
-- Padrão: skill 11-supabase-rbac-crud - SECURITY DEFINER
-- ==========================================

CREATE OR REPLACE FUNCTION public.has_role(_role app_role)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = _role
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_role()
RETURNS app_role LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_role app_role;
BEGIN
  SELECT role INTO v_role FROM public.profiles WHERE id = auth.uid();
  RETURN v_role;
END;
$$;

-- ==========================================
-- 3. ORGANIZATIONS
-- ==========================================

CREATE TABLE public.organizations (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name       text NOT NULL,
  slug       text UNIQUE NOT NULL,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Tabela de membros da organização (org_admin)
CREATE TABLE public.organization_members (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  UNIQUE(organization_id, user_id)
);

-- ==========================================
-- 4. EVENTS
-- ==========================================

CREATE TABLE public.events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  location        text,         -- Nome do local (ex: Ginásio Municipal)
  address         text,         -- Endereço completo (rua, número, cidade)
  description     text,         -- Observação/descrição do evento
  start_date      timestamptz,  -- Data de início
  end_date        timestamptz,  -- Data de término
  start_time      time,         -- Horário de abertura (ex: 09:00)
  end_time        time,         -- Horário de encerramento (ex: 22:00)
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ==========================================
-- 5. VENDORS (Barracas / Lojas)
-- ==========================================

CREATE TABLE public.vendors (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id         uuid REFERENCES public.events(id) ON DELETE CASCADE,
  owner_id         uuid REFERENCES public.profiles(id),
  name             text NOT NULL,
  description      text,
  logo_url         text,
  avg_prep_time    integer NOT NULL DEFAULT 10,
  payment_mode     payment_mode NOT NULL DEFAULT 'prepaid',
  accept_cash      boolean NOT NULL DEFAULT true,
  accept_pix       boolean NOT NULL DEFAULT true,
  accept_card      boolean NOT NULL DEFAULT true,
  active           boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Helper: verifica se user é dono de um vendor
CREATE OR REPLACE FUNCTION public.is_vendor_owner(_vendor_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.vendors WHERE id = _vendor_id AND owner_id = auth.uid()
  );
END;
$$;

-- ==========================================
-- 6. MENU ITEMS
-- ==========================================

CREATE TABLE public.menu_items (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id   uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  price       numeric(10, 2) NOT NULL CHECK (price >= 0),
  image_url   text,
  available   boolean NOT NULL DEFAULT true,
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER menu_items_updated_at
  BEFORE UPDATE ON public.menu_items
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==========================================
-- 7. ORDERS
-- ==========================================

CREATE TABLE public.orders (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid REFERENCES public.profiles(id),
  vendor_id      uuid NOT NULL REFERENCES public.vendors(id),
  status         order_status NOT NULL DEFAULT 'received',
  payment_status payment_status NOT NULL DEFAULT 'pending',
  total_price    numeric(10, 2) NOT NULL CHECK (total_price >= 0),
  pickup_code    text NOT NULL DEFAULT upper(substring(gen_random_uuid()::text, 1, 6)),
  table_number   text,
  notes          text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ==========================================
-- 8. ORDER ITEMS
-- ==========================================

CREATE TABLE public.order_items (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id     uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id),
  quantity     integer NOT NULL CHECK (quantity > 0),
  unit_price   numeric(10, 2) NOT NULL CHECK (unit_price >= 0),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ==========================================
-- 9. WAITER CALLS (Chamar Garçom)
-- ==========================================

CREATE TABLE public.waiter_calls (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id    uuid NOT NULL REFERENCES public.vendors(id) ON DELETE CASCADE,
  table_number text NOT NULL,
  user_id      uuid REFERENCES public.profiles(id),
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'attended')),
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- ==========================================
-- ROW LEVEL SECURITY (RLS)
-- skill: 4-data-security, 11-supabase-rbac-crud
-- Princípio do Menor Privilégio
-- ==========================================

-- PROFILES
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuário vê o próprio perfil"
  ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR has_role('platform_admin'));

CREATE POLICY "Usuário edita o próprio perfil"
  ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid());

-- ORGANIZATIONS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Org visível para membros e admins"
  ON public.organizations FOR SELECT TO authenticated
  USING (
    has_role('platform_admin')
    OR created_by = auth.uid()
    OR EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = id AND user_id = auth.uid())
  );

CREATE POLICY "Apenas platform_admin cria org"
  ON public.organizations FOR INSERT TO authenticated
  WITH CHECK (has_role('platform_admin'));

CREATE POLICY "Apenas dono ou platform_admin edita org"
  ON public.organizations FOR UPDATE TO authenticated
  USING (created_by = auth.uid() OR has_role('platform_admin'));

-- ORGANIZATION MEMBERS
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Membros visíveis para a organização"
  ON public.organization_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR has_role('platform_admin'));

-- EVENTS
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Eventos visíveis para todos autenticados"
  ON public.events FOR SELECT TO authenticated
  USING (active = true OR has_role('platform_admin') OR has_role('org_admin'));

CREATE POLICY "Eventos visíveis publicamente (menu)"
  ON public.events FOR SELECT TO anon
  USING (active = true);

CREATE POLICY "Org admin cria eventos"
  ON public.events FOR INSERT TO authenticated
  WITH CHECK (has_role('platform_admin') OR has_role('org_admin'));

CREATE POLICY "Org admin edita eventos"
  ON public.events FOR UPDATE TO authenticated
  USING (has_role('platform_admin') OR has_role('org_admin'));

-- VENDORS
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendors ativos visíveis publicamente"
  ON public.vendors FOR SELECT TO anon
  USING (active = true);

CREATE POLICY "Vendors visíveis para autenticados"
  ON public.vendors FOR SELECT TO authenticated
  USING (active = true OR owner_id = auth.uid() OR has_role('platform_admin'));

CREATE POLICY "Vendor owner edita o próprio vendor"
  ON public.vendors FOR UPDATE TO authenticated
  USING (owner_id = auth.uid() OR has_role('platform_admin') OR has_role('org_admin'));

-- MENU ITEMS
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Menu visível publicamente"
  ON public.menu_items FOR SELECT TO anon
  USING (available = true);

CREATE POLICY "Menu visível para autenticados"
  ON public.menu_items FOR SELECT TO authenticated
  USING (available = true OR is_vendor_owner(vendor_id) OR has_role('platform_admin'));

CREATE POLICY "Vendor owner gerencia o menu"
  ON public.menu_items FOR INSERT TO authenticated
  WITH CHECK (is_vendor_owner(vendor_id) OR has_role('platform_admin'));

CREATE POLICY "Vendor owner edita menu"
  ON public.menu_items FOR UPDATE TO authenticated
  USING (is_vendor_owner(vendor_id) OR has_role('platform_admin'));

CREATE POLICY "Vendor owner remove item"
  ON public.menu_items FOR DELETE TO authenticated
  USING (is_vendor_owner(vendor_id) OR has_role('platform_admin'));

-- ORDERS
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Cliente vê seus próprios pedidos"
  ON public.orders FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR is_vendor_owner(vendor_id)
    OR has_role('platform_admin')
  );

CREATE POLICY "Qualquer um pode criar pedido"
  ON public.orders FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Anon pode criar pedido (sem conta)"
  ON public.orders FOR INSERT TO anon
  WITH CHECK (user_id IS NULL);

CREATE POLICY "Vendor atualiza status do pedido"
  ON public.orders FOR UPDATE TO authenticated
  USING (
    is_vendor_owner(vendor_id)
    OR user_id = auth.uid()
    OR has_role('platform_admin')
  );

-- ORDER ITEMS
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Order items visíveis com o pedido"
  ON public.order_items FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders o
      WHERE o.id = order_id
        AND (o.user_id = auth.uid() OR is_vendor_owner(o.vendor_id) OR has_role('platform_admin'))
    )
  );

CREATE POLICY "Inserir itens junto ao pedido"
  ON public.order_items FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.orders WHERE id = order_id AND user_id = auth.uid())
  );

-- WAITER CALLS
ALTER TABLE public.waiter_calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Vendor vê as chamadas da sua barraca"
  ON public.waiter_calls FOR SELECT TO authenticated
  USING (is_vendor_owner(vendor_id) OR has_role('platform_admin'));

CREATE POLICY "Cliente cria chamada de garçom"
  ON public.waiter_calls FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Anon pode chamar garçom"
  ON public.waiter_calls FOR INSERT TO anon
  WITH CHECK (true);

CREATE POLICY "Vendor atende a chamada"
  ON public.waiter_calls FOR UPDATE TO authenticated
  USING (is_vendor_owner(vendor_id));

-- ==========================================
-- REALTIME (habilitar publicações)
-- ==========================================

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.waiter_calls;

-- ==========================================
-- STORAGE BUCKETS
-- ==========================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('menu-images', 'menu-images', true)
ON CONFLICT DO NOTHING;

CREATE POLICY "Menu images leitura pública"
  ON storage.objects FOR SELECT TO anon
  USING (bucket_id = 'menu-images');

CREATE POLICY "Vendor faz upload de imagem"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'menu-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Vendor deleta sua imagem"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'menu-images' AND owner_id = auth.uid()::text);
