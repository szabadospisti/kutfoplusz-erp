/* Kútfő Plusz ERP – Projekt -> Munkanapló automatikus kapcsolat, izolált V8 */
(function(){
  'use strict';
  if(window.__KP_PROJECT_WORKLOG_AUTO_LINK_V8__) return;
  window.__KP_PROJECT_WORKLOG_AUTO_LINK_V8__=true;

  function s(v){return v==null?'':String(v);}

  function openProjectWorklog(pid){
    var projectId=s(pid);
    if(!projectId) return;

    window.__kpPendingWorklogProjectId=projectId;

    /* FONTOS: a natív + Új munkanapló funkcióhoz nem nyúlunk.
       Csak a projektből indított gombot irányítjuk közvetlenül
       a részletes szerkesztőre, a projekt ID átadásával. */
    if(typeof window.detailedWorklogEditor==='function'){
      try{
        window.detailedWorklogEditor(null,projectId);
      }catch(e){
        console.error('Projekt → Munkanapló megnyitási hiba:',e);
        return;
      }
    }else{
      setTimeout(function(){openProjectWorklog(projectId);},100);
      return;
    }
  }

  function install(){
    if(typeof window.newWorklogFor!=='function') return false;
    if(window.newWorklogFor.__kpProjectWorklogV8) return true;

    var wrapped=function(pid){
      return openProjectWorklog(pid);
    };
    wrapped.__kpProjectWorklogV8=true;
    window.newWorklogFor=wrapped;
    return true;
  }

  var tries=0;
  var timer=setInterval(function(){
    if(install() || ++tries>300) clearInterval(timer);
  },100);
  install();
})();
