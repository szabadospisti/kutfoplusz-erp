/* ERP emergency boot/render recovery. Keeps the existing app logic intact. */
(function(){
  'use strict';
  function boot(){
    try {
      var content=document.getElementById('content');
      var app=document.getElementById('erpApp');
      if(!content || !app) return;
      if(app.classList.contains('auth-hidden')) return;
      if(typeof window.render==='function'){
        if(!content.children.length || !content.innerHTML.trim()) window.render();
        setTimeout(function(){
          try{
            if(!content.children.length || !content.innerHTML.trim()) window.render();
          }catch(e){ console.error('ERP boot recovery render error:',e); }
        },500);
      }
    }catch(e){ console.error('ERP boot recovery error:',e); }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',boot,{once:false});
  window.addEventListener('load',boot);
  setTimeout(boot,1000);
  setTimeout(boot,2500);
})();
