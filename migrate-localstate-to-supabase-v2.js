/* Kútfő Plusz ERP – egyszeri migrációs segéd v2
 * Nem fut automatikusan. A régi adatot előbb exportálja, majd explicit indítással tölti fel.
 * Használat a bejelentkezett ERP oldalon:
 *   const data = KP_MIGRATION.readLocalState();
 *   KP_MIGRATION.downloadBackup(data);
 *   await KP_MIGRATION.run(data, window.supabaseClient);
 */
(function(global){
  'use strict';
  const A=['customers','quotes','projects','employees','machines','products','warehouses','warehouse_stock','work_logs','work_log_layers','project_material_requirements','project_material_usage','project_costs','machine_usage','machine_service'];
  const keys=['kutfoz-erp','kutfo-plusz-erp','erp_state','db'];
  function looksLikeDb(v){return v&&typeof v==='object'&&A.some(k=>Array.isArray(v[k])||Array.isArray(v[camel(k)]));}
  function camel(k){return k.replace(/_([a-z])/g,(_,c)=>c.toUpperCase())}
  function readLocalState(){
    if(global.db&&looksLikeDb(global.db)) return global.db;
    for(const k of keys){try{const raw=localStorage.getItem(k);if(!raw)continue;const v=JSON.parse(raw);if(looksLikeDb(v))return v;}catch(e){}}
    for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);try{const v=JSON.parse(localStorage.getItem(k));if(looksLikeDb(v))return v;}catch(e){}}
    throw new Error('Nem találtam a régi ERP adatállapotot. Ne futtasd a migrációt kézi JSON nélkül.');
  }
  function arr(data,k){return Array.isArray(data[k])?data[k]:(Array.isArray(data[camel(k)])?data[camel(k)]:[])}
  function id(v,prefix){return String(v?.id||`${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`)}
  function date(v){return v?String(v).slice(0,10):null}
  function num(v){const n=Number(v);return Number.isFinite(n)?n:0}
  function customer(c){return {id:id(c,'C'),name:String(c.name||c.company_name||c.customerName||'Névtelen ügyfél'),tax_number:c.tax_number||c.taxNumber||c.tax||null,company_number:c.company_number||c.companyNo||null,contact_person:c.contact_person||c.contactPerson||c.contact||null,phone:c.phone||null,email:c.email||null,address:c.address||null,billing_address:c.billing_address||c.billingAddress||null,notes:c.notes||null,status:(c.status==='Inaktív'||c.status==='inactive')?'Inaktív':'Aktív'} }
  function project(p){return {id:id(p,'P'),project_number:p.project_number||p.projectNumber||null,customer_id:p.customer_id||p.customerId||null,quote_id:p.quote_id||p.quoteId||null,name:String(p.name||p.projectName||'Névtelen projekt'),location:p.location||null,latitude:p.latitude??null,longitude:p.longitude??null,start_date:date(p.start_date||p.startDate),planned_end_date:date(p.planned_end_date||p.plannedEndDate),actual_end_date:date(p.actual_end_date||p.actualEndDate),status:p.status||'Érdeklődés',contract_value:num(p.contract_value??p.contractValue),planned_cost:num(p.planned_cost??p.plannedCost),actual_cost:num(p.actual_cost??p.actualCost),responsible_user_id:p.responsible_user_id||p.responsibleUserId||null,notes:p.notes||null,extra_data:p.extra_data||p.extraData||{}}}
  function quote(q){return {id:id(q,'Q'),quote_number:q.quote_number||q.quoteNumber||null,customer_id:q.customer_id||q.customerId||null,project_id:q.project_id||q.projectId||null,project_name:q.project_name||q.projectName||null,location:q.location||null,quote_date:date(q.quote_date||q.quoteDate),valid_until:date(q.valid_until||q.validUntil),status:q.status||'Piszkozat',subject:q.subject||q.title||null,notes:q.notes||null,technical_content:q.technical_content||q.technicalContent||null,price_includes:q.price_includes||q.includes||null,price_excludes:q.price_excludes||q.excludes||null,declarations:q.declarations||null,signer:q.signer||null,position:q.position||null,net_total:num(q.net_total??q.netTotal),vat_total:num(q.vat_total??q.vatTotal),gross_total:num(q.gross_total??q.grossTotal),extra_data:q.extra_data||q.extraData||{}}}
  function workLog(w){return {id:id(w,'WL'),project_id:w.project_id||w.projectId||null,customer_id:w.customer_id||w.customerId||null,work_date:date(w.work_date||w.workDate),location:w.location||null,well_number:w.well_number||w.wellNumber||null,final_depth:num(w.final_depth??w.finalDepth),status:w.status||null,start_time:w.start_time||w.startTime||null,end_time:w.end_time||w.endTime||null,work_type:w.work_type||w.workType||null,description:w.description||null,weather:w.weather||null,notes:w.notes||null,filter_data:w.filter_data||w.filterData||w.filters||[],well_profile:w.well_profile||w.wellProfile||{},water_data:w.water_data||w.waterData||{},extra_data:w.extra_data||w.extraData||{}}}
  function layer(x,wlid,i){return {id:id(x,'WLL'),work_log_id:wlid,depth_from:num(x.depth_from??x.depthFrom??x.from),depth_to:num(x.depth_to??x.depthTo??x.to),material:x.material||x.layer||null,drilling_behavior:x.drilling_behavior||x.drillingBehavior||x.behavior||null,water_state:x.water_state||x.waterState||x.water||null,notes:x.notes||null,sort_order:i}}
  async function insertAll(supabase,table,rows){if(!rows.length)return;if(!supabase?.from)throw new Error('Érvénytelen Supabase kliens.');for(let i=0;i<rows.length;i+=500){const part=rows.slice(i,i+500);const {error}=await supabase.from(table).upsert(part,{onConflict:'id'});if(error)throw new Error(table+': '+error.message)}}
  async function run(data,supabase){
    if(!confirm('A relációs migráció elindul. A meglévő cél-táblák rekordjait ID alapján upserteli. Folytatod?'))return false;
    const customers=arr(data,'customers').map(customer);
    const projects=arr(data,'projects').map(project);
    const quotes=arr(data,'quotes').map(quote);
    const workLogs=arr(data,'work_logs').map(workLog);
    await insertAll(supabase,'customers',customers);
    await insertAll(supabase,'projects',projects);
    await insertAll(supabase,'quotes',quotes);
    await insertAll(supabase,'employees',arr(data,'employees'));
    await insertAll(supabase,'machines',arr(data,'machines'));
    await insertAll(supabase,'products',arr(data,'products'));
    await insertAll(supabase,'warehouses',arr(data,'warehouses'));
    await insertAll(supabase,'warehouse_stock',arr(data,'warehouse_stock'));
    await insertAll(supabase,'work_logs',workLogs);
    const rawLayers=arr(data,'work_log_layers');
    const layers=rawLayers.length?rawLayers:workLogs.flatMap(w=>{const source=w.layers||w.layerRows||w.layerData||[];return source.map((x,i)=>layer(x,w.id,i))});
    await insertAll(supabase,'work_log_layers',layers);
    await insertAll(supabase,'project_material_requirements',arr(data,'project_material_requirements'));
    await insertAll(supabase,'project_material_usage',arr(data,'project_material_usage'));
    await insertAll(supabase,'project_costs',arr(data,'project_costs'));
    await insertAll(supabase,'machine_usage',arr(data,'machine_usage'));
    await insertAll(supabase,'machine_service',arr(data,'machine_service'));
    const items=arr(data,'quote_items');
    if(items.length) await insertAll(supabase,'quote_items',items);
    return true;
  }
  function downloadBackup(data){const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='kutfo-plusz-erp-backup-'+new Date().toISOString().slice(0,10)+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
  global.KP_MIGRATION={readLocalState,downloadBackup,run};
})(window);
