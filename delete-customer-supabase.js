/* Kútfő Plusz ERP – stabil ügyfél törlés Supabase-ből */
(function(){
  'use strict';
  async function removeCustomer(id){
    if(!id) throw new Error('Hiányzó ügyfélazonosító.');
    const c=window.SUPABASE_CONFIG;
    if(!c||!c.url||!c.publishableKey) throw new Error('Supabase konfiguráció nincs betöltve.');
    const headers={apikey:c.publishableKey,Authorization:'Bearer '+c.publishableKey,Accept:'application/json'};
    const check=await fetch(c.url+'/rest/v1/projects?customer_id=eq.'+encodeURIComponent(id)+'&select=id&limit=1',{headers});
    if(!check.ok) throw new Error('Nem sikerült ellenőrizni az ügyfélhez tartozó projekteket.');
    const projects=await check.json();
    if(Array.isArray(projects)&&projects.length) throw new Error('Az ügyfél nem törölhető, mert projekt tartozik hozzá.');
    const res=await fetch(c.url+'/rest/v1/customers?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:Object.assign({},headers,{Prefer:'return=minimal'})});
    if(!res.ok){const text=await res.text();throw new Error('Supabase '+res.status+': '+(text||'Az ügyfél törlése sikertelen.'));}
    return true;
  }
  window.KPCustomerSupabase={remove:removeCustomer};
})();
