/* Kútfő Plusz ERP – Projektek végleges CRUD bridge
 * Egyetlen adatút: db.projects -> központi save() -> erp_state.
 * A lista, adatlap és szerkesztő ugyanazt a normalizált projektobjektumot használja.
 */
(function(){
'use strict';
function install(){
 if(typeof window.db==='undefined'||typeof window.views==='undefined'||typeof window.render!=='function') return false;
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const arr=()=>{window.db.projects=Array.isArray(window.db.projects)?window.db.projects:[];return window.db.projects};
 const customers=()=>Array.isArray(window.db.customers)?window.db.customers:[];
 const customerId=p=>p.customerId??p.customer_id??p.clientId??p.client_id??'';
 const findCustomer=p=>{const id=customerId(p);let c=customers().find(x=>String(x.id)===String(id));if(c)return c;const wanted=String(p.customerName??p.customer_name??p.customer??'').trim().toLowerCase();if(wanted)c=customers().find(x=>String(x.company_name??x.name??'').trim().toLowerCase()===wanted);return c||null};
 const customerName=p=>{const c=findCustomer(p);return c?.company_name||c?.name||p.customerName||p.customer_name||'—'};
 const normalize=p=>{
   const c=findCustomer(p);
   if(c){p.customerId=c.id;p.customer_id=c.id;}
   else if(customerId(p)){p.customerId=customerId(p);p.customer_id=customerId(p);}
   if(p.value==null&&p.contract_value!=null)p.value=p.contract_value;
   if(p.contract_value==null&&p.value!=null)p.contract_value=p.value;
   if(p.planned==null&&p.planned_cost!=null)p.planned=p.planned_cost;
   if(p.planned_cost==null&&p.planned!=null)p.planned_cost=p.planned;
   if(p.cost==null&&p.actual_cost!=null)p.cost=p.actual_cost;
   if(p.actual_cost==null&&p.cost!=null)p.actual_cost=p.cost;
   if(p.progress==null&&p.progress_pct!=null)p.progress=p.progress_pct;
   if(p.progress_pct==null&&p.progress!=null)p.progress_pct=p.progress;
   return p;
 };
 const statuses={interest:'Érdeklődés',quote:'Ajánlat',contracted:'Szerződött',active:'Folyamatban',completed:'Befejezett',cancelled:'Lezárt'};
 const fresh=()=>({id:typeof uid==='function'?uid('P'):'P-'+Date.now(),project_number:'',name:'',customerId:'',customer_id:'',location:'',status:'interest',value:0,contract_value:0,planned:0,planned_cost:0,cost:0,actual_cost:0,progress:0,progress_pct:0,notes:''});
 const persist=async()=>{if(typeof window.save!=='function')throw Error('A központi mentési rendszer nem érhető el.');const r=window.save();if(r&&typeof r.then==='function')await r};
 function modal(p,isNew){
  normalize(p);
  const x=document.createElement('div');x.className='modal';
  x.innerHTML=`<div class="modalbox"><div class="modalhead"><h2>${isNew?'Új projekt':'Projekt szerkesztése'}</h2><button class="icon" id="pf_close">×</button></div><div class="modalbody"><div class="formgrid">
  <div class="field"><label>Projekt neve</label><input class="input" data-k="name" value="${esc(p.name)}"></div>
  <div class="field"><label>Projektazonosító</label><input class="input" data-k="project_number" value="${esc(p.project_number||p.id)}"></div>
  <div class="field full"><label>Megrendelő</label><select class="select" data-k="customerId"><option value="">— Nincs megrendelő —</option>${customers().map(c=>`<option value="${esc(c.id)}" ${String(c.id)===String(customerId(p))?'selected':''}>${esc(c.company_name||c.name||c.id)}</option>`).join('')}</select></div>
  <div class="field full"><label>Helyszín</label><input class="input" data-k="location" value="${esc(p.location)}"></div>
  <div class="field"><label>Státusz</label><select class="select" data-k="status">${Object.entries(statuses).map(([k,v])=>`<option value="${k}" ${String(p.status||'interest')===k?'selected':''}>${v}</option>`).join('')}</select></div>
  <div class="field"><label>Szerződéses érték (Ft)</label><input class="input" type="number" data-k="value" value="${Number(p.value??p.contract_value)||0}"></div>
  <div class="field"><label>Tervezett költség (Ft)</label><input class="input" type="number" data-k="planned" value="${Number(p.planned??p.planned_cost)||0}"></div>
  <div class="field"><label>Tényleges költség (Ft)</label><input class="input" type="number" data-k="cost" value="${Number(p.cost??p.actual_cost)||0}"></div>
  <div class="field"><label>Készültség (%)</label><input class="input" type="number" min="0" max="100" data-k="progress" value="${Number(p.progress??p.progress_pct)||0}"></div>
  <div class="field full"><label>Megjegyzés</label><textarea class="textarea" data-k="notes">${esc(p.notes)}</textarea></div>
  </div><div class="modalfoot">${isNew?'':'<button class="btn danger" id="pf_delete">Törlés</button>'}<span style="flex:1"></span><button class="btn secondary" id="pf_cancel">Mégse</button><button class="btn" id="pf_save">Mentés</button></div></div></div>`;
  document.body.appendChild(x);const close=()=>x.remove();x.querySelector('#pf_close').onclick=close;x.querySelector('#pf_cancel').onclick=close;
  const read=()=>x.querySelectorAll('[data-k]').forEach(e=>{const k=e.dataset.k;p[k]=e.type==='number'?(Number(e.value)||0):e.value.trim();});
  x.querySelector('#pf_save').onclick=async()=>{read();if(!p.name){alert('A projekt neve kötelező.');return}normalize(p);p.customer_id=p.customerId;p.contract_value=Number(p.value)||0;p.planned_cost=Number(p.planned)||0;p.actual_cost=Number(p.cost)||0;p.progress=Math.max(0,Math.min(100,Number(p.progress)||0));p.progress_pct=p.progress;try{if(isNew)arr().push(p);await persist();close();window.render();typeof toast==='function'&&toast(isNew?'Projekt létrehozva':'Projekt módosítva')}catch(e){if(isNew){const i=arr().indexOf(p);if(i>=0)arr().splice(i,1)}alert('A projekt mentése nem sikerült: '+e.message)}};
  if(!isNew)x.querySelector('#pf_delete').onclick=async()=>{if(!confirm(`Biztosan törlöd a(z) „${p.name}” projektet?`))return;const i=arr().indexOf(p);if(i<0)return;arr().splice(i,1);try{await persist();close();window.render();typeof toast==='function'&&toast('Projekt törölve')}catch(e){arr().splice(i,0,p);alert('A projekt törlése nem sikerült: '+e.message)}};
 }
 function profile(id){const p=arr().find(x=>String(x.id)===String(id));if(!p)return;normalize(p);const root=document.querySelector('.content');root.innerHTML=`<div class="panel"><div class="panelhead"><div><div class="eyebrow">PROJEKT / ADATLAP</div><h2>${esc(p.name)}</h2><div class="label">${esc(customerName(p))} · ${esc(p.location||'')}</div></div><div><button class="btn secondary" onclick="window.__pfBack()">← Vissza</button> <button class="btn" onclick="window.__pfEdit('${esc(p.id)}')">Szerkesztés</button></div></div><div class="formgrid">${[['Projekt neve',p.name],['Azonosító',p.project_number||p.id],['Megrendelő',customerName(p)],['Helyszín',p.location||'—'],['Státusz',statuses[p.status]||p.status],['Szerződéses érték',(Number(p.value)||0).toLocaleString('hu-HU')+' Ft'],['Tervezett költség',(Number(p.planned)||0).toLocaleString('hu-HU')+' Ft'],['Tényleges költség',(Number(p.cost)||0).toLocaleString('hu-HU')+' Ft'],['Készültség',(Number(p.progress)||0)+' %'],['Megjegyzés',p.notes||'—']].map(a=>`<div class="kpi"><span>${esc(a[0])}</span><b>${esc(a[1])}</b></div>`).join('')}</div></div>`}
 function view(){arr().forEach(normalize);return `<div class="panel"><div class="panelhead"><div><h2>Projektek</h2><div class="label">Projektlista és projektadatok</div></div><button class="btn" onclick="window.__pfCreate()">+ Új projekt</button></div><div class="tablewrap"><table class="table"><thead><tr><th>PROJEKT</th><th>MEGRENDELŐ</th><th>HELYSZÍN</th><th>STÁTUSZ</th><th>KÉSZÜLTSÉG</th><th>MŰVELETEK</th></tr></thead><tbody>${arr().map(p=>`<tr><td><a class="link" onclick="window.__pfProfile('${esc(p.id)}')"><b>${esc(p.name||'Névtelen projekt')}</b></a><div class="label">${esc(p.project_number||p.id||'')}</div></td><td>${esc(customerName(p))}</td><td>${esc(p.location||'—')}</td><td><span class="badge ${p.status==='active'?'green':p.status==='completed'?'blue':p.status==='cancelled'?'red':'amber'}">${esc(statuses[p.status]||p.status||'—')}</span></td><td>${esc(p.progress||0)}%</td><td><button class="btn secondary small" onclick="window.__pfProfile('${esc(p.id)}')">Adatlap</button> <button class="btn secondary small" onclick="window.__pfEdit('${esc(p.id)}')">Szerkesztés</button> <button class="btn danger small" onclick="window.__pfDelete('${esc(p.id)}')">Törlés</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty">Nincs projekt.</td></tr>'}</tbody></table></div></div>`}
 async function del(id){const p=arr().find(x=>String(x.id)===String(id));if(!p||!confirm(`Biztosan törlöd a(z) „${p.name}” projektet?`))return;const i=arr().indexOf(p);arr().splice(i,1);try{await persist();window.render();typeof toast==='function'&&toast('Projekt törölve')}catch(e){arr().splice(i,0,p);alert('A projekt törlése nem sikerült: '+e.message)}}
 window.__pfCreate=()=>modal(fresh(),true);window.__pfEdit=id=>{const p=arr().find(x=>String(x.id)===String(id));if(p)modal(p,false)};window.__pfProfile=profile;window.__pfDelete=del;window.__pfBack=()=>{if(typeof current!=='undefined')current='projects';window.render()};window.__pfView=view;window.views.projects=view;window.__pfInstalled=true;if(typeof current!=='undefined'&&current==='projects')window.render();return true;
 }
 if(install())return;let n=0;const t=setInterval(()=>{if(install()||++n>120)clearInterval(t)},50);
})();
