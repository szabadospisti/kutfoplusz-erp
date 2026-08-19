/* Kútfő Plusz ERP – Géppark műveletek
 * A meglévő db.machines adatmodellt használja. A nézetet közvetlenül felülírja,
 * ezért a DOM-injektálás sorrendjétől függetlenül megjelenik a műveleti oszlop.
 */
(function installMachineFleetActions(){
  if(typeof views==='undefined' || typeof db==='undefined') return;
  const safeEsc = typeof esc==='function' ? esc : (v)=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const save = typeof localSaveOnly==='function' ? localSaveOnly : ()=>localStorage.setItem('erp_db',JSON.stringify(db));
  const renderNow=()=>{ if(typeof render==='function'){ render(); } };

  function modal(id, title, body, foot){
    document.getElementById(id)?.remove();
    const m=document.createElement('div'); m.id=id; m.className='modal';
    m.innerHTML=`<div class="modalbox" style="max-width:820px"><div class="modalhead"><h2>${title}</h2><button class="icon" type="button" data-close>×</button></div><div class="modalbody">${body}${foot?`<div class="modalfoot">${foot}</div>`:''}</div></div>`;
    document.body.appendChild(m);
    m.querySelector('[data-close]').onclick=()=>m.remove();
    return m;
  }

  function editMachine(id){
    const m=(db.machines||[]).find(x=>String(x.id)===String(id)); if(!m)return;
    const body=`<div class="formgrid">
      <div class="field"><label>Gép neve</label><input class="input" id="mfaName" value="${safeEsc(m.name)}"></div>
      <div class="field"><label>Típus / modell</label><input class="input" id="mfaModel" value="${safeEsc(m.model)}"></div>
      <div class="field"><label>Üzemóra</label><input class="input" type="number" id="mfaHours" value="${Number(m.hours)||0}"></div>
      <div class="field"><label>Következő szerviz</label><input class="input" type="number" id="mfaService" value="${Number(m.service)||0}"></div>
      <div class="field"><label>Állapot</label><select class="select" id="mfaStatus"><option ${m.status==='Üzemképes'?'selected':''}>Üzemképes</option><option ${m.status==='Szervizre vár'?'selected':''}>Szervizre vár</option><option ${m.status==='Meghibásodott'?'selected':''}>Meghibásodott</option><option ${m.status==='Üzemen kívül'?'selected':''}>Üzemen kívül</option></select></div>
      <div class="field"><label>Azonosító</label><input class="input" id="mfaId" value="${safeEsc(m.id||'')}"></div>
      <div class="field full"><label>Megjegyzés</label><textarea class="textarea" id="mfaNotes">${safeEsc(m.notes||'')}</textarea></div>
    </div>`;
    const foot=`<button class="btn danger" id="mfaDelete" type="button">🗑️ Gép törlése</button><button class="btn secondary" data-cancel type="button">Mégse</button><button class="btn" id="mfaSave" type="button">💾 Mentés</button>`;
    const box=modal('mfaModal','Gép szerkesztése',body,foot);
    box.querySelector('[data-cancel]').onclick=()=>box.remove();
    box.querySelector('#mfaSave').onclick=()=>{
      m.name=box.querySelector('#mfaName').value.trim();
      m.model=box.querySelector('#mfaModel').value.trim();
      m.hours=Number(box.querySelector('#mfaHours').value)||0;
      m.service=Number(box.querySelector('#mfaService').value)||0;
      m.status=box.querySelector('#mfaStatus').value;
      m.notes=box.querySelector('#mfaNotes').value.trim();
      save(); box.remove(); renderNow();
    };
    box.querySelector('#mfaDelete').onclick=()=>{
      if(!confirm(`Biztosan törlöd a(z) „${m.name}” gépet?`))return;
      const i=db.machines.indexOf(m); if(i>=0)db.machines.splice(i,1);
      save(); box.remove(); renderNow();
    };
  }

  function profileMachine(id){
    const m=(db.machines||[]).find(x=>String(x.id)===String(id)); if(!m)return;
    const uses=(db.machine_usage||db.machineUsage||[]).filter(x=>String(x.machine_id||x.machineId)===String(id));
    const services=(db.machine_service||db.machineService||[]).filter(x=>String(x.machine_id||x.machineId)===String(id));
    const body=`<div class="cards" style="grid-template-columns:repeat(3,1fr)">
      <div class="card"><div class="label">Gép</div><div class="value" style="font-size:20px">${safeEsc(m.name)}</div></div>
      <div class="card"><div class="label">Üzemóra</div><div class="value">${Number(m.hours)||0} h</div></div>
      <div class="card"><div class="label">Következő szerviz</div><div class="value">${Number(m.service)||0} h</div></div>
    </div>
    <div class="panel" style="margin-top:16px"><div class="panelhead"><h2>Alapadatok</h2><button class="btn secondary" id="mfpEdit">✏️ Szerkesztés</button></div>
      <div class="kpi"><span>Típus / modell</span><b>${safeEsc(m.model||'—')}</b></div>
      <div class="kpi"><span>Állapot</span><b>${safeEsc(m.status||'—')}</b></div>
      <div class="kpi"><span>Azonosító</span><b>${safeEsc(m.id||'—')}</b></div>
      <div class="kpi"><span>Megjegyzés</span><b>${safeEsc(m.notes||'—')}</b></div>
    </div>
    <div class="panel" style="margin-top:16px"><div class="panelhead"><h2>Szervizelőzmények</h2></div>${services.length?services.map(s=>`<div class="kpi"><span>${safeEsc(s.date||'')}</span><b>${safeEsc(s.description||s.note||s.type||'Szerviz')} · ${safeEsc(s.hours||'')} h</b></div>`).join(''):'<div class="empty">Még nincs rögzített szerviz.</div>'}</div>
    <div class="panel" style="margin-top:16px"><div class="panelhead"><h2>Projekt / használat</h2></div>${uses.length?uses.map(u=>`<div class="kpi"><span>${safeEsc(u.date||'')} · ${safeEsc(u.project_id||u.projectId||'')}</span><b>${safeEsc(u.hours||'')} h</b></div>`).join(''):'<div class="empty">Még nincs rögzített használat.</div>'}</div>`;
    const box=modal('mfpModal',`Gépadatlap – ${safeEsc(m.name)}`,body,'');
    box.querySelector('#mfpEdit').onclick=()=>{box.remove();editMachine(id);};
  }

  views.machines=()=>`<div class="panel"><div class="panelhead"><h2>Géppark</h2><div style="display:flex;gap:8px"><button class="btn secondary" onclick="machineFleetBulkEdit()">✏️ Géppark szerkesztése</button><button class="btn" onclick="newMachine()">+ Új gép</button></div></div><div class="tablewrap"><table class="table"><thead><tr><th>Gép</th><th>Típus</th><th>Üzemóra</th><th>Szerviz</th><th>Állapot</th><th>Műveletek</th></tr></thead><tbody>${(db.machines||[]).map(m=>`<tr><td><b>${safeEsc(m.name)}</b></td><td>${safeEsc(m.model)}</td><td>${Number(m.hours)||0}</td><td>${Number(m.service)||0}</td><td><span class="badge ${m.status==='Üzemképes'?'green':m.status==='Szervizre vár'?'amber':'red'}">${safeEsc(m.status||'Üzemképes')}</span></td><td><button class="btn secondary small" onclick="machineProfile('${safeEsc(m.id)}')">Adatlap</button> <button class="btn secondary small" onclick="editMachine('${safeEsc(m.id)}')">✏️ Szerkesztés</button> <button class="btn danger small" onclick="deleteMachine('${safeEsc(m.id)}')">🗑️ Törlés</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty">Nincs gép a gépparkban.</td></tr>'}</tbody></table></div></div>`;

  window.editMachine=editMachine;
  window.machineProfile=profileMachine;
  window.deleteMachine=(id)=>{const m=(db.machines||[]).find(x=>String(x.id)===String(id));if(!m)return;if(!confirm(`Biztosan törlöd a(z) „${m.name}” gépet?`))return;const i=db.machines.indexOf(m);if(i>=0)db.machines.splice(i,1);save();renderNow();};
  window.machineFleetBulkEdit=()=>{
    const rows=(db.machines||[]); if(!rows.length)return;
    const body=`<div class="tablewrap"><table class="table"><thead><tr><th>Gép</th><th>Típus</th><th>Üzemóra</th><th>Szerviz</th></tr></thead><tbody>${rows.map((m,i)=>`<tr><td><input class="input" data-fb="name" data-i="${i}" value="${safeEsc(m.name)}"></td><td><input class="input" data-fb="model" data-i="${i}" value="${safeEsc(m.model)}"></td><td><input class="input" type="number" data-fb="hours" data-i="${i}" value="${Number(m.hours)||0}"></td><td><input class="input" type="number" data-fb="service" data-i="${i}" value="${Number(m.service)||0}"></td></tr>`).join('')}</tbody></table></div>`;
    const box=modal('mfbRealModal','Géppark szerkesztése',body,'<button class="btn secondary" data-cancel>Mégse</button><button class="btn" id="mfbRealSave">💾 Változtatások mentése</button>');
    box.querySelector('[data-cancel]').onclick=()=>box.remove();
    box.querySelector('#mfbRealSave').onclick=()=>{box.querySelectorAll('[data-fb]').forEach(el=>{const m=rows[Number(el.dataset.i)];const k=el.dataset.fb;if(k==='hours'||k==='service')m[k]=Number(el.value)||0;else m[k]=el.value.trim();});save();box.remove();renderNow();};
  };
  if(typeof render==='function' && typeof current!=='undefined' && current==='machines') render();
})();
