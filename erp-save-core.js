/* Kútfő Plusz ERP – központi mentési útvonal v4. */
(function(){
  'use strict';
  if(window.__KP_SAVE_CORE__) return;

  async function request(path,options){
    if(!window.KPSupabaseAuth?.request) throw new Error('A Supabase API réteg nem érhető el.');
    return window.KPSupabaseAuth.request(path,options||{});
  }

  function customerPayload(c){
    return {
      id:String(c.id||''),
      name:String(c.name||c.company_name||c.customerName||'').trim(),
      company_name:String(c.company_name||c.name||c.customerName||'').trim(),
      customer_type:c.customerType||c.customer_type||'company',
      tax_number:c.taxNumber||c.tax_number||c.tax||null,
      company_number:c.companyNo||c.company_number||c.company_no||null,
      contact_person:c.contact||c.contactPerson||c.contact_person||null,
      phone:c.phone||c.telephone||null,
      email:c.email||c.e_mail||null,
      address:c.address||c.fullAddress||null,
      billing_address:c.billingAddress||c.billing_address||null,
      notes:c.notes||null,
      status:String(c.status||'Aktív').toLowerCase()==='inactive'?'Inaktív':'Aktív'
    };
  }

  async function syncCustomers(){
    if(!window.db||!Array.isArray(window.db.customers)||!window.KPSupabaseAuth?.request) return;
    for(const c of window.db.customers){
      const p=customerPayload(c);
      if(!p.id||!p.name) continue;
      const r=await request('customers?id=eq.'+encodeURIComponent(p.id),{method:'GET'});
      const rows=r.ok?await r.json():[];
      if(Array.isArray(rows)&&rows.length){
        await request('customers?id=eq.'+encodeURIComponent(p.id),{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(p)});
      }else{
        await request('customers',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(p)});
      }
    }
  }

  async function loadCustomers(){
    if(!window.db||!window.KPSupabaseAuth?.request) return;
    try{
      const r=await request('customers?select=*&order=created_at.asc',{method:'GET'});
      if(!r.ok)return;
      const rows=await r.json();
      if(!Array.isArray(rows))return;
      window.db.customers=rows.map(r=>({
        id:r.id,
        name:r.name||r.company_name||'',
        company_name:r.company_name||r.name||'',
        taxNumber:r.tax_number||'',
        companyNo:r.company_number||'',
        contact:r.contact_person||'',
        phone:r.phone||'',
        email:r.email||'',
        address:r.address||'',
        billingAddress:r.billing_address||'',
        notes:r.notes||'',
        status:r.status==='Inaktív'?'inactive':'active'
      }));
    }catch(e){console.warn('[ERP] Ügyfelek Supabase betöltése:',e);}
  }

  function install(){
    if(typeof window.localSaveOnly!=='function' && typeof window.db==='undefined') return false;
    window.KPCustomerSupabase={load:loadCustomers,sync:syncCustomers};
    return true;
  }
  let n=0,t=setInterval(()=>{if(install()||++n>200)clearInterval(t)},50);
  install();

  const s=document.createElement('script');
  s.src='erp-relational-bridge-v3.js?build=4';
  s.async=false;
  s.onload=()=>console.info('[ERP] Relational bridge v3 loaded');
  s.onerror=e=>console.error('[ERP] Relational bridge load failed',e);
  document.head.appendChild(s);
})();
