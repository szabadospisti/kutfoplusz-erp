/* Kútfő Plusz ERP – Géppark V3
 * Az adatlap a Géppark tartalmi területén jelenik meg.
 * Nincs modal / drawer az Adatlap gombhoz.
 */
(function(){
'use strict';

function install(){
  if(typeof views==='undefined'||typeof db==='undefined'||typeof render!=='function') return false;

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const arr=()=>Array.isArray(db.machines)?db.machines:[];
  const val=(o,k,d='—')=>o?.[k]===undefined||o?.[k]===null||o?.[k]===''?d:o[k];
  const typeLabels={auto:'Autó / jármű',furo:'Fúrógép',kompresszor:'Kompresszor',teherauto:'Teherautó',utanfuto:'Utánfutó',egyeb:'Egyéb'};
  const fuelLabels={diesel:'Dízel',petrol:'Benzin',electric:'Elektromos',hybrid:'Hibrid',other:'Egyéb'};

  function money(x){return x===undefined||x===null||x===''?'—':Number(x||0).toLocaleString('hu-HU')+' Ft'}
  function num(x,u){return x===undefined||x===null||x===''?'—':Number(x||0).toLocaleString('hu-HU')+(u?' '+u:'')}
  function item(label,value,full){return `<div class="mp-item${full?' mp-full':''}"><div class="mp-label">${esc(label)}</div><div class="mp-value">${esc(value)}</div></div>`}
  function section(title,items){return `<section class="mp-section"><h3>${esc(title)}</h3><div class="mp-grid">${items.join('')}</div></section>`}
  function root(){return document.getElementById('content')||document.querySelector('.content')}

  function profile(id){
    const m=arr().find(x=>String(x.id)===String(id));
    if(!m) return;
    const r=root();
    if(!r) return;

    const tabs=[
      ['base','Általános'],['tech','Műszaki'],['docs','Okmányok'],
      ['service','Szerviz'],['cost','Költségek'],['notes','Megjegyzés']
    ];

    const pane=t=>{
      if(t==='tech') return section('Műszaki adatok',[
        item('Üzemóra',num(m.hours,'h')),item('Kilométeróra',num(m.odometer,'km')),
        item('Következő szerviz km',num(m.service_km,'km')),
        item('Következő szerviz üzemóra',num(m.service_hours,'h')),
        item('Következő szerviz dátuma',val(m,'service_date')),
        item('Üzemanyag',fuelLabels[m.fuel]||val(m,'fuel')),
        item('Hengerűrtartalom',num(m.engine_cc,'cm³')),
        item('Teljesítmény',num(m.power_hp,'LE')),
        item('Teljesítmény',num(m.power_kw,'kW')),
        item('Sebességváltó',val(m,'transmission')),item('Meghajtás',val(m,'drive')),
        item('Karosszéria / kivitel',val(m,'body')),item('Szín',val(m,'color')),
        item('Gumiabroncs méret',val(m,'tire_size')),item('Saját tömeg',num(m.weight,'kg')),
        item('Megengedett össztömeg',num(m.gvw,'kg'))
      ]);
      if(t==='docs') return section('Okmányok és biztosítás',[
        item('Műszaki vizsga lejárata',val(m,'mot_expiry')),
        item('Kötelező biztosítás lejárata',val(m,'insurance_expiry')),
        item('Casco lejárata',val(m,'casco_expiry')),
        item('Útdíj / matrica lejárata',val(m,'toll_expiry')),
        item('Forgalmi dokumentum',val(m,'registration_doc')),
        item('Biztosító',val(m,'insurer')),item('Biztosítás kötvényszáma',val(m,'policy_no'))
      ]);
      if(t==='service') return section('Szerviz',[
        item('Utolsó szerviz dátuma',val(m,'last_service_date')),
        item('Utolsó szerviz km / üzemóra',val(m,'last_service_meter')),
        item('Szervizhely / szerelő',val(m,'service_provider')),
        item('Utolsó szerviz költsége',money(m.last_service_cost)),
        item('Következő szerviz megjegyzés',val(m,'service_note'),true)
      ]);
      if(t==='cost') return section('Költségek',[
        item('Havi átlagos üzemanyagköltség',money(m.fuel_cost_month)),
        item('Éves szervizköltség',money(m.service_cost_year)),
        item('Éves biztosítási költség',money(m.insurance_cost_year)),
        item('Egyéb éves költség',money(m.other_cost_year))
      ]);
      if(t==='notes') return section('Megjegyzés és felelős',[
        item('Megjegyzés',val(m,'notes'),true),item('Felelős / használó',val(m,'responsible'),true)
      ]);
      return section('Alapadatok',[
        item('Eszköz neve',val(m,'name')),item('Eszköztípus',typeLabels[m.asset_type]||val(m,'asset_type')),
        item('Belső azonosító',val(m,'asset_code')),item('Gyártó',val(m,'make')),
        item('Típus / modell',val(m,'model')),item('Évjárat',val(m,'year')),
        item('Rendszám',val(m,'plate')),item('Alvázszám (VIN)',val(m,'vin')),
        item('Motorszám',val(m,'engine_no')),item('Beszerzés dátuma',val(m,'purchase_date')),
        item('Beszerzési érték',money(m.purchase_value)),item('Jelenlegi érték',money(m.current_value)),
        item('Állapot',val(m,'status','Üzemképes'))
      ]);
    };

    r.innerHTML=`<div class="machine-page-profile">
      <div class="machine-page-head">
        <div>
          <div class="eyebrow">GÉPPARK / ESZKÖZ ADATLAP</div>
          <h1>${esc(val(m,'name','Névtelen eszköz'))}</h1>
          <div class="machine-page-sub">${esc(typeLabels[m.asset_type]||val(m,'asset_type'))} · ${esc(val(m,'make',''))} ${esc(val(m,'model',''))}</div>
        </div>
        <div class="machine-page-actions">
          <button type="button" class="btn secondary" id="mpBack">← Vissza a gépparkhoz</button>
          <button type="button" class="btn" id="mpEdit">✏️ Szerkesztés</button>
        </div>
      </div>
      <div class="machine-page-tabs">${tabs.map((x,i)=>`<button type="button" class="btn secondary mp-tab${i===0?' active':''}" data-tab="${x[0]}">${x[1]}</button>`).join('')}</div>
      <div id="mpPane">${pane('base')}</div>
    </div>`;

    const title=document.getElementById('title');
    if(title) title.textContent='Géppark';

    r.querySelectorAll('.mp-tab').forEach(b=>b.onclick=()=>{
      r.querySelectorAll('.mp-tab').forEach(x=>x.classList.remove('active'));
      b.classList.add('active');
      r.querySelector('#mpPane').innerHTML=pane(b.dataset.tab);
    });

    r.querySelector('#mpBack').onclick=()=>{
      if(typeof window.nav==='function') window.nav('machines');
      else { window.current='machines'; render(); }
    };
    r.querySelector('#mpEdit').onclick=()=>{
      if(typeof window.editMachine==='function') window.editMachine(id);
    };

    window.scrollTo({top:0,behavior:'smooth'});
  }

  /* Fontos: az Adatlap gomb NEM kap data-action="profile" attribútumot.
     Így a régi modalos modulok nem tudják elfogni. */
  views.machines=()=>'<div class="panel"><div class="panelhead"><h2>Géppark</h2><div style="display:flex;gap:8px"><button class="btn" id="machineNew">+ Új eszköz</button></div></div><div class="tablewrap"><table class="table"><thead><tr><th>Eszköz</th><th>Típus</th><th>Rendszám / azonosító</th><th>Km / üzemóra</th><th>Állapot</th><th>Műveletek</th></tr></thead><tbody>'+
    arr().map(m=>'<tr><td><b>'+esc(m.name||'Névtelen eszköz')+'</b><div class="label">'+esc((m.make||'')+' '+(m.model||''))+'</div></td><td>'+esc(typeLabels[m.asset_type]||m.asset_type||'Egyéb')+'</td><td>'+esc(m.plate||m.asset_code||'—')+'</td><td>'+((Number(m.odometer)||0)?(Number(m.odometer)+' km'):(Number(m.hours)||0)+' h')+'</td><td><span class="badge '+(m.status==='Üzemképes'?'green':m.status==='Szervizre vár'?'amber':'red')+'">'+esc(m.status||'Üzemképes')+'</span></td><td><button type="button" class="btn secondary small" data-machine-profile="'+esc(m.id)+'">Adatlap</button> <button type="button" class="btn secondary small" data-machine-edit="'+esc(m.id)+'">Szerkesztés</button></td></tr>').join('')+
    '</tbody></table></div></div>';

  /* Saját eseménykezelés: csak a V3 attribútumokat figyeli. */
  if(!window.__kpMachineV3Bound){
    window.__kpMachineV3Bound=true;
    document.addEventListener('click',function(e){
      const p=e.target.closest('[data-machine-profile]');
      if(p){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();profile(p.getAttribute('data-machine-profile'));return;}
      const ed=e.target.closest('[data-machine-edit]');
      if(ed){e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();if(typeof window.editMachine==='function')window.editMachine(ed.getAttribute('data-machine-edit'));}
    },true);
  }

  window.machineProfile=profile;
  window.machineProfilePage=profile;
  window.__kpMachineProfile=profile;

  const styleId='kp-machine-v3-style';
  if(!document.getElementById(styleId)){
    const s=document.createElement('style');s.id=styleId;s.textContent=`
      .machine-page-profile{display:block;width:100%}
      .machine-page-head{display:flex;justify-content:space-between;align-items:flex-start;gap:20px;margin-bottom:18px}
      .machine-page-head h1{margin:4px 0;font-size:28px}
      .machine-page-sub{color:var(--muted);font-size:13px}
      .machine-page-actions{display:flex;gap:8px;flex-wrap:wrap}
      .machine-page-tabs{display:flex;gap:7px;flex-wrap:wrap;margin-bottom:16px}
      .machine-page-tabs .active{background:#dbeafe;color:#1d4ed8}
      .mp-section{background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px;box-shadow:var(--shadow);margin-bottom:16px}
      .mp-section h3{margin:0 0 14px;font-size:16px}
      .mp-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px}
      .mp-item{border:1px solid #e1e7ed;border-radius:9px;padding:12px;background:#fbfcfd;min-height:58px}
      .mp-full{grid-column:1/-1}
      .mp-label{font-size:11px;color:var(--muted);margin-bottom:5px}
      .mp-value{font-size:14px;font-weight:650;word-break:break-word;white-space:pre-wrap}
      @media(max-width:700px){.machine-page-head{flex-direction:column}.mp-grid{grid-template-columns:1fr}.mp-full{grid-column:auto}}
    `;document.head.appendChild(s);
  }
  return true;
}

let tries=0;
(function boot(){if(install()||tries++>120)return;setTimeout(boot,250)})();
})();
