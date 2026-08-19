/* Kútfő Plusz ERP – Projekt -> Munkanapló automatikus kapcsolat, stabil V5 */
(function(){
  'use strict';
  if(window.__KP_PROJECT_WORKLOG_AUTO_LINK_V5__) return;
  window.__KP_PROJECT_WORKLOG_AUTO_LINK_V5__=true;

  var pendingProjectId='';
  function s(v){return v==null?'':String(v);}
  function projects(){return window.db&&Array.isArray(window.db.projects)?window.db.projects:[];}
  function findProject(pid){
    var id=s(pid);
    return projects().find(function(p){return s(p.id)===id||s(p.supabaseId)===id;})||null;
  }
  function hideFieldByLabel(words, value, fixedText){
    var root=document.querySelector('.modal')||document.body;
    var nodes=root.querySelectorAll('label,div,span,p');
    for(var i=0;i<nodes.length;i++){
      var n=nodes[i], txt=s(n.textContent).trim();
      if(!txt || txt.length>80) continue;
      var hit=words.some(function(w){return txt.toLowerCase()===w.toLowerCase() || txt.toLowerCase().indexOf(w.toLowerCase()+':')===0;});
      if(!hit) continue;
      var box=n.parentElement;
      if(!box) continue;
      var field=box.querySelector('select,input,textarea');
      if(!field && box.parentElement) field=box.parentElement.querySelector('select,input,textarea');
      if(!field) continue;
      if(value!=null && value!==''){
        try{field.value=s(value); field.dispatchEvent(new Event('change',{bubbles:true}));}catch(e){}
      }
      field.disabled=true;
      field.setAttribute('data-kp-locked','1');
      field.style.display='none';
      var fixed=box.querySelector('.kp-fixed-linked-field');
      if(!fixed){
        fixed=document.createElement('div');
        fixed.className='kp-fixed-linked-field';
        fixed.style.cssText='padding:11px 12px;border:1px solid #dbe2e9;border-radius:10px;background:#f4f7fa;font-weight:700;color:#243447;margin-top:4px;';
        field.parentElement.appendChild(fixed);
      }
      fixed.textContent='🔒 '+fixedText;
      return true;
    }
    return false;
  }
  function lockLinkedFields(p){
    if(!p) return;
    var customer=p.customerName||p.customer||p.customerId||'';
    var location=p.location||'';
    hideFieldByLabel(['Megrendelő','Ügyfél','Megrendelő / Ügyfél'], customer, customer || 'Projekt ügyfele');
    hideFieldByLabel(['Helyszín','Munkavégzés helye'], location, location || 'Projekt helyszíne');
  }
  function apply(){
    if(!pendingProjectId)return false;
    var sel=document.getElementById('wl_project');
    var p=findProject(pendingProjectId);
    if(sel){
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
    }
    if(p){
      var c=document.getElementById('wl_client');
      var loc=document.getElementById('wl_location');
      if(c&&p.customerId){c.value=s(p.customerId);c.dispatchEvent(new Event('change',{bubbles:true}));c.disabled=true;c.style.display='none';}
      if(loc&&p.location){loc.value=s(p.location);loc.disabled=true;loc.style.display='none';}
      lockLinkedFields(p);
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
    [0,50,150,300,600,1000,1800].forEach(function(ms){setTimeout(apply,ms);});
  }
  function hook(){
    if(typeof window.newWorklogFor==='function'&&!window.newWorklogFor.__kpAutoV5){
      function direct(pid){openForProject(pid);}
      direct.__kpAutoV5=true;
      window.newWorklogFor=direct;
    }
  }
  var timer=setInterval(hook,100);
  setTimeout(function(){clearInterval(timer);},60000);
  hook();
})();