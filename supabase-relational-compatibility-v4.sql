-- Kútfő Plusz ERP – relációs kompatibilitási patch v4
-- A futó Supabase projektben alkalmazott séma-kiegészítések.

alter table public.customers
  add column if not exists updated_at timestamptz default now(),
  add column if not exists updated_by uuid,
  add column if not exists name text,
  add column if not exists status text default 'Aktív';

alter table public.quotes
  add column if not exists project_id uuid references public.projects(id),
  add column if not exists subject text,
  add column if not exists technical_content text,
  add column if not exists price_includes text,
  add column if not exists price_excludes text,
  add column if not exists declarations text,
  add column if not exists signer text,
  add column if not exists position text,
  add column if not exists extra_data jsonb default '{}'::jsonb;

alter table public.quote_items add column if not exists sort_order integer not null default 0;
alter table public.projects add column if not exists extra_data jsonb default '{}'::jsonb;
alter table public.employees add column if not exists email text, add column if not exists notes text;
alter table public.products add column if not exists notes text;
alter table public.warehouses add column if not exists location text, add column if not exists notes text;

alter table public.work_logs
  add column if not exists customer_id uuid references public.customers(id),
  add column if not exists location text,
  add column if not exists well_number text,
  add column if not exists final_depth numeric,
  add column if not exists status text,
  add column if not exists filter_data jsonb default '[]'::jsonb,
  add column if not exists well_profile jsonb default '{}'::jsonb,
  add column if not exists water_data jsonb default '{}'::jsonb,
  add column if not exists extra_data jsonb default '{}'::jsonb;

alter table public.project_material_usage
  add column if not exists warehouse_id uuid references public.warehouses(id),
  add column if not exists usage_date date default current_date,
  add column if not exists notes text;

alter table public.machine_usage add column if not exists notes text;
alter table public.well_layers add column if not exists drilling_behavior text, add column if not exists water_state text, add column if not exists notes text;
alter table public.work_log_filters add column if not exists legacy_data jsonb default '{}'::jsonb;

create table if not exists public.work_log_layers (
  id uuid primary key default gen_random_uuid(),
  work_log_id uuid not null references public.work_logs(id) on delete cascade,
  depth_from numeric not null default 0,
  depth_to numeric not null default 0,
  material text,
  drilling_behavior text,
  water_state text,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now()
);

update public.customers
set name=coalesce(name,company_name),
    status=coalesce(status,'Aktív'),
    updated_at=coalesce(updated_at,created_at,now())
where true;

insert into public.work_log_layers(id,work_log_id,depth_from,depth_to,material,notes,sort_order)
select wl.id,wl.work_log_id,wl.depth_from,wl.depth_to,wl.material,coalesce(wl.note,wl.notes),wl.sort_order
from public.well_layers wl
on conflict (id) do nothing;

create index if not exists idx_work_logs_customer_id on public.work_logs(customer_id);
create index if not exists idx_work_logs_project_id on public.work_logs(project_id);
create index if not exists idx_project_material_usage_project_id on public.project_material_usage(project_id);
create index if not exists idx_work_log_layers_work_log_id on public.work_log_layers(work_log_id);

-- FONTOS: az RLS-t szándékosan nem kapcsolja be ez a patch.
-- A publikus táblákon jelenleg több helyen RLS nincs engedélyezve.
-- Mielőtt éles ügyféladat kerül a rendszerbe, authenticated szerepkörre
-- vonatkozó SELECT/INSERT/UPDATE/DELETE policy-ket kell létrehozni.
