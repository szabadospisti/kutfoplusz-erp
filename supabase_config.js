window.SUPABASE_CONFIG = Object.freeze({
  url: "https://qoxxhsbcptyieyhtdhr.supabase.co",
  publishableKey: "sb_publishable_WYMcBkgdK-Ed5JY_ljJS0g_BB8dH10T"
});

/* Preserve saved worklogs during legacy startup initialization. */
(function preserveSavedWorklogs(){
  const STORE_KEY = "kutfoplusz_erp_v12";
  let previous = null;
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.worklogs) && parsed.worklogs.length) previous = parsed;
    }
  } catch (e) {}
  if (!previous) return;
  const proto = Storage.prototype;
  const originalSetItem = proto.setItem;
  let bootPhase = true;
  proto.setItem = function(key, value){
    if (bootPhase && key === STORE_KEY) {
      try {
        const next = JSON.parse(value);
        if (next && typeof next === "object") {
          next.worklogs = previous.worklogs;
          value = JSON.stringify(next);
        }
      } catch (e) {}
    }
    return originalSetItem.call(this, key, value);
  };
  setTimeout(function(){ bootPhase = false; try { proto.setItem = originalSetItem; } catch (e) {} }, 0);
})();

/* Guaranteed auth bootstrap: this file is loaded directly by index.html. */
(function bootstrapAuth(){
  'use strict';
  const CFG = window.SUPABASE_CONFIG || {};
  const SB_URL = String(CFG.url || '').replace(/\/$/, '');
  const SB_KEY = String(CFG.publishableKey || '');
  const SESSION_KEY = 'kutfoplusz_supabase_session_v2';
  const LEGACY_SESSION_KEY = 'kutfoplusz_supabase_session_v1';
  let busy = false;

  function status(message, error) {
    const el = document.getElementById('authStatus');
    if (el) { el.textContent = message || ''; el.style.color = error ? '#c0392b' : '#18733a'; }
    if (error) console.error('ERP Auth:', message);
  }
  function clearSession(){ localStorage.removeItem(SESSION_KEY); localStorage.removeItem(LEGACY_SESSION_KEY); }
  function readSession(){ try { const raw=localStorage.getItem(SESSION_KEY)||localStorage.getItem(LEGACY_SESSION_KEY); return raw?JSON.parse(raw):null; } catch(e){ clearSession(); return null; } }
  function saveSession(s){ if(s?.access_token){ localStorage.setItem(SESSION_KEY, JSON.stringify(s)); localStorage.removeItem(LEGACY_SESSION_KEY); } }
  async function request(path, options){
    const o=options||{};
    const headers=Object.assign({apikey:SB_KEY},o.headers||{});
    if(o.body&&!headers['Content-Type']) headers['Content-Type']='application/json';
    const c=new AbortController(); const t=setTimeout(()=>c.abort(),15000);
    try{
      const r=await fetch(SB_URL+path,Object.assign({},o,{headers,signal:c.signal}));
      const d=await r.json().catch(()=>({}));
      if(!r.ok){ const e=new Error(d.error_description||d.msg||d.message||d.error||('Supabase Auth hiba ('+r.status+')')); e.status=r.status; throw e; }
      return d;
    } finally { clearTimeout(t); }
  }
  function enter(user){
    try{
      if(typeof window.enterERP==='function'){ window.enterERP(user); return; }
      document.getElementById('authOverlay')?.classList.add('auth-hidden');
      document.getElementById('erpApp')?.classList.remove('auth-hidden');
      if(typeof window.render==='function') window.render();
    }catch(e){ console.error('ERP megnyitási hiba:',e); status('A belépés sikerült, de az ERP megnyitása hibázott: '+e.message,true); }
  }
  async function cloud(){
    try{ if(typeof window.supabaseCloudLoadOrMigrate==='function') await window.supabaseCloudLoadOrMigrate(); if(typeof window.render==='function') window.render(); }
    catch(e){ console.warn('Felhőszinkron hiba belépés után:',e); }
  }
  async function login(){
    if(busy) return false; busy=true;
    const email=(document.getElementById('authEmail')?.value||'').trim();
    const password=document.getElementById('authPassword')?.value||'';
    if(!email||!password){ status('Add meg az e-mail címet és a jelszót.',true); busy=false; return false; }
    status('Bejelentkezés...');
    try{
      const d=await request('/auth/v1/token?grant_type=password',{method:'POST',body:JSON.stringify({email,password})});
      if(!d.access_token||!d.user) throw new Error('A Supabase nem adott érvényes sessiont.');
      saveSession(d);
      /* Compatibility for the legacy ERP cloud layer. */
      window.sbSession=d;
      window.sbSetSession=function(s){ saveSession(s); window.sbSession=s; };
      enter(d.user); status(''); void cloud();
    }catch(e){ status(e.name==='AbortError'?'A bejelentkezés időtúllépés miatt megszakadt.':(e.message||'Sikertelen bejelentkezés.'),true); }
    finally{ busy=false; }
    return false;
  }
  async function signup(){
    const email=(document.getElementById('authEmail')?.value||'').trim(); const password=document.getElementById('authPassword')?.value||'';
    if(!email||password.length<8){ status('Adj meg e-mail címet és legalább 8 karakteres jelszót.',true); return false; }
    status('Felhasználó létrehozása...');
    try{ const d=await request('/auth/v1/signup',{method:'POST',body:JSON.stringify({email,password})}); if(d.access_token&&d.user){saveSession(d);enter(d.user);void cloud();}else status('A regisztráció sikerült. Ellenőrizd az e-mail címedet, majd jelentkezz be.'); }
    catch(e){ status(e.message||'Regisztráció sikertelen.',true); }
    return false;
  }
  async function recover(){
    const email=(document.getElementById('authEmail')?.value||'').trim(); if(!email){status('Először add meg az e-mail címedet.',true);return;}
    status('Jelszó-visszaállító e-mail küldése...');
    try{ await request('/auth/v1/recover',{method:'POST',body:JSON.stringify({email,redirect_to:window.location.origin+window.location.pathname})}); status('Ha az e-mailhez tartozik ERP-fiók, elküldtük a visszaállító e-mailt.'); }
    catch(e){status(e.message||'Nem sikerült elküldeni a visszaállító e-mailt.',true);}
  }
  function bind(){
    const form=document.getElementById('authForm'); if(!form){ console.error('ERP Auth: authForm nem található'); return; }
    window.supabaseLogin=function(e){ if(e)e.preventDefault(); void login(); return false; };
    window.supabaseSignup=function(){ void signup(); return false; };
    window.sbSetSession=function(s){ saveSession(s); window.sbSession=s; };
    form.onsubmit=window.supabaseLogin;
    const submit=form.querySelector('button[type="submit"]'); if(submit) submit.onclick=function(e){e.preventDefault();void login();return false;};
    const signupBtn=Array.from(form.querySelectorAll('button')).find(b=>/Új felhasználó/i.test(b.textContent||'')); if(signupBtn) signupBtn.onclick=function(e){e.preventDefault();void signup();return false;};
    let forgot=document.getElementById('forgotPasswordBtn'); if(!forgot){ const w=document.createElement('div'); w.style.cssText='text-align:center;margin-top:12px'; w.innerHTML='<button id="forgotPasswordBtn" type="button" style="border:0;background:none;color:#1d4ed8;cursor:pointer;font-weight:700">Elfelejtettem a jelszavam</button>'; form.appendChild(w); forgot=w.firstElementChild; } forgot.onclick=recover;
    const stored=readSession(); if(stored?.access_token&&stored?.user){ saveSession(stored); window.sbSession=stored; enter(stored.user); void cloud(); }
  }
  if(!SB_URL||!SB_KEY){ console.error('ERP Auth: hiányzik a Supabase konfiguráció'); return; }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',bind,{once:true}); else bind();
})();
