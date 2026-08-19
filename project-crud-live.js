/* Kútfő Plusz ERP – egységes projekt CRUD az Ügyfelek mintájára. */
(function(){
  'use strict';
  function waitReady(){return window.KPProjectCRUD.ready();}
  async function remoteFor(localProject){
    await waitReady();
    if(localProject&&localProject.supabaseId)return{id:localProject.supabaseId};
    if(!localProject)return null;
    try{const found=await window.KPProjectSupabase.findByProjectNumber(localProject.id);if(found)return found;}catch(err){console.warn('Projekt lookup hiba:',err);}
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
  function updateCreateProjectButton(){
    document.querySelectorAll('form[onsubmit*="saveProject"]').forEach(function(form){
      const isEdit=/saveProjectEdit/.test(form.getAttribute('onsubmit')||'');
      if(isEdit)return;
      form.querySelectorAll('button').forEach(function(btn){
        if((btn.textContent||'').trim()==='Mentés')btn.textContent='Létrehozás';
      });
    });
  }
  async function patchProjectDirect(p,local,remote){
    const customerId=local.customerId;
    const customerNameValue=customerName(customerId);
    const payload=Object.assign({},local,{customerId:customerId,customerName:customerNameValue});
    const updated=await window.KPProjectSupabase.update(remote.id,payload);
    if(!updated)throw new Error('A projekt mentése nem adott vissza Supabase rekordot.');
    return updated;
  }
  function install(){
    if(typeof window.saveProject!=='function'||typeof window.saveProjectEdit!=='function'||typeof window.deleteProject!=='function')return setTimeout(install,100);
    window.__KP_PROJECT_CRUD_HOOKED__=true;
    window.saveProject=async function(e){e.preventDefault();try{const o=Object.fromEntries(new FormData(e.target).entries());const projectNumber=(typeof uid==='function')?uid('KP'):('KP-'+Date.now());const local=localFromForm(o,projectNumber);const remote=await window.KPProjectCRUD.create(local);local.supabaseId=remote.id;db.projects.push(local);save();closeModal();nav('projects');toast('Projekt létrehozva és Supabase-ben mentve');}catch(err){console.error(err);toast('Hiba: '+(err.message||err));}return false;};
    window.saveProjectEdit=async function(e,id){e.preventDefault();try{const p=await resolveEditProject(e,id);if(!p)throw new Error('A projekt nem található.');const o=Object.fromEntries(new FormData(e.target).entries());const local=localFromForm(o,p.id);const remote=await remoteFor(p);if(!remote)throw new Error('A projekt nincs összekötve a Supabase rekorddal.');const updated=await patchProjectDirect(p,local,remote);if(window.db&&Array.isArray(db.projects)){const idx=db.projects.findIndex(x=>String(x.id)===String(p.id)||String(x.supabaseId)===String(remote.id));if(idx>=0)Object.assign(db.projects[idx],local,{supabaseId:updated.id});else db.projects.push(Object.assign({},local,{supabaseId:updated.id}));}save();closeModal();closeDrawer();nav('projects');toast('Projekt módosítva és Supabase-ben mentve');}catch(err){console.error('Projekt módosítás:',err);toast('Hiba: '+(err.message||err));}return false;};
    window.deleteProject=async function(id){const p=db.projects.find(x=>String(x.id)===String(id));if(!p)return;const linked=(db.worklogs||[]).filter(w=>String(w.projectId)===String(id)).length;const msg=`Biztosan törlöd ezt a projektet?\n\n${p.name}\n${linked?'Kapcsolódó munkanaplók: '+linked+' db.':''}`;if(!confirm(msg))return;try{const remote=await remoteFor(p);if(!remote)throw new Error('A projekt nem található a Supabase projects táblában.');await window.KPProjectSupabase.remove(remote.id);db.projects=db.projects.filter(x=>String(x.id)!==String(id));save();closeDrawer();nav('projects');toast('Projekt törölve az ERP-ből és Supabase-ből');}catch(err){console.error(err);toast('Törlés sikertelen: '+(err.message||err));}};
    window.kpDeleteProject=window.deleteProject;
    window.KPProjectCRUDLive=true;
    cleanupDuplicateProjectDeleteButtons();
    updateCreateProjectButton();
    new MutationObserver(function(){cleanupDuplicateProjectDeleteButtons();updateCreateProjectButton();}).observe(document.body,{childList:true,subtree:true});
  }
  waitReady().then(install).catch(function(err){console.error(err);});
})();
