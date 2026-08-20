/* Kútfő Plusz ERP – a projekt szerkesztő közvetlenül a Supabase aktuális rekordját tölti be. */
(function(){
  'use strict';
  function sleep(ms){return new Promise(function(resolve){setTimeout(resolve,ms);});}
  function escLocal(v){
    if(typeof window.esc==='function')return window.esc(v==null?'':String(v));
    return String(v==null?'':v).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function customerLocalId(remoteCustomerId,local){
    if(!remoteCustomerId)return local&&local.customerId||'';
    var customers=(window.db&&Array.isArray(window.db.customers))?window.db.customers:[];
    var c=customers.find(function(x){return String(x.supabaseId||x.customer_id||'')===String(remoteCustomerId)||String(x.id||'')===String(remoteCustomerId);});
    return c?(c.id||c.customerId||''):(local&&local.customerId||'');
  }
  function customerOptions(selected){
    /* A régi window.opts() más azonosítókat is használhatott, ezért a Projekt
       szerkesztő kizárólag a központi db.customers lokális ID-jait használja. */
    var customers=(window.db&&Array.isArray(window.db.customers))?window.db.customers:[];
    return customers.map(function(c){
      var id=c.id||c.customerId||'';
      var name=c.name||c.company_name||c.companyName||'';
      return '<option value="'+escLocal(id)+'" '+(String(id)===String(selected)?'selected':'')+'>'+escLocal(name)+'</option>';
    }).join('');
  }
  async function persistERPState(){
    /* Egyetlen központi felhőmentési útvonal: az index.html által biztosított
       supabaseCloudSave. A save() csak a helyi állapotot frissíti. */
    if(typeof window.supabaseCloudSave==='function'){
      await window.supabaseCloudSave();
      return;
    }
    if(typeof window.save==='function'){
      var result=window.save();
      if(result&&typeof result.then==='function')await result;
      return;
    }
    throw new Error('A központi ERP mentési útvonal nem érhető el.');
  }
  async function install(){
    for(var i=0;i<160;i++){if(window.KPProjectSupabase)break;await sleep(50);}
    if(!window.KPProjectSupabase){console.error('Projekt szerkesztő live fix: Supabase projekt adapter nem töltődött be.');return;}
    if(window.__KP_PROJECT_EDIT_LIVE__)return;
    window.editProject=async function(id){
      var key=String(id||'');
      var local=(window.db&&Array.isArray(window.db.projects))?window.db.projects.find(function(x){return String(x.id)===key||String(x.supabaseId||'')===key;}):null;
      var remote=null;
      try{remote=await window.KPProjectSupabase.findByProjectNumber(local?local.id:key);}catch(err){console.error('Projekt Supabase visszatöltés:',err);}
      if(!remote){
        if(local&&typeof window.openModal==='function')return window.openModal('Projekt szerkesztése','<div class="notice">A projekt aktuális Supabase adatai nem tölthetők be. A módosítás előtt ellenőrizd a kapcsolatot.</div>');
        if(typeof window.toast==='function')window.toast('A projekt aktuális Supabase adatai nem tölthetők be.');
        return;
      }
      var selectedCustomer=customerLocalId(remote.customer_id,local);
      var name=remote.name||'',location=remote.location||'',status=remote.status||'Tervezés';
      var value=Number(remote.contract_value)||0,progress=Number(remote.progress_pct)||0,planned=Number(remote.planned_cost)||0,cost=Number(remote.actual_cost)||0,notes=remote.notes||'';
      var projectId=remote.project_number||key;
      if(window.db&&Array.isArray(window.db.projects)){
        if(!local){local={id:projectId,supabaseId:remote.id,customerId:selectedCustomer,name:name,status:status,location:location,value:value,progress:progress,planned:planned,cost:cost,notes:notes};window.db.projects.push(local);}
        else Object.assign(local,{supabaseId:remote.id,customerId:selectedCustomer,name:name,status:status,location:location,value:value,progress:progress,planned:planned,cost:cost,notes:notes});
      }
      var html='<form onsubmit="saveProjectEdit(event,\''+escLocal(projectId)+'\')"><div class="formgrid">'+
        '<div class="field"><label>Ügyfél</label><select required class="select" name="customerId">'+customerOptions(selectedCustomer)+'</select></div>'+ 
        '<div class="field"><label>Státusz</label><select class="select" name="status"><option '+(status==='Tervezés'?'selected':'')+'>Tervezés</option><option '+(status==='Folyamatban'?'selected':'')+'>Folyamatban</option><option '+(status==='Lezárva'?'selected':'')+'>Lezárva</option></select></div>'+ 
        '<div class="field full"><label>Projekt neve</label><input required class="input" name="name" value="'+escLocal(name)+'"></div>'+ 
        '<div class="field"><label>Helyszín</label><input class="input" name="location" value="'+escLocal(location)+'"></div>'+ 
        '<div class="field"><label>Szerződéses érték</label><input class="input" type="number" name="value" value="'+value+'"></div>'+ 
        '<div class="field"><label>Készültség (%)</label><input class="input" type="number" min="0" max="100" name="progress" value="'+progress+'"></div>'+ 
        '<div class="field"><label>Tervezett költség</label><input class="input" type="number" name="planned" value="'+planned+'"></div>'+ 
        '<div class="field"><label>Tényleges költség</label><input class="input" type="number" name="cost" value="'+cost+'"></div>'+ 
        '<div class="field full"><label>Megjegyzés</label><textarea class="textarea" name="notes">'+escLocal(notes)+'</textarea></div></div>'+ 
        '<div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Mentés</button></div></form>';
      if(typeof window.openModal==='function')window.openModal('Projekt szerkesztése',html);
    };
    window.__KP_PROJECT_EDIT_LIVE__=true;
  }
  install().catch(function(err){console.error('Projekt szerkesztő live fix:',err);});
})();