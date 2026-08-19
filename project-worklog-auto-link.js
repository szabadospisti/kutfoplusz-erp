/* Kútfő Plusz ERP – Projekt -> Munkanapló automatikus kapcsolat, stabil V7 */
(function(){
  'use strict';
  if(window.__KP_PROJECT_WORKLOG_AUTO_LINK_V7__) return;
  window.__KP_PROJECT_WORKLOG_AUTO_LINK_V7__=true;

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
    sel.dispatchEvent(new Event('input',{bubbles:true}));
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
    var original=window.__KP_ORIGINAL_NEW_WORKLOG_FOR__;
    if(typeof original==='function'){
      try{ original(pid); }catch(e){ console.error('Projekt munkanapló megnyitási hiba:',e); }
    }else if(typeof window.detailedWorklogEditor==='function'){
      window.detailedWorklogEditor(null,pendingProjectId);
    }else{
      setTimeout(function(){openForProject(pid);},100);
      return;
    }
    [0,25,75,150,300,600,1000,1800,3000].forEach(function(ms){setTimeout(apply,ms);});
  }
  function hook(){
    if(typeof window.newWorklogFor==='function'&&!window.newWorklogFor.__kpAutoV7){
      if(!window.__KP_ORIGINAL_NEW_WORKLOG_FOR__)window.__KP_ORIGINAL_NEW_WORKLOG_FOR__=window.newWorklogFor;
      var original=window.__KP_ORIGINAL_NEW_WORKLOG_FOR__;
      var wrapped=function(pid){
        pendingProjectId=s(pid);
        window.__kpPendingWorklogProjectId=pendingProjectId;
        var result;
        try{result=original.apply(this,arguments);}catch(e){console.error('Projekt munkanapló hiba:',e);}
        [0,25,75,150,300,600,1000,1800,3000].forEach(function(ms){setTimeout(apply,ms);});
        return result;
      };
      wrapped.__kpAutoV7=true;
      window.newWorklogFor=wrapped;
    }
    if(typeof window.__KP_PRESELECT_WORKLOG__!=='function'){
      window.__KP_PRESELECT_WORKLOG__=function(pid){pendingProjectId=s(pid);window.__kpPendingWorklogProjectId=pendingProjectId;return apply();};
    }
  }
  hook();
  var timer=setInterval(hook,100);
  setTimeout(function(){clearInterval(timer);},120000);
  if(window.MutationObserver){
    new MutationObserver(function(){if(pendingProjectId)apply();}).observe(document.body,{childList:true,subtree:true});
  }
})();
