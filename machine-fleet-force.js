/* Kútfő Plusz ERP – Géppark végső render guard V3
 * A régi inline Géppark view csak akkor cserélődik, ha ténylegesen az
 * aktív Géppark oldal látszik. Nem támaszkodik window.current-re.
 */
(function(){
  'use strict';
  function root(){return document.getElementById('content')||document.querySelector('.content')}
  function fleetActive(){
    const active=[...document.querySelectorAll('.nav.active')];
    if(active.some(n=>/Géppark/i.test(n.textContent||'')))return true;
    const title=document.querySelector('.top h1');
    return !!title&&/Géppark/i.test(title.textContent||'');
  }
  function oldFleet(r){
    if(!r)return false;
    const th=[...r.querySelectorAll('th')].map(x=>(x.textContent||'').trim().toUpperCase());
    return th.includes('GÉP') || (th.includes('TÍPUS')&&th.includes('ÜZEMÓRA')&&th.includes('SZERVIZ'));
  }
  function showFinal(){
    if(!fleetActive()||typeof window.__gfView!=='function')return false;
    const r=root();
    if(!r)return false;
    if(oldFleet(r))r.innerHTML=window.__gfView();
    return true;
  }
  function bind(){
    if(typeof window.__gfView!=='function')return false;
    document.querySelectorAll('.nav').forEach(n=>{
      if(n.__fleetGuardBound)return;
      n.__fleetGuardBound=true;
      n.addEventListener('click',()=>setTimeout(showFinal,0));
      n.addEventListener('click',()=>setTimeout(showFinal,100));
      n.addEventListener('click',()=>setTimeout(showFinal,500));
    });
    const r=root();
    if(r&&!r.__fleetGuardObserver){
      const observer=new MutationObserver(()=>{
        if(!observer.__busy){observer.__busy=true;try{showFinal()}finally{observer.__busy=false}}
      });
      observer.observe(r,{childList:true,subtree:true});
      r.__fleetGuardObserver=observer;
    }
    if(typeof window.render==='function'&&!window.__fleetRenderWrapped){
      const original=window.render;
      window.render=function(){
        const result=original.apply(this,arguments);
        setTimeout(showFinal,0);
        return result;
      };
      window.__fleetRenderWrapped=true;
    }
    showFinal();
    window.__fleetForceInstalled=true;
    return true;
  }
  let n=0;
  const t=setInterval(()=>{if(bind()||++n>160)clearInterval(t)},100);
  bind();
})();
