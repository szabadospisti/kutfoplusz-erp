/* Kútfő Plusz ERP – központi CRUD bridge.
 * A meglévő UI belépési pontjait megtartja, a tartós adatkezelést
 * relációs Supabase modulokra tereli. */
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
    console.info('[ERP] Projektek: central CRUD active');
    return true;
  }
  function boot(){
    loadScript('erp-data-v2.js').catch(function(err){console.error('[ERP] Relational data API:',err);});
    loadScript('erp-save-core.js').catch(function(err){console.error('[ERP] Central save core:',err);});
    loadScript('project-fleet-bridge.js').catch(function(err){console.error('[ERP] Project central bridge:',err);});
    loadScript('system-workflow.js').catch(function(err){console.warn('[ERP] System workflow:',err);});
    loadScript('worklog-relational-bridge-v1.js').catch(function(err){console.error('[ERP] Worklog relational bridge:',err);});
    var n=0,t=setInterval(function(){if(install()||++n>200)clearInterval(t)},50);
  }
  boot();
})();
