/* Kútfő Plusz ERP - Supabase project CRUD adapter */
(function(){
  'use strict';
  const TABLE='projects';
  function client(){
    const s=window.supabase;
    if(!s || typeof s.from!=='function') throw new Error('Supabase kliens nincs betöltve.');
    return s;
  }
  async function customerUuid(localCustomerId){
    if(!localCustomerId) return null;
    if(String(localCustomerId).match(/^[0-9a-f]{8}-[0-9a-f-]{27,}$/i)) return localCustomerId;
    const local=(window.db&&Array.isArray(window.db.customers)) ? window.db.customers.find(c=>String(c.id)===String(localCustomerId)) : null;
    if(!local) return null;
    const {data,error}=await client().from('customers').select('id').eq('company_name',local.name).limit(1).maybeSingle();
    if(error) throw error;
    return data ? data.id : null;
  }
  async function clean(p){
    return {
      project_number:p.project_number ?? p.projectNumber ?? p.id ?? null,
      customer_id:await customerUuid(p.customer_id ?? p.customerId),
      name:p.name ?? p.projectName ?? '',
      location:p.location ?? null,
      status:p.status ?? 'Tervezés',
      contract_value:p.contract_value ?? p.contractValue ?? p.value ?? 0,
      planned_cost:p.planned_cost ?? p.plannedCost ?? p.planned ?? 0,
      actual_cost:p.actual_cost ?? p.actualCost ?? p.cost ?? 0,
      profit:(p.profit ?? ((+p.value||0)-(+p.cost||0))),
      profit_margin:p.profit_margin ?? ((+p.value||0) ? (((+p.value||0)-(+p.cost||0))/(+p.value||0)*100) : 0)
    };
  }
  async function list(){
    const {data,error}=await client().from(TABLE).select('*').order('created_at',{ascending:false});
    if(error) throw error;
    return data||[];
  }
  async function create(project){
    const payload=await clean(project);
    if(!payload.customer_id) throw new Error('A kiválasztott ügyfél nincs összekötve a Supabase customers táblával.');
    const {data,error}=await client().from(TABLE).insert(payload).select().single();
    if(error) throw error;
    return data;
  }
  async function update(id,project){
    if(!id) throw new Error('Hiányzó projektazonosító.');
    const payload=await clean(project);
    if(!payload.customer_id) throw new Error('A kiválasztott ügyfél nincs összekötve a Supabase customers táblával.');
    const {data,error}=await client().from(TABLE).update(payload).eq('id',id).select().single();
    if(error) throw error;
    return data;
  }
  async function findByProjectNumber(projectNumber){
    const {data,error}=await client().from(TABLE).select('*').eq('project_number',projectNumber).maybeSingle();
    if(error) throw error;
    return data||null;
  }
  async function remove(id){
    if(!id) throw new Error('Hiányzó projektazonosító.');
    const {count,error:checkError}=await client().from('work_logs').select('id',{count:'exact',head:true}).eq('project_id',id);
    if(checkError) throw checkError;
    if((count||0)>0) throw new Error('A projekt nem törölhető, mert munkanapló tartozik hozzá.');
    const {error}=await client().from(TABLE).delete().eq('id',id);
    if(error) throw error;
    return true;
  }
  window.KPProjectSupabase={list,create,update,remove,findByProjectNumber};
})();
