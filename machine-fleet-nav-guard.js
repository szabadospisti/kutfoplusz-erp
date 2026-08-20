/* Kútfő Plusz ERP – Géppark navigation guard.
 * Csak a navigációt fogja meg. A Gépparkon belüli CRUD gombokat NEM blokkolja.
 */
(function(){
  'use strict';
  function isFleetNavigation(el){
    if(!el)return false;
    const n=el.closest?.('.nav [data-view],.nav [data-page],.nav [data-target],a[href],.nav button,.nav [role="button"]');
    if(!n)return false;
    const ds=n.dataset||{};
    const raw=[ds.page,ds.view,ds.target,n.getAttribute?.('href'),n.textContent].filter(Boolean).join(' ').toLowerCase();
    return raw.includes('machines')||raw.includes('geppark')||raw.includes('géppark');
  }
  function hide(){document.documentElement.classList.add('fleet-boot-pending');}
  function show(){document.documentElement.classList.remove('fleet-boot-pending');}
  function renderFleet(){
    hide();
    if(typeof window.__kpFleetRender==='function'){window.__kpFleetRender();show();return true;}
    if(window.views&&typeof window.views.machines==='function'){
      const r=document.getElementById('content')||document.querySelector('.content');
      if(!r)return false;
      r.innerHTML=window.views.machines();show();return true;
    }
    return false;
  }
  function intercept(e){
    if(!isFleetNavigation(e.target))return;
    e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();hide();
    let n=0;const t=setInterval(()=>{if(renderFleet()||++n>120){clearInterval(t);if(n>120)show();}},25);
  }
  ['pointerdown','mousedown','touchstart','click'].forEach(type=>document.addEventListener(type,intercept,true));
  function boot(){
    if((location.hash||'').toLowerCase().includes('/machines')){
      hide();let n=0;const t=setInterval(()=>{if(renderFleet()||++n>120){clearInterval(t);if(n>120)show();}},25);
    }
  }
  window.addEventListener('hashchange',()=>{if((location.hash||'').toLowerCase().includes('/machines')){hide();renderFleet();}});
  boot();window.__kpFleetNavigationGuard=true;
})();
