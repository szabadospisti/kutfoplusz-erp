/* Kútfő Plusz ERP — single Supabase Auth controller */
(function () {
  'use strict';

  const CFG = window.SUPABASE_CONFIG || {};
  const SB_URL = String(CFG.url || '').replace(/\/$/, '');
  const SB_KEY = String(CFG.publishableKey || '');
  const SESSION_KEY = 'kutfoplusz_supabase_session_v2';
  const LEGACY_SESSION_KEY = 'kutfoplusz_supabase_session_v1';

  function status(message, isError) {
    const el = document.getElementById('authStatus');
    if (!el) return;
    el.textContent = message || '';
    el.style.color = isError ? '#c0392b' : '#18733a';
  }

  if (!SB_URL || !SB_KEY) {
    console.error('Supabase Auth: hiányzik a Supabase konfiguráció.', { hasUrl: !!SB_URL, hasKey: !!SB_KEY });
    status('Hiányzik a Supabase konfiguráció.', true);
    return;
  }

  let authBusy = false;

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LEGACY_SESSION_KEY);
  }

  function readSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY) || localStorage.getItem(LEGACY_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (_) {
      clearSession();
      return null;
    }
  }

  function saveSession(session) {
    if (!session || !session.access_token) return;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.removeItem(LEGACY_SESSION_KEY);
  }

  async function authRequest(path, options) {
    const opts = options || {};
    const headers = Object.assign({ apikey: SB_KEY }, opts.headers || {});
    if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(SB_URL + path, Object.assign({}, opts, { headers, signal: controller.signal }));
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        const error = new Error(data.error_description || data.msg || data.message || data.error || ('Supabase Auth hiba (' + response.status + ')'));
        error.status = response.status;
        throw error;
      }
      return data;
    } finally {
      clearTimeout(timer);
    }
  }

  async function refreshSession(session) {
    if (!session?.refresh_token) return null;
    try {
      const data = await authRequest('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: session.refresh_token })
      });
      if (data.access_token) saveSession(data);
      return data;
    } catch (error) {
      console.warn('Supabase session refresh failed:', error);
      clearSession();
      return null;
    }
  }

  async function ensureFreshSession(session) {
    if (!session?.access_token) return null;
    const expiresAt = Number(session.expires_at || 0) * 1000;
    if (expiresAt && expiresAt < Date.now() + 60 * 1000) return refreshSession(session);
    return session;
  }

  function enterERP(user) {
    if (typeof window.enterERP === 'function') {
      window.enterERP(user);
      return;
    }
    document.getElementById('authOverlay')?.classList.add('auth-hidden');
    document.getElementById('erpApp')?.classList.remove('auth-hidden');
    const cloud = document.getElementById('cloudStatus');
    if (cloud) cloud.textContent = '☁️ ' + (user?.email || 'Supabase');
    if (typeof window.render === 'function') window.render();
  }

  async function loadCloudAfterLogin() {
    if (typeof window.supabaseCloudLoadOrMigrate !== 'function') return;
    try {
      await window.supabaseCloudLoadOrMigrate();
      if (typeof window.render === 'function') window.render();
      const cloud = document.getElementById('cloudStatus');
      if (cloud) cloud.textContent = '☁️ Mentve';
    } catch (error) {
      console.error('Supabase adatbetöltési hiba belépés után:', error);
      const cloud = document.getElementById('cloudStatus');
      if (cloud) cloud.textContent = '⚠️ Felhőadat betöltési hiba';
    }
  }

  async function login() {
    if (authBusy) return false;
    authBusy = true;
    const emailEl = document.getElementById('authEmail');
    const passwordEl = document.getElementById('authPassword');
    const email = (emailEl?.value || '').trim();
    const password = passwordEl?.value || '';

    if (!email || !password) {
      status('Add meg az e-mail címet és a jelszót.', true);
      authBusy = false;
      return false;
    }

    status('Bejelentkezés...', false);
    try {
      const data = await authRequest('/auth/v1/token?grant_type=password', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (!data.access_token || !data.user) throw new Error('A hitelesítés nem adott érvényes sessiont.');
      saveSession(data);
      enterERP(data.user);
      status('', false);
      void loadCloudAfterLogin();
    } catch (error) {
      console.error('Supabase login error:', error);
      status(error?.name === 'AbortError' ? 'A bejelentkezés időtúllépés miatt megszakadt.' : (error?.message || 'Sikertelen bejelentkezés.'), true);
    } finally {
      authBusy = false;
    }
    return false;
  }

  async function signup() {
    const email = (document.getElementById('authEmail')?.value || '').trim();
    const password = document.getElementById('authPassword')?.value || '';
    if (!email || password.length < 8) {
      status('Adj meg e-mail címet és legalább 8 karakteres jelszót.', true);
      return false;
    }
    status('Felhasználó létrehozása...', false);
    try {
      const data = await authRequest('/auth/v1/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      if (data.access_token && data.user) {
        saveSession(data);
        enterERP(data.user);
        void loadCloudAfterLogin();
      } else {
        status('A regisztráció sikerült. Ellenőrizd az e-mail címedet, majd jelentkezz be.', false);
      }
    } catch (error) {
      status(error?.message || 'Regisztráció sikertelen.', true);
    }
    return false;
  }

  async function requestReset() {
    const email = (document.getElementById('authEmail')?.value || '').trim();
    if (!email) {
      status('Először add meg az e-mail címedet.', true);
      return;
    }
    status('Jelszó-visszaállító e-mail küldése...', false);
    try {
      const redirectTo = window.location.origin + window.location.pathname;
      await authRequest('/auth/v1/recover', {
        method: 'POST',
        body: JSON.stringify({ email, redirect_to: redirectTo })
      });
      status('Ha az e-mailhez tartozik ERP-fiók, elküldtük a visszaállító e-mailt.', false);
    } catch (error) {
      status(error?.message || 'Nem sikerült elküldeni a visszaállító e-mailt.', true);
    }
  }

  function bind() {
    const form = document.getElementById('authForm');
    if (!form) {
      console.error('Supabase Auth: #authForm nem található.');
      return;
    }

    /* Explicitly replace the legacy inline onsubmit handler. */
    form.removeAttribute('onsubmit');
    form.onsubmit = function (event) {
      event.preventDefault();
      void login();
      return false;
    };

    const submit = form.querySelector('button[type="submit"]');
    if (submit) {
      submit.onclick = function (event) {
        event.preventDefault();
        void login();
        return false;
      };
    }

    const buttons = Array.from(form.querySelectorAll('button'));
    const signupButton = buttons.find((button) => /Új felhasználó/i.test(button.textContent || ''));
    if (signupButton) {
      signupButton.removeAttribute('onclick');
      signupButton.onclick = function (event) {
        event.preventDefault();
        void signup();
        return false;
      };
    }

    let forgot = document.getElementById('forgotPasswordBtn');
    if (!forgot) {
      const wrap = document.createElement('div');
      wrap.style.cssText = 'text-align:center;margin-top:12px';
      wrap.innerHTML = '<button id="forgotPasswordBtn" type="button" style="border:0;background:none;color:#1d4ed8;cursor:pointer;font-weight:700">Elfelejtettem a jelszavam</button>';
      form.appendChild(wrap);
      forgot = wrap.firstElementChild;
    }
    forgot.onclick = requestReset;

    /* Do not use the old inline handler even if the browser cached it. */
    window.supabaseLogin = function (event) {
      if (event) event.preventDefault();
      void login();
      return false;
    };
    window.supabaseSignup = function () {
      void signup();
      return false;
    };

    const params = new URLSearchParams(location.hash.slice(1));
    if (params.get('type') === 'recovery' && params.get('access_token')) {
      showResetModal(params.get('access_token'));
    } else {
      void restoreSession();
    }
  }

  function showResetModal(accessToken) {
    if (document.getElementById('passwordResetModal')) return;
    const d = document.createElement('div');
    d.id = 'passwordResetModal';
    d.className = 'auth-overlay';
    d.innerHTML = '<div class="auth-card"><h2>Új jelszó</h2><p>Adj meg egy új jelszót az ERP-fiókodhoz.</p><div class="auth-field"><label>Új jelszó</label><input id="newPassword1" type="password" minlength="8" autocomplete="new-password"></div><div class="auth-field"><label>Új jelszó ismét</label><input id="newPassword2" type="password" minlength="8" autocomplete="new-password"></div><div class="auth-actions"><button class="btn" id="setNewPasswordBtn" type="button">Új jelszó mentése</button></div><div id="resetStatus" class="auth-status"></div></div>';
    document.body.appendChild(d);
    document.getElementById('setNewPasswordBtn').onclick = async function () {
      const p1 = document.getElementById('newPassword1').value;
      const p2 = document.getElementById('newPassword2').value;
      const st = document.getElementById('resetStatus');
      if (p1.length < 8) { st.textContent = 'A jelszó legalább 8 karakter legyen.'; return; }
      if (p1 !== p2) { st.textContent = 'A két jelszó nem egyezik.'; return; }
      st.textContent = 'Jelszó mentése...';
      try {
        await authRequest('/auth/v1/user', { method: 'PUT', headers: { Authorization: 'Bearer ' + accessToken }, body: JSON.stringify({ password: p1 }) });
        clearSession();
        st.style.color = '#18733a';
        st.textContent = 'Az új jelszó sikeresen létrejött. Most már be tudsz lépni az ERP-be.';
        setTimeout(() => { d.remove(); history.replaceState(null, '', location.pathname + location.search); location.reload(); }, 1000);
      } catch (error) {
        st.style.color = '#c0392b';
        st.textContent = error?.message || 'Nem sikerült a jelszó mentése.';
      }
    };
  }

  async function restoreSession() {
    const session = await ensureFreshSession(readSession());
    if (!session?.access_token || !session?.user) return false;
    saveSession(session);
    enterERP(session.user);
    void loadCloudAfterLogin();
    return true;
  }

  window.supabaseLogout = function () {
    const session = readSession();
    clearSession();
    if (session?.access_token) {
      void fetch(SB_URL + '/auth/v1/logout', { method: 'POST', headers: { apikey: SB_KEY, Authorization: 'Bearer ' + session.access_token } }).catch(() => {});
    }
    window.location.reload();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
  else bind();
})();
