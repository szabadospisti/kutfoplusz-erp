/* Kútfő Plusz ERP 2.0 — quote list: NEVER show work name */
(function(){
  "use strict";

  function stripWorkNameFromOfferCell(cell){
    if(!cell)return;
    const link=cell.querySelector("a.link, a");
    if(link){
      const keep=link.cloneNode(true);
      cell.replaceChildren(keep);
      return;
    }
    const bold=cell.querySelector("b,strong");
    if(bold){
      const keep=bold.cloneNode(true);
      cell.replaceChildren(keep);
    }
  }

  function cleanQuoteTable(table){
    if(!table)return;

    // Remove a dedicated "Munka / megnevezés" column if it exists.
    const head=[...table.querySelectorAll("thead th")];
    const idx=head.findIndex(function(th){
      return /munka\s*\/\s*megnevezés/i.test(String(th.textContent||"").replace(/\s+/g," ").trim());
    });
    if(idx>=0){
      table.querySelectorAll("tr").forEach(function(row){
        if(row.children[idx])row.removeChild(row.children[idx]);
      });
    }

    // The current list can also put the work name underneath the offer number
    // inside the first cell. Keep ONLY the offer-number link/bold element.
    table.querySelectorAll("tbody tr").forEach(function(row){
      stripWorkNameFromOfferCell(row.children[0]);
    });
  }

  function removeWorkNameEverywhereInQuoteList(){
    document.querySelectorAll("table.table").forEach(cleanQuoteTable);
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
        const table=wrap.querySelector("table.table, table");
        cleanQuoteTable(table);
        return wrap.innerHTML;
      }catch(e){return html;}
    };
    window.__KPF_QUOTE_LIST_NO_SUBJECT=true;
  }

  function install(){
    patchQuoteRows();
    removeWorkNameEverywhereInQuoteList();
  }

  const s=document.createElement("script");
  s.src="quote_ui_fix_legacy.js?v=20260830-4";
  s.onload=install;
  s.onerror=install;
  document.head.appendChild(s);

  const observer=new MutationObserver(function(){
    removeWorkNameEverywhereInQuoteList();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  [0,50,150,300,600,1000,1800,3000].forEach(function(ms){setTimeout(install,ms);});
})();
