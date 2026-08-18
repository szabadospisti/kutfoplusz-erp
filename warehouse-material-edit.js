/* Anyag / Raktár – szerkesztés. */
(function installWarehouseMaterialEdit(){
  const KEY='kp_warehouse_materials_v1';
  const num=v=>Number(v)||0;
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')||{products:[],stock:[],requirements:[],usage:[]};}catch{return {products:[],stock:[],requirements:[],usage:[]};}};
  const save=s=>localStorage.setItem(KEY,JSON.stringify(s));
  const stockRows=(s,id)=>(s.stock||[]).filter(x=>String(x.product_id||x.productId)===String(id));
  const qty=(s,p)=>{const r=stockRows(s,p.id);return r.length?r.reduce((a,x)=>a+num(x.quantity),0):num(p.stock||p.quantity);};
  function openEditor(){
    if(document.getElementById('wmEditModal'))return;
    const s=load(),ps=s.products||[];const m=document.createElement('div');m.id='wmEditModal';m.className='modal';
    m.innerHTML=`<div class="modalbox" style="max-width:1150px"><div class="modalhead"><h2>Anyagok szerkesztése</h2><button class="icon" id="wmeClose" type="button">×</button></div><div class="modalbody"><div class="notice">Módosítható a készletmennyiség, a minimum készlet és a beszerzési ár.</div><div class="tablewrap" style="margin-top:12px;max-height:60vh;overflow:auto"><table class="table"><thead><tr><th>Cikkszám</th><th>Anyag</th><th>Aktuális készlet</th><th>Új készlet</th><th>Minimum</th><th>Beszerzési ár (Ft)</th></tr></thead><tbody>${ps.map(p=>{const q=qty(s,p);return `<tr><td><b>${esc(p.sku||'—')}</b></td><td>${esc(p.name||'')}</td><td>${q} ${esc(p.material_unit||p.unit||'db')}</td><td><input class="input wmeQty" data-id="${esc(p.id)}" type="number" min="0" step="0.001" value="${q}"></td><td><input class="input wmeMin" data-id="${esc(p.id)}" type="number" min="0" step="0.001" value="${num(p.minimum_stock)}"></td><td><input class="input wmePrice" data-id="${esc(p.id)}" type="number" min="0" step="0.01" value="${num(p.purchase_price??p.buy_price)}"></td></tr>`}).join('')||'<tr><td colspan="6" class="empty">Nincs még anyagcikk.</td></tr>'}</tbody></table></div><div class="modalfoot"><button class="btn secondary" id="wmeCancel" type="button">Mégse</button><button class="btn" id="wmeSave" type="button">💾 Változtatások mentése</button></div></div></div>`;
    document.body.appendChild(m);const close=()=>m.remove();m.querySelector('#wmeClose').onclick=close;m.querySelector('#wmeCancel').onclick=close;
    m.querySelector('#wmeSave').onclick=()=>{const current=load();(current.products||[]).forEach(p=>{const id=String(p.id),q=m.querySelector(`.wmeQty[data-id="${CSS.escape(id)}"]`),min=m.querySelector(`.wmeMin[data-id="${CSS.escape(id)}"]`),price=m.querySelector(`.wmePrice[data-id="${CSS.escape(id)}"]`);if(q){const value=Math.max(0,num(q.value)),rows=stockRows(current,id);if(rows.length){rows[0].quantity=value;for(let i=1;i<rows.length;i++)rows[i].quantity=0;}else p.stock=value;}if(min)p.minimum_stock=Math.max(0,num(min.value));if(price)p.purchase_price=Math.max(0,num(price.value));});save(current);close();if(typeof window.openWarehouse==='function')window.openWarehouse();else if(typeof window.render==='function')window.render();else location.reload();};
  }
  window.kpOpenMaterialEditor=openEditor;
  function installButton(){
    const rows=document.getElementById('wmRows');if(!rows)return;const panel=rows.closest('.panel'),head=panel?.querySelector('.panelhead');if(!head||head.querySelector('#wmEditBtn'))return;
    const container=head.querySelector('div:last-child')||head;const btn=document.createElement('button');btn.id='wmEditBtn';btn.type='button';btn.className='btn secondary';btn.textContent='✏️ Anyagok szerkesztése';btn.onclick=openEditor;container.appendChild(btn);
  }
  function boot(){installButton();if(!window.__kpMaterialEditObserver){window.__kpMaterialEditObserver=new MutationObserver(()=>installButton());window.__kpMaterialEditObserver.observe(document.body,{childList:true,subtree:true});}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();

/* Géppark – külön szerkesztési mód és biztonságos törlés. */
(function installMachineFleetControls(){
  const KEY='kp_machine_fleet_v1';
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const uid=()=>crypto?.randomUUID?.()||('machine-'+Date.now()+'-'+Math.random().toString(36).slice(2));
  function load(){
    try{const x=JSON.parse(localStorage.getItem(KEY)||'null');if(x&&Array.isArray(x.items))return x.items;}catch{}
    const d=window.db||{};
    const src=Array.isArray(d.machines)?d.machines:Array.isArray(d.equipment)?d.equipment:Array.isArray(d.fleet)?d.fleet:[];
    return src.map(x=>({...x}));
  }
  function save(items){localStorage.setItem(KEY,JSON.stringify({items}));}
  function machineLabel(x){return x.name||x.machine_name||x.equipment_name||x.type||x.model||x.registration_number||x.license_plate||'Gép';}
  function isFleetPage(){
    const page=document.getElementById('page');if(!page)return false;
    const nav=[...document.querySelectorAll('#nav .nav')].find(b=>/gép/i.test(b.textContent||''));
    const text=(page.innerText||'').toLowerCase();
    return !!nav?.classList.contains('active') || text.includes('géppark') || text.includes('gépjármű') || text.includes('munkagép');
  }
  function openFleetEditor(){
    if(document.getElementById('machineFleetModal'))return;
    const items=load();const m=document.createElement('div');m.id='machineFleetModal';m.className='modal';
    m.innerHTML=`<div class="modalbox" style="max-width:1100px"><div class="modalhead"><h2>Géppark szerkesztése</h2><button class="icon" id="mfClose" type="button">×</button></div><div class="modalbody"><div class="notice">A gép adatai szerkeszthetők. A törlés külön megerősítést kér.</div><div class="tablewrap" style="margin-top:12px;max-height:62vh;overflow:auto"><table class="table"><thead><tr><th>Megnevezés</th><th>Típus / modell</th><th>Azonosító / rendszám</th><th>Évjárat</th><th>Megjegyzés</th><th>Művelet</th></tr></thead><tbody>${items.map((x,i)=>`<tr><td><input class="input mfName" data-i="${i}" value="${esc(machineLabel(x))}"></td><td><input class="input mfModel" data-i="${i}" value="${esc(x.model||x.type||x.machine_type||'')}"></td><td><input class="input mfId" data-i="${i}" value="${esc(x.registration_number||x.license_plate||x.identifier||x.serial_number||'')}"></td><td><input class="input mfYear" data-i="${i}" type="number" value="${esc(x.year||x.year_of_manufacture||'')}"></td><td><input class="input mfNote" data-i="${i}" value="${esc(x.notes||x.note||'')}"></td><td><button type="button" class="btn danger small mfDelete" data-i="${i}">🗑️ Törlés</button></td></tr>`).join('')||'<tr><td colspan="6" class="empty">Nincs gép rögzítve.</td></tr>'}</tbody></table></div><div class="modalfoot"><button class="btn secondary" id="mfCancel" type="button">Mégse</button><button class="btn" id="mfSave" type="button">💾 Változtatások mentése</button></div></div></div>`;
    document.body.appendChild(m);const close=()=>m.remove();m.querySelector('#mfClose').onclick=close;m.querySelector('#mfCancel').onclick=close;
    m.querySelectorAll('.mfDelete').forEach(b=>b.onclick=()=>{const i=Number(b.dataset.i);if(!confirm(`Biztosan törlöd a(z) „${machineLabel(items[i])}” gépet?`))return;items.splice(i,1);m.remove();openFleetEditor();});
    m.querySelector('#mfSave').onclick=()=>{m.querySelectorAll('tbody tr').forEach((tr,i)=>{const x=items[i];if(!x)return;const get=s=>tr.querySelector(s)?.value?.trim()||'';x.name=get('.mfName');x.model=get('.mfModel');x.registration_number=get('.mfId');x.year=get('.mfYear');x.notes=get('.mfNote');});save(items);close();refreshFleet();};
  }
  function refreshFleet(){
    const nav=[...document.querySelectorAll('#nav .nav')].find(b=>/gép/i.test(b.textContent||''));
    if(nav){nav.click();return;}if(typeof window.render==='function')window.render();else location.reload();
  }
  function addButton(){
    if(!isFleetPage()||document.getElementById('mfEditBtn'))return;
    const page=document.getElementById('page');
    const headings=[...page.querySelectorAll('.panelhead')];
    const head=headings.find(h=>/gép/i.test(h.innerText||''))||headings[0];
    if(!head)return;
    const target=head.querySelector('div:last-child')||head;const b=document.createElement('button');b.id='mfEditBtn';b.type='button';b.className='btn secondary';b.textContent='✏️ Géppark szerkesztése';b.onclick=openFleetEditor;target.appendChild(b);
  }
  function decorateRows(){
    if(!isFleetPage())return;
    const page=document.getElementById('page');
    const tables=[...page.querySelectorAll('table')];
    const table=tables.find(t=>/gép|típus|modell/i.test(t.innerText||''));
    if(!table||table.dataset.mfReady)return;
    table.dataset.mfReady='1';const head=table.querySelector('thead tr');if(head){const th=document.createElement('th');th.textContent='Művelet';head.appendChild(th);}
    const items=load();table.querySelectorAll('tbody tr').forEach((tr,i)=>{const td=document.createElement('td');const x=items[i];if(x)td.innerHTML=`<button type="button" class="btn secondary small" onclick="kpOpenMachineEditor()">✏️ Szerkesztés</button>`;tr.appendChild(td);});
  }
  window.kpOpenMachineEditor=openFleetEditor;
  function boot(){addButton();decorateRows();}
  setInterval(boot,700);
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
