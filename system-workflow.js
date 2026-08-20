/* ERP Rendszer / Workflow – GitHub Actions monitor */
(function(){
'use strict';
const REPO='szabadospisti/kutfoplusz-erp';
const API='https://api.github.com/repos/'+REPO+'/actions/runs?branch=main&per_page=20';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const icon=s=>s==='success'?'🟢':s==='failure'?'🔴':s==='in_progress'?'🟡':s==='cancelled'?'⚪':'⚪';
function addNav(){
 const nav=[...document.querySelectorAll('.nav')];
 if(!nav.length||document.getElementById('system-workflow-nav'))return;
 const reports=nav.find(x=>/Riportok/i.test(x.textContent||''));
 const b=document.createElement('button');b.className='nav';b.id='system-workflow-nav';b.innerHTML='<i>⚙</i> Rendszer';
 b.onclick=()=>renderPage();
 if(reports&&reports.parentNode) reports.parentNode.insertBefore(b,reports.nextSibling); else nav[nav.length-1].after(b);
}
async function getRuns(){const r=await fetch(API,{headers:{Accept:'application/vnd.github+json'}});if(!r.ok)throw new Error('GitHub API '+r.status);return (await r.json()).workflow_runs||[];}
function renderShell(r,html){r.innerHTML=`<div class="page"><div class="panel"><div class="panelhead"><div><div class="eyebrow">RENDSZER</div><h2 style="font-size:22px;margin:4px 0">Workflow / Deploy</h2><div class="label">GitHub Actions állapot közvetlenül az ERP-ben</div></div><button class="btn secondary" id="wf_refresh">↻ Frissítés</button></div>${html}</div></div>`;r.querySelector('#wf_refresh').onclick=renderPage;}
async function renderPage(){const r=document.getElementById('content');if(!r)return;renderShell(r,'<div class="empty">Betöltés…</div>');try{const runs=await getRuns();const latest=runs[0];const state=latest?.status==='completed'?latest.conclusion:latest?.status;const stateText=state==='success'?'Sikeres':state==='failure'?'Hibás':state==='in_progress'?'Folyamatban':state==='queued'?'Várakozik':'Nincs adat';r.querySelector('.panel').insertAdjacentHTML('beforeend',`<div class="cards" style="margin-top:16px"><div class="card"><div class="label">Rendszer állapota</div><div class="value">${icon(state)} ${stateText}</div></div><div class="card"><div class="label">Utolsó workflow</div><div class="value" style="font-size:18px">${esc(latest?.name||'—')}</div></div><div class="card"><div class="label">Commit</div><div class="value" style="font-size:18px">${esc(latest?.head_sha?.slice(0,7)||'—')}</div></div><div class="card"><div class="label">Branch</div><div class="value" style="font-size:18px">${esc(latest?.head_branch||'main')}</div></div></div><div class="panel" style="margin-top:16px;padding:0;box-shadow:none"><div class="tablewrap"><table class="table"><thead><tr><th>WORKFLOW</th><th>ÁLLAPOT</th><th>COMMIT</th><th>INDÍTÓ</th><th>IDŐ</th><th></th></tr></thead><tbody>${runs.map(x=>`<tr><td><b>${esc(x.name)}</b></td><td>${icon(x.status==='completed'?x.conclusion:x.status)} ${esc(x.status==='completed'?(x.conclusion||'—'):x.status)}</td><td><code>${esc((x.head_sha||'').slice(0,7))}</code></td><td>${esc(x.event||'—')}</td><td>${esc(x.run_number||'—')}</td><td><a class="btn small secondary" href="${esc(x.html_url)}" target="_blank" rel="noopener">GitHub</a></td></tr>`).join('')||'<tr><td colspan="6" class="empty">Nincs workflow futás.</td></tr>'}</tbody></table></div></div>`);}catch(e){r.querySelector('.panel').insertAdjacentHTML('beforeend',`<div class="notice" style="margin-top:16px">🔴 Nem sikerült lekérni a GitHub Actions állapotát.<br><small>${esc(e.message)}</small></div>`);}}
function boot(){addNav();new MutationObserver(addNav).observe(document.body,{childList:true,subtree:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
window.openSystemWorkflow=renderPage;
})();
