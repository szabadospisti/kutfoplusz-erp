/* Kútfő Plusz ERP – Projektek központi CRUD bridge.
 *
 * FONTOS: a Projekt modul egyetlen adatútja a project-fleet-bridge.js:
 * db.projects -> központi save() -> Supabase erp_state.
 *
 * Nem töltünk be régi project-crud-live / project-edit-live / direct
 * Supabase projects-table író modulokat, mert ezek párhuzamos mentési
 * útvonalat és eltérő adatmodellt hoztak létre.
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

    /* A régi index.html-es Projekt gombok ugyanide kerülnek átirányításra. */
    window.openProject=function(){ return window.__pfCreate(); };
    window.editProject=function(id){ return window.__pfEdit(id); };
    window.projectDetails=function(id){ return window.__pfProfile(id); };
    window.deleteProject=function(id){ return window.__pfDelete(id); };

    /* Régi form-handler csak kompatibilitási név; az új UI nem használja. */
    window.saveProject=function(e){
      if(e&&e.preventDefault)e.preventDefault();
      console.warn('[ERP] A régi saveProject() útvonal le van tiltva; a központi Projekt CRUD kezeli a mentést.');
      return false;
    };
    window.saveProjectEdit=function(e){
      if(e&&e.preventDefault)e.preventDefault();
      console.warn('[ERP] A régi saveProjectEdit() útvonal le van tiltva; a központi Projekt CRUD kezeli a mentést.');
      return false;
    };

    window.__KP_PROJECT_CENTRAL_BRIDGE__=true;
    console.info('[ERP] Projektek: single central CRUD active');
    return true;
  }

  function boot(){
    loadScript('project-fleet-bridge.js').catch(function(err){
      console.error('[ERP] Projekt központi bridge betöltési hiba:',err);
    });
    loadScript('system-workflow.js').catch(function(err){
      console.warn('[ERP] Rendszer workflow nem töltődött be:',err);
    });
    var n=0;
    var timer=setInterval(function(){
      if(install()||++n>160)clearInterval(timer);
    },50);
  }
  boot();
})();
