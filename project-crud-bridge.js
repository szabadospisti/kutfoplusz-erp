/* Kútfő Plusz ERP – egyetlen projekt CRUD + Supabase/workflow bridge.
 * A Géppark betöltése teljesen független a projekt CRUD-tól.
 * Hiányzó opcionális modul nem állíthatja le a teljes bootstrap folyamatot.
 */
(function(){
  'use strict';

  function loadScript(src){
    return new Promise(function(resolve,reject){
      var s=document.createElement('script');
      s.src=src+'?v='+Date.now();
      s.onload=function(){resolve(true)};
      s.onerror=function(){reject(new Error('Script betöltése sikertelen: '+src));};
      document.head.appendChild(s);
    });
  }

  async function safeLoad(src){
    try{
      await loadScript(src);
      console.info('[ERP] Betöltve:',src);
      return true;
    }catch(err){
      console.warn('[ERP] Opcionális modul kihagyva:',src,err.message);
      return false;
    }
  }

  safeLoad('machine-fleet-bridge.js').then(function(ok){
    if(ok) return safeLoad('machine-fleet-force.js');
    return false;
  });

  safeLoad('system-workflow.js');

  async function waitForConfig(){
    if(window.SUPABASE_CONFIG)return window.SUPABASE_CONFIG;

    /* A projekt CRUD nem függhet attól, hogy az index.html milyen sorrendben
       tölti a konfigurációs scriptet. Ha még nincs jelen, központilag betöltjük. */
    try{
      await loadScript('supabase_config.js');
    }catch(err){
      console.warn('[ERP] supabase_config.js automatikus betöltése sikertelen:',err.message);
    }

    if(window.SUPABASE_CONFIG)return window.SUPABASE_CONFIG;
    for(var i=0;i<100;i++){
      await new Promise(function(r){setTimeout(r,50)});
      if(window.SUPABASE_CONFIG)return window.SUPABASE_CONFIG;
    }
    throw new Error('Supabase konfiguráció nem töltődött be.');
  }

  async function waitForProjectCrud(){
    for(var i=0;i<120;i++){
      if(window.KPProjectCRUDLive)return true;
      await new Promise(function(r){setTimeout(r,50)});
    }
    throw new Error('Az egységes projekt CRUD nem töltődött be.');
  }

  async function bootstrap(){
    await waitForConfig();
    if(!window.KPProjectSupabase)await loadScript('project-crud-supabase.js');
    if(!window.KPProjectSupabase)throw new Error('Supabase projekt CRUD adapter nem töltődött be.');
    return window.KPProjectSupabase;
  }

  window.KPProjectCRUD={
    ready:bootstrap,
    async list(){return(await bootstrap()).list();},
    async create(p){return(await bootstrap()).create(p);},
    async update(id,p){return(await bootstrap()).update(id,p);},
    async remove(id){return(await bootstrap()).remove(id);}
  };

  bootstrap().then(async function(){
    await safeLoad('project-crud-live.js');
    await waitForProjectCrud();
    await safeLoad('project-edit-live.js');
    await safeLoad('erp-supabase-sync.js');
    await safeLoad('erp-delete-manager.js');
    await safeLoad('project-worklog-auto-link.js');
    await safeLoad('worklog-project-lock.js');
    await safeLoad('material-crud-fix.js');
  }).catch(function(err){
    console.error('Supabase project bridge:',err);
  });
})();
