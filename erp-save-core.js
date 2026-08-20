/* Kútfő Plusz ERP – egyetlen központi mentési útvonal.
 * Minden modul ugyanazt a window.save() függvényt hívja.
 * A save() csak sikeres Supabase erp_state mentés után teljesül.
 */
(function(){
  'use strict';
  if(window.__KP_SAVE_CORE__) return;
  function install(){
    if(typeof window.supabaseCloudSave!=='function' || typeof window.localSaveOnly!=='function' && typeof window.db==='undefined') return false;
    var previous=window.save;
    window.save=async function(){
      if(typeof window.db!=='undefined'){
        try{localStorage.setItem('kutfoplusz_erp_v12',JSON.stringify(window.db));}catch(e){}
      }
      if(typeof window.supabaseCloudSave!=='function') throw new Error('A központi Supabase mentés nem érhető el.');
      await window.supabaseCloudSave();
      if(typeof window.setCloudStatus==='function')window.setCloudStatus('☁️ Mentve');
      return true;
    };
    window.__KP_SAVE_CORE__=true;
    console.info('[ERP] Central save core active; save() awaits erp_state');
    return true;
  }
  var n=0,t=setInterval(function(){if(install()||++n>200)clearInterval(t)},50);
  install();
})();
