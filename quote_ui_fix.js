/* Kútfő Plusz ERP 2.0 – Word/DOCX export data cleanup
 * PDF/preview support intentionally removed.
 */
(function(){
  "use strict";
  const PATCH="ERP2.0-QUOTE-DOCX-ONLY-FIX-2026-08-29-16";

  function cleanNumber(v){
    const s=String(v??"").trim().replace(/,/g,".");
    const n=Number(s);
    return Number.isFinite(n)?n:null;
  }

  /* Keep quantity, unit and description as separate data fields.
     This fixes the former "1 db 1 db ..." DOCX duplication. */
  function normalizeQuoteItems(){
    if(!Array.isArray(window.quoteItems)) return;
    window.quoteItems.forEach(function(x){
      if(!x || typeof x!=="object") return;
      const m=String(x.desc||"").match(/^\s*(\d+(?:[.,]\d+)?)\s*db\s+(.+)$/i);
      if(m){
        const q=cleanNumber(m[1]);
        if(q!==null) x.qty=q;
        x.unit="db";
        x.desc=m[2].trim();
      }
    });
  }

  function loadJSZip(urls,index){
    if(window.JSZip) return Promise.resolve(window.JSZip);
    index=index||0;
    if(index>=urls.length) return Promise.reject(new Error("JSZip nem tölthető be egyik forrásból sem."));
    return new Promise(function(resolve,reject){
      const s=document.createElement("script");
      s.src=urls[index];
      s.async=false;
      s.dataset.kutfoJszip="1";
      s.onload=function(){
        if(window.JSZip) resolve(window.JSZip);
        else loadJSZip(urls,index+1).then(resolve,reject);
      };
      s.onerror=function(){loadJSZip(urls,index+1).then(resolve,reject);};
      document.head.appendChild(s);
    });
  }

  function ensureJSZip(){
    if(window.JSZip) return Promise.resolve(window.JSZip);
    if(window.__KUTFOPLUSZ_JSZIP_PROMISE) return window.__KUTFOPLUSZ_JSZIP_PROMISE;
    const urls=[
      "https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js",
      "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js"
    ];
    window.__KUTFOPLUSZ_JSZIP_PROMISE=loadJSZip(urls,0);
    return window.__KUTFOPLUSZ_JSZIP_PROMISE;
  }

  function removePreviewControls(){
    document.querySelectorAll("button,a").forEach(function(el){
      const text=String(el.textContent||"").replace(/\s+/g," ").trim();
      if(/Előnézet\s*\/\s*PDF/i.test(text)) el.remove();
      if(/PDF\s*\/\s*Nyomtatás/i.test(text)) el.remove();
    });
    document.querySelectorAll(".qv-page,.qv-wrap-modal").forEach(function(el){
      const modal=el.closest(".modal");
      if(modal && /PDF előnézet/i.test(String(modal.textContent||""))) modal.remove();
    });
  }

  function disablePreviewFunctions(){
    if(typeof window.previewQuote==="function"&&!window.__KUTFOPLUSZ_PREVIEW_DISABLED){
      window.previewQuote=function(){
        if(typeof window.toast==="function") window.toast("A PDF/előnézet funkció ki van kapcsolva.");
        return false;
      };
      window.__KUTFOPLUSZ_PREVIEW_DISABLED=true;
    }
    if(typeof window.printExactPdfPreview==="function"&&!window.__KUTFOPLUSZ_PRINT_PREVIEW_DISABLED){
      window.printExactPdfPreview=function(){
        if(typeof window.toast==="function") window.toast("A PDF/nyomtatás funkció ki van kapcsolva.");
        return false;
      };
      window.__KUTFOPLUSZ_PRINT_PREVIEW_DISABLED=true;
    }
  }

  function installDocxDependencyGuard(){
    ensureJSZip().catch(function(){});
    if(window.__KUTFOPLUSZ_DOCX_JSZIP_GUARD) return;
    window.__KUTFOPLUSZ_DOCX_JSZIP_GUARD=true;
    document.addEventListener("click",function(ev){
      const target=ev.target&&ev.target.closest?ev.target.closest("button,a"):null;
      if(!target || !/Word\s*\(\.docx\)/i.test(String(target.textContent||""))) return;
      if(window.JSZip) return;
      ev.preventDefault();
      ev.stopPropagation();
      ensureJSZip().then(function(){
        if(document.contains(target)) target.click();
      }).catch(function(err){
        if(typeof window.toast==="function") window.toast("DOCX export hiba: "+String(err&&err.message||err));
      });
    },true);
  }

  function patchFunctions(){
    installDocxDependencyGuard();
    disablePreviewFunctions();

    if(typeof window.recalculateQuoteMainItem==="function"&&!window.__KUTFOPLUSZ_DOCX_RECALC){
      const original=window.recalculateQuoteMainItem;
      window.recalculateQuoteMainItem=function(){
        const r=original.apply(this,arguments);
        normalizeQuoteItems();
        return r;
      };
      window.__KUTFOPLUSZ_DOCX_RECALC=true;
    }

    if(typeof window.collectQuoteTemplate==="function"&&!window.__KUTFOPLUSZ_DOCX_COLLECT){
      const original=window.collectQuoteTemplate;
      window.collectQuoteTemplate=function(){
        normalizeQuoteItems();
        return original.apply(this,arguments);
      };
      window.__KUTFOPLUSZ_DOCX_COLLECT=true;
    }
  }

  function install(){
    patchFunctions();
    normalizeQuoteItems();
    removePreviewControls();
    if(!(window.__KUTFOPLUSZ_DOCX_RECALC&&window.__KUTFOPLUSZ_DOCX_COLLECT)) setTimeout(install,50);
  }

  window.KUTFOPLUSZ_QUOTE_VISUAL_FIX=PATCH;
  install();
  window.addEventListener("load",install,{once:false});
  if(!window.__KUTFOPLUSZ_PREVIEW_REMOVAL_OBSERVER){
    window.__KUTFOPLUSZ_PREVIEW_REMOVAL_OBSERVER=true;
    new MutationObserver(function(){removePreviewControls();disablePreviewFunctions();}).observe(document.documentElement,{childList:true,subtree:true});
  }
})();
