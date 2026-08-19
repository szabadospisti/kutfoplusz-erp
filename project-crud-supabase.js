/* Kútfő Plusz ERP - Supabase project CRUD adapter
   Uses the Supabase REST API directly. This avoids a browser CDN/SDK dependency.
*/
(function(){
  'use strict';
  const TABLE='projects';

  function config(){
    const c=window.SUPABASE_CONFIG;
    if(!c || !c.url || !c.publishableKey) throw new Error('Supabase konfiguráció nincs betöltve.');
    return c;
  }

  async function request(path, options){
    const c=config();
    const headers=Object.assign({
      'apikey':c.publishableKey,
      'Authorization':'Bearer '+c.publishableKey,
      'Accept':'application/json'
    }, (options && options.headers) || {});
    const res=await fetch(c.url+'/rest/v1/'+path,Object.assign({},options,{headers}));
    const text=await res.text();
    let body=null;
    try{ body=text?JSON.parse(text):null; }catch(e){ body=text; }
    if(!res.ok){
      const msg=body && (body.message || body.error || body.hint || body.details) ? [body.message,body.details,body.hint].filter(Boolean).join(' | ') : String(body||res.statusText);
      throw new Error('Supabase '+res.status+': '+msg);
    }
    return body;
  }

  async function customerUuid(p){
    const raw=p.customer_id ?? p.customerId;
    if(!raw) return null;
    if(String(raw).match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) return raw;
    const customerName=p.customerName ?? p.customer_name ?? null;
    if(!customerName) return null;
    const rows=await request('customers?select=id&company_name=eq.'+encodeURIComponent(customerName)+'&limit=1');
    return Array.isArray(rows)&&rows[0] ? rows[0].id : null;
  }

  async function clean(p){
    return {
      project_number:p.project_number ?? p.projectNumber ?? p.id ?? null,
      customer_id:await customerUuid(p),
      name:p.name ?? p.projectName ?? '',
      location:p.location ?? null,
      status:p.status ?? 'Tervezés',
      contract_value:p.contract_value ?? p.contractValue ?? p.value ?? 0,
      planned_cost:p.planned_cost ?? p.plannedCost ?? p.planned ?? 0,
      actual_cost:p.actual_cost ?? p.actualCost ?? p.cost ?? 0
    };
  }

  async function list(){
    const rows=await request(TABLE+'?select=*&order=created_at.desc');
    return Array.isArray(rows)?rows:[];
  }

  async function create(project){
    const payload=await clean(project);
    if(!payload.customer_id) throw new Error('A kiválasztott ügyfél nincs összekötve a Supabase customers táblával.');
    const rows=await request(TABLE,{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(payload)});
    return Array.isArray(rows)?rows[0]:rows;
  }

  async function update(id,project){
    if(!id) throw new Error('Hiányzó projektazonosító.');
    const payload=await clean(project);
    if(!payload.customer_id) throw new Error('A kiválasztott ügyfél nincs összekötve a Supabase customers táblával.');
    const rows=await request(TABLE+'?id=eq.'+encodeURIComponent(id),{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(payload)});
    return Array.isArray(rows)?rows[0]:rows;
  }

  async function findByProjectNumber(projectNumber){
    const rows=await request(TABLE+'?select=*&project_number=eq.'+encodeURIComponent(projectNumber)+'&limit=1');
    return Array.isArray(rows)&&rows[0] ? rows[0] : null;
  }

  async function remove(id){
    if(!id) throw new Error('Hiányzó projektazonosító.');
    const logs=await request('work_logs?select=id&project_id=eq.'+encodeURIComponent(id));
    if(Array.isArray(logs)&&logs.length) throw new Error('A projekt nem törölhető, mert munkanapló tartozik hozzá.');
    await request(TABLE+'?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:{'Prefer':'return=minimal'}});
    return true;
  }

  window.KPProjectSupabase={list,create,update,remove,findByProjectNumber};
})();
