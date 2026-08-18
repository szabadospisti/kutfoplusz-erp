/* Anyag / Raktár – készlet, projekt-anyagigény és foglalás.
 * Nincs külön készletmozgás-napló UI: a rendszer a fizikai készletet,
 * a projektfoglalásokat és a tényleges felhasználást kezeli.
 */
(function installWarehouseMaterials(){
  const KEY='kp_warehouse_materials_v1';
  const esc=v=>String(v??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>Number(v)||0;
  const id=()=>crypto?.randomUUID?.()||('id-'+Date.now()+'-'+Math.random().toString(36).slice(2));
  function load(){
    try{return JSON.parse(localStorage.getItem(KEY)||'null')||{products:[],stock:[],requirements:[],usage:[]};}catch{return {products:[],stock:[],requirements:[],usage:[]};}
  }
  function save(s){localStorage.setItem(KEY,JSON.stringify(s));}
  function state(){
    const s=load();
    // If the ERP already exposes product/warehouse data, merge it as the initial source.
    const d=window.db;
    if(d){
      if(Array.isArray(d.products)&&!s.products.length) s.products=d.products;
      if(Array.isArray(d.warehouseStock)&&!s.stock.length) s.stock=d.warehouseStock;
      if(Array.isArray(d.projects)&&!s.projects) s.projects=d.projects;
    }
    return s;
  }
  function products(s){return s.products||[];}
  function projects(s){
    if(Array.isArray(s.projects)) return s.projects;
    const d=window.db; return Array.isArray(d?.projects)?d.projects:[];
  }
  function pLabel(p){return [p.name,p.material_type,p.diameter_mm?`${p.diameter_mm} mm`:'',p.length_m?`${p.length_m} m`:'' ].filter(Boolean).join(' · ');}
  function stockQty(s,productId){
    const rows=(s.stock||[]).filter(x=>String(x.product_id||x.productId)===String(productId));
    if(rows.length) return rows.reduce((a,x)=>a+num(x.quantity),0);
    const p=products(s).find(x=>String(x.id)===String(productId)); return num(p?.stock||p?.quantity||0);
  }
  function reservedFor(s,productId,excludeProject){return (s.requirements||[]).filter(r=>String(r.product_id)===String(productId)&&String(r.project_id)!==String(excludeProject)).reduce((a,r)=>a+Math.max(0,num(r.required_qty)-num(r.used_qty)),0);}
  function freeQty(s,productId,excludeProject){return Math.max(0,stockQty(s,productId)-reservedFor(s,productId,excludeProject));}
  function requirementTotal(s,productId,excludeProject){return (s.requirements||[]).filter(r=>String(r.product_id)===String(productId)&&String(r.project_id)!==String(excludeProject)).reduce((a,r)=>a+Math.max(0,num(r.required_qty)-num(r.used_qty)),0);}
  function format(n){return num(n).toLocaleString('hu-HU',{maximumFractionDigits:3});}
  function bestPieces(s, productId, required){
    const p=products(s).find(x=>String(x.id)===String(productId)); if(!p||!p.length_m) return {ok:freeQty(s,productId)>=required,meters:freeQty(s,productId),pieces:[]};
    const target=Math.ceil(required*1000), maxExtra=Math.min(20000,Math.max(0,num(p.length_m)*1000));
    const candidates=products(s).filter(x=>String(x.material_type||'')===String(p.material_type||'')&&num(x.diameter_mm)===num(p.diameter_mm)&&num(x.length_m)>0);
    let best=null;
    for(const c of candidates){const q=stockQty(s,c.id); if(q<=0) continue; const free=Math.floor(freeQty(s,c.id)/1); for(let n=1;n<=Math.min(free,200);n++){const meters=n*num(c.length_m); if(meters+0.0001<required) continue; const over=meters-required; if(!best||over<best.over){best={over,meters,pieces:[{product:c,qty:n}]};}}}
    // Combine up to 2-3 stock lengths when a single length cannot cover efficiently.
    const usable=candidates.filter(c=>stockQty(s,c.id)>0&&freeQty(s,c.id)>0).slice(0,6);
    const rec=(idx,remain,chosen,meters)=>{if(remain<=0){const over=meters-required;if(!best||over<best.over)best={over,meters,pieces:chosen.map(x=>({...x}))};return;}if(idx>=usable.length||chosen.reduce((a,x)=>a+x.qty,0)>100)return;const c=usable[idx],max=Math.min(Math.floor(freeQty(s,c.id)),Math.ceil(remain/num(c.length_m))+2,30);for(let n=0;n<=max;n++){if(n)chosen.push({product:c,qty:n});rec(idx+1,remain-n*num(c.length_m),chosen,meters+n*num(c.length_m));if(n)chosen.pop();}};
    if(usable.length)rec(0,required,[],0);
    return best||{ok:false,meters:freeQty(s,productId),pieces:[]};
  }
  function render(){
    const root=document.getElementById('page'); if(!root)return;
    const s=state(), ps=products(s), rs=s.requirements||[], pr=projects(s);
    const total=ps.length, low=ps.filter(p=>stockQty(s,p.id)<=num(p.minimum_stock)).length;
    root.innerHTML=`<div class="cards"><div class="card"><div class="label">Anyagcikkek</div><div class="value">${total}</div></div><div class="card"><div class="label">Készleten lévő típusok</div><div class="value">${ps.filter(p=>stockQty(s,p.id)>0).length}</div></div><div class="card"><div class="label">Alacsony készlet</div><div class="value ${low?'amber':''}">${low}</div></div><div class="card"><div class="label">Aktív anyagigény</div><div class="value">${rs.filter(r=>r.status!=='closed').length}</div></div></div>
    <div class="panel" style="margin-top:16px"><div class="panelhead"><div><h2>Anyag / Raktár</h2><div class="sub">Fizikai készlet, projektfoglalás és anyagigény – külön készletmozgás-napló nélkül.</div></div><div><button class="btn secondary" id="wmAddProduct">+ Anyagcikk</button> <button class="btn" id="wmAddReq">+ Projekt anyagigény</button></div></div>
    <div class="toolbar"><input class="input search" id="wmSearch" placeholder="Keresés anyag, cikkszám, átmérő, típus alapján…"><select class="select" id="wmProjectFilter"><option value="">Minden projekt</option>${pr.map(x=>`<option value="${esc(x.id)}">${esc(x.name||x.project_number||'Projekt')}</option>`).join('')}</select></div>
    <div class="tablewrap"><table class="table"><thead><tr><th>Cikkszám</th><th>Anyag</th><th>Típus</th><th>Átmérő</th><th>Szálhossz</th><th>Fizikai</th><th>Lefoglalt</th><th>Szabad</th><th>Minimum</th><th>Állapot</th></tr></thead><tbody id="wmRows"></tbody></table></div></div>
    <div class="grid2"><div class="panel"><div class="panelhead"><div><h2>Projekt anyagigények</h2><div class="sub">A projektekhez szükséges anyagokat előre lefoglaljuk, a tényleges felhasználást külön vezetjük.</div></div></div><div class="tablewrap"><table class="table"><thead><tr><th>Projekt</th><th>Anyag</th><th>Igény</th><th>Foglalás</th><th>Felhasználva</th><th>Hiány</th><th>Állapot</th></tr></thead><tbody id="wmReqRows"></tbody></table></div></div><div class="panel"><div class="panelhead"><div><h2>Készletellenőrzés</h2><div class="sub">Új projektigény felvitelekor az ERP a többi projekt foglalásaival együtt számol.</div></div></div><div id="wmCheck" class="empty">Válassz projektet és anyagot az ellenőrzéshez.</div></div></div>`;
    function rows(){
      const q=(document.getElementById('wmSearch')?.value||'').toLocaleLowerCase('hu-HU');
      document.getElementById('wmRows').innerHTML=ps.filter(p=>!q||pLabel(p).toLocaleLowerCase('hu-HU').includes(q)||String(p.sku||'').toLocaleLowerCase('hu-HU').includes(q)).map(p=>{const phy=stockQty(s,p.id),res=reservedFor(s,p.id),free=Math.max(0,phy-res),min=num(p.minimum_stock);return `<tr><td><b>${esc(p.sku||'—')}</b></td><td>${esc(p.name||'')}</td><td>${esc(p.material_type||p.category||'')}</td><td>${p.diameter_mm?format(p.diameter_mm)+' mm':'—'}</td><td>${p.length_m?format(p.length_m)+' m':'—'}</td><td>${format(phy)} ${esc(p.material_unit||p.unit||'db')}</td><td>${format(res)}</td><td class="${free<min?'red':''}"><b>${format(free)}</b></td><td>${format(min)}</td><td>${free<min?'<span class="badge amber">Beszerzés</span>':'<span class="badge green">Rendben</span>'}</td></tr>`}).join('')||'<tr><td colspan="10" class="empty">Nincs anyagcikk.</td></tr>';
    }
    function reqRows(){document.getElementById('wmReqRows').innerHTML=rs.map(r=>{const p=ps.find(x=>String(x.id)===String(r.product_id)),x=pr.find(x=>String(x.id)===String(r.project_id)),need=num(r.required_qty),used=num(r.used_qty),res=num(r.reserved_qty),free=freeQty(s,r.product_id,r.project_id),short=Math.max(0,need-used-free-res);const ok=free+res>=Math.max(0,need-used);return `<tr><td>${esc(x?.name||x?.project_number||'Projekt')}</td><td>${esc(pLabel(p||{}))}</td><td>${format(need)} ${esc(r.required_unit||p?.unit||'db')}</td><td>${format(res)}</td><td>${format(used)}</td><td class="${short?'red':'green'}">${short?format(short):'0'} ${esc(r.required_unit||'db')}</td><td>${ok?'<span class="badge green">Fedezve</span>':'<span class="badge red">Hiány</span>'}</td></tr>`}).join('')||'<tr><td colspan="7" class="empty">Nincs projekt anyagigény.</td></tr>';}
    rows();reqRows();
    document.getElementById('wmSearch').oninput=rows;
    document.getElementById('wmAddProduct').onclick=()=>productModal();
    document.getElementById('wmAddReq').onclick=()=>requirementModal();
    document.getElementById('wmProjectFilter').onchange=e=>{const p=pr.find(x=>String(x.id)===String(e.target.value)); if(p) requirementModal(p.id);};
  }
  function productModal(){
    const m=document.createElement('div');m.className='modal';m.innerHTML=`<div class="modalbox"><div class="modalhead"><h2>Új anyagcikk</h2><button class="icon">×</button></div><div class="modalbody"><div class="formgrid"><div class="field"><label>Cikkszám</label><input id="wmSku" class="input" placeholder="pl. PVC-225-KM-3"></div><div class="field"><label>Megnevezés</label><input id="wmName" class="input" placeholder="225 mm KM PVC cső"></div><div class="field"><label>Anyagtípus</label><input id="wmType" class="input" placeholder="Vakcső / szűrőcső / KPE / kábel…"></div><div class="field"><label>Átmérő (mm)</label><input id="wmDia" class="input" type="number" step="0.1"></div><div class="field"><label>Szálhossz (m)</label><input id="wmLen" class="input" type="number" step="0.1"></div><div class="field"><label>Egység</label><select id="wmUnit" class="select"><option>db</option><option>m</option><option>kg</option><option>m³</option><option>l</option></select></div><div class="field"><label>Minimum készlet</label><input id="wmMin" class="input" type="number" step="0.1" value="0"></div><div class="field full"><label>Megjegyzés</label><textarea id="wmNote" class="textarea"></textarea></div></div><div class="modalfoot"><button class="btn secondary" id="wmCancel">Mégse</button><button class="btn" id="wmSaveProduct">Mentés</button></div></div></div>`;
    document.body.appendChild(m);const close=()=>m.remove();m.querySelector('.icon').onclick=close;m.querySelector('#wmCancel').onclick=close;m.querySelector('#wmSaveProduct').onclick=()=>{const s=state();const p={id:id(),sku:document.getElementById('wmSku').value.trim(),name:document.getElementById('wmName').value.trim(),material_type:document.getElementById('wmType').value.trim(),diameter_mm:num(document.getElementById('wmDia').value),length_m:num(document.getElementById('wmLen').value),unit:document.getElementById('wmUnit').value,material_unit:document.getElementById('wmUnit').value,minimum_stock:num(document.getElementById('wmMin').value),notes:document.getElementById('wmNote').value.trim()};if(!p.sku||!p.name){alert('A cikkszám és a megnevezés kötelező.');return;}if(s.products.some(x=>String(x.sku)===p.sku)){alert('Ez a cikkszám már létezik.');return;}s.products.push(p);save(s);close();render();};
  }
  function requirementModal(preProject){
    const s=state(),ps=products(s),pr=projects(s);const m=document.createElement('div');m.className='modal';m.innerHTML=`<div class="modalbox"><div class="modalhead"><h2>Projekt anyagigény</h2><button class="icon">×</button></div><div class="modalbody"><div class="formgrid"><div class="field"><label>Projekt</label><select id="wmReqProject" class="select"><option value="">Válassz…</option>${pr.map(x=>`<option value="${esc(x.id)}" ${String(x.id)===String(preProject)?'selected':''}>${esc(x.name||x.project_number||'Projekt')}</option>`).join('')}</select></div><div class="field"><label>Anyag</label><select id="wmReqProduct" class="select"><option value="">Válassz…</option>${ps.map(p=>`<option value="${esc(p.id)}">${esc(pLabel(p))}</option>`).join('')}</select></div><div class="field"><label>Szükséges mennyiség</label><input id="wmReqQty" class="input" type="number" step="0.1" min="0"></div><div class="field"><label>Egység</label><select id="wmReqUnit" class="select"><option>db</option><option>m</option><option>kg</option><option>m³</option><option>l</option></select></div><div class="field full"><div id="wmReqCheck" class="notice">Válassz projektet és anyagot a készletellenőrzéshez.</div></div></div><div class="modalfoot"><button class="btn secondary" id="wmReqCancel">Mégse</button><button class="btn" id="wmReqSave">Foglalás és mentés</button></div></div></div>`;
    document.body.appendChild(m);const close=()=>m.remove();m.querySelector('.icon').onclick=close;m.querySelector('#wmReqCancel').onclick=close;
    const check=()=>{const project=document.getElementById('wmReqProject').value,product=document.getElementById('wmReqProduct').value,qty=num(document.getElementById('wmReqQty').value);if(!project||!product||!qty){document.getElementById('wmReqCheck').innerHTML='Válassz projektet, anyagot és mennyiséget.';return;}const p=ps.find(x=>String(x.id)===product),phy=stockQty(s,product),reserved=reservedFor(s,product,project),free=Math.max(0,phy-reserved),comb=p?.length_m&&document.getElementById('wmReqUnit').value==='m'?bestPieces(s,product,qty):null;document.getElementById('wmReqCheck').innerHTML=`<b>Fizikai készlet:</b> ${format(phy)} ${esc(p?.unit||'db')} &nbsp; <b>Más projektek foglalása:</b> ${format(reserved)} &nbsp; <b>Szabad:</b> ${format(free)}<br>${free>=qty?'<span class="green"><b>✓ Elegendő szabad készlet.</b></span>':'<span class="red"><b>⚠ Hiány: '+format(qty-free)+' '+esc(document.getElementById('wmReqUnit').value)+'</b></span>'}${comb?.pieces?.length?'<br><br><b>Javasolt szálak:</b> '+comb.pieces.map(x=>`${x.qty} × ${format(x.product.length_m)} m`).join(' + ')+` = ${format(comb.meters)} m`:''}`;};
    ['wmReqProject','wmReqProduct','wmReqQty','wmReqUnit'].forEach(x=>document.getElementById(x).oninput=check);document.getElementById('wmReqSave').onclick=()=>{const project=document.getElementById('wmReqProject').value,product=document.getElementById('wmReqProduct').value,qty=num(document.getElementById('wmReqQty').value),unit=document.getElementById('wmReqUnit').value;if(!project||!product||qty<=0){alert('A projekt, anyag és mennyiség kötelező.');return;}const s2=state(),existing=s2.requirements.find(r=>String(r.project_id)===String(project)&&String(r.product_id)===String(product));if(existing){existing.required_qty=qty;existing.required_unit=unit;existing.reserved_qty=Math.max(0,qty-num(existing.used_qty));existing.status='planned';}else s2.requirements.push({id:id(),project_id:project,product_id:product,required_qty:qty,required_unit:unit,reserved_qty:qty,used_qty:0,status:'planned',created_at:new Date().toISOString()});save(s2);close();render();};
  }
  // Public hook for the worklog: actual material use reduces physical stock and the project's open requirement.
  window.kpRecordMaterialUse=function({projectId,productId,quantity,unit='db',workLogId=null}={}){const s=state(),q=num(quantity);if(!projectId||!productId||q<=0)return {ok:false,error:'Érvénytelen anyagfelhasználás'};const available=stockQty(s,productId);if(available<q)return {ok:false,error:`Nincs elegendő készlet. Szabad fizikai készlet: ${format(available)}`};const p=s.products.find(x=>String(x.id)===String(productId));const rows=(s.stock||[]).filter(x=>String(x.product_id||x.productId)===String(productId));let left=q;for(const r of rows){const take=Math.min(left,num(r.quantity));r.quantity=num(r.quantity)-take;left-=take;if(left<=0)break;}if(!rows.length&&p){p.stock=Math.max(0,num(p.stock)-q);}const req=s.requirements.find(r=>String(r.project_id)===String(projectId)&&String(r.product_id)===String(productId));if(req){req.used_qty=num(req.used_qty)+q;req.reserved_qty=Math.max(0,num(req.required_qty)-req.used_qty);if(req.used_qty>=num(req.required_qty))req.status='closed';}s.usage.push({id:id(),project_id:projectId,product_id:productId,quantity:q,unit,work_log_id,created_at:new Date().toISOString()});save(s);return {ok:true};};
  function hook(){
    const nav=[...document.querySelectorAll('#nav .nav')].find(b=>String(b.textContent||'').includes('Anyag / Raktár'));if(nav){nav.onclick=e=>{e.preventDefault();render();};}
    if(typeof window.openWarehouse==='function'&&!window.__wmWrapped){window.__wmWrapped=true;const old=window.openWarehouse;window.openWarehouse=function(){render();try{history.replaceState(null,'','#/warehouse');}catch{}};}
  }
  function start(){let n=0;const t=setInterval(()=>{hook();n++;if(n>100)clearInterval(t);},100);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
