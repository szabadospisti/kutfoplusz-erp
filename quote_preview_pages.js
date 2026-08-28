/* Kútfő Plusz ERP 2.0 – quote editor compatibility wrapper */
(function(){
  document.write('<script src="https://raw.githubusercontent.com/szabadospisti/kutfoplusz-erp/acc20abf63d707a2bc7a09aadcd38363478bdb1a/quote_preview_pages.js"><\\/script>');
})();
(function(){
  "use strict";
  const PATCH_VERSION="ERP2.0-QUOTE-UI-FIX-2026-08-28-03";
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

  function syncCurrentQuoteSubject(q){
    if(!q)return q;
    const name=String(q.name||"").trim();
    const diameter=String(q.pipeDiameter||"").replace(/[^0-9.,]/g,"").trim();
    const depth=String(q.depth||"").replace(/[^0-9.,]/g,"").trim();
    if(name && diameter && depth) q.subject=`${name} - ${diameter} mm - ${depth} m`;
    return q;
  }

  function installCurrentDataPreview(){
    if(typeof window.collectQuoteTemplate==="function"&&!window.__KUTFOPLUSZ_QUOTE_COLLECT_CURRENT){
      const originalCollect=window.collectQuoteTemplate;
      window.collectQuoteTemplate=function(){return syncCurrentQuoteSubject(originalCollect.apply(this,arguments));};
      window.__KUTFOPLUSZ_QUOTE_COLLECT_CURRENT=true;
    }
    if(typeof window.previewQuote==="function"&&!window.__KUTFOPLUSZ_QUOTE_PREVIEW_TAB){
      window.previewQuote=function(){
        const q=syncCurrentQuoteSubject(window.collectQuoteTemplate());
        const w=window.open("","_blank");
        if(!w){alert("A böngésző blokkolta az új lap megnyitását. Engedélyezd az előugró ablakokat ehhez az oldalhoz.");return;}
        const safeTitle=String(q.id||"Árajánlat").replace(/[<>&\"']/g,c=>({"<":"&lt;",">":"&gt;","&":"&amp;","\"":"&quot;","'":"&#39;"}[c]));
        w.document.open();
        w.document.write(`<html><head><meta charset="utf-8"><title>${safeTitle}</title><style>
          @page{size:auto;margin:0}html,body{margin:0;padding:0;background:#e5e7eb;color:#111;font-family:Arial,sans-serif}
          .qv-toolbar{position:sticky;top:0;z-index:100;display:flex;gap:8px;justify-content:flex-end;padding:12px 16px;background:#fff;border-bottom:1px solid #dbe2e9;box-shadow:0 2px 8px rgba(0,0,0,.08)}
          .qv-toolbar button{border:0;border-radius:8px;padding:9px 14px;background:#1d4ed8;color:#fff;font-weight:700;cursor:pointer}.qv-toolbar .secondary{background:#eff6ff;color:#1d4ed8}
          .qv-document{padding:24px;display:flex;flex-direction:column;align-items:center;gap:20px}
          .qv-page{position:relative;width:1020px;height:1320px;page-break-after:always;overflow:hidden;background:#fff;box-shadow:0 5px 25px rgba(0,0,0,.12)}
          .qv-bg{position:absolute;z-index:1;left:0;top:0;width:1020px;height:1320px;display:block;image-rendering:auto}
          .qv-white{position:absolute;background:#fff;z-index:5}.qv-text{position:absolute;z-index:6;font-family:"Times New Roman",serif;font-size:15px;font-weight:400;line-height:1.25;color:#111;white-space:pre-wrap}
          .qv-wrap{white-space:normal}.qv-right{text-align:right}.qv-bold{font-weight:700}.qv-blue-bold{font-weight:700;color:#4f81bd}
          @media print{body{background:#fff}.qv-toolbar{display:none!important}.qv-document{padding:0;gap:0}.qv-page{box-shadow:none}}
        </style></head><body><div class="qv-toolbar"><button class="secondary" onclick="window.close()">Vissza</button><button onclick="window.print()">PDF / Nyomtatás</button></div><div class="qv-document">${window.buildExactPdfPreview(q)}</div></body></html>`);
        w.document.close();
        w.focus();
      };
      window.__KUTFOPLUSZ_QUOTE_PREVIEW_TAB=true;
    }
  }

  function install(){
    installLayout();
    installCurrentDataPreview();
    if(!window.__KUTFOPLUSZ_QUOTE_UI_PATCH_OPEN&&typeof window.openQuoteModalLegacy==="function"){const original=window.openQuoteModalLegacy;window.openQuoteModalLegacy=function(customerId){const oldOpen=window.openModal;window.openModal=function(title,body){return oldOpen.call(this,title,enhanceQuoteEditorBody(body,customerId));};try{return original.apply(this,arguments);}finally{window.openModal=oldOpen;}};window.__KUTFOPLUSZ_QUOTE_UI_PATCH_OPEN=true;}
    if(!window.__KUTFOPLUSZ_QUOTE_UI_PATCH_CUSTOMER&&typeof window.quoteCustomerChanged==="function"){const original=window.quoteCustomerChanged;window.quoteCustomerChanged=function(){const r=original.apply(this,arguments);filterQuoteProjects();return r;};window.__KUTFOPLUSZ_QUOTE_UI_PATCH_CUSTOMER=true;}
    if(!window.__KUTFOPLUSZ_QUOTE_UI_PATCH_PROJECT&&typeof window.quoteProjectChanged==="function"){const original=window.quoteProjectChanged;window.quoteProjectChanged=function(){const cid=String(document.getElementById("q_customer")?.value||"").trim(),pid=String(document.getElementById("q_project")?.value||"").trim();if(cid&&pid&&!projectBelongsToCustomer(pid,cid)){document.getElementById("q_project").value="";filterQuoteProjects();if(typeof window.toast==="function")window.toast("Ez a projekt nem tartozik a kiválasztott ügyfélhez.");return false;}const r=original.apply(this,arguments);filterQuoteProjects();return r;};window.__KUTFOPLUSZ_QUOTE_UI_PATCH_PROJECT=true;}
    if(!window.__KUTFOPLUSZ_QUOTE_UI_PATCH_SAVE&&typeof window.saveQuoteFromTemplate==="function"){const original=window.saveQuoteFromTemplate;window.saveQuoteFromTemplate=function(){const cid=String(document.getElementById("q_customer")?.value||"").trim(),pid=String(document.getElementById("q_project")?.value||"").trim();if(!cid||!pid||!projectBelongsToCustomer(pid,cid)){if(typeof window.toast==="function")window.toast("Az ajánlat csak a kiválasztott ügyfél saját projektjéhez menthető.");return false;}return original.apply(this,arguments);};window.__KUTFOPLUSZ_QUOTE_UI_PATCH_SAVE=true;}
    if(!(window.__KUTFOPLUSZ_QUOTE_UI_PATCH_OPEN&&window.__KUTFOPLUSZ_QUOTE_UI_PATCH_CUSTOMER&&window.__KUTFOPLUSZ_QUOTE_UI_PATCH_PROJECT&&window.__KUTFOPLUSZ_QUOTE_UI_PATCH_SAVE&&window.__KUTFOPlusz_QUOTE_PREVIEW_TAB))setTimeout(install,0);
  }
  window.KUTFOPLUSZ_QUOTE_UI_PATCH=PATCH_VERSION;
  window.KUTFOPLUSZ_QUOTE_UI_PATCH_TEST=function(){const rows=priceRows(),p=projects()[0],cid=p?String(p.customerId||p.clientId||""):"";return{patch:PATCH_VERSION,diameters:rows.map(x=>String(x.diameter)),has160:rows.some(x=>String(x.diameter).trim()==="160"),projectCustomerCheck:p?projectBelongsToCustomer(p.id,cid):null,threeFieldLayout:true,previewNewTab:true,currentDataPreview:true};};
  install();window.addEventListener("load",install,{once:false});
})();
