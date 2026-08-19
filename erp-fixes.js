/* Kútfő Plusz ERP – központi mentési és alap CRUD javítások.
 * V2: Supabase erp_state séma + munkanapló rétegmentés javítása.
 */
(function installErpFixes(){
  const MACHINE_KEY='kp_machine_fleet_v1';
  const MATERIAL_KEY='kp_warehouse_materials_v1';

  function uid(prefix){
    try{return (crypto.randomUUID?crypto.randomUUID():prefix+'-'+Date.now()+'-'+Math.random().toString(36).slice(2));}
    catch{return prefix+'-'+Date.now()+'-'+Math.random().toString(36).slice(2);}
  }
  function localSave(){
    try{
      if(typeof localSaveOnly==='function') localSaveOnly();
      else localStorage.setItem('kutfoplusz_erp_db',JSON.stringify(window.db||{}));
    }catch(e){console.error('Helyi mentési hiba:',e);}
  }

  window.save=async function(){
    localSave();
    try{
      const client=window._supabaseClient;
      if(!client||!window.db)return;
      const result=await client.auth.getUser();
      const user=result?.data?.user;
      if(!user){
        console.warn('Supabase mentés kihagyva: nincs bejelentkezett felhasználó.');
        return;
      }
      const payload={id:'main',data:window.db,updated_at:new Date().toISOString(),updated_by:user.id};
      const {error}=await client.from('erp_state').upsert(payload,{onConflict:'id'});
      if(error)throw error;
      const pill=document.querySelector('[data-save-status],#saveStatus,.save-status');
      if(pill){const old=pill.textContent;pill.textContent='☁️ Mentve';setTimeout(()=>pill.textContent=old,1600);}
    }catch(err){
      console.error('Supabase mentési hiba:',err);
      if(typeof toast==='function')toast('Helyben mentve – felhőmentés sikertelen');
    }
  };

  function patchLayerRows(){
    const table=document.getElementById('wl_layers');
    if(!table)return;
    [...table.querySelectorAll('tbody tr')].forEach(tr=>{
      if(tr.querySelector('input[name="layer_from[]"]'))return;
      const cells=tr.querySelectorAll('td');
      if(cells.length<4)return;
      const vals=[];
      cells[0].querySelectorAll('.wl-depth-value').forEach(x=>vals.push((x.textContent||'').replace(/\s*m\s*$/i,'').trim()));
      const from=vals[0]||'';const to=vals[1]||'';
      const a=document.createElement('input');a.type='hidden';a.name='layer_from[]';a.value=from;
      const b=document.createElement('input');b.type='hidden';b.name='layer_to[]';b.value=to;
      tr.append(a,b);
    });
  }
  function installLayerPatch(){
    const observer=new MutationObserver(()=>patchLayerRows());
    if(document.body)observer.observe(document.body,{childList:true,subtree:true});
    setTimeout(patchLayerRows,300);setTimeout(patchLayerRows,1000);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installLayerPatch,{once:true});else installLayerPatch();

  const originalAddLayer=window.addWorklogLayerRow;
  if(typeof originalAddLayer==='function'){
    window.addWorklogLayerRow=function(){originalAddLayer.apply(this,arguments);patchLayerRows();};
  }

  window.deleteCustomer=function(id){
    const c=(window.db?.customers||[]).find(x=>String(x.id)===String(id));
    if(!c)return;
    const projects=(window.db?.projects||[]).filter(x=>String(x.customerId)===String(id));
    const quotes=(window.db?.quotes||[]).filter(x=>String(x.customerId)===String(id));
    const logs=(window.db?.worklogs||[]).filter(x=>String(x.customerId)===String(id));
    const links=projects.length+quotes.length+logs.length;
    const msg=links
      ? `Az ügyfélhez ${links} kapcsolódó rekord tartozik (${projects.length} munka, ${quotes.length} ajánlat, ${logs.length} munkanapló).\n\nAz ügyfél törlődik, a kapcsolódó rekordok megmaradnak. Biztosan folytatod?`
      : 'Biztosan törlöd az ügyfelet?';
    if(!confirm(msg))return;
    window.db.customers=window.db.customers.filter(x=>String(x.id)!==String(id));
    Promise.resolve(window.save()).finally(()=>{
      if(typeof closeModal==='function')closeModal();
      if(typeof render==='function')render();
      if(typeof toast==='function')toast('Ügyfél törölve');
    });
  };

  window.newMaterial=function(){
    const btn=document.getElementById('wmAddProduct');
    if(btn){btn.click();return;}
    const nav=[...document.querySelectorAll('#nav .nav')].find(x=>/raktár|anyag/i.test(x.textContent||''));
    if(nav){nav.click();setTimeout(()=>document.getElementById('wmAddProduct')?.click(),100);return;}
    alert('A raktár modul nem érhető el.');
  };

  window.newMachine=function(){
    if(document.getElementById('kpNewMachineModal'))return;
    let state={items:[]};try{state=JSON.parse(localStorage.getItem(MACHINE_KEY)||'null')||state;}catch{}
    const m=document.createElement('div');m.id='kpNewMachineModal';m.className='modal';
    m.innerHTML=`<div class="modalbox"><div class="modalhead"><h2>Új gép</h2><button class="icon" type="button" data-close>×</button></div><div class="modalbody"><div class="formgrid">
      <div class="field"><label>Gép neve</label><input id="knmName" class="input" required></div>
      <div class="field"><label>Típus / modell</label><input id="knmModel" class="input"></div>
      <div class="field"><label>Azonosító / rendszám</label><input id="knmId" class="input"></div>
      <div class="field"><label>Évjárat</label><input id="knmYear" class="input" type="number" min="1900" max="2100"></div>
      <div class="field"><label>Üzemóra</label><input id="knmHours" class="input" type="number" min="0" step="1" value="0"></div>
      <div class="field"><label>Következő szerviz (üzemóra)</label><input id="knmService" class="input" type="number" min="0" step="1"></div>
      <div class="field"><label>Helyszín</label><input id="knmLocation" class="input"></div>
      <div class="field"><label>Állapot</label><select id="knmStatus" class="select"><option>Üzemképes</option><option>Szerviz</option><option>Üzemképtelen</option><option>Eladva</option></select></div>
      <div class="field full"><label>Megjegyzés</label><textarea id="knmNote" class="textarea"></textarea></div>
    </div><div class="modalfoot"><button class="btn secondary" type="button" data-close>Mégse</button><button class="btn" id="knmSave" type="button">💾 Gép létrehozása</button></div></div></div>`;
    document.body.appendChild(m);
    const close=()=>m.remove();m.querySelectorAll('[data-close]').forEach(b=>b.onclick=close);
    m.querySelector('#knmSave').onclick=()=>{
      const name=m.querySelector('#knmName').value.trim();if(!name){alert('A gép neve kötelező.');return;}
      const item={id:uid('machine'),name,model:m.querySelector('#knmModel').value.trim(),registration_number:m.querySelector('#knmId').value.trim(),year:m.querySelector('#knmYear').value.trim(),hours:Number(m.querySelector('#knmHours').value)||0,service:Number(m.querySelector('#knmService').value)||0,location:m.querySelector('#knmLocation').value.trim(),status:m.querySelector('#knmStatus').value,notes:m.querySelector('#knmNote').value.trim()};
      state.items=Array.isArray(state.items)?state.items:[];state.items.push(item);localStorage.setItem(MACHINE_KEY,JSON.stringify(state));
      if(window.db){window.db.machines=Array.isArray(window.db.machines)?window.db.machines:[];window.db.machines.push(item);Promise.resolve(window.save()).catch(()=>{});}
      close();const nav=[...document.querySelectorAll('#nav .nav')].find(x=>/gép/i.test(x.textContent||''));if(nav)nav.click();else if(typeof render==='function')render();if(typeof toast==='function')toast('Gép létrehozva');
    };
  };

  window.addMaterial=window.newMaterial;window.addMachine=window.newMachine;

  /*
   * A központi db marad a UI kompatibilitási réteg, de az üzleti törzsadatok
   * közvetlenül is bekerülnek a normalizált Supabase táblákba.
   * Első kör: customers + projects. A helyi id megmarad, a Supabase UUID
   * supabase_id mezőben kerül eltárolásra, így a régi UI nem törik el.
   */
  async function syncCustomerToSupabase(c){
    const client=window._supabaseClient;if(!client||!c)return null;
    const row={
      company_name:String(c.name||'').trim()||'Névtelen ügyfél',
      customer_type:c.customerType||null,
      tax_number:c.tax||null,
      address:c.address||null,
      billing_address:c.billingAddress||c.billingNotes||null,
      phone:c.phone||null,
      email:c.email||null,
      contact_person:c.contact||null,
      notes:c.notes||null
    };
    let result;
    if(c.supabase_id){
      result=await client.from('customers').update(row).eq('id',c.supabase_id).select().single();
    }else{
      result=await client.from('customers').insert(row).select().single();
    }
    if(result.error)throw result.error;
    c.supabase_id=result.data.id;
    c.supabase_synced_at=new Date().toISOString();
    return result.data;
  }

  async function syncProjectToSupabase(p){
    const client=window._supabaseClient;if(!client||!p)return null;
    const c=(window.db?.customers||[]).find(x=>String(x.id)===String(p.customerId));
    if(c&&!c.supabase_id)await syncCustomerToSupabase(c);
    const row={
      project_number:p.project_number||String(p.id||uid('KP')).replace(/[^A-Za-z0-9_-]/g,'').slice(0,40),
      customer_id:c?.supabase_id||null,
      quote_id:p.quoteSupabaseId||null,
      name:String(p.name||'').trim()||'Új munka',
      location:p.location||null,
      start_date:p.startDate||null,
      planned_end_date:p.plannedEndDate||null,
      actual_end_date:p.actualEndDate||null,
      status:p.status||'Tervezés',
      contract_value:Number(p.value??p.contractValue)||0,
      planned_cost:Number(p.planned??p.plannedCost)||0,
      actual_cost:Number(p.cost??p.actualCost)||0
    };
    let result;
    if(p.supabase_id)result=await client.from('projects').update(row).eq('id',p.supabase_id).select().single();
    else result=await client.from('projects').insert(row).select().single();
    if(result.error)throw result.error;
    p.supabase_id=result.data.id;p.project_number=result.data.project_number;p.supabase_synced_at=new Date().toISOString();
    return result.data;
  }

  function installDirectCrudSync(){
    if(typeof window.saveCustomer==='function'&&!window.__customerCrudSync){
      const original=window.saveCustomer;window.__customerCrudSync=true;
      window.saveCustomer=async function(e,id){
        original.apply(this,arguments);
        try{
          const c=(window.db?.customers||[]).find(x=>String(x.id)===String(id)||!id&&x===window.db.customers[window.db.customers.length-1]);
          if(c)await syncCustomerToSupabase(c);
          await window.save();
          if(typeof toast==='function')toast('Ügyfél mentve a Supabase-be');
        }catch(err){console.error('Customer Supabase sync:',err);if(typeof toast==='function')toast('Ügyfél helyben mentve – Supabase hiba');}
      };
    }
    if(typeof window.saveProject==='function'&&!window.__projectCrudSync){
      const original=window.saveProject;window.__projectCrudSync=true;
      window.saveProject=async function(e){
        original.apply(this,arguments);
        try{
          const p=window.db?.projects?.[window.db.projects.length-1];
          if(p)await syncProjectToSupabase(p);
          await window.save();
          if(typeof toast==='function')toast('Munka mentve a Supabase-be');
        }catch(err){console.error('Project Supabase sync:',err);if(typeof toast==='function')toast('Munka helyben mentve – Supabase hiba');}
      };
    }
  }
  let syncTries=0;const syncTimer=setInterval(()=>{installDirectCrudSync();if(window.__customerCrudSync&&window.__projectCrudSync||++syncTries>100)clearInterval(syncTimer);},100);
})();
