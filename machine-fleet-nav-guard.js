/* Géppark navigációs guard – minden navigációs útvonalat elfog, mielőtt a régi Géppark renderelne. */
(function(){
  'use strict';

  function fleetTarget(el){
    if(!el) return false;
    const n=el.closest?.('.nav,button,a,[role="button"]') || el;
    const view=(n.dataset?.view||n.dataset?.page||n.dataset?.target||n.getAttribute?.('data-view')||n.getAttribute?.('data-page')||n.getAttribute?.('href')||'').toString().toLowerCase();
    const text=(n.textContent||'').trim().toLowerCase();
    return view.includes('machines') || view.includes('machine') || view.includes('geppark') || view.includes('géppark') || text.includes('géppark');
  }

  function renderFleet(){
    window.current='machines';
    if(typeof window.__kpFleetRender==='function') return window.__kpFleetRender();
    if(typeof window.render==='function') return window.render();
  }

  document.addEventListener('click',function(e){
    if(!fleetTarget(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    renderFleet();
  },true);

  document.addEventListener('pointerup',function(e){
    if(!fleetTarget(e.target)) return;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  },true);

  window.__kpFleetNavigationGuard=true;
})();
