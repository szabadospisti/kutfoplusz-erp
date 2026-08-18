/* Anyag / Raktár – stabil szerkesztési mód.
 * Az alaplista nem szerkeszthető. A gomb a ténylegesen kirenderelt
 * Anyag / Raktár panelbe kerül, és a készletet, minimumot és beszerzési árat módosítja.
 */
(function installWarehouseMaterialEdit(){
  const KEY='kp_warehouse_materials_v1';
  const num=v=>Number(v)||0;
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')||{products:[],stock:[],requirements:[],usage:[]};}catch{return {products:[],stock:[],requirements:[],usage:[]};}};
  const save=s=>localStorage.setItem(KEY,JSON.stringify(s));
  const stockRows=(s,id)=>(s.stock||[]).filter(x=>String(x.product_id||x.productId)===String(id));
  const qty=(s,p)=>{const r=stockRows(s,p.id);return r.length?r.reduce((a,x)=>a+num(x.quantity),0):num(p.stock||p.quantity);};

  function findWarehousePanel(){
    return [...document.querySelectorAll('.panel')].find(p=>/Anyag\s*\/\s*Raktár/i.test(p.textContent||''));
  }

  function installButton(){
    const panel=findWarehousePanel();
    if(!panel || panel.querySelector('#wmEditBtn')) return;
    const head=panel.querySelector('.panelhead');
    if(!head) return;
    let actions=head.querySelector('.wm-edit-actions');
    if(!actions){
      actions=document.createElement('div');
      actions.className='wm-edit-actions';
      actions.style.cssText='display:flex;gap:8px;align-items:center;flex-wrap:wrap;';
      head.appendChild(actions);
    }
    const btn=document.createElement('button');
    btn.id='wmEditBtn';
    btn.className='btn secondary';
    btn.type='button';
    btn.textContent='✏️ Anyagok szerkesztése';
    btn.addEventListener('click',openEditor);
    actions.appendChild(btn);
  }

  function openEditor(){
    if(document.getElementById('wmEditModal')) return;
    const s=load(), ps=s.products||[];
    const m=document.createElement('div');
    m.id='wmEditModal';
    m.className='modal';
    m.innerHTML=`<div class="modalbox" style="max-width:1150px"><div class="modalhead"><h2>Anyagok szerkesztése</h2><button class="icon" id="wmeClose" type="button">×</button></div><div class="modalbody"><div class="notice">Itt módosítható a készletmennyiség, a minimum készlet és a beszerzési ár. A módosítások a Mentés gomb megnyomásakor kerülnek elmentésre.</div><div class="tablewrap" style="margin-top:12px;max-height:60vh;overflow:auto"><table class="table"><thead><tr><th>Cikkszám</th><th>Anyag</th><th>Aktuális készlet</th><th>Új készlet</th><th>Minimum</th><th>Beszerzési ár (Ft)</th></tr></thead><tbody>${ps.map(p=>{const q=qty(s,p);return `<tr><td><b>${esc(p.sku||'—')}</b></td><td>${esc(p.name||'')}</td><td>${q} ${esc(p.material_unit||p.unit||'db')}</td><td><input class="input wmeQty" data-id="${esc(p.id)}" type="number" min="0" step="0.001" value="${q}"></td><td><input class="input wmeMin" data-id="${esc(p.id)}" type="number" min="0" step="0.001" value="${num(p.minimum_stock)}"></td><td><input class="input wmePrice" data-id="${esc(p.id)}" type="number" min="0" step="0.01" value="${num(p.purchase_price??p.buy_price)}"></td></tr>`}).join('')||'<tr><td colspan="6" class="empty">Nincs még anyagcikk.</td></tr>'}</tbody></table></div><div class="modalfoot"><button class="btn secondary" id="wmeCancel" type="button">Mégse</button><button class="btn" id="wmeSave" type="button">💾 Változtatások mentése</button></div></div></div>`;
    document.body.appendChild(m);
    const close=()=>m.remove();
    m.querySelector('#wmeClose').onclick=close;
    m.querySelector('#wmeCancel').onclick=close;
    m.querySelector('#wmeSave').onclick=()=>{
      const current=load();
      (current.products||[]).forEach(p=>{
        const id=String(p.id);
        const q=m.querySelector(`.wmeQty[data-id="${CSS.escape(id)}"]`);
        const min=m.querySelector(`.wmeMin[data-id="${CSS.escape(id)}"]`);
        const price=m.querySelector(`.wmePrice[data-id="${CSS.escape(id)}"]`);
        if(q){
          const value=Math.max(0,num(q.value));
          const rows=stockRows(current,id);
          if(rows.length){rows[0].quantity=value;for(let i=1;i<rows.length;i++) rows[i].quantity=0;}
          else p.stock=value;
        }
        if(min)p.minimum_stock=Math.max(0,num(min.value));
        if(price)p.purchase_price=Math.max(0,num(price.value));
      });
      save(current);
      close();
      alert('Az anyagadatok sikeresen módosítva.');
      if(typeof window.renderWarehouse==='function') window.renderWarehouse();
      else location.reload();
    };
  }

  function boot(){
    installButton();
    const observer=new MutationObserver(()=>installButton());
    observer.observe(document.body,{childList:true,subtree:true});
    setInterval(installButton,1000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();
