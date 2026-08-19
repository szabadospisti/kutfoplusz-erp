/* Kútfő Plusz ERP – a projekt szerkesztő mindig a Supabase aktuális rekordjából tölt. */
(function(){
  'use strict';
  async function install(){
    for(var i=0;i<120;i++){
      if(window.KPProjectSupabase && typeof window.editProject==='function' && window.db && Array.isArray(window.db.projects)) break;
      await new Promise(function(r){setTimeout(r,50);});
    }
    if(!window.KPProjectSupabase || typeof window.editProject!=='function'){
      console.error('Projekt szerkesztő live fix: szükséges modul nem töltődött be.');
      return;
    }
    if(window.__KP_PROJECT_EDIT_LIVE__) return;
    var originalEditProject=window.editProject;
    window.editProject=async function(id){
      var key=String(id||'');
      var local=window.db.projects.find(function(x){return String(x.id)===key || String(x.supabaseId||'')===key;});
      try{
        var projectNumber=local ? local.id : key;
        var remote=await window.KPProjectSupabase.findByProjectNumber(projectNumber);
        if(remote){
          if(!local){
            local={id:remote.project_number||key,supabaseId:remote.id,customerId:'',customerName:'',name:'',status:'Tervezés',location:'',value:0,progress:0,planned:0,cost:0,notes:''};
            window.db.projects.push(local);
          }
          /* A lokális cache helyett minden szerkesztéskor a Supabase rekord az igazságforrás. */
          local.name=remote.name||'';
          local.location=remote.location||'';
          local.status=remote.status||'Tervezés';
          local.value=Number(remote.contract_value)||0;
          local.progress=Number(remote.progress_pct)||0;
          local.planned=Number(remote.planned_cost)||0;
          local.cost=Number(remote.actual_cost)||0;
          local.notes=remote.notes||'';
          local.supabaseId=remote.id;
        }
      }catch(err){
        console.error('Projekt Supabase visszatöltés:',err);
      }
      return originalEditProject(local ? local.id : key);
    };
    window.__KP_PROJECT_EDIT_LIVE__=true;
  }
  install().catch(function(err){console.error('Projekt szerkesztő live fix:',err);});
})();
