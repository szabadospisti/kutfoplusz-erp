/* Kútfő Plusz ERP – Munkanapló relációs CRUD bridge v1.
 * A meglévő wlCollect/wlSave UI-t megtartja, de a tartós mentés közvetlenül
 * work_logs + work_log_layers táblákba történik. */
(function(){
  'use strict';
  if(window.__KP_WORKLOG_RELATIONAL_BRIDGE__) return;

  function api(){
    if(!window.KPSupabaseAuth?.request) throw new Error('A Supabase API réteg nem érhető el.');
    return window.KPSupabaseAuth.request.bind(window.KPSupabaseAuth);
  }
  function jsonHeaders(){return {'Content-Type':'application/json','Prefer':'return=representation'};}
  function num(v){const n=Number(v);return Number.isFinite(n)?n:0;}

  function workLogPayload(o){
    return {
      id:String(o.id),
      customer_id:o.customerId||null,
      project_id:o.projectId||null,
      work_date:o.date||null,
      location:o.location||null,
      well_number:o.wellNo||null,
      final_depth:num(o.finalDepth),
      status:o.status||'Piszkozat',
      production_pipe:o.prodPipe||null,
      static_water_level:o.staticWL===''?null:num(o.staticWL),
      dynamic_water_level:o.dynamicWL===''?null:num(o.dynamicWL),
      measured_flow:num(o.flow),
      measurement_time:num(o.measureSeconds),
      calculated_flow:num(o.flow),
      notes:o.notes||null
    };
  }

  function layerRows(o){
    return (o.layers||[]).map(function(r,i){
      return {
        id:String(r[6]||('LR-'+o.id+'-'+(i+1))),
        work_log_id:String(o.id),
        depth_from:num(r[0]),
        depth_to:num(r[1]),
        material:r[2]||null,
        drilling_behavior:r[3]||null,
        water_color:r[4]||null,
        notes:r[5]||null,
        sort_order:i
      };
    });
  }

  async function saveRelational(o){
    const request=api();
    const payload=workLogPayload(o);
    const existing=await request('work_logs?id=eq.'+encodeURIComponent(o.id)+'&select=id',{method:'GET'});
    if(!existing.ok) throw new Error('Munkanapló ellenőrzése sikertelen: '+existing.status);
    const rows=await existing.json();
    const method=Array.isArray(rows)&&rows.length?'PATCH':'POST';
    const url=method==='PATCH'?'work_logs?id=eq.'+encodeURIComponent(o.id):'work_logs';
    const saved=await request(url,{method,headers:jsonHeaders(),body:JSON.stringify(payload)});
    if(!saved.ok) throw new Error('Munkanapló mentése sikertelen: '+saved.status+' '+await saved.text());

    const old=await request('work_log_layers?work_log_id=eq.'+encodeURIComponent(o.id),{method:'GET'});
    if(!old.ok) throw new Error('Rétegek lekérése sikertelen: '+old.status);
    const oldRows=await old.json();
    if(Array.isArray(oldRows)&&oldRows.length){
      const del=await request('work_log_layers?work_log_id=eq.'+encodeURIComponent(o.id),{method:'DELETE',headers:{'Prefer':'return=minimal'}});
      if(!del.ok) throw new Error('Régi rétegek törlése sikertelen: '+del.status);
    }
    const layers=layerRows(o);
    if(layers.length){
      const ins=await request('work_log_layers',{method:'POST',headers:jsonHeaders(),body:JSON.stringify(layers)});
      if(!ins.ok) throw new Error('Rétegek mentése sikertelen: '+ins.status+' '+await ins.text());
    }
    return true;
  }

  function install(){
    if(window.__KP_WORKLOG_RELATIONAL_BRIDGE__) return true;
    if(typeof window.wlCollect!=='function' || typeof window.wlSave!=='function') return false;
    const original=window.wlSave;
    window.wlSave=async function(){
      document.querySelectorAll('#wl_layers .wl-layer-type').forEach(function(el,i){if(window.wlLayers?.[i])window.wlLayers[i][2]=el.value;});
      const o=window.wlCollect();
      try{
        await saveRelational(o);
        const i=window.db.worklogs.findIndex(x=>x.id===o.id);
        if(i>=0)window.db.worklogs[i]=o;else window.db.worklogs.push(o);
        if(typeof window.wlClearDraft==='function')window.wlClearDraft(o.id);
        if(typeof window.closeModal==='function')window.closeModal();
        if(typeof window.nav==='function')window.nav('worklogs');
        if(typeof window.toast==='function')window.toast('Munkanapló mentve');
      }catch(e){
        console.error('[ERP] Relációs munkanapló mentés:',e);
        if(typeof window.toast==='function')window.toast('Munkanapló mentési hiba: '+e.message);
      }
    };
    window.__KP_WORKLOG_RELATIONAL_BRIDGE__=true;
    console.info('[ERP] Munkanaplók: relational CRUD active');
    return true;
  }

  let n=0;
  const timer=setInterval(function(){if(install()||++n>240)clearInterval(timer)},50);
  install();
})();
