/* Kútfő Plusz ERP – Projekt lista Supabase szinkron */
(function installProjectSync(){
  'use strict';
  let lastSync=0;
  let running=false;

  function getConfig(){
    const cfg=window.SUPABASE_CONFIG;
    if(!cfg?.url||!cfg?.publishableKey)return null;
    let session=null;
    try{session=JSON.parse(localStorage.getItem('kutfoplusz_supabase_session_v1')||'null')}catch(e){}
    return {cfg,token:session?.access_token||cfg.publishableKey};
  }

  async function syncFromSupabase(){
    if(running||typeof window.db==='undefined')return false;
    const auth=getConfig();
    if(!auth)return false;
    running=true;
    try{
      const res=await fetch(auth.cfg.url+'/rest/v1/erp_state?id=eq.main&select=data',{method:'GET',headers:{apikey:auth.cfg.publishableKey,Authorization:'Bearer '+auth.token,Accept:'application/json'}});
      if(!res.ok)throw new Error('Supabase '+res.status);
      const rows=await res.json();
      const remote=rows?.[0]?.data;
      if(!remote||typeof remote!=='object')return false;
      if(Array.isArray(remote.projects)){
        window.db.projects=remote.projects;
      }
      /* Keep the other modules in sync as well, without replacing the db object. */
      for(const key of ['customers','quotes','worklogs','materials','machines']){
        if(Array.isArray(remote[key]))window.db[key]=remote[key];
      }
      return true;
    }catch(e){
      console.warn('Projekt Supabase frissítés sikertelen:',e);
      return false;
    }finally{running=false;}
  }

  async function refreshProjects(){
    if(window.current!=='projects')return;
    const now=Date.now();
    if(now-lastSync<1200)return;
    lastSync=now;
    const changed=await syncFromSupabase();
    if(changed&&window.current==='projects'&&typeof window.render==='function')window.render();
  }

  window.kpRefreshProjectsFromSupabase=syncFromSupabase;

  function install(){
    if(typeof window.db==='undefined'||typeof window.render!=='function'){
      setTimeout(install,250);return;
    }
    const oldRender=window.render;
    if(window.__projectSyncRenderWrapped)return;
    window.__projectSyncRenderWrapped=true;
    window.render=function(){
      oldRender();
      if(window.current==='projects')setTimeout(refreshProjects,0);
    };
    setTimeout(refreshProjects,300);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});
  else install();
})();
