/* Kútfő Plusz ERP – modulbetöltő és alap CRUD javítások. V11
 *
 * A központi mentést az index.html saját save() útvonala kezeli:
 * localStorage + Supabase erp_state.
 * Ez a fájl NEM definiálhat window.save()-ot és NEM írhat közvetlenül erp_state-ba.
 */
(function(){
  function loadScriptOnce(name,src,flag){
    if(window[flag])return;
    if(typeof window.views==='undefined'||typeof window.render!=='function'||typeof window.db==='undefined')return;
    const s=document.createElement('script');
    s.src=src;
    s.onload=()=>{window[flag]=true};
    s.onerror=e=>console.error(name+' betöltési hiba',e);
    document.head.appendChild(s);
  }

  function loadMachineCrud(){loadScriptOnce('Géppark','machine-fleet-final.js?v=11','__machineFleetCrudLoaded')}
  function loadNewMachine(){loadScriptOnce('Új eszköz teljes adatlap','machine-new-form-v2.js?v=1','__machineNewFormV2Loaded')}
  function loadProjectCrud(){loadScriptOnce('Projekt CRUD','project-crud-fix.js?v=2','__projectCrudLoaded')}
  function loadProjectSync(){loadScriptOnce('Projekt Supabase sync','project-sync-fix.js?v=1','__projectSyncLoaded')}
  function loadProjectSaveFinal(){loadScriptOnce('Projekt végleges Supabase mentés','project-save-final.js?v=1','__projectSaveFinalLoaded')}

  function loadAll(){
    loadMachineCrud();
    loadNewMachine();
    loadProjectCrud();
    loadProjectSync();
    loadProjectSaveFinal();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',loadAll,{once:true});
  else loadAll();

  let mc=0;
  const mt=setInterval(()=>{
    loadAll();
    if(++mc>40||(
      window.__machineFleetCrudLoaded&&
      window.__machineNewFormV2Loaded&&
      window.__projectCrudLoaded&&
      window.__projectSyncLoaded&&
      window.__projectSaveFinalLoaded
    ))clearInterval(mt);
  },250);
})();
