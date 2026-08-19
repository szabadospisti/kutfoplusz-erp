/* Géppark – valódi CRUD javítás. A renderelt #content géptábláját kezeli. */
(function installMachineFleetFix(){
  function fleetTable(){
    const root=document.getElementById('content');
    if(!root) return null;
    return [...root.querySelectorAll('table')].find(t=>{
      const h=(t.querySelector('thead')?.innerText||'').toLocaleLowerCase('hu-HU');
      return h.includes('gép') && h.includes('típus') && h.includes('üzemóra') && h.includes('szerviz');
    })||null;
  }
  function machines(){
    return Array.isArray(window.db?.machines) ? window.db.machines : (typeof db!=='undefined' && Array.isArray(db.machines) ? db.machines : null);
  }
  function save(){
    if(typeof localSaveOnly==='function') localSaveOnly();
    else localStorage.setItem('kutfoplusz_erp',JSON.stringify(db));
  }
  function esc(v){return String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));}
  function openEdit(index){
    const list=machines(); if(!list||!list[index]) return;
    const m=list[index];
    if(document.getElementById('machineRealEditModal')) return;
    const box=document.createElement('div'); box.id='machineRealEditModal'; box.className='modal';
    box.innerHTML=`<div class="modalbox" style="max-width:760px"><div class="modalhead"><h2>Gép szerkesztése</h2><button class="icon" type="button" data-x>×</button></div><div class="modalbody"><div class="formgrid"><div class="field"><label>Gép neve</label><input class="input" id="mreName" value="${esc(m.name)}"></div><div class="field"><label>Típus / modell</label><input class="input" id="mreModel" value="${esc(m.model)}"></div><div class="field"><label>Üzemóra</label><input class="input" type="number" id="mreHours" value="${Number(m.hours)||0}"></div><div class="field"><label>Következő szerviz</label><input class="input" type="number" id="mreService" value="${Number(m.service)||0}"></div></div><div class="modalfoot"><button class="btn danger" type="button" data-delete>🗑️ Gép törlése</button><button class="btn secondary" type="button" data-cancel>Mégse</button><button class="btn" type="button" data-save>💾 Mentés</button></div></div></div>`;
    document.body.appendChild(box);
    const close=()=>box.remove();
    box.querySelector('[data-x]').onclick=close; box.querySelector('[data-cancel]').onclick=close;
    box.querySelector('[data-save]').onclick=()=>{
      m.name=box.querySelector('#mreName').value.trim();
      m.model=box.querySelector('#mreModel').value.trim();
      m.hours=Number(box.querySelector('#mreHours').value)||0;
      m.service=Number(box.querySelector('#mreService').value)||0;
      save(); close(); render();
    };
    box.querySelector('[data-delete]').onclick=()=>{
      if(!confirm(`Biztosan törlöd a(z) „${m.name}” gépet?`)) return;
      list.splice(index,1); save(); close(); render();
    };
  }
  function decorate(){
    const table=fleetTable(); if(!table) return;
    const list=machines(); if(!list) return;
    const head=table.querySelector('thead tr');
    if(head && !head.querySelector('.machine-action-head')){
      const th=document.createElement('th'); th.className='machine-action-head'; th.textContent='MŰVELETEK'; head.appendChild(th);
    }
    const rows=[...table.querySelectorAll('tbody tr')];
    rows.forEach((row,i)=>{
      if(row.querySelector('.machine-actions')) return;
      const td=document.createElement('td'); td.className='machine-actions';
      td.innerHTML=`<button type="button" class="btn secondary small machine-edit">✏️ Szerkesztés</button> <button type="button" class="btn danger small machine-delete">🗑️ Törlés</button>`;
      td.querySelector('.machine-edit').onclick=()=>openEdit(i);
      td.querySelector('.machine-delete').onclick=()=>{
        const current=machines(); if(!current||!current[i]) return;
        if(!confirm(`Biztosan törlöd a(z) „${current[i].name}” gépet?`)) return;
        current.splice(i,1); save(); render();
      };
      row.appendChild(td);
    });
  }
  const boot=()=>{try{if(typeof current!=='undefined' && current==='machines') decorate();}catch(e){console.error('Géppark CRUD:',e);}};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
  new MutationObserver(()=>boot()).observe(document.body,{childList:true,subtree:true});
})();
