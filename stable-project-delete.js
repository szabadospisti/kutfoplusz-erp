/* Kútfő Plusz ERP – stabil projekt törlés */
(function(){
  'use strict';
  function install(){
    if(typeof window.deleteProject!=='function')return setTimeout(install,100);
    window.deleteProject=async function(id){
      const p=(window.db&&Array.isArray(db.projects))?db.projects.find(function(x){return String(x.id)===String(id);}):null;
      if(!p)return;
      const linked=(db.worklogs||[]).filter(function(w){return String(w.projectId)===String(id);}).length;
      if(!confirm('Biztosan törlöd ezt a projektet?\n\n'+(p.name||id)+(linked?'\nKapcsolódó munkanaplók: '+linked+' db.':'')))return;
      try{
        const remoteId=p.supabaseId;
        if(!remoteId)throw new Error('A projekt Supabase azonosítója hiányzik.');
        const c=window.SUPABASE_CONFIG;
        const h={apikey:c.publishableKey,Authorization:'Bearer '+c.publishableKey,Accept:'application/json'};
        const check=await fetch(c.url+'/rest/v1/work_logs?project_id=eq.'+encodeURIComponent(remoteId)+'&select=id&limit=1',{headers:h});
        if(!check.ok)throw new Error('Nem sikerült ellenőrizni a kapcsolódó munkanaplókat.');
        const logs=await check.json();
        if(Array.isArray(logs)&&logs.length)throw new Error('A projekt nem törölhető, mert munkanapló tartozik hozzá.');
        const res=await fetch(c.url+'/rest/v1/projects?id=eq.'+encodeURIComponent(remoteId),{method:'DELETE',headers:Object.assign({},h,{Prefer:'return=minimal'})});
        if(!res.ok){const text=await res.text();throw new Error('Supabase '+res.status+': '+(text||'A projekt törlése sikertelen.'));}
        db.projects=db.projects.filter(function(x){return String(x.id)!==String(id);});
        if(typeof save==='function')await save();
        if(typeof closeDrawer==='function')closeDrawer();
        if(typeof nav==='function')nav('projects');
        if(typeof toast==='function')toast('Projekt törölve');
      }catch(err){console.error(err);if(typeof toast==='function')toast('Törlés sikertelen: '+(err.message||err));}
    };
  }
  install();
})();
