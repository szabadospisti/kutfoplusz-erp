/* Kútfő Plusz ERP – Supabase bootstrap + project CRUD bridge. */
(function(){
  'use strict';

  function loadScript(src){
    return new Promise(function(resolve,reject){
      var s=document.createElement('script');
      s.src=src;
      s.onload=resolve;
      s.onerror=function(){reject(new Error('Script betöltése sikertelen: '+src));};
      document.head.appendChild(s);
    });
  }

  async function waitForConfig(){
    if(window.SUPABASE_CONFIG) return window.SUPABASE_CONFIG;
    for(var i=0;i<100;i++){
      await new Promise(function(r){setTimeout(r,50)});
      if(window.SUPABASE_CONFIG) return window.SUPABASE_CONFIG;
    }
    throw new Error('Supabase konfiguráció nem töltődött be.');
  }

  async function bootstrap(){
    var cfg=await waitForConfig();
    if(!window.supabase || typeof window.supabase.createClient!=='function'){
      await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2');
    }
    if(!window.supabase || typeof window.supabase.createClient!=='function'){
      throw new Error('Supabase kliens nincs betöltve.');
    }
    if(!window._supabaseClient){
      window._supabaseClient=window.supabase.createClient(cfg.url,cfg.publishableKey);
    }
    /* The existing CRUD adapter expects window.supabase to be the client. */
    window.supabase=window._supabaseClient;

    if(!window.KPProjectSupabase) await loadScript('project-crud-supabase.js');
    if(!window.KPProjectSupabase) throw new Error('Supabase projekt CRUD adapter nem töltődött be.');
    return window.KPProjectSupabase;
  }

  async function load(){ return bootstrap(); }

  window.KPProjectCRUD={
    ready:load,
    async list(){return (await load()).list();},
    async create(p){return (await load()).create(p);},
    async update(id,p){return (await load()).update(id,p);},
    async remove(id){return (await load()).remove(id);}
  };

  bootstrap().then(function(){
    if(document.readyState==='loading'){
      document.addEventListener('DOMContentLoaded',function(){loadScript('project-crud-live.js').catch(console.error);},{once:true});
    }else{
      loadScript('project-crud-live.js').catch(console.error);
    }
  }).catch(function(err){console.error('Supabase bootstrap:',err);});
})();
