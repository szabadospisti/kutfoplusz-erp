/* Kútfő Plusz ERP – stabil Géppark vezérlő
 * Egyetlen modul kezeli a Géppark műveleteit. A módosítások és törlések
 * localStorage-ban maradnak, ezért az oldal újrarenderelése nem írja felül őket.
 */
(function installStableMachineFleet(){
  const KEY='kp_machine_fleet_overrides_v1';
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch{return {};}};
  const write=s=>localStorage.setItem(KEY,JSON.stringify(s));
  const clean=v=>String(v??'').replace(/\s+/g,' ').trim();
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const table=()=>[...document.querySelectorAll('table')].find(t=>/GÉP/i.test(t.innerText||'')&&/TÍPUS/i.test(t.innerText||'')&&/ÜZEMÓRA/i.test(t.innerText||'')&&/SZERVIZ/i.test(t.innerText||''));
  function rowKey(row){const c=row.querySelectorAll('td');return clean(c[0]?.innerText||'')+'|'+clean(c[1]?.innerText||'');}
  function apply(){
    const t=table();if(!t)return;
    const state=read();
    const head=t.querySelector('thead tr');
    if(head&&!head.querySelector('[data-kp-fleet-actions-head]')){const th=document.createElement('th');th.dataset.kpFleetActionsHead='1';th.textContent='MŰVELETEK';head.appendChild(th);}
    t.querySelectorAll('tbody tr').forEach(row=>{
      const cells=row.querySelectorAll('td');if(cells.length<5)return;
      const key=rowKey(row);const data=state[key];
      if(data?.deleted){row.style.display='none';return;}
      if(data){if(data.name!==undefined)cells[0].textContent=data.name;if(data.type!==undefined)cells[1].textContent=data.type;if(data.hours!==undefined)cells[2].textContent=data.hours;if(data.service!==undefined)cells[3].textContent=data.service;}
      let action=row.querySelector('[data-kp-fleet-actions]');
      if(!action){action=document.createElement('td');action.dataset.kpFleetActions='1';action.innerHTML='<button type="button" class="btn secondary small" data-kp-fleet-edit>✏️ Szerkesztés</button> <button type="button" class="btn danger small" data-kp-fleet-delete>🗑️ Törlés</button>';row.appendChild(action);}
      if(action.dataset.bound==='1')return;
      action.dataset.bound='1';
      action.querySelector('[data-kp-fleet-edit]').onclick=()=>openEditor(row,key);
      action.querySelector('[data-kp-fleet-delete]').onclick=()=>{if(!confirm('Biztosan törlöd ezt a gépet?'))return;const s=read();s[key]={...(s[key]||{}),deleted:true};write(s);apply();};
    });
  }
  function openEditor(row,key){
    const cells=row.querySelectorAll('td'),old=read()[key]||{};
    if(document.querySelector('[data-kp-fleet-modal]'))return;
    const m=document.createElement('div');m.className='modal';m.dataset.kpFleetModal='1';
    m.innerHTML='<div class="modalbox"><div class="modalhead"><h2>Gép szerkesztése</h2><button class="icon" data-close>×</button></div><div class="modalbody"><div class="formgrid"><div class="field"><label>Gép neve</label><input class="input" id="kpfName"></div><div class="field"><label>Típus / modell</label><input class="input" id="kpfType"></div><div class="field"><label>Üzemóra</label><input class="input" id="kpfHours" type="number" min="0"></div><div class="field"><label>Következő szerviz</label><input class="input" id="kpfService" type="number" min="0"></div></div><div class="modalfoot"><button class="btn secondary" data-close>Mégse</button><button class="btn" data-save>💾 Mentés</button></div></div></div>';
    document.body.appendChild(m);
    m.querySelector('#kpfName').value=old.name??clean(cells[0].innerText);
    m.querySelector('#kpfType').value=old.type??clean(cells[1].innerText);
    m.querySelector('#kpfHours').value=old.hours??clean(cells[2].innerText);
    m.querySelector('#kpfService').value=old.service??clean(cells[3].innerText);
    m.querySelectorAll('[data-close]').forEach(b=>b.onclick=()=>m.remove());
    m.querySelector('[data-save]').onclick=()=>{const s=read();s[key]={name:m.querySelector('#kpfName').value.trim(),type:m.querySelector('#kpfType').value.trim(),hours:m.querySelector('#kpfHours').value,service:m.querySelector('#kpfService').value,deleted:false};write(s);m.remove();apply();};
  }
  let scheduled=false;
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;try{apply();}catch(e){console.error('Stable fleet',e);}});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);else schedule();
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
})();
