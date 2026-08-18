/* Kútfő Plusz ERP — egységes Supabase Auth vezérlő
 *
 * Egyetlen felelősség:
 * - email/jelszó belépés
 * - session tárolás és frissítés
 * - logout
 * - ERP megnyitása sikeres hitelesítés után
 * - felhőadat betöltése csak a belépés UTÁN
 *
 * Fontos: a publishable key kliensoldalon használható; service_role kulcsot
 * soha nem szabad ide tenni.
 */
(function () {
  'use strict';

  const CFG = window.SUPABASE_CONFIG || {};
  const SB_URL = String(CFG.url || '').replace(/\/$/, '');
  const SB_KEY = String(CFG.publishableKey || '');
  const SESSION_KEY = 'kutfoplusz_supabase_session_v2';
  const LEGACY_SESSION_KEY = 'kutfoplusz_supabase_session_v1';

  if (!SB_URL || !SB_KEY) {
    console.error('Supabase Auth: hiányzik a Supabase konfiguráció.');
    return;
  }

  let authBusy = false;

  function status(message, isError) {
    const el = document.getElementById('authStatus');
    if (!el) return;
    el.textContent = message || '';
    el.style.color = isError ? '#c0392b' : '#18733a';
  }

  function readSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY) || localStorage.getItem(LEGACY_SESSION_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      console.warn('Supabase Auth: sérült session törölve.', e);
      clearSession();
      return null;
    }
  }

  function saveSession(session) {
    if (!session || !session.access_token) return;
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    localStorage.removeItem(LEGACY_SESSION_KEY);
  }

  function clearSession() {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(LEGACY_SESSION_KEY);
  }

  async function authRequest(path, options) {
    const opts = options || {};
    const headers = Object.assign({ apikey: SB_KEY }, opts.headers || {});
    if (opts.body && !headers['Content-Type']) headers['Content-Type'] = 'application/json';
    const response = await fetch(SB_URL + path, Object.assign({}, opts, { headers }));
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const err = new Error(data.error_description || data.msg || data.message || data.error || 'Supabase Auth hiba');
      err.status = response.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  async function refreshSession(session) {
    if (!session || !session.refresh_token) return null;
    try {
      const data = await authRequest('/auth/v1/token?grant_type=refresh_token', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: session.refresh_token })
      });
      if (data.access_token) saveSession(data);
      return data;
    } catch (e) {
      console.warn('Supabase Auth: session frissítés sikertelen.', e);
      clearSession();
      return null;
    }
  }

  async function ensureFreshSession(session) {
    if (!session || !session.access_token) return null;
    const expiresAt = Number(session.expires_at || 0) * 1000;
    const shouldRefresh = expiresAt > 0 && expiresAt < Date.now() + 60 * 1000;
    if (shouldRefresh) return refreshSession(session);
    return session;
  }

  function enterERP(user) {
    if (typeof window.enterERP === 'function') {
      window.enterERP(user);
    } else {
      document.getElementById('authOverlay')?.classList.add('auth-hidden');
      document.getElementById('erpApp')?.classList.remove('auth-hidden');
      const who = document.getElementById('cloudStatus');
      if (who) who.textContent = '☁️ ' + (user?.email || 'Supabase');
      if (typeof window.render === 'function') window.render();
    }
  }

  async function loadCloudAfterLogin() {
    if (typeof window.supabaseCloudLoadOrMigrate !== 'function') return;
    try {
      await window.supabaseCloudLoadOrMigrate();
      if (typeof window.render === 'function') window.render();
    } catch (error) {
      console.error('Supabase adatbetöltési hiba belépés után:', error);
      const cloudStatus = document.getElementById('cloudStatus');
      if (cloudStatus) cloudStatus.textContent = '⚠️ Felhőadat betöltési hiba';
    }
  }

  async function login() {
    if (authBusy) return false;
    authBusy = true;
    const email = (document.getElementById('authEmail')?.value || '').trim();
    const password = document.getElementById('authPassword')?.value || '';

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

      // A hitelesítés sikeres: az ERP azonnal megnyílik.
      // Az adatbetöltés ezután fut, és soha nem blokkolhatja a belépést.
      enterERP(data.user);
      status('', false);
      void loadCloudAfterLogin();
    } catch (error) {
      console.error('Supabase login error:', error);
      status(error?.message || 'Sikertelen bejelentkezés.', true);
    } finally {
      authBusy = false;
    }
    return false;
  }

  async function restoreSession() {
    const session = await ensureFreshSession(readSession());
    if (!session || !session.access_token || !session.user) return false;
    enterERP(session.user);
    void loadCloudAfterLogin();
    return true;
  }

  window.supabaseLogin = function (event) {
    if (event) event.preventDefault();
    void login();
    return false;
  };

  window.supabaseLogout = function () {
    const session = readSession();
    clearSession();
    // A szerveroldali revoke opcionális; a kliens akkor is azonnal kijelentkezik.
    if (session?.access_token) {
      void fetch(SB_URL + '/auth/v1/logout', {
        method: 'POST',
        headers: { apikey: SB_KEY, Authorization: 'Bearer ' + session.access_token }
      }).catch(() => {});
    }
    window.location.reload();
  };

  function bind() {
    const form = document.getElementById('authForm');
    if (form && form.dataset.stableAuthBound !== '2') {
      form.dataset.stableAuthBound = '2';
      form.addEventListener('submit', function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();
        void login();
      }, true);
    }
    void restoreSession();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind, { once: true });
  } else {
    bind();
  }
})();
