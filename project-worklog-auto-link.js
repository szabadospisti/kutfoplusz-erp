/* Kútfő Plusz ERP – Projekt → Munkanapló kapcsolat, stabil V9 */
(function(){
  'use strict';
  if(window.__KP_PROJECT_WORKLOG_AUTO_LINK_V9__) return;
  window.__KP_PROJECT_WORKLOG_AUTO_LINK_V9__=true;
  function s(v){return v==null?'':String(v);}
  function getProjects(){return (window.db&&Array.isArray(db.projects))?db.projects:[];}
  function lockProjectContext(pid){
    var projectId=s(pid||window.__kpPendingWorklogProjectId);
    if(!projectId) return false;
    var p=getProjects().find(function(x){return s(x.id)===projectId;});
    if(!p) return false;
    var project=document.getElementById('wl_project');
    var client=document.getElementById('wl_client');
    var location=document.getElementById('wl_location');
    if(!project) return false;
    project.value=projectId;
    project.disabled=true;
    project.setAttribute('data-project-locked','1');
    if(client){if(p.customerId) client.value=s(p.customerId);client.disabled=true;client.setAttribute('data-project-locked','1');}
    if(location){if(p.location) location.value=p.location;location.readOnly=true;location.setAttribute('data-project-locked','1');}
    window.__kpPendingWorklogProjectId=projectId;
    return true;
  }
  function install(){
    if(typeof window.newWorklogFor!=='function') return false;
    if(window.newWorklogFor.__kpProjectWorklogV9) return true;
    var original=window.newWorklogFor;
    var wrapped=function(pid){
      window.__kpPendingWorklogProjectId=s(pid);
      var result=original.apply(this,arguments);
      var tries=0;
      var timer=setInterval(function(){if(lockProjectContext(pid)||++tries>50)clearInterval(timer);},100);
      return result;
    };
    wrapped.__kpProjectWorklogV9=true;
    window.newWorklogFor=wrapped;
    return true;
  }
  var tries=0;
  var timer=setInterval(function(){if(install()||++tries>300)clearInterval(timer);},100);
  install();
})();
