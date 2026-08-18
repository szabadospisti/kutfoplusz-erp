/* Anyag / Raktár – szerkesztési mód.
 * Az anyaglista alapállapotban védett. A Szerkesztés gombbal lehet
 * módosítani a mennyiséget, minimum készletet és beszerzési árat.
 */
(function installWarehouseMaterialEdit(){
  const KEY='kp_warehouse_materials_v1';
  const num=v=>Number(v)||0;
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'null')||{products:[],stock:[],requirements:[],usage:[]};}catch{return {products:[],stock:[],requirements:[],usage:[]};}}
  function save(s){localStorage.setItem(KEY,JSON.stringify(s));}
  function stockRows(s,id){return (s.stock||[]).filter(x=>String(x.product_id||x.productId)===String(id));}
  function qty(s,p){const rows=stockRows(s,p.id);return rows.length?rows.reduce((a,x)=>a+num(x.quantity),0):num(p.stock||p.quantity);}
  function render(){
    const root=document.getElementById('page');if(!root)return;
    const s=load(),ps=s.products||[];
    // Re-render only when the warehouse page is active.
    const rows=[...document.querySelectorAll('#wmRows tr')];
    const table=document.getElementById('wmRows');if(!table)return;
    if(document.getElementById('wmEditMode'))return;
    const bar=document.createElement('div');bar.id='wmEditMode';bar.className='toolbar';bar.style.marginTop='10px';bar.innerHTML='<button class="btn secondary" id="wmEditBtn">✏️ Anyagok szerkesztése</button>';
    const panel=table.closest('.panel');if(panel) panel.insertBefore(bar,table.closest('.tablewrap'));
    document.getElementById('wmEditBtn').onclick=()=>openEditor();
  }
  function openEditor(){
    const s=load(),ps=s.products||[];
    const m=document.createElement('div');m.className='modal';
    m.innerHTML=`<div class="modalbox" style="max-width:1100px"><div class="modalhead"><h2>Anyagok szerkesztése</h2><button class="icon" id="wmeClose">×</button></div><div class="modalbody"><div class="notice">Szerkesztési módban módosítható a <b>mennyiség</b>, a <b>minimum készlet</b> és a <b>beszerzési ár</b>. A változtatások csak a Mentés gombbal lépnek életbe.</div><div class="tablewrap" style="margin-top:12px"><table class="table"><thead><tr><th>Cikkszám</th><th>Anyag</th><th>Aktuális mennyiség</th><th>Új mennyiség</th><th>Minimum</th><th>Beszerzési ár (Ft)</th></tr></thead><tbody>${ps.map(p=>{const q=qty(s,p);return `<tr><td><b>${esc(p.sku||'—')}</b></td><td>${esc(p.name||'')}</td><td>${q}</td><td><input class="input wmeQty" data-id="${esc(p.id)}" type="number" step="0.001" value="${q}"></td><td><input class="input wmeMin" data-id="${esc(p.id)}" type="number" step="0.001" value="${num(p.minimum_stock)}"></td><td><input class="input wmePrice" data-id="${esc(p.id)}" type="number" step="0.01" min="0" value="${num(p.purchase_price||p.buy_price)}"></td></tr>`}).join('')||'<tr><td colspan="6" class="empty">Nincs anyagcikk.</td></tr>'}</tbody></table></div><div class="modalfoot"><button class="btn secondary" id="wmeCancel">Mégse</button><button class="btn" id="wmeSave">💾 Változtatások mentése</button></div></div></div>`;
    document.body.appendChild(m);
    const close=()=>m.remove();
    m.querySelector('#wmeClose').onclick=close;m.querySelector('#wmeCancel').onclick=close;
    m.querySelector('#wmeSave').onclick=()=>{
      const current=load();
      (current.products||[]).forEach(p=>{
        const id=String(p.id);
        const q=m.querySelector(`.wmeQty[data-id="${CSS.escape(id)}"]`);
        const min=m.querySelector(`.wmeMin[data-id="${CSS.escape(id)}"]`);
        const price=m.querySelector(`.wmePrice[data-id="${CSS.escape(id)}"]`);
        if(q){const value=Math.max(0,num(q.value));const rows=stockRows(current,id);if(rows.length){let left=value;rows.forEach(r=>{if(left>=0){r.quantity=left;left=0;}});}else{p.stock=value;}}
        if(min)p.minimum_stock=Math.max(0,num(min.value));
        if(price)p.purchase_price=Math.max(0,num(price.value));
      });
      save(current);close();alert('Az anyagadatok sikeresen módosítva.');
      try{window.location.hash='#/warehouse';location.reload();}catch{location.reload();}
    };
  }
  function hook(){
    const table=document.getElementById('wmRows');if(table)render();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setInterval(hook,500),{once:true});else setInterval(hook,500);
})();
