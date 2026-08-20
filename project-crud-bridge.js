/* Kútfő Plusz ERP – egyetlen projekt CRUD + Supabase/workflow bridge.
 * A régi, nem létező Géppark modulbetöltéseket megszüntettük.
 * A Gépparkot most ténylegesen a machine-fleet-bridge.js kezeli.
 */
(function(){
  'use strict';
  function loadScript(src){
    return new Promise(function(resolve,reject){
      var s=document.createElement('script');
      s.src=src+'?v='+Date.now();
      s.onload=resolve;
      s.onerror=function(){reject(new Error('Script betöltése sikertelen: '+src));};
      document.head.appendChild(s);
    });
  }

  loadScript('system-workflow.js').catch(function(err){
    console.error('Rendszer Workflow modul:',err);
  });

  async function waitForConfig(){
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
    await loadScript('project-crud-live.js');
    await waitForProjectCrud();
    await loadScript('project-edit-live.js');
    await loadScript('erp-supabase-sync.js');
    await loadScript('erp-delete-manager.js');
    await loadScript('customer-details-dom-fix.js');
    await loadScript('project-worklog-auto-link.js');
    await loadScript('worklog-project-lock.js');
    await loadScript('material-crud-fix.js');
    await loadScript('machine-fleet-bridge.js');
    await loadScript('machine-fleet-force.js');
  }).catch(function(err){
    console.error('Supabase project bridge:',err);
  });
})();
