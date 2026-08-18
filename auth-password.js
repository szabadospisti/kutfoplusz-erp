/* Kútfő Plusz ERP – biztonságos jelszó-visszaállítás */
(function(){
  const cfg=window.SUPABASE_CONFIG||{};
  const URL=(cfg.url||'').replace(/\/$/,'');
  const KEY=cfg.publishableKey||'';
  function status(msg,ok){const el=document.getElementById('authStatus');if(el){el.textContent=msg;el.style.color=ok?'#18733a':'#c0392b';}}
  function redirect(){return window.location.origin+window.location.pathname;}
  async function requestReset(){
    const email=(document.getElementById('authEmail')?.value||'').trim();
    if(!email){status('Először add meg az e-mail címedet.');return;}
    status('Jelszó-visszaállító e-mail küldése...',true);
    try{
      const r=await fetch(URL+'/auth/v1/recover',{method:'POST',headers:{apikey:KEY,'Content-Type':'application/json'},body:JSON.stringify({email,redirect_to:redirect()})});
      if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.msg||j.message||'Nem sikerült elküldeni az e-mailt.');}
      status('Ha ehhez az e-mailhez tartozik ERP-fiók, elküldtük a jelszó-visszaállító e-mailt. Ellenőrizd a postafiókot és a spam mappát.',true);
    }catch(e){status(e.message||'Hiba történt.');}
  }
  function resetModal(){
    if(document.getElementById('passwordResetModal'))return;
    const d=document.createElement('div');d.id='passwordResetModal';d.className='auth-overlay';
    d.innerHTML='<div class="auth-card"><div class="auth-brand"><div class="auth-mark">K+</div><div><strong style="font-size:20px;color:#182433">Kútfő Plusz</strong><div style="color:#7a8794">Jelszó létrehozása</div></div></div><h2>Új jelszó</h2><p>Adj meg egy új jelszót az ERP-fiókodhoz.</p><div class="auth-field"><label>Új jelszó</label><input id="newPassword1" type="password" minlength="6" autocomplete="new-password"></div><div class="auth-field"><label>Új jelszó ismét</label><input id="newPassword2" type="password" minlength="6" autocomplete="new-password"></div><div class="auth-actions"><button class="btn" id="setNewPasswordBtn" type="button">Új jelszó mentése</button></div><div id="resetStatus" class="auth-status"></div></div>';
    document.body.appendChild(d);
    document.getElementById('setNewPasswordBtn').onclick=async function(){
      const p1=document.getElementById('newPassword1').value,p2=document.getElementById('newPassword2').value,st=document.getElementById('resetStatus');
      if(p1.length<6){st.textContent='A jelszó legalább 6 karakter legyen.';return;}
      if(p1!==p2){st.textContent='A két jelszó nem egyezik.';return;}
      const token=new URLSearchParams(location.hash.slice(1)).get('access_token');
      if(!token){st.textContent='A visszaállító link már nem érvényes. Kérj új e-mailt.';return;}
      st.textContent='Jelszó mentése...';
      try{
        const r=await fetch(URL+'/auth/v1/user',{method:'PUT',headers:{apikey:KEY,Authorization:'Bearer '+token,'Content-Type':'application/json'},body:JSON.stringify({password:p1})});
        if(!r.ok){const j=await r.json().catch(()=>({}));throw new Error(j.msg||j.message||j.error_description||'Nem sikerült a jelszó mentése.');}
        st.style.color='#18733a';st.textContent='Az új jelszó sikeresen létrejött. Most már be tudsz lépni az ERP-be.';
        setTimeout(()=>{d.remove();history.replaceState(null,'',location.pathname+location.search);location.reload();},1200);
      }catch(e){st.style.color='#c0392b';st.textContent=e.message||'Hiba történt.';}
    };
  }
  function init(){
    const form=document.getElementById('authForm');
    if(form&&!document.getElementById('forgotPasswordBtn')){
      const wrap=document.createElement('div');wrap.style.cssText='text-align:center;margin-top:12px';
      wrap.innerHTML='<button id="forgotPasswordBtn" type="button" style="border:0;background:none;color:#1d4ed8;cursor:pointer;font-weight:700">Elfelejtettem a jelszavam</button>';
      form.appendChild(wrap);document.getElementById('forgotPasswordBtn').onclick=requestReset;
    }
    const hash=new URLSearchParams(location.hash.slice(1));if(hash.get('type')==='recovery'&&hash.get('access_token'))resetModal();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init);else init();
})();