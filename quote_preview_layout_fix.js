/* Kútfő Plusz ERP 2.0 – PDF preview: fullscreen A4 viewer */
(function(){
  "use strict";
  const PATCH="ERP2.0-QUOTE-PREVIEW-FULLSCREEN-A4-2026-08-28-03";
  let raf=0;

  function appLogoSrc(){
    const imgs=[...document.images].filter(function(img){return !img.closest(".qv-page")&&img.complete&&img.naturalWidth>0;});
    const hit=imgs.find(function(img){const s=(String(img.alt||"")+" "+String(img.src||"")).toLowerCase();return /kutf|kút|plusz|logo/.test(s);});
    return hit?hit.src:"";
  }

  function findModal(page){
    let el=page,dialog=null,content=null,body=null;
    for(let i=0;i<12&&el;i++,el=el.parentElement){
      if(!body&&(el.classList?.contains("modal-body")||el.getAttribute?.("data-modal-body")==="true"))body=el;
      if(!content&&el.classList?.contains("modal-content"))content=el;
      if(!dialog&&el.classList?.contains("modal-dialog"))dialog=el;
      if(!dialog&&el.getAttribute?.("role")==="dialog")dialog=el;
    }
    return{dialog,content,body};
  }

  function fitPage(page){
    if(!page||!page.isConnected)return;
    const m=findModal(page),naturalW=page.offsetWidth||1020,naturalH=page.offsetHeight||1400;
    const availableW=Math.max(300,window.innerWidth-48),availableH=Math.max(300,window.innerHeight-120);
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
      m.body.style.height="100%";
      m.body.style.maxHeight="none";
      m.body.style.boxSizing="border-box";
      m.body.style.padding="16px 24px";
      m.body.style.background="#f3f4f6";
    }
  }

  function fitModal(page){
    const m=findModal(page);
    if(m.dialog){
      m.dialog.style.width="100vw";
      m.dialog.style.maxWidth="100vw";
      m.dialog.style.height="100vh";
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

  function run(){document.querySelectorAll(".qv-page").forEach(function(page){fitModal(page);fitPage(page);repairLogo(page);});}
  function schedule(){if(raf)return;raf=requestAnimationFrame(function(){raf=0;run();});}
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true});
  window.addEventListener("resize",schedule);
  window.addEventListener("load",schedule);
  window.KUTFOPLUSZ_QUOTE_PREVIEW_VIEWPORT_FIX=PATCH;
  schedule();
})();
