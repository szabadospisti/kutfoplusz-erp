/* Kútfő Plusz ERP – Projekt -> Munkanapló automatikus kapcsolat, stabil V4 */
(function(){
  'use strict';
  if(window.__KP_PROJECT_WORKLOG_AUTO_LINK_V4__) return;
  window.__KP_PROJECT_WORKLOG_AUTO_LINK_V4__=true;

  var pendingProjectId='';
  function s(v){return v==null?'':String(v);}
  function projects(){return window.db&&Array.isArray(window.db.projects)?window.db.projects:[];}
  function findProject(pid){
    var id=s(pid);
    return projects().find(function(p){return s(p.id)===id||s(p.supabaseId)===id;})||null;
  }
  function apply(){
    if(!pendingProjectId)return false;
    var sel=document.getElementById('wl_project');
    if(!sel)return false;
    var p=findProject(pendingProjectId);
    var target=p?s(p.id):s(pendingProjectId);
    var match=null;
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
    sel.setAttribute('data-kp-auto-project','1');
    sel.disabled=true;
    sel.style.display='none';
    var parent=sel.parentElement;
    if(parent){
      var fixed=parent.querySelector('.kp-fixed-project');
      if(!fixed){
        fixed=document.createElement('div');
        fixed.className='kp-fixed-project';
        fixed.style.cssText='padding:11px 12px;border:1px solid #dbe2e9;border-radius:10px;background:#f4f7fa;font-weight:700;color:#243447;';
        parent.appendChild(fixed);
      }
      fixed.textContent='🔒 '+(p?s(p.id)+' – '+s(p.name):'Projekt '+target);
    }
    if(p){
      var c=document.getElementById('wl_client');
      var loc=document.getElementById('wl_location');
      if(c&&p.customerId){c.value=s(p.customerId);c.dispatchEvent(new Event('change',{bubbles:true}));}
      if(loc&&!loc.value&&p.location)loc.value=s(p.location);
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
    [0,50,150,300,600,1000].forEach(function(ms){setTimeout(apply,ms);});
  }
  function hook(){
    if(typeof window.newWorklogFor==='function'&&!window.newWorklogFor.__kpAutoV4){
      function direct(pid){openForProject(pid);}
      direct.__kpAutoV4=true;
      window.newWorklogFor=direct;
    }
  }
  var timer=setInterval(hook,100);
  setTimeout(function(){clearInterval(timer);},60000);
  hook();
})();