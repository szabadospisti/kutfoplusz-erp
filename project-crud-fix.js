/* Kútfő Plusz ERP – Projektek stabil CRUD
 * Ugyanaz a működési minta, mint a működő Géppark / Anyag-Raktár CRUD:
 * közvetlen DOM esemény -> db.projects módosítás -> save() -> render().
 */
(function installProjectCrud(){
  'use strict';
  if(typeof window.db==='undefined' || typeof window.views==='undefined' || typeof window.render!=='function'){
    setTimeout(installProjectCrud,250); return;
  }

  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const projects=()=>Array.isArray(window.db.projects)?window.db.projects:[];
  const customers=()=>Array.isArray(window.db.customers)?window.db.customers:[];
  const customerName=p=>{
    const id=p.customerId ?? p.customer_id;
    const c=customers().find(x=>String(x.id)===String(id));
    return c?.company_name || c?.name || p.customer_name || '—';
  };

  function persist(){
    try{
      if(typeof window.localSaveOnly==='function') window.localSaveOnly();
      else localStorage.setItem('kutfoplusz_erp_db',JSON.stringify(window.db));
      if(typeof window.save==='function'){
        const r=window.save();
        if(r&&typeof r.catch==='function')r.catch(e=>console.error('Projekt Supabase háttérszinkron:',e));
      }
      return true;
    }catch(e){
      console.error('Projekt mentés:',e);
      alert('A projekt mentése nem sikerült.\n\n'+(e?.message||e));
      return false;
    }
  }

  function closeEditor(){document.getElementById('kpProjectEdit')?.remove();}

  function openProjectEditor(id){
    const p=projects().find(x=>String(x.id)===String(id));
    if(!p)return;
    const customerId=p.customerId ?? p.customer_id ?? '';
    document.getElementById('kpProjectEdit')?.remove();
    const m=document.createElement('div');
    m.id='kpProjectEdit'; m.className='modal';
    m.innerHTML=`<div class="modalbox"><div class="modalhead"><h2>Projekt szerkesztése</h2><button class="icon" data-close>×</button></div>
      <div class="modalbody"><div class="formgrid">
        <div class="field"><label>Projekt neve</label><input required class="input" id="kpPName" value="${esc(p.name||'')}"></div>
        <div class="field"><label>Projektazonosító</label><input class="input" value="${esc(p.project_number||'')}" readonly></div>
        <div class="field full"><label>Megrendelő</label><select class="select" id="kpPCustomer"><option value="">— Nincs megrendelő —</option>${customers().map(c=>`<option value="${esc(c.id)}" ${String(c.id)===String(customerId)?'selected':''}>${esc(c.company_name||c.name||c.id)}</option>`).join('')}</select></div>
        <div class="field full"><label>Helyszín</label><input class="input" id="kpPLocation" value="${esc(p.location||'')}"></div>
        <div class="field"><label>Státusz</label><select class="select" id="kpPStatus">${['interest','quote','contracted','active','completed','cancelled'].map(s=>`<option value="${s}" ${String(p.status||'interest')===s?'selected':''}>${esc(({interest:'Érdeklődés',quote:'Ajánlat',contracted:'Szerződött',active:'Folyamatban',completed:'Befejezett',cancelled:'Lezárt'}[s]||s))}</option>`).join('')}</select></div>
        <div class="field"><label>Szerződéses érték</label><input class="input" type="number" step="0.01" id="kpPValue" value="${Number(p.contract_value)||0}"></div>
        <div class="field"><label>Tervezett kezdés</label><input class="input" type="date" id="kpPStart" value="${esc(p.start_date||'')}"></div>
        <div class="field"><label>Tervezett befejezés</label><input class="input" type="date" id="kpPEnd" value="${esc(p.planned_end_date||'')}"></div>
      </div><div class="modalfoot"><button class="btn danger" data-delete>🗑️ Törlés</button><span style="flex:1"></span><button class="btn secondary" data-cancel>Mégse</button><button class="btn" data-save>💾 Mentés</button></div></div></div>`;
    document.body.appendChild(m);
    m.querySelector('[data-close]').onclick=closeEditor;
    m.querySelector('[data-cancel]').onclick=closeEditor;
    m.querySelector('[data-delete]').onclick=()=>window.kpDeleteProject(id);
    m.querySelector('[data-save]').onclick=()=>{
      const before=JSON.parse(JSON.stringify(p));
      p.name=m.querySelector('#kpPName').value.trim();
      p.location=m.querySelector('#kpPLocation').value.trim();
      p.customerId=m.querySelector('#kpPCustomer').value||'';
      p.customer_id=p.customerId;
      p.status=m.querySelector('#kpPStatus').value||p.status||'interest';
      p.contract_value=Number(m.querySelector('#kpPValue').value)||0;
      p.start_date=m.querySelector('#kpPStart').value||'';
      p.planned_end_date=m.querySelector('#kpPEnd').value||'';
      if(!persist()){Object.assign(p,before);return;}
      closeEditor();
      window.render();
      if(typeof window.toast==='function')window.toast('Projekt módosítva és mentve');
    };
  }

  window.kpEditProject=openProjectEditor;
  window.kpDeleteProject=function(id){
    const p=projects().find(x=>String(x.id)===String(id)); if(!p)return;
    if(!confirm(`Biztosan törlöd a(z) „${p.name||p.project_number||id}” projektet?\n\nA törlés végleges.`))return;
    const old=window.db.projects.slice();
    window.db.projects=window.db.projects.filter(x=>String(x.id)!==String(id));
    if(!persist()){window.db.projects=old;return;}
    closeEditor(); window.render();
    if(typeof window.toast==='function')window.toast('Projekt törölve és mentve');
  };

  window.views.projects=function(){
    const list=projects();
    return `<div class="panel"><div class="panelhead"><h2>Projektek</h2><button class="btn" id="kpNewProject">+ Új projekt</button></div>
      <div class="tablewrap"><table class="table"><thead><tr><th>Projekt</th><th>Megrendelő</th><th>Helyszín</th><th>Státusz</th><th>Műveletek</th></tr></thead><tbody>
      ${list.map(p=>`<tr><td><a class="link" data-edit="${esc(p.id)}"><b>${esc(p.name||'Névtelen projekt')}</b></a><div class="label">${esc(p.project_number||'')}</div></td><td>${esc(customerName(p))}</td><td>${esc(p.location||'—')}</td><td><span class="badge ${p.status==='active'?'green':p.status==='completed'?'blue':p.status==='cancelled'?'red':'amber'}">${esc(({interest:'Érdeklődés',quote:'Ajánlat',contracted:'Szerződött',active:'Folyamatban',completed:'Befejezett',cancelled:'Lezárt'}[p.status]||p.status||'—'))}</span></td><td><div style="display:flex;gap:6px"><button class="btn secondary small" data-edit="${esc(p.id)}">✏️ Szerkesztés</button><button class="btn danger small" data-delete="${esc(p.id)}">🗑️ Törlés</button></div></td></tr>`).join('')||'<tr><td colspan="5" class="empty">Nincs projekt.</td></tr>'}</tbody></table></div></div>`;
  };

  const oldRender=window.render;
  window.render=function(){
    oldRender();
    if(typeof window.current!=='undefined' && window.current==='projects'){
      const root=document.querySelector('.content'); if(!root)return;
      root.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>openProjectEditor(b.dataset.edit));
      root.querySelectorAll('[data-delete]').forEach(b=>b.onclick=()=>window.kpDeleteProject(b.dataset.delete));
      const n=root.querySelector('#kpNewProject'); if(n)n.onclick=()=>{if(typeof window.newProject==='function')window.newProject();};
    }
  };
  if(window.current==='projects')window.render();
})();
