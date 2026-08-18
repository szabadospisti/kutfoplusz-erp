# Kútfő Plusz ERP — Authentication Architecture

## Cél

Egyetlen kliensoldali Supabase Auth folyamat legyen az ERP belépési pontja.

## Folyamat

```text
ERP oldal betöltése
  ↓
Session ellenőrzése
  ↓
Érvényes session? ── igen ──→ ERP megnyitása
  │                              ↓
  │                         felhőadat betöltése
  │
  nem
  ↓
Login képernyő
  ↓
e-mail + jelszó
  ↓
Supabase Auth
  ↓
sikeres session
  ↓
ERP azonnali megnyitása
  ↓
fellőadat betöltése háttérben
```

## Session

Az ERP a `kutfoplusz_supabase_session_v2` kulcsot használja. A korábbi `v1` sessiont egyszeri kompatibilitási átmenetként olvassa, majd `v2` formátumba menti.

A refresh token segítségével a lejárathoz közeli session frissíthető. Ha a refresh sikertelen, a kliens törli a helyi sessiont és visszatér a login állapotba.

## Login

A `auth-stable-fix.js` az `authForm` submit eseményét capture fázisban kezeli, így a régi inline login logika nem tudja felülírni a stabil auth folyamatot.

Sikeres hitelesítés után az ERP megnyílik **azonnal**. A `supabaseCloudLoadOrMigrate()` nem része a hitelesítésnek, ezért felhőadat-betöltési hiba nem akadályozhatja meg a belépést.

## Logout

A `supabaseLogout()` először törli a kliens sessiont, majd megpróbálja a Supabase oldali logout/revoke kérést. A kliens akkor is azonnal kijelentkezik, ha a hálózati kérés sikertelen.

## Password recovery

Az `auth-password.js` az aktuális GitHub Pages origin + pathname címet használja recovery redirectként. A recovery tokenből új jelszó állítható be. Sikeres jelszóváltás után a régi kliens sessionök törlődnek.

## Biztonsági határ

Kliensoldalon csak a Supabase publishable key használható. `service_role` kulcsot nem szabad a GitHub repóba vagy böngészőbe tenni.

## Következő audit

A tiszta auth kód után külön ellenőrizni kell:

- Supabase Authentication URL / Redirect URL beállítások
- e-mail confirmation állapot
- password recovery működés GitHub Pages alatt
- session lejárat és refresh
- logout
- Safari / iPhone viselkedés
- RLS és szerepkörök
- `erp_state` hozzáférési modell
