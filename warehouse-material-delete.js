/* Anyag / Raktár – anyagcikk törlés.
 * Nincs külön készletmozgás-napló.
 * Törlés előtt ellenőrizzük a projektigényeket és a tényleges felhasználásokat.
 */
(function installWarehouseMaterialDelete(){
  const KEY='kp_warehouse_materials_v1';
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>Number(v)||0;
  function load(){try{return JSON.parse(localStorage.getItem(KEY)||'null')||{products:[],stock:[],requirements:[],usage:[]};}catch{return {products:[],stock:[],requirements:[],usage:[]};}}
  function save(s){localStorage.setItem(KEY,JSON.stringify(s));}
  function refresh(){
    const nav=[...document.querySelectorAll('#nav .nav')].find(b=>String(b.textContent||'').includes('Anyag / Raktár'));
    if(nav){nav.dispatchEvent(new MouseEvent('click',{bubbles:true}));return;}
    if(typeof window.render==='function')window.render();
  }
  window.kpDeleteMaterial=function(productId){
    const s=load();
    const p=(s.products||[]).find(x=>String(x.id)===String(productId));
    if(!p){alert('Az anyagcikk nem található.');return;}
    const req=(s.requirements||[]).filter(r=>String(r.product_id)===String(productId));
    const usage=(s.usage||[]).filter(r=>String(r.product_id)===String(productId));
    const stock=(s.stock||[]).filter(r=>String(r.product_id||r.productId)===String(productId));
    if(req.length||usage.length){
      alert('Ez az anyag már szerepel projektanyag-igényben vagy tényleges felhasználásban, ezért biztonsági okból nem törölhető. Később archiválható/inaktívra állítható.');
      return;
    }
    const physical=stock.reduce((a,r)=>a+num(r.quantity),0)+num(p.stock||p.quantity);
    const ok=confirm(`Biztosan törlöd ezt az anyagcikket?\n\n${p.sku||''} – ${p.name||''}\nFizikai készlet: ${physical} ${p.material_unit||p.unit||'db'}\n\nA törlés végleges.`);
    if(!ok)return;
    s.products=(s.products||[]).filter(x=>String(x.id)!==String(productId));
    s.stock=(s.stock||[]).filter(r=>String(r.product_id||r.productId)!==String(productId));
    save(s);
    refresh();
    setTimeout(()=>{const t=document.getElementById('toast');if(t){t.textContent='Anyagcikk törölve';t.classList.add('show');setTimeout(()=>t.classList.remove('show'),2200);}},50);
  };
  function decorate(){
    const tables=[...document.querySelectorAll('#page table')];
    const table=tables.find(t=>String(t.textContent||'').includes('Cikkszám')&&String(t.textContent||'').includes('Fizikai'));
    if(!table||table.dataset.deleteReady==='1')return;
    table.dataset.deleteReady='1';
    const head=table.querySelector('thead tr');
    if(head){const th=document.createElement('th');th.textContent='Művelet';head.appendChild(th);}
    table.querySelectorAll('tbody tr').forEach(tr=>{
      const sku=tr.querySelector('td')?.textContent?.trim();
      const td=document.createElement('td');
      const s=load();
      const p=(s.products||[]).find(x=>String(x.sku||'')===String(sku||''));
      if(p){td.innerHTML=`<button type="button" class="btn danger small" onclick="kpDeleteMaterial('${esc(p.id)}')">Törlés</button>`;}
      else td.textContent='';
      tr.appendChild(td);
    });
  }
  function start(){
    decorate();
    const page=document.getElementById('page');
    if(page&&!window.__kpMaterialDeleteObserver){
      window.__kpMaterialDeleteObserver=new MutationObserver(()=>decorate());
      window.__kpMaterialDeleteObserver.observe(page,{childList:true,subtree:true});
    }
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
