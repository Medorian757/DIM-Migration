-- DIM migration: Base44 entities -> Supabase/PostgreSQL
-- Run in Supabase SQL Editor after creating the project.

create extension if not exists pgcrypto;

-- Enums
create type user_role as enum ('admin', 'user');
create type supplier_status as enum ('active', 'inactive');
create type item_case_unit as enum ('cases','bags','boxes','cartons','pallets','crates','packs','bundles','drums','totes');
create type item_unit as enum ('pieces','each','kg','g','lbs','oz','liters','ml','gallons','cups','meters','feet');
create type history_change_type as enum ('quantity_change','price_change','details_change','item_created');

-- Profiles mirror Base44 User entity plus email from Supabase Auth.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  first_name text,
  last_name text,
  role user_role not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  color text,
  icon text,
  parent_category_id uuid references public.categories(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.suppliers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact_name text,
  email text,
  phone text,
  address text,
  website text,
  lead_time_days numeric not null default 7,
  payment_terms text,
  notes text,
  status supplier_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.locations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  parent_location_id uuid references public.locations(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.inventory_items (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  sku text,
  barcode text,
  category_id uuid references public.categories(id) on delete set null,
  supplier_id uuid references public.suppliers(id) on delete set null,
  case_quantity numeric not null default 0,
  case_unit item_case_unit not null default 'cases',
  units_per_case numeric not null default 1,
  unit item_unit not null default 'pieces',
  min_cases numeric not null default 0,
  max_cases numeric not null default 0,
  unit_cost numeric not null default 0,
  sale_price numeric not null default 0,
  location text,
  locations text[] not null default '{}',
  notes text,
  image_url text,
  tags text[] not null default '{}',
  lead_time_days numeric not null default 7,
  daily_sales_velocity numeric not null default 0,
  reorder_quantity numeric not null default 0,
  supplier_name text,
  out_for_repair boolean not null default false,
  repair_return_date date,
  repair_notes text,
  non_trusted boolean not null default false,
  expiration_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.recipes (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  output_item_id uuid not null references public.inventory_items(id) on delete cascade,
  yield_quantity numeric not null default 1,
  selling_price numeric,
  ingredients jsonb not null default '[]'::jsonb,
  labor_cost numeric not null default 0,
  overhead_cost numeric not null default 0,
  instructions text,
  prep_time_minutes numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.item_history (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.inventory_items(id) on delete cascade,
  item_name text,
  change_type history_change_type not null,
  field_changed text,
  old_value text,
  new_value text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_inventory_category_id on public.inventory_items(category_id);
create index idx_inventory_supplier_id on public.inventory_items(supplier_id);
create index idx_inventory_non_trusted on public.inventory_items(non_trusted);
create index idx_inventory_expiration_date on public.inventory_items(expiration_date);
create index idx_item_history_item_id_created_at on public.item_history(item_id, created_at desc);
create index idx_categories_parent_id on public.categories(parent_category_id);
create index idx_locations_parent_id on public.locations(parent_location_id);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles','categories','suppliers','locations','inventory_items','recipes','item_history'] loop
    execute format('create trigger set_%s_updated_at before update on public.%I for each row execute function public.set_updated_at()', t, t);
  end loop;
end $$;

-- Create a profile when a Supabase Auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, first_name, last_name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'first_name', ''),
    coalesce(new.raw_user_meta_data->>'last_name', ''),
    'user'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- RLS
alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.suppliers enable row level security;
alter table public.locations enable row level security;
alter table public.inventory_items enable row level security;
alter table public.recipes enable row level security;
alter table public.item_history enable row level security;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

-- App users can read/write operational tables. Profiles: users read all profiles, update own profile; admins update roles.
create policy "profiles_read_authenticated" on public.profiles for select to authenticated using (true);
create policy "profiles_update_self_or_admin" on public.profiles for update to authenticated using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());

create policy "categories_all_authenticated" on public.categories for all to authenticated using (true) with check (true);
create policy "suppliers_all_authenticated" on public.suppliers for all to authenticated using (true) with check (true);
create policy "locations_all_authenticated" on public.locations for all to authenticated using (true) with check (true);
create policy "inventory_items_all_authenticated" on public.inventory_items for all to authenticated using (true) with check (true);
create policy "recipes_all_authenticated" on public.recipes for all to authenticated using (true) with check (true);
create policy "item_history_all_authenticated" on public.item_history for all to authenticated using (true) with check (true);

-- Storage bucket for item images. Create bucket in dashboard or uncomment when permitted:
-- insert into storage.buckets (id, name, public) values ('item-images', 'item-images', true) on conflict do nothing;
