/* Kútfő Plusz ERP – Projektből indított munkanapló zárolás */
(function(){
  'use strict';
  var installed=false;

  function projects(){return (typeof db!=='undefined'&&db&&Array.isArray(db.projects))?db.projects:[];}
  function findProject(pid){return projects().find(function(p){return String(p.id)===String(pid)||String(p.supabaseId||'')===String(pid);})||null;}
  function customerName(id){
    var list=(typeof db!=='undefined'&&db&&Array.isArray(db.customers))?db.customers:[];
    var c=list.find(function(x){return String(x.id)===String(id)||String(x.supabaseId||'')===String(id);});
    return c?(c.name||c.company||c.customer_name||''):'';
  }
  function display(wrap,key,text){
    if(!wrap)return;
    var el=wrap.querySelector('.kp-worklog-locked-display[data-field="'+key+'"]');
    if(!el){el=document.createElement('div');el.className='kp-worklog-locked-display';el.setAttribute('data-field',key);wrap.appendChild(el);}
    el.textContent=text||'—';
  }
  function lockFields(p){
    var project=document.getElementById('wl_project'),client=document.getElementById('wl_client'),location=document.getElementById('wl_location');
    if(!project||!client||!location)return;
    var selected=p||findProject(project.value);
    var projectId=selected?(selected.id||''):(project.value||'');
    var customerId=selected?(selected.customerId||''):(client.value||'');
    var loc=selected?(selected.location||''):(location.value||'');
    var pname=selected?(selected.name||selected.id||''):(project.options&&project.selectedIndex>=0?project.options[project.selectedIndex].text:'');
    var cname=customerName(customerId)||(client.options&&client.selectedIndex>=0?client.options[client.selectedIndex].text:'');
    if(projectId)project.value=String(projectId);
    if(customerId)client.value=String(customerId);
    location.value=loc;
    var pw=project.closest('.wl-field')||project.parentElement,cw=client.closest('.wl-field')||client.parentElement,lw=location.closest('.wl-field')||location.parentElement;
    [pw,cw,lw].forEach(function(w){if(w)w.classList.add('kp-worklog-locked-field');});
    display(pw,'project',pname||'—');
    display(cw,'client',cname||'—');
    display(lw,'location',loc||'—');
    project.style.display='none';client.style.display='none';location.style.display='none';
    project.disabled=true;client.disabled=true;location.readOnly=true;
  }
  function install(){
    if(installed)return;installed=true;
    var css=document.createElement('style');
    css.textContent='.kp-worklog-locked-display{min-height:42px;padding:10px 12px;border:1px solid #dbe2e9;border-radius:10px;background:#f4f7fa;color:#243447;font-weight:700;box-sizing:border-box;width:100%}.kp-worklog-locked-field .kp-worklog-locked-display{display:block!important}.kp-worklog-locked-field select,.kp-worklog-locked-field input[readonly]{display:none!important}';
    document.head.appendChild(css);
    var obs=new MutationObserver(function(){var pid=window.__kpPendingWorklogProjectId;lockFields(pid?findProject(pid):null);});
    obs.observe(document.body,{childList:true,subtree:true});
    [0,100,300,700,1200,2000].forEach(function(ms){setTimeout(function(){var pid=window.__kpPendingWorklogProjectId;lockFields(pid?findProject(pid):null);},ms);});
  }
  function wait(){if(document.body)install();else setTimeout(wait,50);}
  wait();
})();
