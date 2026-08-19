/* Kútfő Plusz ERP – Projekt -> Munkanapló automatikus kapcsolat, stabil V3 */
(function(){
  'use strict';
  if(window.__KP_PROJECT_WORKLOG_AUTO_LINK_V3__) return;
  window.__KP_PROJECT_WORKLOG_AUTO_LINK_V3__=true;

  var pendingProjectId='';

  function s(v){return v==null?'':String(v);}
  function projects(){return window.db&&Array.isArray(window.db.projects)?window.db.projects:[];}
  function findProject(pid){
    var id=s(pid);
    return projects().find(function(p){return s(p.id)===id||s(p.supabaseId)===id;})||null;
  }

  function populate(sel){
    var ps=projects();
    if(!sel)return;
    var existing={};
    Array.prototype.forEach.call(sel.options,function(o){existing[s(o.value)]=true;});
    ps.forEach(function(p){
      var id=s(p.id);
      if(!id||existing[id])return;
      var o=document.createElement('option');
      o.value=id;
      o.textContent=id+' – '+s(p.name);
      if(p.supabaseId)o.setAttribute('data-supabase-id',s(p.supabaseId));
      sel.appendChild(o);
      existing[id]=true;
    });
  }

  function lockProjectField(sel,p){
    if(!sel)return;
    var text=p ? (s(p.id)+' – '+s(p.name)) : ('Projekt '+s(pendingProjectId));

    /* A projektből indított munkanaplónál nincs értelme projektet választani.
       A projekt kapcsolat fix, ezért a mező csak megjelenítési célú. */
    sel.disabled=true;
    sel.setAttribute('aria-disabled','true');
    sel.setAttribute('data-kp-project-fixed','1');

    var old=sel.parentElement && sel.parentElement.querySelector('.kp-fixed-project');
    if(!old){
      old=document.createElement('div');
      old.className='kp-fixed-project';
      old.style.cssText='margin-top:0;padding:11px 12px;border:1px solid #dbe2e9;border-radius:10px;background:#f4f7fa;font-weight:700;color:#243447;';
      sel.parentElement.appendChild(old);
    }
    old.textContent='🔒 '+text;
    sel.style.display='none';
  }

  function apply(){
    if(!pendingProjectId)return false;
    var sel=document.getElementById('wl_project')||document.querySelector('select[name="projectId"],select[name="project_id"]');
    if(!sel)return false;

    populate(sel);
    var p=findProject(pendingProjectId);
    var target=p?s(p.id):s(pendingProjectId);
    var remote=p?s(p.supabaseId):'';
    var match=null;

    Array.prototype.forEach.call(sel.options,function(o){
      var vals=[s(o.value),s(o.getAttribute('data-project-id')),s(o.getAttribute('data-project-number')),s(o.getAttribute('data-supabase-id')),s(o.dataset&&o.dataset.projectId),s(o.dataset&&o.dataset.projectNumber)];
      if(vals.indexOf(target)>=0 || (remote&&vals.indexOf(remote)>=0))match=o;
      if(!match&&p&&s(o.textContent).indexOf(s(p.id))>=0)match=o;
    });

    if(!match){
      var o=document.createElement('option');
      o.value=target;
      o.textContent=p ? (s(p.id)+' – '+s(p.name)) : ('Projekt '+target);
      if(remote)o.setAttribute('data-supabase-id',remote);
      sel.appendChild(o);
      match=o;
    }

    sel.value=match.value;
    sel.dispatchEvent(new Event('change',{bubbles:true}));
    sel.dispatchEvent(new Event('input',{bubbles:true}));
    sel.setAttribute('data-kp-auto-project','1');

    lockProjectField(sel,p);

    if(p){
      var c=document.getElementById('wl_client');
      var loc=document.getElementById('wl_location');
      if(c&&p.customerId){c.value=s(p.customerId);c.dispatchEvent(new Event('change',{bubbles:true}));}
      if(loc&&!loc.value&&p.location)loc.value=p.location;
    }
    return true;
  }

  function remember(pid){
    pendingProjectId=s(pid);
    window.__kpPendingWorklogProjectId=pendingProjectId;
    var p=findProject(pendingProjectId);
    window.__kpPendingWorklogProjectNumber=p?s(p.id):pendingProjectId;
    apply();
  }

  function hook(){
    if(typeof window.newWorklogFor==='function'&&!window.newWorklogFor.__kpAutoV3){
      var original=window.newWorklogFor;
      function wrapped(pid){
        remember(pid);
        var result=original.apply(this,arguments);
        [0,50,150,300,600,1000].forEach(function(ms){setTimeout(apply,ms);});
        return result;
      }
      wrapped.__kpAutoV3=true;
      window.newWorklogFor=wrapped;
    }
    apply();
  }

  var observer=new MutationObserver(function(){apply();});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  var timer=setInterval(hook,250);
  setTimeout(function(){clearInterval(timer);},60000);
  hook();
})();