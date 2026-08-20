/* Kútfő Plusz ERP – Géppark végső render kényszerítő
 * A régi inline Géppark view többé nem kaphatja vissza a vezérlést.
 */
(function(){
  'use strict';
  function fleetIsActive(){
    const active=[...document.querySelectorAll('.nav.active')].some(n=>/Géppark/i.test(n.textContent||''));
    const title=document.querySelector('.top h1');
    return active || !!(title && /Géppark/i.test(title.textContent||''));
  }
  function install(){
    if(window.__fleetForceInstalled) return true;
    if(typeof window.render!=='function' || typeof window.__gfView!=='function') return false;
    const originalRender=window.render;
    window.render=function(){
      if(fleetIsActive()){
        const root=document.getElementById('content')||document.querySelector('.content');
        if(root) root.innerHTML=window.__gfView();
        return;
      }
      return originalRender.apply(this,arguments);
    };
    window.__fleetForceInstalled=true;
    if(fleetIsActive()) window.render();
    return true;
  }
  if(install()) return;
  let n=0;
  const t=setInterval(()=>{ if(install() || ++n>120) clearInterval(t); },50);
})();
