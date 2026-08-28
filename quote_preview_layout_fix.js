/* Kútfő Plusz ERP 2.0 – PDF preview: full-page fit */
(function(){
  "use strict";
  const PATCH="ERP2.0-QUOTE-PREVIEW-FULL-PAGE-2026-08-28-02";
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

  function findModal(page){
    let el=page,dialog=null,content=null,body=null;
    for(let i=0;i<10&&el;i++,el=el.parentElement){
      if(!body && (el.classList?.contains("modal-body") || el.getAttribute?.("data-modal-body")==="true")) body=el;
      if(!content && el.classList?.contains("modal-content")) content=el;
      if(!dialog && el.classList?.contains("modal-dialog")) dialog=el;
      if(!dialog && el.getAttribute?.("role")==="dialog") dialog=el;
    }
    return {dialog,content,body};
  }

  function fitPage(page){
    if(!page || !page.isConnected) return;
    const m=findModal(page);
    const naturalW=page.offsetWidth||1020;
    const naturalH=page.offsetHeight||1400;

    /* The goal is deliberately different from the previous patch:
       show the COMPLETE page at once, not merely the complete width. */
    const viewportW=Math.max(320,Math.min(1060,window.innerWidth*0.90)-32);
    const viewportH=Math.max(320,window.innerHeight*0.78);
    const scale=Math.min(1,viewportW/naturalW,viewportH/naturalH);

    page.style.transformOrigin="top left";
    page.style.transform="scale("+scale+")";
    page.style.margin="0";
    page.style.boxSizing="border-box";
    page.style.flex="0 0 auto";
    page.style.width=naturalW+"px";
    page.style.height=naturalH+"px";
    page.dataset.kutfoPreviewScale=String(scale);

    if(m.body){
      m.body.style.display="flex";
      m.body.style.flexDirection="column";
      m.body.style.alignItems="center";
      m.body.style.justifyContent="flex-start";
      m.body.style.overflow="hidden";
      m.body.style.width="100%";
      m.body.style.boxSizing="border-box";
      m.body.style.padding="8px 12px 12px";
    }
  }

  function fitModal(page){
    const m=findModal(page);
    if(m.dialog){
      m.dialog.style.width="94vw";
      m.dialog.style.maxWidth="1100px";
      m.dialog.style.margin="20px auto";
    }
    if(m.content){
      m.content.style.maxHeight="96vh";
      m.content.style.overflow="hidden";
    }
    if(m.body){
      m.body.style.maxHeight="calc(96vh - 105px)";
      m.body.style.minHeight="0";
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
