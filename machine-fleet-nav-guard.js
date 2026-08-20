/* Géppark navigációs guard – a régi Géppark render soha nem futhat le. */
(function(){
  'use strict';

  function fleetTarget(el){
    if(!el) return false;
    const n=el.closest?.('.nav,button,a,[role="button"]') || el;
    const view=(n.dataset?.view||n.dataset?.page||n.dataset?.target||n.getAttribute?.('data-view')||n.getAttribute?.('data-page')||n.getAttribute?.('href')||'').toString().toLowerCase();
    const text=(n.textContent||'').trim().toLowerCase();
    return view.includes('machines') || view.includes('machine') || view.includes('geppark') || view.includes('géppark') || text.includes('géppark');
  }

  function blockPaint(){
    document.documentElement.classList.add('fleet-navigation-pending');
  }

  function renderFleet(){
    window.current='machines';
    blockPaint();
    if(typeof window.__kpFleetRender==='function'){
      window.__kpFleetRender();
      document.documentElement.classList.remove('fleet-navigation-pending','fleet-boot-pending');
      return true;
    }
    return false;
  }

  function intercept(e){
    if(!fleetTarget(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    blockPaint();
    if(!renderFleet()){
      let n=0;
      const timer=setInterval(function(){
        if(renderFleet() || ++n>100) clearInterval(timer);
      },25);
    }
  }

  /* Capture at window level and on the earliest pointer/touch events. */
  ['pointerdown','mousedown','touchstart','click'].forEach(type=>{
    window.addEventListener(type,intercept,true);
  });

  const style=document.createElement('style');
  style.id='fleet-navigation-guard-css';
  style.textContent='.fleet-navigation-pending .content{visibility:hidden!important}.fleet-navigation-pending #content{visibility:hidden!important}';
  (document.head||document.documentElement).appendChild(style);

  window.__kpFleetNavigationGuard=true;
})();
