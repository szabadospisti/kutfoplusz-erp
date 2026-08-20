-- Kútfő Plusz ERP – relációs Supabase séma v2
-- FONTOS: ez a migrációs cél-séma. Az erp_state táblát NEM használja.
-- ID-k text típusúak, hogy a jelenlegi C-xxxx / Q-xxxx / P-xxxx azonosítók megmaradjanak.

create extension if not exists pgcrypto;

-- ===== COMMON =====
create or replace function public.set_updated_meta()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  new.updated_by = auth.uid();
  if tg_op = 'INSERT' then new.created_by = auth.uid(); end if;
  return new;
end;
$$;

-- ===== CUSTOMERS =====
create table if not exists public.customers (
  id text primary key,
  name text not null,
  tax_number text,
  company_number text,
  contact_person text,
  phone text,
  email text,
  address text,
  billing_address text,
  notes text,
  status text not null default 'Aktív' check (status in ('Aktív','Inaktív')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

-- ===== QUOTES =====
create table if not exists public.quotes (
  id text primary key,
  quote_number text unique,
  customer_id text references public.customers(id) on delete set null,
  project_id text,
  project_name text,
  location text,
  quote_date date,
  valid_until date,
  status text not null default 'Piszkozat',
  subject text,
  notes text,
  technical_content text,
  price_includes text,
  price_excludes text,
  declarations text,
  signer text,
  position text,
  net_total numeric(14,2) not null default 0,
  vat_total numeric(14,2) not null default 0,
  gross_total numeric(14,2) not null default 0,
  extra_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.quote_items (
  id text primary key,
  quote_id text not null references public.quotes(id) on delete cascade,
  description text not null,
  category text,
  quantity numeric(14,3) not null default 1,
  unit text,
  unit_price numeric(14,2) not null default 0,
  vat_rate numeric(5,2) not null default 27,
  net_total numeric(14,2) not null default 0,
  vat_total numeric(14,2) not null default 0,
  gross_total numeric(14,2) not null default 0,
  sort_order integer not null default 0
);

-- ===== PROJECTS =====
create table if not exists public.projects (
  id text primary key,
  project_number text unique,
  customer_id text references public.customers(id) on delete set null,
  quote_id text references public.quotes(id) on delete set null,
  name text not null,
  location text,
  latitude numeric(10,7),
  longitude numeric(10,7),
  start_date date,
  planned_end_date date,
  actual_end_date date,
  status text not null default 'Érdeklődés',
  contract_value numeric(14,2) not null default 0,
  planned_cost numeric(14,2) not null default 0,
  actual_cost numeric(14,2) not null default 0,
  responsible_user_id uuid references auth.users(id) on delete set null,
  notes text,
  extra_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.quotes drop constraint if exists quotes_project_id_fkey;
alter table public.quotes add constraint quotes_project_id_fkey foreign key (project_id) references public.projects(id) on delete set null;

-- ===== EMPLOYEES =====
create table if not exists public.employees (
  id text primary key,
  name text not null,
  role text,
  phone text,
  email text,
  hourly_rate numeric(12,2) not null default 0,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

-- ===== MACHINES =====
create table if not exists public.machines (
  id text primary key,
  machine_number text unique,
  name text not null,
  manufacturer text,
  model text,
  serial_number text,
  year integer,
  current_hours numeric(12,1) not null default 0,
  status text not null default 'Aktív',
  purchase_date date,
  purchase_price numeric(14,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

-- ===== PRODUCTS / WAREHOUSE =====
create table if not exists public.products (
  id text primary key,
  sku text unique,
  name text not null,
  category text,
  unit text,
  purchase_price numeric(14,2) not null default 0,
  sale_price numeric(14,2) not null default 0,
  vat_rate numeric(5,2) not null default 27,
  minimum_stock numeric(14,3) not null default 0,
  material_type text,
  diameter_mm numeric(10,2),
  length_m numeric(10,3),
  material_unit text default 'db',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.warehouses (
  id text primary key,
  name text not null,
  location text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.warehouse_stock (
  warehouse_id text not null references public.warehouses(id) on delete cascade,
  product_id text not null references public.products(id) on delete cascade,
  quantity numeric(14,3) not null default 0,
  updated_at timestamptz not null default now(),
  primary key (warehouse_id, product_id)
);

-- ===== WORK LOGS =====
create table if not exists public.work_logs (
  id text primary key,
  project_id text references public.projects(id) on delete set null,
  customer_id text references public.customers(id) on delete set null,
  work_date date not null default current_date,
  location text,
  well_number text,
  final_depth numeric(10,2) not null default 0,
  status text,
  start_time time,
  end_time time,
  work_type text,
  description text,
  weather text,
  notes text,
  filter_data jsonb not null default '[]'::jsonb,
  well_profile jsonb not null default '{}'::jsonb,
  water_data jsonb not null default '{}'::jsonb,
  extra_data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid references auth.users(id) on delete set null,
  updated_by uuid references auth.users(id) on delete set null
);

create table if not exists public.work_log_layers (
  id text primary key,
  work_log_id text not null references public.work_logs(id) on delete cascade,
  depth_from numeric(10,2) not null default 0,
  depth_to numeric(10,2) not null default 0,
  material text,
  drilling_behavior text,
  water_state text,
  notes text,
  sort_order integer not null default 0
);

-- ===== PROJECT MATERIALS / COSTS =====
create table if not exists public.project_material_requirements (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  product_id text not null references public.products(id),
  required_qty numeric(14,3) not null default 0,
  required_unit text default 'db',
  reserved_qty numeric(14,3) not null default 0,
  used_qty numeric(14,3) not null default 0,
  status text default 'Tervezett',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(project_id, product_id)
);

create table if not exists public.project_material_usage (
  id text primary key,
  project_id text not null references public.projects(id) on delete cascade,
  product_id text not null references public.products(id),
  warehouse_id text references public.warehouses(id) on delete set null,
  work_log_id text references public.work_logs(id) on delete set null,
  quantity numeric(14,3) not null,
  unit text default 'db',
  usage_date date not null default current_date,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.project_costs (
  id text primary key,
  project_id text references public.projects(id) on delete cascade,
  category text not null,
  description text,
  amount numeric(14,2) not null,
  cost_date date not null default current_date,
  source_type text,
  source_id text,
  created_at timestamptz not null default now()
);

create table if not exists public.machine_usage (
  id text primary key,
  machine_id text references public.machines(id) on delete set null,
  project_id text references public.projects(id) on delete set null,
  usage_date date not null default current_date,
  start_hours numeric(12,1),
  end_hours numeric(12,1),
  hours numeric(12,1),
  cost numeric(14,2) not null default 0,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.machine_service (
  id text primary key,
  machine_id text not null references public.machines(id) on delete cascade,
  service_date date,
  operating_hours numeric(12,1),
  service_type text,
  cost numeric(14,2) not null default 0,
  description text,
  next_service_hours numeric(12,1),
  next_service_date date,
  created_at timestamptz not null default now()
);

-- ===== INDEXES =====
create index if not exists idx_quotes_customer on public.quotes(customer_id);
create index if not exists idx_quotes_project on public.quotes(project_id);
create index if not exists idx_quote_items_quote on public.quote_items(quote_id);
create index if not exists idx_projects_customer on public.projects(customer_id);
create index if not exists idx_projects_quote on public.projects(quote_id);
create index if not exists idx_work_logs_project on public.work_logs(project_id);
create index if not exists idx_work_logs_customer on public.work_logs(customer_id);
create index if not exists idx_work_logs_date on public.work_logs(work_date desc);
create index if not exists idx_work_log_layers_worklog on public.work_log_layers(work_log_id);
create index if not exists idx_material_req_project on public.project_material_requirements(project_id);
create index if not exists idx_material_usage_project on public.project_material_usage(project_id);
create index if not exists idx_material_usage_worklog on public.project_material_usage(work_log_id);
create index if not exists idx_project_costs_project on public.project_costs(project_id);
create index if not exists idx_machine_usage_machine on public.machine_usage(machine_id);
create index if not exists idx_machine_usage_project on public.machine_usage(project_id);
create index if not exists idx_machine_service_machine on public.machine_service(machine_id);

-- ===== UPDATED-AT TRIGGERS =====
do $$
declare t text;
begin
  foreach t in array array['customers','quotes','projects','employees','machines','products','warehouses','work_logs','project_material_requirements'] loop
    execute format('drop trigger if exists trg_%s_meta on public.%I',t,t);
    execute format('create trigger trg_%s_meta before insert or update on public.%I for each row execute function public.set_updated_meta()',t,t);
  end loop;
end $$;

-- ===== RLS =====
do $$
declare t text;
begin
  foreach t in array array['customers','quotes','quote_items','projects','employees','machines','products','warehouses','warehouse_stock','work_logs','work_log_layers','project_material_requirements','project_material_usage','project_costs','machine_usage','machine_service'] loop
    execute format('alter table public.%I enable row level security',t);
    execute format('drop policy if exists %I on public.%I',t||'_authenticated_all',t);
    execute format('create policy %I on public.%I for all to authenticated using (true) with check (true)',t||'_authenticated_all',t);
  end loop;
end $$;

-- Biztonsági megjegyzés: az anon kulcs kliensoldali jelenléte önmagában nem ad adatbázis-hozzáférést;
-- az RLS policy dönti el, hogy az authenticated szerepkör mit tehet.
