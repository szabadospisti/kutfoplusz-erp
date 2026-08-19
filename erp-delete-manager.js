/* Kútfő Plusz ERP – egységes törlési réteg. */
(function(){
  'use strict';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const cfg=()=>window.SUPABASE_CONFIG||{};
  const session=()=>{try{return JSON.parse(localStorage.getItem('kutfoplusz_supabase_session_v1')||'null')}catch{return null}};
  async function rest(path,options={}){
    const c=cfg(),s=session();
    if(!c.url||!c.publishableKey||!s?.access_token) throw new Error('Supabase kapcsolat nincs bejelentkezve.');
    const headers=Object.assign({apikey:c.publishableKey,Authorization:'Bearer '+s.access_token,Accept:'application/json','Content-Type':'application/json'},options.headers||{});
    const r=await fetch(c.url.replace(/\/$/,'')+'/rest/v1/'+path,Object.assign({},options,{headers}));
    if(!r.ok) throw new Error('Supabase '+r.status+': '+(await r.text()));
    return r;
  }
  async function deleteCustomer(id){
    const c=(db.customers||[]).find(x=>String(x.id)===String(id)); if(!c)return;
    const linkedProjects=(db.projects||[]).filter(x=>String(x.customerId)===String(id));
    const linkedQuotes=(db.quotes||[]).filter(x=>String(x.customerId)===String(id));
    const linkedLogs=(db.worklogs||[]).filter(x=>String(x.customerId)===String(id));
    if(linkedProjects.length||linkedQuotes.length||linkedLogs.length) throw new Error('Az ügyfél nem törölhető: kapcsolódó projekt, ajánlat vagy munkanapló tartozik hozzá.');
    if(!confirm('Biztosan törlöd ezt az ügyfelet?\n\n'+(c.name||id)))return false;
    if(c.supabaseId||String(id).includes('-')) await rest('customers?id=eq.'+encodeURIComponent(c.supabaseId||id),{method:'DELETE',headers:{Prefer:'return=minimal'}});
    db.customers=db.customers.filter(x=>String(x.id)!==String(id));
    if(typeof save==='function')save(); else localStorage.setItem('kutfoplusz_erp_v12',JSON.stringify(db));
    closeModal?.(); render?.(); toast?.('Ügyfél törölve'); return true;
  }
  async function deleteProject(id){
    const p=(db.projects||[]).find(x=>String(x.id)===String(id)); if(!p)return;
    const linked=(db.worklogs||[]).filter(w=>String(w.projectId)===String(id));
    if(linked.length) throw new Error('A projekt nem törölhető, mert '+linked.length+' munkanapló kapcsolódik hozzá.');
    if(!confirm('Biztosan törlöd ezt a projektet?\n\n'+(p.name||id)))return false;
    const remoteId=p.supabaseId||null;
    if(remoteId) await rest('projects?id=eq.'+encodeURIComponent(remoteId),{method:'DELETE',headers:{Prefer:'return=minimal'}});
    db.projects=db.projects.filter(x=>String(x.id)!==String(id));
    if(typeof save==='function')save(); else localStorage.setItem('kutfoplusz_erp_v12',JSON.stringify(db));
    closeDrawer?.();closeModal?.();nav?.('projects');toast?.('Projekt törölve');return true;
  }
  async function deleteQuote(id){
    const q=(db.quotes||[]).find(x=>String(x.id)===String(id));if(!q)return;
    if(!confirm('Biztosan törlöd ezt az ajánlatot?\n\n'+(q.id||id)))return false;
    if(q.supabaseId) await rest('quotes?id=eq.'+encodeURIComponent(q.supabaseId),{method:'DELETE',headers:{Prefer:'return=minimal'}});
    db.quotes=db.quotes.filter(x=>String(x.id)!==String(id));
    if(typeof save==='function')save();render?.();toast?.('Ajánlat törölve');return true;
  }
  async function deleteWorklog(id){
    const w=(db.worklogs||[]).find(x=>String(x.id)===String(id));if(!w)return;
    if(!confirm('Biztosan törlöd ezt a munkanaplót?\n\n'+(w.id||id)))return false;
    if(w.supabaseId){
      await rest('well_layers?work_log_id=eq.'+encodeURIComponent(w.supabaseId),{method:'DELETE',headers:{Prefer:'return=minimal'}});
      await rest('work_log_filters?work_log_id=eq.'+encodeURIComponent(w.supabaseId),{method:'DELETE',headers:{Prefer:'return=minimal'}});
      await rest('work_logs?id=eq.'+encodeURIComponent(w.supabaseId),{method:'DELETE',headers:{Prefer:'return=minimal'}});
    }
    db.worklogs=db.worklogs.filter(x=>String(x.id)!==String(id));
    if(typeof save==='function')save();closeModal?.();render?.();toast?.('Munkanapló törölve');return true;
  }
  async function deleteMachine(id){
    const m=(db.machines||[]).find(x=>String(x.id)===String(id));if(!m)return;
    if(!confirm('Biztosan törlöd ezt a gépet?\n\n'+(m.name||id)))return false;
    db.machines=db.machines.filter(x=>String(x.id)!==String(id));
    if(typeof save==='function')save();render?.();toast?.('Gép törölve');return true;
  }
  async function deleteMaterial(id){
    const m=(db.materials||[]).find(x=>String(x.id)===String(id));if(!m)return;
    if(!confirm('Biztosan törlöd ezt az anyagot?\n\n'+(m.name||id)))return false;
    db.materials=db.materials.filter(x=>String(x.id)!==String(id));
    if(typeof save==='function')save();render?.();toast?.('Anyag törölve');return true;
  }
  function installGlobals(){
    window.deleteCustomer=deleteCustomer;
    window.kpDeleteCustomer=deleteCustomer;
    window.deleteProject=deleteProject;
    window.kpDeleteProject=deleteProject;
    window.deleteQuote=deleteQuote;
    window.kpDeleteQuote=deleteQuote;
    window.deleteWorklog=deleteWorklog;
    window.kpDeleteWorklog=deleteWorklog;
    window.deleteMachine=deleteMachine;
    window.kpDeleteMachine=deleteMachine;
    window.kpDeleteMaterial=deleteMaterial;
  }
  function addButton(parent,cls,text,fn){if(parent.querySelector('.'+cls))return;const b=document.createElement('button');b.type='button';b.className='btn danger small '+cls;b.textContent='🗑️ '+text;b.onclick=fn;parent.appendChild(b);}
  function decorate(){
    // Customers: add delete button to each row.
    document.querySelectorAll('#ct tbody tr').forEach(tr=>{const link=tr.querySelector('.link[onclick^="customerDetails"]');const m=link?.getAttribute('onclick')?.match(/'([^']+)'/);if(!m)return;const edit=tr.querySelector('button[onclick^="editCustomer"]');const cell=edit?.parentElement;if(cell)addButton(cell,'kpDeleteCustomerBtn','Törlés',()=>deleteCustomer(m[1]));});
    // Projects: add delete button to each project detail drawer when opened.
    const d=document.getElementById('drawer');if(d){const edit=d.querySelector('button[onclick^="editProject"]');const m=edit?.getAttribute('onclick')?.match(/'([^']+)'/);if(m)addButton(edit.parentElement,'kpDeleteProjectBtn','Törlés',()=>deleteProject(m[1]));}
    // Quotes: add a delete action to each row.
    document.querySelectorAll('#qt tbody tr').forEach(tr=>{const link=tr.querySelector('[data-quote-id]');const id=link?.getAttribute('data-quote-id');const cell=tr.lastElementChild;if(id&&cell)addButton(cell,'kpDeleteQuoteBtn','Törlés',()=>deleteQuote(id));});
    // Worklogs: add a delete action to each row.
    document.querySelectorAll('.table tbody tr').forEach(tr=>{const b=tr.querySelector('button[onclick^="editWorklog"]');const m=b?.getAttribute('onclick')?.match(/'([^']+)'/);if(m)addButton(b.parentElement,'kpDeleteWorklogBtn','Törlés',()=>deleteWorklog(m[1]));});
    // Machines/materials are local+erp_state data in this version.
    document.querySelectorAll('button[onclick^="deleteMachine"]').forEach(b=>{const m=b.getAttribute('onclick')?.match(/'([^']+)'/);if(m)b.onclick=()=>deleteMachine(m[1]);});
    document.querySelectorAll('#wmRows tr').forEach(tr=>{const sku=tr.querySelector('td')?.textContent?.trim();if(!sku)return;const p=(db.materials||[]).find(x=>String(x.id)===String(sku)||String(x.sku||'')===sku);if(p)addButton(tr.lastElementChild||tr,'kpDeleteMaterialBtn','Törlés',()=>deleteMaterial(p.id));});
  }
  async function boot(){for(let i=0;i<120;i++){if(window.db&&window.SUPABASE_CONFIG)break;await sleep(100);}installGlobals();decorate();const obs=new MutationObserver(decorate);obs.observe(document.body,{childList:true,subtree:true});}
  boot();
})();
