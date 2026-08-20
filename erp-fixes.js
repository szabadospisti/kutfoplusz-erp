/* Kútfő Plusz ERP – modulbetöltő és alap CRUD javítások. V15
 * DIAGNOSTIC TEST: visible Géppark label is changed to Géppark 1.
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
  function diagnosticRename(){
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const nodes=[];
    let n;
    while(n=walker.nextNode()) if(n.nodeValue && n.nodeValue.trim()==='Géppark') nodes.push(n);
    nodes.forEach(x=>{x.nodeValue=x.nodeValue.replace('Géppark','Géppark 1')});
    if(nodes.length) window.__gepparkDiagnostic=true;
  }
  function startDiagnostic(){
    diagnosticRename();
    let i=0;
    const t=setInterval(()=>{
      diagnosticRename();
      if(++i>120) clearInterval(t);
    },250);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',()=>{loadAll();startDiagnostic()},{once:true});
  else {loadAll();startDiagnostic()}
})();
