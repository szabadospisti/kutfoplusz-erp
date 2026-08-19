/* Kútfő Plusz ERP – egységes törlési réteg. */
(function(){
  'use strict';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const cfg=()=>window.SUPABASE_CONFIG||{};
  const session=()=>{try{return JSON.parse(localStorage.getItem('kutfoplusz_supabase_session_v1')||'null')}catch{return null}};
  async function rest(path,options={}){
    const c=cfg(),s=session();
    if(!c.url||!c.publishableKey) throw new Error('Supabase konfiguráció nincs betöltve.');
    const token=s?.access_token||c.publishableKey;
    const headers=Object.assign({apikey:c.publishableKey,Authorization:'Bearer '+token,Accept:'application/json','Content-Type':'application/json'},options.headers||{});
    const r=await fetch(c.url.replace(/\/$/,'')+'/rest/v1/'+path,Object.assign({},options,{headers}));
    if(!r.ok) throw new Error('Supabase '+r.status+': '+(await r.text()));
    const text=await r.text();
    try{return text?JSON.parse(text):null}catch{return null}
  }
  function data(){try{return typeof db!=='undefined'?db:null}catch(e){return null}}

  async function deleteCustomer(id){
    const d=data();if(!d)return;
    const c=(d.customers||[]).find(x=>String(x.id)===String(id));if(!c)return;
    const linkedProjects=(d.projects||[]).filter(x=>String(x.customerId)===String(id));
    const linkedQuotes=(d.quotes||[]).filter(x=>String(x.customerId)===String(id));
    const linkedLogs=(d.worklogs||[]).filter(x=>String(x.customerId)===String(id));
    if(linkedProjects.length||linkedQuotes.length||linkedLogs.length)throw new Error('Az ügyfél nem törölhető: kapcsolódó projekt, ajánlat vagy munkanapló tartozik hozzá.');
    if(!confirm('Biztosan törlöd ezt az ügyfelet?\n\n'+(c.name||id)))return false;
    if(c.supabaseId)await rest('customers?id=eq.'+encodeURIComponent(c.supabaseId),{method:'DELETE',headers:{Prefer:'return=minimal'}});
    d.customers=d.customers.filter(x=>String(x.id)!==String(id));
    if(typeof save==='function')save();else localStorage.setItem('kutfoplusz_erp_v12',JSON.stringify(d));
    if(typeof closeModal==='function')closeModal();if(typeof closeDrawer==='function')closeDrawer();if(typeof render==='function')render();if(typeof toast==='function')toast('Ügyfél törölve');return true;
  }

  async function findRemoteProject(p){
    if(p?.supabaseId)return p.supabaseId;
    try{
      const rows=await rest('projects?select=id,project_number&project_number=eq.'+encodeURIComponent(p.id));
      return rows?.[0]?.id||null;
    }catch(e){console.warn('Projekt távoli keresés:',e);return null}
  }

  async function deleteProject(id){
    const d=data();if(!d)return;
    const p=(d.projects||[]).find(x=>String(x.id)===String(id));if(!p)return;
    const linked=(d.worklogs||[]).filter(w=>String(w.projectId)===String(id));
    if(linked.length)throw new Error('A projekt nem törölhető, mert '+linked.length+' munkanapló kapcsolódik hozzá. Előbb töröld a kapcsolódó munkanaplókat.');
    if(!confirm('Biztosan törlöd ezt a projektet?\n\n'+(p.name||id)))return false;
    const remoteId=await findRemoteProject(p);
    if(remoteId){
      // Biztonsági sorrend: kapcsolódó rekordok törlése, majd maga a projekt.
      await rest('work_logs?project_id=eq.'+encodeURIComponent(remoteId),{method:'DELETE',headers:{Prefer:'return=minimal'}});
      await rest('projects?id=eq.'+encodeURIComponent(remoteId),{method:'DELETE',headers:{Prefer:'return=minimal'}});
    }
    d.projects=d.projects.filter(x=>String(x.id)!==String(id));
    if(typeof save==='function')save();
    if(typeof closeDrawer==='function')closeDrawer();if(typeof closeModal==='function')closeModal();if(typeof nav==='function')nav('projects');if(typeof toast==='function')toast('Projekt törölve');return true;
  }

  async function deleteQuote(id){
    const d=data();if(!d)return;const q=(d.quotes||[]).find(x=>String(x.id)===String(id));if(!q)return;
    if(!confirm('Biztosan törlöd ezt az ajánlatot?\n\n'+(q.id||id)))return false;
    if(q.supabaseId)await rest('quotes?id=eq.'+encodeURIComponent(q.supabaseId),{method:'DELETE',headers:{Prefer:'return=minimal'}});
    d.quotes=d.quotes.filter(x=>String(x.id)!==String(id));if(typeof save==='function')save();if(typeof render==='function')render();if(typeof toast==='function')toast('Ajánlat törölve');return true;
  }

  async function deleteWorklog(id){
    const d=data();if(!d)return;const w=(d.worklogs||[]).find(x=>String(x.id)===String(id));if(!w)return;
    if(!confirm('Biztosan törlöd ezt a munkanaplót?\n\n'+(w.id||id)))return false;
    if(w.supabaseId){
      await rest('well_layers?work_log_id=eq.'+encodeURIComponent(w.supabaseId),{method:'DELETE',headers:{Prefer:'return=minimal'}});
      await rest('work_log_filters?work_log_id=eq.'+encodeURIComponent(w.supabaseId),{method:'DELETE',headers:{Prefer:'return=minimal'}});
      await rest('work_logs?id=eq.'+encodeURIComponent(w.supabaseId),{method:'DELETE',headers:{Prefer:'return=minimal'}});
    }
    d.worklogs=d.worklogs.filter(x=>String(x.id)!==String(id));if(typeof save==='function')save();if(typeof closeModal==='function')closeModal();if(typeof render==='function')render();if(typeof toast==='function')toast('Munkanapló törölve');return true;
  }

  async function deleteMachine(id){const d=data();if(!d)return;const m=(d.machines||[]).find(x=>String(x.id)===String(id));if(!m)return;if(!confirm('Biztosan törlöd ezt a gépet?\n\n'+(m.name||id)))return false;d.machines=d.machines.filter(x=>String(x.id)!==String(id));if(typeof save==='function')save();if(typeof render==='function')render();if(typeof toast==='function')toast('Gép törölve');return true}
  async function deleteMaterial(id){const d=data();if(!d)return;const m=(d.materials||[]).find(x=>String(x.id)===String(id));if(!m)return;if(!confirm('Biztosan törlöd ezt az anyagot?\n\n'+(m.name||id)))return false;d.materials=d.materials.filter(x=>String(x.id)!==String(id));if(typeof save==='function')save();if(typeof render==='function')render();if(typeof toast==='function')toast('Anyag törölve');return true}

  function installGlobals(){
    window.deleteCustomer=deleteCustomer;window.kpDeleteCustomer=deleteCustomer;
    window.deleteProject=deleteProject;window.kpDeleteProject=deleteProject;
    window.deleteQuote=deleteQuote;window.kpDeleteQuote=deleteQuote;
    window.deleteWorklog=deleteWorklog;window.kpDeleteWorklog=deleteWorklog;
    window.deleteMachine=deleteMachine;window.kpDeleteMachine=deleteMachine;
    window.kpDeleteMaterial=deleteMaterial;
  }
  function addButton(parent,cls,text,fn){if(!parent||parent.querySelector('.'+cls))return;const b=document.createElement('button');b.type='button';b.className='btn danger small '+cls;b.textContent='🗑️ '+text;b.onclick=async()=>{try{await fn()}catch(e){console.error(e);if(typeof toast==='function')toast('Hiba: '+(e.message||e))}};parent.appendChild(b)}
  function decorate(){
    const d=data();if(!d)return;
    document.querySelectorAll('#ct tbody tr').forEach(tr=>{const link=tr.querySelector('.link[onclick^="customerDetails"]');const m=link?.getAttribute('onclick')?.match(/'([^']+)'/);if(!m)return;const edit=tr.querySelector('button[onclick^="editCustomer"]');const cell=edit?.parentElement;if(cell)addButton(cell,'kpDeleteCustomerBtn','Törlés',()=>deleteCustomer(m[1]))});
    const drawer=document.getElementById('drawer');if(drawer){const edit=drawer.querySelector('button[onclick^="editProject"]');const m=edit?.getAttribute('onclick')?.match(/'([^']+)'/);if(m)addButton(edit.parentElement,'kpDeleteProjectBtn','Törlés',()=>deleteProject(m[1]))}
    document.querySelectorAll('#qt tbody tr').forEach(tr=>{const link=tr.querySelector('[data-quote-id]');const id=link?.getAttribute('data-quote-id');const cell=tr.lastElementChild;if(id&&cell)addButton(cell,'kpDeleteQuoteBtn','Törlés',()=>deleteQuote(id))});
    document.querySelectorAll('.table tbody tr').forEach(tr=>{const b=tr.querySelector('button[onclick^="editWorklog"]');const m=b?.getAttribute('onclick')?.match(/'([^']+)'/);if(m)addButton(b.parentElement,'kpDeleteWorklogBtn','Törlés',()=>deleteWorklog(m[1]))});
    document.querySelectorAll('button[onclick^="deleteMachine"]').forEach(b=>{const m=b.getAttribute('onclick')?.match(/'([^']+)'/);if(m)b.onclick=()=>deleteMachine(m[1])});
    document.querySelectorAll('#wmRows tr').forEach(tr=>{const sku=tr.querySelector('td')?.textContent?.trim();if(!sku)return;const p=(d.materials||[]).find(x=>String(x.id)===String(sku)||String(x.sku||'')===sku);if(p)addButton(tr.lastElementChild||tr,'kpDeleteMaterialBtn','Törlés',()=>deleteMaterial(p.id))});
  }
  async function boot(){for(let i=0;i<120;i++){if(data()&&window.SUPABASE_CONFIG)break;await sleep(100)}installGlobals();decorate();const obs=new MutationObserver(decorate);obs.observe(document.body,{childList:true,subtree:true})}
  boot();
})();