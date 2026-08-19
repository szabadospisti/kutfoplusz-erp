/* Kútfő Plusz ERP – Géppark / teljes gépadatlap
 * A meglévő géptáblára épül. Az alapadatok szerkeszthetők, a géphez
 * külön adatlap, szervizelőzmény és projekt-használat kezelhető.
 */
(function installFleetMachineProfile(){
  const STORE='kp_fleet_profiles_v2';
  const read=()=>{try{return JSON.parse(localStorage.getItem(STORE)||'{}')||{};}catch{return {};}};
  const write=x=>localStorage.setItem(STORE,JSON.stringify(x));
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>Number(v)||0;
  function rowData(tr){
    const c=tr.querySelectorAll('td');
    return {name:(c[0]?.innerText||'').trim(),type:(c[1]?.innerText||'').trim(),hours:num(c[2]?.innerText),serviceHours:num(c[3]?.innerText),status:(c[4]?.innerText||'').trim()};
  }
  function key(d){return (d.name+'|'+d.type).toLowerCase();}
  function get(d){const all=read();return all[key(d)]||{name:d.name,type:d.type,hours:d.hours,serviceHours:d.serviceHours,status:d.status,manufacturer:'',serial:'',plate:'',year:'',serviceDate:'',notes:'',services:[],usage:[]};}
  function save(d,p){const all=read();all[key(d)]={...get(d),...p};write(all);}
  function toast(msg){let t=document.querySelector('#kpFleetToast');if(!t){t=document.createElement('div');t.id='kpFleetToast';t.className='toast';document.body.appendChild(t);}t.textContent=msg;t.classList.add('show');setTimeout(()=>t.classList.remove('show'),1800);}
  function modal(html){const m=document.createElement('div');m.className='modal';m.innerHTML=html;document.body.appendChild(m);return m;}
  function edit(d,tr){
    const p=get(d);
    const m=modal(`<div class="modalbox"><div class="modalhead"><h2>Gép szerkesztése</h2><button class="icon" data-close>×</button></div><div class="modalbody"><div class="formgrid">
      <div class="field"><label>Gép neve</label><input class="input" id="fName" value="${esc(p.name)}"></div>
      <div class="field"><label>Típus / modell</label><input class="input" id="fType" value="${esc(p.type)}"></div>
      <div class="field"><label>Gyártó</label><input class="input" id="fManufacturer" value="${esc(p.manufacturer)}"></div>
      <div class="field"><label>Azonosító / rendszám</label><input class="input" id="fPlate" value="${esc(p.plate)}"></div>
      <div class="field"><label>Alvázszám / sorozatszám</label><input class="input" id="fSerial" value="${esc(p.serial)}"></div>
      <div class="field"><label>Évjárat</label><input class="input" id="fYear" type="number" value="${esc(p.year)}"></div>
      <div class="field"><label>Aktuális üzemóra</label><input class="input" id="fHours" type="number" step="0.1" value="${num(p.hours)}"></div>
      <div class="field"><label>Következő szerviz (üzemóra)</label><input class="input" id="fServiceHours" type="number" step="0.1" value="${num(p.serviceHours)}"></div>
      <div class="field"><label>Következő szerviz dátuma</label><input class="input" id="fServiceDate" type="date" value="${esc(p.serviceDate)}"></div>
      <div class="field"><label>Állapot</label><select class="select" id="fStatus"><option>Üzemképes</option><option>Szervizre vár</option><option>Meghibásodott</option><option>Üzemen kívül</option></select></div>
      <div class="field full"><label>Megjegyzés</label><textarea class="textarea" id="fNotes">${esc(p.notes)}</textarea></div>
      </div><div class="modalfoot"><button class="btn secondary" data-close>Mégse</button><button class="btn" id="fSave">💾 Mentés</button></div></div></div>`);
    m.querySelector('#fStatus').value=p.status||'Üzemképes';
    m.querySelectorAll('[data-close]').forEach(x=>x.onclick=()=>m.remove());
    m.querySelector('#fSave').onclick=()=>{
      const q=id=>m.querySelector('#'+id).value;
      const np={name:q('fName').trim(),type:q('fType').trim(),manufacturer:q('fManufacturer').trim(),plate:q('fPlate').trim(),serial:q('fSerial').trim(),year:q('fYear'),hours:num(q('fHours')),serviceHours:num(q('fServiceHours')),serviceDate:q('fServiceDate'),status:q('fStatus'),notes:q('fNotes')};
      save(d,np);
      if(tr){const c=tr.querySelectorAll('td');if(c[0])c[0].firstChild.textContent=np.name;if(c[1])c[1].textContent=np.type;if(c[2])c[2].textContent=np.hours;if(c[3])c[3].textContent=np.serviceHours;if(c[4])c[4].innerHTML='<span class="badge green">'+esc(np.status)+'</span>';}
      m.remove();toast('Gép adatai elmentve');
    };
  }
  function profile(d){
    const p=get(d), services=p.services||[], usage=p.usage||[];
    const m=modal(`<div class="modalbox" style="max-width:1050px"><div class="modalhead"><div><h2>${esc(p.name)}</h2><div class="sub">${esc(p.type)} · ${esc(p.manufacturer||'Gyártó nincs megadva')}</div></div><button class="icon" data-close>×</button></div><div class="modalbody">
      <div class="cards" style="grid-template-columns:repeat(4,1fr)"><div class="card"><div class="label">Üzemóra</div><div class="value">${num(p.hours)} h</div></div><div class="card"><div class="label">Következő szerviz</div><div class="value">${num(p.serviceHours)} h</div></div><div class="card"><div class="label">Állapot</div><div class="value" style="font-size:17px">${esc(p.status||'Üzemképes')}</div></div><div class="card"><div class="label">Szerviz dátuma</div><div class="value" style="font-size:17px">${esc(p.serviceDate||'—')}</div></div></div>
      <div class="grid2"><div class="panel"><div class="panelhead"><h2>Gép adatai</h2><button class="btn small" id="fpEdit">✏️ Szerkesztés</button></div><div class="kpi"><span>Gyártó</span><b>${esc(p.manufacturer||'—')}</b></div><div class="kpi"><span>Azonosító / rendszám</span><b>${esc(p.plate||'—')}</b></div><div class="kpi"><span>Alvázszám / sorozatszám</span><b>${esc(p.serial||'—')}</b></div><div class="kpi"><span>Évjárat</span><b>${esc(p.year||'—')}</b></div><div class="notice" style="margin-top:12px">${esc(p.notes||'Nincs megjegyzés.')}</div></div>
      <div class="panel"><div class="panelhead"><h2>Szervizelőzmények</h2><button class="btn small" id="fpAddService">+ Szerviz</button></div><div id="fpServices">${services.length?services.map((s,i)=>`<div class="kpi"><span>${esc(s.date||'')} · ${esc(s.type||'Szerviz')} · ${esc(s.hours||0)} h</span><button class="btn danger small" data-del-service="${i}">Törlés</button></div>`).join(''):'<div class="empty">Még nincs rögzített szerviz.</div>'}</div></div></div>
      <div class="panel" style="margin-top:16px"><div class="panelhead"><h2>Projekt / használat</h2><button class="btn small" id="fpAddUsage">+ Használat</button></div><div class="tablewrap"><table class="table"><thead><tr><th>Dátum</th><th>Projekt</th><th>Kezdő óra</th><th>Záró óra</th><th>Ledolgozott</th></tr></thead><tbody>${usage.length?usage.map(u=>`<tr><td>${esc(u.date)}</td><td>${esc(u.project)}</td><td>${esc(u.start)}</td><td>${esc(u.end)}</td><td>${num(u.end)-num(u.start)} h</td></tr>`).join(''):'<tr><td colspan="5" class="empty">Még nincs használat rögzítve.</td></tr>'}</tbody></table></div></div>
      <div class="modalfoot"><button class="btn secondary" data-close>Bezárás</button></div></div></div>`);
    m.querySelectorAll('[data-close]').forEach(x=>x.onclick=()=>m.remove());
    m.querySelector('#fpEdit').onclick=()=>{m.remove();const tr=findRow(d);if(tr)edit(d,tr);};
    m.querySelector('#fpAddService').onclick=()=>addService(d,m);
    m.querySelector('#fpAddUsage').onclick=()=>addUsage(d,m);
    m.querySelectorAll('[data-del-service]').forEach(x=>x.onclick=()=>{const a=get(d);a.services.splice(Number(x.dataset.delService),1);save(d,a);m.remove();profile(d);});
  }
  function addService(d,old){const p=get(d);const m=modal(`<div class="modalbox"><div class="modalhead"><h2>Új szerviz</h2><button class="icon" data-close>×</button></div><div class="modalbody"><div class="formgrid"><div class="field"><label>Dátum</label><input class="input" id="sd" type="date"></div><div class="field"><label>Üzemóra</label><input class="input" id="sh" type="number"></div><div class="field full"><label>Szerviz / elvégzett munka</label><input class="input" id="st"></div><div class="field full"><label>Megjegyzés</label><textarea class="textarea" id="sn"></textarea></div></div><div class="modalfoot"><button class="btn secondary" data-close>Mégse</button><button class="btn" id="ss">Mentés</button></div></div></div>`);m.querySelectorAll('[data-close]').forEach(x=>x.onclick=()=>m.remove());m.querySelector('#ss').onclick=()=>{p.services=p.services||[];p.services.push({date:m.querySelector('#sd').value,hours:num(m.querySelector('#sh').value),type:m.querySelector('#st').value,notes:m.querySelector('#sn').value});save(d,p);m.remove();old.remove();profile(d);};}
  function addUsage(d,old){const p=get(d);const m=modal(`<div class="modalbox"><div class="modalhead"><h2>Projekt / használat</h2><button class="icon" data-close>×</button></div><div class="modalbody"><div class="formgrid"><div class="field"><label>Dátum</label><input class="input" id="ud" type="date"></div><div class="field"><label>Projekt</label><input class="input" id="up"></div><div class="field"><label>Kezdő üzemóra</label><input class="input" id="us" type="number"></div><div class="field"><label>Záró üzemóra</label><input class="input" id="ue" type="number"></div></div><div class="modalfoot"><button class="btn secondary" data-close>Mégse</button><button class="btn" id="uu">Mentés</button></div></div></div>`);m.querySelectorAll('[data-close]').forEach(x=>x.onclick=()=>m.remove());m.querySelector('#uu').onclick=()=>{p.usage=p.usage||[];p.usage.push({date:m.querySelector('#ud').value,project:m.querySelector('#up').value,start:num(m.querySelector('#us').value),end:num(m.querySelector('#ue').value)});p.hours=Math.max(p.hours,num(m.querySelector('#ue').value));save(d,p);m.remove();old.remove();profile(d);};}
  function findRow(d){return [...document.querySelectorAll('table tr')].find(tr=>{const c=tr.querySelectorAll('td');return c.length>=5 && (c[0]?.innerText||'').trim()===d.name && (c[1]?.innerText||'').trim()===d.type;});}
  function hook(){
    const rows=[...document.querySelectorAll('table tr')].filter(tr=>tr.querySelectorAll('td').length>=5);
    rows.forEach(tr=>{if(tr.dataset.kpFleetBound)return;tr.dataset.kpFleetBound='1';const d=rowData(tr);const td=document.createElement('td');td.className='fleet-actions';td.innerHTML='<button class="btn secondary small" data-fleet-profile>Adatlap</button> <button class="btn small" data-fleet-edit>✏️ Szerkesztés</button> <button class="btn danger small" data-fleet-delete>🗑️ Törlés</button>';tr.appendChild(td);td.querySelector('[data-fleet-profile]').onclick=()=>profile(d);td.querySelector('[data-fleet-edit]').onclick=()=>edit(d,tr);td.querySelector('[data-fleet-delete]').onclick=()=>{if(!confirm('Biztosan törlöd ezt a gépet?'))return;tr.remove();const all=read();delete all[key(d)];write(all);toast('Gép törölve');};});
    const h=[...document.querySelectorAll('h2')].find(x=>x.textContent.trim()==='Géppark');if(h&&!document.getElementById('kpFleetEditAll')){const b=document.createElement('button');b.id='kpFleetEditAll';b.className='btn secondary small';b.textContent='✏️ Géppark szerkesztése';b.onclick=()=>{const first=[...document.querySelectorAll('table tr')].find(tr=>tr.querySelectorAll('td').length>=5);if(first)edit(rowData(first),first);};h.parentElement?.appendChild(b);}
  }
  const start=()=>{hook();new MutationObserver(hook).observe(document.body,{childList:true,subtree:true});};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();
})();
