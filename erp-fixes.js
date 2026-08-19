/* Kútfő Plusz ERP – központi mentési és alap CRUD javítások.
 * Egyetlen helyen kezeli a mentést és a hiányzó globális műveleteket.
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
      if(!user)return;
      const {error}=await client.from('erp_state').upsert(
        {user_id:user.id,state:window.db,updated_at:new Date().toISOString()},
        {onConflict:'user_id'}
      );
      if(error)throw error;
      const pill=document.querySelector('[data-save-status],#saveStatus,.save-status');
      if(pill){const old=pill.textContent;pill.textContent='☁️ Mentve';setTimeout(()=>pill.textContent=old,1600);}
    }catch(err){
      console.error('Supabase mentési hiba:',err);
      if(typeof toast==='function')toast('Helyben mentve – felhőmentés sikertelen');
    }
  };

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

  /* A meglévő raktári „+ Anyagcikk” modalját használjuk, így nem készül második anyagmodell. */
  window.newMaterial=function(){
    const btn=document.getElementById('wmAddProduct');
    if(btn){btn.click();return;}
    const nav=[...document.querySelectorAll('#nav .nav')].find(x=>/raktár|anyag/i.test(x.textContent||''));
    if(nav){nav.click();setTimeout(()=>document.getElementById('wmAddProduct')?.click(),100);return;}
    alert('A raktár modul nem érhető el.');
  };

  /* Új gép – ugyanazt a gép-adatmodellt használja, amelyet a géppark modul kezel. */
  window.newMachine=function(){
    if(document.getElementById('kpNewMachineModal'))return;
    let state={items:[]};
    try{state=JSON.parse(localStorage.getItem(MACHINE_KEY)||'null')||state;}catch{}
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
      const name=m.querySelector('#knmName').value.trim();
      if(!name){alert('A gép neve kötelező.');return;}
      const item={id:uid('machine'),name,model:m.querySelector('#knmModel').value.trim(),registration_number:m.querySelector('#knmId').value.trim(),year:m.querySelector('#knmYear').value.trim(),hours:Number(m.querySelector('#knmHours').value)||0,service:Number(m.querySelector('#knmService').value)||0,location:m.querySelector('#knmLocation').value.trim(),status:m.querySelector('#knmStatus').value,notes:m.querySelector('#knmNote').value.trim()};
      state.items=Array.isArray(state.items)?state.items:[];state.items.push(item);
      localStorage.setItem(MACHINE_KEY,JSON.stringify(state));
      if(window.db){window.db.machines=Array.isArray(window.db.machines)?window.db.machines:[];window.db.machines.push(item);Promise.resolve(window.save()).catch(()=>{});}
      close();
      const nav=[...document.querySelectorAll('#nav .nav')].find(x=>/gép/i.test(x.textContent||''));
      if(nav)nav.click();else if(typeof render==='function')render();
      if(typeof toast==='function')toast('Gép létrehozva');
    };
  };

  /* Aliasok, ha a régi UI eltérő neveket használ. */
  window.addMaterial=window.newMaterial;
  window.addMachine=window.newMachine;
})();
