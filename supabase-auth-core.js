/* Kútfő Plusz ERP – központi Supabase Auth/API réteg.
   Minden REST kéréshez kizárólag a bejelentkezett felhasználó JWT-je kerül
   Authorization: Bearer fejlécbe. A publishable key csak az apikey fejlécben használható.
*/
(function(){
  'use strict';

  const SESSION_KEY='kutfoplusz_supabase_session_v1';
  const sleep=ms=>new Promise(r=>setTimeout(r,ms));

  function config(){
    const c=window.SUPABASE_CONFIG;
    if(!c||!c.url||!c.publishableKey) throw new Error('Supabase konfiguráció nincs betöltve.');
    return c;
  }

  function readSession(){
    try{return JSON.parse(localStorage.getItem(SESSION_KEY)||'null');}
    catch{return null;}
  }

  function writeSession(session){
    if(!session) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY,JSON.stringify(session));
    return session;
  }

  function tokenFromSession(session){
    const token=session&&session.access_token;
    if(typeof token!=='string'||!token.trim()) return null;
    return token.trim();
  }

  async function refreshSession(){
    const c=config();
    const current=readSession();
    const refresh=current&&current.refresh_token;
    if(!refresh) return null;

    const res=await fetch(c.url+'/auth/v1/token?grant_type=refresh_token',{
      method:'POST',
      headers:{apikey:c.publishableKey,'Content-Type':'application/json',Accept:'application/json'},
      body:JSON.stringify({refresh_token:refresh})
    });
    const text=await res.text();
    let body=null; try{body=text?JSON.parse(text):null;}catch{body=text;}
    if(!res.ok){
      writeSession(null);
      return null;
    }

    const next=Object.assign({},current||{},body||{});
    if(body&&body.expires_in){
      next.expires_at=Math.floor(Date.now()/1000)+Number(body.expires_in);
    }
    return writeSession(next);
  }

  async function getValidSession(options){
    const allowRefresh=!(options&&options.refresh===false);
    let session=readSession();
    if(tokenFromSession(session)){
      const expiresAt=Number(session.expires_at||0);
      if(!expiresAt || expiresAt>Date.now()/1000+30) return session;
    }
    if(allowRefresh){
      session=await refreshSession();
      if(tokenFromSession(session)) return session;
    }
    return null;
  }

  function authError(status,message){
    const e=new Error(message||('Supabase '+status));
    e.status=status;
    e.code='AUTH_SESSION_INVALID';
    return e;
  }

  async function request(path,options){
    const c=config();
    let session=await getValidSession();
    if(!session) throw authError(401,'Supabase munkamenet hiányzik vagy lejárt. Jelentkezz be újra.');

    const base=Object.assign({},options||{});
    const customHeaders=Object.assign({},base.headers||{});
    delete base.headers;

    async function send(activeSession){
      const token=tokenFromSession(activeSession);
      if(!token) throw authError(401,'Érvényes Supabase felhasználói token nem található.');
      const headers=Object.assign({
        apikey:c.publishableKey,
        Authorization:'Bearer '+token,
        Accept:'application/json'
      },customHeaders);
      return fetch(c.url+'/rest/v1/'+path,Object.assign({},base,{headers}));
    }

    let res=await send(session);
    if(res.status===401||res.status===403){
      const refreshed=await refreshSession();
      if(refreshed&&tokenFromSession(refreshed)) res=await send(refreshed);
      if(res.status===401||res.status===403){
        writeSession(null);
        throw authError(res.status,'Supabase munkamenet érvénytelen vagy lejárt. Jelentkezz be újra.');
      }
    }

    const text=await res.text();
    let body=null;try{body=text?JSON.parse(text):null;}catch{body=text;}
    if(!res.ok){
      const msg=body&&(body.message||body.error||body.details||body.hint)
        ?[body.message,body.details,body.hint].filter(Boolean).join(' | ')
        :String(body||res.statusText);
      const e=new Error('Supabase '+res.status+': '+msg);
      e.status=res.status;
      e.body=body;
      throw e;
    }
    return body;
  }

  async function user(){
    const c=config();
    let session=await getValidSession();
    if(!session) return null;
    async function call(s){
      const token=tokenFromSession(s);
      if(!token) return {status:401,body:null};
      const res=await fetch(c.url+'/auth/v1/user',{
        headers:{apikey:c.publishableKey,Authorization:'Bearer '+token,Accept:'application/json'}
      });
      const text=await res.text();let body=null;try{body=text?JSON.parse(text):null;}catch{body=text;}
      return {status:res.status,body};
    }
    let result=await call(session);
    if(result.status===401||result.status===403){
      session=await refreshSession();
      if(!session) return null;
      result=await call(session);
    }
    if(result.status===401||result.status===403){writeSession(null);return null;}
    if(result.status<200||result.status>=300) throw new Error('Supabase auth '+result.status+': '+String(result.body||''));
    return result.body||null;
  }

  window.KPSupabaseAuth=Object.freeze({
    SESSION_KEY,
    readSession,
    writeSession,
    getValidSession,
    refreshSession,
    user,
    request,
    clear:()=>writeSession(null)
  });
})();
