window.SUPABASE_CONFIG = Object.freeze({
  url: "https://qoxxhsbcptyieyhtdhrw.supabase.co",
  publishableKey: "sb_publishable_WYMcBkgdK-Ed5JY_ljJS0g_BB8dH10T"
});

/*
 * Munkanapló tartósítási javítás.
 * Az index.html-ben lévő régi sablonbetöltő minden oldalindításkor újraírta
 * az MN-2026-001 rekordot, ezért a Mentés után a módosítások visszaálltak.
 * Ez a kis előzetes védelem a fő script indulása előtt megőrzi a már elmentett
 * munkanaplókat, és csak a sablon egyszeri induláskori localStorage-írását
 * engedi át úgy, hogy a korábbi worklogs tömb megmaradjon.
 */
(function preserveSavedWorklogs(){
  const STORE_KEY = "kutfoplusz_erp_v12";
  let previous = null;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.worklogs) && parsed.worklogs.length) {
        previous = parsed;
      }
    }
  } catch (e) {}

  if (!previous) return;

  const proto = Storage.prototype;
  const originalSetItem = proto.setItem;
  let bootPhase = true;

  proto.setItem = function(key, value){
    if (bootPhase && key === STORE_KEY) {
      try {
        const next = JSON.parse(value);
        if (next && typeof next === "object") {
          next.worklogs = previous.worklogs;
          value = JSON.stringify(next);
        }
      } catch (e) {}
    }
    return originalSetItem.call(this, key, value);
  };

  // A fő index.html szinkron induló kódja lefutott; innentől a normál mentést
  // már nem szabad felülírni.
  setTimeout(function(){
    bootPhase = false;
    try { proto.setItem = originalSetItem; } catch (e) {}
  }, 0);
})();
