/* Kútfő Plusz ERP 2.0 – quote preview/layout/data cleanup */
(function(){
  "use strict";
  const PATCH="ERP2.0-QUOTE-VISUAL-FIX-2026-08-29-15";

  function cleanNumber(v){
    const s=String(v??"").trim().replace(/,/g,".");
    const n=Number(s);
    return Number.isFinite(n)?n:null;
  }

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

  function normalizeSubject(q){
    if(!q) return q;
    const name=String(q.name||"").trim();
    const diameter=String(q.pipeDiameter||"").replace(/[^0-9.,]/g,"").trim();
    const depth=String(q.depth||"").replace(/[^0-9.,]/g,"").trim();
    if(name&&diameter&&depth){
      const base=name.replace(/\s*-\s*\d+(?:[.,]\d+)?\s*mm\s*-\s*\d+(?:[.,]\d+)?\s*m\s*$/i,"").trim();
      q.subject=(base||name)+" - "+diameter+" mm - "+depth+" m";
    }
    return q;
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

    if(typeof window.recalculateQuoteMainItem==="function"&&!window.__KUTFOPLUSZ_VISUAL_RECALC){
      const original=window.recalculateQuoteMainItem;
      window.recalculateQuoteMainItem=function(){
        const r=original.apply(this,arguments);
        normalizeQuoteItems();
        return r;
      };
      window.__KUTFOPLUSZ_VISUAL_RECALC=true;
    }

    if(typeof window.collectQuoteTemplate==="function"&&!window.__KUTFOPLUSZ_VISUAL_COLLECT){
      const original=window.collectQuoteTemplate;
      window.collectQuoteTemplate=function(){
        normalizeQuoteItems();
        return normalizeSubject(original.apply(this,arguments));
      };
      window.__KUTFOPLUSZ_VISUAL_COLLECT=true;
    }

    if(typeof window.buildExactPdfPreview==="function"&&!window.__KUTFOPLUSZ_VISUAL_PREVIEW){
      const original=window.buildExactPdfPreview;
      window.buildExactPdfPreview=function(q){
        q=normalizeSubject(q);
        const html=original.call(this,q);
        const pages=html.split('<div class="qv-page">');
        if(pages.length<3) return html;
        let p1='<div class="qv-page">'+pages[1];
        let p2='<div class="qv-page">'+pages[2];
        const waterText='Tervezett vízigény: '+String(q.waterNeed||"");
        const waterRegex=new RegExp('(<div class="qv-text[^>]*>)'+waterText.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'(</div>)');
        p2=p2.replace(waterRegex,'');
        if(String(q.waterNeed||"").trim()){
          const escaped=String(q.waterNeed||"").replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
          const addition='<div class="qv-text" style="left:150px;top:1180px;width:500px">Tervezett vízigény: '+escaped+'</div>';
          const end=p1.lastIndexOf('</div>');
          if(end>=0) p1=p1.slice(0,end)+addition+p1.slice(end);
        }
        p2=p2.replace('<div class="qv-page">','<div class="qv-page"><div class="qv-white" style="left:0;top:0;width:1020px;height:225px"></div>');
        return p1+p2;
      };
      window.__KUTFOPLUSZ_VISUAL_PREVIEW=true;
    }
  }

  function install(){
    patchFunctions();
    normalizeQuoteItems();
    if(!(window.__KUTFOPLUSZ_VISUAL_RECALC&&window.__KUTFOPLUSZ_VISUAL_COLLECT&&window.__KUTFOPLUSZ_VISUAL_PREVIEW)) setTimeout(install,50);
  }

  window.KUTFOPLUSZ_QUOTE_VISUAL_FIX=PATCH;
  install();
  window.addEventListener("load",install,{once:false});
})();
