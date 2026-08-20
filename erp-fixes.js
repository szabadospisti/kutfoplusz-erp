/* Kútfő Plusz ERP – modulbetöltő és alap CRUD javítások. V12
 *
 * A központi mentést az index.html saját save() útvonala kezeli:
 * localStorage + Supabase erp_state.
 *
 * A Gépparkot a deploy build közvetlenül a machine-fleet.js-ből injektálja,
 * ezért ez a bridge NEM tölt régi Géppark-modulokat, és NEM definiál window.save()-ot.
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

  // A Géppark nem kerül ide: a build közvetlenül a machine-fleet.js-t injektálja.
  function loadProjectCrud(){loadScriptOnce('Projekt CRUD','project-crud-fix.js?v=2','__projectCrudLoaded')}
  function loadProjectSync(){loadScriptOnce('Projekt Supabase sync','project-sync-fix.js?v=1','__projectSyncLoaded')}
  function loadProjectSaveFinal(){loadScriptOnce('Projekt végleges Supabase mentés','project-save-final.js?v=1','__projectSaveFinalLoaded')}

  function loadAll(){
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
      window.__projectCrudLoaded&&
      window.__projectSyncLoaded&&
      window.__projectSaveFinalLoaded
    ))clearInterval(mt);
  },250);
})();
