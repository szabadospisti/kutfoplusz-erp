/* Kútfő Plusz ERP 2.0 — quote list: NEVER show work name + continuous quote numbering */
(function(){
  "use strict";

  function quoteNumberPattern(year){
    return new RegExp("^A-"+String(year)+"-(\\d{3})$");
  }

  function nextContinuousQuoteNumber(){
    const year=new Date().getFullYear();
    const storageKey="kutfoplusz_erp_quote_sequence_"+year;
    const pattern=quoteNumberPattern(year);
    let max=0;
    const quotes=Array.isArray(window.db?.quotes)?window.db.quotes:[];

    quotes.forEach(function(q){
      const m=String(q?.id||q?.number||"").match(pattern);
      if(m)max=Math.max(max,Number(m[1]));
    });

    try{
      const stored=Number(localStorage.getItem(storageKey)||0);
      if(Number.isFinite(stored))max=Math.max(max,stored);
    }catch(e){}

    const next=max+1;
    try{localStorage.setItem(storageKey,String(next));}catch(e){}
    return "A-"+String(year)+"-"+String(next).padStart(3,"0");
  }

  function replaceQuoteIdReferences(oldId,newId){
    if(!oldId||oldId===newId)return;
    const root=window.db;
    if(!root||typeof root!=="object")return;

    function walk(value,seen){
      if(!value||typeof value!=="object")return;
      if(seen.has(value))return;
      seen.add(value);

      if(Array.isArray(value)){
        value.forEach(function(item){walk(item,seen);});
        return;
      }

      Object.keys(value).forEach(function(key){
        const v=value[key];
        if(key==="quoteId" && String(v)===String(oldId)){
          value[key]=newId;
        }else if(key==="number" && String(v)===String(oldId) && value!==root){
          value[key]=newId;
        }else{
          walk(v,seen);
        }
      });
    }

    walk(root,new Set());
  }

  function normalizeExistingQuoteNumbers(){
    const db=window.db;
    if(!db||!Array.isArray(db.quotes)||!db.quotes.length)return false;

    const year=new Date().getFullYear();
    const pattern=quoteNumberPattern(year);
    const used=new Set();
    const migrations=[];

    // Keep already-correct current-year numbers exactly as they are.
    db.quotes.forEach(function(q){
      const id=String(q?.id||"");
      const m=id.match(pattern);
      if(m && !used.has(id))used.add(id);
    });

    let changed=false;
    let next=1;

    function allocate(){
      while(used.has("A-"+year+"-"+String(next).padStart(3,"0")))next++;
      const id="A-"+year+"-"+String(next).padStart(3,"0");
      used.add(id);
      next++;
      return id;
    }

    db.quotes.forEach(function(q){
      if(!q||typeof q!=="object")return;
      const oldId=String(q.id||"");
      if(pattern.test(oldId)){
        q.number=oldId;
        return;
      }

      const newId=allocate();
      q.id=newId;
      q.number=newId;
      replaceQuoteIdReferences(oldId,newId);
      migrations.push({from:oldId,to:newId});
      changed=true;
    });

    let max=0;
    db.quotes.forEach(function(q){
      const m=String(q?.id||"").match(pattern);
      if(m)max=Math.max(max,Number(m[1]));
    });
    try{localStorage.setItem("kutfoplusz_erp_quote_sequence_"+year,String(max));}catch(e){}

    if(changed && typeof window.save==="function")window.save();
    window.__KPF_QUOTE_NUMBERING_MIGRATED=true;
    window.__KPF_QUOTE_NUMBERING_MIGRATIONS=migrations;
    return changed;
  }

  function installContinuousQuoteNumbering(){
    if(window.__KPF_QUOTE_NUMBERING_INSTALLED)return;
    window.__KPF_QUOTE_NUMBERING_INSTALLED=true;

    normalizeExistingQuoteNumbers();

    // Override the legacy A-26001 style generator. Quotes have their own
    // annual sequence and do not share the project-number counter.
    window.nextQuoteId=function(){
      return nextContinuousQuoteNumber();
    };
  }

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
    installContinuousQuoteNumbering();
    patchQuoteRows();
    removeWorkNameEverywhereInQuoteList();
  }

  const s=document.createElement("script");
  s.src="quote_ui_fix_legacy.js?v=20260830-6";
  s.onload=install;
  s.onerror=install;
  document.head.appendChild(s);

  const observer=new MutationObserver(function(){
    installContinuousQuoteNumbering();
    removeWorkNameEverywhereInQuoteList();
  });
  observer.observe(document.documentElement,{childList:true,subtree:true});

  [0,50,150,300,600,1000,1800,3000].forEach(function(ms){setTimeout(install,ms);});
})();
