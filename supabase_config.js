window.SUPABASE_CONFIG = Object.freeze({
  url: "https://qoxxhsbcptyieyhtdhrw.supabase.co",
  publishableKey: "sb_publishable_WYMcBkgdK-Ed5JY_ljJS0g_BB8dH10T"
});

/*
 * Kútszelvény grafikus javítás:
 * az egymást közvetlenül követő, azonos megnevezésű rétegeket egyetlen
 * grafikus réteggé vonjuk össze. A mélységi adatokat nem módosítjuk.
 * Nem szomszédos azonos rétegeket szándékosan nem olvasztunk össze,
 * mert az köztes rétegek eltűnését okozná a függőleges szelvényben.
 */
setTimeout(function installMergedWellProfile(){
  if(typeof window.wlProfile !== "function") return;

  window.wlProfile = function(){
    const box=document.getElementById("wlProfile");
    if(!box) return;

    const depthEl=document.getElementById("wl_finalDepth");
    const finalDepth=Number(depthEl?.value)||0;
    const layers=(typeof wlLayers!=="undefined" && Array.isArray(wlLayers))?wlLayers:[];
    const filters=(typeof wlFilters!=="undefined" && Array.isArray(wlFilters))?wlFilters:[];
    const validLayers=layers.filter(r=>{
      const a=Number(r?.[0]), b=Number(r?.[1]);
      return Number.isFinite(a)&&Number.isFinite(b)&&b>a;
    });
    const validFilters=filters.filter(r=>{
      const a=Number(r?.[0]), b=Number(r?.[1]);
      return Number.isFinite(a)&&Number.isFinite(b)&&b>a;
    });

    const max=Math.max(
      10,
      finalDepth,
      ...validLayers.map(r=>Number(r[1])||0),
      ...validFilters.map(r=>Number(r[1])||0)
    );
    const scale=Math.min(10,520/max);
    const h=max*scale;

    const escFn=(typeof window.esc==="function")
      ? window.esc
      : (v=>String(v??"").replace(/[&<>\"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'\"':"&quot;","'":"&#39;"}[c])));

    /*
     * Csak a szomszédos, azonos megnevezésű szakaszokat egyesítjük.
     * Példa: 0–4 Agyag + 4–16 Agyag => 0–16 Agyag.
     */
    const merged=[];
    for(const r of validLayers){
      const a=Number(r[0]), b=Number(r[1]);
      const name=String(r[2]||r[3]||"").trim();
      const normalized=name.toLocaleLowerCase("hu-HU");
      const prev=merged[merged.length-1];
      if(prev && prev.normalized===normalized && Math.abs(Number(prev.b)-a)<0.000001){
        prev.b=b;
      }else{
        merged.push({a,b,name,normalized});
      }
    }

    const layerHtml=merged.map(r=>{
      const text=(r.name||"").toLowerCase();
      const cl=text.includes("agyag")?"wl-clay":"wl-sand";
      return `<div class="wl-layer ${cl}" style="top:${r.a*scale}px;height:${Math.max(5,(r.b-r.a)*scale)}px"><b>${r.a}–${r.b} m</b>&nbsp;${escFn(r.name)}</div>`;
    }).join("");

    const filterHtml=validFilters.map(r=>
      `<div class="wl-filter" style="top:${Number(r[0])*scale}px;height:${Math.max(5,(Number(r[1])-Number(r[0]))*scale)}px"></div>`
    ).join("");

    const water=(id,label)=>{
      const v=Number(document.getElementById(id)?.value);
      if(!v) return "";
      return `<div class="wl-water" style="top:${v*scale}px"><span>${label} ${v.toFixed(2)} m</span></div>`;
    };

    box.innerHTML=`<div class="wl-profile-depth" style="height:${h}px">${Array.from({length:Math.floor(max/5)+1},(_,i)=>`<span style="top:${i*5*scale}px">${i*5} m</span>`).join("")}</div><div class="wl-profile-drawing" style="height:${h}px"><div class="wl-ground"></div>${layerHtml}${filterHtml}${water("wl_staticWL","Nyugalmi")}${water("wl_dynamicWL","Üzemi")}</div>`;
  };

  window.wlProfile();
},0);
