/* Kútfő Plusz ERP – végleges ügyfél adatlap műveletek.
   Fontos: az ERP adatbázisa `let db` változó, ezért nem window.db.
   A javítás közvetlenül a globális #drawer / #dbody nézetet kezeli. */
(function(){
  'use strict';

  function getDB(){
    try { return (typeof db !== 'undefined') ? db : null; }
    catch(e){ return null; }
  }

  function visible(el){
    if(!el) return false;
    var s=getComputedStyle(el), r=el.getBoundingClientRect();
    return s.display!=='none' && s.visibility!=='hidden' && r.width>0 && r.height>0;
  }

  function getCustomer(){
    var data=getDB();
    if(!data || !Array.isArray(data.customers)) return null;

    var title=document.getElementById('dtitle');
    if(!title) return null;
    var name=(title.textContent||'').trim();
    if(!name) return null;

    return data.customers.find(function(c){
      return String(c.name||'').trim()===name || String(c.company_name||'').trim()===name;
    }) || null;
  }

  function addActions(){
    var drawer=document.getElementById('drawer');
    var body=document.getElementById('dbody');
    if(!drawer || !body || !drawer.classList.contains('open')) return;

    var customer=getCustomer();
    if(!customer) return;

    var old=document.getElementById('kpCustomerDetailActions');
    if(old) old.remove();

    var box=document.createElement('div');
    box.id='kpCustomerDetailActions';
    box.style.cssText='display:flex;gap:10px;flex-wrap:wrap;margin-top:22px;padding-top:18px;border-top:1px solid #e3e8ee;position:relative;z-index:9999;pointer-events:auto;';

    var edit=document.createElement('button');
    edit.type='button';
    edit.className='btn secondary';
    edit.textContent='✏️ Szerkesztés';
    edit.onclick=function(){
      var id=customer.id;
      if(typeof editCustomer==='function') editCustomer(id);
      else if(typeof newCustomer==='function') newCustomer(customer);
    };

    var del=document.createElement('button');
    del.type='button';
    del.className='btn danger';
    del.textContent='🗑️ Törlés';
    del.onclick=function(){
      var id=customer.id;
      if(typeof deleteCustomer==='function') return deleteCustomer(id);
      if(typeof kpDeleteCustomer==='function') return kpDeleteCustomer(id);
      alert('A törlési funkció nem érhető el.');
    };

    box.appendChild(edit);
    box.appendChild(del);
    body.appendChild(box);
  }

  function boot(){
    addActions();
    var observer=new MutationObserver(function(){ addActions(); });
    observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    setInterval(addActions,500);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot);
  else boot();
})();
