/*
 * Kútfő Plusz ERP 2.0 — quote UI/DOCX compatibility layer
 * PROJECT NAVIGATION FIX: project ids are normalized to strings before routing.
 */
(function(){
  "use strict";
  const PATCH="ERP2.0-QUOTE-DOCX-AND-PROJECT-NAV-FIX-2026-08-30-30";

  function getItems(){
    try{if(typeof quoteItems!=="undefined"&&Array.isArray(quoteItems))return quoteItems;}catch(e){}
    return Array.isArray(window.quoteItems)?window.quoteItems:null;
  }
  function loadJSZip(urls,index){
    if(window.JSZip)return Promise.resolve(window.JSZip); index=index||0;
    if(index>=urls.length)return Promise.reject(new Error("JSZip nem tölthető be egyik forrásból sem."));
    return new Promise(function(resolve,reject){const s=document.createElement("script");s.src=urls[index];s.async=false;s.dataset.kutfoJszip="1";s.onload=function(){if(window.JSZip)resolve(window.JSZip);else loadJSZip(urls,index+1).then(resolve,reject);};s.onerror=function(){loadJSZip(urls,index+1).then(resolve,reject);};document.head.appendChild(s);});
  }
  function ensureJSZip(){
    if(window.JSZip)return Promise.resolve(window.JSZip);
    if(window.__KUTFOPLUSZ_JSZIP_PROMISE)return window.__KUTFOPLUSZ_JSZIP_PROMISE;
    return window.__KUTFOPLUSZ_JSZIP_PROMISE=loadJSZip(["jszip.min.js","https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/dist/jszip.min.js","https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"],0);
  }
  function removePreviewControls(){
    document.querySelectorAll("button,a").forEach(function(el){const text=String(el.textContent||"").replace(/\s+/g," ").trim();if(/Előnézet\s*\/\s*PDF/i.test(text)||/PDF\s*\/\s*Nyomtatás/i.test(text)||/Nyomtatás\s*\/\s*PDF/i.test(text))el.remove();});
    document.querySelectorAll(".qv-page,.qv-wrap-modal").forEach(function(el){const modal=el.closest(".modal");if(modal&&/PDF előnézet/i.test(String(modal.textContent||"")))modal.remove();});
  }
  function disablePreviewFunctions(){
    if(typeof window.previewQuote==="function"&&!window.__KUTFOPLUSZ_PREVIEW_DISABLED){window.previewQuote=function(){if(typeof window.toast==="function")window.toast("A PDF/előnézet funkció ki van kapcsolva.");return false;};window.__KUTFOPLUSZ_PREVIEW_DISABLED=true;}
    if(typeof window.printExactPdfPreview==="function"&&!window.__KUTFOPLUSZ_PRINT_PREVIEW_DISABLED){window.printExactPdfPreview=function(){if(typeof window.toast==="function")window.toast("A PDF/nyomtatás funkció ki van kapcsolva.");return false;};window.__KUTFOPLUSZ_PRINT_PREVIEW_DISABLED=true;}
    if(typeof window.printQuote==="function"&&!window.__KUTFOPLUSZ_PRINT_QUOTE_DISABLED){window.printQuote=function(){if(typeof window.toast==="function")window.toast("A PDF/nyomtatás funkció ki van kapcsolva. DOCX export használható.");return false;};window.__KUTFOPLUSZ_PRINT_QUOTE_DISABLED=true;}
  }
  function markManualPriceFromEditor(){const items=getItems();if(!items)return;document.querySelectorAll("#q_items tr").forEach(function(row,i){const cells=row.children,target=document.activeElement;if(!target||!cells[3]||!cells[3].contains(target))return;if(items[i])items[i].priceManual=true;});}
  function restoreManualPrices(saved){const items=getItems();if(!items||!Array.isArray(saved))return;items.forEach(function(item,i){const source=saved[i];if(!item||!source)return;if(source.priceManual){item.priceManual=true;const p=Number(source.price);if(Number.isFinite(p))item.price=p;}else if(item.priceManual===undefined)item.priceManual=false;});}

  function normalizeProjectIds(){
    try{
      if(typeof db==="undefined"||!db||!Array.isArray(db.projects))return;
      let changed=false;const ids=new Map();
      db.projects.forEach(function(p){if(!p||p.id==null)return;const old=p.id,newId=String(p.id);ids.set(String(old),newId);if(old!==newId){p.id=newId;changed=true;}});
      ["quotes","worklogs","documents","services","purchases","stockMovements","invoices"].forEach(function(key){if(!Array.isArray(db[key]))return;db[key].forEach(function(r){if(!r)return;["projectId","sourceProjectId","linkedProjectId"].forEach(function(field){if(r[field]!=null){const next=ids.get(String(r[field]));if(next&&r[field]!==next){r[field]=next;changed=true;}}});});});
      if(changed&&typeof save==="function")save();
    }catch(e){console.warn("Projektazonosító-normalizálás:",e);}
  }
  function currentProject(){try{let pid=null;if(typeof window.projectPageId!=="undefined"&&window.projectPageId)pid=window.projectPageId;if(!pid&&typeof db!=="undefined"&&db&&db.ui&&db.ui.openProjectId)pid=db.ui.openProjectId;if(!pid){const raw=String(location.hash||"").replace(/^#\//,"");if(raw.indexOf("project/")===0)pid=decodeURIComponent(raw.split("/")[1]||"");}if(typeof db!=="undefined"&&db&&Array.isArray(db.projects)&&pid)return db.projects.find(function(p){return String(p.id)===String(pid);})||null;}catch(e){}return null;}
  function acceptedQuoteForProject(p){try{if(!p||typeof db==="undefined"||!db||!Array.isArray(db.quotes))return null;const qs=db.quotes.filter(function(q){return String(q.projectId||"")===String(p.id);});const accepted=qs.filter(function(q){return String(q.status||"")==="Elfogadva";});return accepted.length?accepted[accepted.length-1]:null;}catch(e){return null;}}
  function projectContractValue(p){const q=acceptedQuoteForProject(p);if(q&&typeof window.quoteNetValue==="function")return Number(window.quoteNetValue(q))||0;if(q)return Number(q.netTotal||q.net||0)||0;return Number(p&&p.value)||0;}
  function normalizeDiameterText(text){let s=String(text||"").replace(/\s+/g," ").trim();s=s.replace(/\s*Ø\s*/gi," ").replace(/\s*mm\b/gi," mm");const m=s.match(/(?:^|\s)(\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?)\s*mm\b/i);if(!m)return s;const d=m[1].replace(/\s+/g,"").replace(/,/g,".");const prefix=s.slice(0,m.index||0).trim();const suffix=s.slice((m.index||0)+m[0].length).trim();return(prefix+" Ø "+d+" mm"+(suffix?" "+suffix:"" )).replace(/\s+/g," ").trim();}
  function normalizeProjectUi(){const p=currentProject(),box=document.querySelector(".project-hero-kpis");if(!p||!box)return;const h=document.querySelector("h1");if(h){const txt=String(h.textContent||"");if(/\d+(?:[.,]\d+)?(?:\s*\/\s*\d+(?:[.,]\d+)?)?\s*Ø?\s*mm\b/i.test(txt)){const n=normalizeDiameterText(txt);if(n&&n!==txt)h.textContent=n;}}const cards=Array.from(box.querySelectorAll(":scope > .card"));if(cards.length<4)return;const contract=projectContractValue(p),cost=Number(p.cost)||0,profit=contract-cost;const labels=["Készültség","Szerződéses érték","Tényleges költség","Fedezet"];const values=[(Number(p.progress)||0)+"%",typeof window.money==="function"?window.money(contract):contract.toLocaleString("hu-HU")+" Ft",typeof window.money==="function"?window.money(cost):cost.toLocaleString("hu-HU")+" Ft",typeof window.money==="function"?window.money(profit):profit.toLocaleString("hu-HU")+" Ft"];cards.forEach(function(card,i){const label=card.querySelector(".label"),value=card.querySelector(".value");if(label)label.textContent=labels[i];if(value)value.textContent=values[i];if(i===3&&value){value.classList.toggle("green",profit>=0);value.classList.toggle("red",profit<0);}});}
  function installProjectUiFix(){if(window.__KUTFOPLUSZ_PROJECT_UI_FIX)return;window.__KUTFOPLUSZ_PROJECT_UI_FIX=true;normalizeProjectIds();normalizeProjectUi();const observer=new MutationObserver(function(){normalizeProjectIds();normalizeProjectUi();});observer.observe(document.documentElement,{childList:true,subtree:true});}

  function patchFunctions(){
    normalizeProjectIds();
    installDocxDependencyGuard();installManualPriceTracking();disablePreviewFunctions();installProjectUiFix();
    if(typeof window.openProjectPage==="function"&&!window.__KUTFOPLUSZ_PROJECT_NAV_WRAP){
      const originalProjectOpen=window.openProjectPage;
      window.openProjectPage=function(){normalizeProjectIds();return originalProjectOpen.apply(this,arguments);};
      window.__KUTFOPLUSZ_PROJECT_NAV_WRAP=true;
    }
    if(typeof window.openQuotePage==="function"&&!window.__KUTFOPLUSZ_DOCX_OPEN_PAGE){const original=window.openQuotePage;window.openQuotePage=function(){const id=arguments[0],q=(typeof db!=="undefined"&&db&&Array.isArray(db.quotes))?db.quotes.find(x=>String(x.id)===String(id)):null;const result=original.apply(this,arguments);if(q)setTimeout(function(){const items=getItems();if(items&&Array.isArray(q.items))items.forEach(function(item,i){const saved=q.items[i];if(saved){item.priceManual=!!saved.priceManual;if(saved.priceManual&&Number.isFinite(Number(saved.price)))item.price=Number(saved.price);}});},0);return result;};window.__KUTFOPLUSZ_DOCX_OPEN_PAGE=true;}
    if(typeof window.editQuote==="function"&&!window.__KUTFOPLUSZ_DOCX_EDIT_QUOTE){const originalEditQuote=window.editQuote;window.editQuote=function(){const id=arguments[0],q=(typeof db!=="undefined"&&db&&Array.isArray(db.quotes))?db.quotes.find(x=>String(x.id)===String(id)):null;const saved=q&&Array.isArray(q.items)?q.items.map(function(x){return {price:Number(x.price),priceManual:!!x.priceManual};}):null;const result=originalEditQuote.apply(this,arguments);if(saved)setTimeout(function(){restoreManualPrices(saved);if(typeof window.recalculateQuoteMainItem==="function")window.recalculateQuoteMainItem(false);restoreManualPrices(saved);if(typeof window.renderQuoteEditor==="function")window.renderQuoteEditor();},120);return result;};window.__KUTFOPLUSZ_DOCX_EDIT_QUOTE=true;}
    if(typeof window.recalculateQuoteMainItem==="function"&&!window.__KUTFOPLUSZ_DOCX_RECALC){const original=window.recalculateQuoteMainItem;window.recalculateQuoteMainItem=function(){const items=getItems(),before=items&&items[0]?items[0]:null,manualPrice=!!(before&&before.priceManual),preservedPrice=before?Number(before.price):null;const r=original.apply(this,arguments),after=getItems();if(after&&after[0]&&manualPrice&&Number.isFinite(preservedPrice)){after[0].price=preservedPrice;after[0].priceManual=true;}return r;};window.__KUTFOPLUSZ_DOCX_RECALC=true;}
    if(typeof window.collectQuoteTemplate==="function"&&!window.__KUTFOPLUSZ_DOCX_COLLECT){const original=window.collectQuoteTemplate;window.collectQuoteTemplate=function(){const result=original.apply(this,arguments),items=getItems();if(result&&Array.isArray(result.items)&&items)result.items.forEach(function(item,i){const source=items[i];if(!source)return;item.priceManual=!!source.priceManual;if(source.priceManual&&Number.isFinite(Number(source.price)))item.price=Number(source.price);});return result;};window.__KUTFOPLUSZ_DOCX_COLLECT=true;}
  }
  function installDocxDependencyGuard(){if(window.__KUTFOPLUSZ_DOCX_DEP_GUARD)return;window.__KUTFOPLUSZ_DOCX_DEP_GUARD=true;window.KUTFOPLUSZ_ensureJSZip=ensureJSZip;ensureJSZip().catch(function(){});document.addEventListener("click",function(ev){const target=ev.target&&ev.target.closest?ev.target.closest("button,a"):null;if(!target||!/Word\s*\(\.docx\)/i.test(String(target.textContent||"")))return;if(window.JSZip)return;ev.preventDefault();ev.stopPropagation();ensureJSZip().then(function(){if(document.contains(target))target.click();}).catch(function(err){if(typeof window.toast==="function")window.toast("DOCX export hiba: "+String(err&&err.message||err));});},true);}
  function installManualPriceTracking(){if(window.__KUTFOPLUSZ_MANUAL_PRICE_TRACKING)return;window.__KUTFOPLUSZ_MANUAL_PRICE_TRACKING=true;document.addEventListener("input",function(e){const t=e.target;if(!t||!t.closest)return;const row=t.closest("#q_items tr");if(!row)return;const items=getItems();if(!items)return;const rows=Array.from(document.querySelectorAll("#q_items tr"));const i=rows.indexOf(row);if(i<0||!items[i])return;const cells=row.children;if(cells[3]&&cells[3].contains(t))items[i].priceManual=true;},{capture:true});}
  function install(){patchFunctions();markManualPriceFromEditor();removePreviewControls();if(!(window.__KUTFOPLUSZ_DOCX_RECALC&&window.__KUTFOPLUSZ_DOCX_COLLECT&&window.__KUTFOPLUSZ_DOCX_OPEN_PAGE&&window.__KUTFOPLUSZ_DOCX_EDIT_QUOTE))setTimeout(install,50);}
  window.KUTFOPLUSZ_QUOTE_VISUAL_FIX=PATCH;install();window.addEventListener("load",install,{once:false});
  if(!window.__KUTFOPLUSZ_PREVIEW_REMOVAL_OBSERVER){window.__KUTFOPLUSZ_PREVIEW_REMOVAL_OBSERVER=true;new MutationObserver(function(){removePreviewControls();disablePreviewFunctions();normalizeProjectIds();normalizeProjectUi();}).observe(document.documentElement,{childList:true,subtree:true});}
})();