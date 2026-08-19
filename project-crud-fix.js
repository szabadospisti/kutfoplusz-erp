/* Kútfő Plusz ERP – Projektek stabil CRUD
 * Ugyanazt a működési mintát használja, mint az Anyag/Raktár és a Géppark:
 * db.projects módosítása -> save() -> closeModal() -> render().
 */
(function installProjectCrud(){
  'use strict';

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const projects=()=>Array.isArray(db?.projects)?db.projects:[];
  const customers=()=>Array.isArray(db?.customers)?db.customers:[];
  const customerName=p=>{
    const id=p.customerId ?? p.customer_id;
    const c=customers().find(x=>String(x.id)===String(id));
    return c?.company_name || c?.name || p.customer_name || '—';
  };

  function close(){ if(typeof closeModal==='function') closeModal(); else document.querySelector('.modal')?.remove(); }
  function refresh(){ if(typeof render==='function') render(); }
  function persist(){
    try{ if(typeof save==='function') save(); else localStorage.setItem('kutfoplusz_erp_db',JSON.stringify(db)); }
    catch(e){ console.error('Projekt mentés:',e); }
  }

  function openProjectEditor(id){
    const p=projects().find(x=>String(x.id)===String(id));
    if(!p)return;
    const customerId=p.customerId ?? p.customer_id ?? '';
    const body=`<form onsubmit="kpSaveProjectEdit(event,'${esc(p.id)}')">
      <div class="formgrid">
        <div class="field"><label>Projekt neve</label><input required class="input" name="name" value="${esc(p.name||'')}"></div>
        <div class="field"><label>Projektazonosító</label><input class="input" name="project_number" value="${esc(p.project_number||'')}" readonly></div>
        <div class="field full"><label>Megrendelő</label><select class="select" name="customerId">
          <option value="">— Nincs megrendelő —</option>
          ${customers().map(c=>`<option value="${esc(c.id)}" ${String(c.id)===String(customerId)?'selected':''}>${esc(c.company_name||c.name||c.id)}</option>`).join('')}
        </select></div>
        <div class="field full"><label>Helyszín</label><input class="input" name="location" value="${esc(p.location||'')}"></div>
        <div class="field"><label>Státusz</label><select class="select" name="status">
          ${['interest','quote','contracted','active','completed','cancelled'].map(s=>`<option value="${s}" ${String(p.status||'interest')===s?'selected':''}>${esc(({interest:'Érdeklődés',quote:'Ajánlat',contracted:'Szerződött',active:'Folyamatban',completed:'Befejezett',cancelled:'Lezárt'}[s]||s))}</option>`).join('')}
        </select></div>
        <div class="field"><label>Szerződéses érték</label><input class="input" type="number" step="0.01" name="contract_value" value="${Number(p.contract_value)||0}"></div>
        <div class="field"><label>Tervezett kezdés</label><input class="input" type="date" name="start_date" value="${esc(p.start_date||'')}"></div>
        <div class="field"><label>Tervezett befejezés</label><input class="input" type="date" name="planned_end_date" value="${esc(p.planned_end_date||'')}"></div>
      </div>
      <div class="modalfoot">
        <button type="button" class="btn danger" onclick="kpDeleteProject('${esc(p.id)}')">Törlés</button>
        <span style="flex:1"></span>
        <button type="button" class="btn secondary" onclick="closeModal()">Mégse</button>
        <button class="btn">Mentés</button>
      </div>
    </form>`;
    openModal('Projekt szerkesztése',body);
  }

  window.kpEditProject=openProjectEditor;
  window.kpSaveProjectEdit=function(e,id){
    e.preventDefault();
    const p=projects().find(x=>String(x.id)===String(id));
    if(!p)return;
    const o=Object.fromEntries(new FormData(e.target).entries());
    p.name=String(o.name||'').trim();
    p.location=String(o.location||'').trim();
    p.customerId=String(o.customerId||'');
    p.customer_id=p.customerId;
    p.status=String(o.status||p.status||'interest');
    p.contract_value=Number(o.contract_value)||0;
    p.start_date=o.start_date||'';
    p.planned_end_date=o.planned_end_date||'';
    persist();
    close();
    refresh();
    if(typeof toast==='function')toast('Projekt módosítva');
  };

  window.kpDeleteProject=function(id){
    const p=projects().find(x=>String(x.id)===String(id));
    if(!p)return;
    if(!confirm(`Biztosan törlöd a(z) „${p.name||p.project_number||id}” projektet?\n\nA törlés végleges.`))return;
    db.projects=db.projects.filter(x=>String(x.id)!==String(id));
    persist();
    close();
    refresh();
    if(typeof toast==='function')toast('Projekt törölve');
  };

  /* A meglévő projektlistát egységes, stabil CRUD-listára cseréljük. */
  views.projects=function(){
    const list=projects();
    return `<div class="panel">
      <div class="panelhead"><h2>Projektek</h2><button class="btn" onclick="newProject()">+ Új projekt</button></div>
      <div class="tablewrap"><table class="table">
        <thead><tr><th>Projekt</th><th>Megrendelő</th><th>Helyszín</th><th>Státusz</th><th>Műveletek</th></tr></thead>
        <tbody>${list.map(p=>`<tr>
          <td><a class="link" onclick="kpEditProject('${esc(p.id)}')"><b>${esc(p.name||'Névtelen projekt')}</b></a><div class="label">${esc(p.project_number||'')}</div></td>
          <td>${esc(customerName(p))}</td>
          <td>${esc(p.location||'—')}</td>
          <td><span class="badge ${p.status==='active'?'green':p.status==='completed'?'blue':p.status==='cancelled'?'red':'amber'}">${esc(({interest:'Érdeklődés',quote:'Ajánlat',contracted:'Szerződött',active:'Folyamatban',completed:'Befejezett',cancelled:'Lezárt'}[p.status]||p.status||'—'))}</span></td>
          <td><div style="display:flex;gap:6px;align-items:center"><button class="btn secondary small" onclick="kpEditProject('${esc(p.id)}')">Szerkesztés</button><button class="btn danger small" onclick="kpDeleteProject('${esc(p.id)}')">Törlés</button></div></td>
        </tr>`).join('')||'<tr><td colspan="5" class="empty">Nincs projekt.</td></tr>'}</tbody>
      </table></div>
    </div>`;
  };

  if(typeof render==='function' && typeof current!=='undefined' && current==='projects') refresh();
})();
