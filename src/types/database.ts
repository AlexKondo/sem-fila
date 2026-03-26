// Tipos gerados do schema do Supabase (QuickPick)
// Reflectem exatamente as tabelas do supabase/schema.sql

export type AppRole = 'platform_admin' | 'org_admin' | 'vendor' | 'waitstaff' | 'customer' | 'affiliate';
export type OrderStatus = 'received' | 'preparing' | 'almost_ready' | 'ready' | 'delivered' | 'cancelled';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'refunded';
export type PaymentMode = 'prepaid' | 'pay_on_pickup' | 'optional';

export interface Profile {
  id: string;
  name: string | null;
  phone: string | null;
  role: AppRole;
  cpf?: string | null;
  birthday_day?: number | null;
  birthday_month?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  created_by: string | null;
  created_at: string;
}

export interface Event {
  id: string;
  organization_id: string;
  name: string;
  location: string | null;
  address: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  end_time: string | null;
  active: boolean;
  created_at: string;
}

export interface Vendor {
  id: string;
  event_id: string;
  owner_id: string | null;
  name: string;
  description: string | null;
  logo_url: string | null;
  avg_prep_time: number;
  payment_mode: PaymentMode;
  accept_cash: boolean;
  accept_pix: boolean;
  accept_card: boolean;
  active: boolean;
  business_type: string;
  table_delivery: boolean;
  service_fee_percentage: number;
  couvert_fee: number;
  active_coupon_code: string | null;
  discount_percentage: number;
  allow_waiter_calls: boolean;
  created_at: string;
  updated_at: string;
}

export interface MenuItem {
  id: string;
  vendor_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  available: boolean;
  position: number;
  category: string | null;
  extras: { name: string; price: number }[] | null;
  created_at: string;
  updated_at: string;
}

export interface Order {
  id: string;
  user_id: string | null;
  vendor_id: string;
  status: OrderStatus;
  payment_status: PaymentStatus;
  total_price: number;
  pickup_code: string;
  table_number: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  menu_item_id: string;
  quantity: number;
  unit_price: number;
  created_at: string;
}

export interface WaiterCall {
  id: string;
  vendor_id: string;
  table_number: string;
  user_id: string | null;
  status: 'pending' | 'attended';
  created_at: string;
}

// Tipos compostos para as queries com JOIN

export interface OrderWithItems extends Order {
  order_items: (OrderItem & { menu_items: MenuItem | null })[];
  vendors: Vendor | null;
}

export interface VendorWithMenu extends Vendor {
  menu_items: MenuItem[];
}

export interface VendorWithEvent extends Vendor {
  events: Event | null;
}

// Database type para o Supabase client
export type Database = {
  public: {
    Tables: {
      profiles: { Row: Profile; Insert: Omit<Profile, 'created_at' | 'updated_at'>; Update: Partial<Profile>; Relationships: never[] };
      organizations: { Row: Organization; Insert: Omit<Organization, 'id' | 'created_at'>; Update: Partial<Organization>; Relationships: never[] };
      events: { Row: Event; Insert: Omit<Event, 'id' | 'created_at'>; Update: Partial<Event>; Relationships: never[] };
      vendors: { Row: Vendor; Insert: Omit<Vendor, 'id' | 'created_at' | 'updated_at'>; Update: Partial<Vendor>; Relationships: never[] };
      menu_items: { Row: MenuItem; Insert: Omit<MenuItem, 'id' | 'created_at' | 'updated_at'>; Update: Partial<MenuItem>; Relationships: never[] };
      orders: { Row: Order; Insert: Omit<Order, 'id' | 'created_at' | 'updated_at' | 'pickup_code'>; Update: Partial<Order>; Relationships: never[] };
      order_items: { Row: OrderItem; Insert: Omit<OrderItem, 'id' | 'created_at'>; Update: Partial<OrderItem>; Relationships: never[] };
      waiter_calls: { Row: WaiterCall; Insert: Omit<WaiterCall, 'id' | 'created_at'>; Update: Partial<WaiterCall>; Relationships: never[] };
    };
    Views: {};
    Functions: {};
    Enums: {
      app_role: AppRole;
      order_status: OrderStatus;
      payment_status: PaymentStatus;
      payment_mode: PaymentMode;
    };
    CompositeTypes: {};
  };
};
