/* Kútfő Plusz ERP – UI boot guard
 * Nem helyettesíti a normál indulást. Csak akkor avatkozik be,
 * ha a bejelentkezett felület fejlécben már látszik, de a #content
 * üres maradt. Ilyenkor újrahívja a meglévő központi render/nav útvonalat.
 */
(function(){
  'use strict';
  if(window.__KP_UI_BOOT_GUARD__) return;
  window.__KP_UI_BOOT_GUARD__=true;

  function recover(){
    const app=document.getElementById('erpApp');
    const content=document.getElementById('content');
    if(!app||!content) return false;
    if(app.classList.contains('auth-hidden')) return false;

    const text=(content.textContent||'').trim();
    if(text.length>0) return true;

    try{
      if(typeof window.nav==='function'){
        window.nav('dashboard');
        return true;
      }
      if(typeof window.render==='function'){
        window.render();
        return true;
      }
    }catch(e){
      console.error('[ERP] UI boot recovery failed:',e);
      content.innerHTML='<div class="notice">🔴 Az ERP felület betöltése hibába ütközött.<br><small>'+String(e.message||e)+'</small></div>';
    }
    return false;
  }

  let tries=0;
  const timer=setInterval(function(){
    if(recover() || ++tries>120) clearInterval(timer);
  },250);

  if(document.readyState==='loading'){
    document.addEventListener('DOMContentLoaded',recover,{once:true});
  }else{
    setTimeout(recover,100);
  }
})();
