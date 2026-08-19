/* Kútfő Plusz ERP - Supabase sync for projects + work logs + layers + filters. */
(function(){
  'use strict';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));const api=()=>window.KPProjectSupabase;const cfg=()=>window.SUPABASE_CONFIG;
  async function request(path,options){const c=cfg();if(!c||!c.url||!c.publishableKey)throw new Error('Supabase konfiguráció nincs betöltve.');const headers=Object.assign({apikey:c.publishableKey,Authorization:'Bearer '+c.publishableKey,Accept:'application/json'},(options&&options.headers)||{});const res=await fetch(c.url+'/rest/v1/'+path,Object.assign({},options,{headers}));const text=await res.text();let body=null;try{body=text?JSON.parse(text):null}catch(e){body=text}if(!res.ok){const msg=body&&(body.message||body.error||body.details||body.hint)?[body.message,body.details,body.hint].filter(Boolean).join(' | '):String(body||res.statusText);throw new Error('Supabase '+res.status+': '+msg)}return body;}
  function num(v){return Number.isFinite(+v)?+v:0}function projectByRemoteId(id){return(window.db&&Array.isArray(db.projects))?db.projects.find(p=>String(p.supabaseId)===String(id)):null}function projectByLocalId(id){return(window.db&&Array.isArray(db.projects))?db.projects.find(p=>String(p.id)===String(id)):null}
  async function loadProjects(){const rows=await api().list();const mapped=(rows||[]).map(r=>({id:r.project_number||r.id,supabaseId:r.id,customerId:r.customer_id||'',customerName:'',name:r.name||'',location:r.location||'',status:r.status||'Tervezés',value:num(r.contract_value),planned:num(r.planned_cost),cost:num(r.actual_cost),progress:num(r.progress_pct),notes:r.notes||'',quoteId:r.quote_id||''}));if(window.db)db.projects=mapped;mapped.forEach(p=>{if(!p.customerId)return;const c=(db.customers||[]).find(x=>String(x.supabaseId)===String(p.customerId)||String(x.id)===String(p.customerId));if(c){p.customerId=c.id;p.customerName=c.name;}});}
  function localWorklogId(row){return row.legacy_id||('MN-'+String(row.id).replace(/-/g,'').slice(0,10));}
  async function loadWorklogs(){if(!window.db)return;const rows=await request('work_logs?select=*&order=work_date.desc,created_at.desc');const layers=await request('well_layers?select=*&order=sort_order.asc,created_at.asc');const filters=await request('work_log_filters?select=*&order=sort_order.asc,created_at.asc');const byLayer={},byFilter={};(layers||[]).forEach(x=>(byLayer[x.work_log_id]||(byLayer[x.work_log_id]=[])).push(x));(filters||[]).forEach(x=>(byFilter[x.work_log_id]||(byFilter[x.work_log_id]=[])).push(x));db.worklogs=(rows||[]).map(r=>{const d=r.document_data||{};const p=projectByRemoteId(r.project_id);return{id:localWorklogId(r),supabaseId:r.id,date:r.work_date||'',customerId:p?p.customerId:'',projectId:p?p.id:'',location:d.location||r.description||'',wellNo:d.wellNo||'',finalDepth:num(r.depth_end),depth:num(r.depth_end),status:r.work_type||'Folyamatban',layers:(byLayer[r.id]||[]).map(x=>[String(x.depth_from??''),String(x.depth_to??''),x.material||'',x.note||'','','']),filters:(byFilter[r.id]||[]).map(x=>[String(x.depth_from??''),String(x.depth_to??''),x.filter_type||'Vak',String(x.length??''),x.note||'']),prodPipe:d.prodPipe||'',staticWL:d.staticWL??r.water_level??'',dynamicWL:d.dynamicWL??'',measureLiters:num(d.measureLiters),measureSeconds:num(d.measureSeconds),flow:num(d.flow),dynamic2:d.dynamic2||'',static2:d.static2||'',notes:r.notes||d.notes||'',_remoteProjectId:r.project_id||''};});}
  async function saveWorklogRemote(o){const p=projectByLocalId(o.projectId);const projectUuid=p?p.supabaseId:null;if(o.projectId&&!projectUuid)throw new Error('A munkanapló projektje nincs betöltve a Supabase-ből.');const document_data={location:o.location||'',wellNo:o.wellNo||'',prodPipe:o.prodPipe||'',staticWL:o.staticWL??'',dynamicWL:o.dynamicWL??'',measureLiters:num(o.measureLiters),measureSeconds:num(o.measureSeconds),flow:num(o.flow),dynamic2:o.dynamic2||'',static2:o.static2||'',notes:o.notes||''};const payload={project_id:projectUuid,work_date:o.date||null,description:o.location||null,work_type:o.status||null,depth_end:num(o.finalDepth),water_level:o.staticWL===''?null:num(o.staticWL),notes:o.notes||null,document_data,legacy_id:o.id};let row=null;if(o.supabaseId){const rows=await request('work_logs?id=eq.'+encodeURIComponent(o.supabaseId),{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(payload)});row=rows&&rows[0];}else{const rows=await request('work_logs',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=representation'},body:JSON.stringify(payload)});row=rows&&rows[0];}if(!row)throw new Error('A munkanapló mentése nem adott vissza rekordot.');await request('well_layers?work_log_id=eq.'+encodeURIComponent(row.id),{method:'DELETE'});await request('work_log_filters?work_log_id=eq.'+encodeURIComponent(row.id),{method:'DELETE'});const layerRows=(o.layers||[]).map((x,i)=>({work_log_id:row.id,depth_from:num(x[0]),depth_to:num(x[1]),material:x[2]||'',note:x[3]||null,sort_order:i}));const filterRows=(o.filters||[]).map((x,i)=>({work_log_id:row.id,filter_no:i+1,depth_from:x[0]===''?null:num(x[0]),depth_to:x[1]===''?null:num(x[1]),filter_type:x[2]||null,length:x[3]===''?null:num(x[3]),note:x[4]||null,sort_order:i}));if(layerRows.length)await request('well_layers',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(layerRows)});if(filterRows.length)await request('work_log_filters',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(filterRows)});return row;}
  async function install(){for(let i=0;i<100&&(!window.KPProjectSupabase||!window.db);i++)await sleep(100);if(!window.KPProjectSupabase||!window.db)return;try{await loadProjects();await loadWorklogs();if(typeof save==='function')save();}catch(e){console.error('ERP Supabase betöltés:',e);}if(typeof window.wlSave==='function'&&!window.__KP_WL_SUPABASE_HOOKED__){window.wlSave=async function(){try{document.querySelectorAll('#wl_layers .wl-layer-type').forEach((el,i)=>{if(window.wlLayers&&wlLayers[i])wlLayers[i][2]=el.value});const o=window.wlCollect();const remote=await saveWorklogRemote(o);o.supabaseId=remote.id;const idx=db.worklogs.findIndex(x=>String(x.id)===String(o.id));if(idx>=0)db.worklogs[idx]=o;else db.worklogs.push(o);if(typeof wlClearDraft==='function')wlClearDraft(o.id);if(typeof closeModal==='function')closeModal();if(typeof nav==='function')nav('worklogs');if(typeof toast==='function')toast('Munkanapló, rétegsor és szűrők Supabase-ben mentve');}catch(e){console.error(e);if(typeof toast==='function')toast('Hiba: '+(e.message||e));}};window.__KP_WL_SUPABASE_HOOKED__=true;}}
  window.KPSupabaseSync={loadProjects,loadWorklogs,saveWorklogRemote};install();

  // Projekt -> Munkanapló közvetlen előválasztás.
  (async function bindProjectWorklog(){
    for(let i=0;i<120;i++){
      if(typeof window.detailedWorklogEditor==='function' && typeof window.newWorklogFor==='function') break;
      await sleep(100);
    }
    if(typeof window.detailedWorklogEditor!=='function') return;
    function applyProject(pid){
      const projectId=String(pid||'');
      if(!projectId)return;
      const p=(window.db&&Array.isArray(db.projects))?db.projects.find(x=>String(x.id)===projectId):null;
      const projectSelect=document.getElementById('wl_project');
      const customerSelect=document.getElementById('wl_client');
      const locationInput=document.getElementById('wl_location');
      if(projectSelect){projectSelect.value=projectId;projectSelect.dispatchEvent(new Event('change',{bubbles:true}));}
      if(p&&customerSelect&&p.customerId){customerSelect.value=String(p.customerId);customerSelect.dispatchEvent(new Event('change',{bubbles:true}));}
      if(p&&locationInput&&!locationInput.value)locationInput.value=p.location||'';
    }
    window.newWorklogFor=function(projectId){
      const pid=String(projectId||'');
      window.__kpPendingWorklogProjectId=pid;
      window.detailedWorklogEditor(null,pid);
      setTimeout(()=>applyProject(pid),50);
      setTimeout(()=>applyProject(pid),300);
      setTimeout(()=>applyProject(pid),800);
    };
    // A későbbi script is felülírhatja a globális newWorklogFor függvényt.
    // Ezért a Projekt -> Munkanapló gomb kattintását is figyeljük capture fázisban.
    document.addEventListener('click',function(e){
      const btn=e.target&&e.target.closest?e.target.closest('button'):null;
      if(!btn)return;
      const code=btn.getAttribute('onclick')||'';
      const m=code.match(/newWorklogFor\(['"]([^'"]+)['"]\)/);
      if(!m)return;
      const pid=m[1];
      setTimeout(()=>applyProject(pid),80);
      setTimeout(()=>applyProject(pid),400);
      setTimeout(()=>applyProject(pid),1000);
    },true);
  })();
})();
