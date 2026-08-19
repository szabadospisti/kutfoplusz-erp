/* Kútfő Plusz ERP – egységes projekt CRUD az Ügyfelek mintájára. */
(function(){
  'use strict';
  function waitReady(){return window.KPProjectCRUD.ready();}
  async function remoteFor(localProject){
    await waitReady();
    if(!localProject)return null;
    try{const found=await window.KPProjectSupabase.findByProjectNumber(localProject.id);if(found)return found;}catch(err){console.warn('Projekt lookup hiba:',err);}
    if(localProject.supabaseId)return{id:localProject.supabaseId,project_number:localProject.id};
    return null;
  }
  async function resolveEditProject(e,id){
    const key=String(id||e.target?.dataset?.projectId||e.target?.getAttribute('data-project-id')||'');
    let p=(window.db&&Array.isArray(db.projects))?db.projects.find(x=>String(x.id)===key||String(x.supabaseId||'')===key):null;
    if(p)return p;
    if(key){
      const remote=await remoteFor({id:key});
      if(remote)return{id:remote.project_number||key,supabaseId:remote.id,customerId:remote.customer_id||'',customerName:'',name:remote.name||'',status:remote.status||'Tervezés',location:remote.location||'',value:+remote.contract_value||0,progress:+remote.progress_pct||0,planned:+remote.planned_cost||0,cost:+remote.actual_cost||0,notes:remote.notes||''};
    }
    return null;
  }
  function customerName(customerId){
    const list=(typeof db!=='undefined'&&db&&Array.isArray(db.customers))?db.customers:[];
    const c=list.find(x=>String(x.id)===String(customerId)||String(x.supabaseId)===String(customerId));
    return c?(c.name||c.company_name||c.companyName||''):'';
  }
  function localFromForm(o,id){return{id:id,customerId:o.customerId,customerName:customerName(o.customerId),name:o.name,status:o.status,location:o.location,value:+o.value||0,progress:Math.max(0,Math.min(100,+o.progress||0)),planned:+o.planned||0,cost:+o.cost||0,notes:o.notes||''};}
  function cleanupDuplicateProjectDeleteButtons(){document.querySelectorAll('#drawer .kpDeleteProjectBtn').forEach(function(btn){btn.remove();});}
  function updateCreateProjectButton(){document.querySelectorAll('form[onsubmit*="saveProject"]').forEach(function(form){const isEdit=/saveProjectEdit/.test(form.getAttribute('onsubmit')||'');if(isEdit)return;form.querySelectorAll('button').forEach(function(btn){if((btn.textContent||'').trim()==='Mentés')btn.textContent='Létrehozás';});});}
  function forceCloseProjectEdit(form){
    try{if(typeof closeModal==='function')closeModal();}catch(e){}
    try{if(typeof closeDrawer==='function')closeDrawer();}catch(e){}
    const modal=form&&form.closest('.modal');
    if(modal){modal.classList.add('hidden');modal.style.display='none';}
    document.querySelectorAll('.modal').forEach(function(m){if(m.contains(form)){m.classList.add('hidden');m.style.display='none';}});
  }
  async function patchProjectDirect(p,local,remote){
    const payload=Object.assign({},local,{customerId:local.customerId,customerName:customerName(local.customerId)});
    const updated=await window.KPProjectSupabase.updateByProjectNumber(local.id,payload);
    if(!updated)throw new Error('A Supabase nem adott vissza frissített projektet. A módosítás nem tekinthető elmentettnek.');
    const verify=await window.KPProjectSupabase.findByProjectNumber(local.id);
    if(!verify)throw new Error('A projekt frissítése után nem található a Supabase projects táblában.');
    const checks=[['name',String(local.name||''),String(verify.name||'')],['location',String(local.location||''),String(verify.location||'')],['status',String(local.status||'Tervezés'),String(verify.status||'Tervezés')],['contract_value',String(+local.value||0),String(+verify.contract_value||0)],['planned_cost',String(+local.planned||0),String(+verify.planned_cost||0)],['actual_cost',String(+local.cost||0),String(+verify.actual_cost||0)],['progress_pct',String(+local.progress||0),String(+verify.progress_pct||0)],['notes',String(local.notes||''),String(verify.notes||'')]];
    const mismatch=checks.find(x=>x[1]!==x[2]);
    if(mismatch)throw new Error('A Supabase mentés ellenőrzése sikertelen ('+mismatch[0]+'). A módosítás nem lett biztosan elmentve.');
    return verify;
  }
  function install(){
    if(typeof window.saveProject!=='function'||typeof window.saveProjectEdit!=='function'||typeof window.deleteProject!=='function')return setTimeout(install,100);
    window.__KP_PROJECT_CRUD_HOOKED__=true;
    window.saveProject=async function(e){e.preventDefault();try{const o=Object.fromEntries(new FormData(e.target).entries());const projectNumber=(typeof uid==='function')?uid('KP'):('KP-'+Date.now());const local=localFromForm(o,projectNumber);const remote=await window.KPProjectCRUD.create(local);local.supabaseId=remote.id;db.projects.push(local);save();closeModal();nav('projects');toast('Projekt létrehozva és Supabase-ben mentve');}catch(err){console.error(err);toast('Hiba: '+(err.message||err));}return false;};
    window.saveProjectEdit=async function(e,id){e.preventDefault();try{const p=await resolveEditProject(e,id);if(!p)throw new Error('A projekt nem található.');const o=Object.fromEntries(new FormData(e.target).entries());const local=localFromForm(o,p.id);const remote=await remoteFor(p);if(!remote)throw new Error('A projekt nincs összekötve a Supabase rekorddal.');const updated=await patchProjectDirect(p,local,remote);if(window.db&&Array.isArray(db.projects)){const idx=db.projects.findIndex(x=>String(x.id)===String(p.id)||String(x.supabaseId)===String(remote.id));if(idx>=0)Object.assign(db.projects[idx],local,{supabaseId:updated.id});else db.projects.push(Object.assign({},local,{supabaseId:updated.id}));}save();forceCloseProjectEdit(e.target);nav('projects');toast('Projekt módosítva és Supabase-ben ellenőrzötten mentve');}catch(err){console.error('Projekt módosítás:',err);toast('Hiba: '+(err.message||err));}return false;};
    window.deleteProject=async function(id){const p=db.projects.find(x=>String(x.id)===String(id));if(!p)return;const linked=(db.worklogs||[]).filter(w=>String(w.projectId)===String(id)).length;const msg=`Biztosan törlöd ezt a projektet?\n\n${p.name}\n${linked?'Kapcsolódó munkanaplók: '+linked+' db.':''}`;if(!confirm(msg))return;try{const remote=await remoteFor(p);if(!remote)throw new Error('A projekt nem található a Supabase projects táblában.');await window.KPProjectSupabase.remove(remote.id);db.projects=db.projects.filter(x=>String(x.id)!==String(id));save();closeDrawer();nav('projects');toast('Projekt törölve az ERP-ből és Supabase-ből');}catch(err){console.error(err);toast('Törlés sikertelen: '+(err.message||err));}};
    window.kpDeleteProject=window.deleteProject;window.KPProjectCRUDLive=true;cleanupDuplicateProjectDeleteButtons();updateCreateProjectButton();new MutationObserver(function(){cleanupDuplicateProjectDeleteButtons();updateCreateProjectButton();}).observe(document.body,{childList:true,subtree:true});
  }
  waitReady().then(install).catch(function(err){console.error(err);});
})();
