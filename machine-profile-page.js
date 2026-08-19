/* Kútfő Plusz ERP – Géppark adatlap: oldalon, nem popupban */
(function(){
'use strict';
function install(){
 if(typeof window.db==='undefined'||typeof window.render!=='function')return false;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const arr=()=>Array.isArray(window.db.machines)?window.db.machines:[];
 const labels={auto:'Autó / jármű',furo:'Fúrógép',kompresszor:'Kompresszor',teherauto:'Teherautó',utanfuto:'Utánfutó',egyeb:'Egyéb'};
 const val=(m,k)=>m?.[k]??'';
 const row=(label,value)=>`<div class="kpi"><span>${esc(label)}</span><b>${esc(value||'—')}</b></div>`;
 function show(id){
  const m=arr().find(x=>String(x.id)===String(id));if(!m)return;
  window.__machineProfileId=id;
  const root=document.querySelector('.content');if(!root)return;
  const type=labels[m.asset_type]||m.asset_type||'Egyéb';
  root.innerHTML=`<div class="panel"><div class="panelhead"><div><button class="btn secondary" id="machineBack">← Vissza a gépparkhoz</button><h2 style="margin-top:14px">${esc(m.name||'Eszköz adatlap')}</h2><div class="label">${esc(type)} · ${esc(m.plate||m.asset_code||'Nincs azonosító')}</div></div><button class="btn" id="machineProfileEdit">✏️ Szerkesztés</button></div>
  <div class="fleet-profile-page"><div class="fleet-section"><h3>Általános</h3><div class="fleet-profile-grid">${row('Eszköz neve',m.name)}${row('Eszköztípus',type)}${row('Belső azonosító',m.asset_code)}${row('Gyártó',m.make)}${row('Típus / modell',m.model)}${row('Évjárat',m.year)}${row('Rendszám',m.plate)}${row('Alvázszám (VIN)',m.vin)}${row('Motorszám',m.engine_no)}${row('Beszerzés dátuma',m.purchase_date)}${row('Beszerzési érték',m.purchase_value)}${row('Jelenlegi érték',m.current_value)}${row('Állapot',m.status)}</div></div>
  <div class="fleet-section"><h3>Műszaki adatok</h3><div class="fleet-profile-grid">${row('Üzemóra',m.hours?m.hours+' h':'—')}${row('Kilométeróra',m.odometer?m.odometer+' km':'—')}${row('Következő szerviz km',m.service_km?m.service_km+' km':'—')}${row('Következő szerviz üzemóra',m.service_hours?m.service_hours+' h':'—')}${row('Következő szerviz dátuma',m.service_date)}${row('Üzemanyag',m.fuel)}${row('Hengerűrtartalom',m.engine_cc?m.engine_cc+' cm³':'—')}${row('Teljesítmény',m.power_hp?m.power_hp+' LE':'—')}${row('Teljesítmény kW',m.power_kw?m.power_kw+' kW':'—')}${row('Sebességváltó',m.transmission)}${row('Meghajtás',m.drive)}${row('Karosszéria / kivitel',m.body)}${row('Szín',m.color)}${row('Gumiabroncs',m.tire_size)}${row('Saját tömeg',m.weight?m.weight+' kg':'—')}${row('Megengedett össztömeg',m.gvw?m.gvw+' kg':'—')}</div></div>
  <div class="fleet-section"><h3>Okmányok</h3><div class="fleet-profile-grid">${row('Műszaki vizsga lejárata',m.mot_expiry)}${row('Kötelező biztosítás lejárata',m.insurance_expiry)}${row('Casco lejárata',m.casco_expiry)}${row('Útdíj / matrica lejárata',m.toll_expiry)}${row('Forgalmi dokumentum',m.registration_doc)}${row('Biztosító',m.insurer)}${row('Biztosítás kötvényszáma',m.policy_no)}</div></div>
  <div class="fleet-section"><h3>Szerviz és költségek</h3><div class="fleet-profile-grid">${row('Utolsó szerviz',m.last_service_date)}${row('Utolsó szerviz km / üzemóra',m.last_service_meter)}${row('Szervizhely / szerelő',m.service_provider)}${row('Utolsó szerviz költsége',m.last_service_cost)}${row('Következő szerviz megjegyzés',m.service_note)}${row('Havi üzemanyagköltség',m.fuel_cost_month)}${row('Éves szervizköltség',m.service_cost_year)}${row('Éves biztosítási költség',m.insurance_cost_year)}${row('Egyéb éves költség',m.other_cost_year)}</div></div>
  <div class="fleet-section"><h3>Megjegyzés</h3>${row('Felelős / használó',m.responsible)}${m.notes?`<div class="kpi"><span>Megjegyzés</span><b>${esc(m.notes)}</b></div>`:''}</div></div></div>`;
  document.getElementById('machineBack').onclick=()=>{if(typeof window.setView==='function')window.setView('machines');else{window.current='machines';window.render()}};
  document.getElementById('machineProfileEdit').onclick=()=>{if(typeof window.editMachine==='function')window.editMachine(id)};
 }
 window.machineProfilePage=show;
 const old=window.machineProfile;
 window.machineProfile=function(id){show(id)};
 return true;
}
let n=0;const boot=()=>{if(install()||n++>30)return;setTimeout(boot,250)};boot();
})();
