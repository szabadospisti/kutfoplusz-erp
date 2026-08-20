/* Kútfő Plusz ERP – Projektek központi CRUD bridge.
 * Egyetlen adatút: db.projects -> window.save() -> Supabase erp_state.
 * Régi direct project-table CRUD modulok nincsenek betöltve.
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
  function install(){
    if(window.__KP_PROJECT_CENTRAL_BRIDGE__) return true;
    if(typeof window.views==='undefined' || typeof window.render!=='function') return false;
    if(typeof window.__pfCreate!=='function' || typeof window.__pfEdit!=='function' || typeof window.__pfProfile!=='function' || typeof window.__pfDelete!=='function') return false;
    window.openProject=function(){return window.__pfCreate();};
    window.editProject=function(id){return window.__pfEdit(id);};
    window.projectDetails=function(id){return window.__pfProfile(id);};
    window.deleteProject=function(id){return window.__pfDelete(id);};
    window.saveProject=function(e){if(e&&e.preventDefault)e.preventDefault();return false;};
    window.saveProjectEdit=function(e){if(e&&e.preventDefault)e.preventDefault();return false;};
    window.__KP_PROJECT_CENTRAL_BRIDGE__=true;
    console.info('[ERP] Projektek: single central CRUD active');
    return true;
  }
  function boot(){
    loadScript('erp-save-core.js').catch(function(err){console.error('[ERP] Central save core:',err);});
    loadScript('project-fleet-bridge.js').catch(function(err){console.error('[ERP] Project central bridge:',err);});
    loadScript('system-workflow.js').catch(function(err){console.warn('[ERP] System workflow:',err);});
    var n=0,t=setInterval(function(){if(install()||++n>200)clearInterval(t)},50);
  }
  boot();
})();
