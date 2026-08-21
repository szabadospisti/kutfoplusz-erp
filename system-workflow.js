/* Kútfő Plusz ERP – Rendszer / GitHub Workflow – safe v4 */
(function(){
  'use strict';
  if(window.__KP_SYSTEM_WORKFLOW_V4__) return;
  window.__KP_SYSTEM_WORKFLOW_V4__=true;

  var REPO='szabadospisti/kutfoplusz-erp';
  var API='https://api.github.com/repos/'+REPO+'/actions/runs?branch=main&per_page=20';

  function esc(v){
    return String(v==null?'':v).replace(/[&<>"']/g,function(c){
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];
    });
  }
  function icon(r){
    if(!r) return '⚪';
    if(r.status==='in_progress'||r.status==='queued') return '🟡';
    if(r.conclusion==='success') return '🟢';
    if(r.conclusion==='failure') return '🔴';
    if(r.conclusion==='cancelled') return '⚪';
    return '⚪';
  }
  function state(r){
    if(!r) return 'Nincs adat';
    if(r.status==='in_progress') return 'Folyamatban';
    if(r.status==='queued') return 'Várakozik';
    if(r.conclusion==='success') return 'Sikeres';
    if(r.conclusion==='failure') return 'Hibás';
    if(r.conclusion==='cancelled') return 'Megszakítva';
    return 'Nincs adat';
  }
  function fmt(v){return v?new Date(v).toLocaleString('hu-HU'):'—';}

  function installNav(){
    var nav=document.getElementById('nav');
    if(!nav) return;
    var b=document.getElementById('system-workflow-nav');
    if(!b){
      b=document.createElement('button');
      b.className='nav';
      b.id='system-workflow-nav';
      b.type='button';
      b.innerHTML='<i>⚙</i>Rendszer';
      var buttons=nav.querySelectorAll('.nav');
      var reports=null;
      for(var i=0;i<buttons.length;i++){
        if(/Riportok/i.test(buttons[i].textContent||'')){reports=buttons[i];break;}
      }
      if(reports&&reports.parentNode) reports.parentNode.insertBefore(b,reports.nextSibling);
      else nav.appendChild(b);
    }
    if(b.getAttribute('data-bound')==='1') return;
    b.setAttribute('data-bound','1');
    b.onclick=function(e){
      if(e){e.preventDefault();e.stopImmediatePropagation();}
      renderPage();
    };
  }

  function getRuns(){
    return fetch(API,{headers:{Accept:'application/vnd.github+json'}}).then(function(r){
      if(!r.ok) throw new Error('GitHub API HTTP '+r.status);
      return r.json();
    }).then(function(j){return j.workflow_runs||[];});
  }
  function getJobs(id){
    return fetch('https://api.github.com/repos/'+REPO+'/actions/runs/'+encodeURIComponent(id)+'/jobs?per_page=50',{headers:{Accept:'application/vnd.github+json'}}).then(function(r){
      if(!r.ok) throw new Error('GitHub API HTTP '+r.status);
      return r.json();
    }).then(function(j){return j.jobs||[];});
  }

  function shell(){
    var c=document.getElementById('content');
    var t=document.getElementById('title');
    if(!c) return null;
    if(t) t.textContent='Workflow / Deploy';
    var navs=document.querySelectorAll('.nav');
    for(var i=0;i<navs.length;i++) navs[i].classList.remove('active');
    var b=document.getElementById('system-workflow-nav');
    if(b) b.classList.add('active');
    c.innerHTML='<div class="panel" style="max-width:1250px"><div class="panelhead"><div><div class="eyebrow">RENDSZER</div><h2 style="font-size:22px;margin:4px 0">Workflow / Deploy</h2><div class="label">GitHub Actions állapot közvetlenül az ERP-ben</div></div><button class="btn secondary" id="wf_refresh">↻ Frissítés</button></div><div id="wf_body"><div class="empty">Betöltés…</div></div></div>';
    var refresh=document.getElementById('wf_refresh');
    if(refresh) refresh.onclick=renderPage;
    return document.getElementById('wf_body');
  }

  function renderPage(){
    installNav();
    var body=shell();
    if(!body) return;
    getRuns().then(function(runs){
      var latest=runs[0]||null;
      var rows=runs.map(function(r){
        return '<tr><td>'+icon(r)+' '+esc(state(r))+'</td><td><b>'+esc(r.name||'')+'</b><br><small>#'+esc(r.run_number||'')+'</small></td><td><code>'+esc(String(r.head_sha||'').slice(0,8))+'</code></td><td>'+esc(r.head_branch||'—')+'</td><td>'+esc(fmt(r.updated_at))+'</td><td><button class="btn small secondary wf-detail" data-id="'+esc(r.id||'')+'">Részletek</button> <a class="btn small secondary" target="_blank" rel="noopener" href="'+esc(r.html_url||'#')+'">GitHub</a></td></tr>';
      }).join('');
      if(!rows) rows='<tr><td colspan="6" class="empty">Nincs workflow futás.</td></tr>';
      body.innerHTML='<div class="cards"><div class="card"><div class="label">Rendszer állapota</div><div class="value">'+icon(latest)+' '+esc(state(latest))+'</div></div><div class="card"><div class="label">Utolsó workflow</div><div class="value" style="font-size:18px">'+esc(latest&&latest.name||'—')+'</div></div><div class="card"><div class="label">Commit</div><div class="value" style="font-size:18px"><code>'+esc(latest&&String(latest.head_sha||'').slice(0,8)||'—')+'</code></div></div><div class="card"><div class="label">Utolsó futás</div><div class="value" style="font-size:15px">'+esc(latest&&fmt(latest.updated_at)||'—')+'</div></div></div><div class="tablewrap" style="margin-top:16px"><table class="table"><thead><tr><th>ÁLLAPOT</th><th>WORKFLOW</th><th>COMMIT</th><th>BRANCH</th><th>FRISSÍTVE</th><th></th></tr></thead><tbody>'+rows+'</tbody></table></div><div id="wf_details" style="margin-top:16px"></div>';
      var detailsButtons=body.querySelectorAll('.wf-detail');
      for(var i=0;i<detailsButtons.length;i++) detailsButtons[i].onclick=function(){details(this.getAttribute('data-id'));};
    }).catch(function(err){
      body.innerHTML='<div class="notice">🔴 <b>Nem sikerült lekérni a GitHub Actions állapotát.</b><br>'+esc(err&&err.message||err)+'</div>';
    });
  }

  function details(id){
    var box=document.getElementById('wf_details');
    if(!box) return;
    box.innerHTML='<div class="notice">Jobok betöltése…</div>';
    getJobs(id).then(function(jobs){
      var html='';
      for(var i=0;i<jobs.length;i++) html+='<div class="kpi"><span>'+icon(jobs[i])+' <b>'+esc(jobs[i].name||'')+'</b></span><span>'+esc(jobs[i].conclusion||jobs[i].status||'—')+'</span></div>';
      box.innerHTML='<div class="card"><div class="panelhead"><h2>Workflow jobok</h2></div>'+(html||'<div class="empty">Nincsenek jobok.</div>')+'</div>';
    }).catch(function(err){box.innerHTML='<div class="notice">🔴 '+esc(err&&err.message||err)+'</div>';});
  }

  window.openSystemWorkflow=renderPage;
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',installNav);
  else installNav();

  /* Csak kompatibilitási javítás: az ajánlat státuszát a selectből vesszük. */
  var oldCollect=window.collectQuoteTemplate;
  if(typeof oldCollect==='function'&&!window.__KP_QUOTE_STATUS_FIX_V4__){
    window.collectQuoteTemplate=function(){
      var o=oldCollect.apply(this,arguments)||{};
      var select=document.getElementById('q_status');
      o.status=select&&select.value?select.value:'Piszkozat';
      return o;
    };
    window.__KP_QUOTE_STATUS_FIX_V4__=true;
  }
})();
