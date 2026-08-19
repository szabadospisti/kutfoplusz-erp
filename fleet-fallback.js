/* Kútfő Plusz ERP – Géppark fallback
 * Közvetlenül a ténylegesen megjelenő géptáblára helyezi a műveleteket.
 */
(function installFleetFallback(){
  function fleetFallback(){
    const tables=[...document.querySelectorAll('table')];
    const table=tables.find(t=>/GÉP/i.test(t.innerText||'')&&/TÍPUS/i.test(t.innerText||'')&&/ÜZEMÓRA/i.test(t.innerText||''));
    if(!table)return;
    const rows=[...table.querySelectorAll('tbody tr')].filter(r=>r.querySelectorAll('td').length>=5);
    if(!rows.length)return;
    const head=table.querySelector('thead tr');
    if(head&&!head.querySelector('[data-fleet-fallback-head]')){
      const th=document.createElement('th');
      th.dataset.fleetFallbackHead='1';
      th.textContent='MŰVELET';
      head.appendChild(th);
    }
    rows.forEach(row=>{
      if(row.querySelector('[data-fleet-fallback]'))return;
      const td=document.createElement('td');
      td.dataset.fleetFallback='1';
      td.innerHTML='<button type="button" class="btn secondary small" data-fleet-open>Adatlap</button> <button type="button" class="btn small" data-fleet-edit>✏️ Szerkesztés</button> <button type="button" class="btn danger small" data-fleet-delete>🗑️ Törlés</button>';
      row.appendChild(td);
      const cells=[...row.querySelectorAll('td')];
      const name=()=>cells[0]?.innerText.trim()||'';
      const type=()=>cells[1]?.innerText.trim()||'';
      const open=()=>{
        if(document.querySelector('[data-fleet-fallback-modal]'))return;
        const m=document.createElement('div');
        m.className='modal';
        m.dataset.fleetFallbackModal='1';
        m.innerHTML='<div class="modalbox"><div class="modalhead"><h2>Gép szerkesztése</h2><button class="icon" data-x>×</button></div><div class="modalbody"><div class="formgrid"><div class="field"><label>Gép neve</label><input class="input" id="ffn"></div><div class="field"><label>Típus / modell</label><input class="input" id="fft"></div><div class="field"><label>Üzemóra</label><input class="input" id="ffh" type="number"></div><div class="field"><label>Következő szerviz</label><input class="input" id="ffs" type="number"></div><div class="field full"><label>Megjegyzés</label><textarea class="textarea" id="ffm"></textarea></div></div><div class="modalfoot"><button class="btn secondary" data-x>Mégse</button><button class="btn" data-save>💾 Mentés</button></div></div></div>';
        document.body.appendChild(m);
        m.querySelector('#ffn').value=name();
        m.querySelector('#fft').value=type();
        m.querySelector('#ffh').value=cells[2]?.innerText.trim()||'';
        m.querySelector('#ffs').value=cells[3]?.innerText.trim()||'';
        m.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>m.remove());
        m.querySelector('[data-save]').onclick=()=>{
          cells[0].textContent=m.querySelector('#ffn').value.trim();
          cells[1].textContent=m.querySelector('#fft').value.trim();
          cells[2].textContent=m.querySelector('#ffh').value;
          cells[3].textContent=m.querySelector('#ffs').value;
          m.remove();
        };
      };
      td.querySelector('[data-fleet-edit]').onclick=open;
      td.querySelector('[data-fleet-open]').onclick=open;
      td.querySelector('[data-fleet-delete]').onclick=()=>{if(confirm('Biztosan törlöd ezt a gépet?'))row.remove();};
    });
  }
  const run=()=>{try{fleetFallback();}catch(e){console.error('Fleet fallback',e);}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',run);else run();
  new MutationObserver(run).observe(document.body,{childList:true,subtree:true});
  setInterval(run,1000);
})();
