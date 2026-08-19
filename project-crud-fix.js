/* Kútfő Plusz ERP – Projektek stabil CRUD
 * A szerkesztés közvetlenül a Supabase projects táblát használja.
 */
(function installProjectCrud(){
  'use strict';
  const page=()=>location.hash.replace(/^#\//,'')||'dashboard';
  if(typeof window.db==='undefined'||typeof window.views==='undefined'||typeof window.render!=='function'){setTimeout(installProjectCrud,250);return;}
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const projects=()=>Array.isArray(window.db.projects)?window.db.projects:[];
  const customers=()=>Array.isArray(window.db.customers)?window.db.customers:[];
  const customerName=p=>{const id=p.customerId??p.customer_id;const c=customers().find(x=>String(x.id)===String(id)||String(x.supabaseId)===String(id));return c?.company_name||c?.name||p.customerName||p.customer_name||'—'};
  const labels={interest:'Érdeklődés',quote:'Ajánlat',contracted:'Szerződött',active:'Folyamatban',completed:'Befejezett',cancelled:'Lezárt'};

  async function saveRemote(p){
    if(!window.KPSupabaseSync||typeof window.KPSupabaseSync.saveProjectRemote!=='function')throw new Error('A projekt Supabase mentési modulja nem érhető el.');
    const remote=await window.KPSupabaseSync.saveProjectRemote(p);
    /* The projects table is the authoritative source. erp_state is only a secondary local snapshot. */
    try{if(typeof window.save==='function')await window.save();}catch(e){console.warn('erp_state másodlagos mentés:',e);}
    return remote;
  }
  async function reloadProjects(){
    if(window.KPSupabaseSync&&typeof window.KPSupabaseSync.loadProjects==='function')await window.KPSupabaseSync.loadProjects();
  }
  function closeEditor(){document.getElementById('kpProjectEdit')?.remove();}

  async function openProjectEditor(id){
    const p=projects().find(x=>String(x.id)===String(id)||String(x.supabaseId)===String(id));if(!p)return;
    document.getElementById('kpProjectEdit')?.remove();
    const customerId=p.customerId??p.customer_id??'';
    const m=document.createElement('div');m.id='kpProjectEdit';m.className='modal';
    m.innerHTML=`<div class="modalbox"><div class="modalhead"><h2>Projekt szerkesztése</h2><button class="icon" data-close>×</button></div><div class="modalbody"><div class="formgrid">
      <div class="field"><label>Projekt neve</label><input required class="input" id="kpPName" value="${esc(p.name||'')}"></div>
      <div class="field"><label>Projektazonosító</label><input class="input" value="${esc(p.project_number||p.id||'')}" readonly></div>
      <div class="field full"><label>Megrendelő</label><select class="select" id="kpPCustomer"><option value="">— Nincs megrendelő —</option>${customers().map(c=>`<option value="${esc(c.id)}" ${String(c.id)===String(customerId)?'selected':''}>${esc(c.company_name||c.name||c.id)}</option>`).join('')}</select></div>
      <div class="field full"><label>Helyszín</label><input class="input" id="kpPLocation" value="${esc(p.location||'')}"></div>
      <div class="field"><label>Státusz</label><select class="select" id="kpPStatus">${Object.entries(labels).map(([s,l])=>`<option value="${s}" ${String(p.status||'interest')===s?'selected':''}>${l}</option>`).join('')}</select></div>
      <div class="field"><label>Szerződéses érték</label><input class="input" type="number" step="0.01" id="kpPValue" value="${Number(p.value??p.contract_value)||0}"></div>
      <div class="field"><label>Tervezett költség</label><input class="input" type="number" step="0.01" id="kpPPlanned" value="${Number(p.planned??p.planned_cost)||0}"></div>
      <div class="field"><label>Tényleges költség</label><input class="input" type="number" step="0.01" id="kpPCost" value="${Number(p.cost??p.actual_cost)||0}"></div>
      <div class="field"><label>Készültség (%)</label><input class="input" type="number" min="0" max="100" step="1" id="kpPProgress" value="${Number(p.progress??p.progress_pct)||0}"></div>
      <div class="field full"><label>Megjegyzés</label><textarea class="input" id="kpPNotes">${esc(p.notes||'')}</textarea></div>
    </div><div class="modalfoot"><button class="btn danger" data-delete>🗑️ Törlés</button><span style="flex:1"></span><button class="btn secondary" data-cancel>Mégse</button><button class="btn" data-save>💾 Mentés</button></div></div></div>`;
    document.body.appendChild(m);
    m.querySelector('[data-close]').onclick=closeEditor;m.querySelector('[data-cancel]').onclick=closeEditor;m.querySelector('[data-delete]').onclick=()=>window.kpDeleteProject(id);
    m.querySelector('[data-save]').onclick=async()=>{
      const btn=m.querySelector('[data-save]');btn.disabled=true;
      const before=JSON.parse(JSON.stringify(p));
      try{
        p.name=m.querySelector('#kpPName').value.trim();
        p.location=m.querySelector('#kpPLocation').value.trim();
        p.customerId=m.querySelector('#kpPCustomer').value||'';p.customer_id=p.customerId;
        p.status=m.querySelector('#kpPStatus').value||'interest';
        p.value=Number(m.querySelector('#kpPValue').value)||0;p.contract_value=p.value;
        p.planned=Number(m.querySelector('#kpPPlanned').value)||0;p.planned_cost=p.planned;
        p.cost=Number(m.querySelector('#kpPCost').value)||0;p.actual_cost=p.cost;
        p.progress=Math.max(0,Math.min(100,Number(m.querySelector('#kpPProgress').value)||0));p.progress_pct=p.progress;
        p.notes=m.querySelector('#kpPNotes').value||'';
        await saveRemote(p);
        await reloadProjects();
        closeEditor();
        if(page()==='projects')window.render();
        if(typeof window.toast==='function')window.toast('Projekt módosítva és Supabase-ben mentve');
      }catch(e){
        Object.assign(p,before);btn.disabled=false;console.error('Projekt mentési hiba:',e);
        alert('A projekt módosítása nem lett véglegesítve.\n\n'+(e.message||e));
      }
    };
  }
  window.kpEditProject=openProjectEditor;

  window.kpDeleteProject=async function(id){
    const p=projects().find(x=>String(x.id)===String(id)||String(x.supabaseId)===String(id));if(!p)return;
    if(!confirm(`Biztosan törlöd a(z) „${p.name||p.project_number||id}” projektet?\n\nA törlés végleges.`))return;
    const old=window.db.projects.slice();window.db.projects=window.db.projects.filter(x=>String(x.id)!==String(id)&&String(x.supabaseId)!==String(id));
    try{if(typeof window.save==='function')await window.save();await reloadProjects();closeEditor();if(page()==='projects')window.render();if(typeof window.toast==='function')window.toast('Projekt törölve és Supabase-ben mentve');}
    catch(e){window.db.projects=old;alert('A projekt törlése nem sikerült.\n\n'+(e.message||e));}
  };

  window.views.projects=function(){const list=projects();return `<div class="panel"><div class="panelhead"><h2>Projektek</h2><button class="btn" id="kpNewProject">+ Új projekt</button></div><div class="tablewrap"><table class="table"><thead><tr><th>Projekt</th><th>Megrendelő</th><th>Helyszín</th><th>Státusz</th><th>Műveletek</th></tr></thead><tbody>${list.map(p=>`<tr><td><a class="link" data-edit="${esc(p.id)}"><b>${esc(p.name||'Névtelen projekt')}</b></a><div class="label">${esc(p.project_number||p.id||'')}</div></td><td>${esc(customerName(p))}</td><td>${esc(p.location||'—')}</td><td><span class="badge ${p.status==='active'?'green':p.status==='completed'?'blue':p.status==='cancelled'?'red':'amber'}">${esc(labels[p.status]||p.status||'—')}</span></td><td><div style="display:flex;gap:6px"><button class="btn secondary small" data-edit="${esc(p.id)}">✏️ Szerkesztés</button><button class="btn danger small" data-delete="${esc(p.id)}">🗑️ Törlés</button></div></td></tr>`).join('')||'<tr><td colspan="5" class="empty">Nincs projekt.</td></tr>'}</tbody></table></div></div>`;};
  const oldRender=window.render;window.render=function(){oldRender();if(page()==='projects'){const root=document.querySelector('.content');if(!root)return;root.querySelectorAll('[data-edit]').forEach(b=>b.onclick=e=>{e.preventDefault();openProjectEditor(b.dataset.edit)});root.querySelectorAll('[data-delete]').forEach(b=>b.onclick=e=>{e.preventDefault();window.kpDeleteProject(b.dataset.delete)});const n=root.querySelector('#kpNewProject');if(n)n.onclick=()=>{if(typeof window.newProject==='function')window.newProject();};}};
  if(page()==='projects')window.render();
})();
