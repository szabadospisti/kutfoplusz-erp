/* Kútfő Plusz ERP 2.0 – quote editor compatibility wrapper */
(function(){
  const s=document.createElement("script");
  s.src="https://raw.githubusercontent.com/szabadospisti/kutfoplusz-erp/acc20abf63d707a2bc7a09aadcd38363478bdb1a/quote_preview_pages.js";
  s.async=false;
  document.head.appendChild(s);
  const p=document.createElement("script");
  p.src="quote_ui_fix.js?v=2";
  p.async=false;
  document.head.appendChild(p);
  const v=document.createElement("script");
  v.src="quote_preview_layout_fix.js?v=2";
  v.async=false;
  document.head.appendChild(v);
})();
(function(){
  "use strict";
  const PATCH_VERSION="ERP2.0-QUOTE-UI-FIX-2026-08-28-08";
  function installLayout(){
    if(document.getElementById("kutfo-quote-three-fields-style"))return;
    const s=document.createElement("style");s.id="kutfo-quote-three-fields-style";
    s.textContent='@media (min-width:700px){.offer-card:has(#q_depth) .offer-grid{grid-template-columns:repeat(3,minmax(0,1fr)) !important;align-items:end !important}.offer-card:has(#q_depth) .offer-grid>div{min-width:0 !important}}@media (max-width:699px){.offer-card:has(#q_depth) .offer-grid{grid-template-columns:1fr !important}}';
    document.head.appendChild(s);
  }
  function projects(){return (typeof db!=="undefined"&&db&&Array.isArray(db.projects))?db.projects:[];}
  function priceRows(){try{if(typeof window.ensureDrillingPriceList==="function")window.ensureDrillingPriceList()}catch(e){}return Array.isArray(typeof db!=="undefined"&&db?db.drillingPriceList:null)?db.drillingPriceList.filter(x=>String(x?.diameter??"").trim()):[];}
  function projectBelongsToCustomer(projectId,customerId){if(!projectId||!customerId)return true;const p=projects().find(x=>String(x.id)===String(projectId));return !!p&&String(p.customerId||p.clientId||"")===String(customerId);}
  function enhanceQuoteEditorBody(body,customerId){
    const host=document.createElement("div");host.innerHTML=String(body||"");
    const ps=host.querySelector("#q_project");
    if(ps){const cid=String(customerId||"").trim(),selected=String(ps.value||"").trim(),rows=projects().filter(p=>!cid||String(p.customerId||p.clientId||"")===cid),frag=document.createDocumentFragment(),blank=document.createElement("option");blank.value="";blank.textContent="— Válassz projektet —";frag.appendChild(blank);rows.forEach(p=>{const o=document.createElement("option");o.value=String(p.id);o.textContent=`${p.id} – ${p.name||""}`;o.selected=String(p.id)===selected;frag.appendChild(o)});ps.replaceChildren(frag);}
    const di=host.querySelector("#q_pipe_diameter");
    if(di){const current=String(di.getAttribute("value")||di.value||"").trim(),sel=document.createElement("select");sel.id="q_pipe_diameter";sel.className=di.className||"input";sel.title="A kapcsolt projektből alapértelmezett, de az ajánlatban módosítható.";sel.setAttribute("onchange","quoteDiameterChanged()");const blank=document.createElement("option");blank.value="";blank.textContent="— Válassz átmérőt —";sel.appendChild(blank);priceRows().forEach(r=>{const v=String(r.diameter).trim(),o=document.createElement("option");o.value=v;o.textContent=`Ø ${v} mm`;o.selected=v===current;sel.appendChild(o)});di.replaceWith(sel);}
    return host.innerHTML;
  }
  function filterQuoteProjects(){const ce=document.getElementById("q_customer"),pe=document.getElementById("q_project");if(!pe)return;const cid=String(ce?.value||"").trim(),current=String(pe.value||"").trim(),rows=projects().filter(p=>!cid||String(p.customerId||p.clientId||"")===cid),valid=current&&rows.some(p=>String(p.id)===current);pe.innerHTML=`<option value="">— Válassz projektet —</option>`+rows.map(p=>`<option value="${typeof window.esc==='function'?window.esc(p.id):String(p.id)}">${typeof window.esc==='function'?window.esc(p.id):String(p.id)} – ${typeof window.esc==='function'?window.esc(p.name||""):String(p.name||"")}</option>`).join("");pe.value=valid?current:"";if(!valid&&current){if(typeof window.recalculateQuoteMainItem==="function")window.recalculateQuoteMainItem(false);if(typeof window.renderQuoteEditor==="function")window.renderQuoteEditor();}}
  window.quoteDiameterChanged=function(){const el=document.getElementById("q_pipe_diameter");if(!el)return;const value=String(el.value||"").trim();if(typeof window.recalculateQuoteMainItem==="function")window.recalculateQuoteMainItem(false);if(typeof window.renderQuoteEditor==="function")window.renderQuoteEditor();const after=document.getElementById("q_pipe_diameter");if(after&&value)after.value=value;};
  function install(){
    installLayout();
    if(!window.__KUTFOPLUSZ_QUOTE_UI_PATCH_OPEN&&typeof window.openQuoteModalLegacy==="function"){const original=window.openQuoteModalLegacy;window.openQuoteModalLegacy=function(customerId){const oldOpen=window.openModal;window.openModal=function(title,body){return oldOpen.call(this,title,enhanceQuoteEditorBody(body,customerId));};try{return original.apply(this,arguments);}finally{window.openModal=oldOpen;}};window.__KUTFOPLUSZ_QUOTE_UI_PATCH_OPEN=true;}
    if(!window.__KUTFOPLUSZ_QUOTE_UI_PATCH_CUSTOMER&&typeof window.quoteCustomerChanged==="function"){const original=window.quoteCustomerChanged;window.quoteCustomerChanged=function(){const r=original.apply(this,arguments);filterQuoteProjects();return r;};window.__KUTFOPLUSZ_QUOTE_UI_PATCH_CUSTOMER=true;}
    if(!window.__KUTFOPLUSZ_QUOTE_UI_PATCH_PROJECT&&typeof window.quoteProjectChanged==="function"){const original=window.quoteProjectChanged;window.quoteProjectChanged=function(){const cid=String(document.getElementById("q_customer")?.value||"").trim(),pid=String(document.getElementById("q_project")?.value||"").trim();if(cid&&pid&&!projectBelongsToCustomer(pid,cid)){document.getElementById("q_project").value="";filterQuoteProjects();if(typeof window.toast==="function")window.toast("Ez a projekt nem tartozik a kiválasztott ügyfélhez.");return false;}const r=original.apply(this,arguments);filterQuoteProjects();return r;};window.__KUTFOPLUSZ_QUOTE_UI_PATCH_PROJECT=true;}
    if(!window.__KUTFOPLUSZ_QUOTE_UI_PATCH_SAVE&&typeof window.saveQuoteFromTemplate==="function"){const original=window.saveQuoteFromTemplate;window.saveQuoteFromTemplate=function(){const cid=String(document.getElementById("q_customer")?.value||"").trim(),pid=String(document.getElementById("q_project")?.value||"").trim();if(!cid||!pid||!projectBelongsToCustomer(pid,cid)){if(typeof window.toast==="function")window.toast("Az ajánlat csak a kiválasztott ügyfél saját projektjéhez menthető.");return false;}return original.apply(this,arguments);};window.__KUTFOPLUSZ_QUOTE_UI_PATCH_SAVE=true;}
    if(!(window.__KUTFOPLUSZ_QUOTE_UI_PATCH_OPEN&&window.__KUTFOPLUSZ_QUOTE_UI_PATCH_CUSTOMER&&window.__KUTFOPLUSZ_QUOTE_UI_PATCH_PROJECT&&window.__KUTFOPLUSZ_QUOTE_UI_PATCH_SAVE))setTimeout(install,0);
  }
  window.KUTFOPLUSZ_QUOTE_UI_PATCH=PATCH_VERSION;
  window.KUTFOPLUSZ_QUOTE_UI_PATCH_TEST=function(){const rows=priceRows(),p=projects()[0],cid=p?String(p.customerId||p.clientId||""):"";return{patch:PATCH_VERSION,diameters:rows.map(x=>String(x.diameter)),has160:rows.some(x=>String(x.diameter).trim()==="160"),projectCustomerCheck:p?projectBelongsToCustomer(p.id,cid):null,threeFieldLayout:true,fullPagePreview:true};};
  install();window.addEventListener("load",install,{once:false});
})();
