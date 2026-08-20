/* Kútfő Plusz ERP – központi Auth transport bridge.
   A régi sbFetch hívásokat a központi KPSupabaseAuth rétegen vezeti át.
*/
(function(){
  'use strict';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  async function ensureAuth(){
    if(window.KPSupabaseAuth)return window.KPSupabaseAuth;
    const s=document.createElement('script');
    s.src='supabase-auth-core.js?v=1';
    await new Promise((resolve,reject)=>{s.onload=resolve;s.onerror=reject;document.head.appendChild(s);});
    if(!window.KPSupabaseAuth)throw new Error('Központi Supabase Auth modul nem töltődött be.');
    return window.KPSupabaseAuth;
  }

  function restPath(path){
    const value=String(path||'');
    const marker='/rest/v1/';
    const i=value.indexOf(marker);
    return i>=0?value.slice(i+marker.length):value.replace(/^\/?rest\/v1\//,'');
  }

  async function install(){
    const auth=await ensureAuth();
    for(let i=0;i<200;i++){
      if(typeof window.sbFetch==='function'&&!window.__KP_SB_FETCH_CENTRAL__){
        const legacy=window.sbFetch;
        window.sbFetch=async function(path,options){
          const raw=String(path||'');
          if(raw.includes('/auth/v1/user')) return auth.user();
          if(raw.includes('/rest/v1/')) return auth.request(restPath(raw),options);
          return legacy.apply(this,arguments);
        };
        window.__KP_SB_FETCH_CENTRAL__=true;
        console.info('Supabase központi Auth transport aktív');
        return;
      }
      await sleep(100);
    }
    console.warn('Supabase Auth bridge: sbFetch nem jelent meg.');
  }

  install().catch(e=>console.error('Supabase Auth bridge:',e));
})();
