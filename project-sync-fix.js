/* Kútfő Plusz ERP – Projekt lista stabil Supabase szinkron
 * A projects tábla az egyetlen hiteles projekt-adatforrás.
 * Nem tölti vissza az erp_state.projects régi snapshotját.
 */
(function installProjectSync(){
  'use strict';
  let lastSync=0,running=false;
  const page=()=>location.hash.replace(/^#\//,'')||'dashboard';

  async function syncFromSupabase(){
    if(running||typeof window.db==='undefined')return false;
    const loader=window.KPSupabaseSync?.loadProjects;
    if(typeof loader!=='function')return false;
    running=true;
    try{
      await loader();
      if(typeof window.localSaveOnly==='function')window.localSaveOnly();
      return true;
    }catch(e){
      console.warn('Projekt Supabase frissítés sikertelen:',e);
      return false;
    }finally{running=false;}
  }

  async function refreshProjects(force=false){
    if(page()!=='projects')return false;
    const now=Date.now();
    if(!force&&now-lastSync<800)return false;
    lastSync=now;
    const changed=await syncFromSupabase();
    if(changed&&page()==='projects'&&typeof window.render==='function'&&!window.__projectSyncRendering){
      window.__projectSyncRendering=true;
      try{window.render()}finally{window.__projectSyncRendering=false;}
    }
    return changed;
  }

  window.kpRefreshProjectsFromSupabase=()=>refreshProjects(true);

  function install(){
    if(typeof window.db==='undefined'||typeof window.render!=='function'||typeof window.KPSupabaseSync?.loadProjects!=='function'){
      setTimeout(install,250);return;
    }
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
