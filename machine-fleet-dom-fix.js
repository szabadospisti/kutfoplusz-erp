/* Géppark – DOM-alapú szerkesztés/javítás. A ténylegesen megjelenített gépsorokból dolgozik. */
(function installMachineFleetDomFix(){
  const KEY='kp_machine_fleet_overrides_v2';
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{};}catch{return {};}};
  const write=x=>localStorage.setItem(KEY,JSON.stringify(x));
  const norm=s=>String(s||'').trim().toLocaleLowerCase('hu-HU');
  const isFleet=()=>{const p=document.getElementById('page');if(!p)return false;const t=(p.innerText||'').toLocaleLowerCase('hu-HU');return t.includes('géppark')&&!!p.querySelector('table');};
  function findTable(){
    const p=document.getElementById('page');if(!p)return null;
    return [...p.querySelectorAll('table')].find(t=>{const h=(t.querySelector('thead')?.innerText||'').toLocaleLowerCase('hu-HU');return h.includes('gép')&&h.includes('típus')&&h.includes('üzemóra');});
  }
  function keyFor(row){return norm(row.querySelector('td')?.innerText||'');}
  function rowData(row){const c=[...row.querySelectorAll('td')].map(td=>td.innerText.trim());return {name:c[0]||'',model:c[1]||'',hours:c[2]||'',service:c[3]||'',status:c[4]||''};}
  function applyOverrides(row){const k=keyFor(row),o=read()[k];if(!o)return;const td=[...row.querySelectorAll('td')];if(o.name&&td[0])td[0].textContent=o.name;if(o.model&&td[1])td[1].textContent=o.model;if(o.hours!==undefined&&td[2])td[2].textContent=o.hours;if(o.service!==undefined&&td[3])td[3].textContent=o.service;}
  function openEditor(row){
    if(document.getElementById('mfDomModal'))return;
    const d=rowData(row),m=document.createElement('div');m.id='mfDomModal';m.className='modal';
    m.innerHTML=`<div class="modalbox" style="max-width:760px"><div class="modalhead"><h2>Gép szerkesztése</h2><button class="icon" id="mfdfClose" type="button">×</button></div><div class="modalbody"><div class="formgrid"><div class="field"><label>Gép megnevezése</label><input class="input" id="mfdfName" value="${esc(d.name)}"></div><div class="field"><label>Típus / modell</label><input class="input" id="mfdfModel" value="${esc(d.model)}"></div><div class="field"><label>Üzemóra</label><input class="input" id="mfdfHours" value="${esc(d.hours)}"></div><div class="field"><label>Szerviz</label><input class="input" id="mfdfService" value="${esc(d.service)}"></div></div><div class="modalfoot"><button class="btn danger" id="mfdfDelete" type="button">🗑️ Gép törlése</button><button class="btn secondary" id="mfdfCancel" type="button">Mégse</button><button class="btn" id="mfdfSave" type="button">💾 Mentés</button></div></div></div>`;
    document.body.appendChild(m);const close=()=>m.remove();m.querySelector('#mfdfClose').onclick=close;m.querySelector('#mfdfCancel').onclick=close;
    m.querySelector('#mfdfSave').onclick=()=>{const all=read(),k=keyFor(row);all[k]={name:m.querySelector('#mfdfName').value.trim(),model:m.querySelector('#mfdfModel').value.trim(),hours:m.querySelector('#mfdfHours').value.trim(),service:m.querySelector('#mfdfService').value.trim()};write(all);applyOverrides(row);close();};
    m.querySelector('#mfdfDelete').onclick=()=>{if(!confirm(`Biztosan törlöd a(z) „${d.name}” gépet?`))return;const all=read();all[kForDelete(row)]={...(all[kForDelete(row)]||{}),deleted:true};write(all);row.remove();close();};
  }
  function kForDelete(row){return keyFor(row);}
  function decorate(){
    if(!isFleet())return;const table=findTable();if(!table)return;
    const head=table.querySelector('thead tr');
    if(head&&!head.querySelector('.mfdfActionHead')){const th=document.createElement('th');th.className='mfdfActionHead';th.textContent='MŰVELET';head.appendChild(th);}
    const all=read();
    table.querySelectorAll('tbody tr').forEach(row=>{
      const k=keyFor(row);const o=all[k];if(o?.deleted){row.remove();return;}
      applyOverrides(row);
      if(row.querySelector('.mfdfAction'))return;
      const td=document.createElement('td');td.className='mfdfAction';const b=document.createElement('button');b.type='button';b.className='btn secondary small';b.textContent='✏️ Szerkesztés';b.onclick=()=>openEditor(row);td.appendChild(b);row.appendChild(td);
    });
    const panel=table.closest('.panel,.card');const headbox=panel?.querySelector('.panelhead');
    if(headbox&&!headbox.querySelector('.mfdfTop')){const b=document.createElement('button');b.type='button';b.className='btn secondary mfdfTop';b.textContent='✏️ Géppark szerkesztése';b.onclick=()=>openBulk(table);(headbox.querySelector('div:last-child')||headbox).appendChild(b);}
  }
  function openBulk(table){
    if(document.getElementById('mfBulkModal'))return;
    const rows=[...table.querySelectorAll('tbody tr')].filter(r=>r.querySelector('.mfdfAction'));const all=read();const m=document.createElement('div');m.id='mfBulkModal';m.className='modal';
    m.innerHTML=`<div class="modalbox" style="max-width:1100px"><div class="modalhead"><h2>Géppark szerkesztése</h2><button class="icon" id="mfbClose" type="button">×</button></div><div class="modalbody"><div class="tablewrap"><table class="table"><thead><tr><th>Gép</th><th>Típus</th><th>Üzemóra</th><th>Szerviz</th><th>Művelet</th></tr></thead><tbody>${rows.map((r,i)=>{const d=rowData(r),o=all[keyFor(r)]||{};return `<tr data-i="${i}"><td><input class="input mfbName" value="${esc(o.name??d.name)}"></td><td><input class="input mfbModel" value="${esc(o.model??d.model)}"></td><td><input class="input mfbHours" value="${esc(o.hours??d.hours)}"></td><td><input class="input mfbService" value="${esc(o.service??d.service)}"></td><td><button type="button" class="btn danger small mfbDelete">🗑️ Törlés</button></td></tr>`}).join('')}</tbody></table></div><div class="modalfoot"><button class="btn secondary" id="mfbCancel" type="button">Mégse</button><button class="btn" id="mfbSave" type="button">💾 Változtatások mentése</button></div></div></div>`;
    document.body.appendChild(m);const close=()=>m.remove();m.querySelector('#mfbClose').onclick=close;m.querySelector('#mfbCancel').onclick=close;
    m.querySelectorAll('.mfbDelete').forEach((b,i)=>b.onclick=()=>{if(!confirm(`Biztosan törlöd a(z) „${rowData(rows[i]).name}” gépet?`))return;const k=keyFor(rows[i]);const x=read();x[k]={...(x[k]||{}),deleted:true};write(x);rows[i].remove();b.closest('tr').remove();});
    m.querySelector('#mfbSave').onclick=()=>{const x=read();m.querySelectorAll('tbody tr').forEach((tr,i)=>{const k=keyFor(rows[i]);x[k]={name:tr.querySelector('.mfbName').value.trim(),model:tr.querySelector('.mfbModel').value.trim(),hours:tr.querySelector('.mfbHours').value.trim(),service:tr.querySelector('.mfbService').value.trim()};});write(x);rows.forEach(r=>applyOverrides(r));close();};
  }
  window.kpOpenMachineEditor=()=>{const t=findTable();const r=t?.querySelector('tbody tr');if(r)openEditor(r);else if(t)openBulk(t);};
  const boot=()=>{try{decorate();}catch(e){console.error('Géppark DOM modul:',e);}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
  new MutationObserver(boot).observe(document.body,{childList:true,subtree:true});
  setInterval(boot,1000);
})();
