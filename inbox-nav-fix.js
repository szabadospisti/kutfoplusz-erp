/* Beérkező dokumentumok menü – stabil UI bekötés */
(function(){
  function install(){
    const nav=document.getElementById('nav');
    if(!nav) return false;
    if(nav.querySelector('[data-page="inbox"]')) return true;
    const b=document.createElement('button');
    b.type='button';
    b.className='nav';
    b.dataset.page='inbox';
    b.innerHTML='<i>📥</i>Beérkező dokumentumok';
    b.addEventListener('click',function(){
      if(typeof window.openInbox==='function') window.openInbox();
      else location.hash='#/inbox';
    });
    nav.appendChild(b);
    return true;
  }
  function boot(){
    install();
    const observer=new MutationObserver(function(){install()});
    observer.observe(document.body,{childList:true,subtree:true});
    setInterval(install,1000);
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot); else boot();
})();
