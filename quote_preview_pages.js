/*
 * Kútfő Plusz ERP 2.0 – Quote UI compatibility wrapper
 *
 * The original preview-page payload remains immutable in Git history and is
 * loaded first from the exact source commit. The compatibility layer below
 * fixes the live quote editor without rebuilding the 1.5 MB index.
 */
(function(){
  document.write('<script src="https://raw.githubusercontent.com/szabadospisti/kutfoplusz-erp/acc20abf63d707a2bc7a09aadcd38363478bdb1a/quote_preview_pages.js"><\/script>');
})();
(function(){
  "use strict";
  const PATCH_VERSION="ERP2.0-QUOTE-UI-FIX-2026-08-28-01";
  function projectBelongsToCustomer(projectId,customerId){
    if(!projectId||!customerId)return true;
    const p=(window.db?.projects||[]).find(x=>String(x.id)===String(projectId));
    return !!p&&String(p.customerId||p.clientId||"")===String(customerId);
  }
  function drillingDiameterRows(){
    try{if(typeof window.ensureDrillingPriceList==="function")window.ensureDrillingPriceList()}catch(e){}
    return Array.isArray(window.db?.drillingPriceList)?window.db.drillingPriceList.filter(x=>String(x?.diameter??"").trim()):[];
  }
  function enhanceQuoteEditorBody(body,customerId){
    const host=document.createElement("div");host.innerHTML=String(body||"");
    const projectSelect=host.querySelector("#q_project");
    if(projectSelect){
      const selectedCustomer=String(customerId||"").trim();
      const selectedProject=String(projectSelect.value||"").trim();
      const projects=(window.db?.projects||[]).filter(p=>!selectedCustomer||String(p.customerId||p.clientId||"")===selectedCustomer);
      const frag=document.createDocumentFragment();
      const placeholder=document.createElement("option");placeholder.value="";placeholder.textContent="— Válassz projektet —";frag.appendChild(placeholder);
      projects.forEach(p=>{const o=document.createElement("option");o.value=String(p.id);o.textContent=`${p.id} – ${p.name||""}`;if(String(p.id)===selectedProject)o.selected=true;frag.appendChild(o)});
      projectSelect.replaceChildren(frag);
    }
    const diameterInput=host.querySelector("#q_pipe_diameter");
    if(diameterInput){
      const current=String(diameterInput.getAttribute("value")||diameterInput.value||"").trim();
      const select=document.createElement("select");select.id="q_pipe_diameter";select.className=diameterInput.className||"input";select.title="A kapcsolt projektből alapértelmezett, de az ajánlatban módosítható.";select.setAttribute("onchange","quoteDiameterChanged()");
      const blank=document.createElement("option");blank.value="";blank.textContent="— Válassz átmérőt —";select.appendChild(blank);
      drillingDiameterRows().forEach(row=>{const value=String(row.diameter).trim();const option=document.createElement("option");option.value=value;option.textContent=`Ø ${value} mm`;if(value===current)option.selected=true;select.appendChild(option)});
      diameterInput.replaceWith(select);
    }
    return host.innerHTML;
  }
  function filterQuoteProjects(){
    const ce=document.getElementById("q_customer"),pe=document.getElementById("q_project");if(!pe)return;
    const customerId=String(ce?.value||"").trim(),current=String(pe.value||"").trim();
    const projects=(window.db?.projects||[]).filter(p=>!customerId||String(p.customerId||p.clientId||"")===customerId);
    const valid=current&&projects.some(p=>String(p.id)===current);
    pe.innerHTML=`<option value="">— Válassz projektet —</option>`+projects.map(p=>`<option value="${typeof window.esc==='function'?window.esc(p.id):String(p.id)}">${typeof window.esc==='function'?window.esc(p.id):String(p.id)} – ${typeof window.esc==='function'?window.esc(p.name||""):String(p.name||"")}</option>`).join("");
    pe.value=valid?current:"";
    if(!valid&&current){if(typeof window.recalculateQuoteMainItem==="function")window.recalculateQuoteMainItem(false);if(typeof window.renderQuoteEditor==="function")window.renderQuoteEditor()}
  }
  function quoteDiameterChanged(){
    const el=document.getElementById("q_pipe_diameter");if(!el)return;const value=String(el.value||"").trim();
    if(typeof window.recalculateQuoteMainItem==="function")window.recalculateQuoteMainItem(false);
    if(typeof window.renderQuoteEditor==="function")window.renderQuoteEditor();
    const after=document.getElementById("q_pipe_diameter");if(after&&value)after.value=value;
  }
  window.quoteDiameterChanged=quoteDiameterChanged;
  const originalOpenQuoteModalLegacy=window.openQuoteModalLegacy;
  if(typeof originalOpenQuoteModalLegacy==="function")window.openQuoteModalLegacy=function(customerId){
    const originalOpenModal=window.openModal;
    window.openModal=function(title,body){return originalOpenModal.call(this,title,enhanceQuoteEditorBody(body,customerId))};
    try{return originalOpenQuoteModalLegacy.apply(this,arguments)}finally{window.openModal=originalOpenModal}
  };
  const originalQuoteCustomerChanged=window.quoteCustomerChanged;
  if(typeof originalQuoteCustomerChanged==="function")window.quoteCustomerChanged=function(){const result=originalQuoteCustomerChanged.apply(this,arguments);filterQuoteProjects();return result};
  const originalQuoteProjectChanged=window.quoteProjectChanged;
  if(typeof originalQuoteProjectChanged==="function")window.quoteProjectChanged=function(){
    const ce=document.getElementById("q_customer"),pe=document.getElementById("q_project"),customerId=String(ce?.value||"").trim(),projectId=String(pe?.value||"").trim();
    if(customerId&&projectId&&!projectBelongsToCustomer(projectId,customerId)){pe.value="";filterQuoteProjects();if(typeof window.toast==="function")window.toast("Ez a projekt nem tartozik a kiválasztott ügyfélhez.");return false}
    const result=originalQuoteProjectChanged.apply(this,arguments);filterQuoteProjects();return result;
  };
  const originalSaveQuoteFromTemplate=window.saveQuoteFromTemplate;
  if(typeof originalSaveQuoteFromTemplate==="function")window.saveQuoteFromTemplate=function(){
    const ce=document.getElementById("q_customer"),pe=document.getElementById("q_project"),customerId=String(ce?.value||"").trim(),projectId=String(pe?.value||"").trim();
    if(!customerId||!projectId||!projectBelongsToCustomer(projectId,customerId)){if(typeof window.toast==="function")window.toast("Az ajánlat csak a kiválasztott ügyfél saját projektjéhez menthető.");return false}
    return originalSaveQuoteFromTemplate.apply(this,arguments);
  };
  window.KUTFOPLUSZ_QUOTE_UI_PATCH=PATCH_VERSION;
  window.KUTFOPLUSZ_QUOTE_UI_PATCH_TEST=function(){const rows=drillingDiameterRows(),has160=rows.some(x=>String(x.diameter).trim()==="160"),p=(window.db?.projects||[])[0],customerId=p?String(p.customerId||p.clientId||""):"";return{patch:PATCH_VERSION,diameters:rows.map(x=>String(x.diameter)),has160,projectCustomerCheck:p?projectBelongsToCustomer(p.id,customerId):null}};
})();
