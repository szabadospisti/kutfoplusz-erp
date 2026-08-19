/* Kútfő Plusz ERP – Projekt -> Munkanapló automatikus kapcsolat */
(function(){
  'use strict';
  if(window.__KP_PROJECT_WORKLOG_AUTO_LINK__) return;
  window.__KP_PROJECT_WORKLOG_AUTO_LINK__=true;

  var pendingProjectId='';
  var pendingProjectNumber='';

  function normalize(v){ return v==null?'':String(v); }

  function setProjectSelect(){
    if(!pendingProjectId && !pendingProjectNumber) return false;
    var sel=document.getElementById('wl_project') || document.querySelector('select[name="projectId"],select[name="project_id"]');
    if(!sel) return false;

    var target=normalize(pendingProjectId || pendingProjectNumber);
    var match=null;
    Array.prototype.forEach.call(sel.options,function(opt){
      var vals=[opt.value,opt.dataset&&opt.dataset.projectId,opt.dataset&&opt.dataset.projectNumber,opt.getAttribute('data-project-id'),opt.getAttribute('data-project-number')];
      if(vals.some(function(v){return normalize(v)===target;})) match=opt;
    });

    if(!match && pendingProjectNumber){
      Array.prototype.forEach.call(sel.options,function(opt){
        if(normalize(opt.textContent).indexOf(normalize(pendingProjectNumber))>=0) match=opt;
      });
    }

    if(match){
      sel.value=match.value;
      sel.dispatchEvent(new Event('change',{bubbles:true}));
      sel.dispatchEvent(new Event('input',{bubbles:true}));
      sel.setAttribute('data-kp-auto-project','1');
      return true;
    }
    return false;
  }

  function remember(pid){
    pendingProjectId=normalize(pid);
    try{
      var p=(window.db&&Array.isArray(window.db.projects))?window.db.projects.find(function(x){return normalize(x.id)===pendingProjectId || normalize(x.supabaseId)===pendingProjectId;}):null;
      pendingProjectNumber=p?normalize(p.id):pendingProjectId;
    }catch(e){ pendingProjectNumber=pendingProjectId; }
    window.__kpPendingWorklogProjectId=pendingProjectId;
    window.__kpPendingWorklogProjectNumber=pendingProjectNumber;
    setProjectSelect();
  }

  function hook(){
    if(typeof window.newWorklogFor==='function' && !window.newWorklogFor.__kpWrapped){
      var original=window.newWorklogFor;
      function wrapped(pid){
        remember(pid);
        var result=original.apply(this,arguments);
        setTimeout(setProjectSelect,0);
        setTimeout(setProjectSelect,50);
        setTimeout(setProjectSelect,200);
        setTimeout(setProjectSelect,500);
        return result;
      }
      wrapped.__kpWrapped=true;
      window.newWorklogFor=wrapped;
    }
    setProjectSelect();
  }

  var observer=new MutationObserver(function(){setProjectSelect();});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  var timer=setInterval(hook,250);
  setTimeout(function(){clearInterval(timer);},30000);
  hook();
})();
