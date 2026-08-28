/* Kútfő Plusz ERP 2.0 – PDF preview viewport/layout fix */
(function(){
  "use strict";
  const PATCH="ERP2.0-QUOTE-PREVIEW-VIEWPORT-FIX-2026-08-28-01";
  let raf=0;

  function appLogoSrc(){
    const imgs=[...document.images].filter(function(img){
      return !img.closest(".qv-page") && img.complete && img.naturalWidth>0;
    });
    const hit=imgs.find(function(img){
      const s=(String(img.alt||"")+" "+String(img.src||"")).toLowerCase();
      return /kutf|kút|plusz|logo/.test(s);
    });
    return hit?hit.src:"";
  }

  function fitPage(page){
    if(!page || !page.isConnected) return;
    const parent=page.parentElement;
    if(!parent) return;

    page.style.transformOrigin="top left";
    page.style.boxSizing="border-box";

    const naturalW=page.offsetWidth||1020;
    const naturalH=page.offsetHeight||1400;
    const available=Math.max(320,(parent.clientWidth||naturalW)-16);
    const scale=Math.min(1,available/naturalW);

    page.style.transform="scale("+scale+")";
    page.style.marginBottom=(-naturalH*(1-scale))+"px";
    page.style.marginRight=(-naturalW*(1-scale))+"px";
    page.dataset.kutfoPreviewScale=String(scale);
  }

  function fitModal(page){
    let el=page;
    let dialog=null,content=null,body=null;
    for(let i=0;i<8&&el;i++,el=el.parentElement){
      if(!body && (el.classList?.contains("modal-body") || el.getAttribute?.("data-modal-body")==="true")) body=el;
      if(!content && el.classList?.contains("modal-content")) content=el;
      if(!dialog && el.classList?.contains("modal-dialog")) dialog=el;
      if(!dialog && el.getAttribute?.("role")==="dialog") dialog=el;
    }
    if(dialog){
      dialog.style.width="94vw";
      dialog.style.maxWidth="1100px";
    }
    if(content){
      content.style.maxHeight="92vh";
      content.style.overflow="hidden";
    }
    if(body){
      body.style.maxHeight="calc(92vh - 110px)";
      body.style.overflowX="hidden";
      body.style.overflowY="auto";
      body.style.width="100%";
      body.style.boxSizing="border-box";
    }
  }

  function repairLogo(page){
    const src=appLogoSrc();
    if(!src) return;
    const imgs=page.querySelectorAll("img");
    if(!imgs.length) return;
    const logo=imgs[0];
    if(logo.dataset.kutfoLogoFixed==="1") return;
    logo.src=src;
    logo.removeAttribute("srcset");
    logo.dataset.kutfoLogoFixed="1";
    logo.style.background="transparent";
  }

  function run(){
    const pages=[...document.querySelectorAll(".qv-page")];
    if(!pages.length) return;
    pages.forEach(function(page){
      fitModal(page);
      fitPage(page);
      repairLogo(page);
    });
  }

  function schedule(){
    if(raf) return;
    raf=requestAnimationFrame(function(){raf=0;run();});
  }

  const observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("resize",schedule);
  window.addEventListener("load",schedule,{once:false});
  window.KUTFOPLUSZ_QUOTE_PREVIEW_VIEWPORT_FIX=PATCH;
  schedule();
})();
