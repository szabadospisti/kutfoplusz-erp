/* Safe bridge: loads the Supabase project CRUD adapter and exposes it to the existing ERP. */
(function(){
  'use strict';
  function load(){
    if(window.KPProjectSupabase) return Promise.resolve(window.KPProjectSupabase);
    return new Promise(function(resolve,reject){
      var s=document.createElement('script');
      s.src='project-crud-supabase.js';
      s.onload=function(){
        if(window.KPProjectSupabase) resolve(window.KPProjectSupabase);
        else reject(new Error('Supabase projekt CRUD adapter nem töltődött be.'));
      };
      s.onerror=function(){reject(new Error('Supabase projekt CRUD adapter betöltése sikertelen.'));};
      document.head.appendChild(s);
    });
  }
  window.KPProjectCRUD={
    ready:load,
    async list(){return (await load()).list();},
    async create(p){return (await load()).create(p);},
    async update(id,p){return (await load()).update(id,p);},
    async remove(id){return (await load()).remove(id);}
  };
})();
