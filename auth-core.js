/* Kútfő Plusz ERP – isolated authentication core.
 * Login must remain available even if an optional ERP/module script has a syntax error.
 * The relational bridge owns ERP data; erp_state is no longer loaded during authentication.
 */
(function(){
  'use strict';
  if(window.__KP_AUTH_CORE__) return;
  window.__KP_AUTH_CORE__=true;

  const SESSION_KEY='kutfoplusz_supabase_session_v1';
  const cfg=window.SUPABASE_CONFIG||{};
  const SB_URL=String(cfg.url||'').replace(/\/$/,'');
  const SB_KEY=cfg.publishableKey||'';

  function session(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null')}catch(e){return null}}
  function setSession(x){localStorage.setItem(SESSION_KEY,JSON.stringify(x))}
  function clearSession(){localStorage.removeItem(SESSION_KEY)}
  function headers(token,extra){return Object.assign({'apikey':SB_KEY,'Authorization':'Bearer '+token,'Content-Type':'application/json'},extra||{})}
  function status(msg,error){const el=document.getElementById('authStatus');if(el){el.textContent=msg||'';el.style.color=error===false?'#18733a':'#c0392b'}}
  function showLogin(){document.getElementById('erpApp')?.classList.add('auth-hidden');document.getElementById('authOverlay')?.classList.remove('auth-hidden')}
  function showERP(user){document.getElementById('authOverlay')?.classList.add('auth-hidden');document.getElementById('erpApp')?.classList.remove('auth-hidden');const el=document.getElementById('cloudStatus');if(el)el.textContent='☁️ '+(user?.email||'Supabase');if(typeof window.render==='function')window.render()}

  async function refresh(){
    const ss=session();if(!ss?.refresh_token)return null;
    try{const r=await fetch(SB_URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{'apikey':SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:ss.refresh_token})});const j=await r.json();if(!r.ok)throw new Error(j.error_description||j.msg||j.message||'Session lejárt');setSession(j);return j;}catch(e){clearSession();return null}
  }

  async function request(path,options,retry){
    let ss=session();if(!ss?.access_token)throw new Error('Nincs bejelentkezve');
    const opts=Object.assign({},options||{},{headers:headers(ss.access_token,(options&&options.headers)||{})});
    let r=await fetch(SB_URL+path,opts);
    if(r.status===401&&retry!==false){ss=await refresh();if(ss)return request(path,options,false)}
    return r;
  }
  window.KPSupabaseAuth={request,session,refresh};

  window.supabaseLogin=async function(e){
    if(e&&e.preventDefault)e.preventDefault();status('Bejelentkezés...',false);
    const email=(document.getElementById('authEmail')?.value||'').trim();const password=document.getElementById('authPassword')?.value||'';
    try{const r=await fetch(SB_URL+'/auth/v1/token?grant_type=password',{method:'POST',headers:{'apikey':SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});const j=await r.json();if(!r.ok)throw new Error(j.error_description||j.msg||j.message||'Sikertelen bejelentkezés');setSession(j);showERP(j.user);}catch(err){console.error('[ERP] Login:',err);status(err.message||'Sikertelen bejelentkezés',true)}
  };
  window.__KP_AUTH_LOGIN__=window.supabaseLogin;

  window.supabaseSignup=async function(){
    const email=(document.getElementById('authEmail')?.value||'').trim();const password=document.getElementById('authPassword')?.value||'';
    if(!email||password.length<6){status('Adj meg e-mail címet és legalább 6 karakteres jelszót.',true);return}
    status('Felhasználó létrehozása...',false);
    try{const r=await fetch(SB_URL+'/auth/v1/signup',{method:'POST',headers:{'apikey':SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({email,password})});const j=await r.json();if(!r.ok)throw new Error(j.msg||j.message||j.error_description||'Regisztráció sikertelen');if(j.access_token){setSession(j);showERP(j.user)}else status('A regisztráció sikerült. Ellenőrizd az e-mail címedet, majd jelentkezz be.',false);}catch(err){console.error('[ERP] Signup:',err);status(err.message||'Regisztráció sikertelen',true)}
  };

  window.supabaseLogout=async function(){
    try{const ss=session();if(ss?.access_token)await fetch(SB_URL+'/auth/v1/logout',{method:'POST',headers:headers(ss.access_token)})}catch(e){}
    clearSession();showLogin();status('');location.hash='#/dashboard';
  };

  window.__KP_AUTH_BOOT__=async function(){
    showLogin();const ss=session();if(!ss?.access_token)return;
    try{
      let active=ss;const test=await fetch(SB_URL+'/auth/v1/user',{headers:headers(ss.access_token)});
      if(test.status===401){active=await refresh();if(!active)throw new Error('Session lejárt')}
      else if(test.status===403){active=ss}
      else if(test.ok){const user=await test.json();active=Object.assign({},active,{user});setSession(active)}
      if(!active?.user)throw new Error('Érvénytelen Supabase session');
      showERP(active.user);
    }catch(err){
      console.warn('[ERP] Auth boot:',err);
      if(!session()?.access_token){clearSession();showLogin();status('Jelentkezz be újra. '+(err.message||''),true);return}
      showERP(session().user||{});
    }
  };

  setTimeout(()=>window.__KP_AUTH_BOOT__(),0);
})();
