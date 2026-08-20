/* Kútfő Plusz ERP – Géppark FINAL navigation guard.
 * A régi machines view nem kaphat render-lehetőséget. A guard megvárja az egyetlen
 * CRUD modult, majd közvetlenül annak rendererét használja. */
(function(){
  'use strict';

  function isFleet(el){
    if(!el) return false;
    const n=el.closest?.('.nav,button,a,[role="button"]')||el;
    const ds=n.dataset||{};
    const raw=[ds.page,ds.view,ds.target,n.getAttribute?.('data-page'),n.getAttribute?.('data-view'),n.getAttribute?.('href'),n.textContent].filter(Boolean).join(' ').toLowerCase();
    return raw.includes('machines')||raw.includes('geppark')||raw.includes('géppark');
  }

  function hide(){
    document.documentElement.classList.add('fleet-boot-pending');
  }
  function show(){
    document.documentElement.classList.remove('fleet-boot-pending');
  }

  function renderFleet(){
    hide();
    if(typeof window.__kpFleetRender==='function'){
      window.__kpFleetRender();
      show();
      return true;
    }
    if(typeof window.__kpFleetCRUD==='boolean' || window.__kpFleetCRUD){
      const r=document.getElementById('content')||document.querySelector('.content');
      if(r && window.views && typeof window.views.machines==='function'){
        r.innerHTML=window.views.machines();
        show();
        return true;
      }
    }
    return false;
  }

  function intercept(e){
    if(!isFleet(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    hide();
    let n=0;
    const t=setInterval(function(){
      if(renderFleet() || ++n>100){clearInterval(t);if(n>100)show();}
    },25);
  }

  ['pointerdown','mousedown','touchstart','click'].forEach(type=>document.addEventListener(type,intercept,true));

  /* If the application starts directly on #/machines, never allow the old view
     to become the visible first render. */
  function boot(){
    if((location.hash||'').toLowerCase().includes('/machines')){
      hide();
      let n=0;
      const t=setInterval(function(){if(renderFleet()||++n>120){clearInterval(t);if(n>120)show();}},25);
    }
  }
  window.addEventListener('hashchange',function(){
    if((location.hash||'').toLowerCase().includes('/machines')){hide();renderFleet();}
  });
  boot();
  window.__kpFleetNavigationGuard=true;
})();
