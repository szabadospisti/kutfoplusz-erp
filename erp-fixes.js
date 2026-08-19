/* Kútfő Plusz ERP – központi mentési és alap CRUD javítások.
 * V2/V3: Supabase erp_state + munkanapló rétegmentés + projekt kapcsolat.
 */
(function(){
  const MACHINE_KEY='kp_machine_fleet_v1';
  function uid(prefix){try{return crypto.randomUUID?crypto.randomUUID():prefix+'-'+Date.now()+'-'+Math.random().toString(36).slice(2)}catch{return prefix+'-'+Date.now()}}
  function localSave(){try{if(typeof localSaveOnly==='function')localSaveOnly();else localStorage.setItem('kutfoplusz_erp_db',JSON.stringify(window.db||{}))}catch(e){console.error(e)}}
  window.save=async function(){localSave();try{const client=window._supabaseClient;if(!client||!window.db)return;const {data:{user}}=await client.auth.getUser();if(!user)return;const {error}=await client.from('erp_state').upsert({id:'main',data:window.db,updated_at:new Date().toISOString(),updated_by:user.id},{onConflict:'id'});if(error)throw error}catch(e){console.error('Supabase mentés:',e)}};
  function patchLayerRows(){const table=document.getElementById('wl_layers');if(!table)return;[...table.querySelectorAll('tbody tr')].forEach(tr=>{if(tr.querySelector('input[name="layer_from[]"]'))return;const v=[...tr.querySelectorAll('.wl-depth-value')].map(x=>(x.textContent||'').replace(/\s*m\s*$/i,'').trim());const a=document.createElement('input'),b=document.createElement('input');a.type=b.type='hidden';a.name='layer_from[]';b.name='layer_to[]';a.value=v[0]||'';b.value=v[1]||'';tr.append(a,b)})}
  function installLayerPatch(){const o=new MutationObserver(patchLayerRows);if(document.body)o.observe(document.body,{childList:true,subtree:true});setTimeout(patchLayerRows,300);setTimeout(patchLayerRows,1000)}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installLayerPatch,{once:true});else installLayerPatch();

  async function syncCustomer(c){const client=window._supabaseClient;if(!client||!c)return null;const row={company_name:String(c.name||'').trim()||'Névtelen ügyfél',customer_type:c.customerType||null,tax_number:c.tax||null,address:c.address||null,phone:c.phone||null,email:c.email||null,contact_person:c.contact||null,notes:c.notes||null};const r=c.supabase_id?await client.from('customers').update(row).eq('id',c.supabase_id).select().single():await client.from('customers').insert(row).select().single();if(r.error)throw r.error;c.supabase_id=r.data.id;return r.data}
  async function syncProject(p){const client=window._supabaseClient;if(!client||!p)return null;const c=(window.db?.customers||[]).find(x=>String(x.id)===String(p.customerId));if(c&&!c.supabase_id)await syncCustomer(c);const row={project_number:p.project_number||String(p.id||uid('KP')).replace(/[^A-Za-z0-9_-]/g,'').slice(0,40),customer_id:c?.supabase_id||null,name:String(p.name||'').trim()||'Új munka',location:p.location||null,status:p.status||'Tervezés',contract_value:Number(p.value??p.contractValue)||0,planned_cost:Number(p.planned??p.plannedCost)||0,actual_cost:Number(p.cost??p.actualCost)||0};const r=p.supabase_id?await client.from('projects').update(row).eq('id',p.supabase_id).select().single():await client.from('projects').insert(row).select().single();if(r.error)throw r.error;p.supabase_id=r.data.id;p.project_number=r.data.project_number;return r.data}
  let tries=0;const timer=setInterval(()=>{if(typeof window.saveCustomer==='function'&&!window.__customerCrudSync){const f=window.saveCustomer;window.__customerCrudSync=true;window.saveCustomer=async function(){f.apply(this,arguments);try{const id=arguments[1],c=(window.db?.customers||[]).find(x=>String(x.id)===String(id))||window.db?.customers?.at(-1);if(c)await syncCustomer(c);await window.save()}catch(e){console.error(e)}}}if(typeof window.saveProject==='function'&&!window.__projectCrudSync){const f=window.saveProject;window.__projectCrudSync=true;window.saveProject=async function(){f.apply(this,arguments);try{const p=window.db?.projects?.at(-1);if(p)await syncProject(p);await window.save()}catch(e){console.error(e)}}}if(window.__customerCrudSync&&window.__projectCrudSync||++tries>100)clearInterval(timer)},100);

  /* Projekt -> Munkanapló: valódi Projekt mező a munkanaplóban. */
  let uiTries=0;const uiTimer=setInterval(()=>{
    if(typeof window.newWorklog==='function'&&!window.__worklogProjectField){
      const original=window.newWorklog;window.__worklogProjectField=true;
      window.newWorklog=function(worklog){
        original.apply(this,arguments);
        setTimeout(()=>{
          const form=document.getElementById('wlForm');if(!form)return;
          const old=form.querySelector('#wl_project');if(old)old.closest('.field')?.remove();
          const client=form.querySelector('#wl_client');
          if(!client)return;
          const field=document.createElement('div');field.className='field';field.innerHTML='<label>Projekt</label><select id="wl_project" name="projectId" class="select"><option value="">— Nincs projekt —</option></select>';
          client.closest('.field')?.after(field);
          const sel=field.querySelector('select');
          (window.db?.projects||[]).forEach(p=>{const o=document.createElement('option');o.value=p.id;o.textContent=(p.project_number||p.id)+' – '+(p.name||'');sel.appendChild(o)});
          const initial=worklog?.projectId||window.__pendingWorklogProjectId||'';if(initial)sel.value=String(initial);
          sel.addEventListener('change',()=>{window.__pendingWorklogProjectId=sel.value;const p=(window.db?.projects||[]).find(x=>String(x.id)===String(sel.value));if(p&&client.value!==p.customerId){client.value=p.customerId;client.dispatchEvent(new Event('change',{bubbles:true}))}});
        },80);
      };
    }
    if(typeof window.newWorklogFor==='function'&&!window.__projectWorklogLink){
      const original=window.newWorklogFor;window.__projectWorklogLink=true;
      window.newWorklogFor=function(projectId){window.__pendingWorklogProjectId=projectId||'';return original.apply(this,arguments)};
    }
    if(typeof window.wlCollect==='function'&&!window.__worklogProjectCollect){
      const original=window.wlCollect;window.__worklogProjectCollect=true;
      window.wlCollect=function(){const o=original.apply(this,arguments);const s=document.getElementById('wl_project');const v=s?.value||window.__pendingWorklogProjectId||'';if(v)o.projectId=String(v);return o};
    }
    if(window.__worklogProjectField&&window.__projectWorklogLink&&window.__worklogProjectCollect||++uiTries>100)clearInterval(uiTimer);
  },100);
})();
