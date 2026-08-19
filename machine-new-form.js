/* Kútfő Plusz ERP – Új eszköz teljes adatlap */
(function(){
  'use strict';
  function boot(){
    if(!window.db || typeof window.render!=='function') return setTimeout(boot,250);
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    const field=(label,id,value='',type='text')=>`<div class="field"><label>${label}</label><input class="input" id="${id}" type="${type}" value="${esc(value)}"></div>`;
    window.newMachine=function(){
      document.getElementById('newMachineFull')?.remove();
      const m=document.createElement('div');m.id='newMachineFull';m.className='modal';
      m.innerHTML=`<div class="modalbox"><div class="modalhead"><h2>Új eszköz felvitele</h2><button class="icon" data-x>×</button></div><div class="modalbody">
      <div class="formgrid">
      <div class="field"><label>Eszköz neve</label><input class="input" id="mnName" required placeholder="pl. Ford Ranger"></div>
      <div class="field"><label>Eszköztípus</label><select class="select" id="mnType"><option>Autó</option><option>Teherautó</option><option>Fúrógép</option><option>Kompresszor</option><option>Utánfutó</option><option>Egyéb</option></select></div>
      ${field('Belső azonosító','mnInternal')}${field('Gyártó','mnMake')}${field('Modell / típus','mnModel')}${field('Évjárat','mnYear','', 'number')}${field('Rendszám','mnPlate')}${field('Alvázszám / VIN','mnVin')}${field('Motorszám','mnEngine')}${field('Beszerzés dátuma','mnPurchase','', 'date')}${field('Beszerzési érték (Ft)','mnPurchaseValue','', 'number')}${field('Jelenlegi érték (Ft)','mnCurrentValue','', 'number')}
      <div class="field"><label>Státusz</label><select class="select" id="mnStatus"><option>Üzemképes</option><option>Szervizre vár</option><option>Meghibásodott</option><option>Üzemen kívül</option></select></div>
      ${field('Felelős / használó','mnResponsible')}
      <div class="field full"><h3 style="margin:8px 0 2px">Műszaki adatok</h3></div>
      ${field('Kilométeróra (km)','mnKm','', 'number')}${field('Üzemóra','mnHours','', 'number')}${field('Következő szerviz (km/óra)','mnService','', 'number')}${field('Üzemanyag','mnFuel')}${field('Hengerűrtartalom (cm³)','mnCc','', 'number')}${field('Teljesítmény (LE)','mnHp','', 'number')}${field('Teljesítmény (kW)','mnKw','', 'number')}${field('Sebességváltó','mnGear')}${field('Meghajtás','mnDrive')}${field('Karosszéria','mnBody')}${field('Gumiabroncs méret','mnTyre')}${field('Saját tömeg (kg)','mnWeight','', 'number')}${field('Megengedett össztömeg (kg)','mnMaxWeight','', 'number')}
      <div class="field full"><h3 style="margin:8px 0 2px">Okmányok</h3></div>
      ${field('Műszaki vizsga lejárata','mnInspection','', 'date')}${field('Biztosítás lejárata','mnInsurance','', 'date')}${field('Casco lejárata','mnCasco','', 'date')}${field('Biztosító','mnInsurer')}${field('Kötvényszám','mnPolicy')}${field('Útdíj / matrica lejárata','mnToll','', 'date')}
      <div class="field full"><h3 style="margin:8px 0 2px">Szerviz és költségek</h3></div>
      ${field('Utolsó szerviz','mnLastService','', 'date')}${field('Utolsó szerviz km/óra','mnLastServiceMeter','', 'number')}${field('Szervizhely','mnServicePlace')}${field('Utolsó szerviz költsége (Ft)','mnServiceCost','', 'number')}${field('Éves biztosítás (Ft)','mnInsuranceCost','', 'number')}${field('Egyéb éves költség (Ft)','mnOtherCost','', 'number')}
      <div class="field full"><label>Megjegyzés</label><textarea class="textarea" id="mnNotes"></textarea></div>
      </div>
      <div class="modalfoot"><button class="btn secondary" data-c>Mégse</button><button class="btn" data-save>➕ Létrehozás</button></div>
      </div></div>`;
      document.body.appendChild(m);
      m.querySelector('[data-x]').onclick=()=>m.remove();m.querySelector('[data-c]').onclick=()=>m.remove();
      m.querySelector('[data-save]').onclick=()=>{
        const v=id=>m.querySelector('#'+id)?.value?.trim()||'';const n=id=>Number(v(id))||0;
        const item={id:'machine_'+Date.now(),name:v('mnName'),type:v('mnType'),internal_id:v('mnInternal'),manufacturer:v('mnMake'),model:v('mnModel'),year:n('mnYear'),plate:v('mnPlate'),vin:v('mnVin'),engine_number:v('mnEngine'),purchase_date:v('mnPurchase'),purchase_value:n('mnPurchaseValue'),current_value:n('mnCurrentValue'),status:v('mnStatus')||'Üzemképes',responsible:v('mnResponsible'),km:n('mnKm'),hours:n('mnHours'),service:n('mnService'),fuel:v('mnFuel'),engine_cc:n('mnCc'),hp:n('mnHp'),kw:n('mnKw'),gearbox:v('mnGear'),drive:v('mnDrive'),body:v('mnBody'),tyre:v('mnTyre'),weight:n('mnWeight'),max_weight:n('mnMaxWeight'),inspection_expiry:v('mnInspection'),insurance_expiry:v('mnInsurance'),casco_expiry:v('mnCasco'),insurer:v('mnInsurer'),policy_number:v('mnPolicy'),toll_expiry:v('mnToll'),last_service:v('mnLastService'),last_service_meter:n('mnLastServiceMeter'),service_place:v('mnServicePlace'),service_cost:n('mnServiceCost'),insurance_cost:n('mnInsuranceCost'),other_cost:n('mnOtherCost'),notes:v('mnNotes')};
        if(!item.name){alert('Az eszköz neve kötelező.');return;}window.db.machines=Array.isArray(window.db.machines)?window.db.machines:[];window.db.machines.push(item);try{window.save?.();}catch(e){console.error(e)}m.remove();window.render();if(typeof window.toast==='function')window.toast('Eszköz létrehozva és mentve');
      };
    };
  }
  boot();
})();
