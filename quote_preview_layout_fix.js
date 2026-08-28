/* Kútfő Plusz ERP 2.0 – PDF preview: fullscreen A4 viewer */
(function(){
  "use strict";
  const PATCH="ERP2.0-QUOTE-PREVIEW-FULLSCREEN-A4-2026-08-28-04";
  let raf=0;

  function appLogoSrc(){
    const imgs=[...document.images].filter(function(img){return !img.closest(".qv-page")&&img.complete&&img.naturalWidth>0;});
    const hit=imgs.find(function(img){const s=(String(img.alt||"")+" "+String(img.src||"")).toLowerCase();return /kutf|kút|plusz|logo/.test(s);});
    return hit?hit.src:"";
  }

  function findModal(page){
    let el=page,dialog=null,content=null,body=null;
    for(let i=0;i<14&&el;i++,el=el.parentElement){
      if(!body&&(el.classList?.contains("modalbody")||el.classList?.contains("modal-body")||el.getAttribute?.("data-modal-body")==="true"))body=el;
      if(!content&&(el.classList?.contains("modalbox")||el.classList?.contains("modal-content")))content=el;
      if(!dialog&&(el.classList?.contains("modal")||el.classList?.contains("modal-dialog")||el.getAttribute?.("role")==="dialog"))dialog=el;
    }
    return{dialog,content,body};
  }

  function injectFullscreenStyle(){
    if(document.getElementById("kutfo-quote-preview-fullscreen-style"))return;
    const s=document.createElement("style");
    s.id="kutfo-quote-preview-fullscreen-style";
    s.textContent=`
      body:has(.qv-page) .modal{padding:0 !important;place-items:stretch !important;}
      body:has(.qv-page) .modalbox{width:100vw !important;max-width:none !important;height:100vh !important;max-height:none !important;border-radius:0 !important;overflow:hidden !important;display:flex !important;flex-direction:column !important;}
      body:has(.qv-page) .modalhead{flex:0 0 auto !important;}
      body:has(.qv-page) .modalbody{flex:1 1 auto !important;min-height:0 !important;height:auto !important;overflow:hidden !important;padding:12px 24px !important;background:#f3f4f6 !important;}
      body:has(.qv-page) .modalfoot{flex:0 0 auto !important;margin-top:0 !important;padding:10px 0 !important;}
    `;
    document.head.appendChild(s);
  }

  function fitPage(page){
    if(!page||!page.isConnected)return;
    const m=findModal(page),naturalW=page.offsetWidth||1020,naturalH=page.offsetHeight||1400;
    const availableW=Math.max(300,window.innerWidth-48),availableH=Math.max(300,window.innerHeight-150);
    const scale=Math.min(1,availableW/naturalW,availableH/naturalH);
    page.style.transformOrigin="top center";
    page.style.transform="scale("+scale+")";
    page.style.width=naturalW+"px";
    page.style.height=naturalH+"px";
    page.style.margin="0 auto";
    page.style.flex="0 0 auto";
    page.style.boxSizing="border-box";
    page.dataset.kutfoPreviewScale=String(scale);
    if(m.body){
      m.body.style.display="flex";
      m.body.style.flexDirection="column";
      m.body.style.alignItems="center";
      m.body.style.justifyContent="flex-start";
      m.body.style.overflow="hidden";
      m.body.style.width="100%";
      m.body.style.height="auto";
      m.body.style.maxHeight="none";
      m.body.style.boxSizing="border-box";
      m.body.style.padding="12px 24px";
      m.body.style.background="#f3f4f6";
    }
  }

  function fitModal(page){
    const m=findModal(page);
    if(m.dialog){
      m.dialog.style.width="100vw";
      m.dialog.style.maxWidth="100vw";
      m.dialog.style.height="100vh";
      m.dialog.style.maxHeight="100vh";
      m.dialog.style.margin="0";
      m.dialog.style.padding="0";
    }
    if(m.content){
      m.content.style.width="100vw";
      m.content.style.maxWidth="100vw";
      m.content.style.height="100vh";
      m.content.style.maxHeight="100vh";
      m.content.style.margin="0";
      m.content.style.borderRadius="0";
      m.content.style.overflow="hidden";
      m.content.style.display="flex";
      m.content.style.flexDirection="column";
    }
    if(m.body){
      m.body.style.flex="1 1 auto";
      m.body.style.minHeight="0";
      m.body.style.overflow="hidden";
    }
  }

  function repairLogo(page){
    const src=appLogoSrc(),imgs=page.querySelectorAll("img");
    if(!src||!imgs.length)return;
    const logo=imgs[0];
    logo.src=src;
    logo.removeAttribute("srcset");
    logo.style.background="transparent";
    logo.style.objectFit="contain";
  }

  function run(){
    injectFullscreenStyle();
    document.querySelectorAll(".qv-page").forEach(function(page){fitModal(page);fitPage(page);repairLogo(page);});
  }
  function schedule(){if(raf)return;raf=requestAnimationFrame(function(){raf=0;run();});}
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("resize",schedule);
  window.addEventListener("load",schedule);
  window.KUTFOPLUSZ_QUOTE_PREVIEW_VIEWPORT_FIX=PATCH;
  schedule();
})();
