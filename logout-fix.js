/* ERP logout bridge: always uses the single auth controller and forces the UI back to login. */
(function(){
  'use strict';
  function bind(){
    var buttons=document.querySelectorAll('button');
    buttons.forEach(function(btn){
      if((btn.textContent||'').trim()!=='Kilépés' || btn.dataset.logoutFixed==='1') return;
      btn.dataset.logoutFixed='1';
      btn.removeAttribute('onclick');
      btn.addEventListener('click',function(ev){
        ev.preventDefault();
        ev.stopImmediatePropagation();
        try{
          if(window.__kutfoplusAuth && typeof window.__kutfoplusAuth.logout==='function'){
            void window.__kutfoplusAuth.logout();
            return;
          }
        }catch(e){ console.error('ERP logout controller error:',e); }
        try{ localStorage.removeItem('kutfoplusz_supabase_session_v2'); localStorage.removeItem('kutfoplusz_supabase_session_v1'); }catch(e){}
        document.getElementById('erpApp')?.classList.add('auth-hidden');
        document.getElementById('authOverlay')?.classList.remove('auth-hidden');
        location.hash='#/dashboard';
      },true);
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind,{once:true});
  else bind();
  window.addEventListener('load',bind);
  setTimeout(bind,500);
  setTimeout(bind,1500);
})();
