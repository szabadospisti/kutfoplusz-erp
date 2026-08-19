/* Kútfő Plusz ERP – Supabase config + project/worklog bridge. */
(function(){
  'use strict';
  function loadScript(src){return new Promise(function(resolve,reject){var s=document.createElement('script');s.src=src+'?v=20260819';s.onload=resolve;s.onerror=function(){reject(new Error('Script betöltése sikertelen: '+src));};document.head.appendChild(s);});}
  async function waitForConfig(){if(window.SUPABASE_CONFIG)return window.SUPABASE_CONFIG;for(var i=0;i<100;i++){await new Promise(function(r){setTimeout(r,50)});if(window.SUPABASE_CONFIG)return window.SUPABASE_CONFIG;}throw new Error('Supabase konfiguráció nem töltődött be.');}
  async function bootstrap(){await waitForConfig();if(!window.KPProjectSupabase)await loadScript('project-crud-supabase.js');if(!window.KPProjectSupabase)throw new Error('Supabase projekt CRUD adapter nem töltődött be.');return window.KPProjectSupabase;}
  window.KPProjectCRUD={ready:bootstrap,async list(){return(await bootstrap()).list();},async create(p){return(await bootstrap()).create(p);},async update(id,p){return(await bootstrap()).update(id,p);},async remove(id){return(await bootstrap()).remove(id);}};
  bootstrap().then(async function(){
    await loadScript('project-crud-live.js');
    await loadScript('erp-supabase-sync.js');
    await loadScript('delete-customer-supabase.js');
    await loadScript('stable-delete-hooks.js');
    await loadScript('stable-project-delete.js');
  }).catch(function(err){console.error('Supabase project bridge:',err);});
})();
