/* Kútfő Plusz ERP – Rendszer / GitHub Workflow */
(function(){
'use strict';
if(window.__KP_SYSTEM_WORKFLOW_V3__) return;
window.__KP_SYSTEM_WORKFLOW_V3__=true;
const REPO='szabadospisti/kutfoplusz-erp';
const API='https://api.github.com/repos/'+REPO+'/actions/runs?branch=main&per_page=20';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=r=>r?.status==='in_progress'?'🟡':r?.status==='queued'?'🟡':r?.conclusion==='success'?'🟢':r?.conclusion==='failure'?'🔴':r?.conclusion==='cancelled'?'⚪':'⚪';
const state=r=>r?.status==='in_progress'?'Folyamatban':r?.status==='queued'?'Várakozik':r?.conclusion==='success'?'Sikeres':r?.conclusion==='failure'?'Hibás':r?.conclusion==='cancelled'?'Megszakítva':'Nincs adat';
const fmt=s=>s?new Date(s).toLocaleString('hu-HU'):'—';
function installNav(){
 const nav=document.getElementById('nav');if(!nav)return;
 let b=document.getElementById('system-workflow-nav');
 if(!b){
   b=document.createElement('button');b.className='nav';b.id='system-workflow-nav';b.type='button';b.innerHTML='<i>⚙</i>Rendszer';
   const reports=[...nav.querySelectorAll('.nav')].find(x=>/Riportok/i.test(x.textContent||''));
   if(reports)reports.after(b);else nav.appendChild(b);
 }
 if(b.dataset.bound==='1')return;b.dataset.bound='1';
 b.onclick=e=>{e.preventDefault();e.stopImmediatePropagation();renderPage();};
}
async function getRuns(){const r=await fetch(API,{headers:{Accept:'application/vnd.github+json'}});if(!r.ok)throw new Error('GitHub API HTTP '+r.status);return (await r.json()).workflow_runs||[];}
async function getJobs(id){const r=await fetch('https://api.github.com/repos/'+REPO+'/actions/runs/'+id+'/jobs?per_page=50',{headers:{Accept:'application/vnd.github+json'}});if(!r.ok)throw new Error('GitHub API HTTP '+r.status);return (await r.json()).jobs||[];}
function shell(){const c=document.getElementById('content');const t=document.getElementById('title');if(t)t.textContent='Workflow / Deploy';document.querySelectorAll('.nav').forEach(x=>x.classList.remove('active'));const b=document.getElementById('system-workflow-nav');if(b)b.classList.add('active');c.innerHTML='<div class="panel" style="max-width:1250px"><div class="panelhead"><div><div class="eyebrow">RENDSZER</div><h2 style="font-size:22px;margin:4px 0">Workflow / Deploy</h2><div class="label">GitHub Actions állapot közvetlenül az ERP-ben</div></div><button class="btn secondary" id="wf_refresh">↻ Frissítés</button></div><div id="wf_body"><div class="empty">Betöltés…</div></div></div>';document.getElementById('wf_refresh').onclick=renderPage;}
async function renderPage(){installNav();const c=document.getElementById('content');if(!c)return;shell();const body=document.getElementById('wf_body');try{const runs=await getRuns();const latest=runs[0];body.innerHTML='<div class="cards"><div class="card"><div class="label">Rendszer állapota</div><div class="value">'+icon(latest)+' '+esc(state(latest))+'</div></div><div class="card"><div class="label">Utolsó workflow</div><div class="value" style="font-size:18px">'+esc(latest?.name||'—')+'</div></div><div class="card"><div class="label">Commit</div><div class="value" style="font-size:18px"><code>'+esc((latest?.head_sha||'').slice(0,8)||'—')+'</code></div></div><div class="card"><div class="label">Utolsó futás</div><div class="value" style="font-size:15px">'+esc(fmt(latest?.updated_at))+'</div></div></div><div class="tablewrap" style="margin-top:16px"><table class="table"><thead><tr><th>ÁLLAPOT</th><th>WORKFLOW</th><th>COMMIT</th><th>BRANCH</th><th>FRISSÍTVE</th><th></th></tr></thead><tbody>'+ (runs.map(r=>'<tr><td>'+icon(r)+' '+esc(state(r))+'</td><td><b>'+esc(r.name)+'</b><br><small>#'+esc(r.run_number)+'</small></td><td><code>'+esc((r.head_sha||'').slice(0,8))+'</code></td><td>'+esc(r.head_branch||'—')+'</td><td>'+esc(fmt(r.updated_at))+'</td><td><button class="btn small secondary wf-detail" data-id="'+esc(r.id)+'">Részletek</button> <a class="btn small secondary" target="_blank" rel="noopener" href="'+esc(r.html_url)+'">GitHub</a></td></tr>').join('') || '<tr><td colspan="6" class="empty">Nincs workflow futás.</td></tr>')+'</tbody></table></div><div id="wf_details" style="margin-top:16px"></div>';body.querySelectorAll('.wf-detail').forEach(b=>b.onclick=()=>details(b.dataset.id));}catch(e){body.innerHTML='<div class="notice">🔴 <b>Nem sikerült lekérni a GitHub Actions állapotát.</b><br>'+esc(e.message)+'</div>';}}
async function details(id){const box=document.getElementById('wf_details');if(!box)return;box.innerHTML='<div class="notice">Jobok betöltése…</div>';try{const jobs=await getJobs(id);box.innerHTML='<div class="card"><div class="panelhead"><h2>Workflow jobok</h2></div>'+(jobs.length?jobs.map(j=>'<div class="kpi"><span>'+icon(j)+' <b>'+esc(j.name)+'</b></span><span>'+esc(j.conclusion||j.status||'—')+'</span></div>').join(''):'<div class="empty">Nincsenek jobok.</div>')+'</div>';}catch(e){box.innerHTML='<div class="notice">🔴 '+esc(e.message)+'</div>';}}
window.openSystemWorkflow=renderPage;
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installNav);else installNav();

/* Ajánlat státusz javítás */
const _kpCollectQuoteTemplate=window.collectQuoteTemplate;
if(typeof _kpCollectQuoteTemplate==='function' && !window.__KP_QUOTE_STATUS_FIX__){
  window.collectQuoteTemplate=function(){
    const o=_kpCollectQuoteTemplate.apply(this,arguments);
    const select=document.getElementById('q_status');
    o.status=select?.value||'Piszkozat';
    return o;
  };
  window.__KP_QUOTE_STATUS_FIX__=true;
}

/* Munkanapló lista javítás – V1.5
   A ténylegesen mentett munkanapló mezői: finalDepth és projectId.
   A korábbi lista depthEnd/depth és project mezőket keresett, ezért
   a Végmélység üres maradt, a Projekt pedig csak az ügyfélre esett vissza.
   Itt a már betöltött index.html lista-függvényeit célzottan felülírjuk,
   így az aktív detailedWorklogEditor/wlCollect adatmodell változatlan marad. */
function kpWorklogProjectName(w){
  const p=(db?.projects||[]).find(p=>String(p.id)===String(w?.projectId||''));
  return p?.name||'';
}
function kpWorklogProjectLabel(w){
  const project=kpWorklogProjectName(w);
  if(project)return project;
  return typeof cust==='function'?cust(w?.customerId):'';
}
window.worklogListRows=function(arr=db.worklogs||[]){
 return `<div class="tablewrap"><table class="table"><thead><tr>
<th>Azonosító</th><th>Dátum</th><th>Projekt</th><th>Helyszín</th><th>Végmélység</th><th>Állapot</th><th></th>
</tr></thead><tbody>${
 (arr||[]).slice().reverse().map(w=>`<tr>
<td><b>${esc(w.id||"MN-"+(w.date||""))}</b></td>
<td>${esc(w.date||"")}</td>
<td>${esc(kpWorklogProjectLabel(w))}</td>
<td>${esc(w.location||"")}</td>
<td>${w.finalDepth!==undefined&&w.finalDepth!==null&&w.finalDepth!==""?esc(w.finalDepth)+" m":"—"}</td>
<td><span class="badge ${w.status==="Kész"||w.status==="Lezárt"?"green":"blue"}">${esc(w.status||"Piszkozat")}</span></td>
<td><button class="btn secondary small" onclick="openWorklogEditor('${esc(w.id||"")}')">Megnyitás</button></td>
</tr>`).join("")
}</tbody></table></div>`;
window.filterWorklogs=function(){
 const q=(document.getElementById("wsearch")?.value||"").toLowerCase().trim();
 const arr=(db.worklogs||[]).filter(w=>[
   w.id,w.date,w.projectId,kpWorklogProjectName(w),w.location,w.status,w.finalDepth
 ].join(" ").toLowerCase().includes(q));
 const el=document.getElementById("worklogTable");
 if(el)el.innerHTML=window.worklogListRows(arr);
};
window.__KP_WORKLOG_LIST_FIX_V15__=true;
})();
