/* Live bridge for the existing ERP project module. */
(function(){
  'use strict';
  function waitReady(){return window.KPProjectCRUD.ready();}
  async function remoteFor(localProject){
    await waitReady();
    if(localProject.supabaseId) return {id:localProject.supabaseId};
    return await window.KPProjectSupabase.findByProjectNumber(localProject.id);
  }
  function customerName(customerId){
    const list=(typeof db!=='undefined' && db && Array.isArray(db.customers)) ? db.customers : [];
    const c=list.find(x=>String(x.id)===String(customerId));
    return c ? c.name : '';
  }
  function localFromForm(o,id){
    return {id:id,customerId:o.customerId,customerName:customerName(o.customerId),name:o.name,status:o.status,location:o.location,value:+o.value||0,progress:Math.max(0,Math.min(100,+o.progress||0)),planned:+o.planned||0,cost:+o.cost||0,notes:o.notes||''};
  }
  function install(){
    if(typeof window.saveProject!=='function' || typeof window.saveProjectEdit!=='function' || typeof window.deleteProject!=='function') return setTimeout(install,100);
    window.saveProject=async function(e){
      e.preventDefault();
      try{
        const o=Object.fromEntries(new FormData(e.target).entries());
        const projectNumber=(typeof uid==='function')?uid('KP'):('KP-'+Date.now());
        const local=localFromForm(o,projectNumber);
        const remote=await window.KPProjectCRUD.create(local);
        local.supabaseId=remote.id;
        db.projects.push(local);
        save(); closeModal(); nav('projects'); toast('Projekt létrehozva és Supabase-ben mentve');
      }catch(err){console.error(err);toast('Hiba: '+(err.message||err));}
    };
    window.saveProjectEdit=async function(e,id){
      e.preventDefault();
      const p=db.projects.find(x=>String(x.id)===String(id)); if(!p)return;
      try{
        const o=Object.fromEntries(new FormData(e.target).entries());
        const remote=await remoteFor(p);
        if(!remote) throw new Error('A projekt nem található a Supabase projects táblában.');
        const local=localFromForm(o,p.id);
        const updated=await window.KPProjectCRUD.update(remote.id,local);
        Object.assign(p,local,{supabaseId:updated.id});
        save(); closeModal(); closeDrawer(); nav('projects'); toast('Projekt módosítva és Supabase-ben mentve');
      }catch(err){console.error(err);toast('Hiba: '+(err.message||err));}
    };
    window.deleteProject=async function(id){
      const p=db.projects.find(x=>String(x.id)===String(id)); if(!p)return;
      const linked=(db.worklogs||[]).filter(w=>String(w.projectId)===String(id)).length;
      const msg=`Biztosan törlöd ezt a projektet?\n\n${p.name}\n${linked?'Kapcsolódó munkanaplók: '+linked+' db.':''}`;
      if(!confirm(msg))return;
      try{
        const remote=await remoteFor(p);
        if(!remote) throw new Error('A projekt nem található a Supabase projects táblában.');
        await window.KPProjectCRUD.remove(remote.id);
        db.projects=db.projects.filter(x=>String(x.id)!==String(id));
        save(); closeDrawer(); nav('projects'); toast('Projekt törölve az ERP-ből és Supabase-ből');
      }catch(err){console.error(err);toast('Törlés sikertelen: '+(err.message||err));}
    };
    window.KPProjectCRUDLive=true;
  }
  waitReady().then(install).catch(function(err){console.error(err);});
})();
