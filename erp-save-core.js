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

    // A központi customers tábla a CRUD tartós adatforrása.
    for(const c of current){
      const p=customerPayload(c);
      if(!p.id||!p.name) continue;
      const old=customerSnapshot[p.id];
      if(old && JSON.stringify(old)===JSON.stringify(p)) continue;
      const existing=await customerRequest('customers?id=eq.'+encodeURIComponent(p.id)+'&select=id',{method:'GET'});
      if(Array.isArray(existing)&&existing.length){
        await customerRequest('customers?id=eq.'+encodeURIComponent(p.id),{method:'PATCH',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(p)});
      }else{
        await customerRequest('customers',{method:'POST',headers:{'Content-Type':'application/json','Prefer':'return=minimal'},body:JSON.stringify(p)});
      }
      customerSnapshot[p.id]=p;
    }

    // Csak olyan rekordot törlünk, amelyet ez a kliens korábban már ismert.
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
      const rows=await customerRequest('customers?select=*&order=created_at.asc',{method:'GET'});
      if(!Array.isArray(rows)) return;
      const local=Array.isArray(window.db.customers)?window.db.customers:[];
      const byId=new Map(local.map(c=>[String(c.id),c]));
      rows.forEach(r=>{
        const id=String(r.id);
        if(!byId.has(id)){
          byId.set(id,{id,name:r.name||'',taxNumber:r.tax||'',companyNo:r.company_no||'',contact:r.contact||'',phone:r.phone||'',email:r.email||'',address:r.address||'',notes:r.notes||'',status:r.status==='Inaktív'?'inactive':'active'});
        }
        customerSnapshot[id]=customerPayload(byId.get(id));
      });
      window.db.customers=Array.from(byId.values());
    }catch(e){console.warn('[ERP] Ügyfelek Supabase betöltése:',e);}
  }

  function install(){
    if(typeof window.supabaseCloudSave!=='function' || (typeof window.localSaveOnly!=='function' && typeof window.db==='undefined')) return false;
    window.save=async function(){
      if(typeof window.db!=='undefined'){
        try{localStorage.setItem('kutfoplusz_erp_v12',JSON.stringify(window.db));}catch(e){}
      }
      if(typeof window.supabaseCloudSave!=='function') throw new Error('A központi Supabase mentés nem érhető el.');
      await syncCustomers();
      await window.supabaseCloudSave();
      if(typeof window.setCloudStatus==='function')window.setCloudStatus('☁️ Mentve');
      return true;
    };
    window.__KP_SAVE_CORE__=true;
    window.KPCustomerSupabase={load:loadCustomers,sync:syncCustomers};
    (async()=>{
      for(let i=0;i<100&&!window.KPSupabaseAuth;i++) await sleep(100);
      await loadCustomers();
      customerSnapshot={};
      (window.db?.customers||[]).forEach(c=>{const p=customerPayload(c);if(p.id)customerSnapshot[p.id]=p;});
    })();
    console.info('[ERP] Central save core active; customers use Supabase customers table');
    return true;
  }
  let n=0,t=setInterval(()=>{if(install()||++n>200)clearInterval(t)},50);
  install();
})();
