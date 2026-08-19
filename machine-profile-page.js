/* Kútfő Plusz ERP – Géppark: teljes oldalas, nem felugró adatlap */
(function(){
'use strict';
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const labels={auto:'Autó / jármű',furo:'Fúrógép',kompresszor:'Kompresszor',teherauto:'Teherautó',utanfuto:'Utánfutó',egyeb:'Egyéb'};
const fuel={diesel:'Dízel',petrol:'Benzin',electric:'Elektromos',hybrid:'Hibrid',other:'Egyéb'};
const v=(m,k)=>m?.[k]===undefined||m?.[k]===null||m?.[k]===''?'—':m[k];
const num=(x,u)=>x===undefined||x===null||x===''?'—':Number(x||0).toLocaleString('hu-HU')+(u?' '+u:'');
const money=x=>x===undefined||x===null||x===''?'—':Number(x||0).toLocaleString('hu-HU')+' Ft';
const item=(a,b,full=false)=>`<div class="mp-item${full?' mp-full':''}"><div class="mp-label">${esc(a)}</div><div class="mp-value">${esc(b)}</div></div>`;
const section=(title,items)=>`<section class="mp-section"><h3>${title}</h3><div class="mp-grid">${items.join('')}</div></section>`;
function install(){
 function show(id){
  const db=window.db;if(!db||!Array.isArray(db.machines))return;
  const m=db.machines.find(x=>String(x.id)===String(id));if(!m)return;
  const root=document.querySelector('.content');if(!root)return;
  const tabs=[['base','Általános'],['tech','Műszaki'],['docs','Okmányok'],['service','Szerviz'],['cost','Költségek'],['notes','Megjegyzés']];
  const pane=t=>({
   base:section('Alapadatok',[item('Eszköz neve',v(m,'name')),item('Eszköztípus',labels[v(m,'asset_type')]||v(m,'asset_type')),item('Belső azonosító',v(m,'asset_code')),item('Gyártó',v(m,'make')),item('Típus / modell',v(m,'model')),item('Évjárat',v(m,'year')),item('Rendszám',v(m,'plate')),item('Alvázszám (VIN)',v(m,'vin')),item('Motorszám',v(m,'engine_no')),item('Beszerzés dátuma',v(m,'purchase_date')),item('Beszerzési érték',money(m.purchase_value)),item('Jelenlegi érték',money(m.current_value)),item('Állapot',v(m,'status','Üzemképes'))]),
   tech:section('Műszaki adatok',[item('Üzemóra',num(m.hours,'h')),item('Kilométeróra',num(m.odometer,'km')),item('Következő szerviz km',num(m.service_km,'km')),item('Következő szerviz üzemóra',num(m.service_hours,'h')),item('Következő szerviz dátuma',v(m,'service_date')),item('Üzemanyag',fuel[m.fuel]||v(m,'fuel')),item('Hengerűrtartalom',num(m.engine_cc,'cm³')),item('Teljesítmény',num(m.power_hp,'LE')),item('Teljesítmény',num(m.power_kw,'kW')),item('Sebességváltó',v(m,'transmission')),item('Meghajtás',v(m,'drive')),item('Karosszéria / kivitel',v(m,'body')),item('Szín',v(m,'color')),item('Gumiabroncs méret',v(m,'tire_size')),item('Saját tömeg',num(m.weight,'kg')),item('Megengedett össztömeg',num(m.gvw,'kg'))]),
   docs:section('Okmányok és biztosítás',[item('Műszaki vizsga lejárata',v(m,'mot_expiry')),item('Kötelező biztosítás lejárata',v(m,'insurance_expiry')),item('Casco lejárata',v(m,'casco_expiry')),item('Útdíj / matrica lejárata',v(m,'toll_expiry')),item('Forgalmi dokumentum',v(m,'registration_doc')),item('Biztosító',v(m,'insurer')),item('Biztosítás kötvényszáma',v(m,'policy_no'))]),
   service:section('Szerviz',[item('Utolsó szerviz dátuma',v(m,'last_service_date')),item('Utolsó szerviz km / üzemóra',v(m,'last_service_meter')),item('Szervizhely / szerelő',v(m,'service_provider')),item('Utolsó szerviz költsége',money(m.last_service_cost)),item('Következő szerviz megjegyzés',v(m,'service_note'),true)]),
   cost:section('Költségek',[item('Havi átlagos üzemanyagköltség',money(m.fuel_cost_month)),item('Éves szervizköltség',money(m.service_cost_year)),item('Éves biztosítási költség',money(m.insurance_cost_year)),item('Egyéb éves költség',money(m.other_cost_year))]),
   notes:section('Megjegyzés és felelős',[item('Megjegyzés',v(m,'notes'),true),item('Felelős / használó',v(m,'responsible'),true)])
  }[t]||'');
  root.innerHTML=`<div class="machine-page-profile"><div class="machine-page-head"><div><div class="eyebrow">GÉPPARK / ESZKÖZ ADATLAP</div><h1>${esc(v(m,'name'))}</h1><div class="machine-page-sub">${esc(labels[m.asset_type]||v(m,'asset_type'))} · ${esc(v(m,'make',''))} ${esc(v(m,'model',''))}</div></div><div class="machine-page-actions"><button class="btn secondary" id="mpBack">← Vissza a gépparkhoz</button><button class="btn" id="mpEdit">✏️ Szerkesztés</button></div></div><div class="machine-page-tabs">${tabs.map((t,i)=>`<button type="button" class="btn secondary mp-tab${i===0?' active':''}" data-tab="${t[0]}">${t[1]}</button>`).join('')}</div><div id="mpPane">${pane('base')}</div></div>`;
  root.querySelectorAll('.mp-tab').forEach(b=>b.onclick=()=>{root.querySelectorAll('.mp-tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');root.querySelector('#mpPane').innerHTML=pane(b.dataset.tab)});
  root.querySelector('#mpBack').onclick=()=>{if(typeof window.nav==='function')window.nav('machines');else if(typeof window.render==='function'){window.current='machines';window.render()}};
  root.querySelector('#mpEdit').onclick=()=>{if(typeof window.editMachine==='function')window.editMachine(id)};
 }
 window.machineProfilePage=show;
 window.machineProfile=show;
 document.addEventListener('click',function(e){
  const b=e.target.closest('[data-action="profile"][data-id]');
  if(b){e.preventDefault();e.stopPropagation();show(b.getAttribute('data-id'));}
 },true);
 const style=document.createElement('style');style.textContent=`.machine-page-profile{display:block}.machine-page-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:18px}.machine-page-head h1{margin:4px 0;font-size:28px}.machine-page-sub{color:var(--muted);font-size:13px}.machine-page-actions{display:flex;gap:8px;flex-wrap:wrap}.machine-page-tabs{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:16px}.machine-page-tabs .active{background:#dbeafe;color:#1d4ed8}.mp-section{background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px;box-shadow:var(--shadow);margin-bottom:16px}.mp-section h3{margin:0 0 14px;font-size:16px}.mp-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.mp-item{border:1px solid #e1e7ed;border-radius:9px;padding:12px;background:#fbfcfd;min-height:58px}.mp-full{grid-column:1/-1}.mp-label{font-size:11px;color:var(--muted);margin-bottom:5px}.mp-value{font-size:14px;font-weight:650;word-break:break-word;white-space:pre-wrap}@media(max-width:700px){.machine-page-head{flex-direction:column}.mp-grid{grid-template-columns:1fr}.mp-full{grid-column:auto}}`;document.head.appendChild(style);
 return true;
 }
 let n=0;function boot(){if(install()||n++>120)return;setTimeout(boot,250)}boot();
})();
