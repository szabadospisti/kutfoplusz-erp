/* Kútfő Plusz ERP – Projekt → Munkanapló V10 */
(function(){
  'use strict';
  if(window.__KP_PROJECT_WORKLOG_AUTO_LINK_V10__) return;
  window.__KP_PROJECT_WORKLOG_AUTO_LINK_V10__=true;

  function str(v){ return v==null ? '' : String(v); }
  function projects(){
    try { return (typeof db!=='undefined' && Array.isArray(db.projects)) ? db.projects : []; }
    catch(e){ return []; }
  }

  function applyProjectContext(pid){
    var id=str(pid || window.__kpPendingWorklogProjectId);
    if(!id) return false;
    var p=projects().find(function(x){ return str(x.id)===id; });
    if(!p) return false;

    var project=document.getElementById('wl_project');
    var client=document.getElementById('wl_client');
    var location=document.getElementById('wl_location');
    if(!project || !client || !location) return false;

    /* A projektből nyitott munkanapló mindig ehhez az egy projekthez tartozik. */
    project.value=id;
    project.disabled=true;
    project.style.pointerEvents='none';
    project.setAttribute('aria-disabled','true');
    project.setAttribute('data-project-locked','1');

    /* A megrendelő a projektből származik, nem választható külön. */
    if(p.customerId){
      client.value=str(p.customerId);
    }
    client.disabled=true;
    client.style.pointerEvents='none';
    client.setAttribute('aria-disabled','true');
    client.setAttribute('data-project-locked','1');

    /* A helyszín a projekt helyszíne, nem írható át. */
    location.value=str(p.location || '');
    location.readOnly=true;
    location.style.pointerEvents='none';
    location.setAttribute('aria-readonly','true');
    location.setAttribute('data-project-locked','1');

    window.__kpPendingWorklogProjectId=id;
    return true;
  }

  function openFromProject(pid){
    var id=str(pid);
    if(!id) return;
    window.__kpPendingWorklogProjectId=id;

    /* Közvetlenül a részletes munkanapló-szerkesztőt hívjuk.
       Így a projekt ID már a renderelés pillanatában bekerül. */
    if(typeof window.detailedWorklogEditor==='function'){
      window.detailedWorklogEditor(null,id);
    }else{
      return;
    }

    var tries=0;
    var timer=setInterval(function(){
      if(applyProjectContext(id) || ++tries>80) clearInterval(timer);
    },50);
  }

  function install(){
    if(typeof window.newWorklogFor!=='function') return false;
    if(window.newWorklogFor.__kpProjectWorklogV10) return true;

    var wrapped=function(pid){ openFromProject(pid); };
    wrapped.__kpProjectWorklogV10=true;
    window.newWorklogFor=wrapped;
    return true;
  }

  var tries=0;
  var timer=setInterval(function(){
    if(install() || ++tries>300) clearInterval(timer);
  },100);
  install();
})();
