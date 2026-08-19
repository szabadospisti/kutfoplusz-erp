/* Kútfő Plusz ERP – egyetlen hiteles projektmentés
 * A projects tábla közvetlen frissítése + azonnali visszaellenőrzés.
 */
(function(){
  'use strict';
  function install(){
    if(!window.KPSupabaseSync || !window.KPProjectSupabase){setTimeout(install,250);return;}
    window.KPSupabaseSync.saveProjectRemote=async function(p){
      const id=p?.supabaseId;
      const number=p?.id||p?.project_number;
      if(!id && !number)throw new Error('Hiányzó projektazonosító.');
      let row;
      if(id){
        row=await window.KPProjectSupabase.update(id,p);
      }else{
        row=await window.KPProjectSupabase.updateByProjectNumber(number,p);
      }
      if(!row)throw new Error('A Supabase nem adott vissza frissített projektet.');
      const verify=await window.KPProjectSupabase.findByProjectNumber(row.project_number||number);
      if(!verify)throw new Error('A mentés után a projekt nem található a Supabase-ben.');
      const checks=[
        ['name',p.name,verify.name],
        ['location',p.location,verify.location],
        ['status',p.status,verify.status],
        ['contract_value',Number(p.value)||0,Number(verify.contract_value)||0],
        ['planned_cost',Number(p.planned)||0,Number(verify.planned_cost)||0],
        ['actual_cost',Number(p.cost)||0,Number(verify.actual_cost)||0],
        ['progress_pct',Number(p.progress)||0,Number(verify.progress_pct)||0],
        ['notes',p.notes||'',verify.notes||'']
      ];
      const mismatch=checks.find(x=>String(x[1]??'')!==String(x[2]??''));
      if(mismatch)throw new Error('Supabase visszaellenőrzés sikertelen: '+mismatch[0]);
      Object.assign(p,{supabaseId:verify.id,id:verify.project_number||number});
      return p;
    };
  }
  install();
})();
