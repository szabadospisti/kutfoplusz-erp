# Kútfő Plusz ERP V1.9 – Supabase központi adatmentés

## Mi változott?
- Supabase Project URL és publishable key konfigurálva.
- Supabase Auth e-mail/jelszó bejelentkezés.
- Új felhasználó regisztrálható az ERP belépőképernyőjéről.
- A `public.erp_state` táblába kerül az ERP teljes adatállapota JSONB formában.
- Mentéskor a rendszer localStorage-ba és Supabase-be is ment.
- Belépéskor a Supabase-ből tölti az adatokat.
- Ha a Supabase-ben még nincs adat, az első bejelentkezéskor a jelenlegi helyi ERP-adatokat feltölti.
- A helyi localStorage tartalék továbbra is megmarad.
- A munkanapló automatikus piszkozatmentése is megmaradt.
- A Word/PDF generálás V1.7-es javítása is megmaradt.

## Fontos
A `supabase_config.js` csak a Supabase publishable key-t tartalmazza. Secret/service-role kulcs nincs a projektben.

A projekt használatához Supabase Auth felhasználó szükséges.

<!-- Deploy validation checkpoint: external CRUD modules are syntax-gated before Pages deployment. -->
