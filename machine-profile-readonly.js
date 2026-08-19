/* Kútfő Plusz ERP – Gépadatlap csak megjelenítéshez
 * Az Adatlap nem tartalmaz szerkeszthető inputokat; a Szerkesztés külön gombbal nyílik meg.
 */
(function(){
  'use strict';
  function install(){
    if(typeof db==='undefined') return false;
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const arr=()=>Array.isArray(db.machines)?db.machines:[];
    const v=(m,k,d='—')=>m?.[k]===undefined||m?.[k]===null||m?.[k]===''?d:m[k];
    const typeLabels={auto:'Autó / jármű',furo:'Fúrógép',kompresszor:'Kompresszor',teherauto:'Teherautó',utanfuto:'Utánfutó',egyeb:'Egyéb'};
    const fuelLabels={diesel:'Dízel',petrol:'Benzin',electric:'Elektromos',hybrid:'Hibrid',other:'Egyéb','':'—'};
    const display=(label,value,cls='')=>`<div class="fleet-readonly-item ${cls}"><div class="fleet-readonly-label">${esc(label)}</div><div class="fleet-readonly-value">${esc(value)}</div></div>`;
    const section=(title,items)=>`<div class="fleet-readonly-section"><h3>${title}</h3><div class="fleet-readonly-grid">${items.join('')}</div></div>`;
    function profile(id){
      const m=arr().find(x=>String(x.id)===String(id));if(!m)return;
      const body=`
        <div class="fleet-readonly-tabs">
          <button type="button" class="btn secondary active" data-tab="base">Általános</button>
          <button type="button" class="btn secondary" data-tab="tech">Műszaki</button>
          <button type="button" class="btn secondary" data-tab="docs">Okmányok</button>
          <button type="button" class="btn secondary" data-tab="service">Szerviz</button>
          <button type="button" class="btn secondary" data-tab="cost">Költségek</button>
          <button type="button" class="btn secondary" data-tab="notes">Megjegyzés</button>
        </div>
        <div class="fleet-readonly-pane" data-pane="base">
          ${section('Alapadatok',[
            display('Eszköz neve',v(m,'name')),
            display('Eszköztípus',typeLabels[v(m,'asset_type','egyeb')]||v(m,'asset_type')),
            display('Belső azonosító',v(m,'asset_code')),
            display('Gyártó',v(m,'make')),
            display('Típus / modell',v(m,'model')),
            display('Évjárat',v(m,'year')),
            display('Rendszám',v(m,'plate')),
            display('Alvázszám (VIN)',v(m,'vin')),
            display('Motorszám',v(m,'engine_no')),
            display('Beszerzés dátuma',v(m,'purchase_date')),
            display('Beszerzési érték',v(m,'purchase_value')==='—'?'—':Number(m.purchase_value||0).toLocaleString('hu-HU')+' Ft'),
            display('Jelenlegi érték',v(m,'current_value')==='—'?'—':Number(m.current_value||0).toLocaleString('hu-HU')+' Ft'),
            display('Állapot',v(m,'status','Üzemképes'))
          ])}
        </div>
        <div class="fleet-readonly-pane" data-pane="tech" style="display:none">
          ${section('Műszaki adatok',[
            display('Üzemóra',v(m,'hours')==='—'?'—':Number(m.hours||0).toLocaleString('hu-HU')+' h'),
            display('Kilométeróra',v(m,'odometer')==='—'?'—':Number(m.odometer||0).toLocaleString('hu-HU')+' km'),
            display('Következő szerviz km',v(m,'service_km')==='—'?'—':Number(m.service_km||0).toLocaleString('hu-HU')+' km'),
            display('Következő szerviz üzemóra',v(m,'service_hours')==='—'?'—':Number(m.service_hours||0).toLocaleString('hu-HU')+' h'),
            display('Következő szerviz dátuma',v(m,'service_date')),
            display('Üzemanyag',fuelLabels[m.fuel]||v(m,'fuel')),
            display('Hengerűrtartalom',v(m,'engine_cc')==='—'?'—':Number(m.engine_cc||0).toLocaleString('hu-HU')+' cm³'),
            display('Teljesítmény',v(m,'power_hp')==='—'?'—':m.power_hp+' LE'),
            display('Teljesítmény',v(m,'power_kw')==='—'?'—':m.power_kw+' kW'),
            display('Sebességváltó',v(m,'transmission')),
            display('Meghajtás',v(m,'drive')),
            display('Karosszéria / kivitel',v(m,'body')),
            display('Szín',v(m,'color')),
            display('Gumiabroncs méret',v(m,'tire_size')),
            display('Saját tömeg',v(m,'weight')==='—'?'—':Number(m.weight||0).toLocaleString('hu-HU')+' kg'),
            display('Megengedett össztömeg',v(m,'gvw')==='—'?'—':Number(m.gvw||0).toLocaleString('hu-HU')+' kg')
          ])}
        </div>
        <div class="fleet-readonly-pane" data-pane="docs" style="display:none">
          ${section('Okmányok és biztosítás',[
            display('Műszaki vizsga lejárata',v(m,'mot_expiry')),
            display('Kötelező biztosítás lejárata',v(m,'insurance_expiry')),
            display('Casco lejárata',v(m,'casco_expiry')),
            display('Útdíj / matrica lejárata',v(m,'toll_expiry')),
            display('Forgalmi dokumentum',v(m,'registration_doc')),
            display('Biztosító',v(m,'insurer')),
            display('Biztosítás kötvényszáma',v(m,'policy_no'))
          ])}
        </div>
        <div class="fleet-readonly-pane" data-pane="service" style="display:none">
          ${section('Szerviz',[
            display('Utolsó szerviz dátuma',v(m,'last_service_date')),
            display('Utolsó szerviz km / üzemóra',v(m,'last_service_meter')),
            display('Szervizhely / szerelő',v(m,'service_provider')),
            display('Utolsó szerviz költsége',v(m,'last_service_cost')==='—'?'—':Number(m.last_service_cost||0).toLocaleString('hu-HU')+' Ft'),
            display('Következő szerviz megjegyzés',v(m,'service_note'),'full')
          ])}
        </div>
        <div class="fleet-readonly-pane" data-pane="cost" style="display:none">
          ${section('Költségek',[
            display('Havi átlagos üzemanyagköltség',v(m,'fuel_cost_month')==='—'?'—':Number(m.fuel_cost_month||0).toLocaleString('hu-HU')+' Ft'),
            display('Éves szervizköltség',v(m,'service_cost_year')==='—'?'—':Number(m.service_cost_year||0).toLocaleString('hu-HU')+' Ft'),
            display('Éves biztosítási költség',v(m,'insurance_cost_year')==='—'?'—':Number(m.insurance_cost_year||0).toLocaleString('hu-HU')+' Ft'),
            display('Egyéb éves költség',v(m,'other_cost_year')==='—'?'—':Number(m.other_cost_year||0).toLocaleString('hu-HU')+' Ft')
          ])}
        </div>
        <div class="fleet-readonly-pane" data-pane="notes" style="display:none">
          ${section('Megjegyzés és felelős',[
            display('Megjegyzés',v(m,'notes'),'full'),
            display('Felelős / használó',v(m,'responsible'),'full')
          ])}
        </div>`;
      const modal=document.createElement('div');
      modal.id='readonlyMachineProfile';modal.className='modal';
      modal.innerHTML=`<div class="modalbox" style="max-width:900px"><div class="modalhead"><div><h2>Eszköz adatlap</h2><div class="sub">${esc(v(m,'name'))} · ${esc(v(m,'make',''))} ${esc(v(m,'model',''))}</div></div><button class="icon" data-x>×</button></div><div class="modalbody">${body}<div class="modalfoot"><button class="btn secondary" data-x2>Bezárás</button><button class="btn" data-edit>✏️ Szerkesztés</button></div></div></div>`;
      document.getElementById('readonlyMachineProfile')?.remove();document.body.appendChild(modal);
      modal.querySelectorAll('[data-x],[data-x2]').forEach(b=>b.onclick=()=>modal.remove());
      modal.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{modal.querySelectorAll('[data-tab]').forEach(x=>x.classList.remove('active'));modal.querySelectorAll('[data-pane]').forEach(x=>x.style.display='none');b.classList.add('active');modal.querySelector(`[data-pane="${b.dataset.tab}"]`).style.display='block'});
      modal.querySelector('[data-edit]').onclick=()=>{modal.remove();if(typeof window.editMachine==='function')window.editMachine(id)};
    }
    const style=document.createElement('style');
    style.textContent=`.fleet-readonly-tabs{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:16px}.fleet-readonly-tabs .active{background:#dbeafe;color:#1d4ed8}.fleet-readonly-section{border:1px solid var(--line);border-radius:12px;padding:16px;background:#fbfcfd}.fleet-readonly-section h3{margin:0 0 14px;font-size:15px}.fleet-readonly-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}.fleet-readonly-item{border:1px solid #e1e7ed;border-radius:9px;padding:10px 12px;background:#fff;min-height:54px}.fleet-readonly-item.full{grid-column:1/-1}.fleet-readonly-label{font-size:11px;color:var(--muted);margin-bottom:5px}.fleet-readonly-value{font-size:14px;font-weight:650;min-height:18px;word-break:break-word}@media(max-width:600px){.fleet-readonly-grid{grid-template-columns:1fr}.fleet-readonly-item.full{grid-column:auto}}`;
    document.head.appendChild(style);
    window.machineProfile=profile;
    return true;
  }
  let tries=0;const boot=()=>{if(install()||tries++>40)return;setTimeout(boot,250)};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
