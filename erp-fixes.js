/* Kútfő Plusz ERP – központi mentési és alap CRUD javítások. V6 */
(function(){
  function localSave(){try{if(typeof localSaveOnly==='function')localSaveOnly();else localStorage.setItem('kutfoplusz_erp_db',JSON.stringify(window.db||{}))}catch(e){console.error(e)}}
  async function saveViaRest(){
    const cfg=window.SUPABASE_CONFIG;
    if(!cfg||!cfg.url||!cfg.publishableKey)throw new Error('Supabase konfiguráció nincs betöltve.');
    let session=null;try{session=JSON.parse(localStorage.getItem('kutfoplusz_supabase_session_v1')||'null')}catch(e){}
    const token=session?.access_token||cfg.publishableKey;
    const res=await fetch(cfg.url+'/rest/v1/erp_state?on_conflict=id',{method:'POST',headers:{apikey:cfg.publishableKey,Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json',Prefer:'resolution=merge-duplicates,return=minimal'},body:JSON.stringify({id:'main',data:window.db,updated_at:new Date().toISOString(),updated_by:session?.user?.id||null})});
    if(!res.ok){const t=await res.text();throw new Error('Supabase '+res.status+': '+t)}
    return true;
  }
  window.save=async function(){
    localSave();
    try{
      const c=window._supabaseClient;
      if(c&&window.db){
        try{
          const {data:{user},error:authError}=await c.auth.getUser();
          if(user&&!authError){
            const {error}=await c.from('erp_state').upsert({id:'main',data:window.db,updated_at:new Date().toISOString(),updated_by:user.id},{onConflict:'id'});
            if(!error)return true;
          }
        }catch(e){console.warn('Supabase kliens mentés sikertelen, REST fallback:',e)}
      }
      if(!window.db)return false;
      return await saveViaRest();
    }catch(e){console.error('Supabase mentés:',e);return false}
  };
  function layers(){const t=document.getElementById('wl_layers');if(!t)return;[...t.querySelectorAll('tbody tr')].forEach(r=>{if(r.querySelector('[name="layer_from[]"]'))return;const v=[...r.querySelectorAll('.wl-depth-value')].map(x=>(x.textContent||'').replace(/\s*m\s*$/i,'').trim());const a=document.createElement('input'),b=document.createElement('input');a.type=b.type='hidden';a.name='layer_from[]';b.name='layer_to[]';a.value=v[0]||'';b.value=v[1]||'';r.append(a,b)})}
  function worklogForm(e){if(!e||e.nodeType!==1)return false;return e.id==='wlForm'||!!(e.querySelector?.('#wl_client')&&e.querySelector?.('#wl_layers'))}
  function projectField(f){if(!worklogForm(f))return;const client=f.querySelector('#wl_client');if(!client)return;let field=f.querySelector('#wl_project')?.closest('.field');if(!field){field=document.createElement('div');field.className='field wl-project-field';field.innerHTML='<label for="wl_project">Projekt</label><select id="wl_project" name="projectId" class="select"><option value="">— Nincs projekt —</option></select>';const cf=client.closest('.field');cf?.parentNode?cf.parentNode.insertBefore(field,cf.nextSibling):f.insertBefore(field,f.firstChild)}const s=field.querySelector('#wl_project'), old=s.value||window.__pendingWorklogProjectId||'', ps=window.db?.projects||[], sig=ps.map(p=>String(p.id)+'|'+(p.project_number||'')+'|'+(p.name||'')).join(';');if(s.dataset.sig!==sig){s.innerHTML='<option value="">— Nincs projekt —</option>';ps.forEach(p=>{const o=document.createElement('option');o.value=String(p.id);o.textContent=(p.project_number||p.id)+' – '+(p.name||'');s.append(o)});s.dataset.sig=sig}s.value=old;s.onchange=()=>{window.__pendingWorklogProjectId=s.value||'';const p=ps.find(x=>String(x.id)===String(s.value));if(p&&client.value!==p.customerId){client.value=p.customerId;client.dispatchEvent(new Event('change',{bubbles:true}))}}}
  function scan(){document.querySelectorAll('#wlForm,form,.modal,.drawer,.card').forEach(projectField);layers()}
  function install(){scan();if(!document.body)return;new MutationObserver(scan).observe(document.body,{childList:true,subtree:true});setInterval(scan,1000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',install,{once:true});else install();
  let n=0;const t=setInterval(()=>{if(typeof window.wlCollect==='function'&&!window.__kpCollect){const o=window.wlCollect;window.__kpCollect=true;window.wlCollect=function(){const r=o.apply(this,arguments)||{},s=document.getElementById('wl_project');if(s?.value)r.projectId=s.value;return r}}if(++n>100||window.__kpCollect)clearInterval(t)},100);
  if(typeof window.newWorklogFor==='function'&&!window.__kpLink){const o=window.newWorklogFor;window.__kpLink=true;window.newWorklogFor=function(id){window.__pendingWorklogProjectId=id||'';return o.apply(this,arguments)}}

  function loadMachineCrud(){
    if(window.__machineFleetCrudLoaded)return;
    if(typeof window.views==='undefined'||typeof window.render!=='function'||typeof window.db==='undefined')return;
    const s=document.createElement('script');
    s.src='machine-fleet-final.js?v=9';
    s.onload=()=>{window.__machineFleetCrudLoaded=true};
    s.onerror=e=>console.error('Géppark CRUD betöltési hiba',e);
    document.head.appendChild(s);
  }
  function loadProjectCrud(){
    if(window.__projectCrudLoaded)return;
    if(typeof window.views==='undefined'||typeof window.render!=='function'||typeof window.db==='undefined')return;
    const s=document.createElement('script');
    s.src='project-crud-fix.js?v=1';
    s.onload=()=>{window.__projectCrudLoaded=true};
    s.onerror=e=>console.error('Projekt CRUD betöltési hiba',e);
    document.head.appendChild(s);
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{loadMachineCrud();loadProjectCrud()},{once:true});else {loadMachineCrud();loadProjectCrud();}
  let mc=0;const mt=setInterval(()=>{loadMachineCrud();loadProjectCrud();if(++mc>40||(window.__machineFleetCrudLoaded&&window.__projectCrudLoaded))clearInterval(mt)},250);
})();
