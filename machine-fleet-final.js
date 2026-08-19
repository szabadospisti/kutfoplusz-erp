/* FINAL Géppark CRUD – az Anyag/Raktár mintájára, eseménykezelőkkel */
(function(){
  'use strict';
  function install(){
    if(typeof views==='undefined' || typeof db==='undefined' || typeof render!=='function') return false;
    const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
    async function persist(){
      try{ if(typeof localSaveOnly==='function') localSaveOnly(); }catch(e){ console.error('Helyi mentés:',e); }
      try{
        const c=window._supabaseClient;
        if(!c) throw new Error('A Supabase kapcsolat nem érhető el.');
        const {data:{user},error:authError}=await c.auth.getUser();
        if(authError) throw authError;
        if(!user) throw new Error('Nincs bejelentkezett felhasználó.');
        const {error}=await c.from('erp_state').upsert({id:'main',data:db,updated_at:new Date().toISOString(),updated_by:user.id},{onConflict:'id'});
        if(error) throw error;
        return true;
      }catch(e){
        console.error('Géppark Supabase mentés:',e);
        alert('A gép módosítása helyben megtörtént, de a Supabase mentés nem sikerült.\n\n'+(e?.message||e));
        return false;
      }
    }
    const modal=(id,title,body,foot)=>{document.getElementById(id)?.remove();const m=document.createElement('div');m.id=id;m.className='modal';m.innerHTML='<div class="modalbox"><div class="modalhead"><h2>'+title+'</h2><button class="icon" data-x>×</button></div><div class="modalbody">'+body+'<div class="modalfoot">'+(foot||'')+'</div></div></div>';document.body.appendChild(m);m.querySelector('[data-x]').onclick=()=>m.remove();return m};
    function editMachine(id){
      const m=(db.machines||[]).find(x=>String(x.id)===String(id));
      if(!m)return;
      const b='<div class="formgrid"><div class="field"><label>Gép neve</label><input class="input" id="fmN" value="'+esc(m.name)+'"></div><div class="field"><label>Típus / modell</label><input class="input" id="fmM" value="'+esc(m.model)+'"></div><div class="field"><label>Üzemóra</label><input class="input" type="number" id="fmH" value="'+(Number(m.hours)||0)+'"></div><div class="field"><label>Következő szerviz</label><input class="input" type="number" id="fmS" value="'+(Number(m.service)||0)+'"></div><div class="field"><label>Állapot</label><select class="select" id="fmSt"><option '+(m.status==='Üzemképes'?'selected':'')+'>Üzemképes</option><option '+(m.status==='Szervizre vár'?'selected':'')+'>Szervizre vár</option><option '+(m.status==='Meghibásodott'?'selected':'')+'>Meghibásodott</option><option '+(m.status==='Üzemen kívül'?'selected':'')+'>Üzemen kívül</option></select></div><div class="field full"><label>Megjegyzés</label><textarea class="textarea" id="fmNo">'+esc(m.notes||'')+'</textarea></div></div>';
      const x=modal('finalMachineEdit','Gép szerkesztése',b,'<button class="btn danger" data-delete>🗑️ Törlés</button><button class="btn secondary" data-c>Mégse</button><button class="btn" data-save>💾 Mentés</button>');
      x.querySelector('[data-c]').onclick=()=>x.remove();
      x.querySelector('[data-save]').onclick=async()=>{
        m.name=x.querySelector('#fmN').value.trim();
        m.model=x.querySelector('#fmM').value.trim();
        m.hours=Number(x.querySelector('#fmH').value)||0;
        m.service=Number(x.querySelector('#fmS').value)||0;
        m.status=x.querySelector('#fmSt').value;
        m.notes=x.querySelector('#fmNo').value.trim();
        const ok=await persist();
        if(!ok)return;
        x.remove();
        render();
        if(typeof toast==='function')toast('Gép módosítva és Supabase-ben mentve');
      };
      x.querySelector('[data-delete]').onclick=()=>deleteMachine(id);
    }
    async function deleteMachine(id){
      const m=(db.machines||[]).find(x=>String(x.id)===String(id));
      if(!m)return;
      if(!confirm('Biztosan törlöd a(z) „'+m.name+'” gépet?'))return;
      const old=db.machines;
      db.machines=db.machines.filter(q=>String(q.id)!==String(id));
      const ok=await persist();
      if(!ok){ db.machines=old; return; }
      document.getElementById('finalMachineEdit')?.remove();
      render();
      if(typeof toast==='function')toast('Gép törölve és Supabase-ben mentve');
    }
    function profile(id){const m=(db.machines||[]).find(x=>String(x.id)===String(id));if(!m)return;const x=modal('finalMachineProfile','Gépadatlap – '+esc(m.name),'<div class="kpi"><span>Gép</span><b>'+esc(m.name)+'</b></div><div class="kpi"><span>Típus / modell</span><b>'+esc(m.model||'—')+'</b></div><div class="kpi"><span>Üzemóra</span><b>'+(Number(m.hours)||0)+' h</b></div><div class="kpi"><span>Következő szerviz</span><b>'+(Number(m.service)||0)+' h</b></div><div class="kpi"><span>Állapot</span><b>'+esc(m.status||'—')+'</b></div><div class="kpi"><span>Megjegyzés</span><b>'+esc(m.notes||'—')+'</b></div>','<button class="btn secondary" data-edit>✏️ Szerkesztés</button>');x.querySelector('[data-edit]').onclick=()=>{x.remove();editMachine(id)};}
    window.editMachine=editMachine;window.deleteMachine=deleteMachine;window.machineProfile=profile;
    views.machines=()=>'<div class="panel"><div class="panelhead"><h2>Géppark</h2><div style="display:flex;gap:8px"><button class="btn" id="machineNew">+ Új gép</button></div></div><div class="tablewrap"><table class="table"><thead><tr><th>Gép</th><th>Típus</th><th>Üzemóra</th><th>Szerviz</th><th>Állapot</th><th>Műveletek</th></tr></thead><tbody>'+(db.machines||[]).map(m=>'<tr><td><b>'+esc(m.name)+'</b></td><td>'+esc(m.model)+'</td><td>'+(Number(m.hours)||0)+'</td><td>'+(Number(m.service)||0)+'</td><td><span class="badge '+(m.status==='Üzemképes'?'green':m.status==='Szervizre vár'?'amber':'red')+'">'+esc(m.status||'Üzemképes')+'</span></td><td><button class="btn secondary small" data-action="profile" data-id="'+esc(m.id)+'">Adatlap</button> <button class="btn secondary small" data-action="edit" data-id="'+esc(m.id)+'">✏️ Szerkesztés</button> <button class="btn danger small" data-action="delete" data-id="'+esc(m.id)+'">🗑️ Törlés</button></td></tr>').join('')||'<tr><td colspan="6" class="empty">Nincs gép a gépparkban.</td></tr>'+'</tbody></table></div></div>';
    const oldRender=render; render=function(){oldRender(); if(typeof current!=='undefined'&&current==='machines'){const root=document.querySelector('.content'); if(root){root.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{const id=b.dataset.id; if(b.dataset.action==='edit')editMachine(id);else if(b.dataset.action==='delete')deleteMachine(id);else profile(id)}); const n=root.querySelector('#machineNew'); if(n)n.onclick=()=>{if(typeof newMachine==='function')newMachine();};}}};
    if(typeof current!=='undefined'&&current==='machines')render();
    return true;
  }
  let tries=0;const boot=()=>{if(install()||tries++>30)return;setTimeout(boot,250)};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})();
