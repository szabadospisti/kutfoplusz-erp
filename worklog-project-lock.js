/* Kútfő Plusz ERP – worklog fields locked to the parent project. */
(function(){
  'use strict';
  var installed=false;

  function projectFromForm(){
    var sel=document.getElementById('wl_project');
    var id=sel&&sel.value;
    if(!id) return null;
    var list=(window.db&&Array.isArray(db.projects))?db.projects:[];
    return list.find(function(p){return String(p.id)===String(id)||String(p.supabaseId||'')===String(id);})||null;
  }

  function customerName(p){
    if(!p) return '';
    var list=(window.db&&Array.isArray(db.customers))?db.customers:[];
    var c=list.find(function(x){return String(x.id)===String(p.customerId)||String(x.supabaseId||'')===String(p.customerId);});
    return c ? (c.name||c.company||c.customer_name||'') : '';
  }

  function apply(){
    var project=document.getElementById('wl_project');
    var client=document.getElementById('wl_client');
    var location=document.getElementById('wl_location');
    if(!project||!client||!location) return;

    var p=projectFromForm();
    if(!p) return;

    var cname=customerName(p);
    if(cname){
      var opt=Array.prototype.find.call(client.options,function(o){return String(o.value)===String(p.customerId);});
      if(!opt){
        opt=document.createElement('option');
        opt.value=p.customerId||'';
        opt.textContent=cname;
        client.appendChild(opt);
      }
      client.value=String(p.customerId||'');
    }
    client.disabled=true;
    location.value=p.location||'';
    location.readOnly=true;
    location.setAttribute('aria-readonly','true');

    var cwrap=client.closest('.wl-field')||client.parentElement;
    var lwrap=location.closest('.wl-field')||location.parentElement;
    [cwrap,lwrap].forEach(function(w){if(w)w.classList.add('kp-worklog-locked-field');});

    var clientDisplay=cwrap&&cwrap.querySelector('.kp-worklog-locked-display');
    if(cwrap&&!clientDisplay){
      clientDisplay=document.createElement('div');
      clientDisplay.className='kp-worklog-locked-display';
      cwrap.appendChild(clientDisplay);
    }
    if(clientDisplay){clientDisplay.textContent=cname||'—';}

    var locDisplay=lwrap&&lwrap.querySelector('.kp-worklog-locked-display');
    if(lwrap&&!locDisplay){
      locDisplay=document.createElement('div');
      locDisplay.className='kp-worklog-locked-display';
      lwrap.appendChild(locDisplay);
    }
    if(locDisplay){locDisplay.textContent=p.location||'—';}
  }

  function install(){
    if(installed) return;
    installed=true;
    var css=document.createElement('style');
    css.textContent='.kp-worklog-locked-field select:disabled,.kp-worklog-locked-field input[readonly]{display:none!important}.kp-worklog-locked-display{min-height:42px;padding:10px 12px;border:1px solid #dbe2e9;border-radius:10px;background:#f4f7fa;color:#243447;font-weight:700;box-sizing:border-box}.kp-worklog-locked-field{position:relative}';
    document.head.appendChild(css);
    var obs=new MutationObserver(function(){apply();});
    obs.observe(document.body,{childList:true,subtree:true});
    [0,100,300,700,1200,2000].forEach(function(ms){setTimeout(apply,ms);});
    document.addEventListener('change',function(e){if(e.target&&e.target.id==='wl_project')setTimeout(apply,0);});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install);else install();
})();
