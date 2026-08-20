/* Kútfő Plusz ERP – Géppark navigation guard.
 * A régi machines view nem kaphat látható render-lehetőséget.
 * Az egyetlen elsődleges Géppark renderer a window.views.machines / __kpFleetRender.
 */
(function(){
  'use strict';

  function isFleet(el){
    if(!el) return false;
    const n=el.closest?.('.nav,button,a,[role="button"]')||el;
    const ds=n.dataset||{};
    const raw=[ds.page,ds.view,ds.target,n.getAttribute?.('data-page'),n.getAttribute?.('data-view'),n.getAttribute?.('href'),n.textContent].filter(Boolean).join(' ').toLowerCase();
    return raw.includes('machines')||raw.includes('geppark')||raw.includes('géppark');
  }
  function hide(){document.documentElement.classList.add('fleet-boot-pending');}
  function show(){document.documentElement.classList.remove('fleet-boot-pending');}

  function renderFleet(){
    hide();
    if(typeof window.__kpFleetRender==='function'){
      window.__kpFleetRender(); show(); return true;
    }
    if(window.views && typeof window.views.machines==='function'){
      const r=document.getElementById('content')||document.querySelector('.content');
      if(!r)return false;
      r.innerHTML=window.views.machines(); show(); return true;
    }
    return false;
  }

  function intercept(e){
    if(!isFleet(e.target))return;
    e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation(); hide();
    let n=0;
    const t=setInterval(function(){
      if(renderFleet()||++n>120){clearInterval(t);if(n>120)show();}
    },25);
  }
  ['pointerdown','mousedown','touchstart','click'].forEach(type=>document.addEventListener(type,intercept,true));

  function boot(){
    if((location.hash||'').toLowerCase().includes('/machines')){
      hide(); let n=0;
      const t=setInterval(function(){if(renderFleet()||++n>120){clearInterval(t);if(n>120)show();}},25);
    }
  }
  window.addEventListener('hashchange',function(){
    if((location.hash||'').toLowerCase().includes('/machines')){hide();renderFleet();}
  });
  boot();
  window.__kpFleetNavigationGuard=true;
})();
