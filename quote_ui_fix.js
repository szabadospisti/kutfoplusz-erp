/* Kútfő Plusz ERP 2.0 — quote UI/DOCX compatibility layer */
(function(){
  "use strict";
  const PATCH="ERP2.0-QUOTE-DOCX-AND-PROJECT-NAV-FIX-2026-08-30-33";
  function getItems(){try{if(typeof quoteItems!=="undefined"&&Array.isArray(quoteItems))return quoteItems;}catch(e){}return Array.isArray(window.quoteItems)?window.quoteItems:null;}
  function loadJSZip(urls,index){if(window.JSZip)return Promise.resolve(window.JSZip);index=index||0;if(index>=urls.length)return Promise.reject(new Error("JSZip nem tölthető be."));return new Promise(function(resolve,reject){const s=document.createElement("script");s.src=urls[index];s.async=false;s.onload=function(){if(window.JSZip)resolve(window.JSZip);else loadJSZip(urls,index+1).then(resolve,reject);};s.onerror=function(){loadJSZip(urls,index+1).then(resolve,reject);};document.head.appendChild(s);});}
  function ensureJSZip(){if(window.JSZip)return Promise.resolve(window.JSZip);if(window.__KUTFOPLUSZ_JSZIP_PROMISE)return window.__KUTFOPLUSZ_JSZIP_PROMISE;return window.__KUTFOPLUSZ_JSZIP_PROMISE=loadJSZip(["jszip.min.js","https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/dist/jszip.min.js","https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"],0);}
  function removePreviewControls(){document.querySelectorAll("button,a").forEach(function(el){const t=String(el.textContent||"").replace(/\s+/g," ").trim();if(/Előnézet\s*\/\s*PDF|PDF\s*\/\s*Nyomtatás|Nyomtatás\s*\/\s*PDF/i.test(t))el.remove();});}
  function disablePreviewFunctions(){
    if(typeof window.previewQuote==="function"&&!window.__KUTFOPLUSZ_previewQuote){window.previewQuote=function(){if(typeof window.toast==="function")window.toast("A PDF/előnézet funkció ki van kapcsolva.");return false;};window.__KUTFOPLUSZ_previewQuote=true;}
    if(typeof window.printExactPdfPreview==="function"&&!window.__KUTFOPLUSZ_printExactPdfPreview){window.printExactPdfPreview=function(){if(typeof window.toast==="function")window.toast("A PDF/előnézet funkció ki van kapcsolva.");return false;};window.__KUTFOPLUSZ_printExactPdfPreview=true;}
    if(typeof window.printQuote==="function"&&!window.__KUTFOPLUSZ_printQuote){window.printQuote=function(){if(typeof window.toast==="function")window.toast("A PDF/nyomtatás funkció ki van kapcsolva. DOCX export használható.");return false;};window.__KUTFOPLUSZ_printQuote=true;}
  }
  function normalizeProjectIds(){try{if(typeof db==="undefined"||!db||!Array.isArray(db.projects))return;let changed=false;const ids=new Map();db.projects.forEach(function(p){if(!p||p.id==null)return;const n=String(p.id);ids.set(n,n);if(p.id!==n){p.id=n;changed=true;}});["quotes","worklogs","documents","services","purchases","stockMovements","invoices"].forEach(function(k){if(!Array.isArray(db[k]))return;db[k].forEach(function(r){if(!r)return;["projectId","sourceProjectId","linkedProjectId"].forEach(function(f){if(r[f]!=null){const n=ids.get(String(r[f]));if(n&&r[f]!==n){r[f]=n;changed=true;}}});});});if(changed&&typeof save==="function")save();}catch(e){console.warn("Projektazonosító-normalizálás:",e);}}
  function currentProject(){try{let pid=null;if(window.projectPageId)pid=window.projectPageId;if(!pid&&typeof db!=="undefined"&&db&&db.ui&&db.ui.openProjectId)pid=db.ui.openProjectId;if(!pid){const r=String(location.hash||"").replace(/^#\//,"");if(r.indexOf("project/")===0)pid=decodeURIComponent(r.split("/")[1]||"");}if(typeof db!=="undefined"&&db&&Array.isArray(db.projects)&&pid)return db.projects.find(function(p){return String(p.id)===String(pid)})||null;}catch(e){}return null;}
  function acceptedQuoteForProject(p){try{if(!p||typeof db==="undefined"||!db||!Array.isArray(db.quotes))return null;const q=db.quotes.filter(x=>String(x.projectId||"")===String(p.id)).filter(x=>String(x.status||"")==="Elfogadva");return q.length?q[q.length-1]:null;}catch(e){return null;}}
  function projectContractValue(p){const q=acceptedQuoteForProject(p);if(q&&typeof window.quoteNetValue==="function")return Number(window.quoteNetValue(q))||0;if(q)return Number(q.netTotal||q.net||0)||0;return Number(p&&p.value)||0;}
  function normalizeDiameterText(text){let s=String(text||"").replace(/\s+/g," ").trim();s=s.replace(/\s*Ø\s*/gi," ").replace(/\s*mm\b/gi," mm");const m=s.match(/(?:^|\s)(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?)\s*mm\b/i);if(!m)return s;const d=m[1].replace(/\s+/g,"").replace(/,/g,".");const pre=s.slice(0,m.index||0).trim(),post=s.slice((m.index||0)+m[0].length).trim();return(pre+" Ø "+d+" mm"+(post?" "+post:"" )).replace(/\s+/g," ").trim();}
  function normalizeProjectUi(){const p=currentProject(),box=document.querySelector(".project-hero-kpis");if(!p||!box)return;const h=document.querySelector("h1");if(h){const t=String(h.textContent||"");if(/\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?\s*Ø?\s*mm\b/i.test(t)){const n=normalizeDiameterText(t);if(n!==t)h.textContent=n;}}const cards=Array.from(box.querySelectorAll(":scope > .card"));if(cards.length<4)return;const contract=projectContractValue(p),cost=Number(p.cost)||0,profit=contract-cost;const labels=["Készültség","Szerződéses érték","Tényleges költség","Fedezet"],values=[(Number(p.progress)||0)+"%",typeof window.money==="function"?window.money(contract):contract.toLocaleString("hu-HU")+" Ft",typeof window.money==="function"?window.money(cost):cost.toLocaleString("hu-HU")+" Ft",typeof window.money==="function"?window.money(profit):profit.toLocaleString("hu-HU")+" Ft"];cards.forEach(function(c,i){const l=c.querySelector(".label"),v=c.querySelector(".value");if(l)l.textContent=labels[i];if(v)v.textContent=values[i];});}
  function syncQuoteDiameterFromProject(){
  try{
    const sel=document.getElementById("q_pipe_diameter"), pe=document.getElementById("q_project");
    if(!sel||!pe||typeof db==="undefined"||!db)return;
    const pid=String(pe.value||"").trim();
    const p=(Array.isArray(db.projects)?db.projects:[]).find(x=>String(x.id)===pid);
    if(!p)return;
    const w=p.well||{};
    const sections=Array.isArray(w.casingSections)?w.casingSections:[];
    let full="";
    for(const x of sections){
      const type=String(x.type||"").toLowerCase();
      const d=String(x.diameter||x.pipeDiameter||"").trim();
      if(d && (!full || /bél|cső|casing|szűr/.test(type))) full=d;
      if(d && /bél|casing/.test(type)){full=d;break;}
    }
    if(!full){
      const text=String(p.name||p.quoteTitle||"");
      const m=text.match(/(\d+(?:[.,]\d+)?\s*\/\s*\d+(?:[.,]\d+)?)\s*Ø?\s*mm/i) || text.match(/(\d+(?:[.,]\d+)?)\s*Ø?\s*mm/i);
      if(m)full=m[1].replace(/\s+/g,"").replace(/,/g,".");
    }
    if(!full)return;
    const numeric=String(full).split('/')[0].trim();
    let opt=Array.from(sel.options).find(o=>String(o.value)===numeric);
    if(!opt){opt=document.createElement('option');opt.value=numeric;sel.appendChild(opt);}
    opt.textContent=`Ø ${full.replace(/\s+/g,"")} mm`;
    opt.dataset.fullDiameter=full.replace(/\s+/g,"");
    if(String(sel.value)!==numeric)sel.value=numeric;
    sel.dataset.fullDiameter=full.replace(/\s+/g,"");
    try{if(typeof window.recalculateQuoteMainItem==='function')window.recalculateQuoteMainItem();}catch(e){}
  }catch(e){console.warn('Ajánlat átmérő szinkron:',e);}
}
  function installDocxGuard(){if(window.__KUTFOPLUSZ_DOCX_DEP_GUARD)return;window.__KUTFOPLUSZ_DOCX_DEP_GUARD=true;window.KUTFOPLUSZ_ensureJSZip=ensureJSZip;ensureJSZip().catch(function(){});}
  function installManualTracking(){if(window.__KUTFOPLUSZ_MANUAL_PRICE_TRACKING)return;window.__KUTFOPLUSZ_MANUAL_PRICE_TRACKING=true;document.addEventListener("input",function(e){const t=e.target;if(!t||!t.closest)return;const row=t.closest("#q_items tr");if(!row)return;const items=getItems();if(!items)return;const rows=Array.from(document.querySelectorAll("#q_items tr")),i=rows.indexOf(row);if(i<0||!items[i])return;const cells=row.children;if(cells[3]&&cells[3].contains(t))items[i].priceManual=true;},{capture:true});}
  function patchExport(){if(window.__KUTFOPLUSZ_EXPORT_GUARD)return;window.__KUTFOPLUSZ_EXPORT_GUARD=true;if(typeof window.customerId==="undefined")window.customerId=null;if(typeof window.exportQuoteDoc==="function"){const original=window.exportQuoteDoc;window.exportQuoteDoc=function(){try{const a=arguments[0];let q=null;if(a&&typeof a==="object")q=a;else if(typeof db!=="undefined"&&db&&Array.isArray(db.quotes))q=db.quotes.find(x=>String(x.id)===String(a))||null;if(q&&q.customerId!=null)window.customerId=q.customerId;else if(q&&q.customer_id!=null)window.customerId=q.customer_id;}catch(e){}return original.apply(this,arguments);};}}
  function patch(){normalizeProjectIds();installDocxGuard();installManualTracking();disablePreviewFunctions();patchExport();normalizeProjectUi();syncQuoteDiameterFromProject();if(typeof window.openProjectPage==="function"&&!window.__KUTFOPLUSZ_PROJECT_NAV_WRAP){const o=window.openProjectPage;window.openProjectPage=function(){normalizeProjectIds();const r=o.apply(this,arguments);setTimeout(normalizeProjectUi,0);return r;};window.__KUTFOPLUSZ_PROJECT_NAV_WRAP=true;}if(typeof window.openQuotePage==="function"&&!window.__KUTFOPLUSZ_QUOTE_OPEN_WRAP){const o=window.openQuotePage;window.openQuotePage=function(){const r=o.apply(this,arguments);setTimeout(function(){removePreviewControls();disablePreviewFunctions();syncQuoteDiameterFromProject();},0);return r;};window.__KUTFOPLUSZ_QUOTE_OPEN_WRAP=true;}removePreviewControls();}
  window.KUTFOPLUSZ_QUOTE_VISUAL_FIX=PATCH;patch();window.addEventListener("load",patch);window.addEventListener("hashchange",function(){normalizeProjectIds();setTimeout(function(){normalizeProjectUi();removePreviewControls();disablePreviewFunctions();},0);});setTimeout(patch,300);setTimeout(patch,1200);setTimeout(syncQuoteDiameterFromProject,1500);
})();