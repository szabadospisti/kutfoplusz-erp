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
 function pane(m,t){
  if(t==='base')return section('Alapadatok',[item('Eszköz neve',val(m,'name')),item('Eszköztípus',labels[m.asset_type]||val(m,'asset_type')),item('Belső azonosító',val(m,'asset_code')),item('Gyártó',val(m,'make')),item('Típus / modell',val(m,'model')),item('Évjárat',val(m,'year')),item('Rendszám',val(m,'plate')),item('Alvázszám (VIN)',val(m,'vin')),item('Motorszám',val(m,'engine_no')),item('Beszerzés dátuma',val(m,'purchase_date')),item('Beszerzési érték',money(m.purchase_value)),item('Jelenlegi érték',money(m.current_value)),item('Állapot',val(m,'status','Üzemképes'))]);
  if(t==='tech')return section('Műszaki adatok',[item('Üzemóra',num(m.hours,'h')),item('Kilométeróra',num(m.odometer,'km')),item('Következő szerviz km',num(m.service_km,'km')),item('Következő szerviz üzemóra',num(m.service_hours,'h')),item('Következő szerviz dátuma',val(m,'service_date')),item('Üzemanyag',fuel[m.fuel]||val(m,'fuel')),item('Hengerűrtartalom',num(m.engine_cc,'cm³')),item('Teljesítmény',num(m.power_hp,'LE')),item('Teljesítmény',num(m.power_kw,'kW')),item('Sebességváltó',val(m,'transmission')),item('Meghajtás',val(m,'drive')),item('Karosszéria / kivitel',val(m,'body')),item('Szín',val(m,'color')),item('Gumiabroncs méret',val(m,'tire_size')),item('Saját tömeg',num(m.weight,'kg')),item('Megengedett össztömeg',num(m.gvw,'kg'))]);
  if(t==='docs')return section('Okmányok és biztosítás',[item('Műszaki vizsga lejárata',val(m,'mot_expiry')),item('Kötelező biztosítás lejárata',val(m,'insurance_expiry')),item('Casco lejárata',val(m,'casco_expiry')),item('Útdíj / matrica lejárata',val(m,'toll_expiry')),item('Forgalmi dokumentum',val(m,'registration_doc')),item('Biztosító',val(m,'insurer')),item('Biztosítás kötvényszáma',val(m,'policy_no'))]);
  if(t==='service')return section('Szerviz',[item('Utolsó szerviz dátuma',val(m,'last_service_date')),item('Utolsó szerviz km / üzemóra',val(m,'last_service_meter')),item('Szervizhely / szerelő',val(m,'service_provider')),item('Utolsó szerviz költsége',money(m.last_service_cost)),item('Következő szerviz megjegyzés',val(m,'service_note'),true)]);
  if(t==='cost')return section('Költségek',[item('Havi átlagos üzemanyagköltség',money(m.fuel_cost_month)),item('Éves szervizköltség',money(m.service_cost_year)),item('Éves biztosítási költség',money(m.insurance_cost_year)),item('Egyéb éves költség',money(m.other_cost_year))]);
  return section('Megjegyzés és felelős',[item('Megjegyzés',val(m,'notes'),true),item('Felelős / használó',val(m,'responsible'),true)]);
 }
 function profileHtml(m){return `<div class="mpn-profile"><div class="mpn-head"><div><div class="eyebrow">GÉPPARK / ESZKÖZ ADATLAP</div><h1>${esc(val(m,'name'))}</h1><div class="mpn-sub">${esc(labels[m.asset_type]||val(m,'asset_type'))} · ${esc(val(m,'make',''))} ${esc(val(m,'model',''))}</div></div><div class="mpn-actions"><button class="btn secondary" id="mpnBack">← Vissza a gépparkhoz</button><button class="btn" id="mpnEdit">✏️ Szerkesztés</button></div></div><div class="mpn-tabs">${[['base','Általános'],['tech','Műszaki'],['docs','Okmányok'],['service','Szerviz'],['cost','Költségek'],['notes','Megjegyzés']].map((t,i)=>`<button class="btn secondary mpn-tab${i===0?' active':''}" data-tab="${t[0]}">${t[1]}</button>`).join('')}</div><div id="mpnPane">${pane(m,'base')}</div></div>`;}
 views.machines=function(){const id=window.__machineProfileId;if(!id)return original();const m=(db.machines||[]).find(x=>String(x.id)===String(id));if(!m){window.__machineProfileId=null;return original();}return profileHtml(m);};
 function open(id){window.__machineProfileId=String(id);render();setTimeout(bind,0);}
 function back(){window.__machineProfileId=null;render();setTimeout(bind,0);}
 function bind(){
  document.querySelectorAll('[data-action="profile"][data-id]').forEach(b=>{if(b.dataset.mpnBound)return;b.dataset.mpnBound='1';b.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();open(b.dataset.id);});});
  const edit=document.getElementById('mpnEdit');if(edit&&!edit.dataset.mpnBound){edit.dataset.mpnBound='1';edit.addEventListener('click',e=>{e.preventDefault();e.stopPropagation();const id=window.__machineProfileId;if(id&&typeof window.machineProfileInlineEdit==='function')window.machineProfileInlineEdit(id);});}
  const backBtn=document.getElementById('mpnBack');if(backBtn&&!backBtn.dataset.mpnBound){backBtn.dataset.mpnBound='1';backBtn.addEventListener('click',e=>{e.preventDefault();back();});}
  document.querySelectorAll('.mpn-tab').forEach(tab=>{if(tab.dataset.mpnBound)return;tab.dataset.mpnBound='1';tab.addEventListener('click',()=>{const m=(db.machines||[]).find(x=>String(x.id)===String(window.__machineProfileId));if(!m)return;document.querySelectorAll('.mpn-tab').forEach(x=>x.classList.toggle('active',x===tab));document.getElementById('mpnPane').innerHTML=pane(m,tab.dataset.tab);});});
 }
 window.machineProfilePage=open;
 window.__machineProfileNativeInstalled=true;
 setTimeout(()=>{if(window.current==='machines')render();},0);
 setTimeout(bind,10);
 return true;
}
 let n=0;function boot(){if(install()||n++>120)return;setTimeout(boot,250)}boot();
})();