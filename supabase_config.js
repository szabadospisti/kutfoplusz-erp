window.SUPABASE_CONFIG = Object.freeze({
  url: "https://qoxxhsbcptyieyhtdhrw.supabase.co",
  publishableKey: "sb_publishable_WYMcBkgdK-Ed5JY_ljJS0g_BB8dH10T"
});

/* Kútszelvény – szabványosabb mérnöki megjelenítés.
 * Az eredeti rétegnapló adatait nem módosítja, csak a grafikus megjelenítést.
 * Az egymást közvetlenül követő, azonos megnevezésű rétegeket összevonja.
 */
(function installWellProfile(){
  function start(){
    let tries=0;
    const timer=setInterval(function(){
      tries++;
      if(typeof wlProfile === "function"){
        clearInterval(timer);
        window.__originalWlProfile=window.__originalWlProfile||wlProfile;
        window.wlProfile=function(){
          try{ renderStandardWellProfile(); }
          catch(err){ console.error("Kútszelvény hiba:",err); window.__originalWlProfile(); }
        };
        try{ window.wlProfile(); }catch(e){}
      }
      if(tries>100) clearInterval(timer);
    },100);
  }
  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded",start,{once:true});
  else start();

  function escHtml(v){return String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c]));}
  function norm(v){return String(v??"").trim().toLocaleLowerCase("hu-HU");}
  function lithology(name){
    const n=norm(name);
    if(n.includes("mészkő")) return {cls:"limestone",label:"Mészkő"};
    if(n.includes("márga")) return {cls:"marl",label:"Márga"};
    if(n.includes("iszap")) return {cls:"silt",label:"Iszap / silt"};
    if(n.includes("kavics")) return {cls:"gravel",label:"Kavics"};
    if(n.includes("agyag")) return {cls:"clay",label:"Agyag"};
    if(n.includes("homok")) return {cls:"sand",label:"Homok"};
    return {cls:"other",label:name||"Ismeretlen"};
  }

  function renderStandardWellProfile(){
    const box=document.getElementById("wlProfile");
    if(!box) return;
    const layers=(typeof wlLayers!=="undefined"&&Array.isArray(wlLayers))?wlLayers:[];
    const filters=(typeof wlFilters!=="undefined"&&Array.isArray(wlFilters))?wlFilters:[];
    const finalDepth=Number(document.getElementById("wl_finalDepth")?.value)||0;
    const validLayers=layers.map(r=>({a:Number(r?.[0]),b:Number(r?.[1]),name:String(r?.[2]||r?.[3]||"").trim()})).filter(r=>Number.isFinite(r.a)&&Number.isFinite(r.b)&&r.b>r.a);
    const validFilters=filters.map(r=>({a:Number(r?.[0]),b:Number(r?.[1]),type:String(r?.[2]||"").trim()})).filter(r=>Number.isFinite(r.a)&&Number.isFinite(r.b)&&r.b>r.a);
    const merged=[];
    validLayers.forEach(r=>{const prev=merged[merged.length-1];if(prev&&norm(prev.name)===norm(r.name)&&Math.abs(prev.b-r.a)<0.000001)prev.b=r.b;else merged.push({...r});});
    const max=Math.max(10,finalDepth,...merged.map(r=>r.b),...validFilters.map(r=>r.b));
    const scale=Math.min(12,640/max),h=Math.max(260,max*scale);
    if(!document.getElementById("kp-standard-profile-style")){
      const st=document.createElement("style");st.id="kp-standard-profile-style";st.textContent=`
      .kp-profile{display:grid;grid-template-columns:64px 330px 250px 1fr;gap:0;align-items:start;overflow:auto;background:#fff;border:1px solid #cbd5df;border-radius:10px;padding:16px;min-width:760px}
      .kp-scale{position:relative;border-right:1px solid #374151;background:#fff}.kp-scale .tick{position:absolute;right:0;width:58px;border-top:1px solid #94a3b8;font-size:10px;color:#475569;text-align:right;padding-right:6px;transform:translateY(-50%)}
      .kp-lith{position:relative;border-right:2px solid #1f2937;background:#fff}.kp-lith .ground{position:absolute;left:0;right:0;top:0;border-top:3px solid #111827}
      .kp-layer{position:absolute;left:0;right:0;border-bottom:1px solid #334155;border-left:1px solid #334155;display:flex;align-items:center;padding:0 8px;font-size:11px;line-height:1.15;overflow:hidden}.kp-layer .txt{position:relative;z-index:2;background:rgba(255,255,255,.8);padding:2px 4px;border-radius:3px;font-weight:600}
      .kp-layer.sand:before{content:"";position:absolute;inset:0;background-image:radial-gradient(#334155 .8px,transparent .9px);background-size:7px 7px;opacity:.8}.kp-layer.gravel:before{content:"";position:absolute;inset:0;background-image:radial-gradient(circle at 25% 30%,transparent 0 2px,#334155 2.2px 2.8px,transparent 3px),radial-gradient(circle at 70% 65%,transparent 0 3px,#334155 3.2px 3.8px,transparent 4px);background-size:14px 12px,19px 17px;opacity:.85}.kp-layer.clay:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 7px,#334155 7px 8px);opacity:.85}.kp-layer.silt:before{content:"";position:absolute;inset:0;background:repeating-linear-gradient(0deg,transparent 0 8px,#334155 8px 9px);opacity:.75}.kp-layer.silt:after{content:"·  ·  ·  ·  ·";position:absolute;left:5px;right:5px;top:50%;font-size:14px;letter-spacing:6px;color:#334155;transform:translateY(-50%);opacity:.8}.kp-layer.marl{background:repeating-linear-gradient(0deg,transparent 0 7px,#334155 7px 8px,transparent 8px 13px,#64748b 13px 14px)}.kp-layer.limestone:before{content:"";position:absolute;inset:0;background-image:linear-gradient(#334155 1px,transparent 1px),linear-gradient(90deg,#334155 1px,transparent 1px);background-size:22px 12px,22px 12px;opacity:.75}.kp-layer.other{background:repeating-linear-gradient(135deg,#fff 0 7px,#cbd5e1 7px 8px)}
      .kp-tech{position:relative;border-right:1px solid #64748b;background:#f8fafc}.kp-tech .bore{position:absolute;left:55px;top:0;width:138px;border-left:2px solid #111827;border-right:2px solid #111827;background:rgba(255,255,255,.35)}.kp-tech .casing{position:absolute;left:88px;width:72px;border-left:5px solid #374151;border-right:5px solid #374151;background:#eef2f7;z-index:4}.kp-tech .filter{position:absolute;left:83px;width:82px;border:5px solid #1769aa;background:rgba(23,105,170,.08);z-index:6}.kp-tech .filter:after{content:"";position:absolute;inset:4px;background:repeating-linear-gradient(0deg,#1769aa 0 2px,transparent 2px 6px);opacity:.9}.kp-tech .gravelpack{position:absolute;left:66px;width:116px;border:1px dashed #64748b;background-image:radial-gradient(circle,transparent 0 2px,#64748b 2.2px 2.8px,transparent 3px);background-size:11px 10px;z-index:2}.kp-tech .shoe{position:absolute;left:80px;width:88px;height:10px;background:#111827;z-index:7;border-radius:1px}.kp-tech .water{position:absolute;left:5px;right:5px;border-top:2px solid #2563eb;z-index:9}.kp-tech .water .tri{position:absolute;left:2px;top:-1px;width:0;height:0;border-left:7px solid transparent;border-right:7px solid transparent;border-top:11px solid #2563eb;transform:translateY(-1px)}.kp-tech .water .lbl{position:absolute;left:20px;top:-18px;font-size:10px;color:#075985;background:#fff;padding:2px 4px;border-radius:3px;white-space:nowrap}.kp-info{padding-left:14px;font-size:11px;color:#334155}.kp-info h4{margin:0 0 9px;font-size:12px;color:#111827}.kp-info .key{display:flex;gap:8px;align-items:center;margin:7px 0}.kp-info .sw{width:28px;height:16px;border:1px solid #64748b;flex:none;background:#fff}.kp-info .sw.sand{background-image:radial-gradient(#334155 .8px,transparent .9px);background-size:6px 6px}.kp-info .sw.gravel{background-image:radial-gradient(circle,transparent 0 2px,#334155 2.2px 2.8px,transparent 3px);background-size:10px 9px}.kp-info .sw.clay{background:repeating-linear-gradient(0deg,transparent 0 5px,#334155 5px 6px)}.kp-info .sw.filter{border:4px solid #1769aa;background:rgba(23,105,170,.08)}.kp-info .sw.pipe{border-left:5px solid #374151;border-right:5px solid #374151;background:#eef2f7}.kp-note{margin-top:12px;padding:8px;border:1px solid #cbd5e1;border-radius:6px;background:#f8fafc;line-height:1.4}@media(max-width:900px){.kp-profile{grid-template-columns:54px 260px 210px 260px;padding:10px}}`;
      document.head.appendChild(st);
    }
    const ticks=Array.from({length:Math.floor(max/5)+1},(_,i)=>{const d=i*5;return `<span class="tick" style="top:${d*scale}px">${d} m</span>`;}).join("");
    const layersHtml=merged.map(r=>{const l=lithology(r.name);return `<div class="kp-layer ${l.cls}" style="top:${r.a*scale}px;height:${Math.max(6,(r.b-r.a)*scale)}px"><span class="txt">${r.a.toFixed(r.a%1?1:0)}–${r.b.toFixed(r.b%1?1:0)} m · ${escHtml(r.name||l.label)}</span></div>`;}).join("");
    const casingEnd=Math.max(0,...validFilters.map(r=>r.b));
    const casingHtml=casingEnd>0?`<div class="casing" style="top:0;height:${Math.min(h,casingEnd*scale)}px"></div>`:"";
    const filtersHtml=validFilters.filter(r=>norm(r.type)==="szűrő").map(r=>`<div class="filter" style="top:${r.a*scale}px;height:${Math.max(6,(r.b-r.a)*scale)}px"></div><div class="gravelpack" style="top:${r.a*scale}px;height:${Math.max(6,(r.b-r.a)*scale)}px"></div>`).join("");
    const shoe=casingEnd>0?`<div class="shoe" style="top:${Math.min(h-10,casingEnd*scale-5)}px"></div>`:"";
    const rest=Number(document.getElementById("wl_staticWL")?.value),work=Number(document.getElementById("wl_dynamicWL")?.value);
    const waterHtml=(Number.isFinite(rest)&&rest>0?`<div class="water" style="top:${rest*scale}px"><span class="tri"></span><span class="lbl">NyVSZ ${rest.toFixed(2)} m</span></div>`:"")+(Number.isFinite(work)&&work>0?`<div class="water" style="top:${work*scale}px"><span class="tri"></span><span class="lbl">ÜVSZ ${work.toFixed(2)} m</span></div>`:"");
    const typeInfo=`<div class="kp-info"><h4>Jelmagyarázat</h4><div class="key"><span class="sw sand"></span>Homok – pontozás</div><div class="key"><span class="sw gravel"></span>Kavics – körös jelölés</div><div class="key"><span class="sw clay"></span>Agyag – vízszintes vonalak</div><div class="key"><span class="sw sand"></span>Iszap / silt – vonal + pont</div><div class="key"><span class="sw clay"></span>Márga – váltakozó vonal</div><div class="key"><span class="sw sand"></span>Mészkő – téglaminta</div><div class="key"><span class="sw pipe"></span>Vakcső / béléscső</div><div class="key"><span class="sw filter"></span>Kútszűrő</div><div class="key"><span class="sw gravel"></span>Szűrőkavics</div><div class="kp-note"><b>Megjegyzés:</b> a grafika a munkanaplóban rögzített rétegek és szűrőszakaszok alapján készül. Furat- és csőátmérő-adat jelenleg nincs külön munkanapló-mezőben, ezért a rajz nem talál ki ilyen értéket.</div></div>`;
    box.innerHTML=`<div class="kp-profile"><div class="kp-scale" style="height:${h}px">${ticks}</div><div class="kp-lith" style="height:${h}px"><div class="ground"></div>${layersHtml}</div><div class="kp-tech" style="height:${h}px"><div class="bore" style="height:${h}px"></div>${casingHtml}${filtersHtml}${shoe}${waterHtml}</div>${typeInfo}</div>`;
  }
})();

/* Munkanaplók – fejlesztési megjegyzések és feladatok. */
(function installWorklogDevelopmentBox(){
  function addBox(){
    const headings=[...document.querySelectorAll("h1,h2,h3")];
    const isWorklog=headings.some(h=>String(h.textContent||"").includes("Munkanaplók"));
    if(!isWorklog)return;
    const table=document.getElementById("worklogTable");
    if(!table||document.getElementById("wlDevelopmentBox"))return;
    const box=document.createElement("section");
    box.id="wlDevelopmentBox";
    box.className="wl-dev-box";
    box.innerHTML=`<div class="wl-dev-head"><div><h3>🛠 Fejlesztési megjegyzések és feladatok</h3><div class="wl-dev-sub">A munkanapló és a grafikus függőleges kútszelvény további fejlesztési listája</div></div><span class="wl-dev-status">TERVEZETT</span></div><div class="wl-dev-grid"><div class="wl-dev-group"><b>Elkészült</b><ul><li>Grafikus függőleges kútszelvény mérnöki jellegű megjelenítése.</li><li>5 m-es mélységi skála és réteghatárok.</li><li>Szomszédos azonos rétegek automatikus összevonása.</li><li>Homok, kavics, agyag, iszap, márga és mészkő eltérő mintázata.</li><li>Vakcső, kútszűrő, szűrőkavics és vízszintek grafikus jelölése.</li></ul></div><div class="wl-dev-group"><b>Következő fejlesztési feladatok</b><ul><li>Furatátmérő külön mezővel és méretezéssel.</li><li>Béléscső átmérője, anyaga és csőszakaszai.</li><li>Cementezett szakasz / cementpalást rögzítése és rajzolása.</li><li>Bentonit- vagy agyagdugó mélységtartományának kezelése.</li><li>Szűrőkavics külön mélységtartományának megadása.</li><li>Kúttalp / fenékdugó pontos műszaki ábrázolása.</li><li>NyVSZ és ÜVSZ szabványos háromszög-jelölése, külön értékekkel.</li><li>Teljes kútszelvény automatikus nyomtatása és Word/PDF dokumentumba illesztése.</li><li>Hiányzó vagy ellentmondó műszaki adatok automatikus ellenőrzése.</li></ul></div></div>`;
    table.parentNode.insertBefore(box,table.nextSibling);
  }
  if(!document.getElementById("wl-dev-style")){
    const st=document.createElement("style");st.id="wl-dev-style";st.textContent=`.wl-dev-box{margin-top:18px;padding:18px 20px;background:#fff;border:1px solid #dbe2e9;border-left:4px solid #1d4ed8;border-radius:12px;box-shadow:0 5px 18px rgba(15,23,42,.06)}.wl-dev-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;margin-bottom:14px}.wl-dev-head h3{margin:0;font-size:16px}.wl-dev-sub{margin-top:4px;color:#687483;font-size:12px}.wl-dev-status{font-size:10px;font-weight:800;letter-spacing:.08em;padding:5px 8px;border-radius:999px;background:#eff6ff;color:#1d4ed8}.wl-dev-grid{display:grid;grid-template-columns:1fr 1.35fr;gap:20px}.wl-dev-group{font-size:13px}.wl-dev-group>b{display:block;margin-bottom:7px}.wl-dev-group ul{margin:0;padding-left:20px}.wl-dev-group li{margin:5px 0;line-height:1.35}.wl-dev-group li::marker{color:#1d4ed8}@media(max-width:800px){.wl-dev-grid{grid-template-columns:1fr}.wl-dev-head{flex-direction:column}}`;
    document.head.appendChild(st);
  }
  let last=false;
  setInterval(()=>{const has=!!document.getElementById("worklogTable");if(has&&!last)addBox();last=has;},250);
})();
