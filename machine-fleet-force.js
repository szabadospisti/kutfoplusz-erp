/* Kútfő Plusz ERP – Géppark végső render kényszerítő
 * Egyetlen cél: amikor current === 'machines', a régi inline view ne tudjon visszajönni.
 */
(function(){
  'use strict';
  function install(){
    if(window.__fleetForceInstalled) return true;
    if(typeof window.render!=='function' || typeof window.__gfView!=='function') return false;
    const originalRender=window.render;
    window.render=function(){
      if(typeof window.current!=='undefined' && window.current==='machines'){
        const root=document.getElementById('content')||document.querySelector('.content');
        if(root) root.innerHTML=window.__gfView();
        return;
      }
      return originalRender.apply(this,arguments);
    };
    window.__fleetForceInstalled=true;
    if(typeof window.current!=='undefined' && window.current==='machines') window.render();
    return true;
  }
  if(install()) return;
  let n=0;
  const t=setInterval(()=>{ if(install() || ++n>120) clearInterval(t); },50);
})();
