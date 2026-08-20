/* Kútfő Plusz ERP – relációs adatforrás bridge v3
 * A meglévő UI továbbra is window.db-t használhat, de a tartós adatforrás
 * a Supabase relációs táblái. Az erp_state csak kompatibilitási fallback.
 */
(function(global){
  'use strict';
  if(global.__KP_RELATIONAL_BRIDGE_V3__) return;
  global.__KP_RELATIONAL_BRIDGE_V3__=true;

  const TABLES={customers:'customers',quotes:'quotes',quoteItems:'quote_items',projects:'projects',employees:'employees',machines:'machines',products:'products',warehouses:'warehouses',warehouseStock:'warehouse_stock',workLogs:'work_logs',workLogLayers:'work_log_layers',materialRequirements:'project_material_requirements',materialUsage:'project_material_usage',projectCosts:'project_costs',machineUsage:'machine_usage',machineService:'machine_service'};
  const SYNC_KEY='kp_relational_sync_ids_v3';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const arr=(k)=>Array.isArray(global.db?.[k])?global.db[k]:[];
  const str=v=>v==null?'':String(v);
  const num=v=>{const n=Number(v);return Number.isFinite(n)?n:0};
  const date=v=>v?String(v).slice(0,10):null;
  const pick=(o,keys,d=null)=>{for(const k of keys){if(o&&o[k]!==undefined&&o[k]!==null&&o[k]!== '')return o[k]}return d};
  const json=v=>v&&typeof v==='object'?v:{};

  function readIds(){try{return JSON.parse(localStorage.getItem(SYNC_KEY)||'{}')}catch(e){return {}}}
  function writeIds(x){try{localStorage.setItem(SYNC_KEY,JSON.stringify(x))}catch(e){}}

  async function request(path,options={}){
    if(!global.KPSupabaseAuth?.request) throw new Error('A Supabase API réteg még nem érhető el.');
    return global.KPSupabaseAuth.request(path,options);
  }
  async function getRows(table,query='select=*'){
    const r=await request('/rest/v1/'+table+'?'+query,{method:'GET'});
    if(!r.ok) throw new Error(table+' betöltési hiba: '+await r.text());
    return await r.json();
  }
  async function upsert(table,rows,conflict='id'){
    if(!rows.length)return;
    for(let i=0;i<rows.length;i+=250){
      const part=rows.slice(i,i+250);
      const r=await request('/rest/v1/'+table+'?on_conflict='+encodeURIComponent(conflict),{
        method:'POST',
        headers:{'Content-Type':'application/json','Prefer':'resolution=merge-duplicates,return=minimal'},
        body:JSON.stringify(part)
      });
      if(!r.ok) throw new Error(table+' mentési hiba: '+await r.text());
    }
  }
  async function removeByIds(table,ids){
    for(const id of ids){
      const r=await request('/rest/v1/'+table+'?id=eq.'+encodeURIComponent(id),{method:'DELETE',headers:{'Prefer':'return=minimal'}});
      if(!r.ok) throw new Error(table+' törlési hiba: '+await r.text());
    }
  }

  function customerRow(c){return {id:str(c.id),name:str(pick(c,['name','company_name','customerName'])),tax_number:pick(c,['tax_number','taxNumber','tax'],null),company_number:pick(c,['company_number','companyNo','company_no'],null),contact_person:pick(c,['contact_person','contactPerson','contact'],null),phone:pick(c,['phone','telephone'],null),email:pick(c,['email','e_mail'],null),address:pick(c,['address','fullAddress'],null),billing_address:pick(c,['billing_address','billingAddress'],null),notes:pick(c,['notes'],null),status:String(pick(c,['status'],'Aktív')).toLowerCase()==='inactive'?'Inaktív':'Aktív'} }
  function quoteRow(q){return {id:str(q.id),quote_number:pick(q,['quote_number','quoteNumber','id'],null),customer_id:pick(q,['customer_id','customerId'],null)||null,project_id:pick(q,['project_id','projectId'],null)||null,project_name:pick(q,['project_name','projectName','name'],null),location:pick(q,['location'],null),quote_date:date(pick(q,['quote_date','quoteDate','date'],null)),valid_until:date(pick(q,['valid_until','validUntil'],null)),status:pick(q,['status'],'Piszkozat'),subject:pick(q,['subject','title'],null),notes:pick(q,['notes'],null),technical_content:pick(q,['technical_content','technicalContent'],null),price_includes:pick(q,['price_includes','includes'],null),price_excludes:pick(q,['price_excludes','excludes'],null),declarations:pick(q,['declarations'],null),signer:pick(q,['signer'],null),position:pick(q,['position'],null),net_total:num(pick(q,['net_total','net'],0)),vat_total:num(pick(q,['vat_total','vat'],0)),gross_total:num(pick(q,['gross_total','gross'],0)),extra_data:json(q.extra_data||q.extraData)} }
  function quoteItemRow(x,quoteId,i){return {id:str(pick(x,['id'],quoteId+'-item-'+i)),quote_id:str(pick(x,['quote_id','quoteId'],quoteId)),description:str(pick(x,['description','desc','name'],'')),category:pick(x,['category'],null),quantity:num(pick(x,['quantity','qty'],1)),unit:pick(x,['unit'],null),unit_price:num(pick(x,['unit_price','price'],0)),vat_rate:num(pick(x,['vat_rate','vatRate'],27)),net_total:num(pick(x,['net_total','net'],0)),vat_total:num(pick(x,['vat_total','vat'],0)),gross_total:num(pick(x,['gross_total','gross'],0)),sort_order:i} }
  function projectRow(p){return {id:str(p.id),project_number:pick(p,['project_number','projectNumber'],null),customer_id:pick(p,['customer_id','customerId'],null)||null,quote_id:pick(p,['quote_id','quoteId'],null)||null,name:str(pick(p,['name','projectName'],'')),location:pick(p,['location'],null),latitude:p.latitude??null,longitude:p.longitude??null,start_date:date(pick(p,['start_date','startDate'],null)),planned_end_date:date(pick(p,['planned_end_date','plannedEndDate'],null)),actual_end_date:date(pick(p,['actual_end_date','actualEndDate'],null)),status:pick(p,['status'],'Érdeklődés'),contract_value:num(pick(p,['contract_value','contractValue','value'],0)),planned_cost:num(pick(p,['planned_cost','plannedCost','planned'],0)),actual_cost:num(pick(p,['actual_cost','actualCost','cost'],0)),responsible_user_id:pick(p,['responsible_user_id','responsibleUserId'],null)||null,notes:pick(p,['notes'],null),extra_data:json(p.extra_data||p.extraData)} }
  function employeeRow(x){return {id:str(x.id),name:str(pick(x,['name'],'')),role:pick(x,['role'],null),phone:pick(x,['phone'],null),email:pick(x,['email'],null),hourly_rate:num(pick(x,['hourly_rate','hourlyRate'],0)),active:x.active!==false,notes:pick(x,['notes'],null)} }
  function machineRow(m){return {id:str(m.id),machine_number:pick(m,['machine_number','machineNumber','asset_code','assetCode'],null),name:str(pick(m,['name'],'')),manufacturer:pick(m,['manufacturer','make'],null),model:pick(m,['model'],null),serial_number:pick(m,['serial_number','serialNumber'],null),year:num(pick(m,['year'],0))||null,current_hours:num(pick(m,['current_hours','currentHours','hours'],0)),status:pick(m,['status'],'Aktív'),purchase_date:date(pick(m,['purchase_date','purchaseDate'],null)),purchase_price:num(pick(m,['purchase_price','purchasePrice','purchase_value'],0)),notes:pick(m,['notes'],null),asset_type:pick(m,['asset_type','assetType'],null),asset_code:pick(m,['asset_code','assetCode'],null),make:pick(m,['make','manufacturer'],null),plate:pick(m,['plate'],null),vin:pick(m,['vin'],null),engine_no:pick(m,['engine_no','engineNo'],null),purchase_value:num(pick(m,['purchase_value','purchaseValue','purchase_price'],0)),current_value:num(pick(m,['current_value','currentValue'],0)),hours:num(pick(m,['hours','current_hours'],0)),odometer:num(pick(m,['odometer'],0)),service_km:num(pick(m,['service_km','serviceKm'],0)),service_hours:num(pick(m,['service_hours','serviceHours'],0)),service_date:date(pick(m,['service_date','serviceDate'],null)),fuel:pick(m,['fuel'],null),engine_cc:num(pick(m,['engine_cc','engineCc'],0)),power_hp:num(pick(m,['power_hp','powerHp'],0)),power_kw:num(pick(m,['power_kw','powerKw'],0)),transmission:pick(m,['transmission'],null),drive:pick(m,['drive'],null),body:pick(m,['body'],null),color:pick(m,['color'],null),tire_size:pick(m,['tire_size','tireSize'],null),weight:num(pick(m,['weight'],0)),gvw:num(pick(m,['gvw'],0)),mot_expiry:date(pick(m,['mot_expiry','motExpiry'],null)),insurance_expiry:date(pick(m,['insurance_expiry','insuranceExpiry'],null)),casco_expiry:date(pick(m,['casco_expiry','cascoExpiry'],null)),toll_expiry:date(pick(m,['toll_expiry','tollExpiry'],null)),registration_doc:pick(m,['registration_doc','registrationDoc'],null),insurer:pick(m,['insurer'],null),policy_no:pick(m,['policy_no','policyNo'],null),last_service_date:date(pick(m,['last_service_date','lastServiceDate'],null)),last_service_meter:pick(m,['last_service_meter','lastServiceMeter'],null),service_provider:pick(m,['service_provider','serviceProvider'],null),last_service_cost:num(pick(m,['last_service_cost','lastServiceCost'],0)),service_note:pick(m,['service_note','serviceNote'],null),fuel_cost_month:num(pick(m,['fuel_cost_month','fuelCostMonth'],0)),service_cost_year:num(pick(m,['service_cost_year','serviceCostYear'],0)),insurance_cost_year:num(pick(m,['insurance_cost_year','insuranceCostYear'],0)),other_cost_year:num(pick(m,['other_cost_year','otherCostYear'],0)),responsible:pick(m,['responsible'],null)} }
  function productRow(x){return {id:str(x.id),sku:pick(x,['sku'],null),name:str(pick(x,['name'],'')),category:pick(x,['category'],null),unit:pick(x,['unit'],null),purchase_price:num(pick(x,['purchase_price','purchasePrice'],0)),sale_price:num(pick(x,['sale_price','salePrice'],0)),vat_rate:num(pick(x,['vat_rate','vatRate'],27)),minimum_stock:num(pick(x,['minimum_stock','minimumStock'],0)),material_type:pick(x,['material_type','materialType'],null),diameter_mm:num(pick(x,['diameter_mm','diameterMm'],0))||null,length_m:num(pick(x,['length_m','lengthM'],0))||null,material_unit:pick(x,['material_unit','materialUnit'],'db'),notes:pick(x,['notes'],null)} }
  function warehouseRow(x){return {id:str(x.id),name:str(pick(x,['name'],'')),location:pick(x,['location'],null),notes:pick(x,['notes'],null)} }
  function stockRow(x){return {warehouse_id:str(pick(x,['warehouse_id','warehouseId'],'')),product_id:str(pick(x,['product_id','productId'],'')),quantity:num(pick(x,['quantity','qty'],0))} }
  function workLogRow(w){return {id:str(w.id),project_id:pick(w,['project_id','projectId'],null)||null,customer_id:pick(w,['customer_id','customerId'],null)||null,work_date:date(pick(w,['work_date','workDate','date'],null))||new Date().toISOString().slice(0,10),location:pick(w,['location'],null),well_number:pick(w,['well_number','wellNumber','wellNo'],null),final_depth:num(pick(w,['final_depth','finalDepth','depth'],0)),status:pick(w,['status'],null),start_time:pick(w,['start_time','startTime'],null)||null,end_time:pick(w,['end_time','endTime'],null)||null,work_type:pick(w,['work_type','workType'],null),description:pick(w,['description'],null),weather:pick(w,['weather'],null),notes:pick(w,['notes'],null),filter_data:json(w.filter_data||w.filterData||w.filters||[]),well_profile:json(w.well_profile||w.wellProfile||{}),water_data:json(w.water_data||w.waterData||{}),extra_data:json(w.extra_data||w.extraData)} }
  function layerRow(x,workLogId,i){return {id:str(pick(x,['id'],workLogId+'-layer-'+i)),work_log_id:str(pick(x,['work_log_id','workLogId'],workLogId)),depth_from:num(pick(x,['depth_from','depthFrom','from'],0)),depth_to:num(pick(x,['depth_to','depthTo','to'],0)),material:pick(x,['material','layer'],null),drilling_behavior:pick(x,['drilling_behavior','drillingBehavior','behavior'],null),water_state:pick(x,['water_state','waterState','water'],null),notes:pick(x,['notes'],null),sort_order:i} }
  function materialRequirementRow(x){return {id:str(x.id),project_id:str(pick(x,['project_id','projectId'],'')),product_id:str(pick(x,['product_id','productId'],'')),required_qty:num(pick(x,['required_qty','requiredQty'],0)),required_unit:pick(x,['required_unit','requiredUnit'],'db'),reserved_qty:num(pick(x,['reserved_qty','reservedQty'],0)),used_qty:num(pick(x,['used_qty','usedQty'],0)),status:pick(x,['status'],'Tervezett'),notes:pick(x,['notes'],null)} }
  function materialUsageRow(x){return {id:str(x.id),project_id:str(pick(x,['project_id','projectId'],'')),product_id:str(pick(x,['product_id','productId'],'')),warehouse_id:pick(x,['warehouse_id','warehouseId'],null),work_log_id:pick(x,['work_log_id','workLogId'],null),quantity:num(pick(x,['quantity','qty'],0)),unit:pick(x,['unit'],'db'),usage_date:date(pick(x,['usage_date','usageDate','date'],null))||new Date().toISOString().slice(0,10),notes:pick(x,['notes'],null)} }
  function costRow(x){return {id:str(x.id),project_id:pick(x,['project_id','projectId'],null),category:str(pick(x,['category'],'Egyéb')),description:pick(x,['description','desc'],null),amount:num(pick(x,['amount','cost','value'],0)),cost_date:date(pick(x,['cost_date','costDate','date'],null))||new Date().toISOString().slice(0,10),source_type:pick(x,['source_type','sourceType'],null),source_id:pick(x,['source_id','sourceId'],null)} }
  function usageRow(x){return {id:str(x.id),machine_id:pick(x,['machine_id','machineId'],null),project_id:pick(x,['project_id','projectId'],null),usage_date:date(pick(x,['usage_date','usageDate','date'],null))||new Date().toISOString().slice(0,10),start_hours:num(pick(x,['start_hours','startHours'],0)),end_hours:num(pick(x,['end_hours','endHours'],0)),hours:num(pick(x,['hours'],0)),cost:num(pick(x,['cost'],0)),notes:pick(x,['notes'],null)} }
  function serviceRow(x){return {id:str(x.id),machine_id:str(pick(x,['machine_id','machineId'],'')),service_date:date(pick(x,['service_date','serviceDate'],null)),operating_hours:num(pick(x,['operating_hours','operatingHours'],0)),service_type:pick(x,['service_type','serviceType'],null),cost:num(pick(x,['cost'],0)),description:pick(x,['description'],null),next_service_hours:num(pick(x,['next_service_hours','nextServiceHours'],0)),next_service_date:date(pick(x,['next_service_date','nextServiceDate'],null))} }

  const MAP=[
    ['customers','customers',customerRow],['projects','projects',projectRow],['quotes','quotes',quoteRow],['employees','employees',employeeRow],['machines','machines',machineRow],['products','products',productRow],['warehouses','warehouses',warehouseRow],['warehouse_stock','warehouseStock',stockRow],['work_logs','workLogs',workLogRow],['project_material_requirements','materialRequirements',materialRequirementRow],['project_material_usage','materialUsage',materialUsageRow],['project_costs','projectCosts',costRow],['machine_usage','machineUsage',usageRow],['machine_service','machineService',serviceRow]
  ];

  function fromCustomer(r){return {id:r.id,name:r.name||'',taxNumber:r.tax_number||'',companyNo:r.company_number||'',contact:r.contact_person||'',phone:r.phone||'',email:r.email||'',address:r.address||'',billingAddress:r.billing_address||'',notes:r.notes||'',status:r.status==='Inaktív'?'inactive':'active'} }
  function fromProject(r){return {id:r.id,projectNumber:r.project_number||'',customerId:r.customer_id||'',quoteId:r.quote_id||'',name:r.name||'',location:r.location||'',latitude:r.latitude,longitude:r.longitude,startDate:r.start_date||'',plannedEndDate:r.planned_end_date||'',actualEndDate:r.actual_end_date||'',status:r.status||'Érdeklődés',value:num(r.contract_value),contractValue:num(r.contract_value),planned:num(r.planned_cost),plannedCost:num(r.planned_cost),cost:num(r.actual_cost),actualCost:num(r.actual_cost),notes:r.notes||'',extraData:r.extra_data||{}} }
  function fromQuote(r,items){return {id:r.id,quoteNumber:r.quote_number||r.id,customerId:r.customer_id||'',projectId:r.project_id||'',projectName:r.project_name||'',name:r.project_name||'',location:r.location||'',date:r.quote_date||'',validUntil:r.valid_until||'',status:r.status||'Piszkozat',subject:r.subject||'',notes:r.notes||'',technicalContent:r.technical_content||'',includes:r.price_includes||'',excludes:r.price_excludes||'',declarations:r.declarations||'',signer:r.signer||'',position:r.position||'',net:num(r.net_total),vat:num(r.vat_total),gross:num(r.gross_total),netTotal:num(r.net_total),vatTotal:num(r.vat_total),grossTotal:num(r.gross_total),items:(items||[]).map((x,i)=>({id:x.id,quoteId:x.quote_id,desc:x.description||'',category:x.category||'',qty:num(x.quantity),unit:x.unit||'',price:num(x.unit_price),vatRate:num(x.vat_rate),net:num(x.net_total),vat:num(x.vat_total),gross:num(x.gross_total),sortOrder:i}))} }
  function fromMachine(r){return Object.assign({},r,{machineNumber:r.machine_number||'',manufacturer:r.manufacturer||r.make||'',model:r.model||'',serialNumber:r.serial_number||'',currentHours:num(r.current_hours),purchaseDate:r.purchase_date||'',purchasePrice:num(r.purchase_price),purchaseValue:num(r.purchase_value),assetType:r.asset_type||'',assetCode:r.asset_code||'',make:r.make||r.manufacturer||'',plate:r.plate||'',vin:r.vin||'',engineNo:r.engine_no||'',currentValue:num(r.current_value),hours:num(r.hours),odometer:num(r.odometer),serviceKm:num(r.service_km),serviceHours:num(r.service_hours),serviceDate:r.service_date||'',fuel:r.fuel||'',engineCc:num(r.engine_cc),powerHp:num(r.power_hp),powerKw:num(r.power_kw),transmission:r.transmission||'',drive:r.drive||'',body:r.body||'',color:r.color||'',tireSize:r.tire_size||'',weight:num(r.weight),gvw:num(r.gvw),motExpiry:r.mot_expiry||'',insuranceExpiry:r.insurance_expiry||'',cascoExpiry:r.casco_expiry||'',tollExpiry:r.toll_expiry||'',registrationDoc:r.registration_doc||'',insurer:r.insurer||'',policyNo:r.policy_no||'',lastServiceDate:r.last_service_date||'',lastServiceMeter:r.last_service_meter||'',serviceProvider:r.service_provider||'',lastServiceCost:num(r.last_service_cost),serviceNote:r.service_note||'',fuelCostMonth:num(r.fuel_cost_month),serviceCostYear:num(r.service_cost_year),insuranceCostYear:num(r.insurance_cost_year),otherCostYear:num(r.other_cost_year),responsible:r.responsible||''}) }
  function fromWorkLog(r,layers){return {id:r.id,projectId:r.project_id||'',customerId:r.customer_id||'',date:r.work_date||'',location:r.location||'',wellNo:r.well_number||'',finalDepth:num(r.final_depth),depth:num(r.final_depth),status:r.status||'',startTime:r.start_time||'',endTime:r.end_time||'',workType:r.work_type||'',description:r.description||'',weather:r.weather||'',notes:r.notes||'',filters:r.filter_data||[],wellProfile:r.well_profile||{},waterData:r.water_data||{},extraData:r.extra_data||{},layers:(layers||[]).map(x=>[String(x.depth_from),String(x.depth_to),x.material||'',x.drilling_behavior||'',x.water_state||'',x.notes||''])} }
  function fromGeneric(r){return Object.assign({},r)}

  async function loadAll(){
    if(!global.db) return false;
    const loaded={};
    for(const [table,key] of MAP){
      try{const rows=await getRows(table,'select=*');if(!rows.length)continue;loaded[key]=rows}catch(e){console.warn('[ERP] Relációs betöltés '+table+':',e)}
    }
    if(loaded.customers)global.db.customers=loaded.customers.map(fromCustomer);
    if(loaded.projects)global.db.projects=loaded.projects.map(fromProject);
    if(loaded.machines)global.db.machines=loaded.machines.map(fromMachine);
    if(loaded.employees)global.db.employees=loaded.employees.map(fromGeneric);
    if(loaded.products)global.db.products=loaded.products.map(fromGeneric);
    if(loaded.warehouses)global.db.warehouses=loaded.warehouses.map(fromGeneric);
    if(loaded.warehouseStock)global.db.warehouse_stock=loaded.warehouseStock.map(fromGeneric);
    if(loaded.materialRequirements)global.db.project_material_requirements=loaded.materialRequirements.map(fromGeneric);
    if(loaded.materialUsage)global.db.project_material_usage=loaded.materialUsage.map(fromGeneric);
    if(loaded.projectCosts)global.db.project_costs=loaded.projectCosts.map(fromGeneric);
    if(loaded.machineUsage)global.db.machine_usage=loaded.machineUsage.map(fromGeneric);
    if(loaded.machineService)global.db.machine_service=loaded.machineService.map(fromGeneric);
    if(loaded.quotes){
      let items=[];try{items=await getRows('quote_items','select=*')}catch(e){console.warn('[ERP] quote_items betöltés:',e)}
      global.db.quotes=loaded.quotes.map(q=>fromQuote(q,items.filter(x=>String(x.quote_id)===String(q.id))));
    }
    if(loaded.workLogs){
      let layers=[];try{layers=await getRows('work_log_layers','select=*')}catch(e){console.warn('[ERP] work_log_layers betöltés:',e)}
      global.db.worklogs=loaded.workLogs.map(w=>fromWorkLog(w,layers.filter(x=>String(x.work_log_id)===String(w.id))));
      global.db.work_logs=global.db.worklogs;
    }
    try{localStorage.setItem('kutfoplusz_erp_v12',JSON.stringify(global.db))}catch(e){}
    return Object.keys(loaded).length>0;
  }

  async function syncAll(){
    if(!global.db||!global.KPSupabaseAuth?.request) return false;
    const ids=readIds();
    for(const [table,key,mapper] of MAP){
      let source=arr(key);
      if(key==='warehouseStock' && !source.length) source=arr('warehouse_stock');
      if(key==='workLogs' && !source.length) source=arr('worklogs');
      if(!source.length) continue;
      const rows=source.map((x,i)=>mapper(x,i)).filter(x=>x.id);
      if(key==='warehouseStock') await upsert(table,rows,'warehouse_id,product_id'); else await upsert(table,rows,'id');
      ids[table]=rows.map(x=>str(x.id));
    }
    const quotes=arr('quotes');
    const qItems=quotes.flatMap(q=>(Array.isArray(q.items)?q.items:[]).map((x,i)=>quoteItemRow(x,q.id,i)));
    if(qItems.length){await upsert('quote_items',qItems,'id');ids.quote_items=qItems.map(x=>x.id)}
    const layers=arr('worklogs').flatMap(w=>(Array.isArray(w.layers)?w.layers:[]).map((x,i)=>{const a=Array.isArray(x)?{from:x[0],to:x[1],material:x[2],behavior:x[3],water:x[4],notes:x[5],id:x[6]}:x;return layerRow(a,w.id,i)}));
    if(layers.length){await upsert('work_log_layers',layers,'id');ids.work_log_layers=layers.map(x=>x.id)}
    writeIds(ids);
    return true;
  }

  async function initialise(){
    for(let i=0;i<120;i++){
      if(global.db && global.KPSupabaseAuth?.request) break;
      await sleep(100);
    }
    if(!global.db||!global.KPSupabaseAuth?.request)return;
    try{
      const ok=await loadAll();
      if(ok && typeof global.render==='function')global.render();
      global.setCloudStatus?.('☁️ Relációs adatbázis');
    }catch(e){console.warn('[ERP] Relációs adatbetöltés:',e)}
  }

  let saveTimer=null;
  global.KP_RELATIONAL={loadAll,syncAll,request,tableNames:TABLES};
  global.save= function(){
    try{localStorage.setItem('kutfoplusz_erp_v12',JSON.stringify(global.db||{}))}catch(e){}
    clearTimeout(saveTimer);
    saveTimer=setTimeout(async()=>{
      try{await syncAll();global.setCloudStatus?.('☁️ Mentve')}catch(e){console.error('[ERP] Relációs mentés:',e);global.setCloudStatus?.('⚠️ Mentés hiba');if(typeof global.toast==='function')global.toast('A felhőmentés nem sikerült: '+e.message)}
    },180);
    return true;
  };

  initialise();
})(window);
