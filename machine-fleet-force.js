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
  function showFinal(){
    if(!fleetIsActive() || typeof window.__gfView!=='function') return false;
    const root=document.getElementById('content')||document.querySelector('.content');
    if(!root)return false;
    root.innerHTML=window.__gfView();
    return true;
  }
  function install(){
    if(window.__fleetForceInstalled) return true;
    if(typeof window.__gfView!=='function') return false;
    if(typeof window.render==='function'){
      const originalRender=window.render;
      window.render=function(){
        if(fleetIsActive()) return showFinal();
        return originalRender.apply(this,arguments);
      };
    }
    document.addEventListener('click',e=>{
      const nav=e.target.closest&&e.target.closest('.nav');
      if(nav && /Géppark/i.test(nav.textContent||'')) setTimeout(showFinal,0);
    },true);
    const root=document.getElementById('content')||document.querySelector('.content');
    if(root){
      const observer=new MutationObserver(()=>{
        if(!fleetIsActive())return;
        const text=root.textContent||'';
        if(/GÉP\s+TÍPUS|SZERVIZ/i.test(text) && !/ESZKÖZ.*TÍPUS/i.test(text)) showFinal();
      });
      observer.observe(root,{childList:true,subtree:true});
      window.__fleetForceObserver=observer;
    }
    window.__fleetForceInstalled=true;
    setTimeout(showFinal,0);
    return true;
  }
  if(install()) return;
  let n=0;
  const t=setInterval(()=>{ if(install() || ++n>160) clearInterval(t); },50);
})();
