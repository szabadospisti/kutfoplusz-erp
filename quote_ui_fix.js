/* Kútfő Plusz ERP 2.0 — quote list: hide work-name column */
(function(){
  "use strict";
  function removeWorkNameColumn(){
    document.querySelectorAll("table.table").forEach(function(table){
      const head=[...table.querySelectorAll("thead th")];
      const idx=head.findIndex(function(th){
        return /munka\s*\/\s*megnevezés/i.test(String(th.textContent||"").replace(/\s+/g," ").trim());
      });
      if(idx<0)return;
      table.querySelectorAll("tr").forEach(function(row){
        if(row.children[idx])row.removeChild(row.children[idx]);
      });
    });
  }
  function patchQuoteRows(){
    if(typeof window.quoteRows!=="function")return;
    if(window.__KPF_QUOTE_LIST_NO_SUBJECT)return;
    const original=window.quoteRows;
    window.quoteRows=function(){
      const html=original.apply(this,arguments);
      try{
        const wrap=document.createElement("div");
        wrap.innerHTML=html;
        const table=wrap.querySelector("table.table");
        if(table){
          const head=[...table.querySelectorAll("thead th")];
          const idx=head.findIndex(function(th){return /munka\s*\/\s*megnevezés/i.test(String(th.textContent||""));});
          if(idx>=0)table.querySelectorAll("tr").forEach(function(row){if(row.children[idx])row.removeChild(row.children[idx]);});
        }
        return wrap.innerHTML;
      }catch(e){return html;}
    };
    window.__KPF_QUOTE_LIST_NO_SUBJECT=true;
  }
  function install(){
    patchQuoteRows();
    removeWorkNameColumn();
  }
  const s=document.createElement("script");
  s.src="quote_ui_fix_legacy.js?v=20260830-2";
  s.onload=install;
  s.onerror=install;
  document.head.appendChild(s);
  const observer=new MutationObserver(function(){removeWorkNameColumn();});
  observer.observe(document.documentElement,{childList:true,subtree:true});
  [0,50,150,300,600,1000,1800,3000].forEach(function(ms){setTimeout(install,ms);});
})();
