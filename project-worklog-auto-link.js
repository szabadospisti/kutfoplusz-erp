/* Kútfő Plusz ERP – Projekt -> Munkanapló automatikus kapcsolat, stabil V6 */
(function(){
  'use strict';
  if(window.__KP_PROJECT_WORKLOG_AUTO_LINK_V6__) return;
  window.__KP_PROJECT_WORKLOG_AUTO_LINK_V6__=true;

  var pendingProjectId='';
  function s(v){return v==null?'':String(v);}
  function projects(){return window.db&&Array.isArray(window.db.projects)?window.db.projects:[];}
  function findProject(pid){
    var id=s(pid);
    return projects().find(function(p){return s(p.id)===id||s(p.supabaseId)===id;})||null;
  }
  function fixed(parent,cls,text){
    if(!parent)return;
    var el=parent.querySelector('.'+cls);
    if(!el){
      el=document.createElement('div');
      el.className=cls;
      el.style.cssText='padding:11px 12px;border:1px solid #dbe2e9;border-radius:10px;background:#f4f7fa;font-weight:700;color:#243447;margin-top:4px;';
      parent.appendChild(el);
    }
    el.textContent='🔒 '+text;
  }
  function lockField(id,text){
    var el=document.getElementById(id);
    if(!el)return;
    if(text!=null)el.value=s(text);
    el.disabled=true;
    el.setAttribute('data-kp-locked','1');
    el.style.display='none';
    fixed(el.parentElement,id+'-kp-fixed',s(text)||'Projektből átvett adat');
  }
  function apply(){
    if(!pendingProjectId)return false;
    var p=findProject(pendingProjectId);
    var sel=document.getElementById('wl_project');
    if(!sel)return false;

    var target=p?s(p.id):s(pendingProjectId), match=null;
    Array.prototype.forEach.call(sel.options,function(o){
      if(s(o.value)===target || (p&&s(o.textContent).indexOf(s(p.id))>=0))match=o;
    });
    if(!match){
      match=document.createElement('option');
      match.value=target;
      match.textContent=p?s(p.id)+' – '+s(p.name):'Projekt '+target;
      sel.appendChild(match);
    }
    sel.value=match.value;
    sel.dispatchEvent(new Event('change',{bubbles:true}));
    sel.disabled=true;
    sel.setAttribute('data-kp-locked','1');
    sel.style.display='none';
    fixed(sel.parentElement,'kp-fixed-project',p?s(p.id)+' – '+s(p.name):'Projekt '+target);

    if(p){
      if(p.customerId)lockField('wl_client',p.customerId);
      if(p.location)lockField('wl_location',p.location);
    }
    return true;
  }
  function openForProject(pid){
    pendingProjectId=s(pid);
    window.__kpPendingWorklogProjectId=pendingProjectId;
    if(typeof window.detailedWorklogEditor!=='function'){
      setTimeout(function(){openForProject(pid);},100);
      return;
    }
    window.detailedWorklogEditor(null,pendingProjectId);
    [0,25,75,150,300,600,1000,1800,3000].forEach(function(ms){setTimeout(apply,ms);});
  }
  function hook(){
    if(typeof window.newWorklogFor==='function'&&!window.newWorklogFor.__kpAutoV6){
      var direct=function(pid){openForProject(pid);};
      direct.__kpAutoV6=true;
      window.newWorklogFor=direct;
    }
    if(typeof window.__KP_PRESELECT_WORKLOG__!=='function'){
      window.__KP_PRESELECT_WORKLOG__=function(pid){
        pendingProjectId=s(pid);
        return apply();
      };
    }
    apply();
  }

  hook();
  var timer=setInterval(hook,100);
  setTimeout(function(){clearInterval(timer);},120000);

  if(window.MutationObserver){
    new MutationObserver(function(){if(pendingProjectId)apply();}).observe(document.body,{childList:true,subtree:true});
  }
})();