/* Kútfő Plusz ERP - stable Supabase password login
   Loads after the main ERP script and replaces the fragile login sequence.
*/
(function () {
  'use strict';

  const SB_URL = 'https://qoxxhsbcptyieyhtdhrw.supabase.co';
  const SB_KEY = 'sb_publishable_WYMcBkgdK-Ed5JY_ljJS0g_BB8dH10T';
  const SESSION_KEY = 'kutfoplusz_supabase_session_v1';

  function status(message, isError) {
    const el = document.getElementById('authStatus');
    if (el) {
      el.textContent = message || '';
      el.style.color = isError ? '#c0392b' : '#18733a';
    }
  }

  function saveSession(session) {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  }

  window.supabaseLogin = async function (event) {
    if (event) event.preventDefault();

    const emailEl = document.getElementById('authEmail');
    const passwordEl = document.getElementById('authPassword');
    const email = (emailEl?.value || '').trim();
    const password = passwordEl?.value || '';

    if (!email || !password) {
      status('Add meg az e-mail címet és a jelszót.');
      return false;
    }

    status('Bejelentkezés...', false);

    try {
      const response = await fetch(
        SB_URL + '/auth/v1/token?grant_type=password',
        {
          method: 'POST',
          headers: {
            apikey: SB_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ email, password })
        }
      );

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.access_token) {
        throw new Error(
          data.error_description || data.msg || data.message || 'Sikertelen bejelentkezés'
        );
      }

      // The authentication itself has succeeded. Store the session and open ERP NOW.
      saveSession(data);

      if (typeof window.enterERP === 'function') {
        window.enterERP(data.user);
      } else {
        document.getElementById('authOverlay')?.classList.add('auth-hidden');
        document.getElementById('erpApp')?.classList.remove('auth-hidden');
        const who = document.getElementById('cloudStatus');
        if (who) who.textContent = '☁️ ' + (data.user?.email || 'Supabase');
        if (typeof window.render === 'function') window.render();
      }

      status('', false);

      // Cloud loading must NEVER block login.
      if (typeof window.supabaseCloudLoadOrMigrate === 'function') {
        try {
          await window.supabaseCloudLoadOrMigrate();
          if (typeof window.render === 'function') window.render();
        } catch (cloudError) {
          console.error('Supabase adatbetöltési hiba belépés után:', cloudError);
          const cloudStatus = document.getElementById('cloudStatus');
          if (cloudStatus) cloudStatus.textContent = '⚠️ Felhőadat betöltési hiba';
        }
      }
    } catch (error) {
      console.error('Supabase login error:', error);
      status(error?.message || 'Sikertelen bejelentkezés', true);
    }

    return false;
  };

  // Also intercept the login form directly so an older inline handler cannot win.
  function bind() {
    const form = document.getElementById('authForm');
    if (!form || form.dataset.stableAuthBound === '1') return;
    form.dataset.stableAuthBound = '1';
    form.addEventListener('submit', function (event) {
      event.preventDefault();
      window.supabaseLogin(event);
    }, true);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
