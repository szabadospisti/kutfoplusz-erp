/* Kútfő Plusz ERP – Géppark: teljes Új eszköz adatlap */
(function(){
  'use strict';
  const types={auto:'Autó / jármű',furo:'Fúrógép',kompresszor:'Kompresszor',teherauto:'Teherautó',utanfuto:'Utánfutó',egyeb:'Egyéb'};
  const statuses=['Üzemképes','Szervizre vár','Meghibásodott','Üzemen kívül'];
  const fuels=[['','—'],['diesel','Dízel'],['petrol','Benzin'],['electric','Elektromos'],['hybrid','Hibrid'],['other','Egyéb']];
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const field=(label,id,type='text',cls='')=>`<div class="field ${cls}"><label>${label}</label><input class="input" id="${id}" type="${type}"></div>`;
  const select=(label,id,opts,cls='')=>`<div class="field ${cls}"><label>${label}</label><select class="select" id="${id}">${opts.map(([v,t])=>`<option value="${esc(v)}">${esc(t)}</option>`).join('')}</select></div>`;
  function body(){return `
    <div class="fleet-tabs" style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:14px">
      <button type="button" class="btn secondary fleet-tab active" data-tab="base">Általános</button>
      <button type="button" class="btn secondary fleet-tab" data-tab="tech">Műszaki</button>
      <button type="button" class="btn secondary fleet-tab" data-tab="docs">Okmányok</button>
      <button type="button" class="btn secondary fleet-tab" data-tab="service">Szerviz</button>
      <button type="button" class="btn secondary fleet-tab" data-tab="cost">Költségek</button>
      <button type="button" class="btn secondary fleet-tab" data-tab="notes">Megjegyzés</button>
    </div>
    <div class="fleet-pane" data-pane="base"><div class="formgrid">
      ${field('Eszköz neve','nm_name')}${select('Eszköztípus','nm_type',Object.entries(types))}
      ${field('Belső azonosító','nm_code')}${field('Gyártó','nm_make')}
      ${field('Típus / modell','nm_model')}${field('Évjárat','nm_year','number')}
      ${field('Rendszám','nm_plate')}${field('Alvázszám (VIN)','nm_vin')}
      ${field('Motorszám','nm_engine_no')}${field('Beszerzés dátuma','nm_purchase_date','date')}
      ${field('Beszerzési érték (Ft)','nm_purchase_value','number')}${field('Jelenlegi érték (Ft)','nm_current_value','number')}
      ${select('Állapot','nm_status',statuses.map(x=>[x,x]))}
    </div></div>
    <div class="fleet-pane" data-pane="tech" style="display:none"><div class="formgrid">
      ${field('Kilométeróra','nm_odometer','number')}${field('Üzemóra','nm_hours','number')}
      ${field('Következő szerviz km','nm_service_km','number')}${field('Következő szerviz üzemóra','nm_service_hours','number')}
      ${field('Következő szerviz dátuma','nm_service_date','date')}${select('Üzemanyag','nm_fuel',fuels)}
      ${field('Hengerűrtartalom (cm³)','nm_engine_cc','number')}${field('Teljesítmény (LE)','nm_power_hp','number')}
      ${field('Teljesítmény (kW)','nm_power_kw','number')}${field('Sebességváltó','nm_transmission')}
      ${field('Meghajtás','nm_drive')}${field('Karosszéria / kivitel','nm_body')}
      ${field('Szín','nm_color')}${field('Gumiabroncs méret','nm_tire_size')}
      ${field('Saját tömeg (kg)','nm_weight','number')}${field('Megengedett össztömeg (kg)','nm_gvw','number')}
    </div></div>
    <div class="fleet-pane" data-pane="docs" style="display:none"><div class="formgrid">
      ${field('Műszaki vizsga lejárata','nm_mot_expiry','date')}${field('Kötelező biztosítás lejárata','nm_insurance_expiry','date')}
      ${field('Casco lejárata','nm_casco_expiry','date')}${field('Útdíj / matrica lejárata','nm_toll_expiry','date')}
      ${field('Forgalmi dokumentum / megjegyzés','nm_registration_doc')}${field('Biztosító','nm_insurer')}
      ${field('Biztosítás kötvényszáma','nm_policy_no')}
    </div></div>
    <div class="fleet-pane" data-pane="service" style="display:none"><div class="formgrid">
      ${field('Utolsó szerviz dátuma','nm_last_service_date','date')}${field('Utolsó szerviz km / üzemóra','nm_last_service_meter')}
      ${field('Szervizhely / szerelő','nm_service_provider')}${field('Utolsó szerviz költsége (Ft)','nm_last_service_cost','number')}
      ${field('Következő szerviz megjegyzés','nm_service_note','text','full')}
    </div></div>
    <div class="fleet-pane" data-pane="cost" style="display:none"><div class="formgrid">
      ${field('Havi átlagos üzemanyagköltség (Ft)','nm_fuel_cost_month','number')}${field('Éves szervizköltség (Ft)','nm_service_cost_year','number')}
      ${field('Éves biztosítási költség (Ft)','nm_insurance_cost_year','number')}${field('Egyéb éves költség (Ft)','nm_other_cost_year','number')}
    </div></div>
    <div class="fleet-pane" data-pane="notes" style="display:none"><div class="formgrid">
      ${field('Felelős / használó','nm_responsible')}<div class="field full"><label>Megjegyzés</label><textarea class="textarea" id="nm_notes"></textarea></div>
    </div></div>`;}
  function read(x){
    const m={id:'M-'+Date.now(),name:'',asset_type:'egyeb',asset_code:'',make:'',model:'',year:0,plate:'',vin:'',engine_no:'',purchase_date:'',purchase_value:0,current_value:0,status:'Üzemképes',odometer:0,hours:0,service_km:0,service_hours:0,service_date:'',fuel:'',engine_cc:0,power_hp:0,power_kw:0,transmission:'',drive:'',body:'',color:'',tire_size:'',weight:0,gvw:0,mot_expiry:'',insurance_expiry:'',casco_expiry:'',toll_expiry:'',registration_doc:'',insurer:'',policy_no:'',last_service_date:'',last_service_meter:'',service_provider:'',last_service_cost:0,service_note:'',fuel_cost_month:0,service_cost_year:0,insurance_cost_year:0,other_cost_year:0,responsible:'',notes:''};
    const text=['name','asset_code','make','model','plate','vin','engine_no','purchase_date','service_date','fuel','transmission','drive','body','color','tire_size','mot_expiry','insurance_expiry','casco_expiry','toll_expiry','registration_doc','insurer','policy_no','last_service_date','last_service_meter','service_provider','service_note','responsible','notes'];
    text.forEach(k=>{const e=x.querySelector('#nm_'+k);if(e)m[k]=e.value.trim()});
    const nums=['year','purchase_value','current_value','odometer','hours','service_km','service_hours','engine_cc','power_hp','power_kw','weight','gvw','last_service_cost','fuel_cost_month','service_cost_year','insurance_cost_year','other_cost_year'];
    nums.forEach(k=>{const e=x.querySelector('#nm_'+k);if(e)m[k]=Number(e?.value)||0});
    m.asset_type=x.querySelector('#nm_type')?.value||'egyeb';m.status=x.querySelector('#nm_status')?.value||'Üzemképes';return m;
  }
  function open(){
    if(document.getElementById('newMachineFull'))return;
    const m=document.createElement('div');m.id='newMachineFull';m.className='modal';m.innerHTML=`<div class="modalbox"><div class="modalhead"><h2>Új eszköz</h2><button class="icon" data-x>×</button></div><div class="modalbody">${body()}<div class="modalfoot"><button class="btn secondary" data-c>Mégse</button><button class="btn" data-save>+ Létrehozás</button></div></div></div>`;document.body.appendChild(m);
    m.querySelector('[data-x]').onclick=m.querySelector('[data-c]').onclick=()=>m.remove();
    m.querySelectorAll('.fleet-tab').forEach(b=>b.onclick=()=>{m.querySelectorAll('.fleet-tab').forEach(q=>q.classList.remove('active'));m.querySelectorAll('.fleet-pane').forEach(q=>q.style.display='none');b.classList.add('active');m.querySelector(`[data-pane="${b.dataset.tab}"]`).style.display='block'});
    m.querySelector('[data-save]').onclick=async()=>{const item=read(m);if(!item.name){alert('Az eszköz neve kötelező.');return}window.db.machines=Array.isArray(window.db.machines)?window.db.machines:[];window.db.machines.push(item);try{const ok=await window.save();if(ok===false)throw new Error('A Supabase mentés nem sikerült.');m.remove();window.render();if(typeof window.toast==='function')window.toast('Eszköz létrehozva és mentve');}catch(e){window.db.machines=window.db.machines.filter(q=>q.id!==item.id);alert('Az eszköz létrehozása nem sikerült.\n\n'+(e.message||e));}};
  }
  function install(){
    document.addEventListener('click',e=>{const b=e.target.closest?.('#machineNew');if(!b)return;e.preventDefault();e.stopImmediatePropagation();open();},true);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
