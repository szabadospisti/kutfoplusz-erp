/* Kútfő Plusz ERP – isolated authentication core v2 */
(function(){
  'use strict';
  if(window.__KP_AUTH_CORE_V2__) return;
  window.__KP_AUTH_CORE_V2__=true;

  var SESSION_KEY='kutfoplusz_supabase_session_v1';
  var cfg=window.SUPABASE_CONFIG||{};
  var SB_URL=String(cfg.url||'').replace(/\/$/,'');
  var SB_KEY=cfg.publishableKey||'';

  function session(){try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}catch(e){return null;}}
  function setSession(x){localStorage.setItem(SESSION_KEY,JSON.stringify(x));}
  function clearSession(){localStorage.removeItem(SESSION_KEY);}
  function headers(token,extra){return Object.assign({'apikey':SB_KEY,'Authorization':'Bearer '+token,'Content-Type':'application/json'},extra||{});}
  function status(msg,error){var el=document.getElementById('authStatus');if(el){el.textContent=msg||'';el.style.color=error===false?'#18733a':'#c0392b';}}
  function showLogin(){var app=document.getElementById('erpApp');var overlay=document.getElementById('authOverlay');if(app)app.classList.add('auth-hidden');if(overlay)overlay.classList.remove('auth-hidden');}

  function renderWhenReady(){
    if(typeof window.render!=='function'){
      setTimeout(renderWhenReady,50);
      return;
    }
    try{
      window.render();
    }catch(e){
      /* A top-level const such as titles may still be initializing. Retry after the current script turn. */
      if(e&&e.name==='ReferenceError'&&/initialization|before initialization/i.test(String(e.message||''))){
        setTimeout(renderWhenReady,50);
        return;
      }
      console.error('[ERP] Initial render:',e);
    }
  }

  function showERP(user){
    var overlay=document.getElementById('authOverlay');var app=document.getElementById('erpApp');
    if(overlay)overlay.classList.add('auth-hidden');
    if(app)app.classList.remove('auth-hidden');
    var el=document.getElementById('cloudStatus');
    if(el)el.textContent='☁️ '+((user&&user.email)||'Supabase');
    setTimeout(renderWhenReady,0);
  }

  async function refresh(){
    var ss=session();if(!ss||!ss.refresh_token)return null;
    try{
      var r=await fetch(SB_URL+'/auth/v1/token?grant_type=refresh_token',{method:'POST',headers:{'apikey':SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({refresh_token:ss.refresh_token})});
      var j=await r.json();
      if(!r.ok)throw new Error(j.error_description||j.msg||j.message||'Session lejárt');
      setSession(j);return j;
    }catch(e){clearSession();return null;}
  }

  async function request(path,options,retry){
    var ss=session();if(!ss||!ss.access_token)throw new Error('Nincs bejelentkezve');
    var opts=Object.assign({},options||{}, {headers:headers(ss.access_token,(options&&options.headers)||{})});
    var r=await fetch(SB_URL+path,opts);
    if(r.status===401&&retry!==false){var next=await refresh();if(next)return request(path,options,false);}
    return r;
  }
  window.KPSupabaseAuth={request:request,session:session,refresh:refresh};

  window.supabaseLogin=async function(e){
    if(e&&e.preventDefault)e.preventDefault();status('Bejelentkezés...',false);
    var email=(document.getElementById('authEmail')&&document.getElementById('authEmail').value||'').trim();
    var password=document.getElementById('authPassword')&&document.getElementById('authPassword').value||'';
    try{
      var r=await fetch(SB_URL+'/auth/v1/token?grant_type=password',{method:'POST',headers:{'apikey':SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:email,password:password})});
      var j=await r.json();if(!r.ok)throw new Error(j.error_description||j.msg||j.message||'Sikertelen bejelentkezés');
      setSession(j);showERP(j.user);
    }catch(err){console.error('[ERP] Login:',err);status(err.message||'Sikertelen bejelentkezés',true);}
  };
  window.__KP_AUTH_LOGIN__=window.supabaseLogin;

  window.supabaseSignup=async function(){
    var email=(document.getElementById('authEmail')&&document.getElementById('authEmail').value||'').trim();
    var password=document.getElementById('authPassword')&&document.getElementById('authPassword').value||'';
    if(!email||password.length<6){status('Adj meg e-mail címet és legalább 6 karakteres jelszót.',true);return;}
    status('Felhasználó létrehozása...',false);
    try{
      var r=await fetch(SB_URL+'/auth/v1/signup',{method:'POST',headers:{'apikey':SB_KEY,'Content-Type':'application/json'},body:JSON.stringify({email:email,password:password})});
      var j=await r.json();if(!r.ok)throw new Error(j.msg||j.message||j.error_description||'Regisztráció sikertelen');
      if(j.access_token){setSession(j);showERP(j.user);}else status('A regisztráció sikerült. Ellenőrizd az e-mail címedet, majd jelentkezz be.',false);
    }catch(err){console.error('[ERP] Signup:',err);status(err.message||'Regisztráció sikertelen',true);}
  };

  window.supabaseLogout=async function(){
    try{var ss=session();if(ss&&ss.access_token)await fetch(SB_URL+'/auth/v1/logout',{method:'POST',headers:headers(ss.access_token)});}catch(e){}
    clearSession();showLogin();status('');location.hash='#/dashboard';
  };

  window.__KP_AUTH_BOOT__=async function(){
    showLogin();
    var ss=session();
    if(!ss||!ss.access_token)return;
    try{
      var active=ss;
      /* If the saved session already contains a user, don't block the ERP on /auth/v1/user. */
      if(!active.user){
        var test=await fetch(SB_URL+'/auth/v1/user',{headers:headers(ss.access_token)});
        if(test.status===401){active=await refresh();if(!active)throw new Error('Session lejárt');}
        else if(test.ok){var user=await test.json();active=Object.assign({},active,{user:user});setSession(active);}
        else if(test.status!==403)throw new Error('Supabase auth HTTP '+test.status);
      }
      if(!active||!active.access_token)throw new Error('Érvénytelen Supabase session');
      showERP((active&&active.user)||{});
    }catch(err){
      console.warn('[ERP] Auth boot:',err);
      var current=session();
      if(!current||!current.access_token){clearSession();showLogin();status('Jelentkezz be újra. '+(err.message||''),true);return;}
      showERP(current.user||{});
    }
  };

  setTimeout(function(){window.__KP_AUTH_BOOT__();},0);
})();
