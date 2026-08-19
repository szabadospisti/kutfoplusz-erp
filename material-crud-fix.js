/* Kútfő Plusz ERP – Anyag/Raktár CRUD UI, az Ügyfelek oldal mintájára. */
(function(){
  'use strict';

  function escM(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}

  function install(){
    if(typeof pages==='undefined' || !window.db || !Array.isArray(window.db.materials) || typeof window.render!=='function'){
      return setTimeout(install,100);
    }
    if(window.__KP_MATERIAL_CRUD_FIX__) return;

    window.editMaterial=function(id){
      const m=db.materials.find(x=>String(x.id)===String(id));
      if(!m)return;
      openMaterialEditor(m);
    };

    window.deleteMaterial=function(id){
      const m=db.materials.find(x=>String(x.id)===String(id));
      if(!m)return;
      if(!confirm(`Biztosan törlöd ezt az anyagot?\n\n${m.name}\nCikkszám: ${m.id}`))return;
      db.materials=db.materials.filter(x=>String(x.id)!==String(id));
      save();
      closeModal();
      render();
      toast('Anyag törölve');
    };

    function openMaterialEditor(m){
      const editing=!!m;
      openModal(editing?'Anyag szerkesztése':'Új anyag',`<form onsubmit="saveMaterialEdit(event,'${editing?escM(m.id):''}')">
        <div class="formgrid">
          <div class="field full"><label>Megnevezés</label><input required class="input" name="name" value="${escM(m?.name||'')}"></div>
          <div class="field"><label>Egység</label><input class="input" name="unit" value="${escM(m?.unit||'db')}"></div>
          <div class="field"><label>Készlet</label><input class="input" type="number" step="any" name="stock" value="${Number(m?.stock)||0}"></div>
          <div class="field"><label>Minimum</label><input class="input" type="number" step="any" name="min" value="${Number(m?.min)||0}"></div>
          <div class="field"><label>Beszerzési ár</label><input class="input" type="number" step="any" name="price" value="${Number(m?.price)||0}"></div>
        </div>
        <div class="modalfoot">
          ${editing?`<button type="button" class="btn danger" onclick="deleteMaterial('${escM(m.id)}')">Törlés</button>`:''}
          <span style="flex:1"></span>
          <button type="button" class="btn secondary" onclick="closeModal()">Mégse</button>
          <button class="btn">Mentés</button>
        </div>
      </form>`);
    }

    window.newMaterial=function(){openMaterialEditor(null);};

    window.saveMaterialEdit=function(e,id){
      e.preventDefault();
      const o=Object.fromEntries(new FormData(e.target).entries());
      const payload={name:o.name,unit:o.unit||'db',stock:Number(o.stock)||0,min:Number(o.min)||0,price:Number(o.price)||0};
      if(id){
        const m=db.materials.find(x=>String(x.id)===String(id));
        if(!m)return;
        Object.assign(m,payload);
        toast('Anyag módosítva');
      }else{
        db.materials.push({id:uid('M'),...payload});
        toast('Anyag mentve');
      }
      save();
      closeModal();
      render();
    };

    pages.materials=()=>`<div class="panel"><div class="panelhead"><h2>Anyag / Raktár</h2><button class="btn" onclick="newMaterial()">+ Új anyag</button></div><div class="tablewrap"><table class="table"><thead><tr><th>Cikkszám</th><th>Megnevezés</th><th>Készlet</th><th>Minimum</th><th>Beszerzési ár</th><th>Állapot</th><th></th></tr></thead><tbody>${db.materials.map(m=>`<tr><td><a class="link" onclick="editMaterial('${escM(m.id)}')"><b>${escM(m.id)}</b></a></td><td><a class="link" onclick="editMaterial('${escM(m.id)}')">${escM(m.name)}</a></td><td>${m.stock} ${escM(m.unit)}</td><td>${m.min} ${escM(m.unit)}</td><td>${money(m.price)}</td><td><span class="badge ${m.stock<m.min?'amber':'green'}">${m.stock<m.min?'Beszerzés szükséges':'Rendben'}</span></td><td><button class="btn secondary small" onclick="editMaterial('${escM(m.id)}')">Szerkesztés</button></td></tr>`).join('')||'<tr><td colspan="7" class="label">Nincs anyag.</td></tr>'}</tbody></table></div></div>`;

    window.__KP_MATERIAL_CRUD_FIX__=true;
    if(location.hash.replace('#/','')==='materials')render();
  }

  install();
})();
