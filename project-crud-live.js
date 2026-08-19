/* Live bridge for the existing ERP project module. */
(function(){
  'use strict';
  function waitReady(){return window.KPProjectCRUD.ready();}

  function supaHeaders(){
    const c=window.SUPABASE_CONFIG||{};
    let s=null;try{s=JSON.parse(localStorage.getItem('kutfoplusz_supabase_session_v1')||'null')}catch(e){}
    const token=s&&s.access_token?s.access_token:c.publishableKey;
    return {apikey:c.publishableKey,Authorization:'Bearer '+token,Accept:'application/json','Content-Type':'application/json'};
  }

  async function remoteFor(localProject){
    await waitReady();
    if(localProject&&localProject.supabaseId)return{id:localProject.supabaseId};
    try{
      const found=await window.KPProjectSupabase.findByProjectNumber(localProject.id);
      if(found)return found;
    }catch(err){console.warn('Projekt lookup hiba:',err);}
    try{
      const c=window.SUPABASE_CONFIG;
      if(c&&c.url&&c.publishableKey){
        const url=c.url.replace(/\/$/,'')+'/rest/v1/projects?project_number=eq.'+encodeURIComponent(String(localProject.id))+'&select=id,project_number&limit=1';
        const res=await fetch(url,{headers:supaHeaders()});
        if(res.ok){
          const rows=await res.json();
          if(Array.isArray(rows)&&rows[0]&&rows[0].id)return{id:rows[0].id};
        }else console.warn('Projekt lookup HTTP',res.status,await res.text());
      }
    }catch(err){console.warn('Közvetlen projekt lookup hiba:',err);}
    return null;
  }

  function customerName(customerId){
    const list=(typeof db!=='undefined'&&db&&Array.isArray(db.customers))?db.customers:[];
    const c=list.find(x=>String(x.id)===String(customerId)||String(x.supabaseId)===String(customerId));
    return c?c.name:'';
  }

  function localFromForm(o,id){
    return{id:id,customerId:o.customerId,customerName:customerName(o.customerId),name:o.name,status:o.status,location:o.location,value:+o.value||0,progress:Math.max(0,Math.min(100,+o.progress||0)),planned:+o.planned||0,cost:+o.cost||0,notes:o.notes||''};
  }

  function cleanupDuplicateProjectDeleteButtons(){
    document.querySelectorAll('#drawer .kpDeleteProjectBtn').forEach(function(btn){btn.remove();});
  }

  async function patchProjectDirect(p,local,remote){
    const c=window.SUPABASE_CONFIG||{};
    if(!c.url||!c.publishableKey)throw new Error('Supabase konfiguráció nincs betöltve.');
    const payload={
      project_number:p.id,
      customer_id:(function(){const cst=(db.customers||[]).find(c=>String(c.id)===String(local.customerId)||String(c.supabaseId)===String(local.customerId));return cst&&cst.supabaseId?cst.supabaseId:null;})(),
      name:local.name||'',location:local.location||'',status:local.status||'Tervezés',
      contract_value:+local.value||0,planned_cost:+local.planned||0,actual_cost:+local.cost||0,
      progress_pct:+local.progress||0,notes:local.notes||''
    };
    const filter=remote&&remote.id?'id=eq.'+encodeURIComponent(remote.id):'project_number=eq.'+encodeURIComponent(String(p.id));
    const res=await fetch(c.url.replace(/\/$/,'')+'/rest/v1/projects?'+filter,{method:'PATCH',headers:Object.assign({},supaHeaders(),{Prefer:'return=representation'}),body:JSON.stringify(payload)});
    const text=await res.text();
    if(!res.ok)throw new Error('Supabase '+res.status+': '+text);
    let rows=[];try{rows=text?JSON.parse(text):[]}catch(e){}
    if(!Array.isArray(rows)||!rows[0])throw new Error('A projekt mentése nem adott vissza Supabase rekordot.');
    return rows[0];
  }

  function install(){
    if(typeof window.saveProject!=='function'||typeof window.saveProjectEdit!=='function'||typeof window.deleteProject!=='function')return setTimeout(install,100);

    window.saveProject=async function(e){
      e.preventDefault();
      try{
        const o=Object.fromEntries(new FormData(e.target).entries());
        const projectNumber=(typeof uid==='function')?uid('KP'):('KP-'+Date.now());
        const local=localFromForm(o,projectNumber);
        const remote=await window.KPProjectCRUD.create(local);
        local.supabaseId=remote.id;db.projects.push(local);save();closeModal();nav('projects');toast('Projekt létrehozva és Supabase-ben mentve');
      }catch(err){console.error(err);toast('Hiba: '+(err.message||err));}
      return false;
    };

    window.saveProjectEdit=async function(e,id){
      e.preventDefault();
      const p=db.projects.find(x=>String(x.id)===String(id));
      if(!p){toast('Hiba: a projekt nem található.');return false;}
      try{
        const o=Object.fromEntries(new FormData(e.target).entries());
        const local=localFromForm(o,p.id);
        const remote=await remoteFor(p);
        const updated=await patchProjectDirect(p,local,remote);
        Object.assign(p,local,{supabaseId:updated.id});
        save();closeModal();closeDrawer();nav('projects');toast('Projekt módosítva és Supabase-ben mentve');
      }catch(err){console.error('Projekt módosítás:',err);toast('Hiba: '+(err.message||err));}
      return false;
    };

    window.deleteProject=async function(id){
      const p=db.projects.find(x=>String(x.id)===String(id));if(!p)return;
      const linked=(db.worklogs||[]).filter(w=>String(w.projectId)===String(id)).length;
      const msg=`Biztosan törlöd ezt a projektet?\n\n${p.name}\n${linked?'Kapcsolódó munkanaplók: '+linked+' db.':''}`;
      if(!confirm(msg))return;
      try{
        const remote=await remoteFor(p);
        if(remote){await window.KPProjectSupabase.remove(remote.id);toast('Projekt törölve az ERP-ből és Supabase-ből');}
        else toast('Projekt törölve (helyi régi rekord)');
        db.projects=db.projects.filter(x=>String(x.id)!==String(id));save();closeDrawer();nav('projects');
      }catch(err){console.error(err);toast('Törlés sikertelen: '+(err.message||err));}
    };

    window.KPProjectCRUDLive=true;
    cleanupDuplicateProjectDeleteButtons();
    const observer=new MutationObserver(cleanupDuplicateProjectDeleteButtons);
    observer.observe(document.body,{childList:true,subtree:true});
  }
  waitReady().then(install).catch(function(err){console.error(err);});
})();