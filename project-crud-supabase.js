/* Kútfő Plusz ERP - Supabase project CRUD adapter.
   Authentication and REST transport are delegated to supabase-auth-core.js.
*/
(function(){
  'use strict';
  const TABLE='projects';

  function ensureAuth(){
    if(window.KPSupabaseAuth)return Promise.resolve(window.KPSupabaseAuth);
    return new Promise(function(resolve,reject){
      const s=document.createElement('script');
      s.src='supabase-auth-core.js?v=1';
      s.onload=function(){window.KPSupabaseAuth?resolve(window.KPSupabaseAuth):reject(new Error('Központi Supabase Auth modul nem töltődött be.'));};
      s.onerror=function(){reject(new Error('Központi Supabase Auth modul betöltése sikertelen.'));};
      document.head.appendChild(s);
    });
  }

  async function request(path,options){
    const auth=await ensureAuth();
    return auth.request(path,options);
  }

  async function customerUuid(p){
    const raw=p.customer_id??p.customerId;
    if(!raw)return null;
    const rawText=String(raw);
    if(rawText.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i))return raw;
    let name=p.customerName??p.customer_name??null;
    if(!name && window.db && Array.isArray(window.db.customers)){
      const c=window.db.customers.find(x=>String(x.id??x.customerId??'')===rawText);
      if(c)name=c.company_name??c.companyName??c.name??c.nev??null;
    }
    if(!name)return null;
    const rows=await request('customers?select=id&company_name=eq.'+encodeURIComponent(String(name))+'&limit=1');
    return Array.isArray(rows)&&rows[0]?rows[0].id:null;
  }

  async function clean(p){return{
    project_number:p.project_number??p.projectNumber??p.id??null,
    customer_id:await customerUuid(p),
    name:p.name??p.projectName??'',
    location:p.location??null,
    status:p.status??'Tervezés',
    contract_value:p.contract_value??p.contractValue??p.value??0,
    planned_cost:p.planned_cost??p.plannedCost??p.planned??0,
    actual_cost:p.actual_cost??p.actualCost??p.cost??0,
    progress_pct:Math.max(0,Math.min(100,Number(p.progress_pct??p.progress??0)||0)),
    notes:p.notes??null
  };}

  async function list(){
    const rows=await request(TABLE+'?select=*&order=created_at.desc');
    return Array.isArray(rows)?rows:[];
  }

  async function create(project){
    const payload=await clean(project);
    if(!payload.customer_id)throw new Error('A kiválasztott ügyfél nincs összekötve a Supabase customers táblával.');
    const rows=await request(TABLE,{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(payload)});
    return Array.isArray(rows)?rows[0]:rows;
  }

  async function update(id,project){
    if(!id)throw new Error('Hiányzó projektazonosító.');
    const payload=await clean(project);
    if(!payload.customer_id)throw new Error('A kiválasztott ügyfél nincs összekötve a Supabase customers táblával.');
    const rows=await request(TABLE+'?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(payload)});
    const row=Array.isArray(rows)?rows[0]:rows;
    if(!row)throw new Error('A Supabase nem adott vissza módosított projektet az UUID alapján.');
    return row;
  }

  async function updateByProjectNumber(projectNumber,project){
    if(!projectNumber)throw new Error('Hiányzó projektazonosító.');
    const payload=await clean(project);
    if(!payload.customer_id)throw new Error('A kiválasztott ügyfél nincs összekötve a Supabase customers táblával.');
    const rows=await request(TABLE+'?project_number=eq.'+encodeURIComponent(projectNumber),{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(payload)});
    const row=Array.isArray(rows)?rows[0]:rows;
    if(!row)throw new Error('A Supabase nem adott vissza módosított projektet a projektazonosító alapján.');
    return row;
  }

  async function findByProjectNumber(projectNumber){
    const rows=await request(TABLE+'?select=*&project_number=eq.'+encodeURIComponent(projectNumber)+'&limit=1');
    return Array.isArray(rows)&&rows[0]?rows[0]:null;
  }

  async function remove(id){
    if(!id)throw new Error('Hiányzó projektazonosító.');
    const logs=await request('work_logs?select=id&project_id=eq.'+encodeURIComponent(id));
    if(Array.isArray(logs)&&logs.length)throw new Error('A projekt nem törölhető, mert munkanapló tartozik hozzá.');
    await request(TABLE+'?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:{'Prefer':'return=minimal'}});
    return true;
  }

  window.KPProjectSupabase={list,create,update,updateByProjectNumber,remove,findByProjectNumber};
})();
