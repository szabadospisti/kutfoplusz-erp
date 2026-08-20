/* Kútfő Plusz ERP – központi modulbetöltő V16 */
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
  function loadProjects(){loadScriptOnce('Projektek végleges CRUD','project-fleet-bridge.js?v=1','__projectFleetLoaded')}
  function loadFleetFinal(){loadScriptOnce('Géppark végleges CRUD','machine-fleet-bridge.js?v=final5','__fleetFinalLoaded')}
  function loadFleetForce(){loadScriptOnce('Géppark végső render guard','machine-fleet-force.js?v=final4','__fleetForceLoaded')}
  function loadAll(){loadProjects();loadFleetFinal();loadFleetForce()}
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',loadAll,{once:true});
  else loadAll();
})();
