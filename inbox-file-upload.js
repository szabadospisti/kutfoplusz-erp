/* Kútfő Plusz ERP – Beérkező dokumentum valódi fájlfeltöltés
   Stabil változat: a fő ERP adatmodellje lehet globális let/const változó is,
   ezért nem a window.db tulajdonságra támaszkodunk.
*/
(function(){
  const SUPA='https://qoxxhsbcptyieyhtdhr.supabase.co';
  const KEY='sb_publishable_WYMcBkgdK-Ed5JY_ljJS0g_BB8dH10T';
  const BUCKET='erp-documents';
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function getDb(){
    try{
      if(typeof db!=='undefined' && db) return db;
    }catch(e){}
    try{
      if(window.db) return window.db;
    }catch(e){}
    return null;
  }
  function sessionToken(){
    try{
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i)||'';
        if(!k.includes('auth-token'))continue;
        const raw=localStorage.getItem(k);if(!raw)continue;
        const o=JSON.parse(raw);if(o?.access_token)return o.access_token;
      }
    }catch(e){}
    return '';
  }
  async function upload(file,doc){
    const token=sessionToken();
    if(!token)throw new Error('A bejelentkezési munkamenet nem található.');
    const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'_');
    const path='inbox/'+new Date().toISOString().slice(0,10)+'/'+(doc.id||'DOC')+'-'+safe;
    const res=await fetch(`${SUPA}/storage/v1/object/${BUCKET}/${encodeURIComponent(path).replace(/%2F/g,'/')}`,{method:'POST',headers:{apikey:KEY,Authorization:'Bearer '+token,'Content-Type':file.type||'application/octet-stream','x-upsert':'true'},body:file});
    if(!res.ok)throw new Error('Fájlfeltöltési hiba: '+(await res.text()).slice(0,300));
    doc.filePath=path;doc.fileName=file.name;doc.fileType=file.type;doc.fileSize=file.size;doc.fileUploadedAt=new Date().toISOString();
  }
  function addFileField(){
    const form=document.getElementById('inboxForm');if(!form||form.querySelector('[name="file"]'))return;
    const grid=form.querySelector('.formgrid');if(!grid)return;
    const row=document.createElement('div');row.className='field full';
    row.innerHTML='<label>📎 Fájl feltöltése</label><input class="input" type="file" name="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp" required><div class="label" style="margin-top:5px">PDF, Word vagy kép. A fájl a dokumentumhoz kerül a Supabase tárhelyen.</div>';
    grid.insertBefore(row,grid.firstChild);
    const btn=form.querySelector('.modalfoot .btn:not(.secondary)');if(btn)btn.textContent='Feltöltés és mentés';
  }
  async function handleSubmit(e){
    const form=e.target;if(!form||form.id!=='inboxForm')return;
    const file=form.querySelector('[name="file"]')?.files?.[0];
    if(!file)return;
    e.preventDefault();e.stopImmediatePropagation();
    const btn=form.querySelector('.modalfoot .btn:not(.secondary)');if(btn){btn.disabled=true;btn.textContent='Feltöltés…';}
    try{
      const o=Object.fromEntries(new FormData(form).entries());delete o.file;
      const model=getDb();
      if(!model)throw new Error('Az ERP adatmodell még nem töltődött be. Frissítsd az oldalt, majd próbáld újra.');
      if(!Array.isArray(model.inboxDocuments))model.inboxDocuments=[];
      const doc={id:(typeof uid==='function'?uid('DOC'):'DOC-'+Date.now()),...o,status:'Feldolgozásra vár',extracted:{},tasks:[]};
      await upload(file,doc);
      model.inboxDocuments.push(doc);
      if(typeof save==='function')save();
      else if(typeof localSaveOnly==='function')localSaveOnly();
      if(typeof closeModal==='function')closeModal();
      if(typeof openInbox==='function')openInbox();
      if(typeof toast==='function')toast('Dokumentum és fájl feltöltve');
    }catch(err){
      console.error('Kútfő Plusz inbox upload:',err);
      alert(err.message||'A fájl feltöltése nem sikerült.');
      if(btn){btn.disabled=false;btn.textContent='Feltöltés és mentés';}
    }
  }
  function boot(){
    addFileField();
    if(!window.__kpInboxFileSubmit){
      document.addEventListener('submit',handleSubmit,true);
      window.__kpInboxFileSubmit=true;
    }
  }
  new MutationObserver(boot).observe(document.body,{childList:true,subtree:true});
  setTimeout(boot,500);
})();
