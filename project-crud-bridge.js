/* Safe bridge: loads Supabase project CRUD and then wires the existing ERP project actions. */
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
  async function load(){
    if(!window.KPProjectSupabase) await loadScript('project-crud-supabase.js');
    if(!window.KPProjectSupabase) throw new Error('Supabase projekt CRUD adapter nem töltődött be.');
    return window.KPProjectSupabase;
  }
  window.KPProjectCRUD={
    ready:load,
    async list(){return (await load()).list();},
    async create(p){return (await load()).create(p);},
    async update(id,p){return (await load()).update(id,p);},
    async remove(id){return (await load()).remove(id);}
  };
  load().then(function(){
    if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',function(){loadScript('project-crud-live.js').catch(console.error);},{once:true});
    else loadScript('project-crud-live.js').catch(console.error);
  }).catch(console.error);
})();
