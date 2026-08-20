/* Kútfő Plusz ERP – egyetlen központi mentési útvonal. */
(function(){
  'use strict';
  if(window.__KP_SAVE_CORE__) return;

  const sleep=ms=>new Promise(r=>setTimeout(r,ms));
  let customerSnapshot={};

  async function customerRequest(path,options){
    if(!window.KPSupabaseAuth?.request) throw new Error('A Supabase API réteg nem érhető el.');
    return window.KPSupabaseAuth.request(path,options);
  }

  function customerPayload(c){
    return {
      id:String(c.id||''),
      name:String(c.name||c.company_name||'').trim(),
      tax:c.taxNumber||c.tax_number||c.tax||null,
      company_no:c.companyNo||c.company_no||null,
      contact:c.contact||c.contactPerson||c.contact_person||null,
      phone:c.phone||c.telephone||null,
      email:c.email||c.e_mail||null,
      address:c.address||c.fullAddress||null,
      notes:c.notes||null,
      status:String(c.status||'Aktív').toLowerCase()==='inactive'?'Inaktív':'Aktív'
    };
  }

  async function syncCustomers(){
    if(!window.db||!Array.isArray(window.db.customers)) return;
    if(!window.KPSupabaseAuth?.request) return;

    const current=window.db.customers;
    const currentIds=new Set(current.map(c=>String(c.id||'')));

    for(const c of current){
      const p=customerPayload(c);
      if(!p.id||!p.name) continue;
      const old=customerSnapshot[p.id];
      if(old && JSON.stringify(old)===JSON.stringify(p)) continue;
      const existing=await customerRequest('customers?id=eq.'+encodeURIComponent(p.id)+'&select=id',{method:'GET'});
      const existingRows=await existing.json();
      if(Array.isArray(existingRows)&&existingRows.length){
        await customerRequest('customers?id=eq.'+encodeURIComponent(p.id),{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(p)});
      }else{
        await customerRequest('customers',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(p)});
      }
      customerSnapshot[p.id]=p;
    }

    for(const id of Object.keys(customerSnapshot)){
      if(!currentIds.has(id)){
        await customerRequest('customers?id=eq.'+encodeURIComponent(id),{method:'DELETE'});
        delete customerSnapshot[id];
      }
    }
  }

  async function loadCustomers(){
    if(!window.db||!window.KPSupabaseAuth?.request) return;
    try{
      const r=await customerRequest('customers?select=*&order=created_at.asc',{method:'GET'});
      if(!r.ok)return;
      const rows=await r.json();
      if(!Array.isArray(rows)) return;
      const local=Array.isArray(window.db.customers)?window.db.customers:[];
      const byId=new Map(local.map(c=>[String(c.id),c]));
      rows.forEach(r=>{
        if(!byId.has(String(r.id)))byId.set(String(r.id),{id:r.id,name:r.name||'',taxNumber:r.tax_number||'',companyNo:r.company_number||'',contact:r.contact_person||'',phone:r.phone||'',email:r.email||'',address:r.address||'',billingAddress:r.billing_address||'',notes:r.notes||'',status:r.status==='Inaktív'?'inactive':'active'});
      });
      window.db.customers=Array.from(byId.values());
    }catch(e){console.warn('[ERP] Ügyfelek Supabase betöltése:',e);}
  }

  function install(){
    if(typeof window.localSaveOnly!=='function' && typeof window.db==='undefined') return false;
    window.KPCustomerSupabase={load:loadCustomers,sync:syncCustomers};
    console.info('[ERP] Central save core active; relational bridge will own cloud persistence');
    return true;
  }
  let n=0,t=setInterval(()=>{if(install()||++n>200)clearInterval(t)},50);
  install();

  // The HTML application already loads this save-core file. Keep the relational
  // bridge as a separate module so the legacy UI does not need a large rewrite.
  const s=document.createElement('script');
  s.src='erp-relational-bridge-v3.js?build=3';
  s.async=false;
  s.onload=()=>console.info('[ERP] Relational bridge v3 loaded');
  s.onerror=e=>console.error('[ERP] Relational bridge load failed',e);
  document.head.appendChild(s);
})();
