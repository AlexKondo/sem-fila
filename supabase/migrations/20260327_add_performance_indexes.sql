-- ==========================================
-- PERFORMANCE INDEXES (Escalabilidade)
-- Otimização para grandes volumes de dados (skill: data-security, scalability)
-- ==========================================

-- 1. Profiles (Geralmente indexado pelo ID, mas útil para buscas por telefone/cnpj se houver)
CREATE INDEX IF NOT EXISTS idx_profiles_phone ON public.profiles(phone);

-- 2. Organizations / Members (Comentado para evitar erro se não existirem no seu ambiente)
-- CREATE INDEX IF NOT EXISTS idx_organizations_created_by ON public.organizations(created_by);
-- CREATE INDEX IF NOT EXISTS idx_organization_members_user_id ON public.organization_members(user_id);
-- CREATE INDEX IF NOT EXISTS idx_organization_members_org_id ON public.organization_members(organization_id);

-- 3. Events
CREATE INDEX IF NOT EXISTS idx_events_active ON public.events(active);

-- 4. Vendors
CREATE INDEX IF NOT EXISTS idx_vendors_event_id ON public.vendors(event_id);
CREATE INDEX IF NOT EXISTS idx_vendors_owner_id ON public.vendors(owner_id);
CREATE INDEX IF NOT EXISTS idx_vendors_active ON public.vendors(active);

-- 5. Menu Items
CREATE INDEX IF NOT EXISTS idx_menu_items_vendor_id ON public.menu_items(vendor_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_available ON public.menu_items(available);
CREATE INDEX IF NOT EXISTS idx_menu_items_position ON public.menu_items(position);

-- 6. Orders
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor_id ON public.orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON public.orders(created_at DESC);

-- 7. Order Items
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);
CREATE INDEX IF NOT EXISTS idx_order_items_menu_item_id ON public.order_items(menu_item_id);

-- 8. Waiter Calls
CREATE INDEX IF NOT EXISTS idx_waiter_calls_vendor_id ON public.waiter_calls(vendor_id);
CREATE INDEX IF NOT EXISTS idx_waiter_calls_status ON public.waiter_calls(status);
