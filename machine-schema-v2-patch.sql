-- Kútfő Plusz ERP – géppark v2 mezőbővítés
-- A jelenlegi Géppark adatlap összes szerkeszthető mezőjét lefedi.
-- Futtatható a schema-relational-v2.sql után.

alter table public.machines
  add column if not exists asset_type text,
  add column if not exists asset_code text,
  add column if not exists make text,
  add column if not exists plate text,
  add column if not exists vin text,
  add column if not exists engine_no text,
  add column if not exists purchase_value numeric(14,2) not null default 0,
  add column if not exists current_value numeric(14,2) not null default 0,
  add column if not exists hours numeric(12,1) not null default 0,
  add column if not exists odometer numeric(12,1) not null default 0,
  add column if not exists service_km numeric(12,1) not null default 0,
  add column if not exists service_hours numeric(12,1) not null default 0,
  add column if not exists service_date date,
  add column if not exists fuel text,
  add column if not exists engine_cc numeric(12,1) not null default 0,
  add column if not exists power_hp numeric(12,2) not null default 0,
  add column if not exists power_kw numeric(12,2) not null default 0,
  add column if not exists transmission text,
  add column if not exists drive text,
  add column if not exists body text,
  add column if not exists color text,
  add column if not exists tire_size text,
  add column if not exists weight numeric(12,2) not null default 0,
  add column if not exists gvw numeric(12,2) not null default 0,
  add column if not exists mot_expiry date,
  add column if not exists insurance_expiry date,
  add column if not exists casco_expiry date,
  add column if not exists toll_expiry date,
  add column if not exists registration_doc text,
  add column if not exists insurer text,
  add column if not exists policy_no text,
  add column if not exists last_service_date date,
  add column if not exists last_service_meter text,
  add column if not exists service_provider text,
  add column if not exists last_service_cost numeric(14,2) not null default 0,
  add column if not exists service_note text,
  add column if not exists fuel_cost_month numeric(14,2) not null default 0,
  add column if not exists service_cost_year numeric(14,2) not null default 0,
  add column if not exists insurance_cost_year numeric(14,2) not null default 0,
  add column if not exists other_cost_year numeric(14,2) not null default 0,
  add column if not exists responsible text;

-- A régi alapmezők és az új UI-mezők közötti kezdeti kompatibilitás.
update public.machines
set
  make = coalesce(make, manufacturer),
  engine_no = coalesce(engine_no, serial_number),
  hours = coalesce(hours, current_hours),
  purchase_value = coalesce(purchase_value, purchase_price, 0)
where true;

create index if not exists idx_machines_asset_type on public.machines(asset_type);
create index if not exists idx_machines_plate on public.machines(plate);
create index if not exists idx_machines_vin on public.machines(vin);
