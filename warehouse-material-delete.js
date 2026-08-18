/* Anyag / Raktár – anyagcikk törlés. */
(function installWarehouseMaterialDelete(){
  const KEY='kp_warehouse_materials_v1';
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>Number(v)||0;
  const load=()=>{try{return JSON.parse(localStorage.getItem(KEY)||'null')||{products:[],stock:[],requirements:[],usage:[]};}catch{return {products:[],stock:[],requirements:[],usage:[]};}};
  const save=s=>localStorage.setItem(KEY,JSON.stringify(s));
  window.kpDeleteMaterial=function(productId){
    const s=load(),p=(s.products||[]).find(x=>String(x.id)===String(productId));if(!p){alert('Az anyagcikk nem található.');return;}
    const req=(s.requirements||[]).filter(r=>String(r.product_id)===String(productId));const usage=(s.usage||[]).filter(r=>String(r.product_id)===String(productId));
    if(req.length||usage.length){alert('Ez az anyag már projektanyag-igényben vagy tényleges felhasználásban szerepel, ezért nem törölhető.');return;}
    const stock=(s.stock||[]).filter(r=>String(r.product_id||r.productId)===String(productId));const physical=stock.reduce((a,r)=>a+num(r.quantity),0)+num(p.stock||p.quantity);
    if(!confirm(`Biztosan törlöd?\n\n${p.sku||''} – ${p.name||''}\nKészlet: ${physical} ${p.material_unit||p.unit||'db'}\n\nA törlés végleges.`))return;
    s.products=(s.products||[]).filter(x=>String(x.id)!==String(productId));s.stock=(s.stock||[]).filter(r=>String(r.product_id||r.productId)!==String(productId));save(s);
    if(typeof window.openWarehouse==='function')window.openWarehouse();else if(typeof window.render==='function')window.render();else location.reload();
  };
  function decorate(){
    const rows=document.getElementById('wmRows');if(!rows)return;const table=rows.closest('table');if(!table)return;
    if(!table.querySelector('thead .wmActionHead')){const th=document.createElement('th');th.className='wmActionHead';th.textContent='Művelet';table.querySelector('thead tr').appendChild(th);}
    rows.querySelectorAll('tr').forEach(tr=>{
      if(tr.querySelector('.wmDeleteBtn'))return;
      const sku=tr.querySelector('td')?.textContent?.trim();if(!sku)return;
      const p=load().products?.find(x=>String(x.sku||'')===String(sku));if(!p)return;
      const td=document.createElement('td');td.innerHTML=`<button type="button" class="btn danger small wmDeleteBtn">Törlés</button>`;td.querySelector('button').onclick=()=>window.kpDeleteMaterial(p.id);tr.appendChild(td);
    });
  }
  function boot(){decorate();if(!window.__kpMaterialDeleteObserver){window.__kpMaterialDeleteObserver=new MutationObserver(()=>decorate());window.__kpMaterialDeleteObserver.observe(document.body,{childList:true,subtree:true});}}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
