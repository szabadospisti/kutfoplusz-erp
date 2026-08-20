/* Kútfő Plusz ERP – Géppark. Ugyanaz a közvetlen CRUD-minta, mint az Anyag/Raktár modulnál. */
(function(){
'use strict';
const root=()=>document.getElementById('content')||document.querySelector('.content');
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const list=()=>Array.isArray(window.db?.machines)?window.db.machines:[];
const save=()=>typeof window.save==='function'?window.save():true;
function fleetRender(){
 const r=root(); if(!r)return;
 const rows=list();
 r.innerHTML=`<div class="page"><div class="page-head"><div><div class="eyebrow">GÉPPARK</div><h1>Eszközök</h1></div><button class="btn" id="fleet_new">+ Új eszköz</button></div><div class="table-wrap"><table><thead><tr><th>ESZKÖZ</th><th>TÍPUS</th><th>RENDSZÁM</th><th>ÁLLAPOT</th><th>MŰVELETEK</th></tr></thead><tbody>${rows.map(m=>`<tr><td><b>${esc(m.name||'Névtelen eszköz')}</b><br><small>${esc(m.make||'')} ${esc(m.model||'')}</small></td><td>${esc(m.asset_type||'egyéb')}</td><td>${esc(m.plate||'—')}</td><td>${esc(m.status||'Üzemképes')}</td><td><button class="btn secondary fleet-profile" data-id="${esc(m.id)}">Adatlap</button> <button class="btn secondary fleet-edit" data-id="${esc(m.id)}">Szerkesztés</button> <button class="btn danger fleet-delete" data-id="${esc(m.id)}">Törlés</button></td></tr>`).join('')}</tbody></table></div></div>`;
 r.querySelector('#fleet_new').onclick=()=>fleetNew();
 r.querySelectorAll('.fleet-profile').forEach(b=>b.onclick=()=>fleetProfile(b.dataset.id));
 r.querySelectorAll('.fleet-edit').forEach(b=>b.onclick=()=>fleetEdit(b.dataset.id));
 r.querySelectorAll('.fleet-delete').forEach(b=>b.onclick=()=>fleetDelete(b.dataset.id));
}
function modal(title,m,onSave){
 const wrap=document.createElement('div');wrap.className='modal-backdrop';wrap.innerHTML=`<div class="modal"><div class="modal-head"><h2>${title}</h2><button class="btn secondary" id="fleet_close">×</button></div><div class="formgrid"><div class="field"><label>Eszköz neve</label><input class="input" id="fm_name" value="${esc(m.name||'')}"></div><div class="field"><label>Gyártó</label><input class="input" id="fm_make" value="${esc(m.make||'')}"></div><div class="field"><label>Típus / modell</label><input class="input" id="fm_model" value="${esc(m.model||'')}"></div><div class="field"><label>Rendszám</label><input class="input" id="fm_plate" value="${esc(m.plate||'')}"></div><div class="field"><label>Eszköztípus</label><input class="input" id="fm_type" value="${esc(m.asset_type||'egyéb')}"></div><div class="field"><label>Állapot</label><select class="select" id="fm_status"><option>Üzemképes</option><option>Szervizre vár</option><option>Meghibásodott</option><option>Üzemen kívül</option></select></div></div><div class="modal-actions"><button class="btn secondary" id="fleet_cancel">Mégse</button><button class="btn" id="fleet_save">Mentés</button></div></div>`;
 document.body.appendChild(wrap);wrap.querySelector('#fm_status').value=m.status||'Üzemképes';
 const close=()=>wrap.remove();wrap.querySelector('#fleet_close').onclick=close;wrap.querySelector('#fleet_cancel').onclick=close;
 wrap.querySelector('#fleet_save').onclick=()=>{m.name=wrap.querySelector('#fm_name').value.trim();m.make=wrap.querySelector('#fm_make').value.trim();m.model=wrap.querySelector('#fm_model').value.trim();m.plate=wrap.querySelector('#fm_plate').value.trim();m.asset_type=wrap.querySelector('#fm_type').value.trim()||'egyéb';m.status=wrap.querySelector('#fm_status').value;onSave();close();};
}
function fleetNew(){const m={id:(window.uid?window.uid('G'):'G-'+Date.now()),name:'',asset_type:'egyéb',status:'Üzemképes'};modal('Új eszköz',m,()=>{list().push(m);save();fleetRender();});}
function fleetEdit(id){const m=list().find(x=>String(x.id)===String(id));if(!m)return;modal('Eszköz szerkesztése',m,()=>{save();fleetRender();});}
function fleetDelete(id){const i=list().findIndex(x=>String(x.id)===String(id));if(i<0)return;if(!confirm('Biztosan törlöd ezt az eszközt?'))return;list().splice(i,1);save();fleetRender();}
function fleetProfile(id){const m=list().find(x=>String(x.id)===String(id));if(!m)return;const r=root();r.innerHTML=`<div class="page"><div class="page-head"><div><div class="eyebrow">GÉPPARK / ADATLAP</div><h1>${esc(m.name||'Névtelen eszköz')}</h1></div><button class="btn secondary" id="fleet_back">← Vissza</button></div><div class="card"><p><b>Gyártó:</b> ${esc(m.make||'—')}</p><p><b>Típus:</b> ${esc(m.model||'—')}</p><p><b>Rendszám:</b> ${esc(m.plate||'—')}</p><p><b>Állapot:</b> ${esc(m.status||'—')}</p><button class="btn" id="fleet_profile_edit">Szerkesztés</button></div></div>`;r.querySelector('#fleet_back').onclick=fleetRender;r.querySelector('#fleet_profile_edit').onclick=()=>fleetEdit(id);}
window.__kpFleetNative=true;window.fleetRender=fleetRender;window.fleetNew=fleetNew;window.fleetEdit=fleetEdit;window.fleetDelete=fleetDelete;window.fleetProfile=fleetProfile;
if(window.current==='machines')setTimeout(fleetRender,0);
})();
