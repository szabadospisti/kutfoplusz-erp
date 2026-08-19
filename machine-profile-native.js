/* Kútfő Plusz ERP – Géppark natív teljes oldalas adatlap */
(function(){
'use strict';
function install(){
 if(typeof views==='undefined'||typeof db==='undefined'||typeof render!=='function') return false;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const labels={auto:'Autó / jármű',furo:'Fúrógép',kompresszor:'Kompresszor',teherauto:'Teherautó',utanfuto:'Utánfutó',egyeb:'Egyéb'};
 const fuel={diesel:'Dízel',petrol:'Benzin',electric:'Elektromos',hybrid:'Hibrid',other:'Egyéb'};
 const val=(m,k,d='—')=>m?.[k]===undefined||m?.[k]===null||m?.[k]===''?d:m[k];
 const num=(x,u='')=>x===undefined||x===null||x===''?'—':Number(x||0).toLocaleString('hu-HU')+(u?' '+u:'');
 const money=x=>x===undefined||x===null||x===''?'—':Number(x||0).toLocaleString('hu-HU')+' Ft';
 const item=(a,b,full=false)=>`<div class="mpn-item${full?' mpn-full':''}><div class="mpn-label">${esc(a)}</div><div class="mpn-value">${esc(b)}</div></div>`;
 const section=(title,items)=>`<section class="mpn-section"><h3>${title}</h3><div class="mpn-grid">${items.join('')}</div></section>`;
 const original=views.machines;
 function profileHtml(m){
  const pane=t=>({
   base:section('Alapadatok',[item('Eszköz neve',val(m,'name')),item('Eszköztípus',labels[m.asset_type]||val(m,'asset_type')),item('Belső azonosító',val(m,'asset_code')),item('Gyártó',val(m,'make')),item('Típus / modell',val(m,'model')),item('Évjárat',val(m,'year')),item('Rendszám',val(m,'plate')),item('Alvázszám (VIN)',val(m,'vin')),item('Motorszám',val(m,'engine_no')),item('Beszerzés dátuma',val(m,'purchase_date')),item('Beszerzési érték',money(m.purchase_value)),item('Jelenlegi érték',money(m.current_value)),item('Állapot',val(m,'status','Üzemképes'))]),
   tech:section('Műszaki adatok',[item('Üzemóra',num(m.hours,'h')),item('Kilométeróra',num(m.odometer,'km')),item('Következő szerviz km',num(m.service_km,'km')),item('Következő szerviz üzemóra',num(m.service_hours,'h')),item('Következő szerviz dátuma',val(m,'service_date')),item('Üzemanyag',fuel[m.fuel]||val(m,'fuel')),item('Hengerűrtartalom',num(m.engine_cc,'cm³')),item('Teljesítmény',num(m.power_hp,'LE')),item('Teljesítmény',num(m.power_kw,'kW')),item('Sebességváltó',val(m,'transmission')),item('Meghajtás',val(m,'drive')),item('Karosszéria / kivitel',val(m,'body')),item('Szín',val(m,'color')),item('Gumiabroncs méret',val(m,'tire_size')),item('Saját tömeg',num(m.weight,'kg')),item('Megengedett össztömeg',num(m.gvw,'kg'))]),
   docs:section('Okmányok és biztosítás',[item('Műszaki vizsga lejárata',val(m,'mot_expiry')),item('Kötelező biztosítás lejárata',val(m,'insurance_expiry')),item('Casco lejárata',val(m,'casco_expiry')),item('Útdíj / matrica lejárata',val(m,'toll_expiry')),item('Forgalmi dokumentum',val(m,'registration_doc')),item('Biztosító',val(m,'insurer')),item('Biztosítás kötvényszáma',val(m,'policy_no'))]),
   service:section('Szerviz',[item('Utolsó szerviz dátuma',val(m,'last_service_date')),item('Utolsó szerviz km / üzemóra',val(m,'last_service_meter')),item('Szervizhely / szerelő',val(m,'service_provider')),item('Utolsó szerviz költsége',money(m.last_service_cost)),item('Következő szerviz megjegyzés',val(m,'service_note'),true)]),
   cost:section('Költségek',[item('Havi átlagos üzemanyagköltség',money(m.fuel_cost_month)),item('Éves szervizköltség',money(m.service_cost_year)),item('Éves biztosítási költség',money(m.insurance_cost_year)),item('Egyéb éves költség',money(m.other_cost_year))]),
   notes:section('Megjegyzés és felelős',[item('Megjegyzés',val(m,'notes'),true),item('Felelős / használó',val(m,'responsible'),true)])
  }[t]||'');
  return `<div class="mpn-profile"><div class="mpn-head"><div><div class="eyebrow">GÉPPARK / ESZKÖZ ADATLAP</div><h1>${esc(val(m,'name'))}</h1><div class="mpn-sub">${esc(labels[m.asset_type]||val(m,'asset_type'))} · ${esc(val(m,'make',''))} ${esc(val(m,'model',''))}</div></div><div class="mpn-actions"><button class="btn secondary" id="mpnBack">← Vissza a gépparkhoz</button><button class="btn" id="mpnEdit">✏️ Szerkesztés</button></div></div><div class="mpn-tabs">${[['base','Általános'],['tech','Műszaki'],['docs','Okmányok'],['service','Szerviz'],['cost','Költségek'],['notes','Megjegyzés']].map((t,i)=>`<button class="btn secondary mpn-tab${i===0?' active':''}" data-tab="${t[0]}">${t[1]}</button>`).join('')}</div><div id="mpnPane">${pane('base')}</div></div>`;
 }
 views.machines=function(){
  const id=window.__machineProfileId;
  if(!id) return original();
  const m=(db.machines||[]).find(x=>String(x.id)===String(id));
  if(!m){window.__machineProfileId=null;return original();}
  return profileHtml(m);
 };
 function open(id){window.__machineProfileId=String(id);render();}
 function back(){window.__machineProfileId=null;render();}
 document.addEventListener('click',function(e){
  const b=e.target.closest('[data-action="profile"][data-id]');
  if(!b)return;
  if(window.current!=='machines')return;
  e.preventDefault();
  e.stopPropagation();
  e.stopImmediatePropagation();
  open(b.getAttribute('data-id'));
 },false);
 document.addEventListener('click',function(e){
  if(e.target.closest('#mpnBack')){e.preventDefault();back();return;}
  if(e.target.closest('#mpnEdit')){
   e.preventDefault();
   e.stopPropagation();
   e.stopImmediatePropagation();
   const id=window.__machineProfileId;
   if(id&&typeof window.machineProfileInlineEdit==='function'){
    window.machineProfileInlineEdit(id);
   }else if(id&&typeof window.editMachine==='function'){
    window.editMachine(id);
   }
   return;
  }
  const tab=e.target.closest('.mpn-tab');
  if(tab){
   const m=(db.machines||[]).find(x=>String(x.id)===String(window.__machineProfileId));
   if(!m)return;
   const panes={base:'Alapadatok',tech:'Műszaki adatok',docs:'Okmányok és biztosítás',service:'Szerviz',cost:'Költségek',notes:'Megjegyzés és felelős'};
   const wrap=document.querySelector('.mpn-profile');if(!wrap)return;
   const holder=wrap.querySelector('#mpnPane');
   const t=tab.dataset.tab;
   const mk=(title,items)=>`<section class="mpn-section"><h3>${title}</h3><div class="mpn-grid">${items.join('')}</div></section>`;
   let html='';
   if(t==='base')html=mk(panes.base,[item('Eszköz neve',val(m,'name')),item('Eszköztípus',labels[m.asset_type]||val(m,'asset_type')),item('Belső azonosító',val(m,'asset_code')),item('Gyártó',val(m,'make')),item('Típus / modell',val(m,'model')),item('Évjárat',val(m,'year')),item('Rendszám',val(m,'plate')),item('Alvázszám (VIN)',val(m,'vin')),item('Motorszám',val(m,'engine_no')),item('Beszerzés dátuma',val(m,'purchase_date')),item('Beszerzési érték',money(m.purchase_value)),item('Jelenlegi érték',money(m.current_value)),item('Állapot',val(m,'status','Üzemképes'))]);
   if(t==='tech')html=mk(panes.tech,[item('Üzemóra',num(m.hours,'h')),item('Kilométeróra',num(m.odometer,'km')),item('Következő szerviz km',num(m.service_km,'km')),item('Következő szerviz üzemóra',num(m.service_hours,'h')),item('Következő szerviz dátuma',val(m,'service_date')),item('Üzemanyag',fuel[m.fuel]||val(m,'fuel')),item('Hengerűrtartalom',num(m.engine_cc,'cm³')),item('Teljesítmény',num(m.power_hp,'LE')),item('Teljesítmény',num(m.power_kw,'kW')),item('Sebességváltó',val(m,'transmission')),item('Meghajtás',val(m,'drive')),item('Karosszéria / kivitel',val(m,'body')),item('Szín',val(m,'color')),item('Gumiabroncs méret',val(m,'tire_size')),item('Saját tömeg',num(m.weight,'kg')),item('Megengedett össztömeg',num(m.gvw,'kg'))]);
   if(t==='docs')html=mk(panes.docs,[item('Műszaki vizsga lejárata',val(m,'mot_expiry')),item('Kötelező biztosítás lejárata',val(m,'insurance_expiry')),item('Casco lejárata',val(m,'casco_expiry')),item('Útdíj / matrica lejárata',val(m,'toll_expiry')),item('Forgalmi dokumentum',val(m,'registration_doc')),item('Biztosító',val(m,'insurer')),item('Biztosítás kötvényszáma',val(m,'policy_no'))]);
   if(t==='service')html=mk(panes.service,[item('Utolsó szerviz dátuma',val(m,'last_service_date')),item('Utolsó szerviz km / üzemóra',val(m,'last_service_meter')),item('Szervizhely / szerelő',val(m,'service_provider')),item('Utolsó szerviz költsége',money(m.last_service_cost)),item('Következő szerviz megjegyzés',val(m,'service_note'),true)]);
   if(t==='cost')html=mk(panes.cost,[item('Havi átlagos üzemanyagköltség',money(m.fuel_cost_month)),item('Éves szervizköltség',money(m.service_cost_year)),item('Éves biztosítási költség',money(m.insurance_cost_year)),item('Egyéb éves költség',money(m.other_cost_year))]);
   if(t==='notes')html=mk(panes.notes,[item('Megjegyzés',val(m,'notes'),true),item('Felelős / használó',val(m,'responsible'),true)]);
   wrap.querySelectorAll('.mpn-tab').forEach(x=>x.classList.toggle('active',x===tab));holder.innerHTML=html;
  }
 },false);
 const style=document.createElement('style');style.textContent='.mpn-profile{width:100%}.mpn-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:18px}.mpn-head h1{margin:4px 0;font-size:28px}.mpn-sub{color:var(--muted);font-size:13px}.mpn-actions{display:flex;gap:8px;flex-wrap:wrap}.mpn-tabs{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:16px}.mpn-tabs .active{background:#dbeafe;color:#1d4ed8}.mpn-section{background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px;box-shadow:var(--shadow);margin-bottom:16px}.mpn-section h3{margin:0 0 14px;font-size:16px}.mpn-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.mpn-item{border:1px solid #e1e7ed;border-radius:9px;padding:12px;background:#fbfcfd;min-height:58px}.mpn-full{grid-column:1/-1}.mpn-label{font-size:11px;color:var(--muted);margin-bottom:5px}.mpn-value{font-size:14px;font-weight:650;word-break:break-word;white-space:pre-wrap}@media(max-width:700px){.mpn-head{flex-direction:column}.mpn-grid{grid-template-columns:1fr}.mpn-full{grid-column:auto}}';document.head.appendChild(style);
 return true;
 }
 let n=0;function boot(){if(install()||n++>120)return;setTimeout(boot,250)}boot();
})();