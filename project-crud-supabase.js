/* Kútfő Plusz ERP - Supabase project CRUD adapter
   This module is intentionally standalone so it can be tested before wiring into index.html.
*/
(function(){
  'use strict';
  const TABLE='projects';
  function client(){
    const s=window.supabase;
    if(!s) throw new Error('Supabase kliens nincs betöltve.');
    if(typeof s.from!=='function') throw new Error('Érvénytelen Supabase kliens.');
    return s;
  }
  function clean(p){
    return {
      project_number:p.project_number ?? p.projectNumber ?? null,
      name:p.name ?? p.projectName ?? '',
      customer_id:p.customer_id ?? p.customerId ?? null,
      location:p.location ?? null,
      status:p.status ?? 'Tervezés',
      contract_value:p.contract_value ?? p.contractValue ?? null,
      planned_cost:p.planned_cost ?? p.plannedCost ?? null,
      actual_cost:p.actual_cost ?? p.actualCost ?? null,
      progress_pct:p.progress_pct ?? p.progress ?? 0,
      notes:p.notes ?? null
    };
  }
  async function list(){
    const {data,error}=await client().from(TABLE).select('*').order('created_at',{ascending:false});
    if(error) throw error;
    return data||[];
  }
  async function create(project){
    const {data,error}=await client().from(TABLE).insert(clean(project)).select().single();
    if(error) throw error;
    return data;
  }
  async function update(id,project){
    if(!id) throw new Error('Hiányzó projektazonosító.');
    const {data,error}=await client().from(TABLE).update(clean(project)).eq('id',id).select().single();
    if(error) throw error;
    return data;
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
  window.KPProjectSupabase={list,create,update,remove};
})();
