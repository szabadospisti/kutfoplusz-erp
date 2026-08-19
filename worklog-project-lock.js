/* Kútfő Plusz ERP – Projektből indított munkanapló zárolás */
(function(){
  'use strict';
  var installed=false;

  function findProject(pid){
    var list=(window.db&&Array.isArray(db.projects))?db.projects:[];
    return list.find(function(p){return String(p.id)===String(pid)||String(p.supabaseId||'')===String(pid);})||null;
  }

  function lockFields(p){
    if(!p) return;
    var project=document.getElementById('wl_project');
    var client=document.getElementById('wl_client');
    var location=document.getElementById('wl_location');
    if(!project||!client||!location) return;

    project.value=String(p.id);
    project.disabled=true;
    project.setAttribute('aria-disabled','true');

    client.value=String(p.customerId||'');
    client.disabled=true;
    client.setAttribute('aria-disabled','true');

    location.value=p.location||'';
    location.readOnly=true;
    location.setAttribute('aria-readonly','true');

    [project,client,location].forEach(function(el){
      var wrap=el.closest('.wl-field')||el.parentElement;
      if(wrap)wrap.classList.add('kp-worklog-locked-field');
    });
  }

  function install(){
    if(installed) return;
    installed=true;

    var css=document.createElement('style');
    css.textContent='.kp-worklog-locked-field select:disabled,.kp-worklog-locked-field input[readonly]{display:none!important}.kp-worklog-locked-display{min-height:42px;padding:10px 12px;border:1px solid #dbe2e9;border-radius:10px;background:#f4f7fa;color:#243447;font-weight:700;box-sizing:border-box}';
    document.head.appendChild(css);

    if(typeof window.newWorklogFor==='function' && typeof window.detailedWorklogEditor==='function'){
      window.newWorklogFor=function(pid){
        var p=findProject(pid);
        if(!p){ if(typeof window.toast==='function')window.toast('A projekt nem található.'); return; }
        window.__kpPendingWorklogProjectId=p.id;
        window.detailedWorklogEditor(null,p.id);
        [0,50,150,300,700].forEach(function(ms){setTimeout(function(){lockFields(p);},ms);});
      };
    }

    var obs=new MutationObserver(function(){
      var pid=window.__kpPendingWorklogProjectId;
      if(pid)lockFields(findProject(pid));
    });
    obs.observe(document.body,{childList:true,subtree:true});
  }

  function wait(){
    if(typeof window.newWorklogFor==='function' && typeof window.detailedWorklogEditor==='function')install();
    else setTimeout(wait,100);
  }
  wait();
})();
