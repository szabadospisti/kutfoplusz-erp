/* Kútfő Plusz ERP – final project edit save owner. */
(function(){
  'use strict';

  async function ready(){
    if(window.KPProjectCRUD&&typeof window.KPProjectCRUD.ready==='function')return window.KPProjectCRUD.ready();
    if(window.KPProjectSupabase)return window.KPProjectSupabase;
    throw new Error('Supabase projekt modul nem töltődött be.');
  }

  function inferId(form,id){
    if(id)return String(id);
    const q=form&&form.querySelector?form.querySelector('[name="projectId"],[name="project_id"],[name="id"]'):null;
    if(q&&q.value)return String(q.value);
    const candidates=[window.editingProjectId,window.currentProjectId,window.selectedProjectId,window.activeProjectId,window.projectId];
    for(const v of candidates)if(v)return String(v);
    const nodes=document.querySelectorAll('[data-project-id],[data-project-number]');
    for(const n of nodes){
      const v=n.getAttribute('data-project-id')||n.getAttribute('data-project-number');
      if(v&&/^KP[-A-Z0-9]+$/i.test(v))return v;
    }
    const text=document.body?document.body.innerText:'';
    const m=text.match(/\bKP-[0-9]{4,}\b/);
    return m?m[0]:'';
  }

  async function resolve(id,api){
    const key=String(id||'');
    const list=(window.db&&Array.isArray(db.projects))?db.projects:[];
    let p=list.find(x=>String(x.id)===key||String(x.supabaseId||'')===key||String(x.project_number||'')===key);
    if(p)return p;
    if(api&&api.findByProjectNumber&&key){
      const r=await api.findByProjectNumber(key);
      if(r)return {id:r.project_number||key,supabaseId:r.id,customerId:r.customer_id||'',customerName:'',name:r.name||'',status:r.status||'Tervezés',location:r.location||'',value:+r.contract_value||0,progress:+r.progress_pct||0,planned:+r.planned_cost||0,cost:+r.actual_cost||0,notes:r.notes||''};
    }
    return null;
  }

  const handler=async function(e,id){
    e.preventDefault();
    try{
      const api=await ready();
      const resolvedId=inferId(e.target,id);
      const p=await resolve(resolvedId,api);
      if(!p)throw new Error('A projekt nem található.');
      const o=Object.fromEntries(new FormData(e.target).entries());
      const local={id:p.id,supabaseId:p.supabaseId||'',customerId:o.customerId,name:o.name,status:o.status,location:o.location,value:+o.value||0,progress:Math.max(0,Math.min(100,+o.progress||0)),planned:+o.planned||0,cost:+o.cost||0,notes:o.notes||''};
      let remoteId=p.supabaseId;
      if(!remoteId&&api.findByProjectNumber){const r=await api.findByProjectNumber(p.id);if(r)remoteId=r.id;}
      if(!remoteId)throw new Error('A projekt nincs összekötve a Supabase rekorddal.');
      const saved=await api.update(remoteId,local);
      const finalId=saved&&saved.id?saved.id:remoteId;
      if(window.db&&Array.isArray(db.projects)){
        const idx=db.projects.findIndex(x=>String(x.id)===String(p.id)||String(x.supabaseId||'')===String(remoteId));
        if(idx>=0)Object.assign(db.projects[idx],local,{supabaseId:finalId});
        else db.projects.push(Object.assign({},local,{supabaseId:finalId}));
      }
      if(typeof save==='function')save();
      if(typeof closeModal==='function')closeModal();
      if(typeof closeDrawer==='function')closeDrawer();
      if(typeof nav==='function')nav('projects');
      if(typeof toast==='function')toast('Projekt módosítva és Supabase-ben mentve');
    }catch(err){
      console.error('Végleges projekt mentési hiba:',err);
      if(typeof toast==='function')toast('Hiba: '+(err&&err.message?err.message:err));
      else alert('Projekt mentési hiba: '+(err&&err.message?err.message:err));
    }
    return false;
  };
  handler.__kpFinalProjectSave=true;

  Object.defineProperty(window,'saveProjectEdit',{configurable:true,get:function(){return handler;},set:function(fn){if(fn&&fn.__kpFinalProjectSave){} }});
  window.__KP_FINAL_PROJECT_SAVE__=true;
})();