-- Kútfő Plusz ERP – relációs v3 kompatibilitási patch
-- A projekt és ajánlat között a quote_id csak opcionális visszahivatkozás.
-- Az ajánlat -> projekt kapcsolat az elsődleges FK; így a migráció és a CRUD nem függ körkörös beszúrási sorrendtől.

alter table public.projects drop constraint if exists projects_quote_id_fkey;

create index if not exists idx_projects_quote_id on public.projects(quote_id);
