/* Kútfő Plusz ERP – ügyfél adatlap műveletek. */
(function(){
  'use strict';
  let lastCustomerId=null;

  function visible(e){
    if(!e)return false;
    const s=getComputedStyle(e),r=e.getBoundingClientRect();
    return s.display!=='none'&&s.visibility!=='hidden'&&r.width>0&&r.height>0;
  }

  function rememberFromClicks(){
    document.addEventListener('click',function(ev){
      const el=ev.target.closest&&ev.target.closest('[onclick]');
      if(!el)return;
      const code=el.getAttribute('onclick')||'';
      const m=code.match(/customerDetails\s*\(\s*["']([^"']+)["']/);
      if(m) lastCustomerId=m[1];
      setTimeout(add,50);
    },true);
  }

  function findCustomerId(){
    if(lastCustomerId)return lastCustomerId;
    const els=[...document.querySelectorAll('[onclick]')];
    for(const el of els){
      const code=el.getAttribute('onclick')||'';
      const m=code.match(/customerDetails\s*\(\s*["']([^"']+)["']/);
      if(m)return m[1];
    }
    const db=window.db||{};
    const cs=Array.isArray(db.customers)?db.customers:[];
    const hs=[...document.querySelectorAll('h1,h2,h3')].filter(visible);
    for(const h of hs){
      const n=(h.textContent||'').trim();
      if(!n||/ügyfél|ajánlatok|projektek/i.test(n))continue;
      const c=cs.find(x=>String(x.name||'').trim()===n||String(x.company_name||'').trim()===n);
      if(c)return c.id;
    }
    return null;
  }

  function findHost(){
    const candidates=[...document.querySelectorAll('body *')].filter(visible).filter(e=>{
      const t=(e.textContent||'');
      return /Ajánlatok\s*\(/.test(t)&&/Projektek\s*\(/.test(t);
    });
    return candidates.sort((a,b)=>a.children.length-b.children.length)[0]||null;
  }

  function add(){
    if(document.getElementById('kpCustomerDetailActions'))return;
    const id=findCustomerId();
    const host=findHost();
    if(!id||!host)return;

    const box=document.createElement('div');
    box.id='kpCustomerDetailActions';
    box.className='no-print';
    box.style.cssText='display:flex;gap:10px;flex-wrap:wrap;margin:22px 0 4px;padding-top:16px;border-top:1px solid #e3e8ee;position:relative;z-index:9999;pointer-events:auto';

    const edit=document.createElement('button');
    edit.type='button';edit.className='btn secondary';edit.textContent='✏️ Szerkesztés';
    edit.onclick=function(){
      if(typeof window.editCustomer==='function')window.editCustomer(id);
      else if(typeof window.openCustomerEdit==='function')window.openCustomerEdit(id);
      else alert('A szerkesztő funkció nem érhető el.');
    };

    const del=document.createElement('button');
    del.type='button';del.className='btn danger';del.textContent='🗑️ Törlés';
    del.onclick=async function(){
      try{
        if(typeof window.deleteCustomer==='function')await window.deleteCustomer(id);
        else if(typeof window.kpDeleteCustomer==='function')await window.kpDeleteCustomer(id);
        else alert('A törlési funkció nem érhető el.');
      }catch(e){
        console.error(e);
        if(typeof window.toast==='function')window.toast(e.message||'A törlés nem sikerült');
        else alert(e.message||'A törlés nem sikerült');
      }
    };

    box.append(edit,del);
    host.appendChild(box);
  }

  function boot(){
    rememberFromClicks();
    add();
    new MutationObserver(add).observe(document.body,{childList:true,subtree:true});
    setInterval(add,500);
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot);else boot();
})();
