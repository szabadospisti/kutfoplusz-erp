/* Kútfő Plusz ERP – Supabase config + project/worklog bridge. */
(function(){
  'use strict';
  function loadScript(src){return new Promise(function(resolve,reject){var s=document.createElement('script');s.src=src+'?v='+Date.now();s.onload=resolve;s.onerror=function(){reject(new Error('Script betöltése sikertelen: '+src));};document.head.appendChild(s);});}
  async function waitForConfig(){if(window.SUPABASE_CONFIG)return window.SUPABASE_CONFIG;for(var i=0;i<100;i++){await new Promise(function(r){setTimeout(r,50)});if(window.SUPABASE_CONFIG)return window.SUPABASE_CONFIG;}throw new Error('Supabase konfiguráció nem töltődött be.');}
  async function bootstrap(){await waitForConfig();if(!window.KPProjectSupabase)await loadScript('project-crud-supabase.js');if(!window.KPProjectSupabase)throw new Error('Supabase projekt CRUD adapter nem töltődött be.');return window.KPProjectSupabase;}
  window.KPProjectCRUD={ready:bootstrap,async list(){return(await bootstrap()).list();},async create(p){return(await bootstrap()).create(p);},async update(id,p){return(await bootstrap()).update(id,p);},async remove(id){return(await bootstrap()).remove(id);}};

  function installProjectSaveHooks(){
    if(window.__KP_PROJECT_SAVE_HOOKS__)return;
    window.__KP_PROJECT_SAVE_HOOKS__=true;

    window.saveProjectEdit=async function(e,id){
      e.preventDefault();
      try{
        var api=await bootstrap();
        var p=(window.db&&Array.isArray(db.projects))?db.projects.find(function(x){return String(x.id)===String(id);}):null;
        if(!p)throw new Error('A projekt nem található.');
        var o=Object.fromEntries(new FormData(e.target).entries());
        var local={
          id:p.id,
          supabaseId:p.supabaseId||'',
          customerId:o.customerId,
          name:o.name,
          status:o.status,
          location:o.location,
          value:+o.value||0,
          progress:Math.max(0,Math.min(100,+o.progress||0)),
          planned:+o.planned||0,
          cost:+o.cost||0,
          notes:o.notes||''
        };
        var remoteId=p.supabaseId;
        if(!remoteId && api.findByProjectNumber){
          var found=await api.findByProjectNumber(p.id);
          if(found)remoteId=found.id;
        }
        if(!remoteId)throw new Error('A projekt nincs összekötve a Supabase rekorddal.');
        var saved=await api.update(remoteId,local);
        Object.assign(p,local,{supabaseId:saved&&saved.id?saved.id:remoteId});
        if(typeof save==='function')save();
        if(typeof closeModal==='function')closeModal();
        if(typeof closeDrawer==='function')closeDrawer();
        if(typeof nav==='function')nav('projects');
        if(typeof toast==='function')toast('Projekt módosítva és Supabase-ben mentve');
      }catch(err){
        console.error('Projekt mentési hiba:',err);
        if(typeof toast==='function')toast('Hiba: '+(err&&err.message?err.message:err));
        else alert('Projekt mentési hiba: '+(err&&err.message?err.message:err));
      }
      return false;
    };

    window.saveProject=async function(e){
      e.preventDefault();
      try{
        var api=await bootstrap();
        var o=Object.fromEntries(new FormData(e.target).entries());
        var local={
          id:(typeof uid==='function'?uid('KP'):('KP-'+Date.now())),
          customerId:o.customerId,
          name:o.name,
          status:o.status,
          location:o.location,
          value:+o.value||0,
          progress:0,
          planned:0,
          cost:0,
          notes:o.notes||''
        };
        var saved=await api.create(local);
        local.supabaseId=saved&&saved.id?saved.id:'';
        if(window.db){db.projects=db.projects||[];db.projects.unshift(local);}
        if(typeof save==='function')save();
        if(typeof closeModal==='function')closeModal();
        if(typeof nav==='function')nav('projects');
        if(typeof toast==='function')toast('Projekt létrehozva és Supabase-ben mentve');
      }catch(err){
        console.error('Projekt létrehozási hiba:',err);
        if(typeof toast==='function')toast('Hiba: '+(err&&err.message?err.message:err));
        else alert('Projekt létrehozási hiba: '+(err&&err.message?err.message:err));
      }
      return false;
    };
  }

  bootstrap().then(async function(){
    await loadScript('project-crud-live.js');
    await loadScript('erp-supabase-sync.js');
    await loadScript('erp-delete-manager.js');
    await loadScript('customer-details-dom-fix.js');
    installProjectSaveHooks();
  }).catch(function(err){console.error('Supabase project bridge:',err);});
})();
