# Kútfő Plusz ERP V1.7 – Word/PDF generálás javítva

Javítva az a hiba, amikor a Munkanapló generálása ablakból a Word gombra kattintva:
„null is not an object (evaluating document.getElementById("wl_date").value)”

Ok: a generáló előnézet megnyitásakor az eredeti munkanapló űrlap kikerül a DOM-ból, ezért a Word/PDF gomb újra próbálta a wlCollect() függvénnyel lekérni az űrlapot.

Megoldás:
- a generáló ablak megnyitásakor pillanatképként eltároljuk a kitöltött munkanapló adatait;
- PDF és Word generálás már ebből az eltárolt adatból dolgozik;
- nem próbálja újra elérni a bezárt/lecserélt wlForm elemeket.

JavaScript syntax: OK.
