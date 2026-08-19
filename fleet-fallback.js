/* Kútfő Plusz ERP – Géppark tartós műveletek
 * A géptáblát közvetlenül a renderelő views.machines függvényben bővíti,
 * ezért a műveletek nem tűnnek el egy újrarenderelés után.
 */
(function installFleetPersistent(){
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function editMachine(id){
    const m=db.machines.find(x=>x.id===id); if(!m)return;
    openModal('Gép szerkesztése',`<form onsubmit="kpSaveMachineEdit(event,'${esc(id)}')">
      <div class="formgrid">
        <div class="field"><label>Gép neve</label><input required class="input" name="name" value="${esc(m.name)}"></div>
        <div class="field"><label>Típus / modell</label><input class="input" name="model" value="${esc(m.model)}"></div>
        <div class="field"><label>Üzemóra</label><input class="input" type="number" step="0.1" name="hours" value="${Number(m.hours)||0}"></div>
        <div class="field"><label>Következő szerviz</label><input class="input" type="number" step="0.1" name="service" value="${Number(m.service)||0}"></div>
        <div class="field"><label>Állapot</label><select class="select" name="status"><option ${m.status==='Üzemképes'?'selected':''}>Üzemképes</option><option ${m.status==='Szervizre vár'?'selected':''}>Szervizre vár</option><option ${m.status==='Meghibásodott'?'selected':''}>Meghibásodott</option><option ${m.status==='Üzemen kívül'?'selected':''}>Üzemen kívül</option></select></div>
        <div class="field full"><label>Megjegyzés</label><textarea class="textarea" name="notes">${esc(m.notes||'')}</textarea></div>
      </div>
      <div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">💾 Változtatások mentése</button></div>
    </form>`);
  }

  window.kpSaveMachineEdit=function(e,id){
    e.preventDefault();
    const m=db.machines.find(x=>x.id===id); if(!m)return;
    const o=Object.fromEntries(new FormData(e.target).entries());
    Object.assign(m,{name:o.name.trim(),model:o.model.trim(),hours:Number(o.hours)||0,service:Number(o.service)||0,status:o.status,notes:o.notes||''});
    save();closeModal();render();toast('Gép adatai elmentve');
  };

  window.kpDeleteMachine=function(id){
    const m=db.machines.find(x=>x.id===id); if(!m)return;
    if(!confirm(`Biztosan törlöd a(z) „${m.name}” gépet?`))return;
    db.machines=db.machines.filter(x=>x.id!==id);
    save();render();toast('Gép törölve');
  };

  window.kpMachineProfile=function(id){
    const m=db.machines.find(x=>x.id===id); if(!m)return;
    openModal('Gép adatlap',`<div>
      <div class="cards" style="grid-template-columns:repeat(3,1fr)">
        <div class="card"><div class="label">Gép</div><div class="value" style="font-size:18px">${esc(m.name)}</div></div>
        <div class="card"><div class="label">Típus / modell</div><div class="value" style="font-size:18px">${esc(m.model||'—')}</div></div>
        <div class="card"><div class="label">Állapot</div><div class="value" style="font-size:18px">${esc(m.status||'Üzemképes')}</div></div>
      </div>
      <div class="kpi"><span>Aktuális üzemóra</span><b>${Number(m.hours)||0} h</b></div>
      <div class="kpi"><span>Következő szerviz</span><b>${Number(m.service)||0} h</b></div>
      <div class="notice" style="margin-top:12px">${esc(m.notes||'Nincs megjegyzés.')}</div>
      <div class="modalfoot"><button class="btn secondary" onclick="closeModal()">Bezárás</button><button class="btn" onclick="closeModal();kpEditMachine('${esc(id)}')">✏️ Szerkesztés</button></div>
    </div>`);
  };
  window.kpEditMachine=editMachine;

  views.machines=function(){
    const list=Array.isArray(db.machines)?db.machines:[];
    return `<div class="panel"><div class="panelhead"><div><h2>Géppark</h2><div class="label">Gépek, üzemórák és szervizadatok</div></div><div style="display:flex;gap:8px"><button class="btn secondary" onclick="newMachine()">+ Új gép</button><button id="kpFleetEditAll" class="btn secondary" onclick="kpFleetEditFirst()">✏️ Géppark szerkesztése</button></div></div>
      <div class="tablewrap"><table class="table"><thead><tr><th>Gép</th><th>Típus</th><th>Üzemóra</th><th>Szerviz</th><th>Állapot</th><th>Művelet</th></tr></thead><tbody>
      ${list.map(m=>`<tr data-kp-fleet-bound="1"><td><b>${esc(m.name)}</b></td><td>${esc(m.model||'')}</td><td>${Number(m.hours)||0}</td><td>${Number(m.service)||0}</td><td><span class="badge ${m.status==='Üzemképes'?'green':m.status==='Meghibásodott'?'red':'amber'}">${esc(m.status||'Üzemképes')}</span></td><td class="fleet-actions mfdfAction" data-fleet-fallback="1"><button class="btn secondary small" onclick="kpMachineProfile('${esc(m.id)}')">Adatlap</button> <button class="btn small" onclick="kpEditMachine('${esc(m.id)}')">✏️ Szerkesztés</button> <button class="btn danger small" onclick="kpDeleteMachine('${esc(m.id)}')">🗑️ Törlés</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty">Nincs gép rögzítve.</td></tr>'}
      </tbody></table></div></div>`;
  };
  window.kpFleetEditFirst=function(){const m=db.machines?.[0];if(m)editMachine(m.id);else newMachine();};
})();