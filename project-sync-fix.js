/* Kútfő Plusz ERP – Projekt lista stabil Supabase szinkron */
(function installProjectSync(){
  'use strict';
  let lastSync=0, running=false;
  const page=()=>location.hash.replace(/^#\//,'')||'dashboard';
  function getConfig(){
    const cfg=window.SUPABASE_CONFIG;
    if(!cfg?.url||!cfg?.publishableKey)return null;
    let session=null;try{session=JSON.parse(localStorage.getItem('kutfoplusz_supabase_session_v1')||'null')}catch(e){}
    return {cfg,token:session?.access_token||cfg.publishableKey};
  }
  async function syncFromSupabase(){
    if(running||typeof window.db==='undefined')return false;
    const auth=getConfig();if(!auth)return false;
    running=true;
    try{
      const res=await fetch(auth.cfg.url+'/rest/v1/erp_state?id=eq.main&select=data',{headers:{apikey:auth.cfg.publishableKey,Authorization:'Bearer '+auth.token,Accept:'application/json',Cache-Control:'no-cache'}});
      if(!res.ok)throw new Error('Supabase '+res.status);
      const rows=await res.json(),remote=rows?.[0]?.data;
      if(!remote||typeof remote!=='object')return false;
      if(Array.isArray(remote.projects))window.db.projects=remote.projects;
      for(const key of ['customers','quotes','worklogs','materials','machines'])if(Array.isArray(remote[key]))window.db[key]=remote[key];
      if(typeof window.localSaveOnly==='function')window.localSaveOnly();
      return true;
    }catch(e){console.warn('Projekt Supabase frissítés sikertelen:',e);return false}
    finally{running=false;}
  }
  async function refreshProjects(force=false){
    if(page()!=='projects')return false;
    const now=Date.now();if(!force&&now-lastSync<800)return false;lastSync=now;
    const changed=await syncFromSupabase();
    if(changed&&page()==='projects'&&typeof window.render==='function'&&!window.__projectSyncRendering){
      window.__projectSyncRendering=true;try{window.render()}finally{window.__projectSyncRendering=false;}
    }
    return changed;
  }
  window.kpRefreshProjectsFromSupabase=()=>refreshProjects(true);
  function install(){
    if(typeof window.db==='undefined'||typeof window.render!=='function'){setTimeout(install,250);return;}
    if(window.__projectSyncRenderWrapped)return;
    window.__projectSyncRenderWrapped=true;
    const oldRender=window.render;
    window.render=function(){
      oldRender();
      if(page()==='projects'&&!window.__projectSyncRendering)setTimeout(()=>refreshProjects(false),0);
    };
    setTimeout(()=>refreshProjects(true),300);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
})();
