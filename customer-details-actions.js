/* Kútfő Plusz ERP – ügyfél részletező műveletek. */
(function(){
  'use strict';
  function addActions(id){
    const modal=document.getElementById('modal');
    if(!modal || modal.classList.contains('hidden')) return;
    const box=modal.querySelector('.modalbox');
    if(!box) return;
    let foot=box.querySelector('.kp-customer-actions');
    if(!foot){
      foot=document.createElement('div');
      foot.className='modalfoot kp-customer-actions no-print';
      box.appendChild(foot);
    }
    foot.innerHTML='';
    const edit=document.createElement('button');
    edit.type='button'; edit.className='btn secondary'; edit.textContent='✏️ Szerkesztés';
    edit.onclick=function(){ if(typeof window.editCustomer==='function') window.editCustomer(id); };
    const del=document.createElement('button');
    del.type='button'; del.className='btn danger'; del.textContent='🗑️ Törlés';
    del.onclick=async function(){
      try{ await window.deleteCustomer(id); }
      catch(e){ console.error(e); if(typeof window.toast==='function') window.toast(e.message||'A törlés nem sikerült'); else alert(e.message||'A törlés nem sikerült'); }
    };
    const close=document.createElement('button');
    close.type='button'; close.className='btn secondary'; close.textContent='Bezárás';
    close.onclick=function(){ if(typeof window.closeModal==='function') window.closeModal(); else modal.classList.add('hidden'); };
    foot.append(edit,del,close);
  }
  function install(){
    const original=window.customerDetails;
    if(typeof original==='function' && !original.__kpWrapped){
      function wrapped(id){
        const result=original.apply(this,arguments);
        setTimeout(function(){addActions(id);},0);
        setTimeout(function(){addActions(id);},100);
        return result;
      }
      wrapped.__kpWrapped=true;
      window.customerDetails=wrapped;
    }
    document.addEventListener('click',function(e){
      const a=e.target.closest && e.target.closest('.link[onclick^="customerDetails"]');
      if(!a)return;
      const m=(a.getAttribute('onclick')||'').match(/customerDetails\(['"]([^'"]+)['"]\)/);
      if(m){setTimeout(function(){addActions(m[1]);},50);}
    });
  }
  function boot(){
    let n=0;
    const timer=setInterval(function(){
      install();
      if(++n>100) clearInterval(timer);
    },100);
  }
  boot();
})();
