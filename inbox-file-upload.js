/* Kútfő Plusz ERP – Beérkező dokumentum fájlfeltöltés
   A pilot dokumentumhoz valódi PDF/Word/kép fájlt választ a felhasználó.
   A Supabase Storage feltöltést a meglévő supabase klienssel próbálja meg.
*/
(function(){
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  function patchDialog(){
    const old=window.openUploadDialog;
    if(typeof old!=='function'||old.__fileUpload)return;
    const wrapped=function(){
      old();
      setTimeout(()=>{
        const form=document.getElementById('inboxForm'); if(!form||form.querySelector('[name="file"]'))return;
        const full=form.querySelector('.formgrid'); if(!full)return;
        const row=document.createElement('div');row.className='field full';
        row.innerHTML='<label>📎 Fájl</label><input class="input" type="file" name="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.webp"><div class="label" style="margin-top:5px">PDF, Word vagy kép. A fájl a dokumentumhoz kerül mentésre.</div>';
        full.insertBefore(row,full.firstChild);
        const submit=form.querySelector('button[type="submit"]');if(submit)submit.textContent='Feltöltés és mentés';
      },50);
    };wrapped.__fileUpload=true;window.openUploadDialog=wrapped;
  }
  const boot=()=>{patchDialog();};
  setInterval(boot,700);
  window.kpUploadSelectedFile=async function(file,doc){
    if(!file)return null;
    const client=window.supabaseClient||window.sb||window.supabase;
    if(!client?.storage?.from){return {localOnly:true,name:file.name,size:file.size,type:file.type};}
    const safe=file.name.replace(/[^a-zA-Z0-9._-]+/g,'_');
    const path='inbox/'+new Date().toISOString().slice(0,10)+'/'+(doc.id||'DOC')+'-'+safe;
    const {error}=await client.storage.from('erp-documents').upload(path,file,{upsert:true,contentType:file.type||undefined});
    if(error)throw error;
    doc.filePath=path;doc.fileName=file.name;doc.fileType=file.type;doc.fileSize=file.size;doc.fileUploadedAt=new Date().toISOString();
    return {path};
  };
})();
