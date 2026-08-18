/* Final auth form bridge. The implementation lives only in supabase_config.js. */
(function(){
  function bind(){
    const api=window.__kutfoplusAuth;
    const form=document.getElementById('authForm');
    if(!api||!form){ console.error('ERP Auth bridge: auth controller or form missing'); return; }
    form.removeAttribute('onsubmit');
    form.onsubmit=function(e){e.preventDefault();void api.login();return false;};
    const submit=form.querySelector('button[type="submit"]');
    if(submit){submit.removeAttribute('onclick');submit.onclick=function(e){e.preventDefault();void api.login();return false;};}
    const signup=Array.from(form.querySelectorAll('button')).find(b=>/Új felhasználó/i.test(b.textContent||''));
    if(signup){signup.removeAttribute('onclick');signup.onclick=function(e){e.preventDefault();void api.signup();return false;};}
    let forgot=document.getElementById('forgotPasswordBtn');
    if(!forgot){const w=document.createElement('div');w.style.cssText='text-align:center;margin-top:12px';w.innerHTML='<button id="forgotPasswordBtn" type="button" style="border:0;background:none;color:#1d4ed8;cursor:pointer;font-weight:700">Elfelejtettem a jelszavam</button>';form.appendChild(w);forgot=w.firstElementChild;}
    forgot.onclick=function(){void api.recover();};
    window.supabaseLogin=function(e){if(e)e.preventDefault();void api.login();return false;};
    window.supabaseSignup=function(){void api.signup();return false;};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',bind,{once:true});else bind();
})();
