/* Kútfő Plusz ERP 2.0 — quote UI compatibility loader + list layout correction */
(function(){
  "use strict";
  function patch(){
    if(window.__KPF_QUOTE_LIST_NO_SUBJECT)return;
    if(typeof window.quoteRows!=="function")return;
    const original=window.quoteRows;
    window.quoteRows=function(arr){
      const html=original.apply(this,arguments);
      try{
        const wrap=document.createElement("div");
        wrap.innerHTML=html;
        const table=wrap.querySelector("table");
        if(!table)return html;
        table.querySelectorAll("thead tr,tbody tr").forEach(row=>{
          const cells=row.children;
          if(cells.length>1) row.removeChild(cells[1]);
        });
        return wrap.innerHTML;
      }catch(e){return html;}
    };
    window.__KPF_QUOTE_LIST_NO_SUBJECT=true;
  }
  const s=document.createElement("script");
  s.src="quote_ui_fix_legacy.js?v=20260830";
  s.onload=()=>{patch();setTimeout(patch,50);setTimeout(patch,300);setTimeout(patch,1000);};
  s.onerror=()=>patch();
  document.head.appendChild(s);
})();
