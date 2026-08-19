/* Live bridge for the existing ERP project module. */
(function(){
  'use strict';
  function waitReady(){return window.KPProjectCRUD.ready();}
  async function remoteFor(localProject){
    await waitReady();
    try{const found=await window.KPProjectSupabase.findByProjectNumber(localProject.id);if(found)return found;}catch(err){console.warn('Projekt lookup hiba:',err);}
    try{const c=window.SUPABASE_CONFIG;if(c&&c.url&&c.publishableKey){const headers={apikey:c.publishableKey,Authorization:'Bearer '+c.publishableKey,Accept:'application/json'};const url=c.url+'/rest/v1/projects?project_number=eq.'+encodeURIComponent(String(localProject.id))+'&select=id&limit=1';const res=await fetch(url,{headers});if(res.ok){const rows=await res.json();if(Array.isArray(rows)&&rows[0]&&rows[0].id)return{id:rows[0].id};}}}catch(err){console.warn('Közvetlen projekt lookup hiba:',err);}
    return null;
  }
  function customerName(customerId){const list=(typeof db!=='undefined'&&db&&Array.isArray(db.customers))?db.customers:[];const c=list.find(x=>String(x.id)===String(customerId));return c?c.name:'';}
  function localFromForm(o,id){return{id:id,customerId:o.customerId,customerName:customerName(o.customerId),name:o.name,status:o.status,location:o.location,value:+o.value||0,progress:Math.max(0,Math.min(100,+o.progress||0)),planned:+o.planned||0,cost:+o.cost||0,notes:o.notes||''};}

  // Régi törlési managerből esetleg bent maradt, injektált második projekt-Törlés gomb eltávolítása.
  function cleanupDuplicateProjectDeleteButtons(){document.querySelectorAll('#drawer .kpDeleteProjectBtn').forEach(function(btn){btn.remove();});}

  function install(){
    if(typeof window.saveProject!=='function'||typeof window.saveProjectEdit!=='function'||typeof window.deleteProject!=='function')return setTimeout(install,100);
    window.saveProject=async function(e){e.preventDefault();try{const o=Object.fromEntries(new FormData(e.target).entries());const projectNumber=(typeof uid==='function')?uid('KP'):('KP-'+Date.now());const local=localFromForm(o,projectNumber);const remote=await window.KPProjectCRUD.create(local);local.supabaseId=remote.id;db.projects.push(local);save();closeModal();nav('projects');toast('Projekt létrehozva és Supabase-ben mentve');}catch(err){console.error(err);toast('Hiba: '+(err.message||err));}return false;};
    window.saveProjectEdit=async function(e,id){e.preventDefault();const p=db.projects.find(x=>String(x.id)===String(id));if(!p)return false;try{const o=Object.fromEntries(new FormData(e.target).entries());const remote=await remoteFor(p);if(!remote)throw new Error('A projekt nem található a Supabase projects táblában.');const local=localFromForm(o,p.id);const updated=await window.KPProjectCRUD.update(remote.id,local);Object.assign(p,local,{supabaseId:updated.id});save();closeModal();closeDrawer();nav('projects');toast('Projekt módosítva és Supabase-ben mentve');}catch(err){console.error(err);toast('Hiba: '+(err.message||err));}return false;};
    window.deleteProject=async function(id){const p=db.projects.find(x=>String(x.id)===String(id));if(!p)return;const linked=(db.worklogs||[]).filter(w=>String(w.projectId)===String(id)).length;const msg=`Biztosan törlöd ezt a projektet?\n\n${p.name}\n${linked?'Kapcsolódó munkanaplók: '+linked+' db.':''}`;if(!confirm(msg))return;try{const remote=await remoteFor(p);if(remote){await window.KPProjectSupabase.remove(remote.id);toast('Projekt törölve az ERP-ből és Supabase-ből');}else toast('Projekt törölve (helyi régi rekord)');db.projects=db.projects.filter(x=>String(x.id)!==String(id));save();closeDrawer();nav('projects');}catch(err){console.error(err);toast('Törlés sikertelen: '+(err.message||err));}};
    window.KPProjectCRUDLive=true;
    cleanupDuplicateProjectDeleteButtons();
    const observer=new MutationObserver(cleanupDuplicateProjectDeleteButtons);observer.observe(document.body,{childList:true,subtree:true});
  }
  waitReady().then(install).catch(function(err){console.error(err);});
})();
