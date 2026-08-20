/* Kútfő Plusz ERP – modulbetöltő és alap CRUD javítások. V15
 * A központi mentést az index.html saját save() útvonala kezeli.
 * A Géppark végleges CRUD-ja egyetlen UI/CRUD útvonal.
 */
(function(){
  'use strict';
  function loadScriptOnce(name,src,flag){
    if(window[flag])return;
    if(typeof window.views==='undefined'||typeof window.render!=='function'||typeof window.db==='undefined')return;
    const s=document.createElement('script');
    s.src=src;
    s.onload=()=>{window[flag]=true};
    s.onerror=e=>console.error(name+' betöltési hiba',e);
    document.head.appendChild(s);
  }
  function loadProjectCrud(){loadScriptOnce('Projekt CRUD','project-crud-fix.js?v=2','__projectCrudLoaded')}
  function loadProjectSync(){loadScriptOnce('Projekt Supabase sync','project-sync-fix.js?v=1','__projectSyncLoaded')}
  function loadProjectSaveFinal(){loadScriptOnce('Projekt végleges Supabase mentés','project-save-final.js?v=1','__projectSaveFinalLoaded')}
  function loadFleetFinal(){loadScriptOnce('Géppark végleges CRUD','machine-fleet-bridge.js?v=final4','__fleetFinalLoaded')}
  function loadFleetForce(){loadScriptOnce('Géppark végső render guard','machine-fleet-force.js?v=final3','__fleetForceLoaded')}
  function loadAll(){loadProjectCrud();loadProjectSync();loadProjectSaveFinal();loadFleetFinal();loadFleetForce()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadAll,{once:true});else loadAll();
  let mc=0;
  const mt=setInterval(()=>{
    loadAll();
    if(++mc>60&&window.__projectCrudLoaded&&window.__projectSyncLoaded&&window.__projectSaveFinalLoaded&&window.__fleetFinalLoaded&&window.__fleetForceLoaded)clearInterval(mt);
    if(mc>100)clearInterval(mt);
  },250);
})();
