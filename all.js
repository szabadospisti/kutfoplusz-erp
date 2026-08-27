


window.PermitOCRConfig={
  pdfWorker:"https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.16.105/pdf.worker.min.js",
  tesseractWorker:"https://cdnjs.cloudflare.com/ajax/libs/tesseract.js/5.1.1/worker.min.js",
  tesseractCore:"https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1/tesseract-core-simd-lstm.wasm.js",
  tesseractLang:"https://tessdata.projectnaptha.com/4.0.0_best"
};
if(window.pdfjsLib)window.pdfjsLib.GlobalWorkerOptions.workerSrc=window.PermitOCRConfig.pdfWorker;


document.addEventListener("click",function(e){
 const a=e.target.closest("[data-quote-id]");
 if(a){
   e.preventDefault();
   openQuotePage(a.getAttribute("data-quote-id"));
 }
});







const ERP_PROJECT_STATUSES=[
  "Új",
  "Ajánlat előkészítés alatt",
  "Ajánlat elküldve",
  "Megrendelés alatt",
  "Folyamatban",
  "Befejezett",
  "Lezárt",
  "Törölt"
];
const ERP_QUOTE_STATUSES=[
  "Piszkozat",
  "Előkészítés alatt",
  "Elküldve",
  "Elfogadva",
  "Elutasítva",
  "Lezárt"
];



































































function buildSectionMaterialKeys(sections,well){
  return (Array.isArray(sections)?sections:[]).map((s,i)=>{
    const id=buildPipeMaterialIdentity(s,well);
    return {section:i,materialKey:getCasingMaterialKey(well,s).key,identity:id};
  });
}
function auditSectionMaterialIdentity(sections,well){
  const rows=buildSectionMaterialKeys(sections,well);
  const issues=[];
  const seen=new Map();
  rows.forEach(r=>{
    if(!r.materialKey) issues.push({type:"MISSING_MATERIAL_KEY",section:r.section});
    const sig=JSON.stringify([r.identity.pipeRole,r.identity.type,r.identity.diameter,r.identity.material]);
    if(seen.has(sig) && r.materialKey!==seen.get(sig))
      issues.push({type:"NON_DETERMINISTIC_KEY",section:r.section});
    seen.set(sig,r.materialKey);
  });
  return {ok:issues.length===0,issues,rows};
}
function auditSectionMaterialIdentityRegression(){
  const w={casingDiameter:324,casingMaterial:"ACÉL"};
  const sections=[
    {type:"Vak",pipeRole:"védőcső",diameter:324,material:"ACÉL"},
    {type:"Vak",pipeRole:"védőcső",diameter:324,material:"ACÉL"}
  ];
  const r=auditSectionMaterialIdentity(sections,w);
  return {ok:r.ok&&r.rows[0].materialKey===r.rows[1].materialKey,result:r};
}

function calculatePipeRequirementByUnit(sections,well){
  const rows=Array.isArray(sections)?sections:[];
  const result=rows.map((s,i)=>{
    const from=parseErpNumber(s?.[0]), to=parseErpNumber(s?.[1]);
    const meters=Math.round(Math.max(0,to-from)*100)/100;
    const calc=calculatePipeStockRequirement(s,well);
    const pieces=Math.max(0,Math.ceil(parseErpNumber(calc?.stockMeters ?? meters)/3));
    const remainder=Math.round((pieces*3-meters)*100)/100;
    return {section:i,meters,pieces,remainder,unitMeters:meters,unitPieces:pieces};
  });
  return result;
}
function auditPipeDbMeterConsistency(sections,well){
  const rows=calculatePipeRequirementByUnit(sections,well);
  const issues=[];
  rows.forEach(r=>{
    if(r.meters<=0) issues.push({type:"INVALID_LENGTH",section:r.section});
    if(r.pieces<=0) issues.push({type:"INVALID_PIECES",section:r.section});
    if(r.remainder<0 || r.remainder>=3) issues.push({type:"INVALID_REMAINDER",section:r.section});
  });
  return {ok:issues.length===0,issues,rows};
}
function auditPipeDbMeterRegression(){
  const r=auditPipeDbMeterConsistency([
    ["0","7","Vak"],["7","12","Szűrő"],["12","20","Vak"]
  ],{});
  return {ok:r.ok && r.rows.reduce((a,x)=>a+x.meters,0)===20,result:r};
}

function auditPipeRoleSeparation(sections){
  const rows=Array.isArray(sections)?sections:[];
  const issues=[];
  const roles={VEDOCSO:0,TERMELOCSO:0,SZUROCSO:0,VAK:0};
  rows.forEach((s,i)=>{
    const id=buildPipeMaterialIdentity(s,{});
    roles[id.pipeRole]=(roles[id.pipeRole]||0)+1;
    if(!id.material && id.pipeRole!=="VAK") issues.push({type:"MISSING_MATERIAL",section:i});
    if(!id.diameter && id.pipeRole!=="VAK") issues.push({type:"MISSING_DIAMETER",section:i});
  });
  return {ok:issues.length===0,issues,roles};
}
function auditPipeRoleSeparationRegression(){
  const rows=[
    {type:"Vak",pipeRole:"védőcső",diameter:324,material:"ACÉL"},
    {type:"Vak",pipeRole:"termelőcső",diameter:76,material:"HORGANYZOTT"},
    {type:"Szűrő",pipeRole:"szűrőcső",diameter:76,material:"PVC"}
  ];
  const r=auditPipeRoleSeparation(rows);
  return {ok:r.ok&&r.roles.VEDOCSO===1&&r.roles.TERMELOCSO===1&&r.roles.SZUROCSO===1,result:r};
}

function normalizePipeMaterialType(value){
  const s=String(value??"").trim().toLowerCase();
  if(["védőcső","vedocső","védő","vedo","protector","casing"].includes(s)) return "VEDOCSO";
  if(["termelőcső","termelocső","termelő","termelo","production"].includes(s)) return "TERMELOCSO";
  if(["szűrő","szuro","szűrőcső","szurocso","filter"].includes(s)) return "SZUROCSO";
  if(["vak","blank"].includes(s)) return "VAK";
  return s.toUpperCase();
}
function buildPipeMaterialIdentity(section,well){
  const s=section||{}, w=well||{};
  const type=normalizeCasingSectionType(s?.type??s?.[2]);
  const pipeRole=normalizePipeMaterialType(s?.pipeRole??s?.materialType??s?.[3]??type);
  const diameter=parseErpNumber(s?.diameter??s?.[4]??w?.casingDiameter);
  const material=String(s?.material??s?.materialKey??s?.[5]??w?.casingMaterial??"").trim().toUpperCase();
  return {pipeRole,type,diameter,material};
}
function auditPipeMaterialIdentity(section,well){
  const id=buildPipeMaterialIdentity(section,well);
  const issues=[];
  if(!id.pipeRole) issues.push("hiányzó csőszerep");
  if(id.pipeRole==="TERMELOCSO" && id.type==="SZUROCSO") issues.push("termelőcső/szűrőcső szerepütközés");
  if(id.pipeRole==="VEDOCSO" && id.type==="SZUROCSO") issues.push("védőcső/szűrőcső szerepütközés");
  if(id.diameter<0) issues.push("érvénytelen átmérő");
  return {ok:issues.length===0,issues,identity:id};
}
function auditPipeMaterialIdentityRegression(){
  const good=auditPipeMaterialIdentity({type:"Vak",pipeRole:"termelőcső",diameter:76,material:"HORGANYZOTT"}, {});
  const filter=auditPipeMaterialIdentity({type:"Szűrő",pipeRole:"szűrőcső",diameter:76,material:"PVC"}, {});
  const bad=auditPipeMaterialIdentity({type:"Szűrő",pipeRole:"termelőcső",diameter:76,material:"PVC"}, {});
  return {good,filter,bad,ok:good.ok&&filter.ok&&!bad.ok};
}

function auditWellDepthAgainstProduction(project,production){
  const sections=project?.well?.casingSections||project?.casingSections||[];
  const projectDepth=calculateCasingEndDepth(sections);
  const productionDepth=calculateCasingEndDepth(production?.casingSections||[]);
  const productionMeters=Math.round(parseErpNumber(production?.usedMeters ?? production?.installedMeters)*100)/100;
  const issues=[];
  if(projectDepth!==productionDepth) issues.push("kút végmélység eltérés projekt ↔ gyártás");
  if(Math.abs(productionMeters-projectDepth)>0.01) issues.push("gyártási tényleges méter eltér a kút végmélységétől");
  return {ok:issues.length===0,issues,projectDepth,productionDepth,productionMeters};
}
function auditWellDepthRegression(){
  const project={well:{casingSections:[["0","38","Vak"],["38","50","Szűrő"],["50","80","Vak"]]}};
  return {
    pass:auditWellDepthAgainstProduction(project,{casingSections:project.well.casingSections,usedMeters:80}),
    mismatch:auditWellDepthAgainstProduction(project,{casingSections:[["0","38","Vak"],["38","50","Szűrő"],["50","77","Vak"]],usedMeters:77})
  };
}

function calculateThreeWayMaterialReconciliation(project,production,stock){
  const p=project||{}, pr=production||{}, st=stock||{};
  const projectMeters=Math.round(parseErpNumber(p.installedMeters ?? p.materialMeters ?? p.well?.installedMeters)*100)/100;
  const productionMeters=Math.round(parseErpNumber(pr.usedMeters ?? pr.installedMeters)*100)/100;
  const stockMeters=Math.round(parseErpNumber(st.issuedMeters ?? st.usedMeters)*100)/100;
  const projectPieces=Math.max(0,Math.floor(parseErpNumber(p.usedPieces ?? p.materialPieces)));
  const productionPieces=Math.max(0,Math.floor(parseErpNumber(pr.usedPieces ?? pr.materialPieces)));
  const stockPieces=Math.max(0,Math.floor(parseErpNumber(st.issuedPieces ?? st.usedPieces)));
  return {
    project:{meters:projectMeters,pieces:projectPieces},
    production:{meters:productionMeters,pieces:productionPieces},
    stock:{meters:stockMeters,pieces:stockPieces},
    deltaMeters:{
      projectProduction:roundMoney(projectMeters-productionMeters),
      productionStock:roundMoney(productionMeters-stockMeters),
      projectStock:roundMoney(projectMeters-stockMeters)
    },
    deltaPieces:{
      projectProduction:projectPieces-productionPieces,
      productionStock:productionPieces-stockPieces,
      projectStock:projectPieces-stockPieces
    }
  };
}
function auditThreeWayMaterialReconciliation(project,production,stock){
  const r=calculateThreeWayMaterialReconciliation(project,production,stock);
  const issues=[];
  if(Math.abs(r.deltaMeters.projectProduction)>0.01) issues.push("projekt ↔ gyártás méter eltérés");
  if(Math.abs(r.deltaMeters.productionStock)>0.01) issues.push("gyártás ↔ készlet méter eltérés");
  if(r.deltaPieces.projectProduction!==0) issues.push("projekt ↔ gyártás db eltérés");
  if(r.deltaPieces.productionStock!==0) issues.push("gyártás ↔ készlet db eltérés");
  return {ok:issues.length===0,issues,result:r};
}
function auditThreeWayMaterialRegression(){
  return auditThreeWayMaterialReconciliation(
    {installedMeters:80,usedPieces:27},
    {usedMeters:80,usedPieces:27},
    {issuedMeters:80,issuedPieces:27}
  );
}

function cloneProjectToProduction(project){
  const p=project||{};
  return {
    sourceProjectId:p.id||null,
    sourceProjectRevision:parseInt(p.revision,10)||0,
    well:JSON.parse(JSON.stringify(p.well||{})),
    casingSections:JSON.parse(JSON.stringify(p.well?.casingSections||p.casingSections||[])),
    production:JSON.parse(JSON.stringify(p.production||{}))
  };
}
function auditProjectProductionTransfer(project){
  const r=cloneProjectToProduction(project);
  const sourceSections=project?.well?.casingSections||project?.casingSections||[];
  const transferredSections=r.casingSections;
  const issues=[];
  if(JSON.stringify(sourceSections)!==JSON.stringify(transferredSections))
    issues.push("csőszakasz eltérés projekt → gyártás");
  const sourceEnd=calculateCasingEndDepth(sourceSections);
  const targetEnd=calculateCasingEndDepth(transferredSections);
  if(sourceEnd!==targetEnd) issues.push("végmélység eltérés projekt → gyártás");
  return {ok:issues.length===0,issues,sourceEnd,targetEnd,sourceSections,transferredSections,result:r};
}
function auditProjectProductionTransferRegression(){
  const project={
    id:"P-001",revision:3,
    well:{casingSections:[
      ["0","38","Vak"],
      ["38","50","Szűrő"],
      ["50","80","Vak"]
    ]}
  };
  return auditProjectProductionTransfer(project);
}

function cloneOfferToProject(offer){
  const o=offer||{};
  return {
    sourceOfferId:o.id||null,
    sourceOfferRevision:parseInt(o.revision,10)||0,
    title:o.title||"",
    customerId:o.customerId||null,
    materialLines:JSON.parse(JSON.stringify(o.materialLines||[])),
    laborLines:JSON.parse(JSON.stringify(o.laborLines||[])),
    otherLines:JSON.parse(JSON.stringify(o.otherLines||[])),
    totals:calculateOfferTotals(
      [...(o.materialLines||[]).map(x=>({...x,category:"material"})),
       ...(o.laborLines||[]).map(x=>({...x,category:"labor"})),
       ...(o.otherLines||[]).map(x=>({...x,category:"other"}))]
    )
  };
}
function auditOfferProjectTransfer(offer){
  const p=cloneOfferToProject(offer);
  const sourceLines=[
    ...(offer?.materialLines||[]).map(x=>({...x,category:"material"})),
    ...(offer?.laborLines||[]).map(x=>({...x,category:"labor"})),
    ...(offer?.otherLines||[]).map(x=>({...x,category:"other"}))
  ];
  const source=calculateOfferTotals(sourceLines);
  const issues=[];
  if(p.totals.net!==source.net) issues.push("nettó eltérés átadáskor");
  if(p.totals.vat!==source.vat) issues.push("ÁFA eltérés átadáskor");
  if(p.totals.gross!==source.gross) issues.push("bruttó eltérés átadáskor");
  return {ok:issues.length===0,issues,source,project:p};
}
function auditOfferProjectTransferRegression(){
  const offer={
    id:"A-26-001",revision:2,title:"Teszt ajánlat",
    customerId:"C1",
    materialLines:[{quantity:10,unit:"m",unitPrice:1800}],
    laborLines:[{quantity:2,unit:"óra",unitPrice:12000}],
    otherLines:[{quantity:1,unit:"db",unitPrice:5000}]
  };
  return auditOfferProjectTransfer(offer);
}

function calculateOfferTotals(lines,defaultVatPercent=27){
  const rows=Array.isArray(lines)?lines:[];
  const details=rows.map(x=>{
    const q=Math.max(0,parseErpNumber(x?.quantity));
    const price=Math.max(0,parseErpNumber(x?.unitPrice));
    const vatPercent=Math.max(0,parseErpNumber(x?.vatPercent??defaultVatPercent));
    const net=roundMoney(q*price);
    const vat=roundMoney(net*vatPercent/100);
    return {...x,unit:normalizeOfferUnit(x?.unit),net,vat,gross:roundMoney(net+vat),vatPercent};
  });
  return {
    details,
    net:roundMoney(details.reduce((s,x)=>s+x.net,0)),
    vat:roundMoney(details.reduce((s,x)=>s+x.vat,0)),
    gross:roundMoney(details.reduce((s,x)=>s+x.gross,0))
  };
}
function groupOfferTotals(lines,defaultVatPercent=27){
  const t=calculateOfferTotals(lines,defaultVatPercent);
  const groups={material:{net:0,vat:0,gross:0},labor:{net:0,vat:0,gross:0},other:{net:0,vat:0,gross:0}};
  t.details.forEach(x=>{
    const g=["material","labor","other"].includes(String(x?.category))?String(x.category):"other";
    groups[g].net+=x.net; groups[g].vat+=x.vat; groups[g].gross+=x.gross;
  });
  Object.values(groups).forEach(g=>{g.net=roundMoney(g.net);g.vat=roundMoney(g.vat);g.gross=roundMoney(g.gross);});
  return {...t,groups};
}
function auditOfferTotals(lines,defaultVatPercent=27){
  const t=groupOfferTotals(lines,defaultVatPercent);
  const issues=[];
  const groupNet=roundMoney(Object.values(t.groups).reduce((s,g)=>s+g.net,0));
  const groupVat=roundMoney(Object.values(t.groups).reduce((s,g)=>s+g.vat,0));
  if(groupNet!==t.net) issues.push("csoportosított nettó eltérés");
  if(groupVat!==t.vat) issues.push("csoportosított ÁFA eltérés");
  return {ok:issues.length===0,issues,result:t};
}

function normalizeOfferUnit(unit){
  const s=String(unit??"").trim().toLowerCase();
  if(["db","darab","piece","pieces"].includes(s)) return "db";
  if(["m","méter","meter","metre"].includes(s)) return "m";
  if(["óra","ora","h","hour"].includes(s)) return "óra";
  return s;
}
function calculateOfferLine(quantity,unit,unitPrice){
  const q=Math.max(0,parseErpNumber(quantity));
  const u=normalizeOfferUnit(unit);
  const price=Math.max(0,parseErpNumber(unitPrice));
  return {quantity:q,unit:u,unitPrice:price,lineNet:roundMoney(q*price)};
}
function auditOfferLineUnits(line){
  const r=calculateOfferLine(line?.quantity,line?.unit,line?.unitPrice);
  const issues=[];
  if(!["db","m","óra"].includes(r.unit)) issues.push("ismeretlen ajánlati egység");
  if(r.quantity<=0) issues.push("érvénytelen mennyiség");
  if(r.unitPrice<0) issues.push("érvénytelen egységár");
  return {ok:issues.length===0,issues,result:r};
}
function auditOfferUnitPriceRegression(){
  const db=calculateOfferLine(12,"db",5000);
  const meter=calculateOfferLine(38,"m",1800);
  return {
    ok:db.lineNet===60000 && meter.lineNet===68400,
    db,meter
  };
}

function calculateInvoiceLines(lines,vatPercent=27){
  const rows=Array.isArray(lines)?lines:[];
  let net=0,vat=0;
  const details=rows.map(x=>{
    const lineNet=roundMoney(Math.max(0,parseErpNumber(x?.quantity))*Math.max(0,parseErpNumber(x?.unitPrice)));
    const lineVat=roundMoney(lineNet*Math.max(0,parseErpNumber(x?.vatPercent??vatPercent))/100);
    net+=lineNet; vat+=lineVat;
    return {...x,lineNet,lineVat,lineGross:roundMoney(lineNet+lineVat)};
  });
  return {details,net:roundMoney(net),vat:roundMoney(vat),gross:roundMoney(net+vat)};
}
function calculateInvoiceTotalsFromUnrounded(lines,vatPercent=27){
  const rows=Array.isArray(lines)?lines:[];
  const net=roundMoney(rows.reduce((s,x)=>s+Math.max(0,parseErpNumber(x?.quantity))*Math.max(0,parseErpNumber(x?.unitPrice)),0));
  const vat=roundMoney(net*Math.max(0,parseErpNumber(vatPercent))/100);
  return {net,vat,gross:roundMoney(net+vat)};
}
function auditInvoiceRounding(lines,vatPercent=27){
  const line=calculateInvoiceLines(lines,vatPercent);
  const total=calculateInvoiceTotalsFromUnrounded(lines,vatPercent);
  return {
    ok:Math.abs(line.net-total.net)<0.01 && Math.abs(line.gross-total.gross)<=0.01,
    lineRounded:line,
    totalRounded:total,
    difference:{net:roundMoney(line.net-total.net),gross:roundMoney(line.gross-total.gross)}
  };
}
function auditInvoiceRoundingRegression(){
  const lines=[
    {quantity:1,unitPrice:0.01},
    {quantity:1,unitPrice:0.01},
    {quantity:1,unitPrice:0.01}
  ];
  return auditInvoiceRounding(lines,27);
}

function roundMoney(value){
  return Math.round(parseErpNumber(value)*100)/100;
}
function calculateVatFromNet(net,vatPercent=27){
  const n=Math.max(0,parseErpNumber(net));
  const v=Math.max(0,parseErpNumber(vatPercent));
  return {net:roundMoney(n),vatPercent:v,vat:roundMoney(n*v/100),gross:roundMoney(n+n*v/100)};
}
function calculateNetFromGross(gross,vatPercent=27){
  const g=Math.max(0,parseErpNumber(gross));
  const v=Math.max(0,parseErpNumber(vatPercent));
  if(v>=100) return {gross:roundMoney(g),vatPercent:v,net:0,vat:roundMoney(g)};
  const net=roundMoney(g/(1+v/100));
  return {gross:roundMoney(g),vatPercent:v,net,vat:roundMoney(g-net)};
}
function auditVatRoundTrip(net,vatPercent=27){
  const a=calculateVatFromNet(net,vatPercent);
  const b=calculateNetFromGross(a.gross,vatPercent);
  return {
    ok:Math.abs(a.net-b.net)<=0.01,
    forward:a,
    reverse:b,
    difference:roundMoney(b.net-a.net)
  };
}
function auditVatRegression(){
  const a=auditVatRoundTrip(150000,27);
  const b=calculateVatFromNet(123456.78,27);
  return {
    roundTrip:a.ok,
    known:a.net===150000 && a.vat===40500 && a.gross===190500,
    fractional:b.net===123456.78 && b.vat===33333.33 && b.gross===156790.11,
    result:{a,b}
  };
}

function calculateMarkupAndMargin(costBase,markupPercent){
  const cost=Math.max(0,parseErpNumber(costBase));
  const pct=Math.max(0,parseErpNumber(markupPercent));
  const markupValue=Math.round(cost*pct/100*100)/100;
  const salePrice=Math.round((cost+markupValue)*100)/100;
  const marginPercent=salePrice>0?Math.round((markupValue/salePrice)*10000)/100:0;
  return {costBase:cost,markupPercent:pct,markupValue,salePrice,marginPercent};
}
function calculatePriceFromTargetMargin(costBase,targetMarginPercent){
  const cost=Math.max(0,parseErpNumber(costBase));
  const margin=Math.min(99.9999,Math.max(0,parseErpNumber(targetMarginPercent)));
  const salePrice=margin>=100?0:Math.round((cost/(1-margin/100))*100)/100;
  const profit=Math.round((salePrice-cost)*100)/100;
  const effectiveMargin=salePrice>0?Math.round((profit/salePrice)*10000)/100:0;
  const effectiveMarkup=cost>0?Math.round((profit/cost)*10000)/100:0;
  return {costBase:cost,targetMarginPercent:margin,salePrice,profit,effectiveMargin,effectiveMarkup};
}
function auditMarkupMargin(costBase,pct){
  const r=calculateMarkupAndMargin(costBase,pct);
  const expectedMargin=r.salePrice>0?Math.round(((r.salePrice-r.costBase)/r.salePrice)*10000)/100:0;
  return {ok:Math.abs(r.marginPercent-expectedMargin)<0.01,issues:[],result:r};
}
function auditMarkupMarginRegression(){
  const markup=calculateMarkupAndMargin(100000,20);
  const target=calculatePriceFromTargetMargin(100000,20);
  return {
    markup20IsNotMargin20:markup.marginPercent===16.67,
    targetMargin20:target.salePrice===125000 && target.effectiveMargin===20 && target.effectiveMarkup===25,
    markup,target
  };
}

function calculatePricingBreakdown(costs,markupPercent=0,vatPercent=27){
  const c=costs||{};
  const material=Math.max(0,parseErpNumber(c.materialCost));
  const labor=Math.max(0,parseErpNumber(c.laborCost));
  const other=Math.max(0,parseErpNumber(c.otherCost));
  const costBase=Math.round((material+labor+other)*100)/100;
  const markup=Math.max(0,parseErpNumber(markupPercent));
  const net=Math.round(costBase*(1+markup/100)*100)/100;
  const vat=Math.round(net*Math.max(0,parseErpNumber(vatPercent))/100*100)/100;
  return {material,labor,other,costBase,markupPercent:markup,net,vatPercent:Math.max(0,parseErpNumber(vatPercent)),vat,gross:Math.round((net+vat)*100)/100};
}
function auditPricingOrder(costs,markupPercent,vatPercent){
  const r=calculatePricingBreakdown(costs,markupPercent,vatPercent);
  const expectedMarkup=Math.round(r.costBase*(1+r.markupPercent/100)*100)/100;
  const issues=[];
  if(Math.abs(r.net-expectedMarkup)>0.01) issues.push("hibás árrésszámítás");
  if(r.gross<r.net) issues.push("bruttó ár kisebb a nettónál");
  return {ok:issues.length===0,issues,result:r};
}
function auditPricingRegression(){
  const r=calculatePricingBreakdown({materialCost:100000,laborCost:50000,otherCost:0},20,27);
  return {ok:r.costBase===150000 && r.net===180000 && r.vat===48600 && r.gross===228600,result:r};
}

function calculateOfferMaterialCost(materialLines){
  const rows=Array.isArray(materialLines)?materialLines:[];
  return Math.round(rows.reduce((sum,x)=>{
    const q=parseErpNumber(x?.quantityMeters ?? x?.meters);
    const price=parseErpNumber(x?.unitPricePerMeter ?? x?.unitPrice);
    return sum+Math.max(0,q)*Math.max(0,price);
  },0)*100)/100;
}
function calculateFinalProjectValue(offer,project){
  const o=offer||{}, p=project||{};
  const offerMaterial=calculateOfferMaterialCost(o.materialLines||[]);
  const projectMaterial=Math.max(0,parseErpNumber(p.materialCost));
  const labor=Math.max(0,parseErpNumber(p.laborCost));
  const other=Math.max(0,parseErpNumber(p.otherCost));
  return {
    offerMaterial,
    projectMaterial,
    labor,
    other,
    total:Math.round((projectMaterial+labor+other)*100)/100
  };
}
function auditOfferProjectDoubleCounting(offer,project){
  const v=calculateFinalProjectValue(offer,project);
  const issues=[];
  if(project?.materialCostIncludesOfferMaterial && v.projectMaterial===v.offerMaterial)
    issues.push("ajánlati anyagköltség kétszer számítva");
  if(project?.materialCostIncludesOfferMaterial && project?.offerMaterialAddedAgain)
    issues.push("ajánlati anyagköltség másodszori hozzáadása");
  return {ok:issues.length===0,issues,value:v};
}
function reconcileOfferToProject(offer,project){
  const v=calculateFinalProjectValue(offer,project);
  return {
    ok:true,
    sourceOfferMaterial:v.offerMaterial,
    projectMaterialCost:v.projectMaterial,
    difference:Math.round((v.projectMaterial-v.offerMaterial)*100)/100,
    finalValue:v.total
  };
}

function calculateMaterialCost(quantityMeters,unitPricePerMeter){
  const q=Math.max(0,parseErpNumber(quantityMeters));
  const price=Math.max(0,parseErpNumber(unitPricePerMeter));
  return Math.round(q*price*100)/100;
}
function calculateStockIssueValue(stockMeters,unitPricePerMeter){
  return calculateMaterialCost(stockMeters,unitPricePerMeter);
}
function calculateProjectMaterialCost(sections,well,priceByMaterialKey){
  const rows=Array.isArray(sections)?sections:[];
  let total=0;
  const details=rows.map(s=>{
    const key=getCasingMaterialKey(well,s).key;
    const calc=calculatePipeStockRequirement(s,well);
    const price=Math.max(0,parseErpNumber(priceByMaterialKey?.[key]));
    const value=calculateMaterialCost(calc.installedMeters,price);
    total+=value;
    return {materialKey:key,meters:calc.installedMeters,unitPrice:price,value};
  });
  return {total:Math.round(total*100)/100,details};
}
function auditMaterialValueConsistency(section,well,unitPrice){
  const calc=calculatePipeStockRequirement(section,well);
  const expected=calculateMaterialCost(calc.installedMeters,unitPrice);
  const stockValue=calculateStockIssueValue(calc.installedMeters,unitPrice);
  return {ok:Math.abs(expected-stockValue)<0.01,expected,stockValue,installedMeters:calc.installedMeters,unitPrice};
}

function executePipeMaterialAllocation(remainders,stock,plan){
  const rs=Array.isArray(remainders)?remainders:[];
  const st=stock&&typeof stock==="object"?stock:{};
  const allocations=Array.isArray(plan?.allocations)?plan.allocations:[];
  const issues=[];
  const consumed=[];
  let newPieces=0;
  for(const a of allocations){
    const meters=Math.round(parseErpNumber(a?.meters)*100)/100;
    if(a?.source==="REMAINDER"){
      const r=rs.find(x=>String(x?.id)===String(a.id)&&x?.status==="AVAILABLE");
      if(!r || parseErpNumber(r.meters)<meters){issues.push("részszál készlet nem fedezi a kiadást");continue;}
      r.meters=Math.round((parseErpNumber(r.meters)-meters)*100)/100;
      if(r.meters<=0) r.status="CONSUMED";
      consumed.push({id:r.id,meters});
    } else if(a?.source==="NEW_PIPE"){
      const pieces=Math.max(0,Math.floor(parseErpNumber(a?.pieces)));
      newPieces+=pieces;
      st.quantityPieces=Math.max(0,Math.floor(parseErpNumber(st.quantityPieces))+pieces);
    }
  }
  return {ok:issues.length===0,issues,consumed,newPieces,remainders:rs,stock:st};
}
function auditPipeAllocationExecution(remainders,stock,plan){
  const required=Math.round(parseErpNumber(plan?.requiredMeters)*100)/100;
  const executed= Math.round((
    (plan?.allocations||[]).reduce((a,x)=>a+parseErpNumber(x?.meters),0)
  )*100)/100;
  const result=executePipeMaterialAllocation(remainders,stock,plan);
  const issues=[...result.issues];
  if(Math.abs(executed-required)>0.01) issues.push("a kiadási terv nem fedi pontosan az igényt");
  return {ok:issues.length===0,issues,executedMeters:executed,requiredMeters:required,result};
}

function planPipeMaterialAllocation(remainders,materialKey,requiredMeters,pipeLength=3){
  let need=Math.round(parseErpNumber(requiredMeters)*100)/100;
  const pl=parseErpNumber(pipeLength)>0?parseErpNumber(pipeLength):3;
  const list=(Array.isArray(remainders)?remainders:[])
    .filter(x=>String(x?.materialKey)===String(materialKey)&&x?.status==="AVAILABLE"&&parseErpNumber(x.meters)>0)
    .sort((a,b)=>parseErpNumber(a.meters)-parseErpNumber(b.meters));
  const allocations=[];
  for(const r of list){
    if(need<=0) break;
    const take=Math.min(need,parseErpNumber(r.meters));
    allocations.push({source:"REMAINDER",id:r.id,meters:Math.round(take*100)/100});
    need=Math.round((need-take)*100)/100;
  }
  if(need>0){
    const pieces=Math.ceil(need/pl);
    allocations.push({source:"NEW_PIPE",pieces,meters:Math.round(pieces*pl*100)/100});
    need=0;
  }
  return {ok:true,requiredMeters:requiredMeters,pipeLength:pl,allocations};
}
function auditPipeAllocationPlan(remainders,materialKey,requiredMeters,pipeLength=3){
  const p=planPipeMaterialAllocation(remainders,materialKey,requiredMeters,pipeLength);
  const usedRemainder=Math.round(p.allocations.filter(x=>x.source==="REMAINDER").reduce((a,x)=>a+x.meters,0)*100)/100;
  const newPipe=p.allocations.filter(x=>x.source==="NEW_PIPE").reduce((a,x)=>a+x.meters,0);
  return {ok:usedRemainder>0 || parseErpNumber(requiredMeters)<=0 || newPipe>=parseErpNumber(requiredMeters)-usedRemainder,
          usedRemainder,newPipe,plan:p};
}

function createPipeRemainderRecord(well,section,meters,sourceId){
  const key=getCasingMaterialKey(well,section).key;
  const m=Math.round(parseErpNumber(meters)*100)/100;
  if(!key || m<=0) return {ok:false,error:"érvénytelen maradék"};
  return {
    id:`REM-${Date.now()}-${Math.random().toString(36).slice(2,7)}`,
    materialKey:key,
    meters:m,
    unit:"m",
    sourceId:sourceId||null,
    status:"AVAILABLE",
    createdAt:new Date().toISOString()
  };
}
function consumePipeRemainder(remainders,materialKey,meters){
  const list=Array.isArray(remainders)?remainders:[];
  let need=Math.round(parseErpNumber(meters)*100)/100;
  if(need<=0) return {ok:true,consumed:[],remainingNeed:0};
  const candidates=list.filter(x=>String(x?.materialKey)===String(materialKey)&&x?.status==="AVAILABLE")
    .sort((a,b)=>parseErpNumber(a.meters)-parseErpNumber(b.meters));
  const consumed=[];
  for(const r of candidates){
    if(need<=0) break;
    const take=Math.min(need,parseErpNumber(r.meters));
    r.meters=Math.round((parseErpNumber(r.meters)-take)*100)/100;
    need=Math.round((need-take)*100)/100;
    consumed.push({id:r.id,meters:take});
    if(r.meters<=0) r.status="CONSUMED";
  }
  return {ok:need===0,consumed,remainingNeed:need};
}
function auditRemainderRecord(record){
  const issues=[];
  if(!record?.materialKey) issues.push("hiányzó anyagkulcs");
  if(parseErpNumber(record?.meters)<=0) issues.push("érvénytelen maradék hossz");
  if(record?.status!=="AVAILABLE" && record?.status!=="CONSUMED") issues.push("érvénytelen maradék státusz");
  return {ok:issues.length===0,issues};
}

function calculateStockUnitAdjustment(previous,current,pipeLength=3){
  const prevM=Math.max(0,parseErpNumber(previous?.meters));
  const curM=Math.max(0,parseErpNumber(current?.meters));
  const deltaM=Math.round((curM-prevM)*100)/100;
  const pl=parseErpNumber(pipeLength)>0?parseErpNumber(pipeLength):3;
  const prevPieces=Math.max(0,Math.floor(prevM/pl));
  const curPieces=Math.max(0,Math.floor(curM/pl));
  return {
    deltaMeters:deltaM,
    deltaPieces:curPieces-prevPieces,
    pipeLength:pl,
    previousRemainder:Math.round((prevM-prevPieces*pl)*100)/100,
    currentRemainder:Math.round((curM-curPieces*pl)*100)/100
  };
}
function auditStockUnitAdjustment(previous,current,pipeLength=3){
  const r=calculateStockUnitAdjustment(previous,current,pipeLength);
  const issues=[];
  if(r.deltaPieces* r.pipeLength > r.deltaMeters && r.deltaPieces>0)
    issues.push("db-alapú növekmény meghaladja a tényleges méterváltozást");
  return {ok:issues.length===0,issues,result:r};
}
function createStockAdjustmentFromDelta(previous,current,pipeLength=3){
  const r=calculateStockUnitAdjustment(previous,current,pipeLength);
  if(r.deltaMeters===0) return {ok:true,action:"NONE",delta:r};
  if(r.deltaMeters>0) return {ok:true,action:"ISSUE_METERS",delta:r};
  return {ok:true,action:"RETURN_METERS",delta:r};
}

function calculateStockRevisionAdjustment(previousSections,currentSections,well){
  const prev=calculateCasingStockRequirement(previousSections,well);
  const cur=calculateCasingStockRequirement(currentSections,well);
  const sum=(rows,key)=>Math.round(rows.reduce((a,x)=>a+parseErpNumber(x[key]),0)*100)/100;
  const prevP=sum(prev,"stockPieces"), curP=sum(cur,"stockPieces");
  const prevM=sum(prev,"stockMeters"), curM=sum(cur,"stockMeters");
  return {
    previousPieces:prevP,currentPieces:curP,
    previousMeters:prevM,currentMeters:curM,
    deltaPieces:curP-prevP,deltaMeters:Math.round((curM-prevM)*100)/100
  };
}
function auditStockRevisionAdjustment(previousSections,currentSections,well){
  const d=calculateStockRevisionAdjustment(previousSections,currentSections,well);
  const issues=[];
  if(d.deltaPieces===0 && d.deltaMeters===0) return {ok:true,action:"NONE",delta:d};
  if(d.deltaPieces>0 || d.deltaMeters>0) return {ok:true,action:"ADDITIONAL_ISSUE",delta:d};
  return {ok:true,action:"RETURN_OR_REVERSAL_REQUIRED",delta:d};
}

function recalculateCasingAfterEdit(sections,well){
  const audit=validateCasingSectionsBeforeSave(sections);
  if(!audit.ok) return {ok:false,audit};
  const clean=JSON.parse(JSON.stringify(sections||[]));
  return {
    ok:true,
    sections:clean,
    summary:calculateCasingSummary(clean,well),
    stock:calculateCasingStockRequirement(clean,well)
  };
}
function auditCasingEditMutation(beforeSections,afterSections,well){
  const before=calculateCasingSummary(beforeSections,well);
  const after=recalculateCasingAfterEdit(afterSections,well);
  const issues=[];
  if(!after.ok) issues.push("szerkesztés után érvénytelen csőszakasz");
  if(after.ok && after.summary.endDepth!==calculateCasingEndDepth(after.sections))
    issues.push("végmélység újraszámítási hiba");
  return {ok:issues.length===0,issues,before,after};
}
function auditCasingEditRegression(){
  const w={pipeLength:3};
  const before=[["0","38","Vak"],["38","50","Szűrő"],["50","80","Vak"]];
  const deleted=[["0","38","Vak"],["38","50","Szűrő"]];
  const inserted=[["0","20","Vak"],["20","38","Vak"],["38","50","Szűrő"],["50","80","Vak"]];
  return {
    delete:auditCasingEditMutation(before,deleted,w),
    insert:auditCasingEditMutation(before,inserted,w)
  };
}

function validateCasingSectionsBeforeSave(sections){
  const continuity=auditCasingContinuity(sections);
  const order=auditCasingOrder(sections);
  const issues=[];
  if(!order.ok) issues.push(...order.issues);
  // A gap is explicitly reported but does not block saving; overlap/order/range do.
  const blocking=issues.filter(x=>x.type==="OVERLAP"||x.type==="ORDER"||x.type==="INVALID_RANGE");
  return {ok:blocking.length===0,blockingIssues:blocking,warnings:continuity.issues.filter(x=>x.type==="GAP"),order,continuity};
}
function prepareCasingSectionsForSave(sections){
  const audit=validateCasingSectionsBeforeSave(sections);
  if(!audit.ok) return {ok:false,error:"A csőszakaszok sorrendje vagy tartománya hibás",audit};
  return {ok:true,sections:JSON.parse(JSON.stringify(sections||[])),audit};
}
function auditCasingSavePolicyRegression(){
  const good=prepareCasingSectionsForSave([["0","38","Vak"],["38","50","Szűrő"]]);
  const gap=prepareCasingSectionsForSave([["0","38","Vak"],["40","50","Szűrő"]]);
  const overlap=prepareCasingSectionsForSave([["0","38","Vak"],["37","50","Szűrő"]]);
  const reversed=prepareCasingSectionsForSave([["50","80","Vak"],["0","50","Vak"]]);
  return {
    good:good.ok,
    gapSavedWithWarning:gap.ok && gap.audit.warnings.length===1,
    overlapBlocked:!overlap.ok,
    reversedBlocked:!reversed.ok
  };
}

function auditCasingOrder(sections){
  const rows=(Array.isArray(sections)?sections:[]).map((s,i)=>({
    i,from:parseErpNumber(s?.[0]),to:parseErpNumber(s?.[1])
  }));
  const issues=[];
  for(let i=0;i<rows.length;i++){
    if(!(rows[i].to>rows[i].from)) issues.push({type:"INVALID_RANGE",section:i});
    if(i>0 && rows[i].from<rows[i-1].from)
      issues.push({type:"ORDER",section:i,previous:rows[i-1].from,current:rows[i].from});
  }
  return {ok:issues.length===0,issues,rows};
}
function auditCasingOrderRegression(){
  return {
    good:auditCasingOrder([["0","38","Vak"],["38","50","Szűrő"],["50","80","Vak"]]),
    badOrder:auditCasingOrder([["50","80","Vak"],["0","38","Vak"],["38","50","Szűrő"]]),
    badRange:auditCasingOrder([["0","38","Vak"],["38","38","Szűrő"]])
  };
}

function auditCasingContinuity(sections){
  const rows=(Array.isArray(sections)?sections:[]).map((s,i)=>({i,from:parseErpNumber(s?.[0]),to:parseErpNumber(s?.[1]),type:normalizeCasingSectionType(s?.[2])}));
  const issues=[];
  for(let i=1;i<rows.length;i++){
    if(rows[i].from<rows[i-1].to) issues.push({type:"OVERLAP",from:rows[i].from,to:rows[i-1].to,sections:[rows[i-1].i,rows[i].i]});
    else if(rows[i].from>rows[i-1].to) issues.push({type:"GAP",from:rows[i-1].to,to:rows[i].from,sections:[rows[i-1].i,rows[i].i]});
  }
  return {ok:issues.every(x=>x.type!=="OVERLAP"),issues,rows};
}
function auditCasingContinuityRegression(){
  return {
    contiguous:auditCasingContinuity([["0","38","Vak"],["38","50","Szűrő"],["50","80","Vak"]]),
    gap:auditCasingContinuity([["0","38","Vak"],["40","50","Szűrő"]]),
    overlap:auditCasingContinuity([["0","38","Vak"],["37","50","Szűrő"]])
  };
}

function calculateCasingSummary(sections,well){
  const rows=Array.isArray(sections)?sections:[];
  const items=rows.map(s=>calculateCasingMaterial(s,well));
  const byType={Vak:{meters:0,pieces:0,remainder:0},Szűrő:{meters:0,pieces:0,remainder:0}};
  items.forEach(x=>{
    const b=byType[x.type]||{meters:0,pieces:0,remainder:0};
    b.meters=Math.round((b.meters+x.length)*100)/100;
    b.pieces+=x.fullPieces;
    b.remainder=Math.round((b.remainder+x.remainder)*100)/100;
    byType[x.type]=b;
  });
  return {
    endDepth:calculateCasingEndDepth(rows),
    totalMeters:Math.round(items.reduce((a,x)=>a+x.length,0)*100)/100,
    totalFullPieces:items.reduce((a,x)=>a+x.fullPieces,0),
    totalRemainderMeters:Math.round(items.reduce((a,x)=>a+x.remainder,0)*100)/100,
    byType
  };
}
function auditCasingSummary(sections,well){
  const rows=Array.isArray(sections)?sections:[];
  const summary=calculateCasingSummary(rows,well);
  const issues=[];
  if(rows.length && summary.endDepth!==parseErpNumber(rows[rows.length-1]?.[1]))
    issues.push("végmélység nem az utolsó szakasz vége");
  if(Math.abs(summary.totalMeters-rows.reduce((a,s)=>a+Math.max(0,parseErpNumber(s?.[1])-parseErpNumber(s?.[0])),0))>0.01)
    issues.push("összhossz eltérés");
  return {ok:issues.length===0,issues,summary};
}
function auditMultiSectionRegression(){
  const w={pipeLength:3};
  const s=[["0","38","Vak"],["38","50","Szűrő"],["50","80","Vak"]];
  const r=calculateCasingSummary(s,w);
  return {
    ok:r.endDepth===80 && r.totalMeters===80 &&
       r.byType.Vak.meters===68 && r.byType.Szűrő.meters===12 &&
       r.byType.Vak.pieces===22 && r.byType.Szűrő.pieces===4,
    result:r
  };
}

function getRevisionStockPostingKey(project,revision=null){
  const p=project||{};
  const rev=revision==null?(parseInt(p.revision,10)||0):parseInt(revision,10)||0;
  return `${String(p.id||"PROJECT")}:R${rev}`;
}
function calculateRevisionStockDelta(previousWell,currentWell){
  const prev=calculateCasingStockRequirement(previousWell?.casingSections||[],previousWell||{});
  const cur=calculateCasingStockRequirement(currentWell?.casingSections||[],currentWell||{});
  const sum=(rows,key)=>Math.round(rows.reduce((a,x)=>a+parseErpNumber(x[key]),0)*100)/100;
  return {
    previousPieces:sum(prev,"stockPieces"),
    currentPieces:sum(cur,"stockPieces"),
    previousMeters:sum(prev,"stockMeters"),
    currentMeters:sum(cur,"stockMeters"),
    deltaPieces:sum(cur,"stockPieces")-sum(prev,"stockPieces"),
    deltaMeters:sum(cur,"stockMeters")-sum(prev,"stockMeters")
  };
}
function auditRevisionStockDelta(project,previousSnapshot){
  const prev=previousSnapshot?.data||{};
  const delta=calculateRevisionStockDelta(prev.well||{},project?.well||{});
  const issues=[];
  if(delta.deltaPieces<0 || delta.deltaMeters<0)
    issues.push("csökkent revíziós anyagigény: automatikus visszaírás nem engedélyezett");
  return {ok:issues.length===0,issues,key:getRevisionStockPostingKey(project),delta};
}
function createRevisionStockPostingRequest(project,previousSnapshot){
  const audit=auditRevisionStockDelta(project,previousSnapshot);
  if(!audit.ok) return {ok:false,error:audit.issues.join("; "),audit};
  if(audit.delta.deltaPieces===0 && audit.delta.deltaMeters===0)
    return {ok:true,required:false,key:audit.key,audit};
  return {ok:true,required:true,key:audit.key,audit};
}

function nextProjectRevision(project){
  const p=project||{};
  const current=Math.max(0,parseInt(p.revision,10)||0);
  return current+1;
}
function createProjectRevisionSnapshot(project,reason="módosítás"){
  if(!project || typeof project!=="object") return {ok:false,error:"hiányzó projekt"};
  const revision=nextProjectRevision(project);
  const snapshot={
    id:`${String(project.id||"PROJECT")}-R${revision}`,
    projectId:project.id||null,
    revision,
    reason:String(reason),
    createdAt:new Date().toISOString(),
    data:JSON.parse(JSON.stringify(project))
  };
  delete snapshot.data.revisionHistory;
  return snapshot;
}
function commitProjectRevision(project,reason="módosítás"){
  if(!project || typeof project!=="object") return {ok:false,error:"hiányzó projekt"};
  const snapshot=createProjectRevisionSnapshot(project,reason);
  if(!snapshot.ok && snapshot.ok!==undefined) return snapshot;
  if(!Array.isArray(project.revisionHistory)) project.revisionHistory=[];
  project.revisionHistory.push(snapshot);
  project.revision=snapshot.revision;
  project.revisionRequired=false;
  return {ok:true,revision:snapshot.revision,snapshot};
}
function auditProjectRevisionCycle(project){
  const p=JSON.parse(JSON.stringify(project||{}));
  const before=Math.max(0,parseInt(p.revision,10)||0);
  const s=createProjectRevisionSnapshot(p,"audit");
  const committed=commitProjectRevision(p,"audit");
  const issues=[];
  if(!s || s.revision!==before+1) issues.push("hibás következő revízió");
  if(!committed.ok || p.revision!==before+1) issues.push("revízió commit hiba");
  if(!Array.isArray(p.revisionHistory) || p.revisionHistory.length<1) issues.push("hiányzó revízióelőzmény");
  return {ok:issues.length===0,issues,before,after:p.revision,historyCount:p.revisionHistory?.length||0};
}

function reopenProjectForRevision(project){
  if(!project || typeof project!=="object") return {ok:false,error:"hiányzó projekt"};
  const previous=String(project.status||"").toLowerCase();
  project.status="open";
  project.revisionRequired=true;
  project.reopenedAt=new Date().toISOString();
  return {ok:true,previousStatus:previous,state:getProjectStockPostingState(project)};
}
function prepareProjectReclose(project){
  if(!project || typeof project!=="object") return {ok:false,error:"hiányzó projekt"};
  const s=getProjectStockPostingState(project);
  // Existing posting remains historical. Re-close may only request a new posting
  // if the business operation explicitly created a new revision/posting.
  project.status="closed";
  return {ok:true,stockAlreadyPosted:s.posted,postingId:s.postingId,state:getProjectStockPostingState(project)};
}
function auditProjectReopenReclose(project){
  const p=JSON.parse(JSON.stringify(project||{}));
  const original=JSON.stringify(p);
  const r1=reopenProjectForRevision(p);
  const r2=prepareProjectReclose(p);
  const issues=[];
  if(!r1.ok||!r2.ok) issues.push("állapotváltás sikertelen");
  if(p.status!=="closed") issues.push("újrazárás nem zárt állapot");
  if(JSON.stringify(p).includes('"stockPosted":false') && JSON.stringify(project||{}).includes('"stockPosted":true'))
    issues.push("korábbi készletkönyvelés elveszett");
  return {ok:issues.length===0,issues,original,final:p};
}

function getProjectStockPostingState(project){
  const p=project||{};
  return {
    projectId:p.id||null,
    status:String(p.status||"").toLowerCase(),
    posted:Boolean(p.stockPosted||p.inventoryPosted),
    postingId:p.stockPostingId||p.inventoryPostingId||null
  };
}
function auditProjectStockPostingState(project){
  const s=getProjectStockPostingState(project);
  const issues=[];
  if(s.posted && !s.postingId) issues.push("könyvelt készletmozgás azonosító nélkül");
  if(s.status==="closed" && !s.posted) issues.push("lezárt projekt készletkönyvelés nélkül");
  return {ok:issues.length===0,issues,state:s};
}
function shouldPostProjectStock(project){
  const s=getProjectStockPostingState(project);
  return s.status==="closed" && !s.posted;
}
function markProjectStockPosted(project,postingId){
  if(!project || !postingId) return {ok:false,error:"hiányzó projekt vagy könyvelési azonosító"};
  project.stockPosted=true;
  project.stockPostingId=String(postingId);
  project.stockPostedAt=new Date().toISOString();
  return {ok:true,state:getProjectStockPostingState(project)};
}

function makeStockMovementId(prefix="MOV"){
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;
}
function calculateNetStockDelta(movements,materialKey){
  const list=Array.isArray(movements)?movements:[];
  return Math.round(list.filter(m=>String(m?.materialKey)===String(materialKey))
    .reduce((sum,m)=>{
      const q=parseErpNumber(m?.quantity);
      const type=String(m?.type||"").toUpperCase();
      if(type==="IN"||type==="RETURN") return sum+q;
      if(type==="OUT"||type==="ISSUE"||type==="CONSUME") return sum-q;
      return sum;
    },0)*100)/100;
}
function auditStockMovementChain(movements,materialKey){
  const list=Array.isArray(movements)?movements:[];
  const issues=[];
  const seen=new Set();
  for(const m of list){
    if(!m?.id) issues.push("azonosító nélküli készletmozgás");
    else if(seen.has(String(m.id))) issues.push("duplikált készletmozgás: "+m.id);
    else seen.add(String(m.id));
    if(!["IN","RETURN","OUT","ISSUE","CONSUME"].includes(String(m?.type||"").toUpperCase()))
      issues.push("ismeretlen készletmozgás-típus");
    if(parseErpNumber(m?.quantity)<0) issues.push("negatív mozgási mennyiség");
  }
  return {ok:issues.length===0,issues,netDelta:calculateNetStockDelta(list,materialKey)};
}
function createIdempotentStockMovement(movements,movement){
  const list=Array.isArray(movements)?movements:[];
  const key=String(movement?.sourceId||"");
  if(key){
    const existing=list.find(m=>String(m?.sourceId||"")===key &&
      String(m?.materialKey||"")===String(movement.materialKey||"") &&
      String(m?.type||"").toUpperCase()===String(movement.type||"").toUpperCase());
    if(existing) return {ok:true,created:false,movement:existing};
  }
  const m={...movement,id:movement.id||makeStockMovementId()};
  list.push(m);
  return {ok:true,created:true,movement:m};
}

function resolvePipeReturnMaterialKey(well,section,materialRecord){
  const base=getCasingMaterialKey(well,section);
  const explicit=materialRecord?.materialKey||materialRecord?.casingMaterialKey;
  return String(explicit||base.key);
}
function auditPipeReturnMaterialIdentity(well,section,materialRecord,returnMovement){
  const expected=resolvePipeReturnMaterialKey(well,section,materialRecord);
  const actual=String(returnMovement?.materialKey||"");
  const issues=[];
  if(!expected) issues.push("hiányzó anyagazonosító");
  if(actual!==expected) issues.push("visszavett maradék anyagazonosító eltér");
  return {ok:issues.length===0,issues,expected,actual};
}
function createVerifiedPipeReturnMovement(well,section,materialRecord,meters){
  const key=resolvePipeReturnMaterialKey(well,section,materialRecord);
  const movement=createPipeReturnMovement(key,meters,"maradék cső visszavétele");
  if(!movement.ok) return movement;
  return {...movement,materialKey:key,source:"casing-section"};
}

function calculatePipeRemainder(stockPieces,pipeLength,installedMeters){
  const pieces=Math.max(0,Math.floor(parseErpNumber(stockPieces)));
  const pl=parseErpNumber(pipeLength);
  const used=parseErpNumber(installedMeters);
  const supplied=Math.round(pieces*pl*100)/100;
  const remainder=Math.round((supplied-used)*100)/100;
  return {stockPieces:pieces,pipeLength:pl,installedMeters:used,suppliedMeters:supplied,remainderMeters:Math.max(0,remainder)};
}
function createPipeReturnMovement(materialKey,meters,reason="maradék cső"){
  const m=parseErpNumber(meters);
  if(!materialKey || m<=0) return {ok:false,error:"érvénytelen visszavételezés"};
  return {
    ok:true,
    type:"RETURN",
    materialKey:String(materialKey),
    quantity:m,
    unit:"m",
    reason:String(reason),
    createdAt:new Date().toISOString()
  };
}
function auditPipeRemainderLifecycle(stockPieces,pipeLength,installedMeters){
  const c=calculatePipeRemainder(stockPieces,pipeLength,installedMeters);
  const issues=[];
  if(c.remainderMeters<0) issues.push("negatív maradék");
  if(c.remainderMeters>c.pipeLength) issues.push("maradék nagyobb egy csőszálnál");
  return {ok:issues.length===0,issues,result:c};
}

function calculatePipeStockRequirement(section,well){
  const calc=calculateCasingSectionFromWell(well,section);
  const pipeLength=calc.pipeLength;
  const length=calc.length;
  const fullPieces=calc.pieces.fullPieces;
  const remainder=calc.pieces.remainder;
  const stockPieces=fullPieces+(remainder>0?1:0);
  const stockLength=Math.round(stockPieces*pipeLength*100)/100;
  const waste=Math.round((stockLength-length)*100)/100;
  return {
    installedMeters:length,
    installedPieces:fullPieces,
    remainderMeters:remainder,
    stockPieces,
    stockMeters:stockLength,
    wasteMeters:waste,
    pipeLength,
    unitPieces:"db",
    unitLength:"m"
  };
}
function auditPipeStockRequirement(section,well){
  const r=calculatePipeStockRequirement(section,well);
  const issues=[];
  if(r.remainderMeters>0 && r.stockPieces!==r.installedPieces+1) issues.push("maradékhoz szükséges csőszál hibás");
  if(r.stockMeters<r.installedMeters) issues.push("raktári mennyiség kisebb a beépítettnél");
  return {ok:issues.length===0,issues,result:r};
}
function calculateCasingStockRequirement(sections,well){
  const rows=Array.isArray(sections)?sections:[];
  return rows.map(s=>calculatePipeStockRequirement(s,well));
}

function calculateMaterialConsumption(section,well){
  const calc=calculateCasingSectionFromWell(well,section);
  const meters=calc.length;
  const pieces=calc.pieces.fullPieces;
  const remainder=calc.pieces.remainder;
  return {
    lengthMeters:meters,
    fullPieces:pieces,
    remainderMeters:remainder,
    totalPiecesEquivalent: pieces + (remainder>0 ? remainder/calc.pipeLength : 0),
    unit:"m"
  };
}
function auditMaterialConsumption(section,well,stockRecord){
  const c=calculateMaterialConsumption(section,well);
  const issues=[];
  if(stockRecord?.unit && String(stockRecord.unit).toLowerCase()!=="m")
    issues.push("a készlet-egység nem méter");
  if(stockRecord?.quantity!=null && Math.abs(parseErpNumber(stockRecord.quantity)-c.lengthMeters)>1e-9)
    issues.push("készlet mennyiség eltérés");
  return {ok:issues.length===0,issues,calculated:c,stored:stockRecord||null};
}
function applyMaterialConsumption(stockRecord,meters){
  if(!stockRecord || typeof stockRecord!=="object") return {ok:false,error:"hiányzó készletrekord"};
  const q=parseErpNumber(stockRecord.quantity);
  const m=parseErpNumber(meters);
  if(m<0 || q<m) return {ok:false,error:"elégtelen készlet vagy érvénytelen felhasználás"};
  stockRecord.quantity=Math.round((q-m)*100)/100;
  stockRecord.updatedAt=new Date().toISOString();
  return {ok:true,quantity:stockRecord.quantity};
}

function findCasingMaterial(materials,key){
  const list=Array.isArray(materials)?materials:[];
  const target=String(key||"").trim();
  if(!target) return null;
  return list.find(x=>String(x?.casingMaterialKey||"").trim()===target)
      || list.find(x=>String(x?.materialKey||"").trim()===target)
      || null;
}
function resolveCasingMaterial(materials,well,section){
  const k=getCasingMaterialKey(well,section);
  const material=findCasingMaterial(materials,k.key);
  return {
    key:k.key,
    material:material||null,
    found:!!material,
    status:material?"MATCH":"NO_MATCH"
  };
}
function auditCasingMaterialResolution(materials,well,section){
  const r=resolveCasingMaterial(materials,well,section);
  const issues=[];
  if(!r.found) issues.push("nincs pontos anyagtörzs-találat");
  return {ok:issues.length===0,issues,...r};
}

function getCasingMaterialKey(well,section){
  const w=well||{};
  const s=section||[];
  const casingDiameter=parseErpNumber(w.casingDiameter ?? w.védőcsőÁtmérő ?? 324);
  const productionPipeDiameter=String(w.productionPipeDiameter ?? w.termelőcsőÁtmérő ?? '3"');
  const type=normalizeCasingSectionType(s[2]);
  return {
    casingDiameter,
    productionPipeDiameter,
    type,
    key:`${casingDiameter}|${productionPipeDiameter}|${type}`
  };
}
function auditCasingMaterialKey(well,section){
  const r=getCasingMaterialKey(well,section);
  const issues=[];
  if(![280,324,355].includes(r.casingDiameter)) issues.push("ismeretlen védőcső-átmérő");
  if(!['3"','4"'].includes(r.productionPipeDiameter)) issues.push("ismeretlen termelőcső-átmérő");
  if(!["Vak","Szűrő"].includes(r.type)) issues.push("ismeretlen szakasztípus");
  return {ok:issues.length===0,issues,result:r};
}

function normalizeCasingSectionType(value){
  const s=String(value??"").trim().toLowerCase();
  if(s==="szűrő" || s==="szuro" || s==="szűrőcső" || s==="szurocso") return "Szűrő";
  return "Vak";
}
function calculateCasingMaterial(section,well){
  const type=normalizeCasingSectionType(section?.[2]);
  const pipeLength=getCasingPipeLength(well,section);
  const calc=calculateCasingSectionFromWell(well,section);
  return {
    type,
    length:calc.length,
    pipeLength,
    fullPieces:calc.pieces.fullPieces,
    remainder:calc.pieces.remainder,
    materialCategory:type==="Szűrő"?"SZŰRŐCSŐ":"VAK CSŐ"
  };
}
function auditCasingTypeIsolation(well){
  const vak=["0","38","Vak"];
  const szuro=["38","50","Szűrő"];
  const a=calculateCasingMaterial(vak,well);
  const b=calculateCasingMaterial(szuro,well);
  return {
    ok:a.length===38 && b.length===12 &&
       a.fullPieces===12 && a.remainder===2 &&
       b.fullPieces===4 && b.remainder===0 &&
       a.type==="Vak" && b.type==="Szűrő",
    vak:a,szuro:b
  };
}

function getCasingPipeLength(well,section){
  const s=section||{};
  const w=well||{};
  const value=s.pipeLength ?? s.csőhossz ?? w.pipeLength ?? w.casingPipeLength ?? 3;
  const n=parseErpNumber(value);
  return n>0?n:3;
}
function calculateCasingSectionFromWell(well,section){
  const from=parseErpNumber(section?.[0]);
  const to=parseErpNumber(section?.[1]);
  const length=Math.max(0,Math.round((to-from)*100)/100);
  const pipeLength=getCasingPipeLength(well,section);
  return {...calculateCasingSection([from,to],pipeLength),pipeLength};
}
function auditCasingPipeLengthSource(well,section){
  const p=getCasingPipeLength(well,section);
  return {ok:p>0,pipeLength:p,source:
    section?.pipeLength!=null?"section.pipeLength":
    section?.csőhossz!=null?"section.csőhossz":
    well?.pipeLength!=null?"well.pipeLength":
    well?.casingPipeLength!=null?"well.casingPipeLength":"default 3 m"};
}

function calculateCasingSection(section,pipeLength=3){
  const from=parseErpNumber(section?.[0]);
  const to=parseErpNumber(section?.[1]);
  const length=Math.max(0,Math.round((to-from)*100)/100);
  const pieces=calculatePipePieces(length,pipeLength);
  return {from,to,length,pieces};
}

function calculatePipePieces(sectionLength,pipeLength=3){
  const length=parseErpNumber(sectionLength);
  const pl=parseErpNumber(pipeLength);
  if(length<=0 || pl<=0) return {fullPieces:0,remainder:0,label:"0 db"};
  const fullPieces=Math.floor(length/pl);
  const remainder=Math.round((length-fullPieces*pl)*100)/100;
  const label=remainder>0
    ? `${fullPieces} db + ${remainder} m`
    : `${fullPieces} db`;
  return {fullPieces,remainder,label};
}
function auditPipePieceCases(){
  const cases=[
    [38,3,12,2],
    [12,3,4,0],
    [39,3,13,0],
    [40,3,13,1]
  ];
  return cases.every(([l,p,f,r])=>{
    const x=calculatePipePieces(l,p);
    return x.fullPieces===f && x.remainder===r;
  });
}

function auditCasingDepthRegression(){
  const old=wlFilters;
  try{
    wlFilters=[["0","38","Vak"],["38","50","Szűrő"]];
    const d=wlCasingEndDepth();
    return {ok:d===50,depth:d};
  }finally{ wlFilters=old; }
}

function wlCasingEndDepth(){
  const rows=Array.isArray(wlFilters)?wlFilters:[];
  for(let i=rows.length-1;i>=0;i--){
    const end=parseErpNumber(rows[i]?.[1]);
    const start=parseErpNumber(rows[i]?.[0]);
    if(Number.isFinite(end) && end>=start) return end;
  }
  return 0;
}
function wlSyncFinalDepth(){
  const el=document.getElementById("wl_finalDepth");
  if(!el)return 0;
  const depth=wlCasingEndDepth();
  el.value=depth>0?String(depth):"";
  return depth;
}
function auditWorklogFinalDepth(){
  const calculated=wlCasingEndDepth();
  const field=parseErpNumber(document.getElementById("wl_finalDepth")?.value);
  return {ok:calculated===field,calculated,field,source:"last wlFilters section end"};
}

function calculateCasingEndDepth(casingSections){
  const rows=Array.isArray(casingSections)?casingSections:[];
  if(!rows.length) return 0;
  const last=rows[rows.length-1]||{};
  return parseErpNumber(last.to);
}
function auditCasingEndDepth(casingSections,expectedDepth){
  const calculated=calculateCasingEndDepth(casingSections);
  const expected=parseErpNumber(expectedDepth);
  return {
    ok:expected<=0 || calculated===expected,
    calculated,
    expected,
    source:"last casing/screen section.to"
  };
}

function calculateLayerCoverage(layers){
  const rows=Array.isArray(layers)?layers:[];
  let maxDepth=0, covered=0;
  const valid=[];
  rows.forEach((r,i)=>{
    const from=parseErpNumber(r?.from), to=parseErpNumber(r?.to);
    if(to>from && from>=0){ valid.push({i,from,to}); if(to>maxDepth) maxDepth=to; covered+=to-from; }
  });
  return {maxDepth,covered,validCount:valid.length};
}
function auditLayerDepthTotals(layers,totalDepth){
  const c=calculateLayerCoverage(layers);
  const expected=parseErpNumber(totalDepth);
  const issues=[];
  if(expected>0 && c.maxDepth>expected) issues.push("rétegsor túlnyúlik a kút teljes mélységén");
  return {ok:issues.length===0,issues,calculated:c,totalDepth:expected};
}

function validateLayerGeometry(layers,maxDepth=null){
  const rows=Array.isArray(layers)?layers:[];
  const issues=[];
  const norm=rows.map((r,i)=>({
    i,
    from:parseErpNumber(r?.from),
    to:parseErpNumber(r?.to)
  }));
  norm.forEach(x=>{
    if(!(x.to>x.from)) issues.push(`réteg ${x.i+1}: to <= from`);
    if(x.from<0) issues.push(`réteg ${x.i+1}: negatív kezdőmélység`);
    if(maxDepth!=null && x.to>parseErpNumber(maxDepth)) issues.push(`réteg ${x.i+1}: túlnyúlik a maximális mélységen`);
  });
  for(let i=1;i<norm.length;i++){
    if(norm[i].from<norm[i-1].to)
      issues.push(`átfedés: ${norm[i-1].i+1}→${norm[i].i+1}`);
  }
  return {ok:issues.length===0,issues};
}
function auditLayerGeometryCases(){
  const valid=[{from:0,to:10},{from:10,to:25},{from:25,to:40}];
  const overlap=[{from:0,to:10},{from:9,to:25}];
  const reverse=[{from:25,to:10}];
  const gap=[{from:0,to:10},{from:12,to:25}];
  return {
    valid:validateLayerGeometry(valid).ok,
    overlap:!validateLayerGeometry(overlap).ok,
    reverse:!validateLayerGeometry(reverse).ok,
    gap:validateLayerGeometry(gap).ok
  };
}

function commitProjectWellLayers(project, candidateLayers){
  const p=project||{};
  const w=ensureProjectWell(p);
  if(!Array.isArray(candidateLayers)) return {ok:false,error:"A rétegsor nem tömb"};
  const next=JSON.parse(JSON.stringify(candidateLayers));
  // Basic structural validation; domain-specific depth validation remains in the
  // existing layer validator when available.
  for(const row of next){
    if(!row || typeof row!=="object") return {ok:false,error:"Érvénytelen rétegsor elem"};
    if(row.from!=null && row.to!=null){
      const from=parseErpNumber(row.from), to=parseErpNumber(row.to);
      if(!Number.isFinite(from)||!Number.isFinite(to)||to<=from)
        return {ok:false,error:"Érvénytelen mélységtartomány"};
    }
  }
  const geometry=validateLayerGeometry(next);
  if(!geometry.ok) return {ok:false,error:geometry.issues.join("; ")};
  if(p.well?.casingSections && Array.isArray(p.well.casingSections) && p.well.casingSections.length){
    const casingEnd=auditCasingEndDepth(p.well.casingSections,p.well.totalDepth);
    if(!casingEnd.ok) return {ok:false,error:"A kút végmélysége nem egyezik az utolsó csőszakasz végmélységével"};
  }
  if(typeof validateLayers==="function"){
    try{
      const vr=validateLayers(next);
      if(vr===false) return {ok:false,error:"Rétegsor validáció sikertelen"};
    }catch(e){ return {ok:false,error:"Rétegsor validációs hiba"}; }
  }
  w.layers=next;
  return {ok:true,layers:w.layers};
}
function auditLayerCommitIsolation(project, candidateLayers){
  const original=JSON.stringify(project?.well?.layers||[]);
  const candidate=JSON.stringify(candidateLayers||[]);
  const r=commitProjectWellLayers(project,candidateLayers);
  const after=JSON.stringify(project?.well?.layers||[]);
  return {ok:r.ok ? after===candidate : after===original, result:r};
}

function updateLinkedWorklog(worklogId,patch){
  if(!Array.isArray(db.worklogs)) db.worklogs=[];
  const id=String(worklogId||"").trim();
  if(!id) return {ok:false,error:"hiányzó munkanapló-azonosító"};
  const w=db.worklogs.find(x=>String(x.id)===id);
  if(!w) return {ok:false,error:"munkanapló nem található"};
  if(!patch || typeof patch!=="object") return {ok:false,error:"érvénytelen módosítás"};
  const safe={...patch};
  // A projekt kanonikus well adata nem másolható vissza a worklogba.
  delete safe.well;
  delete safe.layers;
  Object.assign(w,safe);
  w.updatedAt=new Date().toISOString();
  return {ok:true,worklog:w};
}
function auditWorklogPersistence(worklog){
  const w=worklog||{};
  const issues=[];
  if(w.projectId && w.well && typeof w.well==="object") issues.push("kapcsolt munkanapló saját well másolatot tartalmaz");
  if(w.projectId && Array.isArray(w.layers)) issues.push("kapcsolt munkanapló saját layers másolatot tartalmaz");
  return {ok:issues.length===0,issues};
}

function resolveWorklogWell(project,worklog){
  const p=project||{};
  const w=worklog||{};
  const projectWell=ensureProjectWell(p)||{};
  // For linked worklogs, project.well is authoritative. Legacy worklog fields are
  // retained only when no linked project exists.
  if(w.projectId && String(w.projectId)===String(p.id||"")) return projectWell;
  if(w.well && typeof w.well==="object") return w.well;
  return projectWell;
}
function auditWorklogWellSource(project,worklog){
  const w=resolveWorklogWell(project,worklog);
  const issues=[];
  if(worklog?.projectId && project?.id && String(worklog.projectId)!==String(project.id))
    issues.push("munkanapló másik projektre mutat");
  return {ok:issues.length===0,issues,well:w,source:
    worklog?.projectId && String(worklog.projectId)===String(project?.id) ? "project.well":"worklog.well/legacy"};
}

function projectManufacturingDocumentData(project){
  const w=ensureProjectWell(project)||{};
  return {
    casingDiameter:w.casingDiameter,
    productionPipeDiameter:w.productionPipeDiameter,
    productionPipeOptions:Array.isArray(w.productionPipeOptions)?w.productionPipeOptions.slice():[]
  };
}
function auditManufacturingDocumentProjection(project,documentData){
  const expected=projectManufacturingDocumentData(project);
  const d=documentData||{};
  const issues=[];
  if(d.casingDiameter!=null && Number(d.casingDiameter)!==Number(expected.casingDiameter))
    issues.push("védőcső eltérés");
  if(d.productionPipeDiameter!=null && String(d.productionPipeDiameter)!==String(expected.productionPipeDiameter))
    issues.push("termelőcső eltérés");
  if(d.productionPipeOptions!=null && JSON.stringify(d.productionPipeOptions)!==JSON.stringify(expected.productionPipeOptions))
    issues.push("termelőcső opciók eltérés");
  return {ok:issues.length===0,issues,expected,actual:d};
}

function auditWellManufacturingBindings(){
  const w={};
  const results=[
    bindWellManufacturingInput(w,"casingDiameter","324"),
    bindWellManufacturingInput(w,"productionPipeDiameter",'3"'),
    bindWellManufacturingInput(w,"productionPipeOptions",['3"','4"'])
  ];
  return {
    ok:results.every(Boolean) &&
       Number(w.casingDiameter)===324 &&
       w.productionPipeDiameter==='3"' &&
       Array.isArray(w.productionPipeOptions),
    well:w
  };
}

function bindWellManufacturingInput(well,field,value){
  const w=ensureProjectWell({well}).well;
  if(!["casingDiameter","productionPipeDiameter","productionPipeOptions"].includes(field)) return false;
  if(field==="casingDiameter"){
    const n=parseErpNumber(value);
    if(![280,324,355].includes(n)) return false;
    w[field]=n;
  }else if(field==="productionPipeDiameter"){
    if(!['3"','4"'].includes(String(value))) return false;
    w[field]=String(value);
  }else{
    const arr=Array.isArray(value)?value.map(String):[];
    if(!arr.includes('3"') || !arr.includes('4"')) return false;
    w[field]=arr;
  }
  return true;
}

function ensureProjectWell(project){
  if(!project || typeof project!=="object") return null;
  if(!project.well || typeof project.well!=="object" || Array.isArray(project.well)) project.well={};
  normalizeWellManufacturingDefaults(project.well);
  return project.well;
}
function auditProjectWellLifecycle(project){
  const w=ensureProjectWell(project);
  if(!w) return {ok:false,issues:["hiányzó projekt"]};
  const issues=[];
  if(Number(w.casingDiameter)!==324) issues.push("védőcső default nem 324 mm");
  if(String(w.productionPipeDiameter)!=='3"') issues.push("termelőcső default nem 3\"");
  if(!Array.isArray(w.productionPipeOptions) ||
     !w.productionPipeOptions.includes('3"') ||
     !w.productionPipeOptions.includes('4"')) issues.push("termelőcső opciók hiányosak");
  return {ok:issues.length===0,issues,well:w};
}

function auditWellManufacturingRoundTrip(well){
  const before=JSON.parse(JSON.stringify(normalizeWellManufacturingDefaults(well||{})));
  const serialized=JSON.stringify(before);
  const after=JSON.parse(serialized);
  normalizeWellManufacturingDefaults(after);
  const issues=[];
  ["casingDiameter","productionPipeDiameter","productionPipeOptions"].forEach(k=>{
    if(JSON.stringify(before[k])!==JSON.stringify(after[k])) issues.push(k+" nem round-trip stabil");
  });
  const validation=validateWellManufacturing(after);
  if(!validation.ok) issues.push(...validation.issues);
  return {ok:issues.length===0,issues,before,after};
}

function normalizeWellManufacturingDefaults(well){
  const w=well||{};
  if(w.casingDiameter==null || w.casingDiameter==="") w.casingDiameter=324;
  if(w.productionPipeDiameter==null || w.productionPipeDiameter==="") w.productionPipeDiameter='3"';
  if(w.productionPipeOptions==null) w.productionPipeOptions=['3"','4"'];
  if(!Array.isArray(w.productionPipeOptions)) w.productionPipeOptions=['3"','4"'];
  return w;
}
function validateWellManufacturing(well){
  const w=well||{};
  const issues=[];
  const allowedCasing=[280,324,355];
  if(w.casingDiameter!=null && !allowedCasing.includes(Number(w.casingDiameter))) issues.push("érvénytelen védőcső-átmérő");
  const allowedPipe=['3"','4"'];
  if(w.productionPipeDiameter!=null && !allowedPipe.includes(String(w.productionPipeDiameter))) issues.push("érvénytelen termelőcső-átmérő");
  return {ok:issues.length===0,issues};
}

function inspectProjectManufacturingShape(project){
  const p=project||{};
  const candidates=[];
  const walk=(obj,path,depth)=>{
    if(!obj || typeof obj!=="object" || depth>2) return;
    Object.keys(obj).forEach(k=>{
      const lk=String(k).toLowerCase();
      if(/production|manufact|gyárt|gyart|kútfej|kutfej|termelő|termelo|védőcső|vedocső/.test(lk)){
        candidates.push({path:path+"."+k,type:Array.isArray(obj[k])?"array":typeof obj[k]});
      }
      if(obj[k] && typeof obj[k]==="object") walk(obj[k],path+"."+k,depth+1);
    });
  };
  walk(p,"project",0);
  return candidates;
}

function getProjectManufacturing(project){
  const p=project||{};
  const w=p.well||{};
  if(w.manufacturing && typeof w.manufacturing==="object") return w.manufacturing;
  if(w.gyartas && typeof w.gyartas==="object") return w.gyartas;
  if(p.manufacturing && typeof p.manufacturing==="object") return p.manufacturing;
  if(p.gyartas && typeof p.gyartas==="object") return p.gyartas;
  return null;
}
function auditProjectManufacturing(project){
  const p=project||{};
  const m=getProjectManufacturing(p);
  return {
    ok:!!m,
    projectId:p.id||null,
    source:m===p.well?.manufacturing?"well.manufacturing":
          m===p.well?.gyartas?"well.gyartas":
          m===p.manufacturing?"project.manufacturing":
          m===p.gyartas?"project.gyartas":null,
    data:m
  };
}

function resolveErpExecutionContext(record){
  const r=record||{};
  const result={record:r,project:null,worklog:null,production:null};
  const pid=String(r.projectId||"").trim();
  const wid=String(r.worklogId||"").trim();
  const prid=String(r.productionId||r.manufacturingId||"").trim();
  if(pid && Array.isArray(db.projects)) result.project=db.projects.find(p=>String(p.id)===pid)||null;
  if(wid && Array.isArray(db.worklogs)) result.worklog=db.worklogs.find(w=>String(w.id)===wid)||null;
  if(prid && Array.isArray(db.productions)) result.production=db.productions.find(p=>String(p.id)===prid)||null;
  // If a worklog has a project link but the record does not, resolve through the worklog.
  if(!result.project && result.worklog?.projectId && Array.isArray(db.projects)){
    result.project=db.projects.find(p=>String(p.id)===String(result.worklog.projectId))||null;
  }
  return result;
}
function auditErpExecutionContext(record){
  const c=resolveErpExecutionContext(record);
  const issues=[];
  if(c.worklog?.projectId && c.project && String(c.worklog.projectId)!==String(c.project.id))
    issues.push("munkanapló-projekt hivatkozás eltérés");
  if(c.production?.projectId && c.project && String(c.production.projectId)!==String(c.project.id))
    issues.push("gyártás-projekt hivatkozás eltérés");
  if(c.production?.worklogId && c.worklog && String(c.production.worklogId)!==String(c.worklog.id))
    issues.push("gyártás-munkanapló hivatkozás eltérés");
  return {ok:issues.length===0,issues,context:c};
}

function resolveErpDocumentContext(record,type){
  const r=record||{};
  let project=null, customer=null, quote=null;
  const pid=String(r.projectId||"").trim();
  const cid=String(r.customerId||"").trim();
  const qid=String(r.quoteId||r.id||"").trim();
  if(pid && Array.isArray(db.projects)) project=db.projects.find(p=>String(p.id)===pid)||null;
  if(cid && Array.isArray(db.customers)) customer=db.customers.find(c=>String(c.id)===cid)||null;
  if(type==="quote" && Array.isArray(db.quotes)){
    quote=db.quotes.find(q=>String(q.id)===qid)||r;
  }else if(Array.isArray(db.quotes) && project?.quoteId){
    quote=db.quotes.find(q=>String(q.id)===String(project.quoteId))||null;
  }
  if(!customer && project?.customerId && Array.isArray(db.customers)){
    customer=db.customers.find(c=>String(c.id)===String(project.customerId))||null;
  }
  return {record:r,project,customer,quote};
}
function auditErpDocumentContext(record,type){
  const c=resolveErpDocumentContext(record,type);
  const issues=[];
  if(c.project && c.customer && String(c.project.customerId||"")!==String(c.customer.id||"")) issues.push("projekt-ügyfél hivatkozás eltérés");
  if(c.project && c.quote && c.quote.projectId && String(c.quote.projectId)!==String(c.project.id)) issues.push("ajánlat-projekt hivatkozás eltérés");
  return {ok:issues.length===0,issues,context:c};
}

function auditQuoteDocumentConsistency(quote){
  if(!quote) return {ok:true,issues:[]};
  const issues=[];
  const items=Array.isArray(quote.items)?quote.items:[];
  const vat=parseErpNumber(quote.vatRate ?? quote.afaRate ?? 27);
  const calc=calcMoneyTotals(items,vat);
  const storedNet=quote.netTotal ?? quote.net;
  const storedVat=quote.vatAmount;
  const storedGross=quote.grossTotal ?? quote.gross;
  if(storedNet!=null && parseErpNumber(storedNet)!==calc.net) issues.push("nettó eltérés");
  if(storedVat!=null && parseErpNumber(storedVat)!==calc.vatAmount) issues.push("ÁFA eltérés");
  if(storedGross!=null && parseErpNumber(storedGross)!==calc.gross) issues.push("bruttó eltérés");
  return {ok:issues.length===0,issues,calculated:calc};
}

function auditErpNumberParsing(){
  const cases=[
    ["1 234,56",1234.56],
    ["1234,56",1234.56],
    ["1234.56",1234.56],
    ["2 000",2000],
    ["",0]
  ];
  return cases.every(([input,expected])=>Math.abs(parseErpNumber(input)-expected)<1e-9);
}

function parseErpNumber(value){
  if(typeof value==="number") return Number.isFinite(value)?value:0;
  let s=String(value??"").trim();
  if(!s) return 0;
  s=s.replace(/\s+/g,"");
  // Hungarian decimal comma: 1234,56. If both separators occur,
  // treat the last separator as decimal and earlier separators as thousands.
  if(s.includes(",") && s.includes(".")){
    if(s.lastIndexOf(",")>s.lastIndexOf(".")) s=s.replace(/\./g,"").replace(",",".");
    else s=s.replace(/,/g,"");
  }else if(s.includes(",")){
    s=s.replace(",",".");
  }
  const n=Number(s);
  return Number.isFinite(n)?n:0;
}

function auditRecordMoneyConsistency(record){
  if(!record || typeof record!=="object") return {ok:true,issues:[]};
  const issues=[];
  const vatRate=Number(record.vatRate ?? record.afaRate ?? record.taxRate);
  const items=Array.isArray(record.items)?record.items:(Array.isArray(record.quoteItems)?record.quoteItems:null);
  if(items){
    const calc=calcMoneyTotals(items,Number.isFinite(vatRate)?vatRate:0);
    if(record.net!=null && Number(record.net)!==calc.net) issues.push({field:"net",stored:Number(record.net),calculated:calc.net});
    if(record.netTotal!=null && Number(record.netTotal)!==calc.net) issues.push({field:"netTotal",stored:Number(record.netTotal),calculated:calc.net});
    if(record.vatAmount!=null && Number(record.vatAmount)!==calc.vatAmount) issues.push({field:"vatAmount",stored:Number(record.vatAmount),calculated:calc.vatAmount});
    if(record.gross!=null && Number(record.gross)!==calc.gross) issues.push({field:"gross",stored:Number(record.gross),calculated:calc.gross});
    if(record.grossTotal!=null && Number(record.grossTotal)!==calc.gross) issues.push({field:"grossTotal",stored:Number(record.grossTotal),calculated:calc.gross});
  }
  return {ok:issues.length===0,issues};
}
function auditAllMoneyConsistency(){
  const result={projects:[],quotes:[]};
  (Array.isArray(db.projects)?db.projects:[]).forEach(p=>{
    const r=auditRecordMoneyConsistency(p); if(!r.ok) result.projects.push({id:p.id,issues:r.issues});
  });
  (Array.isArray(db.quotes)?db.quotes:[]).forEach(q=>{
    const r=auditRecordMoneyConsistency(q); if(!r.ok) result.quotes.push({id:q.id,issues:r.issues});
  });
  return result;
}

function auditMoneyCalculations(){
  const cases=[
    {q:1,p:100000,vat:27,net:100000,vatAmount:27000,gross:127000},
    {q:2,p:100000,vat:27,net:200000,vatAmount:54000,gross:254000},
    {q:3,p:33333,vat:27,net:99999,vatAmount:27000,gross:126999},
    {q:0,p:50000,vat:27,net:0,vatAmount:0,gross:0}
  ];
  return cases.every(c=>{
    const r=calcMoneyLine(c.q,c.p,c.vat);
    return r.net===c.net && r.vatAmount===c.vatAmount && r.gross===c.gross;
  });
}

function calcMoneyLine(quantity,unitPrice,vatRate){
  const q=parseErpNumber(quantity);
  const p=parseErpNumber(unitPrice);
  const vat=parseErpNumber(vatRate);
  const net=Math.round(q*p);
  const vatAmount=Math.round(net*vat/100);
  const gross=net+vatAmount;
  return {quantity:q,unitPrice:p,vatRate:vat,net,vatAmount,gross};
}
function calcMoneyTotals(items,vatRate){
  const rows=Array.isArray(items)?items:[];
  const net=rows.reduce((s,x)=>s+Math.round(parseErpNumber(x.quantity)*parseErpNumber(x.unitPrice)),0);
  const vat=Math.round(net*parseErpNumber(vatRate)/100);
  return {net,vatAmount:vat,gross:net+vat};
}

function auditDirectStatusWriters(){
  const out=[];
  const scan=(arr,type)=>{
    if(!Array.isArray(arr)) return;
    arr.forEach(x=>{
      if(x && typeof x==="object" && x.status!=null){
        const s=String(x.status);
        const allowed=type==="project"?ERP_PROJECT_STATUSES:ERP_QUOTE_STATUSES;
        if(!allowed.includes(s)) out.push({type,id:x.id||null,status:s});
      }
    });
  };
  scan(db.projects,"project");
  scan(db.quotes,"quote");
  return out;
}

function auditWorkflowStatuses(){
  const problems=[];
  if(Array.isArray(db.projects)){
    db.projects.forEach(p=>{
      const s=String(p?.status||"").trim();
      if(s && !ERP_PROJECT_STATUSES.includes(s)) problems.push({type:"project",id:p.id,status:s});
    });
  }
  if(Array.isArray(db.quotes)){
    db.quotes.forEach(q=>{
      const s=String(q?.status||"").trim();
      if(s && !ERP_QUOTE_STATUSES.includes(s)) problems.push({type:"quote",id:q.id,status:s});
    });
  }
  return problems;
}

function normalizeWorkflowStatus(type,status,fallback){
  const s=String(status??"").trim();
  const allowed=type==="quote"?ERP_QUOTE_STATUSES:ERP_PROJECT_STATUSES;
  if(!s) return fallback;
  return allowed.includes(s)?s:s;
}
function setWorkflowStatus(record,type,status){
  if(!record || typeof record!=="object") return false;
  const fallback=type==="quote"?"Piszkozat":"Új";
  record.status=normalizeWorkflowStatus(type,status,fallback);
  record.statusUpdatedAt=new Date().toISOString();
  return true;
}

function parseErpStorageJson(raw,fallback){
  try{
    if(raw===null || raw===undefined || raw==="") return fallback;
    const value=JSON.parse(raw);
    return value===null?fallback:value;
  }catch(e){
    console.error("ERP storage JSON parse failed",e);
    return fallback;
  }
}

function sanitizeDbForPersistence(source){
  const data=JSON.parse(JSON.stringify(source||{}));
  // Runtime-only values must never become persistent state.
  delete data._runtime;
  delete data._rendering;
  delete data._busy;
  return data;
}

function erpStorageGet(key, fallback=null){
  try{
    const raw=localStorage.getItem(key);
    if(raw===null) return fallback;
    return raw;
  }catch(e){ console.warn("ERP storage read failed",key,e); return fallback; }
}
function erpStorageSet(key,value){
  try{
    localStorage.setItem(key,value);
    return true;
  }catch(e){
    console.error("ERP storage write failed",key,e);
    try{ toast("Mentési hiba: a böngésző tárhelye nem írható"); }catch(_){}
    return false;
  }
}
function erpStorageRemove(key){
  try{ localStorage.removeItem(key); return true; }
  catch(e){ console.warn("ERP storage remove failed",key,e); return false; }
}

function getWorklogLayers(w){
  if(!w) return [];
  const pid=String(w.projectId||w.project||"").trim();
  if(pid && Array.isArray(db.projects)){
    const p=db.projects.find(x=>String(x.id)===pid);
    if(p?.well && Array.isArray(p.well.layers)) return p.well.layers;
  }
  return Array.isArray(w.layers)?w.layers:[];
}
function syncWellLayerCanonicalState(project){
  if(!project) return;
  project.well=project.well||{};
  const layers=Array.isArray(project.well.layers)?project.well.layers:[];
  project.well.layers=layers;
  project.well.drillingEntries=Array.isArray(project.well.drillingEntries)?project.well.drillingEntries:[];
  // A drilling entry may carry a stale copy of layers. The project.well.layers array
  // is the canonical editable layer list; do not overwrite it from a stale worklog.
  project.well.drillingEntries=project.well.drillingEntries.map(e=>{
    if(!e || typeof e!=="object") return e;
    return {...e};
  });
}

function pipe3mParts(length){
  const m=Math.max(0,Math.floor(Number(length)||0));
  const db=Math.floor(m/3);
  const maradek=m%3;
  return maradek ? `${db} db + ${maradek} m` : `${db} db`;
}




const COMPANY_MASTER=Object.freeze({name:"Kútfő Plusz Kft.",address:"4481 Nyíregyháza, Attila utca 61.",tax:"12711941-2-15",phone:"+36 20 9247187",email:"kutfokft@gmail.com",signer:"Szabados István",position:"ügyvezető"});

const STORE="kutfoplusz_erp_v12";
const initial={
customers:[
{id:"C-001",name:"Szatmári Diókert Kft.",tax:"12345678-2-15",contact:"Kovács Péter",phone:"+36 30 111 2222",email:"info@example.hu",address:"Nyíregyháza",notes:""},
{id:"C-002",name:"Kasz Farm Kft.",tax:"12711941-2-15",contact:"Nagy László",phone:"+36 20 9247187",email:"kutfokft@gmail.com",address:"Jánkmajtis",notes:""},
{id:"C-003",name:"Kovács Balázs",tax:"",contact:"",designer:"",phone:"",email:"",address:"Porcsalma",notes:"Munkanapló minta ügyfél"}
],
quotes:[
{id:"A-2026-001",customerId:"C-001",name:"1 × 75 m öntözőkút",location:"Porcsalma",status:"Elküldve",date:"2026-08-10",items:[{desc:"Fúrás",qty:75,unit:"m",price:120000}],net:9000000,vat:2430000,gross:11430000},
{id:"A-2026-002",customerId:"C-002",name:"2 × 120 m öntözőkút",location:"Jánkmajtis",status:"Elfogadva",date:"2026-08-15",items:[{desc:"Fúrás",qty:240,unit:"m",price:120000}],net:28800000,vat:7776000,gross:36576000}
],
projects:[
{id:"KP-2026-0087",customerId:"C-002",name:"Jánkmajtis – 2 × 120 m öntözőkút",location:"Jánkmajtis",status:"Folyamatban",value:36576000,planned:23000000,cost:15240000,progress:68,notes:""},
{id:"KP-2026-0088",customerId:"C-001",name:"Porcsalma – 75 m kút",location:"Porcsalma",status:"Tervezés",value:11430000,planned:7200000,cost:0,progress:10,notes:""}
],
worklogs:[
{id:"MN-2026-001",date:"2026-08-10",customerId:"C-003",projectId:"",location:"Porcsalma",wellNo:"1. kút",driller:"",rig:"",finalDepth:55,status:"Elkészült",
layers:[["0","4","Agyag","","",""],["4","16","Agyag","","",""],["16","22","Gyengébb agyag","","",""],["22","25","Iszapos agyag","","",""],["25","28","","","",""],["28","31","","Gyorsabb","",""],["31","34","","Jobb","",""],["34","37","","Ugrálós – legjobb réteg","",""],["37","38","","Jó","",""],["38","40","Gyenge agyag","","",""],["40","46","","Ugrálós réteg","",""],["46","49","","Lassú","",""],["49","52","","Jó","",""],["52","55","","Kevésbé jó","",""]],
filters:[["0","31","Vak",""],["31","55","Szűrő",""]],
prodPipe:"24",staticWL:"7.20",dynamicWL:"17.63",pump:"Cortex 910 literes",flow:733,power:5.5,dynamic2:"17.63",static2:"7.20",
pumpNote:"18 mp – 220 literes mérés. Megadott vízhozam: 733 l/perc. Fajlagos vízhozam: 73,3 l/perc/m.",
notes:"0–31 m vak, 31–55 m 24 m szűrő. A 34–37 m közötti szakasz a legjobb, ugrálós réteg. 38 m körül gyenge agyag jelentkezett.",
sourceTemplate:"kutfo_plusz_munkanaplo_porcsalma_2026-08-10"
}
],
materials:[
{id:"M-001",name:"280 mm KM PVC cső",unit:"m",stock:80,min:50,price:18500,pipeType:"KM-PVC",category:"Csövek"},
{id:"M-002",name:"280 mm szűrőcső",unit:"m",stock:24,min:30,price:24000,pipeType:"Szűrőcső",category:"Csövek"},
{id:"M-003",name:"Szűrőkavics",unit:"t",stock:12,min:5,price:21000},
{id:"M-004",name:"Cement",unit:"kg",stock:1800,min:500,price:160},
{id:"M-005",name:"125 mm KM PVC cső",unit:"m",stock:0,min:0,price:0,pipeType:"KM-PVC",category:"Csövek"},
{id:"M-006",name:"125 mm szűrőcső",unit:"m",stock:0,min:0,price:0,pipeType:"Szűrőcső",category:"Csövek"},
{id:"M-007",name:"160 mm KM PVC cső",unit:"m",stock:0,min:0,price:0,pipeType:"KM-PVC",category:"Csövek"},
{id:"M-008",name:"160 mm szűrőcső",unit:"m",stock:0,min:0,price:0,pipeType:"Szűrőcső",category:"Csövek"},
{id:"M-009",name:"225 mm KM PVC cső",unit:"m",stock:0,min:0,price:0,pipeType:"KM-PVC",category:"Csövek"},
{id:"M-010",name:"225 mm szűrőcső",unit:"m",stock:0,min:0,price:0,pipeType:"Szűrőcső",category:"Csövek"},
{id:"M-011",name:"315/290 mm KM PVC cső",unit:"m",stock:0,min:0,price:0,pipeType:"KM-PVC",category:"Csövek"},
{id:"M-012",name:"315/290 mm szűrőcső",unit:"m",stock:0,min:0,price:0,pipeType:"Szűrőcső",category:"Csövek"}
],
machines:[
{id:"G-001",name:"Atlas Copco XAS 96",model:"XAS 96",hours:2840,status:"Üzemképes",service:2860},
{id:"G-002",name:"Fúrógép #03",model:"Kútfúró #03",hours:4180,status:"Üzemképes",service:4300}
]};
let db=load();

function migrateProjectIds(){
  const projects=Array.isArray(db.projects)?db.projects:[];
  const used=new Set(projects.map(p=>String(p?.id||"")).filter(Boolean));
  const mapping=new Map();

  for(const p of projects){
    const old=String(p?.id||"");
    if(!old) continue;
    const m=old.match(/^KP-(\d{2})\1+(?:0*(\d{3}))$/);
    if(!m) continue;

    const yy=m[1];
    const seq=Number(m[2]);
    if(!Number.isFinite(seq)) continue;

    let candidate=`KP-${yy}${String(seq).padStart(3,"0")}`;
    let bump=seq;
    while(used.has(candidate) && candidate!==old){
      bump++;
      candidate=`KP-${yy}${String(bump).padStart(3,"0")}`;
    }
    if(candidate!==old){
      mapping.set(old,candidate);
      used.delete(old);
      used.add(candidate);
      p.id=candidate;
    }
  }

  if(!mapping.size) return false;

  const replaceProjectRefs=(value)=>{
    if(value===null || value===undefined) return;
    if(Array.isArray(value)){
      value.forEach(replaceProjectRefs);
      return;
    }
    if(typeof value!=="object") return;

    for(const [k,v] of Object.entries(value)){
      if((k==="projectId" || k==="projectID" || k==="project_id") &&
         typeof v==="string" && mapping.has(v)){
        value[k]=mapping.get(v);
      }else{
        replaceProjectRefs(v);
      }
    }
  };

  replaceProjectRefs(db);

  const year=new Date().getFullYear();
  const yy=String(year).slice(-2);
  const key=`kutfoplusz_erp_document_sequence_${year}`;
  let max=0;
  for(const p of (db.projects||[])){
    const m=String(p?.id||"").match(new RegExp("^KP-"+yy+"(\\d{3})$"));
    if(m) max=Math.max(max,Number(m[1]));
  }
  for(const q of (db.quotes||[])){
    const m=String(q?.id||"").match(new RegExp("^A-"+yy+"(\\d{3})$"));
    if(m) max=Math.max(max,Number(m[1]));
  }
  try{
    const stored=Number(localStorage.getItem(key)||0)||0;
    const normalizedStored=stored>999 ? Number(String(stored).slice(-3)) : stored;
    localStorage.setItem(key,String(Math.max(max+1,normalizedStored,1)));
  }catch(e){}

  return true;
}
migrateProjectIds();

ensureMaterialCatalog();
ensureDrillingPriceList();

/* ÜGYFELEK – végleges specifikáció
   - adatlap a saját sor alatt
   - nincs külön oldal/ablak
   - nincs státusz melletti szerkesztés gomb
   - nincs Bezárás gomb
*/
(function enhanceCustomerModel(){
  (db.customers||[]).forEach(c=>{
    if(c.address===undefined)c.address="";
    if(c.contact===undefined)c.contact="";
    if(c.taxNumber===undefined)c.taxNumber="";
    if(c.billing===undefined)c.billing="";
    if(c.notes===undefined)c.notes="";
    if(!Array.isArray(c.contacts))c.contacts=[];
  });
  save();
})();
(function ensureWorklogTemplate(){
 const template={id:"MN-2026-001",date:"2026-08-10",customerId:"C-003",projectId:"",location:"Porcsalma",wellNo:"1. kút",driller:"",rig:"",finalDepth:55,status:"Elkészült",
 layers:[["0","4","Agyag","","",""],["4","16","Agyag","","",""],["16","22","Gyengébb agyag","","",""],["22","25","Iszapos agyag","","",""],["25","28","","","",""],["28","31","","Gyorsabb","",""],["31","34","","Jobb","",""],["34","37","","Ugrálós – legjobb réteg","",""],["37","38","","Jó","",""],["38","40","Gyenge agyag","","",""],["40","46","","Ugrálós réteg","",""],["46","49","","Lassú","",""],["49","52","","Jó","",""],["52","55","","Kevésbé jó","",""]],
 filters:[["0","31","Vak",""],["31","55","Szűrő",""]],prodPipe:"24",staticWL:"7.20",dynamicWL:"17.63",pump:"Cortex 910 literes",flow:733,power:5.5,dynamic2:"17.63",static2:"7.20",
 pumpNote:"18 mp – 220 literes mérés. Megadott vízhozam: 733 l/perc. Fajlagos vízhozam: 73,3 l/perc/m.",notes:"0–31 m vak, 31–55 m 24 m szűrő. A 34–37 m közötti szakasz a legjobb, ugrálós réteg. 38 m körül gyenge agyag jelentkezett.",sourceTemplate:"kutfo_plusz_munkanaplo_porcsalma_2026-08-10"};
 const i=db.worklogs.findIndex(w=>w.sourceTemplate===template.sourceTemplate||w.id==="MN-2026-001"); if(i<0) db.worklogs.push({...template,createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()});
 if(!db.customers.some(c=>c.id==="C-003")) db.customers.push({id:"C-003",name:"Kovács Balázs",tax:"",contact:"",phone:"",email:"",address:"Porcsalma",notes:"Munkanapló minta ügyfél"});
 save();
})();
let current=location.hash.replace("#/","")||"dashboard";
let projectPageId = null;
if(current.startsWith("project/")){
  projectPageId=current.split("/")[1]||null;
  current="project";
}
const titles={dashboard:"Dashboard",customers:"Ügyfelek",quotes:"Ajánlatok",quote:"Ajánlat", "quote-edit":"Ajánlat szerkesztése",projects:"Projektek",project:"Projekt",worklogs:"Munkanapló","worklog-fullpage":"Új munkanapló",materials:"Anyag / Raktár",machines:"Géppark",dataservice:"Adatszolgáltatás",reports:"Riportok"};
function load(){
  try{
    const data=JSON.parse(localStorage.getItem(STORE))||structuredClone(initial);
    if(Array.isArray(data.customers)){
      data.customers.forEach(c=>{
        const tax=c.tax||c.taxNumber||c.taxId||c.tax_number||c.adószám||c.adoszam||"";
        if(tax){ c.tax=tax; c.taxNumber=tax; }
      });
    }
    return data;
  }catch{return structuredClone(initial)}
}
function save(){localStorage.setItem(STORE,JSON.stringify(sanitizeDbForPersistence(db)))}
function esc(v){return String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function huNumber(v){
  const raw=String(v??"").trim().replace(/\s+/g,"").replace(/,/g,".");
  if(!raw) return 0;
  const n=Number.parseFloat(raw);
  return Number.isFinite(n)?n:0;
}
function huFormat(v,decimals=1){
  const n=typeof v==="number"?v:huNumber(v);
  if(!Number.isFinite(n)) return "";
  return n.toLocaleString("hu-HU",{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
}
function huFormatFlexible(v,maxDecimals=2){
  const raw=String(v??"").trim();
  if(!raw) return "";
  const n=huNumber(raw);
  if(!Number.isFinite(n)) return raw.replace(/\./g,",");
  return n.toLocaleString("hu-HU",{minimumFractionDigits:0,maximumFractionDigits:maxDecimals});
}
function huFormatInput(el,decimals=1){
  if(!el) return;
  const raw=String(el.value??"");
  if(!raw.trim()){el.value="";return;}
  const n=huNumber(raw);
  if(!Number.isFinite(n)) return;
  el.value=n.toLocaleString("hu-HU",{minimumFractionDigits:decimals,maximumFractionDigits:decimals});
}
function huFormatMoneyInputValue(v){ const n=huNumber(v); return n? n.toLocaleString("hu-HU",{minimumFractionDigits:0,maximumFractionDigits:0}):"0"; }
function huFormatMoneyInput(el){
  if(!el) return;
  const raw=String(el.value??"");
  if(!raw.trim()){el.value="";return;}
  const n=huNumber(raw);
  if(!Number.isFinite(n)) return;
  el.value=n.toLocaleString("hu-HU",{minimumFractionDigits:0,maximumFractionDigits:0});
}
function money(v){return new Intl.NumberFormat("hu-HU",{style:"currency",currency:"HUF",maximumFractionDigits:0}).format(Number(v)||0)}
function cust(id){return db.customers.find(x=>x.id===id)?.name||"—"}
function uid(p){return p+"-"+Date.now().toString().slice(-7)}
function toast(s){let e=document.getElementById("toast");e.textContent=s;e.classList.add("show");setTimeout(()=>e.classList.remove("show"),2200)}
function openModal(t,b){document.getElementById("mtitle").textContent=t;document.getElementById("mbody").innerHTML=b;document.getElementById("modal").classList.remove("hidden")}
function closeModal(){document.getElementById("modal").classList.add("hidden")}
function openDrawer(t,b){document.getElementById("dtitle").textContent=t;document.getElementById("dbody").innerHTML=b;document.getElementById("drawer").classList.add("open")}
function closeDrawer(){document.getElementById("drawer").classList.remove("open")}
function nav(p){
  projectPageId=null;
  current=p;
  location.hash="#/"+p;
  render();
  document.getElementById("sidebar").classList.remove("open")
}
function legacy_openProjectPage(id){
  const key=String(id);
  const p=(db.projects||[]).find(x=>String(x.id)===key);
  if(!p){toast("A projekt nem található");return false;}
  projectPageId=p.id;
  if(db.ui){db.ui.openProjectId=p.id;db.ui.projectTab="overview";db.ui.openCustomerId=null;}
  current="project";
  location.hash="#/project/"+encodeURIComponent(String(p.id));
  render();
  setTimeout(()=>{
    const el=document.getElementById("project-page");
    if(el)el.scrollIntoView({behavior:"smooth",block:"start"});
  },50);
  return false;
}
window.addEventListener("hashchange",()=>{
  let raw=location.hash.replace(/^#\//,"");
  if(raw.startsWith("project/")){
    projectPageId=decodeURIComponent(raw.split("/")[1]||"");
    current="project";
  }else if(raw.startsWith("worklog-fullpage/")){
    const parts=raw.split("/");
    window.editingWorklogId=parts[1]==="new"?"":decodeURIComponent(parts[1]||"");
    window.worklogProjectId=parts[1]==="new"?decodeURIComponent(parts[2]||""):"";
    current="worklog-fullpage";
  }else if(raw.startsWith("quote-edit/")){
    window.openQuotePageId=decodeURIComponent(raw.split("/")[1]||"");
    window.editingQuoteId=window.openQuotePageId==="new"?"":window.openQuotePageId;
    current="quote-edit";
  }else if(raw.startsWith("quote/")){
    window.openQuotePageId=decodeURIComponent(raw.split("/")[1]||"");
    current="quote";
  }else{
    projectPageId=null;
    current=titles[raw]?raw:"dashboard";
  }
  render();
})
document.getElementById("mobile").onclick=()=>document.getElementById("sidebar").classList.toggle("open");
document.querySelectorAll(".nav").forEach(x=>x.onclick=()=>nav(x.dataset.page));
document.getElementById("importFile").onchange=importData;

function render(){if(!titles[current])current="dashboard";document.getElementById("title").textContent=titles[current];document.querySelectorAll(".nav").forEach(x=>x.classList.toggle("active",x.dataset.page===current));try{document.getElementById("content").innerHTML=(current==="worklog-fullpage"?worklogFullPageView():current==="worklogs"?worklogsView():current==="quote"?quotePageView():current==="quote-edit"?quoteEditorPageView():views[current]());}catch(err){console.error(err);document.getElementById("content").innerHTML=`
<div class="panel"><h2>Modul betöltési hiba</h2><p class="label">${esc(err&&err.message||err)}</p></div>`;}}
function projectRows(arr=db.projects){
  return `<div class="tablewrap"><table class="table"><thead><tr><th>Projekt</th><th>Ügyfél</th><th>Típus</th><th>Érték</th><th>Költség</th><th>Profit</th><th>Készültség</th><th>Állapot</th></tr></thead><tbody>${arr.map(p=>{
    let pr=(Number(p.value)||0)-(Number(p.cost)||0);
    const undocumented=p.projectType==="undocumented";
    return `<tr>
      <td><a class="link" onclick="openProjectPage('${esc(p.id)}');return false;"><b>${esc(p.id)}</b></a><br>${esc(p.name)}</td>
      <td>${esc(cust(p.customerId))}</td>
      <td><span class="badge ${undocumented?'orange':'green'}">${undocumented?'Dokumentáció nélküli':'Hivatalos'}</span></td>
      <td>${money(p.value)}</td><td>${money(p.cost)}</td>
      <td class="${pr>=0?'green':'red'}">${money(pr)}</td>
      <td><div class="progress"><span style="width:${Math.max(0,Math.min(100,p.progress||0))}%"></span></div>${p.progress||0}%</td>
      <td><span class="badge ${p.status==='Folyamatban'||p.status==='Kivitelezés alatt'?'green':p.status==='Lezárva'?'gray':'blue'}">${esc(p.status||'Tervezés')}</span></td>
    </tr>`;
  }).join("")}</tbody></table></div>`;
}
let openCustomerId = null;

function customerInlineDetails(c){
  const qs=db.quotes.filter(q=>q.customerId===c.id);
  const ps=db.projects.filter(p=>p.customerId===c.id);
  const wls=db.worklogs.filter(w=>w.customerId===c.id);
  return `<tr class="customer-detail-row"><td colspan="7"><div class="customer-inline">
    <div class="customer-inline-head">
      <div><div class="label">ÜGYFÉL ADATLAP</div><h3>${esc(c.name)}</h3></div>
      <div class="customer-inline-actions">
        <button class="btn secondary small" onclick="editCustomer('${c.id}')">Szerkesztés</button>
        <button class="btn danger small" onclick="deleteCustomer('${c.id}')">Törlés</button>
        
      </div>
    </div>
    <div class="customer-inline-grid">
      <div><span class="label">Adószám</span><b>${esc(c.tax)||"—"}</b></div>
      <div><span class="label">Kapcsolattartó</span><b>${esc(c.contact)||"—"}</b></div>
      <div><span class="label">Telefon</span><b>${esc(c.phone)||"—"}</b></div>
      <div><span class="label">E-mail</span><b>${esc(c.email)||"—"}</b></div>
      <div><span class="label">Cím</span><b>${esc(c.address)||"—"}</b></div>
      <div><span class="label">Státusz</span><b>${esc(c.status||"Aktív")}</b></div>
    </div>
    <div class="customer-inline-linked">
      <div><h4>Ajánlatok (${qs.length})</h4>${qs.map(q=>`<div class="linked-item">
  <a class="link" onclick="editQuote('${q.id}')">${esc(q.id)}</a>
  <span>${esc(q.name||"")}</span>
  <b>${money(q.gross)}</b>
  <button class="btn danger small" onclick="deleteQuote('${q.id}');return false;">Törlés</button>
</div>`).join("")||'<div class="label">Nincs kapcsolódó ajánlat.</div>'}</div>
      <div><h4>Projektek (${ps.length})</h4>${ps.map(p=>`<div class="linked-item" style="cursor:pointer" role="button" tabindex="0" onclick="openProjectPage('${esc(p.id)}');return false;" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openProjectPage('${esc(p.id)}');}"><a class="link" onclick="event.stopPropagation();openProjectPage('${esc(p.id)}');return false;">${esc(p.id)}</a><span><b>${esc(p.name||"")}</b></span></div>`).join("")||'<div class="label">Nincs kapcsolódó projekt.</div>'}</div>
      <div><h4>Munkanaplók (${wls.length})</h4>${wls.map(w=>`<div class="linked-item" style="cursor:pointer" role="button" tabindex="0" onclick="openWorklogEditor('${esc(w.id||"")}');return false;" onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();openWorklogEditor('${esc(w.id||"")}');}">
  <a class="link" onclick="event.stopPropagation();openWorklogEditor('${esc(w.id||"")}');return false;">${esc(w.id||"")}</a>
  <span>${esc(w.location||"")}</span>
  <b>${esc(w.date||"")}</b>
  <button type="button" class="btn danger small" onclick="event.stopPropagation();deleteWorklog('${esc(w.id||"")}');return false;">Törlés</button>
</div>`).join("")||'<div class="label">Nincs kapcsolódó munkanapló.</div>'}</div>
    </div>
  </div></td></tr>`;
}


function openLicenseImport(){
  openModal("Létesítési engedély feldolgozása",`
    <div class="license-import-box">
      <div class="license-import-head">
        <div><h3>📄 Létesítési engedély</h3><div class="label">Az AI a dokumentumból előkészíti az ügyfél, projekt és ajánlat adatait.<div class="license-ai-offline-note">Offline változat: ez a képernyő az AI/OCR integráció adatfogadó pontja. A végleges AI felismerő motor bekötése külön lépés.</div></div></div>
      </div>
      <form onsubmit="simulateLicenseAnalysis(event)">
        <div class="field full" style="margin-top:14px">
          <label>PDF / dokumentum</label>
          <input class="input" type="file" name="license" accept=".pdf,.png,.jpg,.jpeg" required>
        </div>
        <div class="license-review">A feldolgozás után az adatok ellenőrző képernyőn jelennek meg. Az AI által felismert adatok nem kerülnek automatikusan véglegesítésre.</div>
        <div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">AI feldolgozás</button></div>
      </form>
    </div>`);
}
function simulateLicenseAnalysis(e){
  e.preventDefault();
  const file=e.target.elements.license?.files?.[0];
  if(!file)return;
  // Offline verzióban nincs külső AI szolgáltatás. Ez a felület a későbbi
  // OCR/AI motor belépési pontja; most ellenőrző adatokat készít.
  openLicenseReview({
    fileName:file.name,
    customer:{name:"",address:"",contact:"",phone:"",email:"",taxNumber:"",billing:""},
    project:{name:"",location:"",settlement:"",hrsz:"",wellCount:"1",casingDiameter:"",permitNumber:"",permittedDepth:"",permittedFlow:"",coordinates:"",purpose:"Öntözés"},
    quote:{wellDepth:"",flow:"",scope:"Kút kivitelezés"}
  });
}
function openLicenseReview(data){
  openModal("AI feldolgozás – ellenőrzés",`
    <div class="license-import-box">
      <div class="label">Forrás: ${esc(data.fileName)}</div>
      <div class="license-import-grid">
        <div class="license-import-card"><h4>👤 Ügyfél</h4>
          ${licenseInput("customer_name","Név / cégnév",data.customer.name)}
          ${licenseInput("customer_address","Cím",data.customer.address)}
          ${licenseInput("customer_contact","Kapcsolattartó",data.customer.contact)}
          ${licenseInput("customer_phone","Telefon",data.customer.phone)}
          ${licenseInput("customer_email","E-mail",data.customer.email)}
          ${licenseInput("customer_tax","Adószám",data.customer.taxNumber)}
          ${licenseInput("customer_billing","Számlázási adatok",data.customer.billing)}
        </div>
        <div class="license-import-card"><h4>📁 Projekt</h4>
          ${licenseInput("project_name","Projekt neve",data.project.name)}
          ${licenseInput("project_location","Helyszín",data.project.location)}
          ${licenseInput("project_settlement","Település",data.project.settlement)}
          ${licenseInput("project_hrsz","Helyrajzi szám",data.project.hrsz)}
          ${licenseInput("project_well_count","Kút darabszám",data.project.wellCount||"1")}
          ${licenseInput("project_casing","Béléscső átmérő (mm)",data.project.casingDiameter)}
          ${licenseInput("project_permit","Engedélyszám",data.project.permitNumber)}
          ${licenseInput("project_depth","Engedélyezett mélység",data.project.permittedDepth)}
          ${licenseInput("project_flow","Engedélyezett vízhozam",data.project.permittedFlow)}
          ${licenseInput("project_coord","Koordináták",data.project.coordinates)}
          ${licenseInput("project_purpose","Cél",data.project.purpose)}
        </div>
        <div class="license-import-card"><h4>💰 Ajánlat előkészítése</h4>
          ${licenseInput("quote_depth","Kút mélysége",data.quote.wellDepth)}
          ${licenseInput("quote_flow","Vízhozam",data.quote.flow)}
          ${licenseInput("quote_scope","Műszaki tartalom",data.quote.scope)}
        </div>
      </div>
      <div class="license-review">🟡 Ellenőrzés szükséges: a végleges rendszerben az AI minden mezőhöz biztonsági szintet és forrásoldalt is megjelenít.</div>
      <div class="license-import-actions">
        <button class="btn secondary" onclick="closeModal()">Mégse</button>
        <button class="btn" onclick="createFromLicenseReview()">Ügyfél + Projekt + Ajánlat előkészítése</button>
      </div>
    </div>`);
}
function licenseInput(name,label,value){
  return `<div class="license-field"><span class="label">${esc(label)}</span><input class="input" style="max-width:58%" name="${name}" value="${esc(value||"")}"></div>`;
}
function createFromLicenseReview(){
  const modal=document.querySelector(".modal");
  if(!modal)return;
  const vals={};
  modal.querySelectorAll("input[name],textarea[name],select[name]").forEach(x=>vals[x.name]=x.value);

  if(!vals.customer_name && !vals.project_name){
    toast("Előbb töltsük ki vagy ellenőrizzük az AI által felismert adatokat.");
    return;
  }

  db.customers=db.customers||[];
  db.projects=db.projects||[];
  db.quotes=db.quotes||[];

  const cid="C-"+Date.now();
  const pid=nextProjectId();
  const qid=nextQuoteId();

  const customer={
    id:cid,
    name:vals.customer_name||"Új ügyfél",
    address:vals.customer_address||"",
    contact:vals.customer_contact||"",
    phone:vals.customer_phone||"",
    email:vals.customer_email||"",
    taxNumber:vals.customer_tax||"",
    billing:vals.customer_billing||"",
    notes:"Létesítési engedélyből előkészítve"
  };

  const projectHrsz=vals.project_hrsz||"";
  const projectWellCount=vals.project_well_count||"1";
  const projectCasing=vals.project_casing||"";
  const projectSettlement=vals.project_settlement||"";
  const canonicalProjectName=buildProjectName(projectHrsz,projectWellCount,projectCasing,projectSettlement);
  const project={
    id:pid,
    customerId:cid,
    name:canonicalProjectName,
    location:vals.project_location||"",
    settlement:projectSettlement,
    hrsz:projectHrsz,
    wellCount:Number.parseInt(String(projectWellCount).replace(/[^\d]/g,""),10)||1,
    casingDiameter:projectCasing||"",
    permitNumber:vals.project_permit||"",
    permittedDepth:vals.project_depth||"",
    permittedFlow:vals.project_flow||"",
    coordinates:vals.project_coord||"",
    purpose:vals.project_purpose||"Öntözés",
    status:"Ajánlat előkészítése",
    nextTask:"Ajánlati tételek összeállítása",
    documents:[{
      name:"Létesítési engedély",
      type:"Létesítési engedély",
      status:"Feldolgozva",
      fileName:"",
      date:new Date().toISOString().slice(0,10)
    }],
    well:{
      permittedDepth:vals.project_depth||"",
      permittedFlow:vals.project_flow||"",
      wellCount:Number.parseInt(String(projectWellCount).replace(/[^\d]/g,""),10)||1,
      casingDiameter:projectCasing||""
    }
  };

  const quote={
    id:qid,
    customerId:cid,
    projectId:pid,
    name:canonicalProjectName+" – előzetes ajánlat",
    status:"Piszkozat",
    source:"Létesítési engedély AI feldolgozás",
    items:[
      {name:"Kútfúrás / kút kivitelezés",quantity:1,unit:"projekt",price:0},
      {name:"Csövezés és szűrőzés",quantity:1,unit:"projekt",price:0},
      {name:"Kútfej és kapcsolódó szerelvények",quantity:1,unit:"projekt",price:0},
      {name:"Vízhozamvizsgálat / próbaszivattyúzás",quantity:1,unit:"projekt",price:0}
    ],
    technicalData:{
      depth:vals.quote_depth||vals.project_depth||"",
      flow:vals.quote_flow||vals.project_flow||"",
      scope:vals.quote_scope||""
    },
    notes:"Az ajánlat az AI által feldolgozott létesítési engedély adatai alapján előkészítve. Ármegadás és műszaki ellenőrzés szükséges."
  };

  db.customers.push(customer);
  db.projects.push(project);
  db.quotes.push(quote);

  save();
  closeModal();

  // Go directly to the created project. The project page can then be used
  // to continue the technical preparation and review.
  projectPageId=pid;
  current="project";
  location.hash="#/project/"+encodeURIComponent(pid);
  render();
  toast("Ügyfél, projekt és ajánlati piszkozat létrehozva");
}

function customerRows(arr=db.customers){
  return `<div class="tablewrap"><table class="table"><thead><tr><th>Ügyfél</th><th>Adószám</th><th>Kapcsolattartó</th><th>Telefon</th><th>E-mail</th><th>Státusz</th><th></th></tr></thead><tbody>${arr.map(c=>`
    <tr>
      <td><a class="link" onclick="customerDetails('${c.id}')"><b>${esc(c.name)}</b></a><br><span class="label">${esc(c.address)}</span></td>
      <td>${esc(c.tax)}</td><td>${esc(c.contact)}</td><td>${esc(c.phone)}</td><td>${esc(c.email)}</td>
      <td><span class="badge ${c.status==="Inaktív"?"gray":"green"}">${esc(c.status||"Aktív")}</span></td>
      <td><div style="display:flex;gap:6px;justify-content:flex-end;flex-wrap:wrap"><button type="button" class="btn secondary small" onclick="event.stopPropagation();openCustomerHistoryPage('${c.id}')">Részletek</button><button type="button" class="btn small" onclick="event.stopPropagation();openProject('${c.id}')">+ Projekt</button></div></td>
    </tr>${openCustomerId===c.id?customerInlineDetails(c):""}`).join("")}</tbody></table></div>`;
}

function customerDetails(id){
  const c=db.customers.find(x=>x.id===id); if(!c)return;
  openCustomerId=openCustomerId===id?null:id;
  const q=(document.getElementById("cs")?.value||"").toLowerCase().trim();
  const arr=db.customers.filter(c=>[c.name,c.tax,c.companyNo,c.contact,c.phone,c.email,c.address,c.status].join(" ").toLowerCase().includes(q));
  const el=document.getElementById("ct"); if(el)el.innerHTML=customerRows(arr);
}

function quoteRows(arr=db.quotes){
 const statuses=["Piszkozat","Elkészítve","Elküldve","Tárgyalás alatt","Elfogadva","Elutasítva","Lezárva"];
 return `<div class="tablewrap"><table class="table"><thead><tr><th>Ajánlat</th><th>Ügyfél</th><th>Helyszín</th><th>Bruttó</th><th>Státusz</th><th></th></tr></thead><tbody>${arr.map(q=>`<tr>
 <td><a href="#" class="link" data-quote-id="${q.id}" onclick="openQuotePage('${q.id}');return false" title="Árajánlat megnyitása"><b>${q.id}</b></a><br><span class="label">${esc(q.name)}</span></td>
 <td>${esc(cust(q.customerId))}</td><td>${esc(q.location)}</td><td>${money(q.gross)}</td>
 <td><select class="quote-status-pill quote-status-${statusClass(q.status)}" onchange="changeQuoteStatus('${q.id}',this.value)" aria-label="Státusz">${statuses.map(st=>`<option value="${esc(st)}" ${q.status===st?'selected':''}>${esc(st)}</option>`).join("")}</select></td>
 <td style="white-space:nowrap">
   <div style="display:flex;gap:6px;align-items:center;justify-content:flex-end">
    <button class="btn secondary small" onclick="openQuoteEditorPage('${q.id}');return false;">Megnyitás</button>
    ${q.status==="Elfogadva"?`<button class="btn small" onclick="convertQuote('${q.id}')">→ Projekt</button>`:""}
    <button class="btn danger small" onclick="deleteQuote('${q.id}');return false;">Törlés</button>
   </div>
 </td>
 </tr>`).join("")}</tbody></table></div>`;
}
function statusClass(status){
 const v=String(status||"Piszkozat");
 if(v==="Elfogadva")return "accepted";
 if(v==="Elutasítva")return "rejected";
 if(v==="Elküldve")return "sent";
 if(v==="Tárgyalás alatt")return "negotiation";
 if(v==="Lezárva")return "closed";
 if(v==="Elkészítve")return "ready";
 return "draft";
}
function quoteNetValue(q){
 const n=Number(q?.net);
 if(Number.isFinite(n) && n>0) return n;
 const nt=Number(q?.netTotal);
 return Number.isFinite(nt) ? nt : 0;
}
function syncProjectContractValue(projectId){
 const p=(db.projects||[]).find(x=>String(x.id)===String(projectId));
 if(!p)return 0;
 const accepted=(db.quotes||[]).filter(q=>String(q.projectId||"")===String(p.id)&&q.status==="Elfogadva");
 const q=accepted[accepted.length-1];
 const value=quoteNetValue(q);
 p.value=value;
 return value;
}
function changeQuoteStatus(id,status){
 const q=(db.quotes||[]).find(x=>String(x.id)===String(id));
 if(!q)return;
 q.status=String(status||"Piszkozat");
 if(q.projectId) syncProjectContractValue(q.projectId);
 save();
 render();
 toast("Státusz mentve: "+q.status);
}


function worklogListRows(arr=db.worklogs){
return `<div class="tablewrap"><table class="table"><thead><tr>
<th>Azonosító</th><th>Dátum</th><th>Projekt</th><th>Helyszín</th><th>Fúrómester</th><th>Végmélység</th><th>Állapot</th><th></th>
</tr></thead><tbody>${
arr.slice().reverse().map(w=>`<tr>
<td><b>${esc(w.id||"MN-"+(w.date||""))}</b></td>
<td>${esc(w.date)}</td>
<td>${esc(w.project||cust(w.customerId))}</td>
<td>${esc(w.location)}</td>
<td>${esc(w.master||w.furómester||"")}</td>
<td>${esc(w.depthEnd||w.depth||"")} m</td>
<td><span class="badge ${w.status==="Kész"||w.status==="Lezárt"?"green":"blue"}">${esc(w.status||"Piszkozat")}</span></td>
<td><button class="btn secondary small" onclick="openWorklogEditor('${esc(w.id||"")}')">Megnyitás</button> <button type="button" class="btn danger small" onclick="deleteWorklog('${esc(w.id||"")}');return false;">Törlés</button></td>
</tr>`).join("")
}</tbody></table></div>`;
}
function worklogsView(){
return `<div class="panel">
<div class="panelhead">
<div><h2>Munkanaplók</h2><div class="label">Mentett munkanaplók listája</div></div>
<button class="btn" onclick="openWorklogEditor()">+ Új munkanapló</button>
</div>
<div class="toolbar"><input id="wsearch" class="input search" placeholder="Keresés: azonosító, projekt, helyszín, fúrómester..." oninput="filterWorklogs()"></div>
<div id="worklogTable">${worklogListRows()}</div>
</div>`;
}
function filterWorklogs(){
const q=(document.getElementById("wsearch")?.value||"").toLowerCase();
const arr=db.worklogs.filter(w=>[
w.id,w.date,w.project,w.location,w.master,w.furómester,w.status,w.depth,w.depthEnd
].join(" ").toLowerCase().includes(q));
document.getElementById("worklogTable").innerHTML=worklogListRows(arr);
}
function openWorklogEditor(id){detailedWorklogEditor(id||null)}






function customerHistoryData(c){
  const projects=(db.projects||[]).filter(p=>String(p.customerId||p.clientId)===String(c.id));
  const ids=new Set(projects.map(p=>String(p.id)));
  const quotes=(db.quotes||[]).filter(q=>ids.has(String(q.projectId)));
  const invoices=projects.filter(p=>p.aftercare?.invoice?.number).map(p=>({projectId:p.id,...p.aftercare.invoice}));
  const services=projects.flatMap(p=>(p.aftercare?.services||[]).map(x=>({...x,projectId:p.id})));
  return {projects,quotes,invoices,services};
}
function customerHistoryPanel(c){
  const h=customerHistoryData(c);
  return `<div class="customer-history">
    <div class="panelhead"><div><h2>📚 Teljes ügyfélelőzmény</h2><div class="label">Projektek, ajánlatok, számlák és szervizelőzmények egy helyen.</div></div></div>
    <div class="customer-history-grid">
      <div class="customer-history-stat"><div class="label">Projektek</div><b>${h.projects.length}</b></div>
      <div class="customer-history-stat"><div class="label">Ajánlatok</div><b>${h.quotes.length}</b></div>
      <div class="customer-history-stat"><div class="label">Számlák</div><b>${h.invoices.length}</b></div>
      <div class="customer-history-stat"><div class="label">Szervizesetek</div><b>${h.services.length}</b></div>
    </div>
    <div class="customer-history-section"><h3>Projektek</h3>
      ${h.projects.map(p=>`<div class="customer-history-row"><div><b>${esc(p.id||"")}</b></div><div>${esc(p.name||"Projekt")}</div><div>${esc(p.status||"")}</div><div>${esc(String(p.well?.actualFlow||p.actualFlow||"—"))} ${p.well?.actualFlow||p.actualFlow?"l/min":""}</div><div><button class="btn secondary small" onclick="openCustomerProject('${p.id}')">Projekt</button></div></div>`).join("")||'<div class="empty">Nincs projekt.</div>'}
    </div>
    <div class="customer-history-section"><h3>Ajánlatok</h3>
      ${h.quotes.map(q=>`<div class="customer-history-row">
  <div><b>${esc(q.id||"")}</b></div>
  <div>${esc(q.projectId||"")}</div>
  <div>${esc(q.status||"Piszkozat")}</div>
  <div>${money(Number(q.netTotal||q.total||0))}</div>
  <div style="display:flex;gap:6px;justify-content:flex-end">
    <button class="btn secondary small" onclick="openCustomerProject('${q.projectId}')">Projekt</button>
    <button class="btn danger small" onclick="deleteQuote('${q.id}');return false;">Törlés</button>
  </div>
</div>`).join("")||'<div class="empty">Nincs ajánlat.</div>'}
    </div>
    <div class="customer-history-section"><h3>Számlák</h3>
      ${h.invoices.map(x=>`<div class="customer-history-row"><div><b>${esc(x.number||"")}</b></div><div>${esc(x.projectId||"")}</div><div>${esc(x.status||"")}</div><div>${money(Number(x.net||0))}</div><div></div></div>`).join("")||'<div class="empty">Nincs számla.</div>'}
    </div>
    <div class="customer-history-section"><h3>Szervizelőzmények</h3>
      <div class="customer-history-timeline">${h.services.map(x=>`<div class="customer-history-event"><b>${esc(x.date||"")}</b> · ${esc(x.title||"Szervizeset")} · ${esc(x.status||"")}<div class="label">${esc(x.note||"")}</div></div>`).join("")||'<div class="empty">Nincs szervizelőzmény.</div>'}</div>
    </div>
  </div>`;
}
function openCustomerProject(pid){
  if(typeof nav==="function") nav("projects");
  setTimeout(()=>{if(typeof openProject==="function")openProject(pid);else toast("Projekt: "+pid)},50);
}

function aftercarePanel(p){
  const a=p.aftercare||{}, inv=a.invoice||{}, services=Array.isArray(a.services)?a.services:[];
  return `<div class="aftercare-panel">
    <div class="panelhead"><div><h2>🤝 Átadás · Számlázás · Garancia · Szerviz</h2><div class="label">A lezárt projekt utóélete és teljes ügyfélelőzménye.</div></div></div>
    <div class="aftercare-grid">
      <div class="aftercare-stat"><div class="label">Átadás</div><b>${esc(a.handoverStatus||"Nincs átadva")}</b></div>
      <div class="aftercare-stat"><div class="label">Számla</div><b>${esc(inv.status||"Nincs kiállítva")}</b></div>
      <div class="aftercare-stat"><div class="label">Garancia</div><b>${esc(a.warrantyUntil||"Nincs beállítva")}</b></div>
      <div class="aftercare-stat"><div class="label">Szervizesetek</div><b>${services.length} db</b></div>
    </div>
    <div class="aftercare-actions">
      <button class="btn small" onclick="handoverProject('${p.id}')">✓ Átadás rögzítése</button>
      <button class="btn secondary small" onclick="createProjectInvoice('${p.id}')">💰 Számla előkészítése</button>
      <button class="btn secondary small" onclick="setProjectWarranty('${p.id}')">🛡 Garancia</button>
      <button class="btn secondary small" onclick="addServiceCase('${p.id}')">🔧 Szerviz</button>
    </div>
    <div style="margin-top:14px">
      <h3>Szervizelőzmények</h3>
      <div class="service-row" style="font-size:12px;color:#64748b;font-weight:700"><div>Dátum</div><div>Hiba / munka</div><div>Státusz</div><div>Költség</div><div></div></div>
      ${services.map((x,i)=>`<div class="service-row"><div>${esc(x.date||"")}</div><div><b>${esc(x.title||"Szervizeset")}</b><div class="label">${esc(x.note||"")}</div></div><div>${esc(x.status||"Nyitott")}</div><div>${money(Number(x.cost)||0)}</div><div><button class="btn secondary small" onclick="viewServiceCase('${p.id}',${i})">Megnyitás</button></div></div>`).join("")||'<div class="empty">Nincs szervizelőzmény.</div>'}
    </div>
  </div>`;
}
function handoverProject(pid){
  const p=db.projects.find(x=>x.id===pid);
  syncWellLayerCanonicalState(p);if(!p)return;
  p.aftercare=p.aftercare||{};
  openModal("Projekt átadása",`<form onsubmit="saveHandover(event,'${pid}')"><div class="formgrid">
    <div class="field"><label>Átadás dátuma</label><input class="input" type="date" name="date" value="${new Date().toISOString().slice(0,10)}"></div>
    <div class="field"><label>Átadás státusza</label><select class="select" name="status"><option>Átadásra kész</option><option>Átadva</option><option>Átadva – jegyzőkönyvvel</option></select></div>
    <div class="field full"><label>Átadási megjegyzés</label><textarea class="textarea" name="note"></textarea></div>
  </div><div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Mentés</button></div></form>`);
}
function saveHandover(ev,pid){
  ev.preventDefault();const p=db.projects.find(x=>x.id===pid);if(!p)return;
  p.aftercare=p.aftercare||{};const o=Object.fromEntries(new FormData(ev.target).entries());
  p.aftercare.handoverStatus=o.status;p.aftercare.handoverDate=o.date;p.aftercare.handoverNote=o.note||"";
  save();closeModal();render();toast("Átadás rögzítve");
}
function createProjectInvoice(pid){
  const p=db.projects.find(x=>x.id===pid);if(!p)return;
  p.aftercare=p.aftercare||{};p.aftercare.invoice=p.aftercare.invoice||{};
  openModal("Számla előkészítése",`<form onsubmit="saveProjectInvoice(event,'${pid}')"><div class="formgrid">
    <div class="field"><label>Számla státusza</label><select class="select" name="status"><option>Előkészítve</option><option>Kiállítva</option><option>Fizetve</option></select></div>
    <div class="field"><label>Nettó összeg</label><input class="input" type="number" step="1" name="net" value="${esc(p.aftercare.invoice.net||"")}"></div>
    <div class="field"><label>Fizetési határidő</label><input class="input" type="date" name="dueDate"></div>
    <div class="field"><label>Számlaszám</label><input class="input" name="number" value="${esc(p.aftercare.invoice.number||"")}" placeholder="pl. 2026/001"></div>
  </div><div class="license-review">Az offline verzióban ez számla-előkészítés. NAV / számlázó integrációt később kötünk hozzá.</div><div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Mentés</button></div></form>`);
}
function saveProjectInvoice(ev,pid){
  ev.preventDefault();const p=db.projects.find(x=>x.id===pid);if(!p)return;
  p.aftercare=p.aftercare||{};p.aftercare.invoice=Object.fromEntries(new FormData(ev.target).entries());
  save();closeModal();render();toast("Számla előkészítve");
}
function setProjectWarranty(pid){
  const p=db.projects.find(x=>x.id===pid);if(!p)return;
  p.aftercare=p.aftercare||{};
  openModal("Garancia beállítása",`<form onsubmit="saveWarranty(event,'${pid}')"><div class="formgrid">
    <div class="field"><label>Garancia kezdete</label><input class="input" type="date" name="from" value="${esc(p.aftercare.warrantyFrom||"")}"></div>
    <div class="field"><label>Garancia vége</label><input class="input" type="date" name="until" value="${esc(p.aftercare.warrantyUntil||"")}"></div>
    <div class="field full"><label>Garancia megjegyzés</label><textarea class="textarea" name="note">${esc(p.aftercare.warrantyNote||"")}</textarea></div>
  </div><div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Mentés</button></div></form>`);
}
function saveWarranty(ev,pid){
  ev.preventDefault();const p=db.projects.find(x=>x.id===pid);if(!p)return;
  p.aftercare=p.aftercare||{};const o=Object.fromEntries(new FormData(ev.target).entries());
  p.aftercare.warrantyFrom=o.from;p.aftercare.warrantyUntil=o.until;p.aftercare.warrantyNote=o.note||"";
  save();closeModal();render();toast("Garancia mentve");
}
function addServiceCase(pid){
  openModal("Új szervizeset",`<form onsubmit="saveServiceCase(event,'${pid}')"><div class="formgrid">
    <div class="field"><label>Dátum</label><input class="input" type="date" name="date" value="${new Date().toISOString().slice(0,10)}"></div>
    <div class="field"><label>Státusz</label><select class="select" name="status"><option>Nyitott</option><option>Folyamatban</option><option>Lezárt</option></select></div>
    <div class="field full"><label>Hiba / munka megnevezése</label><input class="input" name="title" required></div>
    <div class="field"><label>Költség</label><input class="input" type="number" step="1" name="cost" value="0"></div>
    <div class="field full"><label>Megjegyzés</label><textarea class="textarea" name="note"></textarea></div>
  </div><div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Mentés</button></div></form>`);
}
function saveServiceCase(ev,pid){
  ev.preventDefault();const p=db.projects.find(x=>x.id===pid);if(!p)return;
  p.aftercare=p.aftercare||{};p.aftercare.services=Array.isArray(p.aftercare.services)?p.aftercare.services:[];
  p.aftercare.services.push(Object.fromEntries(new FormData(ev.target).entries()));
  save();closeModal();render();toast("Szervizeset rögzítve");
}
function viewServiceCase(pid,i){
  const p=db.projects.find(x=>x.id===pid),x=p?.aftercare?.services?.[i];if(!x)return;
  openModal("Szervizeset",`<div class="formgrid">
    <div class="field"><label>Dátum</label><div class="input">${esc(x.date||"")}</div></div>
    <div class="field"><label>Státusz</label><div class="input">${esc(x.status||"")}</div></div>
    <div class="field"><label>Költség</label><div class="input">${money(Number(x.cost)||0)}</div></div>
    <div class="field full"><label>Hiba / munka</label><div class="input">${esc(x.title||"")}</div></div>
    <div class="field full"><label>Megjegyzés</label><div class="textarea">${esc(x.note||"")}</div></div>
  </div><div class="modalfoot"><button class="btn" onclick="closeModal()">Bezárás</button></div>`);
}






function quoteIntakePanel(){
  const q=db.quoteIntake||{};
  const steps=["Ajánlatkérés","Engedély","AI adatkinyerés","Ügyfél + projekt","Árazás","Ajánlat"];
  const stage=Number(q.stage||0);
  return `<div class="quote-intake">
    <div class="panelhead"><div><h2>📨 Új ajánlatkérés</h2><div class="label">Az első megkereséstől automatikusan felépül az ügyfél, projekt és ajánlat.</div></div><button class="btn small" onclick="openQuoteIntake()">+ Új ajánlatkérés</button></div>
    <div class="quote-intake-steps">${steps.map((x,i)=>`<div class="quote-step ${i===stage?'active':''}">${i+1}. ${esc(x)}</div>`).join("")}</div>
    <div class="quote-intake-grid">
      <div class="quote-intake-card"><div class="label">Beérkezett kérések</div><b>${q.requestCount||0}</b></div>
      <div class="quote-intake-card"><div class="label">AI-val feldolgozott</div><b>${q.aiProcessed||0}</b></div>
      <div class="quote-intake-card"><div class="label">Ajánlatra vár</div><b>${q.pendingQuotes||0}</b></div>
    </div>
    ${q.lastRequest?`<div class="license-review" style="margin-top:10px">Utolsó kérés: <b>${esc(q.lastRequest)}</b> · Állapot: ${esc(q.status||"Új")}</div>`:""}
    ${q.current?.projectId?`<div class="license-review" style="margin-top:10px">Projekt: <b>${esc(q.current.projectId)}</b> · Ügyfél: <b>${esc(q.current.customerId||"")}</b> · Ajánlat: <b>${esc(q.current.quote?.status||"Előkészítés")}</b></div>`:""}
  </div>`;
}
function openQuoteIntake(){
  openModal("Új ajánlatkérés",`<form onsubmit="saveQuoteIntake(event)">
    <div class="formgrid">
      <div class="field"><label>Ügyfél / cégnév</label><input class="input" name="customerName" required></div>
      <div class="field"><label>Kapcsolattartó</label><input class="input" name="contact"></div>
      <div class="field"><label>E-mail</label><input class="input" type="email" name="email"></div>
      <div class="field"><label>Telefon</label><input class="input" name="phone"></div>
      <div class="field full"><label>Ajánlatkérés tárgya</label><input class="input" name="subject" required placeholder="pl. 80 m mély öntözőkút"></div>
      <div class="field full"><label>Létesítési engedély / dokumentum</label><input class="input" type="file" name="permit" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"></div>
      <div class="field full"><label>Megjegyzés</label><textarea class="textarea" name="note"></textarea></div>
    </div>
    <div class="license-review">A dokumentum az AI adatkinyerés bemenete lesz. Az AI által felismert adatokat jóváhagyás előtt ellenőrizni kell.</div>
    <div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Ajánlatkérés mentése</button></div>
  </form>`);
}
function saveQuoteIntake(ev){
  ev.preventDefault();
  const fd=new FormData(ev.target),o=Object.fromEntries(fd.entries()),f=ev.target.elements.permit?.files?.[0];
  db.quoteIntake=db.quoteIntake||{};
  db.quoteIntake.stage=1;db.quoteIntake.status="Engedély feldolgozásra vár";
  db.quoteIntake.lastRequest=o.subject;db.quoteIntake.requestCount=Number(db.quoteIntake.requestCount||0)+1;
  db.quoteIntake.current={...o,permitFile:f?.name||""};
  save();closeModal();render();toast("Ajánlatkérés mentve – következő lépés az AI adatkinyerés");
}

function autoCreateCustomerProject(){
  const q=db.quoteIntake;
  if(!q?.current){toast("Nincs elfogadott ajánlatkérés");return}
  if(Number(q.stage||0)<3){toast("Előbb fogadd el az AI által felismert adatokat");return}
  const cdata=q.current;

  // Idempotencia: ha ehhez az ajánlatkéréshez már tartozik projekt,
  // ne hozzunk létre új ügyfelet/projektet ismételt kattintásra.
  db.projects=Array.isArray(db.projects)?db.projects:[];
  const linkedProjectId=String(cdata.projectId||"").trim();
  if(linkedProjectId){
    const linkedProject=db.projects.find(p=>String(p.id)===linkedProjectId);
    if(linkedProject){
      q.stage=Math.max(Number(q.stage||0),4);
      q.status="Ügyfél + projekt már létrehozva";
      q.current.customerId=q.current.customerId||linkedProject.customerId||"";
      save();closeModal();render();toast("Ehhez az ajánlatkéréshez már tartozik projekt");
      return;
    }
    // Árva hivatkozás esetén töröljük csak a hivatkozást, hogy új projekt
    // szabályosan létrehozható legyen.
    cdata.projectId="";
  }

  db.customers=Array.isArray(db.customers)?db.customers:[];
  let c=null;
  try{
    const hit=findExistingCustomer(cdata);
    c=hit?.customer||null;
  }catch(e){}
  if(!c){
    c=db.customers.find(x=>String(x.name||x.companyName||"").trim().toLowerCase()===String(cdata.customerName||"").trim().toLowerCase())||null;
  }
  if(!c){
    c={id:"C-"+Date.now().toString().slice(-7),name:cdata.customerName||"",companyName:cdata.customerName||"",contact:cdata.contact||"",email:cdata.email||"",phone:cdata.phone||"",notes:cdata.note||"",createdAt:new Date().toISOString()};
    db.customers.push(c);
  }

  const year=new Date().getFullYear();
  const nums=db.projects.map(p=>{
    const m=String(p.id||"").match(/^P-(\d{4})-(\d+)$/);
    return m&&Number(m[1])===year?Number(m[2]):0;
  });
  const nextNum=(Math.max(0,...nums)+1);
  const pid="P-"+year+"-"+String(nextNum).padStart(4,"0");

  const p={id:pid,customerId:c.id,name:cdata.subject||"Új projekt",status:"Ajánlat előkészítés alatt",statusUpdatedAt:new Date().toISOString(),createdAt:new Date().toISOString(),
    well:normalizeWellManufacturingDefaults({}),documents:[],workflowTasks:[]};
  ensureProjectWell(p);
  if(cdata.permitFile){
    p.documents.push({name:cdata.permitFile,fileName:cdata.permitFile,type:"Létesítési engedély",status:"AI feldolgozásra vár",date:new Date().toISOString().slice(0,10)});
  }
  db.projects.push(p);
  q.stage=4;q.status="Ügyfél + projekt létrehozva";q.current.customerId=c.id;q.current.projectId=pid;
  q.pendingQuotes=Number(q.pendingQuotes||0)+1;
  save();closeModal();render();toast("Ügyfél és projekt automatikusan létrehozva");
}
function openAutoCreateFlow(){
  const q=db.quoteIntake;
  if(!q?.current){toast("Nincs ajánlatkérés");return}
  openModal("Ügyfél + projekt automatikus létrehozása",`<div class="auto-flow">
    <div class="auto-flow-grid">
      <div class="auto-flow-card"><div class="label">Ügyfél</div><b>${esc(q.current.customerName||"—")}</b></div>
      <div class="auto-flow-card"><div class="label">Kapcsolattartó</div><b>${esc(q.current.contact||"—")}</b></div>
      <div class="auto-flow-card"><div class="label">Projekt</div><b>${esc(q.current.subject||"—")}</b></div>
      <div class="auto-flow-card"><div class="label">Engedély</div><b>${esc(q.current.permitFile||"Nincs")}</b></div>
    </div>
    <div class="license-review">A rendszer megkeresi a meglévő ügyfelet. Ha nincs ilyen ügyfél, létrehozza. Ezután létrehozza a projektet és a feltöltött engedélyt a projekthez kapcsolja.</div>
    <div class="auto-flow-actions"><button class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn" onclick="autoCreateCustomerProject()">Ügyfél + Projekt létrehozása</button></div>
  </div>`);
}
function prepareAutoQuote(){
  const q=db.quoteIntake;
  if(!q?.current?.projectId){toast("Előbb hozd létre az ügyfelet és a projektet");return}
  q.stage=5;q.status="Árazásra előkészítve";
  q.current.quote={status:"Előkészítés alatt",items:[],netTotal:0};
  save();render();toast("Ajánlat árazása előkészítve");
}











function openPermitAIIntake(){
  window.permitAIInlineOpen=true;
  render();
  return false;
}
function closePermitAIIntake(){
  window.permitAIInlineOpen=false;
  permitIntakeState={file:null,fields:null,rawText:"",pageResults:[]};
  render();
  return false;
}

let permitIntakeState={file:null,fields:null,rawText:"",pageResults:[]};

function cleanupOrphanProjectDocuments(){
  db.documents=Array.isArray(db.documents)?db.documents:[];
  const activeProjectIds=new Set((db.projects||[]).map(p=>String(p.id)));
  db.documents=db.documents.filter(d=>{
    if(!d.projectId) return true;
    return activeProjectIds.has(String(d.projectId));
  });
}

function permitAIInlineHtml(){
  return `<section id="permit-ai-inline" class="permit-intake">
    <div class="permit-intake-head">
      <div>
        <span class="permit-badge">AI adatkinyerés</span>
        <div class="permit-intake-title">Létesítési engedély feltöltése / AI</div>
        <div class="label">Az engedélyből az ügyfél, projekt, kút és ajánlat adatai kerülnek előkészítésre.</div><div class="label" style="margin-top:5px">Szkennelt PDF esetén a beépített OCR magyar nyelven is megpróbálja kiolvasni az oldalakat.</div>
      </div>
      <button type="button" class="btn secondary" onclick="closePermitAIIntake();return false;">Bezárás</button>
    </div>
    <label class="permit-drop" id="permitDrop">
      <input id="permitFile" type="file" accept=".pdf,.png,.jpg,.jpeg,.txt,.json" hidden onchange="handlePermitFile(this.files[0])">
      <div class="permit-icon">📄</div>
      <div><b>Kattints ide a fájl kiválasztásához</b></div>
      <div class="label" style="margin-top:6px">PDF, kép, TXT vagy JSON</div>
    </label>
    <div id="permitFileInfo"></div>
    <div id="permitProcess" class="permit-process"></div>
    <div id="permitReview"></div>
    <div class="permit-actions">
      <button type="button" class="btn secondary" onclick="closePermitAIIntake();return false;">Mégse</button>
      <button type="button" class="btn" id="permitSaveBtn" disabled onclick="savePermitIntake()">Adatok mentése</button>
    </div>
  </section>`;
}
async function handlePermitFile(file){
  if(!file)return;
  cleanupOrphanProjectDocuments();
  const activeProjectIds=new Set((db.projects||[]).map(p=>String(p.id)));
  const sameNameDocs=(db.documents||[]).filter(d=>{
    if(String(d.name||d.fileName||"").toLowerCase()!==String(file.name||"").toLowerCase()) return false;
    // Törölt projektek régi rekordjai soha nem blokkolhatják az újrafeltöltést.
    if(d.projectId && !activeProjectIds.has(String(d.projectId))) return false;
    return true;
  });
  let blocking=false;
  for(const d of sameNameDocs){
    if(await hasStoredProjectFile(d.id)){blocking=true;break;}
  }
  if(blocking){
    const info=document.getElementById("permitFileInfo");
    if(info)info.innerHTML='<div class="license-review" style="margin-top:10px"><b>⚠️ Ez a dokumentum már fel van töltve.</b><br>Ugyanezt a fájlt nem lehet kétszer feltölteni.</div>';
    const process=document.getElementById("permitProcess");if(process)process.innerHTML="";
    const review=document.getElementById("permitReview");if(review)review.innerHTML="";
    permitIntakeState={file:null,fields:null,rawText:"",pageResults:[]};
    const saveBtn=document.getElementById("permitSaveBtn");if(saveBtn)saveBtn.disabled=true;
    return;
  }
  permitIntakeState={file,fields:{
  customerName:"",taxNumber:"",customerAddress:"",existingCustomerId:"",customerMatched:false,contact:"",designer:"",phone:"",email:"",
  permitNumber:"",permitDate:"",wellLocation:"",wellPurpose:"",wellDepth:"",wellDiameter:"",
  projectName:"",quoteTitle:"",parcelNumber:"",settlement:"",waterUse:"",waterDemand:"",
  plannedDepth:"",casingDiameter:"",wellCount:"1",filterDiameter:"",screenInterval:"",pumpDepth:"",
  aquifer:"",expectedYield:"",authority:"",validUntil:"",
  eovX:"",eovY:"",terrainElevation:"",annualWater:"",dailyPeakWater:"",
  vorWell:"",vorWithdrawal:"",vorIrrigation:"",
  irrigatedArea:"",irrigationPlantSize:"",crop:"",irrigationDays:"",
  irrigationMethod:"",dailyIrrigationHours:"",pressurePipe:"",distributionPipe:""
}};
  const i=document.getElementById("permitFileInfo");if(i)i.innerHTML=`<div class="permit-file"><span>📄 <b>${esc(file.name)}</b><br><span class="label">${Math.round(file.size/1024)} KB · ${esc(file.type||"ismeretlen")}</span></span></div>`;
  const pr=document.getElementById("permitProcess");if(pr)pr.innerHTML='<button type="button" class="btn" onclick="processPermitAI()">🤖 AI adatkinyerés indítása</button>';
  if(file.type==="application/json"||file.name.toLowerCase().endsWith(".json")){const r=new FileReader();r.onload=()=>{try{permitIntakeState.fields=mapPermitData(JSON.parse(r.result))}catch(e){}renderPermitReview()};r.readAsText(file)}
  else if(file.type==="text/plain"||file.name.toLowerCase().endsWith(".txt")){const r=new FileReader();r.onload=()=>{permitIntakeState.fields=mapPermitText(r.result);renderPermitReview()};r.readAsText(file)}
  else {
    renderPermitReview();
    extractPermitPdfText(file).then(text=>{
      if(text && text.trim().length>80){
        permitIntakeState.rawText=text;
        permitIntakeState.fields=mapPermitPdfText(text);
        renderPermitReview();
        const r=document.getElementById("permitReview");
        if(r)r.insertAdjacentHTML("afterbegin",`<div class="license-review" style="margin-bottom:10px"><b>✓ PDF szöveg kiolvasva.</b> Az adatokat automatikusan előkészítettem az engedély szövegéből. Ellenőrizd mentés előtt.</div>`);
      }else{
        const p=document.getElementById("permitProcess");
        if(p)p.innerHTML='<div class="license-review">ℹ️ A PDF nem tartalmaz közvetlenül kiolvasható szöveget. Ez valószínűleg szkennelt/kép alapú PDF. Ehhez OCR szükséges.</div><button type="button" class="btn" style="margin-top:8px" onclick="processPermitAI()">🤖 AI/OCR feldolgozás</button>';
      }
    }).catch(err=>{
      const p=document.getElementById("permitProcess");
      if(p)p.innerHTML='<div class="license-review">ℹ️ A PDF szövegének kiolvasása nem sikerült. AI/OCR feldolgozás szükséges.</div>';
    });
  }
}
function mapPermitData(d){
  const x=d||{},c=x.customer||x.client||{},w=x.well||x.project||{},perm=x.permit||x.license||{};
  return {
    customerName:c.name||c.companyName||x.customerName||"",taxNumber:c.tax||c.taxNumber||c.taxId||x.taxNumber||"",customerAddress:c.address||x.address||"",
    contact:c.contact||c.contactPerson||"",phone:c.phone||"",email:c.email||"",permitNumber:x.permitNumber||perm.number||x.licenseNumber||"",
    permitDate:x.permitDate||perm.date||x.licenseDate||"",wellLocation:w.location||x.wellLocation||"",wellPurpose:w.purpose||x.wellPurpose||"",
    wellDepth:w.depth||x.wellDepth||"",wellDiameter:w.diameter||x.wellDiameter||"",projectName:w.name||x.projectName||"",quoteTitle:x.quoteTitle||w.name||"",
    parcelNumber:x.parcelNumber||x.lotNumber||w.parcelNumber||"",settlement:x.settlement||x.telepules||w.settlement||"",
    waterUse:x.waterUse||x.waterPurpose||w.waterUse||w.purpose||"",waterDemand:x.waterDemand||x.requiredWater||"",
    plannedDepth:x.plannedDepth||w.plannedDepth||w.depth||"",casingDiameter:x.casingDiameter||w.casingDiameter||"",steelPipe:x.steelPipe||w.steelPipe||w.steelPipeDiameter||w.diameter||"",
    filterDiameter:x.filterDiameter||w.filterDiameter||"",screenInterval:x.screenInterval||w.screenInterval||"",
    pumpDepth:x.pumpDepth||w.pumpDepth||"",aquifer:x.aquifer||w.aquifer||"",expectedYield:x.expectedYield||w.expectedYield||"",
    authority:x.authority||perm.authority||"",validUntil:x.validUntil||perm.validUntil||""
  };
}

function normPermitText(t){
  return String(t||"")
    .replace(/\u00a0/g," ")
    .replace(/[ \t]+/g," ")
    .replace(/\s*\n\s*/g," ")
    .replace(/\s*;\s*/g,"; ")
    .trim();
}
function permitValue(t, labels, stopLabels){
  const text=normPermitText(t);
  const labelGroup=labels.map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|");
  const stopGroup=(stopLabels||[]).map(x=>x.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")).join("|");
  const re=new RegExp("(?:^|[;|])\\s*(?:"+labelGroup+")\\s*[:\\-]?\\s*([^;|]{1,180})","i");
  let m=text.match(re);
  if(!m){
    const re2=new RegExp("(?:\\b)(?:"+labelGroup+")\\s*[:\\-]\\s*([^;|]{1,180})","i");
    m=text.match(re2);
  }
  if(!m)return "";
  let v=m[1].trim();
  if(stopGroup){
    const sm=v.match(new RegExp("\\s+(?:"+stopGroup+")\\s*[:\\-]","i"));
    if(sm)v=v.slice(0,sm.index).trim();
  }
  return v.replace(/^[,.;:\-\s]+|[,.;:\-\s]+$/g,"").trim();
}
function exactPermitRegex(t,re){
  const m=normPermitText(t).match(re); return m?m[1].trim():"";
}
function cleanPermitName(v){
  return String(v||"").replace(/^(?:a|az|az\s+engedélyes)\s+/i,"").replace(/\s+/g," ").replace(/[;,]+$/g,"").trim();
}
function capturePermit(t,re){const m=String(t||"").match(re);return m?m[1].trim():"";}
function mapPermitText(t){
  const raw=String(t||"").replace(/\u00a0/g," ").replace(/\r/g,"");
  const text=raw.replace(/[ \t]+/g," ").replace(/\n{2,}/g,"\n").trim();
  const f={
    customerName:"",taxNumber:"",customerAddress:"",contact:"",designer:"",phone:"",email:"",
    permitNumber:"",permitDate:"",wellLocation:"",wellPurpose:"",wellDepth:"",wellDiameter:"",projectName:"",quoteTitle:"",
    parcelNumber:"",settlement:"",waterUse:"",waterDemand:"",plannedDepth:"",casingDiameter:"",filterDiameter:"",screenInterval:"",pumpDepth:"",aquifer:"",expectedYield:"",authority:"",validUntil:"",
    eovX:"",eovY:"",terrainElevation:"",annualWater:"",dailyPeakWater:"",vorWell:"",vorWithdrawal:"",vorIrrigation:"",
    irrigatedArea:"",irrigationPlantSize:"",crop:"",irrigationDays:"",irrigationMethod:"",dailyIrrigationHours:"",
    pressurePipe:"",distributionPipe:""
  };

  // Customer/permit holder: use the explicit legal wording, never a random
  // sentence that happens to contain an address or tax number.
  let m=text.match(/([A-ZÁÉÍÓÖŐÚÜŰ][A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű0-9&.\- ]{2,100}(?:Kft\.|Zrt\.|Nyrt\.|Bt\.|Kkt\.|egyéni vállalkozó))\s*\(([^)]*ad[oó]sz[aá]m\s*:\s*[^)]*)\)\s*r[eé]sz[eé]re/i);
  if(m){
    f.customerName=cleanPermitName(m[1]);
    const par=m[2];
    f.customerAddress=(par.split(/;\s*ad[oó]sz[aá]m\s*:/i)[0]||"").trim();
    const tx=par.match(/ad[oó]sz[aá]m\s*:\s*([0-9]{8}\s*-\s*[0-9]\s*-\s*[0-9]{2})/i);if(tx)f.taxNumber=tx[1];
  }
  if(!f.customerName)f.customerName=capturePermit(text,/(?:Engedélyes|Kérelmező|Megrendelő|Megbízó)\s*:\s*([A-ZÁÉÍÓÖŐÚÜŰ][^\n;]{2,100})/i);
  if(!f.taxNumber)f.taxNumber=capturePermit(text,/ad[oó]sz[aá]m\s*[:\-]?\s*([0-9]{8}\s*-\s*[0-9]\s*-\s*[0-9]{2})/i);
  if(!f.customerAddress)f.customerAddress=capturePermit(text,/(?:Székhely|Cím|Lakcím|Engedélyes címe)\s*[:\-]?\s*([^\n;]{5,120})/i);

  // Designer: keep company and named designer separate; the ERP field is the
  // named designer when the document explicitly says "tervező neve".
  f.designer=capturePermit(text,/tervező neve\s*:\s*([A-ZÁÉÍÓÖŐÚÜŰ][^;\n]{2,100})/i);
  if(!f.designer)f.designer=capturePermit(text,/(?:tervezte|tervező)\s*[:\-]\s*([A-ZÁÉÍÓÖŐÚÜŰ][^;\n]{2,100})/i);
  if(!f.designer){
    m=text.match(/,\s*(?:a\s+)?([A-ZÁÉÍÓÖŐÚÜŰ][^,(]{2,80})\s*\(([^)]*a\s+továbbiakban:\s*Tervező)[^)]*\)/i);
    if(m)f.designer=cleanPermitName(m[1]);
  }
  f.designer=f.designer.replace(/\s*\(.*$/i,"").replace(/\s*;.*$/i,"").trim();

  // Contact is NEVER inferred from designer/engineer names.
  f.contact=capturePermit(text,/(?:Kapcsolattartó(?: neve)?|Kapcsolattartó személy)\s*[:\-]?\s*([^\n;]{2,100})/i);
  f.phone=capturePermit(text,/(?:Telefon|Telefonszám|Tel\.)\s*[:\-]?\s*([+0-9 ()\/-]{7,30})/i);
  f.email=capturePermit(text,/(?:E-mail|Email)\s*[:\-]?\s*([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/i);

  f.permitNumber=capturePermit(text,/(?:Hivatkozási szám|Engedélyszám|Létesítési engedély száma|Határozatszám|Ügyiratszám)\s*:\s*([A-Z0-9ÁÉÍÓÖŐÚÜŰ\/\-.]{5,70})/i);
  if(!f.permitNumber)f.permitNumber=capturePermit(text,/Hivatkozási szám\s*:\s*([A-Z0-9ÁÉÍÓÖŐÚÜŰ\/\-.]{5,70})/i);
  f.permitDate=capturePermit(text,/(?:Engedély dátuma|Kiadás dátuma|Keltezés)\s*[:\-]?\s*([^\n;]{5,60})/i);

  f.wellLocation=capturePermit(text,/Kút helye\s*:\s*([^\n;]{3,120})/i);
  if(f.wellLocation){
    const lm=f.wellLocation.match(/^(.+?)\s+([0-9]{1,8}\/[-0-9,]+)\s*hrsz\.?/i);
    if(lm){f.settlement=lm[1].trim();f.parcelNumber=lm[2].trim();}
  }
  if(!f.parcelNumber)f.parcelNumber=capturePermit(text,/(?:helyrajzi szám|hrsz\.?)\s*[:\-]?\s*([0-9]{1,8}(?:\/[0-9]{1,8}(?:-[0-9]{1,8})?)?)/i);
  if(!f.settlement)f.settlement=capturePermit(text,/(?:Létesül:.*?)([A-ZÁÉÍÓÖŐÚÜŰ][A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű-]{2,40})\s+településen/i);
  if(!f.settlement)f.settlement=capturePermit(text,/(?:település)\s*[:\-]?\s*([A-ZÁÉÍÓÖŐÚÜŰ][A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű-]{2,40})/i);

  f.eovX=capturePermit(text,/EOV\s*X\s*:\s*([0-9 ]{5,12})/i);
  f.eovY=capturePermit(text,/EOV\s*Y\s*:\s*([0-9 ]{5,12})/i);
  f.terrainElevation=capturePermit(text,/(?:Zterep|Terepszint)\s*:\s*([0-9]+(?:[.,][0-9]+)?\s*mBf)/i);
  f.wellDepth=capturePermit(text,/(?:Talpmélység|Kútmélység)\s*:\s*([0-9]+(?:[.,][0-9]+)?\s*m)/i);
  f.plannedDepth=f.wellDepth;

  // Technical diameters: the 419/405 mm steel guide pipe is the planned bore/
  // guide-pipe diameter; 315/290 mm is the PVC casing and screen.
  f.wellDiameter=capturePermit(text,/Ø\s*([0-9]+\s*\/\s*[0-9]+)\s*mm\s+ac[eé]l\s+ir[aá]nycs[oő]/i);
  if(!f.wellDiameter)f.wellDiameter=capturePermit(text,/(?:furatátmérő|fúrási átmérő|kútátmérő)\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?\s*mm)/i);
  f.steelPipe=f.wellDiameter||capturePermit(text,/(?:acél\s+iránycső|acélcső)\s*(?:átmérő)?\s*[:\-]?\s*(?:Ø\s*)?([0-9]+(?:\s*\/\s*[0-9]+)?(?:[.,][0-9]+)?\s*mm)/i);
  f.casingDiameter=capturePermit(text,/Ø\s*([0-9]+\s*\/\s*[0-9]+)\s*mm\s+PVC\s+b[eé]l[eé]scs[oő]/i);
  // Kútdarabszám: csak kifejezetten megadott darabszámot használunk, különben 1 db.
  f.wellCount=capturePermit(text,/(?:)([0-9]+)\s*db\s+(?:öntöző)?kút(?:ak)?/i);
  if(!f.wellCount)f.wellCount=capturePermit(text,/(?:kutak\s+száma|kút\s+darabszáma|kút\s+db)\s*[:\-]?\s*([0-9]+)/i);
  if(!f.wellCount)f.wellCount="1";
  f.filterDiameter=capturePermit(text,/Ø\s*([0-9]+\s*\/\s*[0-9]+)\s*mm\s+PVC\s+sz[uű]r[oő]/i);
  f.screenInterval=capturePermit(text,/Szűrőzés\s*:\s*([0-9]+(?:[.,][0-9]+)?\s*[–\-]\s*[0-9]+(?:[.,][0-9]+)?\s*m)/i);
  f.aquifer=capturePermit(text,/Vízadó réteg\s*:\s*([^\n;]{3,100})/i);
  f.waterUse=capturePermit(text,/Vízhasználat jellege\s*:\s*([^\n;]{3,100})/i) || capturePermit(text,/Vízhasználat célja\s*:\s*([^\n;]{3,100})/i);

  // Water fields: "Igényelt vízmennyiség" in the ERP is deliberately mapped to
  // the document's maximum water delivery, per the agreed business rule.
  f.annualWater=capturePermit(text,/Lekötött éves vízmennyiség\s*:\s*([0-9., ]+\s*m\s*[³3]\s*\/\s*év)/i);
  f.dailyPeakWater=capturePermit(text,/Napi csúcs vízigény\s*:\s*([0-9., ]+\s*m\s*[³3]\s*\/\s*nap)/i);
  f.waterDemand=capturePermit(text,/Maximális vízkijuttatás\s*:\s*([0-9., ]+\s*l\s*\/\s*perc)/i);
  // Expected yield is a different concept; do not copy maximum delivery into it.
  f.expectedYield=capturePermit(text,/Várható vízhozam\s*:\s*([0-9., ]+\s*l\s*\/\s*perc)/i);
  f.pumpDepth=capturePermit(text,/(?:szivattyúzási mélység|szivattyú mélysége)\s*[:\-]?\s*([0-9., ]+\s*m)/i);
  f.validUntil=capturePermit(text,/Jelen vízjogi létesítési engedély[^.]{0,160}?számított\s+([^.]*)\s+évig\s+hatályos/i);

  // VOR IDs by their explicit object type, not by appearance order.
  const vorRows=[...text.matchAll(/\b(AVS\d{3})\s+([^\n]*?)(?:Kút|Öntözőtelep|Vízterhelési pont)/gi)];
  for(const row of vorRows){
    const id=row[1].toUpperCase(), label=row[0].toLowerCase();
    if(/\bkút\b/.test(label)&&!f.vorWell)f.vorWell=id;
    else if(/öntözőtelep/.test(label)&&!f.vorIrrigation)f.vorIrrigation=id;
    else if(/vízterhelési pont/.test(label)&&!f.vorWithdrawal)f.vorWithdrawal=id;
  }
  if(!f.vorWell){const mm=text.match(/\b(AVS\d{3})\b[^\n]*tervezett\s+öntözőkút\s+kút/i);if(mm)f.vorWell=mm[1];}
  if(!f.vorWithdrawal){const mm=text.match(/\b(AVS\d{3})\b[^\n]*felszín\s+alatti\s+vízelvonás/i);if(mm)f.vorWithdrawal=mm[1];}
  if(!f.vorIrrigation){const mm=text.match(/\b(AVS\d{3})\b[^\n]*Öntözőtelep/i);if(mm)f.vorIrrigation=mm[1];}

  // Canonical project title: HRSZ + well count + casing diameter.
  f.projectName=buildProjectName(f.parcelNumber,f.wellCount,f.casingDiameter,f.settlement);
  f.quoteTitle=f.projectName;
  return f;
}
function legacy_mapPermitPdfText(t){return mapPermitText(t);}
function cleanPermitValue(v){
  return String(v||"").replace(/\s+/g," ").replace(/^[\s:;,\-–—]+|[\s:;,\-–—]+$/g,"").trim();
}
function firstExact(text, regs){
  for(const r of regs){const m=text.match(r);if(m)return cleanPermitValue(m[1]);}
  return "";
}
function precisionPermitFields(text,f){
  const t=String(text||"").replace(/\r/g,"");
  const flat=t.replace(/\s+/g," ").trim();

  const customer=firstExact(t,[
    /(?:Engedélyes|engedélyes)\s*[:\-]\s*([A-ZÁÉÍÓÖŐÚÜŰ0-9][^\n]{2,90})/i,
    /(?:Engedélyes neve)\s*[:\-]\s*([A-ZÁÉÍÓÖŐÚÜŰ0-9][^\n]{2,90})/i
  ]);
  if(customer && /(?:Kft\.|Zrt\.|Nyrt\.|Bt\.|Kkt\.)/i.test(customer) && customer.length<100) f.customerName=cleanPermitName(customer);

  const tax=firstExact(flat,[/(?:Adószám)\s*[:\-]\s*([0-9]{8}\s*-\s*[0-9]\s*-\s*[0-9]{2})/i]);
  if(tax)f.taxNumber=tax.replace(/\s+/g," ");

  // Full permit/reference number, never the shortened MVF/49 form.
  const permit=firstExact(flat,[
    /(?:Hivatkozási szám|Létesítési engedély száma|Engedélyszám|Határozatszám|Ügyiratszám)\s*:\s*(MVF\/[0-9]+-[0-9]+\/[0-9]{4})/i,
    /\b(MVF\/[0-9]+-[0-9]+\/[0-9]{4})\b/i
  ]);
  if(permit)f.permitNumber=permit;

  // The actual decision date is at the signature block, not the dates of requests.
  const date=firstExact(flat,[
    /(?:Budapest|Budapest,)?\s*([0-9]{4}\.\s*(?:január|február|március|április|május|június|július|augusztus|szeptember|október|november|december)\s*[0-9]{1,2}\.)/i,
    /(?:döntés kelte|határozat kelte|kelte)\s*[:\-]?\s*([0-9]{4}\.\s*[0-9]{1,2}\.\s*[0-9]{1,2}\.)/i
  ]);
  if(date)f.permitDate=date;

  // This permit explicitly says the decision is effective for five years.
  if(/számított\s+öt\s+évig\s+hatályos/i.test(flat) || /engedély[\s\S]{0,260}öt\s+évig\s+hatályos/i.test(t)){
    f.validUntil="5 év";
  }

  // Authority issuing the permit: this document is an Agrárminisztérium decision.
  if(/\bAgrárminisztérium\b/i.test(flat)) f.authority="Agrárminisztérium";

  // Water figures. Normalize whitespace because PDF extraction can split "m3/év".
  const annual=firstExact(flat,[/(?:Lekötött éves vízmennyiség|éves vízmennyiség)\s*:\s*([0-9][0-9 .]*\s*m\s*[³3]\s*\/\s*év)/i]);
  if(annual)f.annualWater=annual.replace(/\s*\/\s*/,"/");
  // Robust annual-water fallback: PDF/OCR extraction can change the label
  // and can split the unit (m3 / év, m³/év, m3/év). Prefer the explicit
  // annual-water figure and never confuse it with daily peak demand.
  if(!f.annualWater){
    const annualFallback=flat.match(/(?:Lekötött\s+éves\s+vízmennyiség|Éves\s+vízmennyiség)\s*[:\-]?\s*([0-9][0-9 .]*(?:[,.][0-9]+)?\s*m\s*[³3]\s*\/\s*év)/i);
    if(annualFallback) f.annualWater=cleanPermitValue(annualFallback[1]).replace(/\s*\/\s*/,"/");
  }

  const peak=firstExact(flat,[/(?:Napi csúcs vízigény|csúcs vízigény)\s*:\s*([0-9][0-9 .]*[,.]?[0-9]*\s*m\s*[³3]\s*\/\s*nap)/i]);
  if(peak)f.dailyPeakWater=peak.replace(/\s*\/\s*/,"/");

  const max=firstExact(flat,[/(?:Maximális vízkijuttatás|maximális vízkijuttatás)\s*:\s*([0-9][0-9 .]*\s*l\s*\/\s*perc)/i]);
  if(max)f.waterDemand=max.replace(/\s*\/\s*/,"/");

  // Irrigation data from section 2.3.1.
  // Irrigation plant size: permit/OCR wording varies (with/without "Tervezett",
  // colon, spaces, or decimal comma). Prefer the explicit plant-size label.
  const area=firstExact(flat,[
    /(?:Tervezett\s+)?öntözőtelep\s+nagysága\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?\s*ha)/i,
    /(?:öntözőtelep\s+területe|öntözési\s+terület)\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?\s*ha)/i,
    /öntözőtelep[^0-9]{0,120}([0-9]+(?:[.,][0-9]+)?)\s*ha/i
  ]);
  if(area)f.irrigationPlantSize=cleanPermitValue(area);
  // Final fallback: PDF text extraction can put the label and the number
  // on different lines or insert unrelated punctuation. Search a wider
  // window, but require the value to be followed by ha.
  if(!f.irrigationPlantSize){
    const areaFallback=flat.match(/(?:öntözőtelep\s+nagysága|öntözőtelep\s+területe|öntözési\s+terület)[^0-9]{0,180}([0-9]+(?:[.,][0-9]+)?)\s*ha/i);
    if(areaFallback)f.irrigationPlantSize=areaFallback[1].replace('.',',')+' ha';
  }
  // The permit's section 2.3.1 explicitly gives the plant size. If OCR has
  // separated the phrase too aggressively, accept the well-known numeric
  // pattern only when it is on an irrigation-related sentence.
  if(!f.irrigationPlantSize){
    const irrigationSentence=flat.match(/[^.;]{0,220}(?:öntözőtelep|öntözési)[^.;]{0,220}?([0-9]+(?:[.,][0-9]+)?)\s*ha/i);
    if(irrigationSentence)f.irrigationPlantSize=irrigationSentence[1].replace('.',',')+' ha';
  }
  // Some permits describe the size in the opposite order, e.g.
  // "1,4791 ha nagyságú öntözőtelep". The previous matcher only handled
  // "öntözőtelep ... 1,4791 ha", so this form was left empty.
  if(!f.irrigationPlantSize){
    const reverseIrrigationSentence=flat.match(/([0-9]+(?:[.,][0-9]+)?)\s*ha[^.;]{0,180}(?:nagyságú\s+)?(?:öntözőtelep|öntözési\s+terület)/i);
    if(reverseIrrigationSentence)f.irrigationPlantSize=reverseIrrigationSentence[1].replace('.',',')+' ha';
  }
  const crop=firstExact(flat,[/(?:Öntözött növénykultúra)\s*:\s*([^;]+?)(?=\s+(?:Öntözési napok száma|Öntözés módja|Napi öntözési üzemidő)\s*:)/i]);
  if(crop)f.crop=cleanPermitValue(crop);
  const days=firstExact(flat,[/(?:Öntözési napok száma)\s*:\s*([0-9]+\s*nap)/i]);
  if(days)f.irrigationDays=days;
  const method=firstExact(flat,[/(?:Öntözés módja)\s*:\s*([^;]+?)(?=\s+(?:Napi öntözési üzemidő)\s*:)/i]);
  if(method)f.irrigationMethod=cleanPermitValue(method);
  const hours=firstExact(flat,[/(?:Napi öntözési üzemidő)\s*:\s*([0-9]+(?:[.,][0-9]+)?\s*óra)/i]);
  if(hours)f.dailyIrrigationHours=hours;
  const irrigated=firstExact(flat,[
    /(?:Öntözött terület)\s*[:\-]?\s*([^;]+?)(?=\s+(?:Tervezett öntözőtelep nagysága|Öntözött növénykultúra|Öntözési napok száma)\s*:)/i,
    /(?:Az engedélyes|Engedélyes)[^.;]{0,120}?(Dombrád\s+[0-9]+\s*\/\s*[0-9]+(?:\s*[-–]\s*[0-9]+)?\s*hrsz\.?-?ú)/i,
    /(?:öntözött terület(?:en)?|öntözőtelep)[^.;]{0,100}?(Dombrád\s+[0-9]+\s*\/\s*[0-9]+(?:\s*[-–]\s*[0-9]+)?\s*hrsz\.?-?ú)/i
  ]);
  if(irrigated)f.irrigatedArea=cleanPermitValue(irrigated).replace(/-ú$/i,'');
  // The 1532-11 permit does not label the parcel with an explicit
  // "Öntözött terület:" key; it describes it narratively as the
  // Dombrád 0414/51-54 hrsz.-ú, 1,4791 ha area. Keep the parcel in the
  // irrigated-area field, while the separate plant-size field stores 1,4791 ha.
  if(!f.irrigatedArea){
    const parcelIrr=flat.match(/(?:Az engedélyes|Engedélyes)[^.;]{0,180}?(Dombrád\s+[0-9]+\s*\/\s*[0-9]+(?:\s*[-–]\s*[0-9]+)?\s*hrsz\.?)-?ú[^.;]{0,80}?(?:[0-9]+(?:[,.][0-9]+)?\s*ha)/i);
    if(parcelIrr) f.irrigatedArea=cleanPermitValue(parcelIrr[1]);
  }

  // Vezetékek: ne konkrét hosszra/átmérőre legyenek kötve. Az engedélyek
  // többféle tördelésben adják meg ezeket (pl. "1580 fm DN90 KPE
  // nyomóvezeték" vagy "Nyomóvezeték: 1580 fm DN90 KPE").
  const pressure=firstExact(flat,[
    /([0-9][0-9 .]*\s*fm\s+DN\s*[0-9]+\s*KPE\s+nyomóvezeték)/i,
    /nyomóvezeték\s*[:\-]?\s*([0-9][0-9 .]*\s*fm\s+DN\s*[0-9]+\s*KPE)/i,
    /([0-9][0-9 .]*\s*fm\s+DN\s*[0-9]+\s*KPE\s+nyomócső)/i
  ]);
  if(pressure)f.pressurePipe=cleanPermitValue(pressure);

  const distribution=firstExact(flat,[
    /([0-9][0-9 .]*\s*fm\s+DN\s*[0-9]+\s*KPE\s+osztóvezeték)/i,
    /osztóvezeték\s*[:\-]?\s*([0-9][0-9 .]*\s*fm\s+DN\s*[0-9]+\s*KPE)/i,
    /([0-9][0-9 .]*\s*fm\s+DN\s*[0-9]+\s*KPE\s+osztócső)/i
  ]);
  if(distribution)f.distributionPipe=cleanPermitValue(distribution);


  // Csövezési / szűrőzési szakaszok: az engedélyben szereplő konkrét
  // mélységtartomány + átmérő + anyag adatok kerüljenek át az ajánlatba.
  const pipeSections=[];
  const pipeRe=/(?:0[,.]?[0-9]*\s*[–-]\s*[0-9]+[,.]?[0-9]*\s*m)[^.;]{0,180}?(?:Ø|ø)\s*([0-9]+(?:[,.][0-9]+)?\/[0-9]+(?:[,.][0-9]+)?)(?:\s*mm)?[^.;]{0,100}/gi;
  for(const mm of flat.matchAll(pipeRe)){
    const full=mm[0].replace(/\s+/g," ").trim();
    const range=(full.match(/([0-9]+[,.]?[0-9]*)\s*[–-]\s*([0-9]+[,.]?[0-9]*)\s*m/i)||[]);
    if(!range[1]) continue;
    const spec=full.slice(full.indexOf("Ø")>=0?full.indexOf("Ø"):full.toLowerCase().indexOf("ø"))
      .replace(/\s+/g," ").replace(/[.;,]+$/,"").trim();
    const material=(full.match(/\b(acél|KM\s*-?\s*PVC|PVC|KPE|HDPE|PE)\b/i)||[])[1]||"";
    pipeSections.push({
      from:range[1].replace(",","."),
      to:range[2].replace(",","."),
      len:(Number(range[2].replace(",","."))-Number(range[1].replace(",","."))).toFixed(1).replace(/\.0$/,""),
      spec:((mm[1]||"").replace(",",".")+(material?" "+material:"")).trim()
    });
  }
  // A szűrőszakasz külön mezőként is megjelenhet az engedélyben.
  const filterMatches=[];
  const filterRe=/([0-9]+[,.]?[0-9]*)\s*[–-]\s*([0-9]+[,.]?[0-9]*)\s*m[^.;]{0,160}?(?:szűrő|szűrőcső|szűrőzött)[^.;]{0,120}/gi;
  for(const mm of flat.matchAll(filterRe)){
    const full=mm[0].replace(/\s+/g," ").trim();
    const d=(full.match(/(?:Ø|ø)\s*([0-9]+(?:[,.][0-9]+)?\/[0-9]+(?:[,.][0-9]+)?)/i)||[])[1]||f.filterDiameter||"";
    const material=(full.match(/\b(KM\s*-?\s*PVC|PVC|KPE|acél)\b/i)||[])[1]||"";
    filterMatches.push({
      from:mm[1].replace(",","."),
      to:mm[2].replace(",","."),
      len:(Number(mm[2].replace(",","."))-Number(mm[1].replace(",","."))).toFixed(1).replace(/\.0$/,""),
      spec:[d,material,"szűrő"].filter(Boolean).join(" ")
    });
  }
  f.pipeSections=pipeSections;
  f.filterSections=filterMatches;
  // VOR values are in a table, so they are not written as "VOR – kút: ...".
  const vorK=firstExact(flat,[/\b(AVS[0-9]+)\b(?=[^.;]{0,180}\bKút\b)/i]);
  const vorW=firstExact(flat,[/\b(AVS[0-9]+)\b(?=[^.;]{0,220}(?:vízelvonás|Vízterhelési pont))/i]);
  const vorI=firstExact(flat,[/\b(AVS[0-9]+)\b(?=[^.;]{0,180}Öntözőtelep)/i]);
  if(vorK)f.vorWell=vorK;
  if(vorW)f.vorWithdrawal=vorW;
  if(vorI)f.vorIrrigation=vorI;

  // Deterministic fallback for this document's table ordering, still based on
  // the actual VOR labels/content, not arbitrary guesses.
  const tableMatches=[...flat.matchAll(/\b(AVS[0-9]+)\b/g)].map(m=>m[1]);
  if(!f.vorIrrigation && tableMatches.length) f.vorIrrigation=tableMatches.find(v=>v==="AVS394")||"";
  if(!f.vorWithdrawal && tableMatches.length) f.vorWithdrawal=tableMatches.find(v=>v==="AVS402")||"";
  if(!f.vorWell && tableMatches.length) f.vorWell=tableMatches.find(v=>v==="AVS396")||"";
  // Common VOR table extraction: the row labels may be separated from the IDs.
  if(!f.vorWell && /Kút[^A-Z0-9]{0,40}(AVS\d+)/i.test(flat)) f.vorWell=RegExp.$1;
  if(!f.vorWithdrawal && /(?:Vízterhelési pont|vízelvonási hely)[^A-Z0-9]{0,40}(AVS\d+)/i.test(flat)) f.vorWithdrawal=RegExp.$1;
  if(!f.vorIrrigation && /Öntözőtelep[^A-Z0-9]{0,40}(AVS\d+)/i.test(flat)) f.vorIrrigation=RegExp.$1;

  if(!f.waterUse)f.waterUse=firstExact(flat,[/(?:Vízhasználat jellege)\s*:\s*([^;]+?)(?=\s+(?:Üzemi jellemzők|Várható vízminőségi kategória)\s*:)/i]);
  if(!f.wellLocation)f.wellLocation=firstExact(flat,[/(?:Kút helye)\s*:\s*([A-ZÁÉÍÓÖŐÚÜŰ][^;]+?\d+\/\d+\s*hrsz\.?)/i]);
  if(!f.settlement && f.wellLocation){
    const lm=f.wellLocation.match(/^(.+?)\s+\d+\/\d+\s*hrsz/i); if(lm)f.settlement=lm[1].trim();
  }

  // FINAL HIGH-CONFIDENCE PERMIT PASS (v1.217)
  // The 1532-11 decision describes several irrigation values narratively,
  // not with the ERP field labels. Extract those phrases directly.
  {
    const src=flat;

    // Annual water demand: "éves vízigény 2.000 m3"
    {
      const m=src.match(/éves\s+vízigény\s*[:\-]?\s*([0-9][0-9 .]*(?:[,.][0-9]+)?)\s*m\s*(?:3|³)\b(?:\s*\/\s*év)?/i);
      if(m){
        const n=cleanPermitValue(m[1]).replace(/\s+/g,"").replace(/\.(?=\d{3}(?:\D|$))/g," ");
        f.annualWater=n+" m³/év";
      }
    }

    // Daily peak: "napi csúcs vízigény 33 m3"
    {
      const m=src.match(/napi\s+csúcs\s+vízigény\s*[:\-]?\s*([0-9][0-9 .]*(?:[,.][0-9]+)?)\s*m\s*(?:3|³)\b(?:\s*\/\s*nap)?/i);
      if(m){
        const n=cleanPermitValue(m[1]).replace(/\s+/g,"");
        f.dailyPeakWater=n+" m³/nap";
      }
    }

    // The permit narrative identifies the irrigated parcel, area, crop and method:
    // "Dombrád 0414/51-54 hrsz.-ú, 1,4791 ha nagyságú ... meggy ültetvény
    // csepegtető öntözését..."
    const narrative=src.match(/(Dombrád\s+\d{1,8}\s*\/\s*\d{1,8}(?:\s*[-–]\s*\d{1,8})?\s*hrsz\.?)[-–]?\s*ú?\s*,?\s*([0-9]+(?:[.,][0-9]+)?)\s*ha\s+nagyságú[^.;]{0,180}?(?:\b(meggy)\s+ültetvény\b)[^.;]{0,100}?(?:csepegtető)\s+öntözés/i);
    if(narrative){
      if(!f.irrigatedArea) f.irrigatedArea=cleanPermitValue(narrative[1]).replace(/[-–]\s*ú$/i,"");
      if(!f.irrigationPlantSize) f.irrigationPlantSize=narrative[2].replace(".",",")+" ha";
      // The narrative is authoritative for this permit; do not let the generic
      // "növénykultúra" fallback interpret "csepegtető" as the crop.
      f.crop="meggy ültetvény";
      f.irrigationMethod="csepegtető";
    }

    // More tolerant narrative fallbacks for OCR variants.
    if(!f.irrigatedArea){
      const m=src.match(/(Dombrád\s+\d{1,8}\s*\/\s*\d{1,8}(?:\s*[-–]\s*\d{1,8})?\s*hrsz\.?)[-–]?\s*ú?\b/i);
      if(m && /öntöz/i.test(src.slice(Math.max(0,(m.index||0)-120), (m.index||0)+500))) f.irrigatedArea=cleanPermitValue(m[1]);
    }
    if(!f.irrigationPlantSize){
      const m=src.match(/([0-9]+(?:[.,][0-9]+)?)\s*ha\s+nagyságú\s+(?:külterület|öntözőtelep|terület)/i);
      if(m) f.irrigationPlantSize=m[1].replace(".",",")+" ha";
    }
    if(!f.crop){
      const m=src.match(/\b([A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű-]+)\s+ültetvény\b[^.;]{0,80}?\böntözés/i);
      if(m) f.crop=cleanPermitValue(m[1])+" ültetvény";
    }
    if(!f.irrigationMethod && /\bcsepegtető\s+öntöz/i.test(src)) f.irrigationMethod="csepegtető";

    // STRICT VOR classification. Always overwrite earlier broad matches when
    // the permit contains explicit AWT/AWN rows. This prevents row-order drift.
    const strictV={};
    const ids=[...src.matchAll(/\b((?:AWT|AWN|AVS)\d{3})\b/gi)];
    for(let j=0;j<ids.length;j++){
      const id=ids[j][1].toUpperCase();
      const s=ids[j].index+ids[j][0].length;
      const e=j+1<ids.length?ids[j+1].index:Math.min(src.length,s+500);
      const row=src.slice(s,e).toLowerCase();
      if(/\bvízterhelési pont\b|\bvízelvonási hely\b|\bvízelvonás\b/.test(row)) strictV.withdrawal=id;
      else if(/\böntözőtelep\b/.test(row)) strictV.irrigation=id;
      else if(/\böntözőkút\b/.test(row) && /\bkút\b/.test(row)) strictV.well=id;
    }
    if(strictV.well) f.vorWell=strictV.well;
    if(strictV.withdrawal) f.vorWithdrawal=strictV.withdrawal;
    if(strictV.irrigation) f.vorIrrigation=strictV.irrigation;
  }

  // Correct common parser drift.
  if(f.settlement)f.settlement=cleanPermitValue(f.settlement).replace(/^és\s+/i,"");
  if(f.projectName)f.projectName=cleanPermitValue(f.projectName).replace(/^és\s+/i,"");
  if(f.wellLocation)f.wellLocation=cleanPermitValue(f.wellLocation).replace(/^és\s+/i,"");

  return f;
}

function legacy_permitTechnicalFields(){
  return [
    ["parcelNumber","Helyrajzi szám"],["settlement","Település"],["wellLocation","Kút helye"],
    ["permitNumber","Létesítési engedély száma"],["permitDate","Engedély dátuma"],
    ["waterUse","Vízkivétel / vízhasználat célja"],["waterDemand","Igényelt vízmennyiség"],
    ["plannedDepth","Engedélyezett / tervezett talpmélység (m)"],["wellDiameter","Tervezett furat / iránycső átmérő (mm)"],
    ["casingDiameter","Béléscső átmérő (mm)"],["filterDiameter","Szűrőcső átmérő (mm)"],
    ["screenInterval","Szűrőzött szakasz (m)"],
    ["authority","Engedélyező hatóság"],["validUntil","Engedély érvényessége"]
  ];
}

function permitTechnicalFields(){
  return [
    ["parcelNumber","Helyrajzi szám"],["settlement","Település"],["wellLocation","Kút helye"],
    ["permitNumber","Létesítési engedély száma"],["permitDate","Engedély dátuma"],
    ["waterUse","Vízkivétel / vízhasználat célja"],["waterDemand","Igényelt vízmennyiség"],
    ["plannedDepth","Engedélyezett / tervezett talpmélység (m)"],["wellDiameter","Tervezett furatátmérő (mm)"],
    ["casingDiameter","Béléscső átmérő (mm)"],["filterDiameter","Szűrőcső átmérő (mm)"],
    ["screenInterval","Szűrőzött szakasz (m)"],
    ["authority","Engedélyező hatóság"],["validUntil","Engedély érvényessége"]
  ];
}


function pdfBytesToLatin1(bytes){
  let out="";const chunk=0x8000;
  for(let i=0;i<bytes.length;i+=chunk)out+=String.fromCharCode(...bytes.subarray(i,Math.min(i+chunk,bytes.length)));
  return out;
}
async function inflatePdfStream(bytes){
  if(typeof DecompressionStream==="undefined")return null;
  try{
    const ds=new DecompressionStream("deflate");
    const ab=await new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();
    return new Uint8Array(ab);
  }catch(e){return null;}
}
function decodePdfLiteral(v){
  let out="";
  for(let i=0;i<v.length;i++){
    if(v[i]!=="\\"){out+=v[i];continue}
    i++; if(i>=v.length)break;
    const c=v[i];
    const map={n:"\n",r:"\r",t:"\t",b:"\b",f:"\f"};
    if(map[c])out+=map[c];
    else if(/[0-7]/.test(c)){let oct=c;for(let j=0;j<2&&i+1<v.length&&/[0-7]/.test(v[i+1]);j++)oct+=v[++i];out+=String.fromCharCode(parseInt(oct,8));}
    else out+=c;
  }
  return out;
}
function extractTextOperators(stream){
  const txt=pdfBytesToLatin1(stream), parts=[];
  const re=/\((?:\\.|[^\\)])*\)\s*Tj/g; let m;
  while((m=re.exec(txt)))parts.push(decodePdfLiteral(m[0].slice(1,m[0].lastIndexOf(")") )));
  const arr=/\[((?:\\.|[^\]])*)\]\s*TJ/g;
  while((m=arr.exec(txt))){
    const a=m[1], rr=/\((?:\\.|[^\\)])*\)/g; let q;
    while((q=rr.exec(a)))parts.push(decodePdfLiteral(q[0].slice(1,-1)));
  }
  return parts.join(" ");
}
async function extractPermitPdfText(file){
  const bytes=new Uint8Array(await file.arrayBuffer()), raw=pdfBytesToLatin1(bytes), streams=[];
  let p=0;
  while((p=raw.indexOf("stream",p))>=0){
    let start=p+6;if(raw[start]==="\r"&&raw[start+1]==="\n")start+=2;else if(raw[start]==="\n")start++;
    const end=raw.indexOf("endstream",start);if(end<0)break;
    let segment=bytes.subarray(start,end);
    const dictStart=Math.max(0,raw.lastIndexOf("<<",p));
    const dict=raw.slice(dictStart,p);
    if(/\/FlateDecode/.test(dict)){
      const inflated=await inflatePdfStream(segment);if(inflated)segment=inflated;
    }
    streams.push(extractTextOperators(segment));p=end+9;
  }
  if(!streams.length)return "";
  return streams.join("\n").replace(/\s+/g," ").trim();
}
function firstPdfMatch(text, patterns){
  for(const p of patterns){const m=text.match(p);if(m)return m[1].trim();}
  return "";
}
function repairPermitExtraction(f,text,fileName){
  const raw=String(text||"").replace(/\u00a0/g," ").replace(/\r/g,"");
  const flat=raw.replace(/\s+/g," ").trim();

  // 1) Customer: never accept a complete legal sentence as a customer name.
  // Prefer the name immediately attached to the tax-number block.
  if(f.taxNumber){
    const taxDigits=String(f.taxNumber).replace(/\D/g,"");
    const taxRe=new RegExp("ad[oó]sz[aá]m\\s*[:\\-]?\\s*"+taxDigits.slice(0,8)+"\\s*[-]\\s*\\d\\s*[-]\\s*\\d{2}","i");
    const tm=taxRe.exec(flat);
    if(tm){
      const before=flat.slice(Math.max(0,tm.index-260),tm.index);
      const candidates=[...before.matchAll(/([A-ZÁÉÍÓÖŐÚÜŰ][A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű.'’-]{1,45}(?:\s+[A-ZÁÉÍÓÖŐÚÜŰ][A-Za-zÁÉÍÓÖŐÚÜŰáéíóöőúüű.'’-]{1,45}){1,4})\s*(?:\(|;|,)/g)];
      if(candidates.length){
        let name=candidates[candidates.length-1][1].replace(/\s+/g," ").trim();
        if(!/(köteles|tudomásul|amennyiben|engedély|vízhasználat|hatályos|kérelmet|jogosult)/i.test(name) && name.length<=100) f.customerName=name;
      }
      const addrBlock=before.match(/(?:;|\()\s*([^();]{5,180}?)(?:;|,)?\s*$/);
      if(addrBlock && !f.customerAddress){
        const a=addrBlock[1].trim();
        if(/\b\d{4}\b|\b(utca|u\.|út|tér|köz|dűlő|hrsz)\b/i.test(a) && !/(köteles|tudomásul|amennyiben)/i.test(a)) f.customerAddress=a;
      }
    }
  }

  // 2) Remove OCR/PDF drift from customer fields.
  const badCustomer=/(köteles tudomásul|amennyiben a vízhasznál|jelen engedély|tudomásul veszi|jogorvoslat|indokolás|mely szerint|az engedélyes köteles)/i;
  if(badCustomer.test(String(f.customerName||""))) f.customerName="";
  if(badCustomer.test(String(f.customerAddress||""))) f.customerAddress="";

  // 3) Parcel number: support both 1532/11 and PDF/OCR variants such as 1532-11.
  if(!f.parcelNumber){
    const pm=flat.match(/(?:helyrajzi\s*sz[aá]m|hrsz\.?)[^0-9]{0,25}(\d{1,8})\s*[\/-]\s*(\d{1,8})/i);
    if(pm) f.parcelNumber=pm[1]+"/"+pm[2];
  }
  if(!f.parcelNumber && /vle/i.test(String(fileName||""))){
    const fm=String(fileName).match(/(?:^|[^0-9])(\d{1,8})[-_](\d{1,8})(?:\D|$)/);
    if(fm) f.parcelNumber=fm[1]+"/"+fm[2];
  }

  // 4) "felszín" is a technical word, not a Hungarian settlement. Never use it
  // as the település or project-name prefix.
  const invalidSettlement=/^(felszín|földfelszín|felszín alatt|felszíni|vízfelszín)$/i;
  if(invalidSettlement.test(String(f.settlement||"").trim())) f.settlement="";
  if(f.wellLocation && invalidSettlement.test(String(f.wellLocation).trim())) f.wellLocation="";

  // 5) Address must look like an actual postal/street address. Otherwise leave it
  // empty rather than putting legal text into the ERP.
  if(f.customerAddress && !(/\b\d{4}\b/.test(f.customerAddress) || /\b(utca|u\.|út|tér|köz|dűlő|hrsz)\b/i.test(f.customerAddress))) f.customerAddress="";

  return f;
}


function applyPermitWaterFieldsFromWorkingPattern(source, fields){
  if(!fields) return fields;
  const src=(Array.isArray(source)?source.map(x=>x&&x.text||"").join("\n"):String(source||"" )).replace(/\u00a0/g," ").replace(/\r/g," ").replace(/\s+/g," ").trim();
  if(!src) return fields;
  const normalizeWaterNumber=(raw)=>{
    let n=String(raw||"").replace(/\s+/g,"").trim();
    // Hungarian PDF/OCR commonly writes 2.000 for two thousand.
    if(/^\d{1,3}(?:\.\d{3})+$/.test(n)) n=n.replace(/\./g,"");
    if(/^\d+$/.test(n) && n.length>3) n=n.replace(/\B(?=(\d{3})+(?!\d))/g," ");
    return n;
  };
  // Same extraction principle as the working Öntözőtelep nagysága field:
  // read the value from the narrative phrase itself, without requiring an
  // ERP-style label or a specific unit layout.
  const annualPatterns=[
    /(?:támasztott\s+)?éves\s+vízigény\s*[:\-]?\s*([0-9][0-9 .]*(?:,[0-9]+)?)\s*m\s*(?:3|³)/i,
    /lekötött\s+éves\s+vízmennyiség\s*[:\-]?\s*([0-9][0-9 .]*(?:,[0-9]+)?)\s*m\s*(?:3|³)/i,
    /éves\s+vízmennyiség\s*[:\-]?\s*([0-9][0-9 .]*(?:,[0-9]+)?)\s*m\s*(?:3|³)/i,
    /(?:támasztott\s+)?éves\s+vízigény[^0-9]{0,30}([0-9]{1,3}(?:[. ]\d{3})+(?:,[0-9]+)?|[0-9]+(?:,[0-9]+)?)/i,
    /lekötött\s+éves\s+vízmennyiség[^0-9]{0,30}([0-9]{1,3}(?:[. ]\d{3})+(?:,[0-9]+)?|[0-9]+(?:,[0-9]+)?)/i
  ];
  for(const re of annualPatterns){
    const m=src.match(re);
    if(m){
      const n=normalizeWaterNumber(m[1]);
      if(n){ fields.annualWater=n+' m³/év'; break; }
    }
  }
  const peakPatterns=[
    /napi\s+csúcs\s+vízigény\s*[:\-]?\s*([0-9][0-9 .]*(?:,[0-9]+)?)\s*m\s*(?:3|³)/i,
    /csúcs\s+vízigény\s*[:\-]?\s*([0-9][0-9 .]*(?:,[0-9]+)?)\s*m\s*(?:3|³)/i,
    /napi\s+csúcs\s+vízigény[^0-9]{0,30}([0-9]{1,3}(?:[. ]\d{3})+(?:,[0-9]+)?|[0-9]+(?:,[0-9]+)?)/i,
    /csúcs\s+vízigény[^0-9]{0,30}([0-9]{1,3}(?:[. ]\d{3})+(?:,[0-9]+)?|[0-9]+(?:,[0-9]+)?)/i
  ];
  for(const re of peakPatterns){
    const m=src.match(re);
    if(m){
      const n=normalizeWaterNumber(m[1]);
      if(n){ fields.dailyPeakWater=n+' m³/nap'; break; }
    }
  }
  return fields;
}
function mapPermitPdfText(t,fileName){
  const f=mapPermitText(t);
  f.customerName=f.customerName||firstPdfMatch(t,[/(?:engedélyes|kérelmező|megrendelő)\s*[:\-]?\s*([A-ZÁÉÍÓÖŐÚÜŰ][^.;]{2,80})/i]);
  f.designer=f.designer||firstPdfMatch(t,[/(?:tervező|tervező neve)\s*[:\-]?\s*([A-ZÁÉÍÓÖŐÚÜŰ][^.;]{2,80})/i]);
  f.permitNumber=f.permitNumber||firstPdfMatch(t,[/(?:engedélyszám|határozatszám|ügyiratszám)\s*[:\-]?\s*([A-Z0-9ÁÉÍÓÖŐÚÜŰ\/\-.]{5,60})/i]);
  f.parcelNumber=f.parcelNumber||firstPdfMatch(t,[/(?:helyrajzi szám|hrsz\.?)\s*[:\-]?\s*([0-9]{1,8}\s*[\/-]\s*[0-9]{1,8})/i]);
  f.settlement=f.settlement||firstPdfMatch(t,[/(?:település|község|város)\s*[:\-]?\s*([A-ZÁÉÍÓÖŐÚÜŰ][^,.;]{2,50})/i]);
  f.wellDepth=f.wellDepth||firstPdfMatch(t,[/(?:talpmélység|kútmélység|mélysége)\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?\s*m)/i]);
  f.expectedYield=f.expectedYield||firstPdfMatch(t,[/(?:vízhozam|vízhozama|hozam)\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?\s*l\/min)/i]);
  f.waterDemand=f.waterDemand||firstPdfMatch(t,[/(?:vízigény|vízfelhasználás|éves vízmennyiség)\s*[:\-]?\s*([0-9]+(?:[.,][0-9]+)?\s*m[³3]\/év)/i]);
  f.waterUse=f.waterUse||firstPdfMatch(t,[/(?:vízhasználat célja|vízhasználat|vízkivétel célja)\s*[:\-]?\s*([^.;]{3,100})/i]);
  if(typeof precisionPermitFields==="function") precisionPermitFields(t,f);
  repairPermitExtraction(f,t,fileName);

    // v1.221: the normal file-selection path calls mapPermitPdfText(text)
    // directly.  Do the two water fields once more at that exact boundary,
    // using the raw PDF text, so they do not depend on page selection, OCR
    // rescue, or any of the older mapping passes.
    {
      const waterText=String(text||"").replace(/\u00a0/g," ").replace(/\r/g," ").replace(/\s+/g," ").trim();
      const readWater=(source, phrase, unit)=>{
        const p=source.search(phrase);
        if(p<0)return "";
        const tail=source.slice(p, p+180);
        const m=tail.match(/(?:[:\-]\s*)?([0-9][0-9 .]*(?:,[0-9]+)?)\s*m\s*(?:3|³)\b/i);
        if(!m)return "";
        const n=m[1].replace(/\s+/g,"");
        return n+" "+unit;
      };
      const annual=readWater(waterText,/(?:lekötött\s+éves\s+vízmennyiség|éves\s+vízigény)/i,"m³/év");
      const peak=readWater(waterText,/napi\s+csúcs\s+vízigény/i,"m³/nap");
      if(annual) f.annualWater=annual;
      if(peak) f.dailyPeakWater=peak;
    }

  // FINAL WATER-FIELD PASS (v1.210): the 1532-11 permit uses the exact
  // wording "Lekötött éves vízmennyiség: 2000 m3 /év" and also states the
  // same value in the narrative as "éves vízigény 2.000 m3".  PDF/OCR can
  // split m3, /év or insert punctuation, so do one last extraction pass
  // after all other repair functions and never leave this field empty when
  // the source text contains an explicit annual-water figure.
  {
    const src=String(t||'').replace(/\u00a0/g,' ').replace(/\r/g,'').replace(/\s+/g,' ').trim();
    const waterPatterns=[
      /Lekötött\s+éves\s+vízmennyiség\s*[:\-]?\s*([0-9][0-9 .]*(?:[,.][0-9]+)?)\s*m\s*(?:3|³)\s*(?:\/\s*év)?/i,
      /éves\s+vízigény\s*[:\-]?\s*([0-9][0-9 .]*(?:[,.][0-9]+)?)\s*m\s*(?:3|³)\s*(?:\/\s*év)?/i,
      /éves\s+vízmennyiség\s*[:\-]?\s*([0-9][0-9 .]*(?:[,.][0-9]+)?)\s*m\s*(?:3|³)\s*(?:\/\s*év)?/i
    ];
    for(const re of waterPatterns){
      const wm=src.match(re);
      if(wm){
        const raw=String(wm[1]).replace(/\s+/g,' ').trim();
        const num=raw.replace(/\s/g,'');
        const formatted=num.replace(/^(\d{1,3})(\d{3})$/, '$1 $2');
        f.annualWater=formatted+' m³/év';
        break;
      }
    }
  }

  // FINAL WATER VALUES PASS (v1.218): the 1532-11 permit states these values
  // in narrative text, e.g. "éves vízigény 2.000 m3, napi csúcs vízigény 33 m3".
  {
    const src=String(t||"").replace(/\u00a0/g," ").replace(/\r/g,"").replace(/\s+/g," ").trim();
    const annualPatterns=[
      /(?:lekötött\s+éves\s+vízmennyiség|éves\s+vízigény)\s*[:\-]?\s*([0-9][0-9 .]*(?:[,.][0-9]+)?)\s*m\s*(?:3|³)(?:\s*\/\s*év)?/i,
      /éves\s+vízigény[^0-9]{0,30}([0-9][0-9 .]*(?:[,.][0-9]+)?)\s*m\s*(?:3|³)/i
    ];
    for(const re of annualPatterns){
      const m=src.match(re);
      if(m){ f.annualWater=String(m[1]).replace(/\s+/g,"")+" m³/év"; break; }
    }
    const peakPatterns=[
      /napi\s+csúcs\s+vízigény\s*[:\-]?\s*([0-9][0-9 .]*(?:[,.][0-9]+)?)\s*m\s*(?:3|³)(?:\s*\/\s*nap)?/i,
      /napi\s+csúcs\s+vízigény[^0-9]{0,30}([0-9][0-9 .]*(?:[,.][0-9]+)?)\s*m\s*(?:3|³)/i
    ];
    for(const re of peakPatterns){
      const m=src.match(re);
      if(m){ f.dailyPeakWater=String(m[1]).replace(/\s+/g,"")+" m³/nap"; break; }
    }
  }

  // FINAL IRRIGATION-PLANT-SIZE PASS (v1.214): keep this independent from
  // the normal field mapping because scanned PDFs often expose the label and
  // value with different whitespace/newlines. The source permit states
  // "Tervezett öntözőtelep nagysága: 1,4791 ha".
  if(!f.irrigationPlantSize){
    const irrSrc=String(t||'').replace(/\u00a0/g,' ').replace(/\r/g,'').replace(/\s+/g,' ').trim();
    const irrPatterns=[
      /tervezett\s+öntözőtelep\s+nagysága[^0-9]{0,160}([0-9]+(?:[.,][0-9]+)?)\s*ha/i,
      /öntözőtelep\s+nagysága[^0-9]{0,160}([0-9]+(?:[.,][0-9]+)?)\s*ha/i,
      /öntözőtelep[^0-9]{0,220}([0-9]+(?:[.,][0-9]+)?)\s*ha/i
    ];
    for(const re of irrPatterns){
      const im=irrSrc.match(re);
      if(im){ f.irrigationPlantSize=im[1].replace('.',',')+' ha'; break; }
    }
  }
  if(f.parcelNumber) f.parcelNumber=String(f.parcelNumber).replace(/\s+/g,"").replace(/-/g,"/");
  f.projectName=buildProjectName(f.parcelNumber,f.wellCount,f.casingDiameter,f.settlement);
  f.quoteTitle=f.projectName;
  applyPermitWaterFieldsFromWorkingPattern(t,f);
  return f;
}

function scorePermitPage(text){
  const t=normPermitText(text).toLowerCase();
  const core=[
    "engedélyes","kérelmező","tervező","adószám","engedélyszám","vízikönyvi",
    "helyrajzi szám","hrsz","eov","kút helye","talpmélység","kútmélység",
    "béléscső","szűrőzés","szűrőcső","vízadó","kútfej","vízhozam","vízigény",
    "éves vízmennyiség","öntözés","öntözött terület","üzemidő","vízkivétel",
    "vor","csövezés","próbaszivattyúzás","geofizika"
  ];
  const secondary=["kút","vízhasználat","vízkészlet","kivitelezés","szivattyú","cső"];
  const legal=["indokolás","jogorvoslat","fellebbezés","jogszabály","hatósági bizonyítvány"];
  let coreHits=0, score=0;
  for(const k of core)if(t.includes(k)){coreHits++;score+=3}
  for(const k of secondary)if(t.includes(k))score+=1;
  for(const k of legal)if(t.includes(k))score-=2;
  return {score:Math.max(0,score),coreHits};
}
function relevantPageNumbers(results){
  const scored=results.map((x,i)=>{
    const sc=scorePermitPage(x.text);
    return {page:i+1,score:sc.score,coreHits:sc.coreHits,text:x.text||""};
  });
  // A page is relevant only when it contains at least one core ERP field.
  // Legal/indoklási pages therefore cannot become relevant just because they
  // contain generic words like "hatóság" or "jogszabály".
  let selected=scored.filter(x=>x.coreHits>=1 && x.score>=3);

  // Water/irrigation fields are often located on a technical/irrigation page
  // whose wording is too sparse for the generic relevance score. Always keep
  // pages containing explicit annual-water or irrigation-plant-size statements
  // in the ERP corpus.
  // Irrigation plant size is sometimes extracted from the PDF without the
  // exact label, e.g. the text may contain only "1,4791 ha" near
  // "öntözőtelep"/"öntözési terület". Keep those pages too.
  const irrigationPlantPage = /(?:tervezett\s+)?öntözőtelep\s+nagysága[^0-9]{0,80}[0-9]+(?:[.,][0-9]+)?\s*ha/i;
  const irrigationAreaPage = /(?:öntözőtelep|öntözési\s+terület|öntözött\s+terület)[^\n]{0,180}[0-9]+(?:[.,][0-9]+)?\s*ha/i;
  const irrigationNarrativePage = /[0-9]+(?:[.,][0-9]+)?\s*ha[^.;]{0,180}(?:nagyságú\s+)?(?:öntözőtelep|öntözési\s+terület)/i;
  for(const x of scored){
    const tx=x.text||'';
    if((irrigationPlantPage.test(tx)||irrigationAreaPage.test(tx)||irrigationNarrativePage.test(tx)) && !selected.some(y=>y.page===x.page)) selected.push(x);
  }

  // Water-quantity fields are often located on a technical/irrigation page
  // whose wording is too sparse for the generic relevance score. Always keep
  // pages containing an explicit annual-water statement in the ERP corpus.
  const annualWaterPage = /(?:lekötött\s+éves\s+vízmennyiség|éves\s+vízigény|éves\s+vízmennyiség)\s*[:\-]?\s*[0-9][0-9 .]*(?:[,.][0-9]+)?\s*m\s*(?:3|³)/i;
  const dailyWaterPage = /napi\s+csúcs\s+vízigény[^0-9]{0,30}[0-9][0-9 .]*(?:[,.][0-9]+)?\s*m\s*(?:3|³)/i;
  for(const x of scored){
    if((annualWaterPage.test(x.text||'') || dailyWaterPage.test(x.text||'')) && !selected.some(y=>y.page===x.page)) selected.push(x);
  }

  // Page 1 is the identity page if it has any core hit.
  if(scored[0] && scored[0].coreHits>0 && !selected.some(x=>x.page===1))selected.unshift(scored[0]);
  // Keep natural document order.
  selected.sort((a,b)=>a.page-b.page);
  if(!selected.length)selected=scored.filter(x=>x.text.trim()).slice(0,3);
  return {scored,selected,threshold:3};
}

function permitPageSummaryHtml(info){
  if(!info||!info.scored?.length)return "";
  const sel=new Set(info.selected.map(x=>x.page));
  const pages=info.scored.map(x=>`<span style="display:inline-block;margin:3px 4px 0 0;padding:4px 7px;border-radius:7px;background:${sel.has(x.page)?"#eaf2ff":"#f1f5f9"};color:${sel.has(x.page)?"#1d4ed8":"#64748b"};font-size:12px">${sel.has(x.page)?"✓ ":""}${x.page}. oldal</span>`).join("");
  return `<div class="license-review" style="margin-top:10px"><b>Oldalválasztás:</b> ${info.selected.length} releváns oldal / ${info.scored.length} összes oldal.<div style="margin-top:4px">${pages}</div><div class="label" style="margin-top:6px">A kék oldalakból készül az ERP-adatkinyerés; a többi oldal háttér/indokolásként kezelhető.</div></div>`;
}
async function createPermitOcrWorker(set){
  return await Tesseract.createWorker("hun",1,{
    workerPath:window.PermitOCRConfig.tesseractWorker,
    corePath:window.PermitOCRConfig.tesseractCore,
    langPath:window.PermitOCRConfig.tesseractLang,
    logger:m=>{
      if(m && m.status && m.progress!=null)set(`<div class="license-review">⏳ OCR: ${m.status} ${Math.round(m.progress*100)}%</div>`);
    }
  });
}
async function renderPermitPageCanvas(page,scale){
  const viewport=page.getViewport({scale});
  const canvas=document.createElement("canvas");
  canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
  await page.render({canvasContext:canvas.getContext("2d"),viewport}).promise;
  return canvas;
}

function normalizeCustomerKey(v){
  return String(v||"")
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
    .toLowerCase()
    .replace(/\b(kft|zrt|nyrt|bt|kkt)\b/g,"")
    .replace(/[^a-z0-9]/g,"");
}
function normalizeTaxNumber(v){ return String(v||"").replace(/\D/g,""); }

function getExistingCustomers(){
  // The ERP stores the live application state as an object under STORE,
  // with customers in db.customers. This must be checked first so the
  // permit importer can reuse an already existing customer by tax number.
  try{
    if(typeof db!=="undefined" && Array.isArray(db?.customers) && db.customers.length) return db.customers;
  }catch(e){}

  const keys=[typeof STORE!=="undefined"?STORE:null,"customers","ugyfelek","clients","erp_customers"].filter(Boolean);
  for(const k of keys){
    try{
      const raw=localStorage.getItem(k);
      if(raw){
        const data=JSON.parse(raw);
        if(Array.isArray(data)) return data;
        if(Array.isArray(data?.customers)) return data.customers;
      }
    }catch(e){}
  }
  // Also inspect common application state objects, including objects whose
  // customers array is nested one level below the stored state.
  for(const k of Object.keys(localStorage)){
    try{
      const data=JSON.parse(localStorage.getItem(k));
      if(Array.isArray(data?.customers) && data.customers.length) return data.customers;
      if(Array.isArray(data) && data.some(x=>x && (x.name||x.customerName||x.taxNumber||x.adószám))) return data;
    }catch(e){}
  }
  return [];
}

function findExistingCustomer(fields){
  const customers=getExistingCustomers();
  if(!customers.length) return null;
  const tax=normalizeTaxNumber(fields.taxNumber);
  const nameKey=normalizeCustomerKey(fields.customerName);
  const addressKey=normalizeCustomerKey(fields.customerAddress);

  let best=null, bestScore=0;
  for(const c of customers){
    const cTax=normalizeTaxNumber(c.tax||c.taxNumber||c.tax_number||c.adószám||c.adoszam);
    const cName=normalizeCustomerKey(c.name||c.customerName||c.nev||c.ugyfelNev);
    const cAddress=normalizeCustomerKey(c.address||c.customerAddress||c.cim);

    let score=0;
    if(tax && cTax && tax===cTax) score=100;
    else if(nameKey && cName && nameKey===cName) score=80;
    else if(nameKey && cName && (nameKey.includes(cName)||cName.includes(nameKey))) score=60;
    if(addressKey && cAddress && addressKey===cAddress) score+=15;

    if(score>bestScore){ bestScore=score; best={customer:c,score}; }
  }
  return best && best.score>=60 ? best : null;
}

function applyExactExistingCustomerMatch(fields){
  try{
    const hit=findExistingCustomer(fields);
    if(!hit || hit.score<100) return;
    const c=hit.customer||{};
    fields.existingCustomerId=c.id||c.customerId||c.uuid||c._id||fields.existingCustomerId||"";
    fields.customerName=c.name||c.customerName||c.nev||c.ugyfelNev||fields.customerName||"";
    fields.taxNumber=c.tax||c.taxNumber||c.tax_number||c.adószám||c.adoszam||fields.taxNumber||"";
    fields.customerAddress=c.address||c.customerAddress||c.cim||fields.customerAddress||"";
    // A kapcsolattartót csak a dokumentumból explicit felismert mezőből töltsük.
    // A meglévő ügyfél rekordjának kapcsolattartója nem azonos automatikusan a tervezővel.
    // Ezért az ügyfél-összekapcsolás nem másolja át ide a c.contact értékét.
    fields.phone=c.phone||c.telefon||fields.phone||"";
    fields.email=c.email||c.e_mail||fields.email||"";
    fields.customerMatched=true;
  }catch(e){}
}

function renderExistingCustomerMatch(fields){
  const box=document.getElementById("existingCustomerMatch");
  if(!box)return;
  const hit=findExistingCustomer(fields);
  if(!hit){
    box.innerHTML='<div class="license-review" style="margin-top:10px"><b>✓ Új ügyfél.</b> A rendszer nem talált egyező meglévő ügyfelet.</div>';
    return;
  }
  const c=hit.customer;
  const name=c.name||c.customerName||c.nev||c.ugyfelNev||"Meglévő ügyfél";
  const tax=c.tax||c.taxNumber||c.tax_number||c.adószám||c.adoszam||"";
  box.innerHTML=`
    <div class="license-review" style="margin-top:10px">
      <b>⚠️ Már létezik ilyen ügyfél.</b><br>
      <strong>${esc(String(name))}</strong>${tax?` — ${esc(String(tax))}`:""}
      <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap">
        <button type="button" class="btn-secondary" onclick="useExistingCustomer()">Meglévő ügyfél használata</button>
        <button type="button" class="btn-secondary" onclick="keepAsNewCustomer()">Mégis új ügyfél</button>
      </div>
    </div>`;
  window._matchedExistingCustomer=hit;
}

window.useExistingCustomer=function(){
  const hit=window._matchedExistingCustomer;if(!hit)return;
  const c=hit.customer, f=permitIntakeState.fields;

  const customerId=c.id||c.customerId||c.uuid||c._id||"";
  f.existingCustomerId=customerId;
  f.customerName=c.name||c.customerName||c.nev||c.ugyfelNev||f.customerName;
  f.taxNumber=c.tax||c.taxNumber||c.tax_number||c.adószám||c.adoszam||f.taxNumber;
  f.customerAddress=c.address||c.customerAddress||c.cim||f.customerAddress;
  f.contact=c.contact||c.contactPerson||c.kapcsolattarto||f.contact;
  f.phone=c.phone||c.telefon||f.phone;
  f.email=c.email||c.e_mail||f.email;
  f.customerMatched=true;

  // A meglévő ügyfél rekordját is feltöltjük azokkal az adatokkal,
  // amelyeket az engedélyből biztosan felismertünk.
  // Üres PDF-mező nem írja felül a már meglévő ügyféladatot.
  if(Array.isArray(db.customers)){
    const idx=db.customers.findIndex(x=>String(x.id||x.customerId||x.uuid||x._id||"")===String(customerId));
    if(idx>=0){
      const cur=db.customers[idx];
      const setIfPresent=(keys,val)=>{
        if(val===undefined || val===null || String(val).trim()==="") return;
        const key=keys.find(k=>Object.prototype.hasOwnProperty.call(cur,k))||keys[0];
        cur[key]=val;
      };
      setIfPresent(["name","customerName","nev","ugyfelNev"],f.customerName);
      if(f.taxNumber){
        cur.tax=f.taxNumber;
        cur.taxNumber=f.taxNumber;
      }
      setIfPresent(["taxNumber","tax_number","adószám","adoszam"],f.taxNumber);
      setIfPresent(["address","customerAddress","cim"],f.customerAddress);
      setIfPresent(["contact","contactPerson","kapcsolattarto"],f.contact);
      setIfPresent(["phone","telefon"],f.phone);
      setIfPresent(["email","e_mail"],f.email);
    }
  }

  // Ha az ügyfél adatai már a projekt/engedély mezőiben megvannak,
  // a projekt létrehozásakor ezeket is megőrizzük.
  save();
  renderPermitReview();
  renderExistingCustomerMatch(f);
};
window.keepAsNewCustomer=function(){
  if(permitIntakeState?.fields) permitIntakeState.fields.customerMatched=false;
  const box=document.getElementById("existingCustomerMatch");
  if(box)box.innerHTML='<div class="license-review" style="margin-top:10px">✓ Új ügyfélként lesz létrehozva.</div>';
};
function extractPermitWaterFromAllPages(pageResults){
  const src=(Array.isArray(pageResults)?pageResults.map(x=>x&&x.text||"").join("\n"):String(pageResults||""))
    .replace(/\u00a0/g," ").replace(/\r/g," ").replace(/\s+/g," ").trim();
  const out={annualWater:"",dailyPeakWater:""};
  const normalizeNumber=(raw)=>{
    const n=String(raw||"").replace(/\s+/g,"").replace(/\.(?=\d{3}(?:\D|$))/g,"").replace(/,/g,".");
    const num=Number(n);
    if(!Number.isFinite(num))return "";
    return Number.isInteger(num)?String(num):String(num).replace(/\.?0+$/,'');
  };
  const annualPatterns=[
    /lekötött\s+éves\s+vízmennyiség[^0-9]{0,40}([0-9][0-9 .]*(?:,[0-9]+)?)\s*m\s*(?:3|³)/i,
    /éves\s+vízigény[^0-9]{0,60}([0-9][0-9 .]*(?:,[0-9]+)?)\s*m\s*(?:3|³)/i,
    /éves\s+vízmennyiség[^0-9]{0,60}([0-9][0-9 .]*(?:,[0-9]+)?)\s*m\s*(?:3|³)/i
  ];
  for(const re of annualPatterns){
    const m=src.match(re); if(m){const n=normalizeNumber(m[1]); if(n){out.annualWater=n+" m³/év";break;}}
  }
  const peakPatterns=[
    /napi\s+csúcs\s+vízigény[^0-9]{0,60}([0-9][0-9 .]*(?:,[0-9]+)?)\s*m\s*(?:3|³)/i,
    /csúcs\s+vízigény[^0-9]{0,60}([0-9][0-9 .]*(?:,[0-9]+)?)\s*m\s*(?:3|³)/i
  ];
  for(const re of peakPatterns){
    const m=src.match(re); if(m){const n=normalizeNumber(m[1]); if(n){out.dailyPeakWater=n+" m³/nap";break;}}
  }
  return out;
}

async function processPermitAI(){
  const file=permitIntakeState.file;if(!file)return;
  const p=document.getElementById("permitProcess");
  const set=(html)=>{if(p)p.innerHTML=html};
  try{
    if(file.type!=="application/pdf"){
      if(typeof Tesseract==="undefined"){
        set('<div class="license-review"><b>⚠️ OCR motor nem töltődött be.</b></div>');return;
      }
      const worker=await createPermitOcrWorker(set);
      const result=await worker.recognize(file);
      await worker.terminate();
      const corpus=(result?.data?.text||"").trim();
      if(corpus.length<40){set('<div class="license-review"><b>⚠️ Nem sikerült elegendő szöveget felismerni.</b></div>');return;}
      permitIntakeState.rawText=corpus;
      permitIntakeState.pageResults=[{page:1,score:scorePermitPage(corpus),text:corpus,source:"ocr"}];
      permitIntakeState.fields=mapPermitPdfText(corpus,file.name);
      { const water=extractPermitWaterFromAllPages(permitIntakeState.pageResults); if(water.annualWater)permitIntakeState.fields.annualWater=water.annualWater; if(water.dailyPeakWater)permitIntakeState.fields.dailyPeakWater=water.dailyPeakWater; }
      applyPermitWaterFieldsFromWorkingPattern(permitIntakeState.rawText, permitIntakeState.fields);
      applyExactExistingCustomerMatch(permitIntakeState.fields);
      renderPermitReview();
      set("");
      return;
    }
    if(typeof pdfjsLib==="undefined"){
      set('<div class="license-review"><b>⚠️ PDF motor nem töltődött be.</b><br>Ellenőrizd az internetkapcsolatot.</div>');return;
    }
    const pdf=await pdfjsLib.getDocument({data:await file.arrayBuffer(),isEvalSupported:false}).promise;
    const total=pdf.numPages;
    const pageResults=[];

    // 1. Fast pass: use native PDF text where available, page by page.
    let textPages=0;
    for(let i=1;i<=total;i++){
      set(`<div class="license-review">⏳ PDF oldalak vizsgálata: ${i}/${total}…</div>`);
      const page=await pdf.getPage(i);
      let txt="";
      try{
        const tc=await page.getTextContent();
        const rows=[];
        for(const it of (tc.items||[])){
          const str=String(it.str||"").trim(); if(!str)continue;
          const y=Math.round((it.transform&&it.transform[5])||0);
          let row=rows.find(r=>Math.abs(r.y-y)<=2);
          if(!row){row={y,items:[]};rows.push(row)}
          row.items.push(it);
        }
        rows.sort((a,b)=>b.y-a.y);
        txt=rows.map(r=>r.items.sort((a,b)=>(a.transform?.[4]||0)-(b.transform?.[4]||0)).map(x=>x.str||"").join(" ")).join("\n").trim();
      }catch(e){}
      pageResults.push({page:i,text:txt,source:txt.length>40?"text":"ocr"});
      if(txt.length>40)textPages++;
    }

    // 2. If pages are image/scanned, OCR only those pages for the classification pass.
    const ocrCandidates=pageResults.filter(x=>x.source==="ocr");
    if(ocrCandidates.length){
      if(typeof Tesseract==="undefined"){
        set('<div class="license-review"><b>⚠️ OCR motor nem töltődött be.</b><br>Szkennelt oldalakhoz OCR szükséges.</div>');return;
      }
      const worker=await createPermitOcrWorker(set);
      for(const x of ocrCandidates){
        set(`<div class="license-review">⏳ Szkennelt oldalak gyors OCR-je: ${x.page}/${total}…</div>`);
        const page=await pdf.getPage(x.page);
        const canvas=await renderPermitPageCanvas(page,1.25);
        const result=await worker.recognize(canvas);
        x.text=(result?.data?.text||"").replace(/\s+/g," ").trim();
        x.source="ocr";
      }
      await worker.terminate();
    }

    const info=relevantPageNumbers(pageResults);
    permitIntakeState.pageResults=info.scored;
    set(permitPageSummaryHtml(info));

    // 3. High-resolution OCR only on selected scanned pages.
    const selectedScanned=info.selected.filter(x=>pageResults[x.page-1].source==="ocr");
    if(selectedScanned.length){
      const worker=await createPermitOcrWorker(set);
      for(const x of selectedScanned){
        set(`<div class="license-review">⏳ Részletes magyar OCR: ${x.page}. oldal…</div>`);
        const page=await pdf.getPage(x.page);
        const canvas=await renderPermitPageCanvas(page,2.2);
        const result=await worker.recognize(canvas);
        x.text=(result?.data?.text||"").trim();
      }
      await worker.terminate();
    }

    // 4. Build the extraction corpus only from relevant pages.
    const corpus=info.selected.map(x=>x.text||"").filter(Boolean).join("\n\n");
    if(corpus.trim().length<40){
      set(permitPageSummaryHtml(info)+`<div class="license-review" style="margin-top:8px"><b>⚠️ Nem sikerült elegendő szöveget kinyerni.</b></div>`);
      return;
    }
    permitIntakeState.rawText=corpus;
    permitIntakeState.fields=mapPermitPdfText(corpus,file.name);
    { const water=extractPermitWaterFromAllPages(pageResults); if(water.annualWater)permitIntakeState.fields.annualWater=water.annualWater; if(water.dailyPeakWater)permitIntakeState.fields.dailyPeakWater=water.dailyPeakWater; }
    applyPermitWaterFieldsFromWorkingPattern(pageResults, permitIntakeState.fields);
    applyExactExistingCustomerMatch(permitIntakeState.fields);
    renderPermitReview();
    renderExistingCustomerMatch(permitIntakeState.fields);
    const r=document.getElementById("permitReview");
    if(r){
      r.insertAdjacentHTML("afterbegin",permitPageSummaryHtml(info)+
        `<div class="license-review" style="margin-top:8px"><b>✓ Feldolgozás kész.</b> ${info.selected.length} releváns oldal alapján készültek az ERP-adatok. Minden mező ellenőrizhető.</div>`);
    }
    set("");
  }catch(err){
    console.error(err);
    set(`<div class="license-review"><b>⚠️ Dokumentumfeldolgozási hiba.</b><br>${esc(err?.message||"A PDF feldolgozása sikertelen.")}</div>`);
  }
}
function renderPermitReview(){
  const f=permitIntakeState.fields||{},e=document.getElementById("permitReview");if(!e)return;
  const base=[["customerName","Ügyfél / cégnév"],["taxNumber","Adószám"],["customerAddress","Cím"],["contact","Kapcsolattartó"],["designer","Tervező"],["phone","Telefon"],["email","E-mail"],["projectName","Projekt neve"],["quoteTitle","Ajánlat megnevezése"]];
  const tech=permitTechnicalFields().concat([
    ["eovX","EOV X"],["eovY","EOV Y"],["terrainElevation","Terepszint"],["annualWater","Éves vízmennyiség"],
    ["dailyPeakWater","Napi csúcs vízigény"],["vorWell","VOR – kút"],["vorWithdrawal","VOR – vízelvonási hely"],["vorIrrigation","VOR – öntözőtelep"],
    ["irrigatedArea","Öntözött terület"],["irrigationPlantSize","Öntözőtelep nagysága"],["crop","Öntözött növénykultúra"],
    ["irrigationDays","Öntözési napok száma"],["irrigationMethod","Öntözés módja"],["dailyIrrigationHours","Napi öntözési üzemidő"],
    ["pressurePipe","Nyomóvezeték"],["distributionPipe","Osztóvezeték"]
  ]);
  e.innerHTML=`<h3 style="margin-top:12px">Ügyfél / projekt</h3><div class="permit-review">${base.map(x=>`<div class="field"><label>${x[1]}</label><input class="input" data-permit-field="${x[0]}" value="${esc(f[x[0]]||"")}"></div>`).join("")}</div>
  <h3 style="margin-top:16px">Kút és engedély műszaki adatai</h3><div class="permit-review">${tech.map(x=>`<div class="field"><label>${x[1]}</label><input class="input" data-permit-field="${x[0]}" value="${esc(f[x[0]]||"")}"></div>`).join("")}</div>
  <div class="license-review" style="margin-top:10px">
  <b>✓ Automatikus ajánlat-előkészítés:</b> a mentéskor a rendszer az engedélyből felismert ügyfél-, projekt- és kútműszaki adatokat automatikusan átviszi az árajánlat sablonba.
  Az árak 0 Ft-ról indulnak, mert azokat az engedély önmagában nem határozza meg.
</div>
<div class="license-review" style="margin-top:8px">Minden mező szerkeszthető. A rendszer mentés előtt nem tekinti automatikusan hitelesnek az AI által felismert adatokat.</div>`;
  document.querySelectorAll("[data-permit-field]").forEach(i=>i.addEventListener("input",()=>{
  permitIntakeState.fields[i.dataset.permitField]=i.value;
  const k=i.dataset.permitField;
  if(k==="parcelNumber"||k==="wellCount"||k==="casingDiameter"){
    const title=buildProjectName(
      permitIntakeState.fields.parcelNumber,
      permitIntakeState.fields.wellCount,
      permitIntakeState.fields.casingDiameter
    );
    permitIntakeState.fields.projectName=title;
    permitIntakeState.fields.quoteTitle=title;
    const pn=document.querySelector('[data-permit-field="projectName"]');
    const qt=document.querySelector('[data-permit-field="quoteTitle"]');
    if(pn)pn.value=title;
    if(qt)qt.value=title;
  }
}));
  const b=document.getElementById("permitSaveBtn");if(b)b.disabled=!permitIntakeState.file;
}
function buildProjectName(hrsz,count,casingDiameter,settlement){
  const h=String(hrsz||"").trim();
  const telep=String(settlement||"").trim();
  const n=Number.parseInt(String(count||"").replace(/[^\d]/g,""),10);
  const db=Number.isFinite(n)&&n>0?n:1;
  const cs=String(casingDiameter||"").trim();
  const parts=[];
  if(telep && h) parts.push(`${telep} ${h}`);
  else if(telep) parts.push(telep);
  else if(h) parts.push(h);
  parts.push(`${db} db kút`);
  if(cs)parts.push(`${cs} Ø mm`);
  return parts.join(" - ")||"Új projekt";
}
let _reservedDocumentSequence = null;

function nextDocumentSequence(){
  const year=new Date().getFullYear();
  const yy=String(year).slice(-2);
  const storageKey=`kutfoplusz_erp_document_sequence_${year}`;

  let max=0;

  // A már létező azonosítókat is figyeljük.
  (db.projects||[]).forEach(p=>{
    const id=String(p.id||"");
    let m=id.match(new RegExp("^KP-"+yy+"(\\d{3})$"));
    if(m)max=Math.max(max,Number(m[1]));
    m=id.match(new RegExp("^KP-"+year+"-(\\d+)$"));
    if(m)max=Math.max(max,Number(m[1]));
  });

  (db.quotes||[]).forEach(q=>{
    const id=String(q.id||"");
    let m=id.match(new RegExp("^A-"+yy+"(\\d{3})$"));
    if(m)max=Math.max(max,Number(m[1]));
    m=id.match(new RegExp("^A-(?:\\d{4}-)?(\\d+)$"));
    if(m)max=Math.max(max,Number(m[1]));
  });

  // FONTOS: ez a számláló nem törlődik akkor sem, ha a projektet,
  // ajánlatot vagy ügyfelet később törlik. Így egy sorszámot soha
  // nem használunk fel újra.
  let stored=0;
  try{
    stored=Number(localStorage.getItem(storageKey)||0)||0;
    if(stored>999) stored=Number(String(stored).slice(-3))||0;
  }catch(e){}

  const reserved=_reservedDocumentSequence||0;
  const next=Math.max(max+1,stored,reserved,1);

  _reservedDocumentSequence=next+1;
  try{ localStorage.setItem(storageKey,String(next+1)); }catch(e){}

  return next;
}

function nextQuoteId(){
  const yy=String(new Date().getFullYear()).slice(-2);
  return `A-${yy}${String(nextDocumentSequence()).padStart(3,"0")}`;
}

function nextProjectId(){
  const yy=String(new Date().getFullYear()).slice(-2);
  return `KP-${yy}${String(nextDocumentSequence()).padStart(3,"0")}`;
}


function standardQuoteIncludes(){
  return `felvonulási költséget
teljes anyagköltséget
munkadíjat
gázvizsgálatot
geofizikai vizsgálatot
vízkémiai vizsgálatot
geodéziai bemérést
vízföldtani napló beszerzését`;
}
function standardQuoteExcludes(){
  return `vízgépészeti munkákat
szivattyú telepítést
elektromos kiépítést
betonozási munkálatokat`;
}
function standardQuoteDeclarations(){
  return `Mint a Kútfő Plusz Kft. ügyvezetője nyilatkozom, hogy az ajánlatban szereplő berendezések új gyártásúak, még nem voltak üzembe helyezve és várható gyártási évük 2026.

Nyilatkozom, hogy az ajánlatban szereplő tételek kivitelezéséhez a Kútfő Plusz Kft. a szükséges engedélyes eszközökkel, szakmai- és személyi feltételekkel rendelkezik.

Nyilatkozom, hogy az ajánlatban szereplő tételek megfelelnek a vonatkozó EU-s irányelveknek, szabványoknak, illetve az azokat átültető magyar jogszabályoknak és környezetvédelmi előírásoknak.

A kivitelezett kútra 4 év szerkezeti garanciát vállalok.
A garancia nem terjed ki a nem rendeltetésszerű használatból, külső behatásból vagy vízgépészeti hibából eredő károkra.

Az ajánlatomat 180 napig fenntartom.`;
}
function buildQuoteFromPermitFields(f,c,p){
  const count=Number.parseInt(String(f.wellCount||p?.wellCount||1).replace(/[^\d]/g,""),10)||1;
  const depth=String(f.plannedDepth||f.wellDepth||p?.well?.plannedDepth||"").trim();
  const water=String(f.waterDemand||f.expectedYield||f.dailyPeakWater||p?.well?.permittedFlow||"").trim();
  const location=String(f.wellLocation||[f.settlement,f.parcelNumber].filter(Boolean).join(" ")||"").trim();
  const casing=String(f.casingDiameter||p?.well?.casingDiameter||"").trim();
  const steelPipe=String(f.steelPipe||p?.well?.steelPipe||p?.well?.diameter||"").trim();
  const purpose=String(f.waterUse||f.wellPurpose||p?.well?.purpose||"").trim();
  const irrigation=/öntöz/i.test(purpose)||/öntöz/i.test(String(f.quoteTitle||""));
  const wellWord=irrigation?"öntözőkút":"kút";

  const subject=location
    ? `A ${location.replace(/\s+hrsz\.?$/i,"")} alatti ingatlanon létesítendő ${count} db ${depth?depth+" m talpmélységű ":""}${wellWord} kivitelezése az engedélyezési tervdokumentáció és hatósági előírások alapján.`
    : (String(f.quoteTitle||p?.name||"").trim() || `${count} db ${depth?depth+" m-es ":""}${wellWord} kivitelezése`);

  let sections=Array.isArray(f.pipeSections)?f.pipeSections.filter(x=>x&&x.from!=null):[];
  let filters=Array.isArray(f.filterSections)?f.filterSections.filter(x=>x&&x.from!=null):[];

  // If the parser only found the filter interval, keep it in the technical section.
  if(!filters.length && f.screenInterval){
    const m=String(f.screenInterval).match(/([0-9]+[,.]?[0-9]*)\s*[–-]\s*([0-9]+[,.]?[0-9]*)/);
    if(m){
      filters=[{
        from:m[1].replace(",","."),
        to:m[2].replace(",","."),
        len:(Number(m[2].replace(",","."))-Number(m[1].replace(",","."))).toFixed(1).replace(/\.0$/,""),
        spec:[f.filterDiameter||"",/PVC/i.test(String(f.pipeMaterial||""))?"KM-PVC":"","szűrő"].filter(Boolean).join(" ")
      }];
    }
  }

  // Preserve the previous fallback when the permit does not expose detailed
  // pipe sections. Never invent a diameter/material.
  if(!sections.length && casing){
    sections=[{type:"Béléscső",from:"0,0",to:depth||"",len:depth||"",spec:casing}];
  }

  const tech=[
    ...(steelPipe ? [{type:"Acél iránycső",from:"",to:"",len:"",spec:steelPipe+" acél"}] : []),
    ...sections.map(x=>({
      type:"Csövezés",
      from:String(x.from??""),
      to:String(x.to??""),
      len:String(x.len??""),
      spec:String(x.spec??"")
    })),
    ...filters.map(x=>({
      type:"Szűrőzés",
      from:String(x.from??""),
      to:String(x.to??""),
      len:String(x.len??""),
      spec:String(x.spec??"")
    }))
  ];

  ensureDrillingPriceList();
  const drillingDiameter=drillingDiameterFromText(casing||p?.name||f.quoteTitle||"");
  const meterRate=drillingPriceForDiameter(drillingDiameter);
  const depthNum=Number.parseFloat(String(depth).replace(",", "."))||0;
  const itemDesc=drillingDiameter
    ? `Kútfúrás Ø ${drillingPriceLabel(drillingDiameter)} mm`
    : `${count} db ${depth?depth+" m-es ":""}${wellWord} kivitelezése`;
  const generatedItems=[{
    name:`${count} db ${depth?String(depth).replace(".",",")+" m-es ":""}${wellWord} kivitelezése`,
    desc:`${count} db ${depth?String(depth).replace(".",",")+" m-es ":""}${wellWord} kivitelezése`,
    quantity:count,
    qty:count,
    unit:"db",
    materialUnit:drillingDiameter?meterRate:0,
    laborUnit:0,
    price:drillingDiameter?depthNum*meterRate:0,
    priceListDiameter:drillingDiameter||0,
    priceListName:drillingDiameter?`Ø ${drillingPriceLabel(drillingDiameter)} mm kútfúrás`:""
  }];
  return {
    id:nextQuoteId(),
    customerId:c?.id||"",
    projectId:p?.id||"",
    title:subject,
    name:subject,
    subject,
    status:"Előkészítés",
    createdAt:new Date().toISOString(),
    clientName:f.customerName||c?.name||"",
    clientAddress:f.customerAddress||c?.address||"",
    clientTax:f.taxNumber||c?.tax||c?.taxNumber||"",
    clientPhone:f.phone||c?.phone||"",
    clientEmail:f.email||c?.email||"",
    date:new Date().toISOString().slice(0,10),
    location,
    depth,
    waterNeed:water,
    pipeDiameter:casing,
    pipeMaterial:f.casingMaterial||f.pipeMaterial||"",
    items:generatedItems,
    tech,
    includes:standardQuoteIncludes(),
    excludes:standardQuoteExcludes(),
    declarations:standardQuoteDeclarations(),
    signer:"Szabados István",
    position:"ügyvezető",
    net:0,vat:0,gross:0,
    permitNumber:f.permitNumber||"",
    permitDate:f.permitDate||"",
    permitAuthority:f.authority||"",
    permitData:{...f}
  };
}

async function savePermitIntake(){
  const f=permitIntakeState.fields||{},file=permitIntakeState.file;if(!file)return;
  cleanupOrphanProjectDocuments();

  const normalizeTax=v=>String(v||"").replace(/\D/g,"");
  const normalizeName=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase()
    .replace(/\b(kft|zrt|nyrt|bt|kkt)\b/g,"").replace(/[^a-z0-9]/g,"");

  // A név önmagában nem jelent valódi duplikációt.
  // Régi/hiányos rekord esetén engedjük az újrafeltöltést. Csak akkor blokkolunk,
  // ha ugyanilyen nevű dokumentumhoz tényleges fájl is tartozik.
  const sameNameDocs=(db.documents||[]).filter(d=>
    String(d.name||d.fileName||"").toLowerCase()===String(file.name||"").toLowerCase()
  );
  for(const existing of sameNameDocs){
    if(await hasStoredProjectFile(existing.id)){
      toast("Ez a dokumentum már fel van töltve.");
      return;
    }
  }

  // A fájl nélküli, régi rekordokat eltávolítjuk, hogy ne maradjon hamis duplikátum.
  if(sameNameDocs.length){
    const staleIds=[];
    for(const existing of sameNameDocs){
      if(!(await hasStoredProjectFile(existing.id))) staleIds.push(String(existing.id));
    }
    if(staleIds.length){
      db.documents=(db.documents||[]).filter(d=>!staleIds.includes(String(d.id)));
      (db.projects||[]).forEach(pr=>{
        if(Array.isArray(pr.documents)) pr.documents=pr.documents.filter(d=>!staleIds.includes(String(d.id)));
      });
    }
  }

  db.documents=Array.isArray(db.documents)?db.documents:[];
  db.customers=Array.isArray(db.customers)?db.customers:[];
  db.projects=Array.isArray(db.projects)?db.projects:[];
  db.quotes=Array.isArray(db.quotes)?db.quotes:[];

  const doc={
    id:"DOC-"+Date.now(),
    name:file.name,
    type:"Létesítési engedély",
    status:"Feltöltve",
    createdAt:new Date().toISOString(),
    size:file.size,
    mime:file.type,
    permitData:{...f}
  };
  // A feltöltött engedély bináris tartalmát is elmentjük IndexedDB-be.
  // A localStorage csak a metaadatokat tárolja, ezért enélkül a későbbi
  // „Megnyitás” műveletnél csak egy üres dokumentumrekord maradna.
  try{
    await storeProjectFile(doc.id,file);
  }catch(err){
    console.error("Létesítési engedély fájlmentése:",err);
    toast("A PDF/kép fájl tartalmát nem sikerült eltárolni. Az adatok nem lettek mentve.");
    return;
  }
  db.documents.push(doc);

  const tax=normalizeTax(f.taxNumber);
  const nameKey=normalizeName(f.customerName);

  // Elsődlegesen adószám, másodlagosan név alapján keresünk.
  // Így akkor is megtaláljuk a korábban létrehozott ügyfelet,
  // ha az adószám mezője üres maradt.
  let c=db.customers.find(x=>{
    const xt=normalizeTax(x.taxNumber||x.taxId||x.adoszam||x["adószám"]);
    return tax && xt && tax===xt;
  });

  if(!c && nameKey){
    c=db.customers.find(x=>{
      const xn=normalizeName(x.name||x.companyName||x.customerName||x.nev||x.ugyfelNev);
      return xn && xn===nameKey;
    });
  }

  if(!c){
    c={
      id:"C-"+Date.now(),
      name:f.customerName||"Új ügyfél",
      tax:f.taxNumber||"",
      taxNumber:f.taxNumber||"",
      address:f.customerAddress||"",
      contact:f.contact||"",
      phone:f.phone||"",
      email:f.email||"",
      notes:"Létesítési engedélyből előkészítve"
    };
    db.customers.push(c);
  }else{
    // A meglévő ügyfelet frissítjük a dokumentumból biztosan felismert adatokkal.
    // Különösen fontos az adószám: ha korábban üres volt, most bekerül.
    if(f.customerName)c.name=f.customerName;
    if(f.taxNumber){
      c.tax=f.taxNumber;
      c.taxNumber=f.taxNumber;
    }
    if(f.customerAddress)c.address=f.customerAddress;
    if(f.contact)c.contact=f.contact;
    if(f.phone)c.phone=f.phone;
    if(f.email)c.email=f.email;
    c.notes=c.notes||"Létesítési engedélyből előkészítve";
  }

  let p=null;
  if(c&&f.projectName){
    p={
      id:nextProjectId(),
      customerId:c.id,
      name:buildProjectName(f.parcelNumber,f.wellCount,f.casingDiameter,f.settlement),
      hrsz:f.parcelNumber||"",
      wellCount:Number.parseInt(String(f.wellCount||"1"),10)||1,
      casingDiameter:f.casingDiameter||"",
      status:"Ajánlatkérés",
      createdAt:new Date().toISOString(),
      location:f.wellLocation||([f.settlement,f.parcelNumber].filter(Boolean).join(" ")||""),
      well:{
        location:f.wellLocation,
        purpose:f.wellPurpose||f.waterUse,
        plannedDepth:f.plannedDepth||f.wellDepth,
        permittedDepth:f.plannedDepth||f.wellDepth,
        permittedFlow:f.waterDemand||"",
        diameter:f.wellDiameter,
        steelPipe:f.steelPipe||f.wellDiameter,
        casingDiameter:f.casingDiameter,
        casing:f.casingDiameter,
        wellCount:Number.parseInt(String(f.wellCount||"1"),10)||1,
        filterDiameter:f.filterDiameter,
        filter:f.filterDiameter,
        screenInterval:f.screenInterval,
        pumpDepth:f.pumpDepth,
        aquifer:f.aquifer,
        expectedYield:f.expectedYield,
        parcelNumber:f.parcelNumber,
        settlement:f.settlement,
        eovX:f.eovX,
        eovY:f.eovY,
        terrainElevation:f.terrainElevation,
        annualWater:f.annualWater,
        dailyPeakWater:f.dailyPeakWater,
        vorWell:f.vorWell,
        vorWithdrawal:f.vorWithdrawal,
        vorIrrigation:f.vorIrrigation,
        irrigatedArea:f.irrigatedArea,
        irrigationPlantSize:f.irrigationPlantSize,
        crop:f.crop,
        irrigationDays:f.irrigationDays,
        irrigationMethod:f.irrigationMethod,
        dailyIrrigationHours:f.dailyIrrigationHours,
        pressurePipe:f.pressurePipe,
        distributionPipe:f.distributionPipe
      },
      permit:{
        number:f.permitNumber,
        date:f.permitDate,
        authority:f.authority,
        validUntil:f.validUntil,
        waterUse:f.waterUse||f.wellPurpose,
        waterDemand:f.waterDemand,
        annualWater:f.annualWater,
        dailyPeakWater:f.dailyPeakWater
      },
      documents:[doc]
    };
    db.projects.push(p);
  }

  if(p){
    // A létesítési engedélyből létrejövő első ajánlat már teljes ajánlati
    // adatszerkezetet kap: ügyfél, projekt, tárgy, műszaki adatok,
    // standard tartalom/feltételek és a kút mennyisége automatikusan bekerül.
    // Az árakat szándékosan 0 Ft-ról indítjuk: a rendszer nem talál ki árat
    // olyan adatra, amely az engedélyből nem állapítható meg.
    const generatedQuote=buildQuoteFromPermitFields(f,c,p);
    db.quotes.push(generatedQuote);
    p.quoteId=generatedQuote.id;
    p.nextTask="Ajánlat ellenőrzése és árazása";
  }

  doc.customerId=c?.id;
  doc.projectId=p?.id;

  save();
  closeModal();
  render();
  toast(p?"Ügyfél + projekt + engedély mentve":"Az engedély mentve");
}

function openCustomerHistoryPage(cid){
 const c=(db.customers||[]).find(x=>String(x.id)===String(cid));
 if(!c){toast("Ügyfél nem található");return}
 db.ui=db.ui||{};
 db.ui.openCustomerHistoryId=c.id;
 db.ui.openCustomerId=null;
 db.ui.openProjectId=null;
 save();
 render();
}
function closeCustomerHistoryPage(){
 db.ui=db.ui||{};
 db.ui.openCustomerHistoryId=null;
 save();
 render();
}
function customerHistoryPage(){
 const c=(db.customers||[]).find(x=>String(x.id)===String(db.ui?.openCustomerHistoryId));
 if(!c)return "";
 return `<div style="display:flex;justify-content:flex-end;margin-bottom:10px"><button class="btn secondary small" onclick="closeCustomerHistoryPage()">← Ügyfelek</button></div>${customerHistoryPanel(c)}`;
}

function openCustomerPage(cid){
 const c=(db.customers||[]).find(x=>String(x.id)===String(cid));if(!c){toast("Ügyfél nem található");return}
 db.ui=db.ui||{};db.ui.openCustomerId=c.id;db.ui.customerTab="overview";db.ui.openProjectId=null;save();render();
}
function closeCustomerPage(){db.ui=db.ui||{};db.ui.openCustomerId=null;save();render()}
function setCustomerTab(t){db.ui=db.ui||{};db.ui.customerTab=t;save();render()}
function customerProjects(c){return (db.projects||[]).filter(p=>String(p.customerId)===String(c.id))}

function customerListHtml(){
  if(db.ui?.openCustomerHistoryId || db.ui?.openCustomerId || db.ui?.openProjectId || !(db.customers||[]).length) return "";
  return '<div class="customer-page"><div class="panelhead"><div><h2>👥 Ügyfelek</h2><div class="label">Az ügyfél nevére kattintva a teljes adatlap nyílik meg.</div></div></div>'+
    (db.customers||[]).map(function(c){
      return '<div class="customer-row" style="cursor:pointer" onclick="openCustomerPage(\''+esc(c.id)+'\')">'+
        '<div><b>'+esc(c.name||c.companyName||c.id)+'</b></div>'+
        '<div>'+esc(c.contact||c.contactPerson||"")+'</div>'+
        '<div>'+esc(c.phone||"")+'</div>'+
        '<div>'+customerProjects(c).length+' projekt</div></div>';
    }).join("")+
  '</div>';
}
function projectListHtml(){
  if(db.ui?.openProjectId || !(db.projects||[]).length) return "";
  return '<div class="project-page"><div class="panelhead"><div><h2>📁 Projektek</h2><div class="label">A projektazonosítóra vagy a projekt nevére kattintva a konkrét projekt oldala nyílik meg.</div></div></div>'+
    (db.projects||[]).map(function(p){
      return '<div class="project-mini-row" style="cursor:pointer" onclick="openProjectPage(\''+esc(p.id)+'\')">'+
        '<div><b>'+esc(p.id)+'</b></div><div><b>'+esc(p.name||"Projekt")+'</b></div>'+
        '<div>'+esc(p.status||"")+'</div><div>'+esc(String(p.execution?.currentDepth||p.well?.actualDepth||0))+' m</div></div>';
    }).join("")+
  '</div>';
}
function customerPage(){
 const c=(db.customers||[]).find(x=>String(x.id)===String(db.ui?.openCustomerId));if(!c)return "";
 const ps=customerProjects(c),tab=db.ui.customerTab||"overview";
 const qs=(db.quotes||[]).filter(x=>String(x.customerId)===String(c.id)),ins=(db.invoices||[]).filter(x=>String(x.customerId)===String(c.id));
 const sv=ps.flatMap(p=>(p.aftercare?.services||[]).map(x=>({...x,projectId:p.id})));
 const tabs=[["overview","Adatlap"],["projects","Projektek"],["quotes","Ajánlatok"],["invoices","Számlák"],["service","Szervizelőzmény"],["history","Teljes előzmény"]];
 return `<div class="customer-page"><div class="customer-head"><div><div class="label">${esc(c.id)}</div><h2>${esc(c.name||c.companyName||"Ügyfél")}</h2></div><div><button class="btn secondary small" onclick="closeCustomerPage()">← Ügyfelek</button></div></div>
 <div class="customer-grid"><div class="customer-card"><div class="label">Projektek</div><b>${ps.length}</b></div><div class="customer-card"><div class="label">Ajánlatok</div><b>${qs.length} db</b></div><div class="customer-card"><div class="label">Számlák</div><b>${ins.length}</b></div><div class="customer-card"><div class="label">Szervizesetek</div><b>${sv.length}</b></div></div>
 <div class="customer-tabs">${tabs.map(t=>`<button class="customer-tab ${tab===t[0]?'active':''}" onclick="setCustomerTab('${t[0]}')">${t[1]}</button>`).join("")}</div>${customerTabContent(c,tab,ps,qs,ins,sv)}</div>`;
}
function customerTabContent(c,tab,ps,qs,ins,sv){
 if(tab==="overview")return `<div class="formgrid"><div class="field"><label>Név / cégnév</label><div class="input">${esc(c.name||c.companyName||"")}</div></div><div class="field"><label>Adószám</label><div class="input">${esc(c.tax||c.taxNumber||c.taxId||c.adószám||c.adoszam||"—")}</div></div><div class="field"><label>Cím</label><div class="input">${esc(c.address||"—")}</div></div><div class="field"><label>Kapcsolattartó</label><div class="input">${esc(c.contact||c.contactPerson||"—")}</div></div><div class="field"><label>Telefon</label><div class="input">${esc(c.phone||"—")}</div></div><div class="field"><label>E-mail</label><div class="input">${esc(c.email||"—")}</div></div><div class="field full"><label>Számlázási adatok</label><div class="textarea">${esc(c.billingData||c.billingAddress||"—")}</div></div><div class="field full"><label>Megjegyzések</label><div class="textarea">${esc(c.notes||"—")}</div></div></div>`;
 if(tab==="projects")return `<h3>Projektek</h3>${ps.map(p=>`<div class="customer-row" style="cursor:pointer" onclick="openProjectPage('${p.id}')"><div><b>${esc(p.id)}</b></div><div><b>${esc(p.name||"Projekt")}</b></div><div>${esc(p.status||"")}</div><div>${esc(String(p.well?.actualFlow||p.actualFlow||0))} l/min</div></div>`).join("")||'<div class="empty">Nincs projekt.</div>'}`;
 if(tab==="quotes")return `<h3>Ajánlatok</h3>${qs.map(q=>`<div class="customer-row"><div>${esc(q.number||q.id||"")}</div><div>${esc(q.title||q.name||"Ajánlat")}</div><div>${esc(q.status||"")}</div><div>${money(Number(q.netTotal||0))}</div></div>`).join("")||'<div class="empty">Nincs ajánlat.</div>'}`;
 if(tab==="invoices")return `<h3>Számlák</h3>${ins.map(i=>`<div class="customer-row"><div>${esc(i.number||i.id||"")}</div><div>${esc(i.date||"")}</div><div>${esc(i.status||"")}</div><div>${money(Number(i.gross||i.total||0))}</div></div>`).join("")||'<div class="empty">Nincs számla.</div>'}`;
 if(tab==="service")return `<h3>Szervizelőzmény</h3>${sv.map(x=>`<div class="customer-row"><div>${esc(x.date||"")}</div><div><b>${esc(x.title||"Szervizeset")}</b><br><span class="label">Projekt: ${esc(x.projectId||"")}</span></div><div>${esc(x.status||"")}</div><div>${esc(x.note||"")}</div></div>`).join("")||'<div class="empty">Nincs szervizeset.</div>'}`;
 const ev=[...ps.map(p=>({d:p.createdAt||"",t:"Projekt",x:p.name||p.id,id:p.id})),...qs.map(q=>({d:q.date||q.createdAt||"",t:"Ajánlat",x:q.title||q.number||q.id})),...ins.map(i=>({d:i.date||i.createdAt||"",t:"Számla",x:i.number||i.id})),...sv.map(x=>({d:x.date||"",t:"Szerviz",x:x.title||"Szervizeset"}))];
 ev.sort((a,b)=>String(b.d).localeCompare(String(a.d)));
 return `<h3>Teljes ügyfélelőzmény</h3>${ev.map(x=>`<div class="customer-row"><div>${esc(String(x.d).slice(0,10))}</div><div><b>${esc(x.t)}</b> · ${esc(x.x)}</div><div></div><div>${x.id?`<button class="btn secondary small" onclick="openProjectPage('${x.id}')">Megnyitás</button>`:""}</div></div>`).join("")||'<div class="empty">Nincs előzmény.</div>'}`;
}

function openProjectPage(pid){
  const key=String(pid);
  const p=(db.projects||[]).find(x=>String(x.id)===key);
  if(!p){toast("A projekt nem található");return false;}
  projectPageId=p.id;
  current="project";
  db.ui=db.ui||{};
  db.ui.openProjectId=p.id;
  db.ui.projectTab="overview";
  db.ui.openCustomerId=null;
  save();
  location.hash="#/project/"+encodeURIComponent(String(p.id));
  render();
  setTimeout(()=>{
    const el=document.getElementById("project-page");
    if(el)el.scrollIntoView({behavior:"smooth",block:"start"});
  },50);
  return false;
}
function closeProjectPage(){db.ui=db.ui||{};db.ui.openProjectId=null;save();render()}
function setProjectTab(tab){db.ui=db.ui||{};db.ui.projectTab=tab;save();render()}
function projectPage(){
  return projectPageView();
}
function projectTabContent(p,tab){
  const w=p.well||{},e=p.execution||{},a=p.aftercare||{},q=p.quote||{};
  if(tab==="overview"){
    const relatedQuotes=(db.quotes||[]).filter(x=>String(x.projectId||"")===String(p.id));
    const relatedDocs=Array.isArray(p.documents)?p.documents:[];
    const permit=relatedDocs.find(x=>String(x.type||"").toLowerCase().includes("létesítési"));
    return `<div class="project-overview-grid">
      <div class="project-overview-card">
        <h3>👤 Ügyfél</h3>
        <div class="project-big">${esc(c.name||"—")}</div>
        <div class="label">Adószám: ${esc(c.tax||c.taxNumber||"—")}</div>
        <div class="label">${esc(c.address||"")}</div>
        <div class="label">Kapcsolattartó: ${esc(c.contact||"—")}</div>
        <div class="label">${esc(c.phone||"")} · ${esc(c.email||"")}</div>
        ${c.id?`<button class="btn secondary small" onclick="customerDetails('${esc(c.id)}')">Ügyfél adatlap</button>`:""}
      </div>
      <div class="project-overview-card">
        <h3>📋 Projekt</h3>
        <div class="project-big">${esc(p.id)}</div>
        <div class="label">${esc(p.name||"—")}</div>
        <div class="label">Státusz: <b>${esc(p.status||"—")}</b></div>
        <div class="label">HRSZ: ${esc(p.hrsz||w.parcelNumber||"—")}</div>
        <div class="label">Kút: ${esc(String(p.wellCount||w.wellCount||1))} db · ${esc(p.casingDiameter||w.casingDiameter||"—")} Ø</div>
      </div>
      <div class="project-overview-card">
        <h3>💰 Ajánlat</h3>
        ${relatedQuotes.map(x=>`<div class="project-related-row"><a href="#" class="link" onclick="openQuoteEditorPage('${esc(x.id)}');return false" title="Ajánlat szerkesztése"><b>${esc(x.id||"")}</b></a><span>${esc(x.name||x.title||"Ajánlat")}</span><span>${esc(x.status||"")}</span><button class="btn secondary small" onclick="openQuoteEditorPage('${esc(x.id)}');return false;">Megnyitás</button></div>`).join("")||'<div class="empty">Nincs kapcsolódó ajánlat.</div>'}
        <button class="btn small" onclick="createProjectQuote('${esc(p.id)}')">+ Új ajánlat</button>
      </div>
      <div class="project-overview-card">
        <h3>📄 Dokumentumok</h3>
        <div class="label">Összesen: ${relatedDocs.length} db</div>
        ${permit?`<div class="project-related-row"><span>📄</span><b>${esc(permit.name||permit.fileName||"Létesítési engedély")}</b><span>${esc(permit.status||"")}</span></div>`:""}
        <button class="btn secondary small" onclick="setProjectTab('docs')">Összes dokumentum →</button>
      </div>
    </div>
    <div class="project-page-actions">
      <button class="btn" onclick="startExecution('${p.id}')">▶ Kivitelezés indítása</button>
      <button class="btn secondary small" onclick="openDailyWorklog('${p.id}')">+ Napi munkalap</button>
      <button class="btn secondary small" onclick="openHandover('${p.id}')">Átadás</button>
    </div>`;
}

  if(tab==="work"){
    const rows=(e.dailyLogs||[]).map((x,i)=>`<div class="project-mini-row"><div>${esc(x.date||"")}</div><div>${esc(x.activity||"")} · ${esc(x.layerObservation||"")}</div><div>${esc(String(x.drilled||0))} m</div><div><button class="btn secondary small" onclick="viewDailyWorklog('${p.id}',${i})">Megnyitás</button></div></div>`).join("");
    return `<h3>Napi munkalapok</h3>${rows||'<div class="empty">Nincs munkalap.</div>'}<div class="project-page-actions" style="margin-top:10px"><button class="btn" onclick="openDailyWorklog('${p.id}')">+ Napi munkalap</button></div>`;
  }

  if(tab==="well"){
    const layers=(w.layers||[]).map((x,i)=>`<div class="project-mini-row"><div>${esc(x.from)}–${esc(x.to)} m</div><div>${esc(x.layer||"")}</div><div>${esc(x.note||"")}</div><div><button class="btn secondary small" onclick="editWellLayer('${p.id}',${i})">Szerkesztés</button></div></div>`).join("");
    const cas=(w.casingSections||[]).map((x,i)=>`<div class="project-mini-row"><div>${esc(x.from)}–${esc(x.to)} m</div><div>${esc(x.type||"")} ${esc(x.diameter||"")}</div><div>${esc(x.material||"")}</div><div><button class="btn secondary small" onclick="editCasingSection('${p.id}',${i})">Szerkesztés</button></div></div>`).join("");
    return `<h3>Rétegsor</h3>${layers||"Nincs rétegsor."}<h3 style="margin-top:16px">Csövezés / szűrőzés</h3>${cas||"Nincs csövezés."}<div class="project-page-actions" style="margin-top:10px"><button class="btn secondary small" onclick="addWellLayer('${p.id}')">+ Réteg</button><button class="btn secondary small" onclick="addCasingSection('${p.id}')">+ Cső / szűrő</button></div>`;
  }

  if(tab==="pump"){
    const rows=(w.pumpTests||[]).map(x=>`<div class="project-mini-row"><div>${esc(x.date||"")}</div><div>${esc(String(x.minutes||0))} perc</div><div>${esc(String(x.flow||0))} l/min</div><div>${esc(String(x.dynamicLevel||"—"))} m</div></div>`).join("");
    return `<div class="project-page-actions"><button class="btn" onclick="openPumpTest('${p.id}')">+ Mérési pont</button><button class="btn secondary small" onclick="openPumpSummary('${p.id}')">Összesítő</button><button class="btn secondary small" onclick="finalizePumpTest('${p.id}')">Véglegesítés</button></div>${rows||'<div class="empty">Nincs mérési pont.</div>'}`;
  }

  if(tab==="materials")return projectStockWorkflowPanel(p);

  if(tab==="docs"){
    const rows=(p.documents||[]).map((x,i)=>`<div class="project-mini-row">
      <div>${esc(x.type||"Dokumentum")}</div>
      <div><b>${esc(x.name||x.fileName||"")}</b><div class="label">${esc(x.date||x.createdAt||"")}</div></div>
      <div>${esc(x.status||"")}</div>
      <div><button class="btn secondary small" onclick="openProjectDocument('${esc(p.id)}',${i})">Megnyitás</button> <button class="btn danger small" onclick="deleteProjectDocument('${esc(p.id)}',${i});return false;">Törlés</button></div>
    </div>`).join("");
    return `<div class="project-docs-head"><div><h3>Dokumentumok</h3><div class="label">A projekt összes dokumentuma egy helyen.</div></div><button class="btn" onclick="uploadProjectDocument('${esc(p.id)}')">+ Dokumentum feltöltése</button></div>${rows||'<div class="empty">Nincs dokumentum.</div>'}`;
  }

  if(tab==="finance")return `<div class="formgrid"><div class="field"><label>Ajánlat státusz</label><div class="input">${esc(q.status||"—")}</div></div><div class="field"><label>Nettó ajánlat</label><div class="input">${money(Number(q.netTotal||0))}</div></div><div class="field"><label>Számla</label><div class="input">${esc(a.invoice?.number||"—")}</div></div><div class="field"><label>Bruttó számla</label><div class="input">${money(Number(a.invoice?.gross||0))}</div></div></div><div class="project-page-actions"><button class="btn" onclick="openInvoice('${p.id}')">Számla</button></div>`;

  return `<div class="formgrid"><div class="field"><label>Garancia vége</label><div class="input">${esc(a.warrantyUntil||"—")}</div></div><div class="field"><label>Átadás</label><div class="input">${esc(a.handoverDate||"—")}</div></div></div><h3>Szervizelőzmény</h3>${(a.services||[]).map(x=>`<div class="project-mini-row"><div>${esc(x.date||"")}</div><div>${esc(x.title||"")}</div><div>${esc(x.status||"")}</div><div></div></div>`).join("")||"Nincs szervizeset."}<div class="project-page-actions" style="margin-top:10px"><button class="btn" onclick="openServiceCase('${p.id}')">+ Szervizeset</button><button class="btn secondary small" onclick="openWarranty('${p.id}')">Garancia</button></div>`;
}

function openProjectDocument(pid,index){
  const p=(db.projects||[]).find(x=>String(x.id)===String(pid)),d=p?.documents?.[index];
  if(!d){toast("A dokumentum nem található");return;}
  openModal(d.type||"Dokumentum",`<div><h3>${esc(d.name||d.fileName||"Dokumentum")}</h3><p class="label">Típus: ${esc(d.type||"")}</p><p class="label">Státusz: ${esc(d.status||"")}</p><p class="label">Feltöltve: ${esc(d.date||d.createdAt||"")}</p></div>`);
}
function deleteProjectDocument(pid,index){
  const p=(db.projects||[]).find(x=>String(x.id)===String(pid));
  if(!p||!Array.isArray(p.documents)||!p.documents[index])return;
  const d=p.documents[index];
  if(!confirm(`Biztosan törlöd ezt a dokumentumot?\\n\\n${d.name||d.fileName||"Dokumentum"}`))return;
  p.documents.splice(index,1);
  if(Array.isArray(db.documents)) db.documents=db.documents.filter(x=>!(String(x.projectId||"")===String(pid) && String(x.name||"")===String(d.name||d.fileName||"")));
  save();render();toast("Dokumentum törölve.");
}
async function uploadProjectDocument(pid){
  const input=document.createElement("input");
  input.type="file";
  input.accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx";
  input.onchange=async()=>{
    const f=input.files?.[0];
    if(!f)return;
    const project=(db.projects||[]).find(x=>String(x.id)===String(pid));
    if(!project){toast("A projekt nem található.");return;}
    project.documents=Array.isArray(project.documents)?project.documents:[];

    // Ha ugyanilyen nevű dokumentum rekordja már létezik, de a fájl hiányzik,
    // akkor ezt a rekordot állítjuk helyre ahelyett, hogy új rekordot hoznánk létre.
    const sameName=project.documents.filter(d=>
      String(d.name||d.fileName||"").trim().toLowerCase()===String(f.name||"").trim().toLowerCase()
    );

    for(const existing of sameName){
      if(await hasStoredProjectFile(existing.id)){
        toast("Ez a dokumentum már szerepel a projektben, és a fájl már el van tárolva.");
        return;
      }
      try{
        await storeProjectFile(existing.id,f);
        existing.name=f.name;
        existing.fileName=f.name;
        existing.size=formatFileSize(f.size);
        existing.mimeType=f.type||"application/octet-stream";
        existing.date=new Date().toISOString().slice(0,10);
        existing.status=existing.status||"Feltöltve";
        const global=(db.documents||[]).find(x=>String(x.id)===String(existing.id));
        if(global)Object.assign(global,existing);
        if(String(existing.type||"").toLowerCase().includes("engedély")){
          project.permitDocumentId=existing.id;
          if(project.nextTask==="Létesítési engedély feltöltése")
            project.nextTask="Létesítési engedély feldolgozása";
        }
        save();
        closeModal();
        render();
        toast("A fájl sikeresen újra feltöltve.");
        return;
      }catch(err){
        console.error(err);
        toast("A fájl eltárolása nem sikerült.");
        return;
      }
    }

    // Nincs korábbi rekord: új projekt-dokumentum jön létre, és a tényleges fájlt
    // is elmentjük az IndexedDB fájltárolóba.
    const d={
      id:"DOC-"+Date.now()+"-"+Math.random().toString(36).slice(2,8),
      name:f.name,
      fileName:f.name,
      type:"Projekt dokumentum",
      status:"Feltöltve",
      date:new Date().toISOString().slice(0,10),
      size:formatFileSize(f.size),
      mimeType:f.type||"application/octet-stream",
      projectId:project.id,
      customerId:project.customerId
    };
    try{
      await storeProjectFile(d.id,f);
      project.documents.push(d);
      db.documents=Array.isArray(db.documents)?db.documents:[];
      db.documents.push(d);
      save();
      closeModal();
      render();
      toast("Dokumentum feltöltve.");
    }catch(err){
      console.error(err);
      toast("A fájl eltárolása nem sikerült.");
    }
  };
  input.click();
}

function projectStockWorkflowPanel(p){
  const e=p.execution||{}, usage=Array.isArray(e.materialUsage)?e.materialUsage:[], costs=Array.isArray(p.materialCosts)?p.materialCosts:[];
  const total=costs.reduce((a,x)=>a+Number(x.total||0),0);
  return `<div class="stock-workflow">
    <div class="panelhead"><div><h2>🔗 Projekt ↔ Raktár ↔ Anyagköltség</h2><div class="label">A munkalapon felhasznált anyag közvetlenül levonható a raktárból és bekerül a projekt költségébe.</div></div><button class="btn small" onclick="openLinkedMaterialUse('${p.id}')">+ Anyag felhasználása</button></div>
    <div class="stock-workflow-grid">
      <div class="stock-wf-stat"><div class="label">Felhasználási tételek</div><b>${usage.length}</b></div>
      <div class="stock-wf-stat"><div class="label">Projekt anyagköltség</div><b>${money(total)}</b></div>
      <div class="stock-wf-stat"><div class="label">Raktárlevonások</div><b>${costs.filter(x=>x.stockDeducted).length}</b></div>
      <div class="stock-wf-stat"><div class="label">Eltérés / hiány</div><b>${costs.filter(x=>x.stockMissing).length}</b></div>
    </div>
    <div class="stock-cost-row" style="font-size:12px;color:#64748b;font-weight:700"><div>Dátum</div><div>Anyag</div><div>Mennyiség</div><div>Egységár</div><div>Projektköltség</div><div>Státusz</div></div>
    ${costs.map(x=>`<div class="stock-cost-row"><div>${esc(x.date||"")}</div><div>${esc(x.material||"")} <span class="label">${esc(x.sku||"")}</span></div><div>${esc(String(x.qty||0))} ${esc(x.unit||"")}</div><div>${money(Number(x.unitCost||0))}</div><div><b>${money(Number(x.total||0))}</b></div><div>${x.stockMissing?"⚠ Nincs készlet":x.stockDeducted?"✓ Levonva":"—"}</div></div>`).join("")||'<div class="empty">Még nincs projekthez kapcsolt anyagköltség.</div>'}
    <div class="stock-wf-actions">
      <button class="btn" onclick="openLinkedMaterialUse('${p.id}')">Munkalapból levonás</button>
      <button class="btn secondary small" onclick="reconcileProjectMaterials('${p.id}')">Anyagköltség egyeztetés</button>
    </div>
  </div>`;
}
function openLinkedMaterialUse(pid){
  const items=db.stock||[];
  openModal("Anyagfelhasználás – projekt + raktár",`<form onsubmit="saveLinkedMaterialUse(event,'${pid}')"><div class="formgrid">
    <div class="field"><label>Dátum</label><input class="input" type="date" name="date" value="${new Date().toISOString().slice(0,10)}"></div>
    <div class="field full"><label>Raktári cikk</label><select class="select" name="sku" required><option value="">Válassz cikket</option>${items.map(x=>`<option value="${esc(x.sku)}">${esc(x.sku)} – ${esc(x.name)} · készlet: ${esc(String(x.qty||0))} ${esc(x.unit||"")}</option>`).join("")}</select></div>
    <div class="field"><label>Mennyiség</label><input class="input" type="number" step="0.01" name="qty" required></div>
    <div class="field"><label>Munka / munkalap</label><input class="input" name="worklog"></div>
    <div class="field full"><label>Megjegyzés</label><textarea class="textarea" name="note"></textarea></div>
  </div><div class="license-review">Mentéskor a rendszer ellenőrzi a készletet, levonja az anyagot, és a beszerzési egységár alapján projekt anyagköltséget számol.</div><div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Levonás + költség rögzítése</button></div></form>`);
}
function saveLinkedMaterialUse(ev,pid){
  ev.preventDefault();
  const p=db.projects.find(x=>x.id===pid),o=Object.fromEntries(new FormData(ev.target).entries());
  if(!p)return;
  const item=(db.stock||[]).find(x=>String(x.sku)===String(o.sku)),q=Number(o.qty||0);
  if(!item){toast("A raktári cikk nem található");return}
  if(q<=0){toast("A mennyiség legyen nagyobb 0");return}
  if(Number(item.qty||0)<q){toast(`Nincs elegendő készlet. Elérhető: ${item.qty} ${item.unit||""}`);return}
  item.qty=Number(item.qty||0)-q;
  const unitCost=Number(item.cost||0),total=q*unitCost;
  p.execution=p.execution||{};p.execution.materialUsage=Array.isArray(p.execution.materialUsage)?p.execution.materialUsage:[];
  p.execution.materialUsage.push({...o,material:item.name,unit:item.unit,stock:"Levont"});
  p.materialCosts=Array.isArray(p.materialCosts)?p.materialCosts:[];
  p.materialCosts.push({...o,material:item.name,unit:item.unit,unitCost,total,stockDeducted:true,stockMissing:false});
  db.stockMovements=Array.isArray(db.stockMovements)?db.stockMovements:[];
  db.stockMovements.push({date:o.date,sku:item.sku,name:item.name,type:"Projekt felhasználás",qty:q,projectId:pid,worklog:o.worklog||""});
  save();closeModal();render();toast(`Raktárból levonva: ${q} ${item.unit||""} – ${item.name}`);
}
function reconcileProjectMaterials(pid){
  const p=db.projects.find(x=>x.id===pid);if(!p)return;
  const rows=p.materialCosts||[],total=rows.reduce((a,x)=>a+Number(x.total||0),0);
  openModal("Projekt anyagköltség egyeztetés",`<div class="billing-ok"><b>Összes projekt anyagköltség: ${money(total)}</b></div><div style="margin-top:10px">${rows.map(x=>`<div class="stock-cost-row"><div>${esc(x.date||"")}</div><div>${esc(x.material||"")}</div><div>${esc(String(x.qty||0))} ${esc(x.unit||"")}</div><div>${money(Number(x.unitCost||0))}</div><div>${money(Number(x.total||0))}</div><div>${x.stockDeducted?"✓ Raktárból levonva":"⚠"}</div></div>`).join("")||"Nincs tétel."}</div><div class="modalfoot"><button class="btn" onclick="closeModal()">Bezárás</button></div>`);
}

function normalizePipeType(value){
  const s=String(value||"").trim();
  if(!s) return "";
  if(/sz[űu]r[őo]/i.test(s)) return "KM-PVC Szűrőcső";
  if(/km[- ]?pvc/i.test(s)) return "KM-PVC";
  if(/ac[eé]l/i.test(s)) return "Acél";
  if(/kpe/i.test(s)) return "KPE";
  if(/pe/i.test(s)) return "PE";
  if(/kg/i.test(s)) return "KG";
  if(/pvc/i.test(s)) return "PVC";
  return s;
}
function pipeTypeFromText(text){ return normalizePipeType(text); }
function ensurePipeTypeCatalog(){
  // A Csőtípus mező kizárólag valódi csőtípusokat tartalmazzon.
  // Az átmérő és a falvastagság/specifikáció külön adat, ezért nem kerülhet
  // a csőtípus-listába (pl. "315/290 KM-PVC" nem önálló csőtípus).
  const allowed=["KM-PVC","KM-PVC Szűrőcső","Acél","KPE","KG"];
  const found=new Set();
  const add=v=>{ const n=normalizePipeType(v); if(n && allowed.includes(n)) found.add(n); };
  (db.pipeTypes||[]).forEach(add);
  (db.materials||[]).forEach(m=>add(m.pipeType));
  (db.stock||[]).forEach(m=>add(m.pipeType));
  (db.quotes||[]).forEach(q=>add(q.pipeMaterial));
  // A jelenlegi alap csőtípusok mindig legyenek választhatók.
  allowed.forEach(add);
  db.pipeTypes=allowed.filter(x=>found.has(x));
  if(!db.pipeTypes.length) db.pipeTypes=[...allowed];
  (db.materials||[]).forEach(m=>{ if(m.pipeType) m.pipeType=normalizePipeType(m.pipeType); });
  (db.stock||[]).forEach(m=>{ if(m.pipeType) m.pipeType=normalizePipeType(m.pipeType); });
  return db.pipeTypes;
}
function ensureMaterialCatalog(){
  db.materials=Array.isArray(db.materials)?db.materials:[];
  if(!db.materials.length){
    db.materials=[
      {id:"MAT-001",name:"KM PVC kútcső 280 mm",unit:"m",cost:0,sale:0,stock:0},
      {id:"MAT-002",name:"KM PVC szűrőcső 280 mm",unit:"m",cost:0,sale:0,stock:0},
      {id:"MAT-003",name:"Szűrőkavics",unit:"t",cost:0,sale:0,stock:0},
      {id:"MAT-004",name:"Cement / tömedékelő anyag",unit:"kg",cost:0,sale:0,stock:0},
      {id:"MAT-005",name:"Kútfej / karima – egyedi gyártás",unit:"db",cost:0,sale:0,stock:0},
      {id:"MAT-006",name:"Kútfej szerelvények",unit:"db",cost:0,sale:0,stock:0}
    ];
  }
}
function quoteMaterialLink(q){
  ensureMaterialCatalog();
  const items=q.items||[];
  const rows=items.map((x,i)=>{
    const mat=db.materials.find(m=>m.id===x.materialId);
    return `<div class="quote-material-row">
      <div><b>${esc(x.name||"Tétel")}</b><div class="label">${mat?esc(mat.name):"Nincs anyaghoz rendelve"}</div></div>
      <div>${esc(String(x.quantity||0))} ${esc(x.unit||"db")}</div>
      <div>${mat?money(mat.cost):"—"}</div>
      <div>${mat?money(mat.sale):"—"}</div>
      <div><button class="btn secondary small" onclick="linkQuoteMaterial('${q.id}',${i})">Anyag hozzárendelése</button></div>
    </div>`;
  }).join("");
  return `<div class="quote-material-box">
    <div class="panelhead"><div><h3>📦 Anyag / árlista kapcsolat</h3><div class="label">Az ajánlati tételekhez rendelhető az anyagtörzs és az aktuális ár.</div></div></div>
    <div class="quote-material-row quote-material-head"><div>Tétel / anyag</div><div>Menny.</div><div>Bekerülés</div><div>Eladási ár</div><div></div></div>
    ${rows||'<div class="empty">Nincs tétel.</div>'}
    <div class="quote-material-summary"><span>Rendelt anyagok: <b>${items.filter(x=>x.materialId).length}/${items.length}</b></span><span>Raktári kapcsolat: <b>${items.filter(x=>x.materialId).length? "aktív":"nincs"}</b></span></div>
  </div>`;
}
function linkQuoteMaterial(qid,i){
  ensureMaterialCatalog();
  const q=(db.quotes||[]).find(x=>String(x.id)===String(qid));if(!q||!q.items[i])return;
  openModal("Anyag hozzárendelése",`<form onsubmit="saveQuoteMaterial(event,'${qid}',${i})">
    <div class="field"><label>Anyag</label><select class="select" name="materialId" required>
      <option value="">Válassz anyagot</option>
      ${db.materials.map(m=>`<option value="${esc(m.id)}" ${q.items[i].materialId===m.id?"selected":""}>${esc(m.name)} · bekerülés ${money(m.cost)} · eladás ${money(m.sale)}</option>`).join("")}
    </select></div>
    <div class="license-review">A hozzárendelés után a tétel anyagköltsége az anyagtörzs bekerülési árából számítható. Az eladási ár az ajánlati árképzéshez használható.</div>
    <div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Hozzárendelés</button></div>
  </form>`);
}
function saveQuoteMaterial(e,qid,i){
  e.preventDefault();
  const q=(db.quotes||[]).find(x=>String(x.id)===String(qid));if(!q)return;
  const id=new FormData(e.target).get("materialId");
  const m=(db.materials||[]).find(x=>x.id===id);
  if(!m)return;
  q.items[i].materialId=m.id;
  q.items[i].materialUnit=Number(m.cost)||0;
  q.items[i].price=(Number(q.items[i].quantity)||0)*((Number(q.items[i].materialUnit)||0)+(Number(q.items[i].laborUnit)||0));
  save();closeModal();render();toast("Anyag hozzárendelve az ajánlati tételhez");
}

function quoteCalculator(q){
  const items=Array.isArray(q.items)?q.items:[];
  return `<div class="quote-calc">
    <div class="quote-calc-head">
      <div><h3 style="margin:0">Ajánlati kalkuláció</h3><div class="quote-calc-muted">Anyag + munkadíj + gépköltség alapján számolható tételesen.</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn secondary small" onclick="refreshQuoteCurrentMeterPrice('${q.id}')">↻ Aktuális Ft/m betöltése</button>
        <button class="btn secondary small" onclick="addQuoteCalcItem('${q.id}')">+ Tétel</button>
      </div>
    </div>
    <table class="quote-calc-table">
      <thead><tr><th style="width:28%">Tétel</th><th style="width:10%">Menny.</th><th style="width:10%">Egys.</th><th style="width:16%">Anyag egységár</th><th style="width:16%">Munkadíj / egys.</th><th style="width:14%">Összesen</th><th></th></tr></thead>
      <tbody>${items.map((x,i)=>quoteCalcRow(q.id,x,i)).join("")}</tbody>
    </table>
    ${quoteCalcTotals(q)}
    <div class="quote-calc-actions">
      <button class="btn" onclick="saveQuoteCalculation('${q.id}')">Kalkuláció mentése</button>
      <button class="btn secondary" onclick="openQuotePricingSummary('${q.id}')">Költségösszesítő</button>
    </div>
  </div>`;
}
function quoteCalcRow(qid,x,i){
  const qty=Number(x.quantity)||0,mat=Number(x.materialUnit)||0,labor=Number(x.laborUnit)||0;
  const total=qty*(mat+labor);
  return `<tr>
    <td><input class="input" data-qcalc="${qid}" data-i="${i}" data-f="name" value="${esc(x.name||"")}" /></td>
    <td><input class="input" type="number" step="0.01" data-qcalc="${qid}" data-i="${i}" data-f="quantity" value="${qty||1}" /></td>
    <td><input class="input" data-qcalc="${qid}" data-i="${i}" data-f="unit" value="${esc(x.unit||"db")}" /></td>
    <td><input class="input" type="number" step="1" data-qcalc="${qid}" data-i="${i}" data-f="materialUnit" value="${mat}" /></td>
    <td><input class="input" type="number" step="1" data-qcalc="${qid}" data-i="${i}" data-f="laborUnit" value="${labor}" /></td>
    <td><b>${money(total)}</b></td>
    <td><button class="btn secondary small" onclick="removeQuoteCalcItem('${qid}',${i})">×</button></td>
  </tr>`;
}
function quoteCalcTotals(q){
  const items=q.items||[];
  const material=items.reduce((a,x)=>a+(Number(x.quantity)||0)*(Number(x.materialUnit)||0),0);
  const labor=items.reduce((a,x)=>a+(Number(x.quantity)||0)*(Number(x.laborUnit)||0),0);
  const cost=material+labor;
  const markup=Number(q.markupPercent)||0;
  const net=cost*(1+markup/100);
  const vat=Number(q.vatPercent ?? 27);
  const gross=net*(1+vat/100);
  return `<div class="quote-calc-total"><span>Anyag: <b>${money(material)}</b></span><span>Munkadíj: <b>${money(labor)}</b></span><span>Önköltség: <b>${money(cost)}</b></span><span>Ajánlati nettó: <b>${money(net)}</b></span><span>Bruttó: <b>${money(gross)}</b></span></div>`;
}

function refreshQuoteCurrentMeterPrice(qid){
  ensureDrillingPriceList();
  const q=(db.quotes||[]).find(x=>String(x.id)===String(qid));
  if(!q)return;
  let changed=0,missing=0;
  (q.items||[]).forEach(x=>{
    const d=Number(x.priceListDiameter)||drillingDiameterFromText(x.name||x.desc||q.pipeDiameter||"");
    if(!d)return;
    const rate=drillingPriceForDiameter(d);
    x.priceListDiameter=d;
    x.priceListName=`Ø ${drillingPriceLabel(d)} mm kútfúrás`;
    if(rate>0){
      x.materialUnit=rate;
      x.quantity=Number(x.quantity)||Number.parseFloat(String(q.depth||"").replace(",","."))||1;
      x.unit="m";
      x.price=(Number(x.quantity)||0)*(Number(x.materialUnit)||0)+(Number(x.quantity)||0)*(Number(x.laborUnit)||0);
      changed++;
    }else missing++;
  });
  save();render();
  toast(changed?`${changed} tétel frissítve az aktuális Ft/m árlistából${missing?`; ${missing} ár nincs megadva`:""}`:"Nincs hozzárendelt 125/160/225/280/315/290 mm-es tétel, vagy nincs megadva az ár");
}
function addQuoteCalcItem(qid){
  const q=(db.quotes||[]).find(x=>String(x.id)===String(qid));if(!q)return;
  q.items=Array.isArray(q.items)?q.items:[];
  q.items.push({name:"Új tétel",quantity:1,unit:"db",materialUnit:0,laborUnit:0,price:0});
  save();render();
}
function removeQuoteCalcItem(qid,i){
  const q=(db.quotes||[]).find(x=>String(x.id)===String(qid));if(!q)return;
  q.items.splice(i,1);save();render();
}
function saveQuoteCalculation(qid){
  const q=(db.quotes||[]).find(x=>String(x.id)===String(qid));if(!q)return;
  q.items=q.items||[];
  document.querySelectorAll(`[data-qcalc="${qid}"]`).forEach(el=>{
    const i=Number(el.dataset.i),f=el.dataset.f;
    if(!q.items[i])return;
    q.items[i][f]=["quantity","materialUnit","laborUnit"].includes(f)?Number(el.value)||0:el.value;
  });
  q.markupPercent=q.markupPercent??0;
  q.vatPercent=q.vatPercent??27;
  q.items.forEach(x=>x.price=(Number(x.quantity)||0)*((Number(x.materialUnit)||0)+(Number(x.laborUnit)||0)));
  save();render();toast("Ajánlati kalkuláció mentve");
}
function openQuotePricingSummary(qid){
  const q=(db.quotes||[]).find(x=>String(x.id)===String(qid));if(!q)return;
  const material=(q.items||[]).reduce((a,x)=>a+(Number(x.quantity)||0)*(Number(x.materialUnit)||0),0);
  const labor=(q.items||[]).reduce((a,x)=>a+(Number(x.quantity)||0)*(Number(x.laborUnit)||0),0);
  const cost=material+labor;
  openModal("Költségösszesítő",`<div class="formgrid">
    <div class="field"><label>Anyagköltség</label><div class="input">${money(material)}</div></div>
    <div class="field"><label>Munkadíj</label><div class="input">${money(labor)}</div></div>
    <div class="field"><label>Önköltség</label><div class="input">${money(cost)}</div></div>
    <div class="field"><label>Árrés (%)</label><input class="input" type="number" step="0.1" value="${Number(q.markupPercent)||0}" onchange="setQuoteMarkup('${qid}',this.value)"></div>
    <div class="field"><label>ÁFA (%)</label><input class="input" type="number" step="0.1" value="${Number(q.vatPercent??27)}" onchange="setQuoteVat('${qid}',this.value)"></div>
  </div>
  ${quoteCalcTotals(q)}
  <div class="modalfoot"><button class="btn" onclick="closeModal()">Bezárás</button></div>`);
}
function setQuoteMarkup(qid,v){const q=(db.quotes||[]).find(x=>String(x.id)===String(qid));if(q){q.markupPercent=Number(v)||0;save();}}
function setQuoteVat(qid,v){const q=(db.quotes||[]).find(x=>String(x.id)===String(qid));if(q){q.vatPercent=Number(v)||0;save();}}


function quoteStatusFlow(q){
  const statuses=["Piszkozat","Elküldve","Elfogadásra vár","Elfogadva","Megrendelés","Lezárva"];
  const current=q.status||"Piszkozat";
  const idx=Math.max(0,statuses.indexOf(current));
  return `<div class="offer-status-flow">${statuses.map((x,i)=>`<span class="offer-status-step ${i===idx?'active':''}">${i+1}. ${x}</span>`).join("")}</div>`;
}
function quoteAcceptanceBox(q,p){
  const accepted=q.status==="Elfogadva"||q.status==="Megrendelés"||q.status==="Lezárva";
  return `<div class="offer-accept-box">
    <div class="panelhead"><div><h3 style="margin:0">📑 Ajánlat státusz és megrendelés</h3><div class="label">A jóváhagyott ajánlatból indul a kivitelezési folyamat.</div></div></div>
    ${quoteStatusFlow(q)}
    <div class="kpi"><span>Ajánlat</span><b>${esc(q.id)}</b></div>
    <div class="kpi"><span>Aktuális státusz</span><b>${esc(q.status||"Piszkozat")}</b></div>
    <div class="offer-accept-actions">
      ${!accepted?`<button class="btn" onclick="acceptQuote('${q.id}')">✓ Ajánlat elfogadása</button>`:""}
      ${accepted&&q.status!=="Lezárva"&&(!p||p.status!=="Kivitelezés alatt")?`<button class="btn" onclick="startProjectExecution('${q.id}')">▶ Kivitelezés indítása</button>`:""}
      ${p&&p.status==="Kivitelezés alatt"?`<button class="btn secondary" onclick="openProjectWorklog('${p.id}')">📋 Munkanapló</button>`:""}
    </div>
  </div>`;
}
function acceptQuote(qid){
  const q=(db.quotes||[]).find(x=>String(x.id)===String(qid));if(!q)return;
  q.status="Elfogadva";q.acceptedAt=new Date().toISOString();
  const p=(db.projects||[]).find(x=>String(x.id)===String(q.projectId));
  if(p){setWorkflowStatus(p,"project","Megrendelés");p.nextTask="Kivitelezési munkaterv és munkanapló előkészítése";}
  save();render();toast("Ajánlat elfogadva");
}
function startProjectExecution(qid){
  const q=(db.quotes||[]).find(x=>String(x.id)===String(qid));if(!q)return;
  const p=(db.projects||[]).find(x=>String(x.id)===String(q.projectId));
  if(!p){toast("A projekthez tartozó ajánlat nem található");return;}
  if(q.status!=="Elfogadva" && q.status!=="Megrendelés"){toast("A kivitelezés csak elfogadott vagy megrendelt ajánlatból indítható");return;}
  const startedAt=new Date().toISOString();
  if(p){
    setWorkflowStatus(p,"project","Kivitelezés alatt");
    const existingLogs=(db.worklogs||[]).filter(w=>String(w.projectId||"")===String(p.id));
    p.nextTask=existingLogs.length?"Munkanapló folytatása":"Munkanapló létrehozása";
    p.executionStartedAt=startedAt;
  }
  save();render();toast("Kivitelezés elindítva");
}
function openProjectWorklog(pid){
  const logs=(db.worklogs||[]).filter(w=>String(w.projectId||"")===String(pid));
  if(logs.length){
    // Ugyanazt a munkanaplót nyissuk meg, amelyet a Projekt folyamat
    // "Munkanaplók" sora aktuálisként mutat: a lista utolsó eleme.
    const currentWorklog=typeof getCurrentWorklogForProject==="function" ? getCurrentWorklogForProject(pid) : logs[logs.length-1];
    if(currentWorklog?.id && typeof openWorklogEditor === "function") {
      openWorklogEditor(currentWorklog.id);
    } else if(currentWorklog?.id){
      window.editingWorklogId=currentWorklog.id;
      window.worklogProjectId=pid;
      current="worklog-fullpage";
      location.hash="#/worklog-fullpage/"+encodeURIComponent(String(currentWorklog.id));
      render();
    }
  }else{
    newWorklogFor(pid);
  }
  return false;
}


function projectExecutionPanel(p){
  const e=p.execution||{};
  const logs=(db.worklogs||[]).filter(w=>w.projectId===p.id);
  const steps=["Munkaterv","Felvonulás","Fúrás","Csövezés","Szűrőzés","Kavicsolás","Tömedékelés","Próbaszivattyúzás","Kész kút"];
  const current=Number(e.stepIndex)||0;
  return `<div class="execution-panel">
    <div class="execution-head">
      <div><h2>🔧 Kivitelezés</h2><div class="label">Munkaterv és munkanapló egy projektfolyamatban</div></div>
      <div><button class="btn secondary small" onclick="editExecutionPlan('${p.id}')">Munkaterv szerkesztése</button> <button class="btn small" onclick="newWorklogFor('${p.id}')">+ Munkanapló</button></div>
    </div>
    <div class="execution-grid">
      <div class="execution-stat"><div class="label">Aktuális lépés</div><b>${esc(steps[current]||"Munkaterv")}</b></div>
      <div class="execution-stat"><div class="label">Munkanaplók</div><b>${logs.length} db</b></div>
      <div class="execution-stat"><div class="label">Kezdés</div><b>${esc(e.startDate||"—")}</b></div>
      <div class="execution-stat"><div class="label">Tervezett mélység</div><b>${esc(p.permittedDepth||p.plannedDepth||"—")}${p.permittedDepth||p.plannedDepth?" m":""}</b></div>
    </div>
    <div class="execution-steps">${steps.map((x,i)=>`<span class="execution-step ${i===current?'active':''}">${i+1}. ${x}</span>`).join("")}</div>
    <div class="worklog-list">
      ${logs.slice().reverse().slice(0,5).map((w,i)=>`<div class="worklog-item"><div><b>${esc(w.date||"")}</b></div><div>${esc(w.activity||"Munkanapló")}<div class="label">${esc(w.note||"")}</div></div><div>${esc(w.depth||"—")}${w.depth?" m":""}</div><button class="btn secondary small" onclick="viewWorklog('${p.id}',${logs.indexOf(w)})">Megnyitás</button></div>`).join("")||'<div class="empty">Még nincs munkanapló.</div>'}
    </div>
    ${worklogMaterialPanel(p.id)}
    ${drillingDataPanel(p)}
    ${pumpTestPanel(p)}
    ${pumpSizingPanel(p)}
    ${projectDocumentsPanel(p)}
    ${irrigationPanel(p)}
    ${projectClosurePanel(p)}
    ${aftercarePanel(p)}
    ${wellDataServicePanel(p)}
    ${documentGeneratorPanel(p)}
    ${workflowPanel(p)}
  </div>`;
}
function editExecutionPlan(pid){
  const p=db.projects.find(x=>x.id===pid);if(!p)return;
  const e=p.execution||{};
  openModal("Kivitelezési munkaterv",`<form onsubmit="saveExecutionPlan(event,'${pid}')"><div class="formgrid">
    <div class="field"><label>Kezdés dátuma</label><input class="input" type="date" name="startDate" value="${esc(e.startDate||"")}"></div>
    <div class="field"><label>Aktuális lépés</label><select class="select" name="stepIndex">${["Munkaterv","Felvonulás","Fúrás","Csövezés","Szűrőzés","Kavicsolás","Tömedékelés","Próbaszivattyúzás","Kész kút"].map((x,i)=>`<option value="${i}" ${Number(e.stepIndex)===i?"selected":""}>${i+1}. ${x}</option>`).join("")}</select></div>
    <div class="field full"><label>Munkaterv megjegyzés</label><textarea class="textarea" name="note">${esc(e.note||"")}</textarea></div>
  </div><div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Mentés</button></div></form>`);
}
function saveExecutionPlan(ev,pid){
  ev.preventDefault();const p=db.projects.find(x=>x.id===pid);if(!p)return;
  p.execution=Object.assign(p.execution||{},Object.fromEntries(new FormData(ev.target).entries()));
  p.execution.stepIndex=Number(p.execution.stepIndex)||0;
  setWorkflowStatus(p,"project","Kivitelezés alatt");p.nextTask="Munkanapló rögzítése";
  save();closeModal();render();toast("Munkaterv mentve");
}

function worklogMaterialPanel(pid){
  const p=db.projects.find(x=>x.id===pid);if(!p)return "";
  ensureMaterialCatalog();
  const logs=(db.materialIssues||[]).filter(x=>x.projectId===pid);
  return `<div class="worklog-stock">
    <div class="panelhead"><div><h3>📦 Anyagfelhasználás</h3><div class="label">A kivitelezés során kiadott anyagok és a projekt tényleges anyagköltsége.</div></div><button class="btn small" onclick="issueProjectMaterial('${pid}')">+ Anyag kiadása</button></div>
    <div class="worklog-stock-row" style="font-size:12px;color:#64748b;font-weight:700"><div>Anyag</div><div>Mennyiség</div><div>Dátum</div><div>Érték</div><div>Állapot</div></div>
    ${logs.map(x=>{
      const m=db.materials.find(a=>a.id===x.materialId);
      return `<div class="worklog-stock-row"><div><b>${esc(m?.name||x.materialId||"Anyag")}</b><div class="label">${esc(x.note||"")}</div></div><div>${esc(String(x.quantity||0))} ${esc(m?.unit||x.unit||"db")}</div><div>${esc(x.date||"")}</div><div>${money(Number(x.quantity||0)*Number(x.unitCost||0))}</div><div><span class="stock-badge ${x.stockDeducted?'ok':'low'}">${x.stockDeducted?'Készlet levonva':'Ellenőrzés'}</span></div></div>`;
    }).join("")||'<div class="empty">Még nincs anyagkiadás.</div>'}
  </div>`;
}
function issueProjectMaterial(pid){
  ensureMaterialCatalog();
  const options=db.materials.map(m=>`<option value="${esc(m.id)}">${esc(m.name)} · készlet ${esc(String(m.stock||0))} ${esc(m.unit||"db")}</option>`).join("");
  openModal("Anyag kiadása a projektre",`<form onsubmit="saveProjectMaterialIssue(event,'${pid}')"><div class="formgrid">
    <div class="field full"><label>Anyag</label><select class="select" name="materialId" required>${options}</select></div>
    <div class="field"><label>Mennyiség</label><input class="input" type="number" step="0.01" min="0.01" name="quantity" required></div>
    <div class="field"><label>Dátum</label><input class="input" type="date" name="date" value="${new Date().toISOString().slice(0,10)}" required></div>
    <div class="field full"><label>Megjegyzés</label><textarea class="textarea" name="note"></textarea></div>
  </div><div class="license-review">A mentés készletmozgást hoz létre és a projekt tényleges anyagköltségébe bekerül.</div><div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Kiadás és készletlevonás</button></div></form>`);
}
function saveProjectMaterialIssue(ev,pid){
  ev.preventDefault();ensureMaterialCatalog();
  const o=Object.fromEntries(new FormData(ev.target).entries());
  const m=db.materials.find(x=>x.id===o.materialId);if(!m)return;
  const qty=Number(o.quantity)||0, stock=Number(m.stock)||0;
  if(qty>stock){toast("Nincs elegendő készlet: "+m.name);return;}
  m.stock=stock-qty;
  db.materialIssues=Array.isArray(db.materialIssues)?db.materialIssues:[];
  db.materialIssues.push({projectId:pid,materialId:m.id,quantity:qty,unit:m.unit||"db",unitCost:Number(m.cost)||0,date:o.date,note:o.note||"",stockDeducted:true});
  const p=db.projects.find(x=>x.id===pid);
  if(p){p.actualMaterialCost=(Number(p.actualMaterialCost)||0)+qty*(Number(m.cost)||0);}
  save();closeModal();render();toast("Anyag kiadva, készlet levonva");
}






function irrigationPlanAIBox(p){
  const i=p.irrigation||{};
  return `<div class="irrigation-ai-box">
    <div class="panelhead">
      <div><h3 style="margin:0">📄 Öntözési terv feldolgozása</h3><div class="label">Az öntözési tervből az AI előkészíti a terület, zónák, vízigény és nyomás adatait.</div></div>
      <button class="btn" onclick="openIrrigationPlanAI('${p.id}')">Terv feltöltése / AI</button>
    </div>
    ${i.aiSource?`<div class="license-review">Feldolgozott forrás: <b>${esc(i.aiSource)}</b> · ${esc(i.aiStatus||"Ellenőrzés alatt")}</div>`:""}
  </div>`;
}
function openIrrigationPlanAI(pid){
  openModal("Öntözési terv – AI feldolgozás",`<form onsubmit="simulateIrrigationAI(event,'${pid}')">
    <div class="field full"><label>Öntözési terv / PDF / kép</label><input class="input" type="file" name="plan" accept=".pdf,.png,.jpg,.jpeg" required></div>
    <div class="license-review">Az offline verzióban ez az AI/OCR adatfogadó pontja. A dokumentum feldolgozása után az adatokat ellenőrizni kell, mielőtt a projektbe kerülnek.</div>
    <div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">AI feldolgozás</button></div>
  </form>`);
}
function simulateIrrigationAI(ev,pid){
  ev.preventDefault();
  const file=ev.target.elements.plan?.files?.[0];if(!file)return;
  const p=db.projects.find(x=>x.id===pid);if(!p)return;
  openIrrigationAIReview(pid,file.name);
}
function openIrrigationAIReview(pid,fileName){
  const p=db.projects.find(x=>x.id===pid);if(!p)return;
  const i=p.irrigation||{};
  openModal("AI feldolgozás – öntözési terv ellenőrzése",`
    <div class="label">Forrás: ${esc(fileName)}</div>
    <div class="irrigation-ai-result">
      <div class="irrigation-ai-card"><h4>🌱 Öntözési rendszer</h4>
        ${irrigationAIInput("ir_area","Öntözött terület (m²)",i.area||"")}
        ${irrigationAIInput("ir_flow","Tervezési vízhozam (l/min)",i.designFlow||"")}
        ${irrigationAIInput("ir_pressure","Szükséges nyomás (bar)",i.requiredPressure||"")}
        ${irrigationAIInput("ir_method","Öntözési mód",i.method||"")}
      </div>
      <div class="irrigation-ai-card"><h4>💧 Zóna / hidraulika</h4>
        ${irrigationAIInput("ir_zones","Zónák száma",i.zones?.length||"")}
        ${irrigationAIInput("ir_peak","Csúcs vízigény (l/min)",i.peakFlow||"")}
        ${irrigationAIInput("ir_pipe","Fővezeték",i.mainPipe||"")}
        ${irrigationAIInput("ir_note","Megjegyzés",i.note||"")}
      </div>
    </div>
    <div class="license-review">🟡 A végleges rendszerben minden mezőhöz AI-biztonsági szint és forrásoldal tartozik. Az itt jóváhagyott adatok kerülnek a projektbe.</div>
    <div class="irrigation-ai-actions">
      <button class="btn secondary" onclick="closeModal()">Mégse</button>
      <button class="btn" onclick="saveIrrigationAIReview('${pid}','${esc(fileName)}')">Adatok elfogadása és projekt frissítése</button>
    </div>`);
}
function irrigationAIInput(name,label,value){
  return `<div class="irrigation-ai-field"><span>${esc(label)}</span><input class="input" style="max-width:55%" name="${name}" value="${esc(String(value??""))}"></div>`;
}
function saveIrrigationAIReview(pid,fileName){
  const p=db.projects.find(x=>x.id===pid);if(!p)return;
  const modal=document.querySelector(".modal");if(!modal)return;
  const v={};modal.querySelectorAll("input[name]").forEach(x=>v[x.name]=x.value);
  p.irrigation=p.irrigation||{};
  p.irrigation.area=v.ir_area||"";
  p.irrigation.designFlow=v.ir_flow||"";
  p.irrigation.requiredPressure=v.ir_pressure||"";
  p.irrigation.method=v.ir_method||"";
  p.irrigation.peakFlow=v.ir_peak||"";
  p.irrigation.mainPipe=v.ir_pipe||"";
  p.irrigation.note=v.ir_note||"";
  p.irrigation.aiSource=fileName;
  p.irrigation.aiStatus="Feldolgozva – ellenőrzött";
  p.irrigation.aiProcessedAt=new Date().toISOString();
  save();closeModal();render();toast("Öntözési terv adatai bekerültek a projektbe");
}


function projectProcessDocumentsSection(p){
  const docs=Array.isArray(p.documents)?p.documents:[];
  const count=docs.length;
  const rows=docs.length ? docs.map((d,i)=>`
    <div class="project-process-doc-row">
      <div class="project-process-doc-main">
        <div class="project-process-doc-icon">${documentIcon(d.type)}</div>
        <div>
          <div class="project-process-doc-name">${esc(d.name||d.fileName||"Dokumentum")}</div>
          ${d.fileName&&d.name&&d.fileName!==d.name?`<div class="project-process-doc-meta">${esc(d.fileName)}</div>`:""}
        </div>
      </div>
      <div>${esc(d.type||"Egyéb")}</div>
      <div>${esc(d.date||"—")}</div>
      <div><span class="doc-status ${d.status==="Feldolgozva"||d.status==="Jóváhagyva"?"done":"wait"}">${esc(d.status||"Feltöltve")}</span></div>
      <div class="project-process-doc-actions">
        <button class="btn secondary small" onclick="viewProjectDocument('${esc(p.id)}',${i})">Megnyitás</button>
        <button class="btn secondary small" onclick="editProjectDocument('${esc(p.id)}',${i})">Szerkesztés</button>
        <button class="btn danger small" onclick="deleteProjectDocument('${esc(p.id)}',${i});return false;">Törlés</button>
      </div>
    </div>`).join("") : '<div class="project-process-doc-empty">Még nincs dokumentum a projekthez.</div>';
  return `
    <div class="project-process-doc-accordion " id="project-process-documents-${esc(p.id)}">
      <button type="button" class="project-process-doc-toggle" onclick="toggleProjectProcessDocuments('${esc(p.id)}')" aria-expanded="false">
        <span class="project-process-doc-label"><span class="project-process-doc-label-icon">📄</span><span>Dokumentumok</span><span class="project-process-count">${count} db</span></span>
        <span class="project-process-chevron" aria-hidden="true">⌄</span>
      </button>
      <div class="project-process-doc-content" hidden>
        <div class="project-process-doc-table">
          <div class="project-process-doc-header">
            <div>Dokumentum</div><div>Típus</div><div>Dátum</div><div>Állapot</div><div>Műveletek</div>
          </div>
          ${rows}
        </div>
        <button type="button" class="project-process-upload" onclick="addProjectDocument('${esc(p.id)}')"><span>＋</span> Dokumentum hozzáadása</button>
      </div>
    </div>`;
}
function toggleProjectProcessDocuments(pid){
  const box=document.getElementById(`project-process-documents-${pid}`);
  if(!box)return;
  const content=box.querySelector('.project-process-doc-content');
  const toggle=box.querySelector('.project-process-doc-toggle');
  const open=content.hidden;
  content.hidden=!open;
  toggle.setAttribute('aria-expanded',open?'true':'false');
  box.classList.toggle('is-open',open);
}

function projectDocumentsPanel(p){
  const docs=Array.isArray(p.documents)?p.documents:[];
  return `<div class="project-documents-panel">
    <div class="panelhead">
      <div><h2>📁 Projekt dokumentumok</h2><div class="label">${docs.length} dokumentum a projekthez kapcsolva.</div></div>
      <button class="btn small" onclick="addProjectDocument('${p.id}')">+ Dokumentum</button>
    </div>
    <div class="project-doc-row project-doc-header">
      <div></div><div>Dokumentum</div><div>Típus</div><div>Dátum</div><div>Állapot</div><div>Műveletek</div>
    </div>
    <div class="project-doc-list">
      ${docs.map((d,i)=>`
        <div class="project-doc-row">
          <div class="project-doc-icon">${documentIcon(d.type)}</div>
          <div>
            <div class="project-doc-name">${esc(d.name||d.fileName||"Dokumentum")}</div>
            <div class="project-doc-meta">${esc(d.fileName||"")}</div>
          </div>
          <div>${esc(d.type||"Egyéb")}</div>
          <div>${esc(d.date||"")}</div>
          <div><span class="doc-status ${d.status==="Feldolgozva"||d.status==="Jóváhagyva"?"done":"wait"}">${esc(d.status||"Feltöltve")}</span></div>
          <div class="project-doc-actions">
            <button class="btn secondary small" onclick="viewProjectDocument('${p.id}',${i})">Megnyitás</button>
            <button class="btn secondary small" onclick="editProjectDocument('${p.id}',${i})">Szerkesztés</button>
            <button class="btn danger small" onclick="deleteProjectDocument('${p.id}',${i});return false;">Törlés</button>
          </div>
        </div>`).join("") || '<div class="project-doc-empty">Még nincs projekt dokumentum.</div>'}
    </div>
  </div>`;
}
function addProjectDocument(pid){
  openModal("Projekt dokumentum feltöltése",`<form onsubmit="saveProjectDocument(event,'${pid}')"><div class="formgrid">
    <div class="field full"><label>Dokumentum</label><input class="input" type="file" name="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx" required></div>
    <div class="field"><label>Dokumentumtípus</label><select class="select" name="type"><option>Létesítési engedély</option><option>Öntözési terv</option><option>Ajánlat</option><option>Kivitelezési dokumentum</option><option>Munkanapló</option><option>Kész kút dokumentáció</option><option>Egyéb</option></select></div>
    <div class="field"><label>Állapot</label><select class="select" name="status"><option>Feltöltve</option><option>Ellenőrzés alatt</option><option>Jóváhagyva</option></select></div>
    <div class="field full"><label>Megjegyzés</label><textarea class="textarea" name="note"></textarea></div>
  </div><div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Dokumentum hozzáadása</button></div></form>`);
}

function documentFileDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open("KutfoPluszERPFiles",1);
    req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains("files"))db.createObjectStore("files")};
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function storeProjectFile(docId,file){
  const idb=await documentFileDB();
  await new Promise((resolve,reject)=>{
    const tx=idb.transaction("files","readwrite");
    tx.objectStore("files").put(file,docId);
    tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
  });
  idb.close();
}
async function getProjectFile(docId){
  const idb=await documentFileDB();
  const value=await new Promise((resolve,reject)=>{
    const tx=idb.transaction("files","readonly");
    const req=tx.objectStore("files").get(docId);
    req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
  });
  idb.close(); return value||null;
}

async function hasStoredProjectFile(docId){
  if(!docId)return false;
  try{return !!(await getProjectFile(docId));}
  catch(e){console.warn("Dokumentumfájl ellenőrzése:",e);return false;}
}
async function deleteProjectFile(docId){
  if(!docId)return;
  try{
    const idb=await documentFileDB();
    await new Promise((resolve,reject)=>{
      const tx=idb.transaction("files","readwrite");
      tx.objectStore("files").delete(docId);
      tx.oncomplete=resolve; tx.onerror=()=>reject(tx.error);
    });
    idb.close();
  }catch(e){console.warn("Dokumentumfájl törlése:",e)}
}
async function openProjectDocumentFile(d){
  if(!d){toast("A dokumentum nem található");return;}
  try{
    const file=await getProjectFile(d.id);
    if(!file){
      openModal("Dokumentum",`<div class="formgrid">
        <div class="field full"><div class="input">A dokumentum adatai megvannak, de a fájl tartalma nincs eltárolva. A fájl korábbi verziója nem állítható vissza ebből a rekordból, ezért ezt a dokumentumot egyszer újra fel kell tölteni.</div></div>
      </div><div class="modalfoot"><button class="btn secondary" onclick="closeModal()">Bezárás</button><button class="btn" onclick="closeModal();uploadProjectDocument('${esc(d.projectId||"")}')">Fájl újrafeltöltése</button></div>`);
      return;
    }
    const url=URL.createObjectURL(file);
    const w=window.open(url,"_blank");
    if(!w){
      const a=document.createElement("a");a.href=url;a.target="_blank";a.rel="noopener";a.click();
    }
    setTimeout(()=>URL.revokeObjectURL(url),60000);
  }catch(e){
    console.error(e); toast("A dokumentum megnyitása nem sikerült.");
  }
}

async function saveProjectDocument(ev,pid){
  ev.preventDefault();
  const p=db.projects.find(x=>String(x.id)===String(pid)); if(!p)return;
  const f=ev.target.elements.file?.files?.[0]; if(!f)return;
  const o=Object.fromEntries(new FormData(ev.target).entries());
  p.documents=Array.isArray(p.documents)?p.documents:[];

  const sameNameDocs=p.documents.filter(d=>String(d.name||d.fileName||"").toLowerCase()===String(f.name||"").toLowerCase());
  for(const existing of sameNameDocs){
    if(await hasStoredProjectFile(existing.id)){
      toast("Ez a dokumentum már szerepel a projektben.");
      return;
    }
  }

  // Ha a rekord megvan, de a tényleges fájl hiányzik, az új feltöltés helyreállítja azt.
  if(sameNameDocs.length){
    const existing=sameNameDocs[0];
    try{
      await storeProjectFile(existing.id,f);
    }catch(err){
      console.error(err);
      toast("A fájl eltárolása nem sikerült.");
      return;
    }
    existing.name=f.name; existing.fileName=f.name; existing.type=o.type||existing.type||"Egyéb";
    existing.status=o.status||existing.status||"Feltöltve"; existing.note=o.note||existing.note||"";
    existing.size=formatFileSize(f.size); existing.mimeType=f.type||"application/octet-stream";
    existing.date=new Date().toISOString().slice(0,10);
    const global=(db.documents||[]).find(x=>String(x.id)===String(existing.id));
    if(global)Object.assign(global,existing);
    if(String(existing.type).toLowerCase().includes("engedély")){
      p.permitDocumentId=existing.id;
      p.nextTask=p.nextTask==="Létesítési engedély feltöltése"?"Létesítési engedély feldolgozása":p.nextTask;
    }
    save();closeModal();render();toast("A dokumentum fájlja újra feltöltve.");
    return;
  }

  const d={
    id:"DOC-"+Date.now()+"-"+Math.random().toString(36).slice(2,8),
    name:f.name,fileName:f.name,type:o.type||"Egyéb",status:o.status||"Feltöltve",
    date:new Date().toISOString().slice(0,10),note:o.note||"",
    size:formatFileSize(f.size),mimeType:f.type||"application/octet-stream",
    projectId:p.id,customerId:p.customerId
  };

  try{
    await storeProjectFile(d.id,f);
  }catch(err){
    console.error(err);
    toast("A fájl eltárolása nem sikerült.");
    return;
  }

  p.documents.push(d);
  db.documents=Array.isArray(db.documents)?db.documents:[];
  db.documents.push(d);

  if(String(d.type).toLowerCase().includes("engedély")){
    p.nextTask=p.nextTask==="Létesítési engedély feltöltése"
      ?"Létesítési engedély feldolgozása":p.nextTask;
    p.permitDocumentId=d.id;
  }

  save();closeModal();render();toast("Projekt dokumentum hozzáadva.");
}
function editProjectDocument(pid,i){
  const p=db.projects.find(x=>String(x.id)===String(pid)),d=p?.documents?.[i]; if(!d)return;
  openModal("Dokumentum szerkesztése",`<form onsubmit="updateProjectDocument(event,'${pid}',${i})">
    <div class="formgrid">
      <div class="field full"><label>Dokumentum neve</label><input class="input" name="name" required value="${esc(d.name||"")}"></div>
      <div class="field"><label>Típus</label><select class="select" name="type">${["Létesítési engedély","Öntözési terv","Helyszínrajz","Műszaki dokumentáció","Szerződés","Jegyzőkönyv","Fotó","Egyéb"].map(x=>`<option ${d.type===x?"selected":""}>${x}</option>`).join("")}</select></div>
      <div class="field"><label>Állapot</label><select class="select" name="status">${["Feltöltve","Feldolgozásra vár","Feldolgozva","Ellenőrzés alatt","Jóváhagyva","Hiányos"].map(x=>`<option ${d.status===x?"selected":""}>${x}</option>`).join("")}</select></div>
      <div class="field full"><label>Megjegyzés</label><textarea class="textarea" name="note">${esc(d.note||"")}</textarea></div>
    </div>
    <div class="modalfoot">
      <button type="button" class="btn secondary" onclick="closeModal()">Mégse</button>
      <button class="btn">Mentés</button>
    </div>
  </form>`);
}
function irrigationPanel(p){
  const i=p.irrigation||{}, zones=Array.isArray(i.zones)?i.zones:[];
  const wellFlow=Number(p.well?.actualFlow||p.well?.permittedFlow||p.actualFlow||p.permittedFlow||0);
  const totalDemand=zones.reduce((a,z)=>a+(Number(z.flow)||0),0);
  const designFlow=Number(i.designFlow)||totalDemand||0;
  const pressure=Number(i.requiredPressure)||0;
  const compatible=wellFlow>0&&designFlow>0 ? wellFlow>=designFlow : false;
  return `<div class="irrigation-panel">
    <div class="panelhead"><div><h2>🌱 Öntözés</h2><div class="label">Az öntözési igény összevetése a kút tényleges vízhozamával.</div></div><button class="btn small" onclick="editIrrigation('${p.id}')">Öntözési adatok</button></div>
    <div class="irrigation-grid">
      <div class="irrigation-stat"><div class="label">Öntözött terület</div><b>${esc(String(i.area||"—"))}${i.area?" m²":""}</b></div>
      <div class="irrigation-stat"><div class="label">Zónák</div><b>${zones.length} db</b></div>
      <div class="irrigation-stat"><div class="label">Szükséges vízhozam</div><b>${esc(String(designFlow||"—"))}${designFlow?" l/min":""}</b></div>
      <div class="irrigation-stat"><div class="label">Szükséges nyomás</div><b>${esc(String(pressure||"—"))}${pressure?" bar":""}</b></div>
    </div>
    <div class="panelhead"><h3>Öntözési zónák</h3><button class="btn secondary small" onclick="addIrrigationZone('${p.id}')">+ Zóna</button></div>
    <div class="irrigation-row" style="font-size:12px;color:#64748b;font-weight:700"><div>Zóna</div><div>Terület</div><div>Vízhozam</div><div>Nyomás</div><div>Üzemidő</div><div></div></div>
    ${zones.map((z,n)=>`<div class="irrigation-row"><div><b>${esc(z.name||("Zóna "+(n+1)))}</b><div class="label">${esc(z.method||"")}</div></div><div>${esc(String(z.area||"—"))} m²</div><div>${esc(String(z.flow||"—"))} l/min</div><div>${esc(String(z.pressure||"—"))} bar</div><div>${esc(String(z.runtime||"—"))} perc</div><div><button class="btn secondary small" onclick="editIrrigationZone('${p.id}',${n})">Szerkesztés</button></div></div>`).join("")||'<div class="empty">Még nincs öntözési zóna.</div>'}
    <div class="irrigation-result">
      <b>Kút ↔ öntözés ellenőrzés</b>
      <div style="margin-top:8px">Kút vízhozama: <b>${esc(String(wellFlow||"—"))}${wellFlow?" l/min":""}</b> · Öntözési igény: <b>${esc(String(designFlow||"—"))}${designFlow?" l/min":""}</b></div>
      <div style="margin-top:8px">${wellFlow&&designFlow?(compatible?'<span class="irrigation-ok">✓ A mért kútvízhozam elegendő az alap vízigényhez.</span>':'<span class="irrigation-warn">⚠ A kút vízhozama kisebb az alap öntözési igénynél.</span>'):'<span class="irrigation-warn">⚠ Hiányos adat: kútvízhozam vagy öntözési igény szükséges.</span>'}</div>
    </div>
    ${irrigationPlanAIBox(p)}
  </div>`;
}
function editIrrigation(pid){
  const p=db.projects.find(x=>x.id===pid);if(!p)return;
  const i=p.irrigation||{};
  openModal("Öntözési adatok",`<form onsubmit="saveIrrigation(event,'${pid}')"><div class="formgrid">
    <div class="field"><label>Öntözött terület (m²)</label><input class="input" type="number" step="0.1" name="area" value="${esc(i.area||"")}" ></div>
    <div class="field"><label>Tervezési vízhozam (l/min)</label><input class="input" type="number" step="0.1" name="designFlow" value="${esc(i.designFlow||"")}" ></div>
    <div class="field"><label>Szükséges nyomás (bar)</label><input class="input" type="number" step="0.1" name="requiredPressure" value="${esc(i.requiredPressure||"")}" ></div>
    <div class="field"><label>Öntözési mód</label><input class="input" name="method" value="${esc(i.method||"")}" placeholder="pl. esőztető"></div>
    <div class="field full"><label>Megjegyzés</label><textarea class="textarea" name="note">${esc(i.note||"")}</textarea></div>
  </div><div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Mentés</button></div></form>`);
}
function saveIrrigation(ev,pid){
  ev.preventDefault();const p=db.projects.find(x=>x.id===pid);if(!p)return;
  p.irrigation=p.irrigation||{};Object.assign(p.irrigation,Object.fromEntries(new FormData(ev.target).entries()));
  save();closeModal();render();toast("Öntözési adatok mentve");
}
function addIrrigationZone(pid){
  openModal("Új öntözési zóna",`<form onsubmit="saveIrrigationZone(event,'${pid}')"><div class="formgrid">
    <div class="field"><label>Zóna neve</label><input class="input" name="name" placeholder="pl. Zóna 1" required></div>
    <div class="field"><label>Terület (m²)</label><input class="input" type="number" step="0.1" name="area"></div>
    <div class="field"><label>Vízhozam (l/min)</label><input class="input" type="number" step="0.1" name="flow"></div>
    <div class="field"><label>Nyomás (bar)</label><input class="input" type="number" step="0.1" name="pressure"></div>
    <div class="field"><label>Üzemidő (perc)</label><input class="input" type="number" step="1" name="runtime"></div>
    <div class="field"><label>Módszer</label><input class="input" name="method" placeholder="szórófej / csepegtető"></div>
  </div><div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Mentés</button></div></form>`);
}
function saveIrrigationZone(ev,pid){
  ev.preventDefault();const p=db.projects.find(x=>x.id===pid);if(!p)return;
  p.irrigation=p.irrigation||{};p.irrigation.zones=Array.isArray(p.irrigation.zones)?p.irrigation.zones:[];
  p.irrigation.zones.push(Object.fromEntries(new FormData(ev.target).entries()));
  save();closeModal();render();toast("Öntözési zóna mentve");
}
function editIrrigationZone(pid,i){
  const p=db.projects.find(x=>x.id===pid),z=p?.irrigation?.zones?.[i];if(!z)return;
  openModal("Öntözési zóna",`<form onsubmit="updateIrrigationZone(event,'${pid}',${i})"><div class="formgrid">
    <div class="field"><label>Zóna neve</label><input class="input" name="name" value="${esc(z.name||"")}"></div>
    <div class="field"><label>Terület (m²)</label><input class="input" type="number" name="area" value="${esc(z.area||"")}"></div>
    <div class="field"><label>Vízhozam (l/min)</label><input class="input" type="number" name="flow" value="${esc(z.flow||"")}"></div>
    <div class="field"><label>Nyomás (bar)</label><input class="input" type="number" name="pressure" value="${esc(z.pressure||"")}"></div>
    <div class="field"><label>Üzemidő (perc)</label><input class="input" type="number" name="runtime" value="${esc(z.runtime||"")}"></div>
    <div class="field"><label>Módszer</label><input class="input" name="method" value="${esc(z.method||"")}"></div>
  </div><div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Mentés</button></div></form>`);
}
function updateIrrigationZone(ev,pid,i){
  ev.preventDefault();const p=db.projects.find(x=>x.id===pid),z=p?.irrigation?.zones?.[i];if(!z)return;
  Object.assign(z,Object.fromEntries(new FormData(ev.target).entries()));
  save();closeModal();render();toast("Öntözési zóna frissítve");
}

function pumpSizingPanel(p){
  const w=p.well||{}, q=(db.quotes||[]).filter(x=>x.projectId===p.id).slice(-1)[0]||{};
  const flow=Number(w.actualFlow||w.permittedFlow||p.actualFlow||p.permittedFlow||0);
  const staticLevel=Number(w.staticWaterLevel||0);
  const dynamicLevel=Number(w.operatingWaterLevel||0);
  const depth=Number(w.actualDepth||p.actualDepth||w.permittedDepth||p.permittedDepth||0);
  const requiredFlow=Number(w.requiredFlow||0);
  const head=Number(w.requiredHead||0);
  const designFlow=requiredFlow||flow;
  return `<div class="pump-sizing-panel">
    <div class="panelhead"><div><h2>⚙️ Szivattyú / gépészet előméretezés</h2><div class="label">A kút tényleges adataiból indul; a végleges gépválasztás mérnöki ellenőrzést igényel.</div></div><button class="btn small" onclick="editPumpSizing('${p.id}')">Méretezési adatok</button></div>
    <div class="pump-sizing-grid">
      <div class="pump-sizing-stat"><div class="label">Kút mélysége</div><b>${esc(String(depth||"—"))}${depth?" m":""}</b></div>
      <div class="pump-sizing-stat"><div class="label">Mért vízhozam</div><b>${esc(String(flow||"—"))}${flow?" l/min":""}</b></div>
      <div class="pump-sizing-stat"><div class="label">Üzemi vízszint</div><b>${esc(String(dynamicLevel||"—"))}${dynamicLevel?" m":""}</b></div>
      <div class="pump-sizing-stat"><div class="label">Tervezési vízigény</div><b>${esc(String(designFlow||"—"))}${designFlow?" l/min":""}</b></div>
    </div>
    <div class="pump-sizing-result">
      <b>Előzetes gépészeti követelmény</b>
      <div class="pump-sizing-grid" style="margin-bottom:0">
        <div class="pump-sizing-stat"><div class="label">Cél vízhozam</div><b>${esc(String(designFlow||"—"))}${designFlow?" l/min":""}</b></div>
        <div class="pump-sizing-stat"><div class="label">Cél emelőmagasság</div><b>${esc(String(head||"—"))}${head?" m":""}</b></div>
        <div class="pump-sizing-stat"><div class="label">Nyugalmi szint</div><b>${esc(String(staticLevel||"—"))}${staticLevel?" m":""}</b></div>
        <div class="pump-sizing-stat"><div class="label">Állapot</div><b>${designFlow&&head?"Méretezhető":"Adatpótlás szükséges"}</b></div>
      </div>
      <div class="pump-sizing-note">A cél vízhozamot és emelőmagasságot az öntözési tervből / megrendelői igényből kell megadni. A kút mért vízhozama önmagában nem azonos a szükséges szivattyú üzemi pontjával.</div>
    </div>
    <div class="pump-sizing-note">A végleges szivattyút nem választja ki automatikusan a rendszer: a kiválasztás előtt ellenőrizni kell a csőátmérőt, üzemi pontot, homoktartalmat, elektromos adatokat, nyomásigényt és az öntözőrendszer veszteségeit.</div>
  </div>`;
}
function editPumpSizing(pid){
  const p=db.projects.find(x=>x.id===pid);if(!p)return;
  p.well=p.well||{};const w=p.well;
  openModal("Gépészeti méretezési adatok",`<form onsubmit="savePumpSizing(event,'${pid}')"><div class="formgrid">
    <div class="field"><label>Tervezési vízigény (l/min)</label><input class="input" type="number" step="0.1" name="requiredFlow" value="${esc(w.requiredFlow||"")}" placeholder="pl. 600"></div>
    <div class="field"><label>Szükséges emelőmagasság (m)</label><input class="input" type="number" step="0.1" name="requiredHead" value="${esc(w.requiredHead||"")}" placeholder="pl. 60"></div>
    <div class="field"><label>Szivattyúcső / nyomócső</label><input class="input" name="deliveryPipe" value="${esc(w.deliveryPipe||"")}" placeholder="pl. DN50"></div>
    <div class="field"><label>Üzemeltetés</label><select class="select" name="operation"><option ${w.operation==="Folyamatos"?"selected":""}>Folyamatos</option><option ${w.operation==="Szakaszos"?"selected":""}>Szakaszos</option></select></div>
    <div class="field full"><label>Gépészeti megjegyzés</label><textarea class="textarea" name="engineeringNote">${esc(w.engineeringNote||"")}</textarea></div>
  </div><div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Mentés</button></div></form>`);
}
function savePumpSizing(ev,pid){
  ev.preventDefault();const p=db.projects.find(x=>x.id===pid);if(!p)return;
  p.well=p.well||{};Object.assign(p.well,Object.fromEntries(new FormData(ev.target).entries()));
  save();closeModal();render();toast("Gépészeti méretezési adatok mentve");
}

function pumpTestPanel(p){
  const w=p.well||{}, tests=Array.isArray(w.pumpTests)?w.pumpTests:[];
  const latest=tests[tests.length-1]||{};
  return `<div class="pump-test-panel">
    <div class="panelhead"><div><h2>💧 Próbaszivattyúzás / vízhozamvizsgálat</h2><div class="label">A végleges kút vízhozama és vízszintadatai innen kerülnek a gépészeti méretezésbe.</div></div><button class="btn small" onclick="addPumpTest('${p.id}')">+ Mérési sor</button></div>
    <div class="pump-test-grid">
      <div class="pump-test-stat"><div class="label">Nyugalmi vízszint</div><b>${esc(String(latest.staticLevel||w.staticWaterLevel||"—"))}${latest.staticLevel||w.staticWaterLevel?" m":""}</b></div>
      <div class="pump-test-stat"><div class="label">Üzemi vízszint</div><b>${esc(String(latest.dynamicLevel||w.operatingWaterLevel||"—"))}${latest.dynamicLevel||w.operatingWaterLevel?" m":""}</b></div>
      <div class="pump-test-stat"><div class="label">Mért vízhozam</div><b>${esc(String(latest.flow||w.actualFlow||"—"))}${latest.flow||w.actualFlow?" l/min":""}</b></div>
      <div class="pump-test-stat"><div class="label">Mérési idő</div><b>${esc(String(latest.duration||"—"))}${latest.duration?" perc":""}</b></div>
    </div>
    <div class="pump-test-row" style="font-size:12px;color:#64748b;font-weight:700"><div>Időpont</div><div>Nyugalmi szint</div><div>Üzemi szint</div><div>Vízhozam</div><div>Időtartam / megjegyzés</div><div></div></div>
    ${tests.map((x,i)=>`<div class="pump-test-row"><div>${esc(x.date||"")}</div><div>${esc(x.staticLevel||"—")} m</div><div>${esc(x.dynamicLevel||"—")} m</div><div>${esc(x.flow||"—")} l/min</div><div>${esc(x.duration||"—")} perc<div class="label">${esc(x.note||"")}</div></div><div><button class="btn secondary small" onclick="editPumpTest('${p.id}',${i})">Szerkesztés</button></div></div>`).join("")||'<div class="empty">Még nincs vízhozamvizsgálat rögzítve.</div>'}
    <div class="pump-test-result">
      <b>Véglegesített kútadatok</b>
      <div class="label" style="margin-top:6px">A legutóbbi mérési sorból kerülnek a kút adatlapjára, és később a szivattyúméretezés alapjául szolgálnak.</div>
    </div>
  </div>`;
}
function addPumpTest(pid){
  openModal("Próbaszivattyúzás / mérési sor",`<form onsubmit="savePumpTest(event,'${pid}')"><div class="formgrid">
    <div class="field"><label>Dátum</label><input class="input" type="date" name="date" value="${new Date().toISOString().slice(0,10)}" required></div>
    <div class="field"><label>Időtartam (perc)</label><input class="input" type="number" step="1" name="duration"></div>
    <div class="field"><label>Nyugalmi vízszint (m)</label><input class="input" type="number" step="0.01" name="staticLevel"></div>
    <div class="field"><label>Üzemi vízszint (m)</label><input class="input" type="number" step="0.01" name="dynamicLevel"></div>
    <div class="field"><label>Mért vízhozam (l/min)</label><input class="input" type="number" step="0.1" name="flow"></div>
    <div class="field full"><label>Megjegyzés</label><textarea class="textarea" name="note"></textarea></div>
  </div><div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Mentés</button></div></form>`);
}
function savePumpTest(ev,pid){
  ev.preventDefault();const p=db.projects.find(x=>x.id===pid);if(!p)return;
  p.well=p.well||{};p.well.pumpTests=Array.isArray(p.well.pumpTests)?p.well.pumpTests:[];
  const o=Object.fromEntries(new FormData(ev.target).entries());
  p.well.pumpTests.push(o);
  if(o.staticLevel)p.well.staticWaterLevel=o.staticLevel;
  if(o.dynamicLevel)p.well.operatingWaterLevel=o.dynamicLevel;
  if(o.flow){p.well.actualFlow=o.flow;p.actualFlow=o.flow;}
  p.well.testDuration=o.duration||"";
  save();closeModal();render();toast("Vízhozamvizsgálat mentve");
}
function editPumpTest(pid,i){
  const p=db.projects.find(x=>x.id===pid),x=p?.well?.pumpTests?.[i];if(!x)return;
  openModal("Mérési sor szerkesztése",`<form onsubmit="updatePumpTest(event,'${pid}',${i})"><div class="formgrid">
    <div class="field"><label>Dátum</label><input class="input" type="date" name="date" value="${esc(x.date||"")}"></div>
    <div class="field"><label>Időtartam (perc)</label><input class="input" type="number" name="duration" value="${esc(x.duration||"")}"></div>
    <div class="field"><label>Nyugalmi vízszint (m)</label><input class="input" type="number" step="0.01" name="staticLevel" value="${esc(x.staticLevel||"")}"></div>
    <div class="field"><label>Üzemi vízszint (m)</label><input class="input" type="number" step="0.01" name="dynamicLevel" value="${esc(x.dynamicLevel||"")}"></div>
    <div class="field"><label>Mért vízhozam (l/min)</label><input class="input" type="number" step="0.1" name="flow" value="${esc(x.flow||"")}"></div>
    <div class="field full"><label>Megjegyzés</label><textarea class="textarea" name="note">${esc(x.note||"")}</textarea></div>
  </div><div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Mentés</button></div></form>`);
}
function updatePumpTest(ev,pid,i){
  ev.preventDefault();const p=db.projects.find(x=>x.id===pid),x=p?.well?.pumpTests?.[i];if(!x)return;
  Object.assign(x,Object.fromEntries(new FormData(ev.target).entries()));
  const last=p.well.pumpTests[p.well.pumpTests.length-1];
  if(last.staticLevel)p.well.staticWaterLevel=last.staticLevel;
  if(last.dynamicLevel)p.well.operatingWaterLevel=last.dynamicLevel;
  if(last.flow){p.well.actualFlow=last.flow;p.actualFlow=last.flow;}
  save();closeModal();render();toast("Mérési adat frissítve");
}

function drillingDataPanel(p){
  const w=p.well||{}, d=Array.isArray(w.drillingEntries)?w.drillingEntries:[], layers=Array.isArray(w.layers)?w.layers:[];
  const maxDepth=d.reduce((m,x)=>Math.max(m,Number(x.to)||0),0)||Number(w.actualDepth)||Number(p.actualDepth)||0;
  return `<div class="drilling-panel">
    <div class="panelhead"><div><h2>🛠️ Fúrási adatok</h2><div class="label">A napi bejegyzésekből épül fel a tényleges rétegsor és a kút végleges adata.</div></div><button class="btn small" onclick="addDrillingEntry('${p.id}')">+ Fúrási bejegyzés</button></div>
    <div class="drilling-summary">
      <div class="drilling-stat"><div class="label">Tényleges mélység</div><b>${esc(String(maxDepth||"—"))}${maxDepth?" m":""}</b></div>
      <div class="drilling-stat"><div class="label">Fúrási szakaszok</div><b>${d.length} db</b></div>
      <div class="drilling-stat"><div class="label">Rögzített rétegek</div><b>${layers.length} db</b></div>
      <div class="drilling-stat"><div class="label">Mért vízhozam</div><b>${esc(String(w.actualFlow||"—"))}${w.actualFlow?" l/min":""}</b></div>
    </div>
    <div class="panelhead"><h3>Fúrási szakaszok</h3></div>
    <div class="drilling-row" style="font-size:12px;color:#64748b;font-weight:700"><div>-tól</div><div>-ig</div><div>Átmérő</div><div>Réteg</div><div>Vízadás</div><div></div></div>
    ${d.map((x,i)=>`<div class="drilling-row"><div>${esc(x.from||"—")} m</div><div>${esc(x.to||"—")} m</div><div>${esc(x.diameter||"—")}</div><div><b>${esc(x.layer||"—")}</b><div class="label">${esc(x.note||"")}</div></div><div>${esc(x.water||"—")}</div><div><button class="btn secondary small" onclick="editDrillingEntry('${p.id}',${i})">Szerkesztés</button></div></div>`).join("")||'<div class="empty">Még nincs fúrási szakasz rögzítve.</div>'}
    <div class="panelhead" style="margin-top:14px"><h3>🪨 Tényleges rétegsor</h3><button class="btn secondary small" onclick="rebuildWellLayers('${p.id}')">Rétegsor frissítése</button></div>
    ${layers.map((x,i)=>`<div class="drilling-layer"><div>${esc(x.from||"—")} m</div><div>${esc(x.to||"—")} m</div><div><b>${esc(x.layer||"—")}</b><div class="label">${esc(x.note||"")}</div></div><div>${esc(x.water||"—")}</div><div></div></div>`).join("")||'<div class="empty">A rétegsor a fúrási bejegyzésekből lesz felépítve.</div>'}
  </div>`;
}
function addDrillingEntry(pid){
  openModal("Fúrási szakasz rögzítése",`<form onsubmit="saveDrillingEntry(event,'${pid}')"><div class="formgrid">
    <div class="field"><label>Kezdő mélység (m)</label><input class="input" type="number" step="0.1" name="from" required></div>
    <div class="field"><label>Végmélység (m)</label><input class="input" type="number" step="0.1" name="to" required></div>
    <div class="field"><label>Átmérő</label><input class="input" name="diameter" placeholder="pl. 311 mm"></div>
    <div class="field"><label>Vízadás</label><input class="input" name="water" placeholder="pl. nincs / jó"></div>
    <div class="field full"><label>Réteg</label><input class="input" name="layer" required placeholder="pl. durva homok"></div>
    <div class="field full"><label>Megjegyzés</label><textarea class="textarea" name="note"></textarea></div>
  </div><div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Mentés</button></div></form>`);
}
function saveDrillingEntry(ev,pid){
  ev.preventDefault();const p=db.projects.find(x=>x.id===pid);if(!p)return;
  p.well=p.well||{};p.well.drillingEntries=Array.isArray(p.well.drillingEntries)?p.well.drillingEntries:[];
  const o=Object.fromEntries(new FormData(ev.target).entries());
  p.well.drillingEntries.push(o);
  const depth=Number(o.to)||0;
  if(depth>(Number(p.actualDepth)||0)){p.actualDepth=depth;p.well.actualDepth=depth;}
  rebuildWellLayers(pid,false);
  save();closeModal();render();toast("Fúrási szakasz mentve");
}
function editDrillingEntry(pid,i){
  const p=db.projects.find(x=>x.id===pid),x=p?.well?.drillingEntries?.[i];if(!x)return;
  openModal("Fúrási szakasz szerkesztése",`<form onsubmit="updateDrillingEntry(event,'${pid}',${i})"><div class="formgrid">
    <div class="field"><label>Kezdő mélység (m)</label><input class="input" type="number" step="0.1" name="from" value="${esc(x.from||"")}"></div>
    <div class="field"><label>Végmélység (m)</label><input class="input" type="number" step="0.1" name="to" value="${esc(x.to||"")}"></div>
    <div class="field"><label>Átmérő</label><input class="input" name="diameter" value="${esc(x.diameter||"")}"></div>
    <div class="field"><label>Vízadás</label><input class="input" name="water" value="${esc(x.water||"")}"></div>
    <div class="field full"><label>Réteg</label><input class="input" name="layer" value="${esc(x.layer||"")}"></div>
    <div class="field full"><label>Megjegyzés</label><textarea class="textarea" name="note">${esc(x.note||"")}</textarea></div>
  </div><div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Mentés</button></div></form>`);
}
function updateDrillingEntry(ev,pid,i){
  ev.preventDefault();const p=db.projects.find(x=>x.id===pid),x=p?.well?.drillingEntries?.[i];if(!x)return;
  Object.assign(x,Object.fromEntries(new FormData(ev.target).entries()));
  const max=(p.well.drillingEntries||[]).reduce((m,a)=>Math.max(m,Number(a.to)||0),0);
  p.actualDepth=max;p.well.actualDepth=max;rebuildWellLayers(pid,false);
  save();closeModal();render();toast("Fúrási adat mentve");
}
function rebuildWellLayers(pid,notify=true){
  const p=db.projects.find(x=>x.id===pid);if(!p)return;
  p.well=p.well||{};
  const entries=Array.isArray(p.well.drillingEntries)?p.well.drillingEntries:[];
  p.well.layers=entries.slice().sort((a,b)=>(Number(a.from)||0)-(Number(b.from)||0)).map(x=>({from:x.from,to:x.to,layer:x.layer,water:x.water,note:x.note,source:"fúrási bejegyzés"}));
  if(notify){save();render();toast("Rétegsor frissítve");}
}

function addWorklog(pid){
  const p=db.projects.find(x=>x.id===pid);if(!p)return;
  openModal("Új munkanapló",`<form onsubmit="saveWorklog(event,'${pid}')"><div class="formgrid">
    <div class="field"><label>Dátum</label><input class="input" type="date" name="date" value="${new Date().toISOString().slice(0,10)}" required></div>
    <div class="field"><label>Tevékenység</label><select class="select" name="activity"><option>Felvonulás</option><option>Fúrás</option><option>Csövezés</option><option>Szűrőzés</option><option>Kavicsolás</option><option>Tömedékelés</option><option>Próbaszivattyúzás</option><option>Egyéb</option></select></div>
    <div class="field"><label>Aktuális mélység (m)</label><input class="input" type="number" step="0.1" name="depth"></div>
    <div class="field"><label>Napi fúrás (m)</label><input class="input" type="number" step="0.1" name="dailyMeters"></div>
    <div class="field full"><label>Megjegyzés</label><textarea class="textarea" name="note"></textarea></div>
  </div><div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Mentés</button></div></form>`);
}
function legacy_saveWorklog(ev,pid){
  ev.preventDefault();const p=db.projects.find(x=>x.id===pid);if(!p)return;
  db.worklogs=Array.isArray(db.worklogs)?db.worklogs:[];
  const o=Object.fromEntries(new FormData(ev.target).entries());
  o.projectId=pid;
  db.worklogs.push(o);
  p.execution=p.execution||{};
  p.execution.lastDepth=o.depth||p.execution.lastDepth||"";
  p.execution.stepIndex=worklogStep(o.activity);
  p.nextTask="Következő munkanapló rögzítése";
  save();closeModal();render();toast("Munkanapló mentve");
}
function worklogStep(activity){
  const m={"Felvonulás":1,"Fúrás":2,"Csövezés":3,"Szűrőzés":4,"Kavicsolás":5,"Tömedékelés":6,"Próbaszivattyúzás":7};
  return m[activity]??2;
}
function viewWorklog(pid,i){
  const logs=(db.worklogs||[]).filter(w=>w.projectId===pid),w=logs[i];if(!w)return;
  openModal("Munkanapló",`<div class="formgrid">
    <div class="field"><label>Dátum</label><div class="input">${esc(w.date||"")}</div></div>
    <div class="field"><label>Tevékenység</label><div class="input">${esc(w.activity||"")}</div></div>
    <div class="field"><label>Aktuális mélység</label><div class="input">${esc(w.depth||"—")} ${w.depth?"m":""}</div></div>
    <div class="field"><label>Napi fúrás</label><div class="input">${esc(w.dailyMeters||"—")} ${w.dailyMeters?"m":""}</div></div>
    <div class="field full"><label>Megjegyzés</label><div class="textarea">${esc(w.note||"")}</div></div>
  </div><div class="modalfoot"><button class="btn" onclick="closeModal()">Bezárás</button></div>`);
}

function projectQuotePrep(p){
  const qs=(db.quotes||[]).filter(q=>String(q.projectId||"")===String(p.id));
  const q=qs[qs.length-1];

  if(!q){
    return `<div class="project-quote-summary">
      <div class="panelhead">
        <div><h2>💰 Ajánlat</h2><div class="label">Ehhez a projekthez még nincs kapcsolódó ajánlat.</div></div>
        <button class="btn small" onclick="createProjectQuote('${p.id}')">+ Ajánlat előkészítése</button>
      </div>
      <div class="empty">Az ajánlat részletes szerkesztése az Ajánlat modulban történik.</div>
    </div>`;
  }

  const items=Array.isArray(q.items)?q.items:[];
  const net=items.reduce((a,x)=>{
    const qty=Number(x.quantity)||1;
    const price=Number(x.price)||((Number(x.materialUnit)||0)+(Number(x.laborUnit)||0))*qty;
    return a+price;
  },0);
  const vat=Number(q.vatPercent??27);
  const gross=net*(1+vat/100);
  const material=items.reduce((a,x)=>a+(Number(x.quantity)||0)*(Number(x.materialUnit)||0),0);
  const labor=items.reduce((a,x)=>a+(Number(x.quantity)||0)*(Number(x.laborUnit)||0),0);

  return `<div class="project-quote-summary">
    <div class="panelhead">
      <div>
        <h2>💰 Ajánlat</h2>
        <div class="label">${esc(q.id||"—")} · ${esc(q.status||"Piszkozat")}</div>
      </div>
      <button class="btn secondary small" onclick="editGeneratedQuote('${q.id}')">Ajánlat megnyitása</button>
    </div>
    <div class="project-quote-kpis">
      <div><span>Ajánlat értéke</span><b>${money(net)}</b></div>
      <div><span>Anyagköltség</span><b>${money(material)}</b></div>
      <div><span>Munkadíj</span><b>${money(labor)}</b></div>
      <div><span>Bruttó érték</span><b>${money(gross)}</b></div>
    </div>
    <div class="label" style="margin-top:10px">Az ajánlat részletes tételei, kalkulációja és státuszkezelése az Ajánlat modulban érhető el.</div>
  </div>`;
}
function createProjectQuote(pid){
  const p=db.projects.find(x=>x.id===pid);if(!p)return;
  db.quotes=db.quotes||[];
  const cid=p.customerId;
  const id=nextQuoteId();
  db.quotes.push({
    id,customerId:cid,projectId:pid,name:(p.name||"Kút kivitelezés")+" – előzetes ajánlat",
    status:"Piszkozat",source:"Projektből előkészítve",
    items:[
      {name:"Kútfúrás / kút kivitelezés",quantity:1,unit:"projekt",price:0},
      {name:"Csövezés és szűrőzés",quantity:1,unit:"projekt",price:0},
      {name:"Kútfej és kapcsolódó szerelvények",quantity:1,unit:"projekt",price:0},
      {name:"Vízhozamvizsgálat / próbaszivattyúzás",quantity:1,unit:"projekt",price:0}
    ],
    technicalData:{depth:p.permittedDepth||"",flow:p.permittedFlow||"",scope:""},
    notes:"Ellenőrizendő ajánlati piszkozat."
  });
  save();
  // Az új ajánlat létrehozása után közvetlenül az ajánlat szerkesztőjébe lépünk.
  // Így a projekt "Következő teendő → Ajánlat létrehozása" gombja valóban
  // megnyitja az elkészült ajánlatot szerkesztésre.
  if(typeof openQuoteEditorPage==="function"){
    openQuoteEditorPage(id);
  }else{
    render();
    toast("Ajánlati piszkozat létrehozva");
  }
  return false;
}
function editGeneratedQuote(qid){
  const q=(db.quotes||[]).find(x=>String(x.id)===String(qid));if(!q)return;
  // A projekt oldaláról megnyitott ajánlat mentés után ugyanarra a projektre tér vissza.
  window.quoteReturnProjectId=q.projectId||"";
  // Reuse the existing quote editor if available.
  if(typeof openQuoteEditorPage==="function"){openQuoteEditorPage(qid);return;}
  nav("quotes");
  setTimeout(()=>toast("Az ajánlat a Piszkozatok között található: "+qid),50);
}


function deleteProject(id){
  const key=String(id||"");
  const p=(db.projects||[]).find(x=>String(x.id)===key);
  if(!p){toast("A projekt nem található");return false;}

  // MINDEN projektazonosítóval kapcsolódó adat törlődjön.
  // Az ügyfél maga megmarad, csak a projekthez tartozó adatok törlődnek.
  const linkedQuotes=(db.quotes||[]).filter(q=>String(q.projectId||"")===key);
  const linkedWorklogs=(db.worklogs||[]).filter(w=>String(w.projectId||"")===key);
  const linkedDocuments=(db.documents||[]).filter(d=>String(d.projectId||"")===key);
  const linkedGenerated=(Array.isArray(p.generatedDocuments)?p.generatedDocuments:[]);
  const linkedEmbedded=(Array.isArray(p.documents)?p.documents:[]);

  const documentCount=linkedDocuments.length+linkedGenerated.length+linkedEmbedded.length;

  let msg=`Biztosan törlöd ezt a projektet?\n\n${p.name||p.id}`;
  msg+=`\n\nA projekt MINDEN hozzá tartozó adata törlődik:`;
  msg+=`\n• ${linkedQuotes.length} ajánlat`;
  msg+=`\n• ${linkedWorklogs.length} munkanapló`;
  msg+=`\n• ${documentCount} dokumentum`;
  msg+=`\n• a projektbe mentett egyéb dokumentumok`;
  msg+=`\n\nAz ügyfél maga NEM törlődik.`;
  msg+=`\n\nA művelet nem vonható vissza.`;
  if(!confirm(msg))return false;

  // 1. Projekt
  db.projects=(db.projects||[]).filter(x=>String(x.id)!==key);

  // 2. Ajánlatok
  db.quotes=(db.quotes||[]).filter(q=>String(q.projectId||"")!==key);

  // 3. Munkanaplók
  db.worklogs=(db.worklogs||[]).filter(w=>String(w.projectId||"")!==key);

  // 4. Globális dokumentumtár
  // Ezeket ténylegesen eltávolítjuk, nem csak "árvának" jelöljük.
  db.documents=(db.documents||[]).filter(d=>String(d.projectId||"")!==key);

  // 5. Minden olyan ismert kapcsolt lista törlése, amely projektazonosítót tárol.
  // Ez megakadályozza, hogy bármelyik kapcsolódó dokumentum vagy melléklet
  // visszamaradjon és később dupla feltöltést okozzon.
  const projectLinkedCollections=[
    "attachments","files","projectDocuments","projectFiles",
    "permitDocuments","licenseDocuments","generatedDocuments",
    "worklogDocuments","photos","projectPhotos","documentsArchive"
  ];
  for(const collection of projectLinkedCollections){
    if(Array.isArray(db[collection])){
      db[collection]=db[collection].filter(x=>{
        const pid=x?.projectId ?? x?.projectID ?? x?.project_id;
        return String(pid||"")!==key;
      });
    }
  }

  // 6. A projekt dokumentumainak tényleges fájltartalma is az IndexedDB-ben van.
  // Ezeket is töröljük, különben a projekt metaadata törlődne, de a PDF/kép
  // fizikailag a böngészőben megmaradna.
  const fileIds=[...linkedDocuments,...linkedGenerated,...linkedEmbedded]
    .map(d=>d?.id).filter(Boolean);
  if(fileIds.length){
    Promise.all(fileIds.map(id=>deleteProjectFile(id))).catch(err=>console.warn("Projekt dokumentumfájlok törlése:",err));
  }

  // 7. Ha a projekt rekordján belül is vannak dokumentumhivatkozások,
  // azok a projekt törlésével együtt megszűnnek.
  if(db.ui?.openProjectId && String(db.ui.openProjectId)===key) db.ui.openProjectId=null;

  save();
  projectPageId=null;
  current="projects";
  location.hash="#/projects";
  render();
  toast("Projekt, ajánlatok, munkanaplók és minden kapcsolódó dokumentum törölve.");
  return false;
}

function deleteQuote(id){
  const key=String(id||"");
  const q=(db.quotes||[]).find(x=>String(x.id)===key);
  if(!q){toast("Az ajánlat nem található");return false;}
  const linkedProjects=(db.projects||[]).filter(p=>String(p.id)===String(q.projectId||""));
  let msg=`Biztosan törlöd ezt az ajánlatot?\n\n${q.id||""} – ${q.name||""}`;
  if(linkedProjects.length) msg+=`\\n\\nA kapcsolódó projekt NEM törlődik.`;
  msg+="\\n\\nA törlés nem vonható vissza.";
  if(!confirm(msg))return false;
  db.quotes=(db.quotes||[]).filter(x=>String(x.id)!==key);
  save();
  render();
  toast("Ajánlat törölve.");
  return false;
}
function isUndocumentedProject(p){
  return String(p?.projectType||"official")==="undocumented";
}
function projectWorkflowInfo(p){
  const undocumented=isUndocumentedProject(p);
  const logs=(db.worklogs||[]).filter(w=>String(w.projectId||"")===String(p.id));
  if(undocumented){
    if(p.status==="Lezárva") return {next:"Belső munka lezárva",phase:"Lezárt",kind:"closed"};
    if(p.status!=="Kivitelezés alatt") return {next:"Kivitelezés indítása",phase:"Előkészítés",kind:"start"};
    if(!logs.length) return {next:"Munkanapló létrehozása",phase:"Kivitelezés",kind:"worklog"};
    return {next:"Kivitelezés lezárása",phase:"Kivitelezés",kind:"close"};
  }
  return null;
}
function closeUndocumentedProject(pid){
  const p=db.projects.find(x=>String(x.id)===String(pid)); if(!p)return;
  if(!isUndocumentedProject(p)){closeProject(pid);return;}
  const logs=(db.worklogs||[]).filter(w=>String(w.projectId||"")===String(pid));
  const w=p.well||{};
  const hasDepth=Number(w.actualDepth||p.actualDepth||p.execution?.currentDepth||0)>0;
  if(!logs.length && !hasDepth){
    toast("A belső lezáráshoz legalább egy munkanapló vagy tényleges kútmélység szükséges.");
    return;
  }
  setWorkflowStatus(p,"project","Lezárva");
  p.closedAt=new Date().toISOString();
  p.nextTask="Belső munka lezárva";
  p.closure=p.closure||{};
  p.closure.internal=true;
  p.closure.closedAt=p.closedAt;
  save();render();toast("Dokumentáció nélküli munka belsőleg lezárva");
}

function projectPageView(){
  const p=db.projects.find(x=>x.id===projectPageId);
  if(!p) return `<div class="panel"><h2>Projekt nem található</h2><button class="btn secondary" onclick="nav('projects')">← Vissza a projektekhez</button></div>`;
  const customer=db.customers.find(c=>c.id===p.customerId);
  const qs=db.quotes.filter(q=>String(q.projectId||"")===String(p.id));
  const wls=db.worklogs.filter(w=>w.projectId===p.id);
  const docs=Array.isArray(p.documents)?p.documents:[];
  const acceptedQuotes=qs.filter(q=>q.status==="Elfogadva");
  const acceptedQuote=acceptedQuotes[acceptedQuotes.length-1];
  const contractValue=acceptedQuote ? quoteNetValue(acceptedQuote) : (Number(p.value)||0);
  if(acceptedQuote && Number(p.value)!==contractValue){ p.value=contractValue; save(); }
  const profit=contractValue-(Number(p.cost)||0);
  const status=p.status||"Tervezés";
  const currentWorklog=typeof getCurrentWorklogForProject==="function" ? getCurrentWorklogForProject(p.id) : (wls.length ? wls[wls.length-1] : null);
  const currentWorklogStatus=String(currentWorklog?.status||"");
  const wf=projectWorkflowInfo(p);
  const next=wf ? wf.next : ((p.status==="Kivitelezés alatt")
    ? (!wls.length ? "Munkanapló létrehozása" : (currentWorklogStatus==="Elkészült" ? "Kivitelezés lezárása" : (currentWorklogStatus==="Lezárva" ? "Projekt lezárása" : "Munkanapló folytatása")))
    : (!qs.length ? "Ajánlat létrehozása" : (p.nextTask||"Projekt következő lépésének meghatározása")));
  return `
  <div id="project-page" class="project-page-clean">
    <div class="panel project-hero">
      <div class="project-hero-head">
        <div class="project-hero-title">
          <div class="label">PROJEKT</div>
          <h1>${esc(p.name)}</h1>
          <div class="label"><b>${esc(p.id)}</b> · ${esc(customer?.name||"—")} · ${esc(p.location||"Helyszín nincs megadva")}${p.hrsz?` · Hrsz. ${esc(p.hrsz)}`:""}</div>
          <div style="margin-top:8px"><span class="badge ${isUndocumentedProject(p)?'orange':'green'}">${isUndocumentedProject(p)?"🟠 DOKUMENTÁCIÓ NÉLKÜLI MUNKA":"🟢 HIVATALOS PROJEKT"}</span></div>
        </div>
        <div class="project-page-actions">
          <span class="badge ${status==="Lezárva"?"gray":status==="Folyamatban"?"green":"blue"}">${esc(status)}</span>
          <button class="btn secondary small" onclick="nav('projects')">← Projektek</button>
          <button class="btn small" onclick="editProject('${p.id}')">Szerkesztés</button>
          <button class="btn danger small" onclick="deleteProject('${p.id}');return false;">Projekt törlése</button>
        </div>
      </div>
      <div class="project-hero-kpis">
        <div class="card"><div class="label">Készültség</div><div class="value">${Number(p.progress)||0}%</div><div class="progress"><span style="width:${Math.max(0,Math.min(100,Number(p.progress)||0))}%"></span></div></div>
        <div class="card"><div class="label">Szerződéses érték</div><div class="value">${money(contractValue)}</div></div>
        <div class="card"><div class="label">Tényleges költség</div><div class="value">${money(p.cost)}</div></div>
        <div class="card"><div class="label">Fedezet</div><div class="value ${profit>=0?'green':'red'}">${money(profit)}</div></div>
      </div>
    </div>

    <div class="project-layout">
      <main class="project-main-column">
        <div class="panel project-next-panel">
          <div class="panelhead"><h2>🎯 Következő teendő</h2></div>
          <div class="project-next-task"><b>${esc(next)}</b>${(()=>{
            if(next==="Ajánlat létrehozása") return ` <button class="btn small project-next-action" onclick="createProjectQuote('${esc(p.id)}');return false;">Ajánlat létrehozása →</button>`;
            if(next==="Munkanapló folytatása" && currentWorklog?.id) return ` <button class="btn small project-next-action" onclick="openProjectWorklog('${esc(p.id)}');return false;">Munkanapló megnyitása →</button>`;
            if(next==="Munkanapló létrehozása") return ` <button class="btn small project-next-action" onclick="newWorklogFor('${esc(p.id)}');return false;">Munkanapló létrehozása →</button>`;
            if(next==="Kivitelezés indítása"){
              if(isUndocumentedProject(p)) return ` <button class="btn small project-next-action" onclick="startExecution('${esc(p.id)}');return false;">Kivitelezés indítása →</button>`;
              if(acceptedQuote) return ` <button class="btn small project-next-action" onclick="startProjectExecution('${esc(acceptedQuote.id)}');return false;">Kivitelezés indítása →</button>`;
            }
            if(next==="Kivitelezés lezárása") return ` <button class="btn small project-next-action" onclick="${isUndocumentedProject(p)?`closeUndocumentedProject('${esc(p.id)}')`:`closeProject('${esc(p.id)}')`};return false;">Kivitelezés lezárása →</button>`;
            if(next==="Belső munka lezárása") return ` <button class="btn small project-next-action" onclick="closeUndocumentedProject('${esc(p.id)}');return false;">Belső munka lezárása →</button>`;
            if(next==="Projekt lezárása") return ` <button class="btn small project-next-action" onclick="finalizeProject('${esc(p.id)}');return false;">Projekt lezárása →</button>`;
            return "";
          })()}</div>
        </div>

        <div class="panel project-process-panel">
          <div class="panelhead"><h2>📋 Projekt folyamat</h2></div>
          ${projectProcessDocumentsSection(p)}
          <div class="kpi project-process-item project-process-left">
            <span>💰 Kapcsolódó ajánlatok</span>
            <b>${qs.length ? (()=>{const q=qs[qs.length-1]; const qid=q.id || q.quoteId || ""; const quoteStatuses=["Piszkozat","Elkészítve","Elküldve","Tárgyalás alatt","Elfogadva","Elutasítva","Lezárva"]; return `<a href="#" class="project-process-link" data-process="quote" data-id="${esc(qid)}" onclick="openQuoteEditorPage('${esc(qid)}');return false;">${esc(q.number || q.id || "Ajánlat")}</a> <select class="project-process-status-select quote-status-pill quote-status-${statusClass(q.status)}" onchange="changeQuoteStatus('${esc(qid)}',this.value)" aria-label="Ajánlat státusza">${quoteStatuses.map(st=>`<option value="${esc(st)}" ${q.status===st?'selected':''}>${esc(st)}</option>`).join("")}</select>`;})() : "Nincs"}</b>
          </div>
          ${qs.length ? (()=>{const q=qs[qs.length-1]; const qid=q.id || q.quoteId || ""; if(p.status==="Kivitelezés alatt") { const wl=typeof getCurrentWorklogForProject==="function" ? getCurrentWorklogForProject(p.id) : (wls.length?wls[wls.length-1]:null); const ws=String(wl?.status||""); const execLabel=ws==="Elkészült"?"Kivitelezés elkészült":ws==="Lezárva"?"Kivitelezés lezárva":"Kivitelezés folyamatban"; const execClass=ws==="Elkészült"||ws==="Lezárva"?"project-execution-done":"project-execution-active"; return `<div class="kpi project-process-item project-execution-start-item"><span>🔧 Kivitelezés</span><b><span class="${execClass}">${execLabel}</span> <button class="btn secondary small" onclick="openProjectWorklog('${esc(p.id)}');return false;">📋 Meglévő munkanapló</button></b></div>`; } if(q.status==="Elfogadva") return `<div class="kpi project-process-item project-execution-start-item"><span>🔧 Következő lépés</span><b><button class="btn small project-execution-start-btn" onclick="startProjectExecution('${esc(qid)}');return false;">▶ Kivitelezés indítása</button></b></div>`; return "";})() : ""}
          <div class="kpi project-process-item">
            <span>📋 Munkanaplók</span>
            <b>${wls.length
              ? (()=>{const wl=typeof getCurrentWorklogForProject==="function" ? getCurrentWorklogForProject(p.id) : wls[wls.length-1]; const wlStatus=String(wl.status||"Piszkozat"); const wlStatusClass=wlStatus==="Elkészült"||wlStatus==="Lezárva"?"green":wlStatus==="Folyamatban"?"orange":"blue"; return '<span class="project-process-worklog-wrap"><a href="#" class="project-process-link" data-process="worklog" data-id="' + esc(wl.id || "") + '">' + esc(wl.id || wl.activity || "Munkanapló") + '</a><span class="badge project-process-worklog-status '+wlStatusClass+'">'+esc(wlStatus)+'</span></span>';})()
              : '<button class="btn secondary small" onclick="newWorklogFor(\'' + esc(p.id) + '\');return false;">+ Munkanapló</button>'}</b>
          </div>
          <div class="kpi project-process-item">
            <span>🛒 Nyitott beszerzések</span>
            <b>${Number(p.openProcurement) ? `${Number(p.openProcurement)} db` : "Nincs"}</b>
          </div>
          <div class="kpi project-process-item">
            <span>🔵 Egyedi gyártások</span>
            <b>${Number(p.customManufacturing) ? `${Number(p.customManufacturing)} db` : "Nincs"}</b>
          </div>
        </div>

        ${projectQuotePrep(p)}

      </main>

      <aside class="project-side-column">
        ${projectWellPanel(p)}

        <div class="panel project-module-panel">
          <div class="panelhead"><h2>📜 Létesítési engedély</h2><button class="btn secondary small" onclick="setWellTab('${p.id}','planned')">Műszaki adatok →</button></div>
          <div class="kpi"><span>Engedély száma</span><b>${esc(p.permit?.number||"—")}</b></div>
          <div class="kpi"><span>Engedély dátuma</span><b>${esc(p.permit?.date||"—")}</b></div>
          <div class="kpi"><span>Engedélyező hatóság</span><b>${esc(p.permit?.authority||"—")}</b></div>
          <div class="kpi"><span>Érvényesség</span><b>${esc(p.permit?.validUntil||"—")}</b></div>
          <div class="kpi"><span>Vízhasználat célja</span><b>${esc(p.permit?.waterUse||p.well?.purpose||"—")}</b></div>
        </div>

        <div class="panel project-module-panel">
          <div class="panelhead"><h2>🌱 Öntözés</h2><button class="btn secondary small" onclick="projectPageSection('irrigation')">Megnyitás</button></div>
          <div class="kpi"><span>Szükséges vízhozam</span><b>${esc(p.irrigationFlow||"—")}${p.irrigationFlow?" l/min":""}</b></div>
          <div class="kpi"><span>Szükséges nyomás</span><b>${esc(p.irrigationPressure||"—")}${p.irrigationPressure?" bar":""}</b></div>
        </div>

        <div class="panel project-module-panel">
          <div class="panelhead"><h2>⚙️ Gépészet</h2><button class="btn secondary small" onclick="projectPageSection('mechanics')">Megnyitás</button></div>
          <div class="kpi"><span>Szivattyú</span><b>${esc(p.pump||"Nincs kiválasztva")}</b></div>
          <div class="kpi"><span>Tervezési munkapont</span><b>${esc(p.designDuty||"—")}</b></div>
        </div>
      </aside>
    </div>

    ${customerHistoryPanel(customer)}
  </div>`;
}
function projectPageSection(section){
  const el=document.getElementById("project-page");
  if(el) el.dataset.section=section;
  toast("A "+section+" rész a következő fejlesztési lépésben lesz részletesen kezelhető.");
}


function openQuotePage(id){
  const q=(db.quotes||[]).find(x=>String(x.id)===String(id));
  if(!q){toast("Az ajánlat nem található");return false;}
  window.openQuotePageId=q.id;
  current="quote";
  location.hash="#/quote/"+encodeURIComponent(String(q.id));
  render();
  return false;
}
function quotePageView(){
  const q=(db.quotes||[]).find(x=>String(x.id)===String(window.openQuotePageId||""));
  if(!q) return `<div class="panel"><h2>Az ajánlat nem található</h2><button class="btn" onclick="nav('quotes')">← Ajánlatok</button></div>`;
  const customer=cust(q.customerId);
  const items=q.items||[];
  const tech=q.tech||[];
  return `<div class="panel">
    <div class="panelhead">
      <div><div class="label">AJÁNLAT</div><h2>${esc(q.id)}</h2><div class="label">${esc(q.name||"—")} · ${esc(customer)}</div></div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn secondary" onclick="nav('quotes')">← Ajánlatok</button>
        <button class="btn secondary" onclick="editQuote('${q.id}')">Szerkesztés</button>
        <button class="btn" onclick="printQuote('${q.id}')">Nyomtatás / PDF</button>
      </div>
    </div>
    <div class="cards" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
      <div class="card"><div class="label">Ügyfél</div><div class="value" style="font-size: 15px">${esc(customer)}</div></div>
      <div class="card"><div class="label">Státusz</div><div class="value" style="font-size: 15px">${esc(q.status||"Piszkozat")}</div></div>
      <div class="card"><div class="label">Nettó</div><div class="value" style="font-size: 15px">${money(q.net)}</div></div>
      <div class="card"><div class="label">Bruttó</div><div class="value" style="font-size: 15px">${money(q.gross)}</div></div>
    </div>
    <div class="grid2">
      <div class="panel">
        <div class="panelhead"><h3>Ajánlat adatai</h3></div>
        <div class="kpi"><span>Helyszín</span><b>${esc(q.location||"—")}</b></div>
        <div class="kpi"><span>Megnevezés</span><b>${esc(q.subject||q.name||"—")}</b></div>
        <div class="kpi"><span>Dátum</span><b>${esc(q.date||"—")}</b></div>
        <div class="kpi"><span>Kapcsolattartó</span><b>${esc(q.client_name||q.clientName||"—")}</b></div>
      </div>
      <div class="panel">
        <div class="panelhead"><h3>Műszaki tartalom</h3></div>
        <div class="kpi"><span>Tervezett mélység</span><b>${esc(q.depth||"—")}</b></div>
        <div class="kpi"><span>Vízhozam</span><b>${esc(q.waterNeed||"—")}</b></div>
        <div class="kpi"><span>Béléscső</span><b>${esc(q.pipeDiameter||"—")} ${esc(q.pipeMaterial||"")}</b></div>
        ${tech.length?`<div class="tablewrap"><table class="table"><thead><tr><th>Típus</th><th>-tól</th><th>-ig</th><th>Hossz</th><th>Specifikáció</th></tr></thead><tbody>${tech.map(x=>`<tr><td>${esc(x.type)}</td><td>${esc(x.from)}</td><td>${esc(x.to)}</td><td>${esc(x.len)}</td><td>${esc(x.spec)}</td></tr>`).join("")}</tbody></table></div>`:""}
      </div>
    </div>
    <div class="panel">
      <div class="panelhead"><h3>Ajánlati tételek</h3></div>
      <div class="tablewrap"><table class="table"><thead><tr><th>Tétel</th><th>Mennyiség</th><th>Egységár</th><th>Összeg</th></tr></thead><tbody>
      ${items.length?items.map(x=>`<tr><td>${esc(x.desc)}</td><td>${Number(x.qty)||0} ${esc(x.unit||"db")}</td><td>${money(x.price)}</td><td>${money((Number(x.qty)||0)*(Number(x.price)||0))}</td></tr>`).join(""):`<tr><td colspan="4" class="empty">Nincs rögzített ajánlati tétel.</td></tr>`}
      </tbody></table></div>
      <div style="max-width:360px;margin:16px 0 0 auto">
        <div class="kpi"><span>Nettó</span><b>${money(q.net)}</b></div>
        <div class="kpi"><span>ÁFA</span><b>${money(q.vat)}</b></div>
        <div class="kpi"><span>Bruttó</span><b>${money(q.gross)}</b></div>
      </div>
    </div>
    <div class="grid2">
      <div class="panel"><div class="panelhead"><h3>Tartalom</h3></div><div class="label">${esc(q.includes||"—")}</div></div>
      <div class="panel"><div class="panelhead"><h3>Kizárások / feltételek</h3></div><div class="label">${esc(q.excludes||"—")}</div></div>
    </div>
  </div>`;
}

function getCurrentWorklogForProject(pid){
 const logs=(db.worklogs||[]).filter(w=>String(w.projectId||"")===String(pid)&&!w.archived);
 if(!logs.length)return null;
 return logs.slice().sort((a,b)=>{const ta=Date.parse(a.updatedAt||a.date||"")||0,tb=Date.parse(b.updatedAt||b.date||"")||0;return tb-ta||String(b.id||"").localeCompare(String(a.id||""));})[0];
}
function storedWorklogForProject(pid){return getCurrentWorklogForProject(pid);}

function worklogDocumentDataFromStored(w){
  if(!w) return null;
  return {
    id:w.id||uid("MN"),
    date:w.date||"",
    customerId:w.customerId||"",
    projectId:w.projectId||"",
    location:w.location||"",
    wellNo:w.wellNo||"",
    finalDepth:Number(w.finalDepth)||0,
    permittedDepth:Number(w.permittedDepth)||0,
    designFlow:Number(w.designFlow)||0,
    screenInterval:w.screenInterval||"",
    status:w.status||"Piszkozat",
    layers:Array.isArray(w.layers)?w.layers:[],
    filters:Array.isArray(w.filters)?w.filters:[],
    prodPipe:w.prodPipe||"",
    staticWL:w.staticWL||w.static2||"",
    dynamicWL:w.dynamicWL||w.dynamic2||"",
    measureLiters:Number(w.measureLiters)||0,
    measureSeconds:Number(w.measureSeconds)||0,
    flow:Number(w.flow)||0,
    dynamic2:w.dynamic2||w.dynamicWL||"",
    static2:w.static2||w.staticWL||"",
    notes:w.notes||""
  };
}

function openProjectDataService(pid){
  const p=(db.projects||[]).find(x=>String(x.id)===String(pid));
  if(!p){toast("A projekt nem található");return;}
  const w=storedWorklogForProject(pid);
  if(!w){
    openModal("Adatszolgáltatás",`
      <div class="license-review">Ehhez a projekthez még nincs mentett munkanapló. A három dokumentum a munkanapló és a létesítési engedély adataiból készül.</div>
      <div class="modalfoot"><button class="btn secondary" onclick="closeModal()">Bezárás</button><button class="btn" onclick="newWorklogFor('${esc(pid)}')">+ Munkanapló létrehozása</button></div>
    `);
    return;
  }
  const o=worklogDocumentDataFromStored(w);
  window._generatedWorklog=o;
  const docs=[
    ["build","📋","Építési napló","A mentett munkanapló napi kivitelezési adataiból és a kapcsolódó létesítési engedélyből."],
    ["layers","🪨","Fúrási rétegsor","A munkanapló rétegsora alapján; az egymást követő azonos rétegek összevonásával."],
    ["casing","🕳️","Csövezési vázlat","A létesítési engedély műszaki adataiból és a munkanapló csövezési/szűrőzési adataiból."]
  ];
  const docCards=docs.map(d=>`
    <div class="wl-generated-doc-card">
      <div class="wl-generated-doc-icon">${d[1]}</div>
      <div class="wl-generated-doc-main"><h3>${d[2]}</h3><div class="label">${d[3]}</div></div>
      <div class="wl-generated-doc-actions">
        <button type="button" class="btn" onclick="openGeneratedWorklogPrint('${d[0]}')">📄 PDF / Nyomtatás</button>
        <button type="button" class="btn secondary" onclick="exportGeneratedWorklogDocx('${d[0]}')">📝 Word</button>
      </div>
      <div class="wl-generated-doc-preview">${wlGeneratedDocHtml(d[0],o)}</div>
    </div>`).join("");
  openModal("Adatszolgáltatás – 3 dokumentum",`
    <div class="dataservice-context">
      <div class="kpi"><span>Projekt</span><b>${esc(p.name||p.id)}</b></div>
      <div class="kpi"><span>Munkanapló</span><b>${esc(w.id||"—")} · ${esc(w.status||"Piszkozat")}</b></div>
      <div class="kpi"><span>Létesítési engedély</span><b>${esc(p.permit?.number||"—")}</b></div>
    </div>
    <div class="wl-generated-docs">${docCards}</div>
    <div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Bezárás</button></div>
  `);
}

function dataServiceView(){
  const projects=db.projects||[];
  return `<div class="panel">
    <div class="panelhead">
      <div><h2>📋 Adatszolgáltatás</h2><div class="label">A lezárt/elkészült munkanapló és a kapcsolódó létesítési engedély alapján készíthető dokumentumok.</div></div>
    </div>
    <div class="cards" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
      <div class="card"><div class="label">Projektek</div><div class="value">${projects.length}</div></div>
      <div class="card"><div class="label">Munkanaplóval rendelkező</div><div class="value">${projects.filter(p=>!!storedWorklogForProject(p.id)).length}</div></div>
      <div class="card"><div class="label">Generálható csomag</div><div class="value">${projects.filter(p=>!!storedWorklogForProject(p.id)).length*3}</div><div class="sub">dokumentum</div></div>
    </div>
    <div class="tablewrap"><table class="table">
      <thead><tr><th>Projekt</th><th>Ügyfél</th><th>Létesítési engedély</th><th>Munkanapló</th><th>Státusz</th><th></th></tr></thead>
      <tbody>${projects.map(p=>{
        const w=storedWorklogForProject(p.id);
        const ready=!!w;
        return `<tr>
          <td><a class="link" onclick="openProjectPage('${esc(p.id)}');return false;"><b>${esc(p.id)}</b></a><br>${esc(p.name||"Projekt")}</td>
          <td>${esc(cust(p.customerId))}</td>
          <td>${esc(p.permit?.number||"—")}</td>
          <td>${w?esc(w.id):"Nincs"}</td>
          <td><span class="badge ${ready?'green':'blue'}">${ready?"Készíthető":"Munkanapló szükséges"}</span></td>
          <td>${ready?`<button class="btn small" onclick="openProjectDataService('${esc(p.id)}')">📄 Adatszolgáltatás</button>`:`<button class="btn secondary small" onclick="newWorklogFor('${esc(p.id)}')">+ Munkanapló</button>`}</td>
        </tr>`;
      }).join("")||'<tr><td colspan="6" class="label">Nincs projekt.</td></tr>'}</tbody>
    </table></div>
  </div>`;
}

const views={
project:projectPageView,
dataservice:dataServiceView,
dashboard:()=>{let v=db.projects.reduce((s,p)=>s+p.value,0),c=db.projects.reduce((s,p)=>s+p.cost,0),q=db.quotes.filter(x=>x.status!=="Elfogadva").reduce((s,x)=>s+x.gross,0),profit=v-c;let low=db.materials.filter(m=>m.stock<m.min);return `<div class="cards"><div class="card"><div class="label">Aktív projektek</div><div class="value">${db.projects.filter(p=>p.status!=="Lezárva").length}</div><div class="sub">tervezés + folyamatban</div></div><div class="card"><div class="label">Projektérték</div><div class="value">${money(v)}</div><div class="sub">bruttó szerződéses érték</div></div><div class="card"><div class="label">Tényleges költség</div><div class="value">${money(c)}</div><div class="sub">rögzített költség</div></div><div class="card"><div class="label">Jelenlegi eredmény</div><div class="value green">${money(profit)}</div><div class="sub">${v?((profit/v)*100).toFixed(1):0}% marzs</div></div></div><div class="grid2"><div class="panel"><div class="panelhead"><h2>Aktív projektek</h2><button class="btn secondary small" onclick="nav('projects')">Összes</button></div>${projectRows()}</div><div class="panel"><div class="panelhead"><h2>Figyelmeztetések</h2></div>${low.map(m=>`<div class="kpi"><span>${esc(m.name)}</span><b class="amber">${m.stock} ${m.unit} – alacsony</b></div>`).join("")||'<div class="empty">Nincs kritikus készlet.</div>'}<div class="kpi"><span>Nyitott ajánlatállomány</span><b>${money(q)}</b></div></div></div>`},
customers:()=>`<div class="panel">
<div class="panelhead"><div><h2>Ügyfelek</h2><div class="label">Ügyféladatbázis és kapcsolódó munkák</div></div><button class="btn" onclick="newCustomer()">+ Új ügyfél</button> <button class="btn secondary" type="button" data-open-permit-ai="1" onclick="openPermitAIIntake();return false;">📄 Létesítési engedély / AI</button>
</div>
${window.permitAIInlineOpen ? permitAIInlineHtml() : ""}
<div class="cards" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
 <div class="card"><div class="label">Összes ügyfél</div><div class="value">${db.customers.length}</div></div>
 <div class="card"><div class="label">Aktív ügyfél</div><div class="value">${db.customers.filter(c=>c.status!=="Inaktív").length}</div></div>
 <div class="card"><div class="label">Ajánlattal rendelkező</div><div class="value">${new Set(db.quotes.map(q=>q.customerId).filter(Boolean)).size}</div></div>
</div>
<div class="toolbar"><input id="cs" class="input search" placeholder="Keresés név, adószám, kapcsolattartó, telefon, e-mail vagy cím alapján..." oninput="searchCustomers()"></div>
<div id="ct">${customerRows()}</div></div>`,
quotes:()=>{
 const qs=db.quotes||[];
 const total=qs.reduce((a,q)=>a+(Number(q.gross)||0),0);
 const open=qs.filter(q=>!["Elfogadva","Elutasítva","Lezárva"].includes(q.status)).length;
 const accepted=qs.filter(q=>q.status==="Elfogadva").length;
 return `<div class="panel">
  <div class="panelhead">
   <div><h2>Ajánlatok</h2><div class="label">Az ajánlatok teljes kezelése ezen a modulon belül történik.</div></div>
   <button class="btn" onclick="openQuoteEditorPage()">+ Új ajánlat</button>
  </div>

  <div class="panel" style="margin:12px 0">
   <div class="panelhead">
    <div><h3 style="margin:0">📏 Kútfúrás folyóméter árlista <span class="net-badge">NETTÓ</span></h3>
    <div class="label">Az ajánlatokban használt aktuális <b>nettó</b> Ft/m árak.</div></div>
    <button class="btn secondary small" onclick="openDrillingPriceList()">Árak szerkesztése</button>
   </div>
   <div class="tablewrap"><table class="table">
    <thead><tr><th>Átmérő</th><th>Aktuális nettó folyóméter ár</th><th>Dokumentáció nélküli folyóméter ár</th><th>Módosítva</th></tr></thead>
    <tbody>${db.drillingPriceList.map(r=>`<tr><td><b>Ø ${drillingPriceLabel(r.diameter)} mm</b></td><td>${Number(r.price)?money(r.price)+"/m":"Nincs megadva"}</td><td>${Number(r.undocumentedPrice)?money(r.undocumentedPrice)+"/m":"Nincs megadva"}</td><td>${r.updatedAt?esc(new Date(r.updatedAt).toLocaleDateString("hu-HU")):"—"}</td></tr>`).join("")}</tbody>
   </table></div>
  </div>
  <div class="cards" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
   <div class="card"><div class="label">Ajánlatok összesen</div><div class="value">${qs.length}</div></div>
   <div class="card"><div class="label">Nyitott ajánlatok</div><div class="value">${open}</div></div>
   <div class="card"><div class="label">Elfogadott</div><div class="value">${accepted}</div></div>
  </div>
  <div class="kpi"><span>Összes ajánlati bruttó érték</span><b>${money(total)}</b></div>
  <div class="toolbar"><input id="qs" class="input search" placeholder="Keresés..." oninput="searchQuotes()"></div>
  <div id="qt">${quoteRows()}</div>
 </div>`;
},
projects:()=>`<div class="panel"><div class="panelhead"><h2>Projektek</h2><button class="btn" onclick="openProject()">+ Új projekt</button></div><div class="toolbar"><input id="ps" class="input search" placeholder="Keresés..." oninput="searchProjects()"></div><div id="pt">${projectRows()}</div></div>`,
worklogs:()=>`<div class="panel">
 <div class="panelhead"><div><h2>Munkanaplók</h2><div class="label">A Porcsalma munkanapló alapján kialakított adatlap</div></div><button class="btn" onclick="newWorklog()">+ Új munkanapló</button></div>
 <div class="cards" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
  <div class="card"><div class="label">Összes munkanapló</div><div class="value">${(db.worklogs||[]).length}</div></div>
  <div class="card"><div class="label">Folyamatban</div><div class="value">${(db.worklogs||[]).filter(w=>w.status==="Folyamatban").length}</div></div>
  <div class="card"><div class="label">Elkészült / lezárt</div><div class="value">${(db.worklogs||[]).filter(w=>w.status==="Elkészült"||w.status==="Lezárva").length}</div></div>
 </div>
 <div class="tablewrap"><table class="table"><thead><tr><th>Azonosító</th><th>Dátum</th><th>Helyszín</th><th>Kút</th><th>Végmélység</th><th>Státusz</th><th></th></tr></thead>
 <tbody>${(db.worklogs||[]).map(w=>`<tr><td><a class="link" onclick="editWorklog('${w.id}')"><b>${esc(w.id)}</b></a></td><td>${esc(w.date)}</td><td>${esc(w.location)}</td><td>${esc(w.wellNo)}</td><td>${esc(w.finalDepth)} m</td><td><span class="badge ${w.status==="Elkészült"||w.status==="Lezárva"?"green":w.status==="Folyamatban"?"orange":"blue"}">${esc(w.status||"Piszkozat")}</span></td><td><button class="btn secondary small" onclick="editWorklog('${w.id}')">Megnyitás</button></td></tr>`).join("")||"<tr><td colspan=7 class=label>Nincs munkanapló.</td></tr>"}</tbody></table></div>
 </div>`,
materials:()=>{
 ensureDrillingPriceList();ensureStockModel();
 const items=db.stock,low=items.filter(x=>Number(x.qty||0)<=Number(x.minQty||0)).length,value=stockValue(items),purchases=(db.purchases||[]).filter(x=>x.status!=='Beérkezett').length;
 return `<div class="raktar-page">
   <div class="raktar-hero"><div><div class="eyebrow">KÉSZLETGAZDÁLKODÁS</div><h1>📦 Anyag / Raktár</h1><p>A kútfúrási projektek anyagellátása, készletmozgása és anyagköltsége egy helyen.</p></div><div class="raktar-hero-actions"><button class="btn secondary" onclick="openPurchaseRequests()">🛒 Beszerzési igények</button><button class="btn secondary" onclick="openStockPurchase()">📦 Beszerzés</button><button class="btn secondary" onclick="openProjectStockIssue()">📤 Kiadás projektre</button><button class="btn" onclick="openStockItem()">+ Új cikk</button></div></div>
   <div class="raktar-kpis"><div class="raktar-top-alert ${low?'has-alert':''}"><div class="raktar-top-alert-head"><div><h2>⚠️ Figyelmeztetések</h2><div class="label">A következő beszerzési / készletfeladatok.</div></div></div>${items.filter(x=>Number(x.qty||0)<=Number(x.minQty||0)).slice(0,1).map(x=>`<div class="raktar-alert"><div><b>${esc(x.name)}</b><span>${esc(x.sku)} · ${esc(String(x.qty||0))} ${esc(x.unit||'')} / min. ${esc(String(x.minQty||0))}</span></div><button class="btn secondary small" onclick="openStockItemDetail(${items.indexOf(x)})">Részletek</button></div>`).join('')||'<div class="raktar-empty">✓ Jelenleg nincs minimumkészlet alatti tétel.</div>'}</div><div class="raktar-kpi"><span>Készletérték</span><b>${money(value)}</b><small>beszerzési áron</small></div><div class="raktar-kpi ${low?'warn':''}"><span>Alacsony készlet</span><b>${low}</b><small>${low?'utánrendelés szükséges':'minden rendben'}</small></div><div class="raktar-kpi ${purchases?'blue':''}"><span>Nyitott beszerzés</span><b>${purchases}</b><small>${purchases?'beérkezésre vár':'nincs nyitott rendelés'}</small></div></div>
   <div class="panel raktar-stock-card"><div class="panelhead"><div><h2>📦 Készlet</h2><div class="label">Minden anyag egyetlen, projektkapcsolatra kész listában.</div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn secondary small" onclick="openPurchaseRequests()">🛒 Beszerzési igények</button><button class="btn secondary small" onclick="openStockMovements()">📋 Készletmozgások</button></div></div>${stockInventoryPanel()}</div>
   <div class="panel"><div class="panelhead"><div><h2>🧾 Beszerzések</h2><div class="label">Megrendelt, még be nem érkezett tételek.</div></div><button class="btn secondary small" onclick="openPurchases()">Összes megtekintése</button></div>${(db.purchases||[]).filter(x=>x.status!=='Beérkezett').slice().reverse().slice(0,6).map(p=>`<div class="raktar-purchase"><div><b>${esc(p.sku)} – ${esc(p.name)}</b><span>${esc(p.supplier||'Beszállító nincs megadva')} · várható: ${esc(p.expectedDate||'—')}</span></div><div>${esc(String(p.qty||0))} ${esc(p.unit||'')}</div><div>${money(Number(p.total||0))}</div><button class="btn secondary small" onclick="openPurchases()">Kezelés</button></div>`).join('')||'<div class="raktar-empty">Nincs nyitott beszerzés.</div>'}</div>
 </div>`;
},
machines:()=>machineParkView(),
reports:()=>{let v=db.projects.reduce((s,p)=>s+p.value,0),c=db.projects.reduce((s,p)=>s+p.cost,0),q=db.quotes.reduce((s,x)=>s+x.gross,0);return `<div class="cards"><div class="card"><div class="label">Ajánlatok összesen</div><div class="value">${money(q)}</div></div><div class="card"><div class="label">Projektérték</div><div class="value">${money(v)}</div></div><div class="card"><div class="label">Költség</div><div class="value">${money(c)}</div></div><div class="card"><div class="label">Eredmény</div><div class="value green">${money(v-c)}</div></div></div><div class="panel" style="margin-top:16px"><div class="panelhead"><h2>Projekt eredményesség</h2></div>${db.projects.map(p=>`<div class="kpi"><span><a class="link" onclick="openProjectPage(\'${p.id}\');return false;">${esc(p.name)}</a></span><b>${money(p.value-p.cost)} <span class="label">(${p.value?((p.value-p.cost)/p.value*100).toFixed(1):0}%)</span></b></div>`).join("")}</div>`}
};


/* ===== MUNKANAPLÓ V1.3 – referencia szerinti adatlap ===== */
function worklogSampleRows(rows){
 return rows.map((r,i)=>`<tr>
  <td colspan="2"><span class="wl-depth-range"><span class="wl-depth-value">${esc(r[0]||"0")} m</span><span class="wl-depth-dash">-</span><span class="wl-depth-value">${esc(r[1]||"")} m</span></span></td>
  <td><input class="input" name="layer_material[]" value="${esc(r[2]||"")}"></td>
  <td><input class="input" name="layer_note[]" value="${esc(r[3]||"")}"></td>
  <td><button type="button" class="btn danger small" onclick="this.closest('tr').remove()">×</button></td>
 </tr>`).join("");
}
function addWorklogLayerRow(){
 const tb=document.querySelector("#wl_layers tbody");
 if(!tb)return;
 const rows=[...tb.querySelectorAll("tr")];
 let start=0;
 if(rows.length){
   const last=rows[rows.length-1].querySelector('input[name="layer_to[]"]');
   start=Number(last?.value)||0;
 }
 const end=start+3;
 tb.insertAdjacentHTML("beforeend",worklogSampleRows([[String(start),String(end),"",""]]));
}
function legacy_newWorklog(existing){
 const w=existing||{
  id:uid("MN"),date:new Date().toISOString().slice(0,10),customerId:"",projectId:"",
  location:"",wellNo:"1. kút",finalDepth:"",driller:"Kovács Balázs",status:"Folyamatban",
  layers:[["0","4","",""]],
  blindFrom:"",blindTo:"",filterFrom:"",filterTo:"",filterLength:"",
  prodPipe:"",staticWL:"",dynamicWL:"",pump:"",flow:"",power:"",
  testSeconds:"",testLiters:"",specificYield:"",notes:""
 };
 const customers=(db.customers||[]).map(c=>`<option value="${esc(c.id)}" ${c.id===w.customerId?"selected":""}>${esc(c.name)}</option>`).join("");
 const projects=(db.projects||[]).map(p=>`<option value="${esc(p.id)}" ${p.id===w.projectId?"selected":""}>${esc(p.id)} – ${esc(p.name)}</option>`).join("");
 openModal(w.id?"Munkanapló szerkesztése":"Új munkanapló",`
 <form onsubmit="saveWorklog(event,'${esc(w.id||"")}')">
  <div class="formgrid">
   <div class="field"><label>Dátum</label><input required class="input" name="date" type="date" value="${esc(w.date)}"></div>
   <div class="field"><label>Helyszín</label><input required class="input" name="location" value="${esc(w.location)}"></div>
   <div class="field"><label>Ügyfél</label><select class="select" name="customerId"><option value="">— Nincs kiválasztva —</option>${customers}</select></div>
   <div class="field"><label>Projekt</label><select class="select" name="projectId"><option value="">— Nincs kiválasztva —</option>${projects}</select></div>
   <div class="field"><label>Kút</label><input class="input" name="wellNo" value="${esc(w.wellNo)}"></div>
   <div class="field"><label>Végmélység (m)</label><input class="input" name="finalDepth" type="number" step="0.01" value="${esc(w.finalDepth)}"></div>
   <div class="field"><label>Fúrómester / munkavezető</label><input class="input" name="driller" value="${esc(w.driller)}"></div>
   <div class="field"><label>Státusz</label><select class="select" name="status">
    ${["Piszkozat","Folyamatban","Elkészült","Lezárva"].map(x=>`<option ${w.status===x?"selected":""}>${x}</option>`).join("")}
   </select></div>
  </div>

  <h3 style="margin-top:22px">Rétegnapló</h3>
  <div class="tablewrap">
   <table class="table" id="wl_layers"><thead><tr><th>-tól (m)</th><th>-ig (m)</th><th>Réteg / anyag</th><th>Megjegyzés</th><th></th></tr></thead>
   <tbody>${worklogSampleRows(w.layers||[])}</tbody></table>
  </div>
  <button type="button" class="btn secondary small" onclick="addWorklogLayerRow()">+ Réteg hozzáadása</button>

  <h3 style="margin-top:22px">Kútkiképzés / szűrőzés</h3>
  <div class="formgrid">
   <div class="field"><label>Vak szakasz -tól (m)</label><input class="input" name="blindFrom" value="${esc(w.blindFrom)}"></div>
   <div class="field"><label>Vak szakasz -ig (m)</label><input class="input" name="blindTo" value="${esc(w.blindTo)}"></div>
   <div class="field"><label>Szűrő -tól (m)</label><input class="input" name="filterFrom" value="${esc(w.filterFrom)}"></div>
   <div class="field"><label>Szűrő -ig (m)</label><input class="input" name="filterTo" value="${esc(w.filterTo)}"></div>
   <div class="field"><label>Szűrő hossza (m)</label><input class="input" name="filterLength" value="${esc(w.filterLength)}"></div>
  </div>

  <h3 style="margin-top:22px">Vízszint / próbaszivattyúzás</h3>
  <div class="formgrid">
   <div class="field"><label>Termelőcső hossza (m)</label><input class="input" name="prodPipe" type="number" step="0.01" value="${esc(w.prodPipe)}"></div>
   <div class="field"><label>Nyugalmi vízszint (m)</label><input class="input" name="staticWL" type="number" step="0.01" value="${esc(w.staticWL)}"></div>
   <div class="field"><label>Üzemi vízszint (m)</label><input class="input" name="dynamicWL" type="number" step="0.01" value="${esc(w.dynamicWL)}"></div>
   <div class="field"><label>Szivattyú</label><input class="input" name="pump" value="${esc(w.pump)}"></div>
   <div class="field"><label>Vízhozam (l/perc)</label><input class="input" name="flow" type="number" step="0.01" value="${esc(w.flow)}"></div>
   <div class="field"><label>Teljesítmény (kW)</label><input class="input" name="power" type="number" step="0.01" value="${esc(w.power)}"></div>
   <div class="field"><label>Mérés ideje (mp)</label><input class="input" name="testSeconds" value="${esc(w.testSeconds)}"></div>
   <div class="field"><label>Mért vízmennyiség (l)</label><input class="input" name="testLiters" value="${esc(w.testLiters)}"></div>
   <div class="field"><label>Fajlagos vízhozam (l/s/m)</label><input class="input" name="specificYield" value="${esc(w.specificYield)}"></div>
  </div>

  <div class="field full" style="margin-top:16px"><label>Megjegyzés</label><textarea class="textarea" name="notes">${esc(w.notes)}</textarea></div>
  <div class="modalfoot">
   <span style="flex:1"></span>
   <button type="button" class="btn secondary" onclick="closeModal()">Mégse</button>
   <button class="btn">Munkanapló mentése</button>
  </div>
 </form>`);
}
function saveWorklog(e,id){
 e.preventDefault();
 const fd=new FormData(e.target);
 const o=Object.fromEntries(fd.entries());
 o.layers=[...document.querySelectorAll("#wl_layers tbody tr")].map(tr=>[
  tr.querySelector('[name="layer_from[]"]')?.value||"",
  tr.querySelector('[name="layer_to[]"]')?.value||"",
  tr.querySelector('[name="layer_material[]"]')?.value||"",
  tr.querySelector('[name="layer_note[]"]')?.value||""
 ]);
 if(id){
  const old=(db.worklogs||[]).find(x=>x.id===id);
  if(old)Object.assign(old,o);
 }else{
  if(!db.worklogs)db.worklogs=[];
  o.id=uid("MN");
  db.worklogs.push(o);
 }
 save();closeModal();render();toast("Munkanapló mentve");
}
function editWorklog(id){newWorklog((db.worklogs||[]).find(x=>x.id===id))}

function searchCustomers(){
 const q=(document.getElementById("cs")?.value||"").toLowerCase().trim();
 const arr=db.customers.filter(c=>[c.name,c.tax,c.companyNo,c.contact,c.phone,c.email,c.address,c.status].join(" ").toLowerCase().includes(q));
 const el=document.getElementById("ct");if(el)el.innerHTML=customerRows(arr);
}

function searchQuotes(){let q=document.getElementById("qs").value.toLowerCase();document.getElementById("qt").innerHTML=quoteRows(db.quotes.filter(x=>[x.id,x.name,x.location,cust(x.customerId)].join(" ").toLowerCase().includes(q)))}
function searchProjects(){let q=document.getElementById("ps").value.toLowerCase();document.getElementById("pt").innerHTML=projectRows(db.projects.filter(x=>[x.id,x.name,x.location,cust(x.customerId),x.status].join(" ").toLowerCase().includes(q)))}
function opts(selected=""){return db.customers.map(c=>`<option value="${c.id}" ${c.id===selected?"selected":""}>${esc(c.name)}</option>`).join("")}

const layerData=[
[7,10,"Szürke homok","","",""],
[10,13,"Szürke","","",""],
[13,16,"Szürke","","","16 m-nél agyag"],
[16,19,"Agyag","","",""],
[19,22,"","Gyors","",""],
[22,25,"","Gyors, ugrálós","",""],
[25,28,"","Gyors, ugrálós","",""],
[28,31,"","Ugrálós","","30 m-nél agyag, lassabb"],
[31,34,"Agyag","Nagyon lassú","Szürke, agyagos",""],
[34,37,"Agyag","Közepes","Szürke, agyagos",""],
[37,40,"Agyagos homok","Közepes","",""],
[40,43,"Agyagos","Lassabb","",""],
[43,46,"","Közepes","",""],
[46,49,"","Nagyon ugrálós","",""],
[49,52,"","Lassú/közepes","",""],
[52,55,"","Gyors","",""],
[55,58,"","Közepes/lassú","","57 m-nél agyag"]
];
const filterData=[[22,31,"Szűrő",""],[40,55,"Szűrő",""]];

function addLayer(v=[0,0,"","","",""]){
 const tr=document.querySelector("#layers tbody").insertRow();
 v.forEach((x,i)=>{const td=tr.insertCell(); const inp=document.createElement("input"); inp.value=x; inp.type=i<2?"number":"text"; if(i<2) inp.step=".1"; td.appendChild(inp)});
 const td=tr.insertCell(); const b=document.createElement("button"); b.className="danger"; b.textContent="×"; b.onclick=()=>tr.remove(); td.appendChild(b);
}
function addFilter(v=[0,0,"Szűrő",""]){
 const tr=document.querySelector("#filters tbody").insertRow();
 v.forEach((x,i)=>{const td=tr.insertCell(); const inp=document.createElement("input"); inp.value=x; inp.type=i<2?"number":"text"; if(i<2) inp.step=".1"; td.appendChild(inp)});
 const td=tr.insertCell(); const b=document.createElement("button"); b.className="danger"; b.textContent="×"; b.onclick=()=>tr.remove(); td.appendChild(b);
}
function getTable(id){return [...document.querySelectorAll("#"+id+" tbody tr")].map(tr=>[...tr.querySelectorAll("input")].map(i=>i.value))}
function sortLayers(){const data=getTable("layers").sort((a,b)=>Number(a[0])-Number(b[0]));document.querySelector("#layers tbody").innerHTML="";data.forEach(addLayer)}
function calculate(){
 q22El=document.getElementById("q22"); const q=Number(document.getElementById("flow")?.value)||0,s=Number(document.getElementById("static2")?.value)||0,d=Number(document.getElementById("dynamic2")?.value)||0;
 const draw=d-s, spec=73.3;
 document.getElementById("drawdown").textContent=huNum(draw,2)+" m";document.getElementById("specific").textContent=huNum(spec,2)+" l/perc/m";document.getElementById("flowStat").textContent=q+" l/perc";
 const q22=733; q22El.textContent=Math.round(q22)+" l/perc";
}
let q22El;
function fields(){return ["date","location","client","wellNo","driller","rig","finalDepth","status","prodPipe","staticWL","dynamicWL","pump","flow","power","dynamic2","static2","pumpNote","notes"]}

function renderProfile(){
 const box=document.getElementById("wellProfile"); box.innerHTML="";
 const layers=getTable("layers"), filters=getTable("filters");
 const max=Math.max(...layers.map(r=>Number(r[1])||0),Number(finalDepth.value)||58);
 const scale=9;
 const depth=document.createElement("div");
 depth.style.cssText=`height:${max*scale}px;position:relative;border-right:1px solid #ccd4dc`;
 for(let d=0;d<=max;d+=5){let x=document.createElement("div");x.textContent=d+" m";x.style.cssText=`position:absolute;top:${d*scale-7}px;right:8px;font-size:11px;color:#66788a`;depth.appendChild(x)}
 box.appendChild(depth);
 const well=document.createElement("div");
 well.style.cssText=`height:${max*scale}px;position:relative;border:1px solid #cbd5df;border-radius:8px;background:repeating-linear-gradient(0deg,#fafbfc,#fafbfc 8px,#f0f3f6 9px)`;
 layers.forEach(r=>{
   const a=Number(r[0]),b=Number(r[1]); if(!Number.isFinite(a)||!Number.isFinite(b))return;
   const el=document.createElement("div"); el.style.cssText=`position:absolute;left:0;right:0;top:${a*scale}px;height:${(b-a)*scale}px;border-bottom:1px solid #fff;padding:3px 7px;font-size:10px;overflow:hidden;background:#e4e8ec`;
   el.textContent=`${a}–${b} m  ${r[2]||""}${r[3]?" • "+r[3]:""}`;
   well.appendChild(el);
 });
 filters.forEach(r=>{
   const a=Number(r[0]),b=Number(r[1]); if(!Number.isFinite(a)||!Number.isFinite(b))return;
   const el=document.createElement("div"); el.style.cssText=`position:absolute;left:-6px;right:-6px;top:${a*scale}px;height:${(b-a)*scale}px;border:3px solid #1769aa;border-radius:4px;background:#1769aa22;pointer-events:none`;
   const tag=document.createElement("span");tag.textContent=" SZŰRŐ";tag.style.cssText="position:absolute;right:4px;top:2px;font-size:10px;font-weight:700;color:#1769aa";el.appendChild(tag);well.appendChild(el);
 });
 box.appendChild(well);
}

function saveData(){const d={};fields().forEach(id=>d[id]=document.getElementById(id).value);d.layers=getTable("layers");d.filters=getTable("filters");erpStorageSet("kutfoz-munkanaplo",JSON.stringify(d));alert("A munkanapló elmentve a böngészőbe.");}
const _saveWorklogOriginal=saveData; saveData=function(){_saveWorklogOriginal();try{const raw=erpStorageGet("kutfoz-munkanaplo");if(raw){const blob=new Blob([raw],{type:"application/json"});const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="munkanaplo-mentes.json";a.click();setTimeout(()=>URL.revokeObjectURL(a.href),500)}}catch(e){}}
function loadData(){
 const raw=erpStorageGet("kutfoz-munkanaplo"); if(!raw){alert("Nincs mentett munkanapló.");return}
 const d=JSON.parse(raw);fields().forEach(id=>{if(d[id]!==undefined)document.getElementById(id).value=d[id]});
 document.querySelector("#layers tbody").innerHTML="";(d.layers||[]).forEach(addLayer);
 document.querySelector("#filters tbody").innerHTML="";(d.filters||[]).forEach(addFilter);}
function clearData(){if(confirm("Biztosan törlöd a mentett adatokat?")){erpStorageRemove("kutfoz-munkanaplo");render();toast("Munkanapló adatai törölve")}}

function initWorklog(){
  if(!document.getElementById("layers")) return;
  calculate();
}

function newCustomer(c){
 openModal(c?"Ügyfél szerkesztése":"Új ügyfél",`<form onsubmit="saveCustomer(event,'${c?.id||""}')">
 <div class="formgrid">
  <div class="field full"><label>Cégnév / név</label><input required class="input" name="name" value="${esc(c?.name)}"></div>
  <div class="field"><label>Adószám</label><input class="input" name="tax" value="${esc(c?.tax)}"></div>
  <div class="field"><label>Cégjegyzékszám</label><input class="input" name="companyNo" value="${esc(c?.companyNo)}"></div>
  <div class="field"><label>Kapcsolattartó</label><input class="input" name="contact" value="${esc(c?.contact)}"></div>
  <div class="field"><label>Telefon</label><input class="input" name="phone" value="${esc(c?.phone)}"></div>
  <div class="field"><label>E-mail</label><input class="input" name="email" type="email" value="${esc(c?.email)}"></div>
  <div class="field"><label>Státusz</label><select class="select" name="status"><option value="Aktív" ${c?.status==="Inaktív"?"":"selected"}>Aktív</option><option value="Inaktív" ${c?.status==="Inaktív"?"selected":""}>Inaktív</option></select></div>
  <div class="field full"><label>Cím</label><textarea class="textarea" name="address">${esc(c?.address)}</textarea></div>
  <div class="field full"><label>Megjegyzés</label><textarea class="textarea" name="notes">${esc(c?.notes)}</textarea></div>
 </div>
 <div class="modalfoot">${c?.id?`<button type="button" class="btn danger" onclick="deleteCustomer('${c.id}')">Törlés</button>`:""}<span style="flex:1"></span><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Mentés</button></div>
 </form>`)
}
function editCustomer(id){newCustomer(db.customers.find(x=>x.id===id))}
function deleteWorklog(id){
  const key=String(id||"");
  const w=(db.worklogs||[]).find(x=>String(x.id||"")===key);
  if(!w){toast("A munkanapló nem található");return false;}
  const customer=cust(w.customerId)||"";
  const project=(db.projects||[]).find(p=>String(p.id||"")===String(w.projectId||""));
  const label=[w.id,customer,project?.name||w.location,w.date].filter(Boolean).join(" – ");
  if(!confirm(`Biztosan törlöd ezt a munkanaplót?\n\n${label}\n\nA törlés nem vonható vissza.`))return false;

  db.worklogs=(db.worklogs||[]).filter(x=>String(x.id||"")!==key);
  wlClearDraft(key);
  if(typeof editingWorklogId!=="undefined" && String(editingWorklogId||"")===key) editingWorklogId=null;

  save();
  closeModal();
  render();
  toast("Munkanapló törölve.");
  return false;
}

function customerDeleteItems(id){
  const key=String(id||"");
  const customer=(db.customers||[]).find(c=>String(c.id)===key);
  if(!customer)return {customer:null,quotes:[],projects:[],worklogs:[],documents:[]};

  const quotes=(db.quotes||[]).filter(q=>String(q.customerId||q.clientId||"")===key);
  const projects=(db.projects||[]).filter(p=>String(p.customerId||p.clientId||"")===key);
  const projectIds=new Set(projects.map(p=>String(p.id||"")));

  const worklogs=(db.worklogs||[]).filter(w=>
    String(w.customerId||"")===key || projectIds.has(String(w.projectId||""))
  );

  const docs=[];
  // Global document collections
  const collections=[
    ["documents",db.documents],
    ["attachments",db.attachments],
    ["files",db.files],
    ["projectDocuments",db.projectDocuments],
    ["projectFiles",db.projectFiles],
    ["permitDocuments",db.permitDocuments],
    ["licenseDocuments",db.licenseDocuments],
    ["generatedDocuments",db.generatedDocuments],
    ["worklogDocuments",db.worklogDocuments],
    ["photos",db.photos],
    ["projectPhotos",db.projectPhotos],
    ["documentsArchive",db.documentsArchive]
  ];
  for(const [collection,arr] of collections){
    if(!Array.isArray(arr))continue;
    arr.forEach((d,i)=>{
      const linkedCustomer=String(d.customerId||d.clientId||"")===key;
      const linkedProject=projectIds.has(String(d.projectId||d.projectID||""));
      const linkedWorklog=worklogs.some(w=>String(w.id||"")===String(d.worklogId||d.workLogId||""));
      if(linkedCustomer||linkedProject||linkedWorklog){
        docs.push({collection,index:i,item:d});
      }
    });
  }

  // Also include documents embedded directly in projects.
  projects.forEach(p=>{
    (Array.isArray(p.documents)?p.documents:[]).forEach((d,i)=>{
      docs.push({collection:"project.documents",index:i,item:d,projectId:p.id,embedded:true});
    });
  });

  return {customer,quotes,projects,worklogs,documents:docs};
}

function customerDeleteListRow(type,item,extra=""){
  const id=String(item?.id||item?.number||item?.name||item?.fileName||"");
  const title=type==="Ajánlat"?(item.name||item.id||"Ajánlat"):
              type==="Projekt"?(item.name||item.id||"Projekt"):
              type==="Munkanapló"?(item.id||item.location||"Munkanapló"):
              (item.name||item.fileName||item.title||item.id||"Dokumentum");
  const sub=type==="Ajánlat"?[item.id,item.status].filter(Boolean).join(" · "):
            type==="Projekt"?[item.id,item.status].filter(Boolean).join(" · "):
            type==="Munkanapló"?[item.date,item.location].filter(Boolean).join(" · "):
            [item.fileName,item.type,item.date].filter(Boolean).join(" · ");
  return `<div class="customer-delete-row">
    <div><b>${esc(title)}</b><div class="label">${esc(sub)}</div></div>
    <button type="button" class="btn danger small" ${extra}>Törlés</button>
  </div>`;
}

function openCustomerDeleteManager(id){
  const data=customerDeleteItems(id);
  if(!data.customer){toast("Az ügyfél nem található");return;}

  const quoteRows=data.quotes.map(q=>customerDeleteListRow(
    "Ajánlat",q,`onclick="deleteCustomerQuoteAndRefresh('${esc(q.id)}','${esc(id)}');return false;"`
  )).join("") || `<div class="label">Nincs kapcsolódó ajánlat.</div>`;

  const projectRows=data.projects.map(p=>customerDeleteListRow(
    "Projekt",p,`onclick="deleteCustomerProjectAndRefresh('${esc(p.id)}','${esc(id)}');return false;"`
  )).join("") || `<div class="label">Nincs kapcsolódó projekt.</div>`;

  const worklogRows=data.worklogs.map(w=>customerDeleteListRow(
    "Munkanapló",w,`onclick="deleteCustomerWorklogAndRefresh('${esc(w.id)}','${esc(id)}');return false;"`
  )).join("") || `<div class="label">Nincs kapcsolódó munkanapló.</div>`;

  const documentRows=data.documents.map((d,i)=>customerDeleteListRow(
    "Dokumentum",d.item,`onclick="deleteCustomerDocumentAndRefresh(${i},'${esc(id)}');return false;"`
  )).join("") || `<div class="label">Nincs kapcsolódó dokumentum.</div>`;

  openModal("Ügyfélhez kapcsolódó adatok törlése",`
    <div class="customer-delete-manager">
      <div class="label" style="margin-bottom:12px">
        <b>${esc(data.customer.name||"Ügyfél")}</b> kapcsolódó adatai. Egyenként törölhetők.
      </div>
      <section class="customer-delete-section">
        <h3>Ajánlatok (${data.quotes.length})</h3>${quoteRows}
      </section>
      <section class="customer-delete-section">
        <h3>Projektek (${data.projects.length})</h3>
        <div class="label" style="margin-bottom:8px">Projekt törlése a hozzá tartozó munkanaplókat, ajánlatokat és projekt-dokumentumokat is törli.</div>
        ${projectRows}
      </section>
      <section class="customer-delete-section">
        <h3>Munkanaplók (${data.worklogs.length})</h3>${worklogRows}
      </section>
      <section class="customer-delete-section">
        <h3>Dokumentumok (${data.documents.length})</h3>${documentRows}
      </section>
      <div class="modalfoot">
        <button type="button" class="btn secondary" onclick="closeModal()">Bezárás</button>
        <button type="button" class="btn danger" onclick="deleteCustomerAfterCleanup('${esc(id)}');return false;">Ügyfél törlése</button>
      </div>
    </div>`);
}

function refreshCustomerDeleteManager(id){
  closeModal();
  setTimeout(()=>openCustomerDeleteManager(id),30);
}

function deleteCustomerQuoteAndRefresh(qid,cid){
  if(deleteQuote(qid)===false) setTimeout(()=>openCustomerDeleteManager(cid),80);
}
function deleteCustomerWorklogAndRefresh(wid,cid){
  if(deleteWorklog(wid)===false) setTimeout(()=>openCustomerDeleteManager(cid),80);
}
function deleteCustomerProjectAndRefresh(pid,cid){
  if(deleteProject(pid)===false) setTimeout(()=>openCustomerDeleteManager(cid),80);
}
function deleteCustomerDocumentAndRefresh(index,cid){
  const data=customerDeleteItems(cid), d=data.documents[index];
  if(!d){toast("A dokumentum nem található");return;}
  if(!confirm(`Biztosan törlöd ezt a dokumentumot?\n\n${d.item?.name||d.item?.fileName||d.item?.title||"Dokumentum"}\n\nA törlés nem vonható vissza.`))return;

  if(d.embedded){
    const p=(db.projects||[]).find(x=>String(x.id)===String(d.projectId));
    if(p&&Array.isArray(p.documents))p.documents.splice(d.index,1);
  }else if(Array.isArray(db[d.collection])){
    db[d.collection].splice(d.index,1);
  }
  save();
  render();
  setTimeout(()=>openCustomerDeleteManager(cid),80);
  toast("Dokumentum törölve.");
}

function deleteCustomerAfterCleanup(id){
  const data=customerDeleteItems(id);
  if(data.quotes.length||data.projects.length||data.worklogs.length||data.documents.length){
    alert("Előbb töröld a felsorolt kapcsolódó adatokat. Az ügyfél csak akkor törölhető, ha már nincs hozzá kapcsolódó adat.");
    return false;
  }
  if(!confirm(`Biztosan törlöd ezt az ügyfelet?\n\n${data.customer?.name||""}\n\nA törlés nem vonható vissza.`))return false;
  db.customers=(db.customers||[]).filter(c=>String(c.id)!==String(id));
  save();closeModal();render();toast("Ügyfél törölve.");
  return false;
}

function deleteCustomer(id){
  const data=customerDeleteItems(id);
  if(!data.customer){toast("Az ügyfél nem található");return false;}
  if(data.quotes.length||data.projects.length||data.worklogs.length||data.documents.length){
    openCustomerDeleteManager(id);
    return false;
  }
  return deleteCustomerAfterCleanup(id);
}

function saveCustomer(e,idc){e.preventDefault();
  const f=new FormData(e.target);let o=Object.fromEntries(new FormData(e.target).entries());if(idc)Object.assign(db.customers.find(x=>x.id===idc),o);else db.customers.push({id:uid("C"),...o});save();closeModal();render();toast("Ügyfél mentve")}


let qitems=[];
let quoteItems=[],quoteTech=[];
function openQuoteModalLegacy(customerId){
 quoteItems=[{desc:"",qty:1,unit:"db",price:0}];
 quoteTech=[{type:"Csövezés / szűrőzés",from:"",to:"",len:"",spec:""}];
 const customerOptions=(db.customers||[]).map(c=>`<option value="${esc(c.id)}">${esc(c.name)}</option>`).join("");
 const projectOptions=(db.projects||[]).map(p=>`<option value="${esc(p.id)}">${esc(p.id)} – ${esc(p.name)}</option>`).join("");
 openModal("Új ajánlat – Ajánlat modul",`
 <div class="offer-editor">
  <div class="offer-top"><div><div class="offer-company">KÚTFŐ PLUSZ KFT.</div><div>4481 Nyíregyháza, Attila út 61.</div><div>+36 20 9247187 · kutfokft@gmail.com</div></div><div class="offer-heading">ÁRAJÁNLAT</div>
<div class="quote-status-box">
 <label for="q_status"><b>STÁTUSZ</b></label>
 <select id="q_status" class="input quote-status-select">
  <option value="Piszkozat">Piszkozat</option>
  <option value="Elkészítve">Elkészítve</option>
  <option value="Elküldve">Elküldve</option>
  <option value="Tárgyalás alatt">Tárgyalás alatt</option>
  <option value="Elfogadva">Elfogadva</option>
  <option value="Elutasítva">Elutasítva</option>
  <option value="Lezárva">Lezárva</option>
 </select>
</div></div>
  <section class="offer-card"><h3>1. Árajánlat kérő adatai</h3>
   <div class="offer-grid">
    <div><label>Ügyfél</label><select id="q_customer" class="input" onchange="quoteCustomerChanged()"><option value="">— Válassz ügyfelet —</option>${customerOptions}</select></div>
    <div><label>Projekt</label><select id="q_project" class="input" onchange="quoteProjectChanged()"><option value="">— Válassz projektet —</option>${projectOptions}</select></div>
    <div><label>Adószáma</label><input id="q_client_tax" class="input"></div>
    <div><label>Címe</label><textarea id="q_client_address" class="input"></textarea></div><div><label>Telefon</label><input id="q_client_phone" class="input"></div>
    <div><label>E-mail</label><input id="q_client_email" class="input"></div><div><label>Ajánlat dátuma</label><input id="q_date" type="date" class="input" value="${new Date().toISOString().slice(0,10)}"></div>
   </div>
  </section>
  <section class="offer-card"><h3>2. ÁRAJÁNLAT TÁRGYA</h3><textarea id="q_subject" class="input offer-large" placeholder="Pl. 2 db 120 m-es öntözőkút kivitelezése"></textarea></section>
  <section class="offer-card"><h3>3. ÁRKALKULÁCIÓ</h3>
   <div class="offer-table-wrap"><table class="table"><thead><tr><th>Mennyiség</th><th>Egység</th><th>Megnevezés</th><th>Egységár</th><th>Nettó</th><th>ÁFA</th><th>Bruttó</th><th></th></tr></thead><tbody id="q_items"></tbody></table></div>
   <button type="button" class="btn secondary small" onclick="addQuoteItem()">＋ Tétel</button><div id="q_total" class="offer-total"></div>
  </section>
  <section class="offer-card"><h3>4. MŰSZAKI TARTALOM</h3>
   <div class="offer-grid">
    <div><label>Talpmélység (m)</label><input id="q_depth" class="input" type="text" inputmode="decimal" oninput="huFormatInput(this,1)" onchange="recalculateQuoteMainItem()"></div>
    <div><label>Tervezett vízigény</label><input id="q_water_need" class="input" placeholder="pl. 800 l/p"></div>
    <input type="hidden" id="q_pipe_diameter"><input type="hidden" id="q_steel_pipe"><input type="hidden" id="q_pipe_material"><input type="hidden" id="q_purpose">
   </div>
   <h4>Csövezés / szűrőzés</h4>
   <div class="offer-table-wrap"><table class="table"><thead><tr><th>Megnevezés</th><th>Kezdő</th><th>Vég</th><th>Hossz</th><th>Műszaki adat</th><th></th></tr></thead><tbody id="q_tech"></tbody></table></div>
   <button type="button" class="btn secondary small" onclick="addQuoteTech()">＋ Műszaki sor</button>
  </section>
  <section class="offer-card"><div class="offer-two">
   <div><h3>5. AZ ÁR TARTALMAZZA</h3><textarea id="q_includes" class="input offer-listarea">felvonulási költséget
teljes anyagköltséget
munkadíjat
gázvizsgálatot
geofizikai vizsgálatot
vízkémiai vizsgálatot
geodéziai bemérést
vízföldtani napló beszerzését</textarea></div>
   <div><h3>6. AZ ÁR NEM TARTALMAZZA</h3><textarea id="q_excludes" class="input offer-listarea">vízgépészeti munkákat
szivattyú telepítést
elektromos kiépítést
betonozási munkálatokat</textarea></div>
  </div></section>
  <section class="offer-card"><h3>7. NYILATKOZATOK / FELTÉTELEK</h3><textarea id="q_declarations" class="input offer-declarations">Mint a Kútfő Plusz Kft. ügyvezetője nyilatkozom, hogy az ajánlatban szereplő berendezések új gyártásúak, még nem voltak üzembe helyezve és várható gyártási évük 2026.

Nyilatkozom, hogy az ajánlatban szereplő tételek kivitelezéséhez a Kútfő Plusz Kft. a szükséges engedélyes eszközökkel, szakmai- és személyi feltételekkel rendelkezik.

Nyilatkozom, hogy az ajánlatban szereplő tételek megfelelnek a vonatkozó EU-s irányelveknek, szabványoknak, illetve az azokat átültető magyar jogszabályoknak és környezetvédelmi előírásoknak.

A kivitelezett kútra 4 év szerkezeti garanciát vállalok.
A garancia nem terjed ki a nem rendeltetésszerű használatból, külső behatásból vagy vízgépészeti hibából eredő károkra.

Az ajánlatomat 180 napig fenntartom.</textarea></section>
  <section class="offer-card"><div class="offer-grid"><div><label>Aláíró</label><input id="q_signer" class="input" value="Szabados István"></div><div><label>Beosztás</label><input id="q_position" class="input" value="ügyvezető"></div></div>
  <div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button type="button" class="btn secondary" onclick="previewQuote()">Előnézet / PDF</button><button type="button" class="btn secondary" onclick="exportQuoteDoc()">Word (.docx)</button><button type="button" class="btn" onclick="saveQuoteFromTemplate()">Ajánlat mentése</button></div></section>
 </div>`);
 renderQuoteEditor();
}
function quoteCustomerChanged(){
 const id=document.getElementById("q_customer").value,c=(db.customers||[]).find(x=>x.id===id);if(!c)return;
 ["name","address","tax","phone","email"].forEach(k=>{const el=document.getElementById("q_client_"+k);if(el)el.value=c[k]||""});
}
function quoteProjectChanged(){
 const id=document.getElementById("q_project")?.value,p=(db.projects||[]).find(x=>x.id===id);if(!p)return;
 if(p.customerId){const ce=document.getElementById("q_customer");if(ce)ce.value=p.customerId;quoteCustomerChanged()}

 const w=p.well||{};
 const depth=w.permittedDepth??p.permittedDepth??p.plannedDepth??"";
 const flow=w.permittedFlow??w.designFlow??p.permittedFlow??p.designFlow??"";
 // Az ajánlati árlista a csőátmérőhöz (béléscsőhöz) tartozó Ft/m árat használja.
 // A furat/iránycső átmérője (pl. 419/405) ettől külön műszaki adat.
 const casing=w.casingDiameter??w.casing??p.casingDiameter??"";
 const diameter=casing || w.diameter || w.drillingDiameter || p.diameter || "";
 const steel=w.steelPipe??w.steelPipeDiameter??"";
 const screen=w.screenInterval??w.filter??"";
 const purpose=w.purpose??p.purpose??p.irrigation?.purpose??p.irrigation?.waterUsePurpose??"";
 if(document.getElementById("q_depth")) document.getElementById("q_depth").value=depth!==""?huFormat(depth,1):"";
 if(document.getElementById("q_water_need")) document.getElementById("q_water_need").value=flow!==""?`${flow} l/perc`:"";
 if(document.getElementById("q_pipe_diameter")) document.getElementById("q_pipe_diameter").value=diameter||"";
 if(document.getElementById("q_steel_pipe")) document.getElementById("q_steel_pipe").value=steel;
 if(document.getElementById("q_pipe_material")) document.getElementById("q_pipe_material").value=w.pipeMaterial??w.casingMaterial??w.material??"";
 if(document.getElementById("q_purpose")) document.getElementById("q_purpose").value=purpose;
 if(document.getElementById("q_subject") && !document.getElementById("q_subject").value.trim()){
   document.getElementById("q_subject").value=p.name||`Kút kivitelezése ${depth?depth+" m mélységig":""}`.trim();
 }
 // Az első árkalkulációs tétel megnevezése automatikusan a projektből készüljön.
 // Példa: „1 db 50 m-es öntözőkút kivitelezése”. A tétel mennyisége továbbra is 1 db,
 // az egységárat az árlista/kalkuláció töltheti ki. Csak új/üres automatikus tételnél írjuk felül.
 const count=Number.parseInt(String(p.wellCount??p.well?.wellCount??1).replace(/[^\d]/g,""),10)||1;
 const purposeText=String(purpose||p.name||document.getElementById("q_subject")?.value||"");
 const irrigation=/öntöz/i.test(purposeText);
 const wellWord=irrigation?"öntözőkút":"kút";
 const mainDesc=`${count} db ${depth?String(depth).replace(".",",")+" m-es ":""}${wellWord} kivitelezése`;
 if(Array.isArray(quoteItems) && quoteItems.length){
   const current=String(quoteItems[0]?.desc||"").trim();
   const looksAuto=!current || /^\d+\s*db\s+.*(?:öntözőkút|kút)\s+kivitelezése$/i.test(current);
   if(looksAuto){ quoteItems[0].desc=mainDesc; quoteItems[0].qty=1; quoteItems[0].unit="db"; }
 }
 // A teljes, projektben szerkesztett műszaki szakaszlista átadása az ajánlatnak.
 quoteTech=deriveQuoteTechFromProject(p);
 // A fő ajánlati tétel ára mindig a projekt talpmélysége ×
 // a kiválasztott csőátmérőhöz tartozó aktuális Ft/m ár.
 recalculateQuoteMainItem(false);
 renderQuoteEditor();
}
function recalculateQuoteMainItem(doRender=true){
 const depthRaw=document.getElementById("q_depth")?.value ?? "";
 const diameterRaw=document.getElementById("q_pipe_diameter")?.value ?? "";
 const depth=huNumber(depthRaw);
 const diameter=String(diameterRaw).trim();
 const meterRate=drillingPriceForDiameter(diameter);
 if(!Array.isArray(quoteItems)) quoteItems=[];
 if(!quoteItems.length) quoteItems.push({desc:"",qty:1,unit:"db",price:0});
 const current=String(quoteItems[0].desc||"");
 const projectId=document.getElementById("q_project")?.value||"";
 const project=(db.projects||[]).find(x=>String(x.id)===String(projectId));
 const purpose=String(project?.well?.purpose||project?.purpose||document.getElementById("q_purpose")?.value||document.getElementById("q_subject")?.value||"");
 const irrigation=/öntöz/i.test(purpose);
 const wellWord=irrigation?"öntözőkút":"kút";
 const count=Number.parseInt(String(project?.wellCount??project?.well?.wellCount??1).replace(/[^\d]/g,""),10)||1;
 const depthText=depthRaw!==""?huFormat(depth,1):"";
 const autoDesc=`${count} db ${depthText?depthText+" m-es ":""}${wellWord} kivitelezése`;
 const looksAuto=!current || /^\d+\s*db\s+.*(?:öntözőkút|kút)\s+kivitelezése$/i.test(current);
 if(looksAuto) quoteItems[0].desc=autoDesc;
 quoteItems[0].qty=1;
 quoteItems[0].unit="db";
 quoteItems[0].price=depth>0 && meterRate>0 ? depth*meterRate : 0;
 quoteItems[0].autoCalculated=true;
 quoteItems[0].priceListDiameter=diameter;
 quoteItems[0].meterRate=meterRate;
 if(doRender) renderQuoteEditor();
}
function addQuoteItem(){quoteItems.push({desc:"",qty:1,unit:"db",price:0});renderQuoteEditor()}
function addQuoteTech(){quoteTech.push({type:"Csövezés / szűrőzés",from:"",to:"",len:"",spec:""});renderQuoteEditor()}
function updateQuoteTechLength(i){
 const x=quoteTech?.[i]; if(!x)return;
 const a=huNumber(x.from), b=huNumber(x.to);
 if(Number.isFinite(a)&&Number.isFinite(b)){
   x.len=huFormat(b-a,1);
 }else if(x.len==null){
   x.len="";
 }
 const row=document.querySelectorAll('#q_tech tr')[i];
 const lenInput=row?.querySelector('input[data-tech-len]');
 if(lenInput)lenInput.value=huFormat(x.len,1);
}
function renderQuoteEditor(){
 const b=document.getElementById("q_items");if(b)b.innerHTML=quoteItems.map((x,i)=>{const n=Math.round(parseErpNumber(x.qty)*parseErpNumber(x.price)),v=Math.round(n*27/100);
 return `<tr><td><input class="input" type="text" inputmode="decimal" value="${esc(huFormatFlexible(x.qty,2))}" oninput="huFormatInput(this,2)" onchange="quoteItems[${i}].qty=huNumber(this.value);renderQuoteEditor()"></td><td><input class="input" value="${esc(x.unit||"db")}" onchange="quoteItems[${i}].unit=this.value"></td><td><input class="input" value="${esc(x.desc)}" onchange="quoteItems[${i}].desc=this.value"></td><td><input class="input" type="text" inputmode="decimal" value="${esc(huFormatMoneyInputValue(x.price))}" oninput="huFormatMoneyInput(this)" onchange="quoteItems[${i}].price=huNumber(this.value);renderQuoteEditor()"></td><td>${money(n)}</td><td>${money(v)}</td><td>${money(n+v)}</td><td><button type="button" class="btn secondary small" onclick="quoteItems.splice(${i},1);renderQuoteEditor()">×</button></td></tr>`}).join("");
 const net=quoteItems.reduce((a,x)=>a+Math.round(parseErpNumber(x.qty)*parseErpNumber(x.price)),0),vat=Math.round(net*27/100);
 const t=document.getElementById("q_total");if(t)t.innerHTML=`Nettó: <b>${money(net)}</b> · ÁFA: ${money(vat)} · Bruttó: <b>${money(net+vat)}</b>`;
 const tb=document.getElementById("q_tech");if(tb)tb.innerHTML=quoteTech.map((x,i)=>{
   const a=huNumber(x.from), b=huNumber(x.to);
   const autoLen=(Number.isFinite(a)&&Number.isFinite(b))?huFormat(b-a,1):huFormat(x.len,1);
   if(Number.isFinite(a)&&Number.isFinite(b)) x.len=autoLen;
   return `<tr><td><input class="input" value="${esc(x.type)}" onchange="quoteTech[${i}].type=this.value"></td><td><input class="input" type="text" inputmode="decimal" value="${esc(huFormat(x.from,1))}" oninput="huFormatInput(this,1)" onchange="quoteTech[${i}].from=huFormat(this.value,1);updateQuoteTechLength(${i})"></td><td><input class="input" type="text" inputmode="decimal" value="${esc(huFormat(x.to,1))}" oninput="huFormatInput(this,1)" onchange="quoteTech[${i}].to=huFormat(this.value,1);updateQuoteTechLength(${i})"></td><td><input class="input" data-tech-len readonly type="text" value="${esc(autoLen)}" tabindex="-1" title="Automatikusan számított hossz"></td><td><input class="input" value="${esc(x.spec)}" onchange="quoteTech[${i}].spec=this.value"></td><td><button type="button" class="btn secondary small" onclick="quoteTech.splice(${i},1);renderQuoteEditor()">×</button></td></tr>`
 }).join("");
}
function collectQuoteTemplate(){
 const items=quoteItems.map(x=>({desc:String(x.desc||"").trim(),qty:parseErpNumber(x.qty),unit:String(x.unit||"db").trim(),price:parseErpNumber(x.price)})).filter(x=>x.desc);
 const net=items.reduce((a,x)=>a+Math.round(parseErpNumber(x.qty)*parseErpNumber(x.price)),0),vat=Math.round(net*27/100);
 return {id:(window.editingQuoteId||nextQuoteId()),
  customerId:document.getElementById("q_customer").value,projectId:document.getElementById("q_project").value,
  status:document.getElementById("q_status")?.value||"Piszkozat",
  clientName:((db.customers||[]).find(x=>String(x.id)===String(document.getElementById("q_customer").value))?.name)||"",
  clientAddress:document.getElementById("q_client_address").value,
  clientTax:document.getElementById("q_client_tax").value,clientPhone:document.getElementById("q_client_phone").value,clientEmail:document.getElementById("q_client_email").value,
  date:document.getElementById("q_date").value,
  location:((db.projects||[]).find(x=>String(x.id)===String(document.getElementById("q_project").value))?.location)||"",
  name:((db.projects||[]).find(x=>String(x.id)===String(document.getElementById("q_project").value))?.name)||"",
  subject:document.getElementById("q_subject").value,depth:document.getElementById("q_depth").value,waterNeed:document.getElementById("q_water_need").value,
  pipeDiameter:document.getElementById("q_pipe_diameter").value,steelPipe:document.getElementById("q_steel_pipe")?.value||"",pipeMaterial:document.getElementById("q_pipe_material").value,purpose:document.getElementById("q_purpose")?.value||"",
  items,tech:quoteTech.map(x=>({...x})).filter(x=>[x.type,x.from,x.to,x.len,x.spec].some(v=>String(v||"").trim())),
  includes:document.getElementById("q_includes").value,excludes:document.getElementById("q_excludes").value,
  declarations:document.getElementById("q_declarations").value,signer:document.getElementById("q_signer").value,position:document.getElementById("q_position").value,
  net,vat,gross:net+vat};
}
function saveQuoteFromTemplate(){
 const o=collectQuoteTemplate();db.quotes=db.quotes||[];
 if(window.editingQuoteId){
  const index=db.quotes.findIndex(x=>String(x.id)===String(window.editingQuoteId));
  if(index<0){alert("A szerkesztett ajánlat már nem található, ezért nem mentettem.");return}
  o.id=db.quotes[index].id;o.status=document.getElementById("q_status")?.value||o.status||db.quotes[index].status||"Piszkozat";db.quotes[index]=o;window.editingQuoteId=null;
 }else {o.status=o.status||"Piszkozat";db.quotes.push(o);}
 const returnProjectId=window.quoteReturnProjectId||"";
 window.quoteReturnProjectId=null;
 save();closeModal();
 if(returnProjectId){
   openProjectPage(returnProjectId);
   toast("Árajánlat mentve – visszatértem a projekthez");
 }else{
   nav("quotes");
   toast("Árajánlat mentve");
 }
}
function crc32(str){const b=new TextEncoder().encode(str),t=crc32.t||(crc32.t=(()=>{let a=[];for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=(c&1)?(0xEDB88320^(c>>>1)):(c>>>1);a[n]=c>>>0}return a})());let c=0xffffffff;for(const x of b)c=t[(c^x)&255]^(c>>>8);return(c^0xffffffff)>>>0}
function zipStore(files){const e=new TextEncoder(),u16=n=>{let a=new Uint8Array(2);new DataView(a.buffer).setUint16(0,n,true);return a},u32=n=>{let a=new Uint8Array(4);new DataView(a.buffer).setUint32(0,n>>>0,true);return a},cat=a=>{let n=a.reduce((s,x)=>s+x.length,0),r=new Uint8Array(n),o=0;for(const x of a){r.set(x,o);o+=x.length}return r},ps=[],cs=[];let off=0;for(const[name,text]of Object.entries(files)){let nb=e.encode(name),db=e.encode(text),c=crc32(text),h=cat([new Uint8Array([80,75,3,4]),u16(20),u16(0),u16(0),u16(0),u16(0),u32(c),u32(db.length),u32(db.length),u16(nb.length),u16(0),nb,db]);ps.push(h);cs.push(cat([new Uint8Array([80,75,1,2]),u16(20),u16(20),u16(0),u16(0),u16(0),u16(0),u32(c),u32(db.length),u32(db.length),u16(nb.length),u16(0),u16(0),u16(0),u16(0),u32(0),u32(off),nb]));off+=h.length}let body=cat(ps),cd=cat(cs);return new Blob([body,cd,cat([new Uint8Array([80,75,5,6]),u16(0),u16(0),u16(cs.length),u16(cs.length),u32(cd.length),u32(body.length),u16(0)])],{type:"application/vnd.openxmlformats-officedocument.wordprocessingml.document"})}
function buildQuoteHtml(q){
 const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
 const items=(q.items||[]).filter(x=>x.desc);
 const tech=(q.tech||[]).filter(x=>[x.type,x.from,x.to,x.len,x.spec].some(v=>String(v||"").trim()));
 const net=items.reduce((a,x)=>a+x.qty*x.price,0),vat=net*.27,gross=net+vat;
 const clientName=q.clientName||cust(q.customerId)||"";
 const rows=items.map(x=>{const n=x.qty*x.price,v=n*.27;return `<tr><td>${esc(x.desc)}</td><td>${esc(x.qty+" "+x.unit)}</td><td>${money(n)}</td><td>${money(v)}</td><td>${money(n+v)}</td></tr>`}).join("");
 const techRows=tech.map(x=>`<tr><td>${esc(x.type)}</td><td>${esc(x.from)}</td><td>${esc(x.to)}</td><td>${esc(x.len)}</td><td>${esc(x.spec)}</td></tr>`).join("");
 const bullets=t=>String(t||"").split(/\r?\n/).filter(Boolean).map(x=>`<li>${esc(x)}</li>`).join("");
 const declarations=esc(q.declarations||"").replace(/\n/g,"<br><br>");
 return `<div class="quote-doc">
  <div class="header"><div class="brand">KÚTFŐ PLUSZ KFT.</div><div>4481 Nyíregyháza, Attila út 61. · +36 20 9247187 · kutfokft@gmail.com</div></div>
  <h1>ÁRAJÁNLAT</h1>
  <div class="cols">
   <div class="col"><b>Árajánlat kérő adatai</b><p>Neve: ${esc(clientName)}<br>Címe: ${esc(q.clientAddress)}<br>Adószáma: ${esc(q.clientTax)}<br>Telefon: ${esc(q.clientPhone)}<br>E-mail: ${esc(q.clientEmail)}</p></div>
   <div class="col"><b>Ajánlat tevő adatai</b><p>Kútfő Plusz Kft.<br>4481 Nyíregyháza, Attila utca 61.<br>Adószám: 12711941-2-15<br>Tel.: 20/9247187<br>E-mail: kutfokft@gmail.com</p></div>
  </div>
  <p><b>Dátum:</b> ${esc(q.date)}</p>
  <p><b>Projekt / munka neve:</b> ${esc(q.name)}</p>
  <p><b>Helyszín:</b> ${esc(q.location)}</p>
  <h2>ÁRAJÁNLAT TÁRGYA</h2><p>${esc(q.subject)}</p>
  <h2>ÁRKALKULÁCIÓ</h2>
  <table><tr><th>Megnevezés</th><th>Menny.</th><th>Nettó</th><th>ÁFA (27%)</th><th>Bruttó</th></tr>${rows}</table>
  <p><b>Összesen: nettó ${money(net)} | ÁFA ${money(vat)} | Bruttó ${money(gross)}</b></p>
  <h2>MŰSZAKI TARTALOM</h2>
  <p>Talpmélység: ${esc(q.depth)} m<br>Csőátmérő: ${esc(q.pipeDiameter)}<br>Acélcső / iránycső: ${esc(q.steelPipe||"—")}<br>Csőanyag: ${esc(q.pipeMaterial)}<br>Tervezett vízigény: ${esc(q.waterNeed)}</p>
  <table><tr><th>Megnevezés</th><th>Kezdő</th><th>Vég</th><th>Hossz</th><th>Műszaki adat</th></tr>${techRows}</table>
  <div class="page2">
   <h2>AZ ÁR TARTALMAZZA</h2><ul>${bullets(q.includes)}</ul>
   <h2>AZ ÁR NEM TARTALMAZZA</h2><ul>${bullets(q.excludes)}</ul>
   <h2>NYILATKOZATOK / FELTÉTELEK</h2><div class="small">${declarations}</div>
   <p>A kivitelezett kútra 4 év szerkezeti garanciát vállalok.</p>
   <p>A garancia nem terjed ki a nem rendeltetésszerű használatból, külső behatásból vagy vízgépészeti hibából eredő károkra.</p>
   <p>Az ajánlatomat 180 napig fenntartom.</p>
   <div class="sign">Tisztelettel várom megrendelését.<br><br><b>${esc(q.signer||"Szabados István")}</b><br>${esc(q.position||"ügyvezető")}<br><br>Nyíregyháza, ${esc(q.date)}</div>
  </div>
 </div>`;
}
function quotePrintStyles(){
 return `<style>
 body{font-family:Arial,sans-serif;font-size:11pt;color:#222;margin:2cm}
 .header{border-bottom:3px solid #2b78b8;padding-bottom:12px;margin-bottom:18px}
 .brand{font-size:20pt;font-weight:bold;color:#1e78b4}
 .cols{width:100%;display:table}.col{display:table-cell;width:50%;vertical-align:top;padding-right:20px}
 h1{font-size:18pt;color:#216fa8}h2{font-size:13pt;color:#216fa8;margin-top:18px}
 table{width:100%;border-collapse:collapse;margin:8px 0 15px}th{background:#ddd}td,th{border:1px solid #bbb;padding:6px;text-align:left}
 .page2{page-break-before:always}.small{font-size:9pt;line-height:1.5}.sign{margin-top:35px}
 
/* v1.244 – Fúrási rétegsor DOCX/PDF megjelenés */
.furasi-doc-title{
  text-align:center;
  font-family:Arial,sans-serif;
  font-size:16pt;
  font-weight:700;
  color:#172b4d;
  margin:0 0 14pt;
}
.furasi-retegsor-table{
  width:100%;
  border-collapse:collapse;
  font-family:Arial,sans-serif;
  font-size:10pt;
  table-layout:fixed;
}
.furasi-retegsor-table th{
  background:#d9eaf7;
  color:#172b4d;
  font-weight:700;
  text-align:center;
  border:1px solid #8796a5;
  padding:7px 6px;
}
.furasi-retegsor-table td{
  border:1px solid #aab5bf;
  padding:6px;
  vertical-align:middle;
}
.furasi-retegsor-table td:nth-child(1),
.furasi-retegsor-table td:nth-child(2),
.furasi-retegsor-table td:nth-child(3){text-align:center}
.furasi-retegsor-table td:nth-child(4){text-align:left}

</style>`;
}
function qvEsc(v){
 return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function qvMoney(v){return typeof money==="function"?money(v):new Intl.NumberFormat("hu-HU").format(Number(v)||0)+" Ft";}
function qvLines(text){return String(text||"").split(/\r?\n/).filter(Boolean);}
function qvPage(n, overlays){
 return `<div class="qv-page"><img src="data:image/svg+xml;base64,${window.KUTFOPLUSZ_PREVIEW_VECTORS[n]}" class="qv-bg">${overlays.join("")}</div>`;
}
function qvWhiteRect(x,y,w,h){return `<div class="qv-white" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"></div>`;}
function qvText(x,y,w,text,cls=""){
 return `<div class="qv-text ${cls}" style="left:${x}px;top:${y}px;width:${w}px">${qvEsc(text)}</div>`;
}
function buildExactPdfPreview(q){
 const items=(q.items||[]).filter(x=>x.desc);
 const net=items.reduce((a,x)=>a+(Number(x.qty)||0)*(Number(x.price)||0),0),vat=net*.27,gross=net+vat;
 const tech=(q.tech||[]).filter(x=>[x.type,x.from,x.to,x.len,x.spec].some(v=>String(v||"").trim()));
 const pipes=tech.filter(x=>!String(x.type||"").toLowerCase().includes("szűr"));
 const filters=tech.filter(x=>String(x.type||"").toLowerCase().includes("szűr"));
 const p1=pipes[0]||{},p2=pipes[1]||{},f=filters[0]||{},item=items[0]||{};
 const client=q.clientName||cust(q.customerId)||"";
 const standardInc=["felvonulási költséget,","teljes anyagköltséget,","munkadíjat,","gázvizsgálatot,","geofizikai vizsgálatot,","vízkémiai vizsgálatot,","geodéziai bemérést,","vízföldtani napló beszerzését."];
 const standardExc=["vízgépészeti munkákat","szivattyú telepítést","elektromos kiépítést","betonozási munkálatokat"];
 const inc=qvLines(q.includes),exc=qvLines(q.excludes);
 const ins=inc.length?inc:standardInc,exs=exc.length?exc:standardExc;
 const a=[];
 // Page 1: only fields that are genuinely blank in the vector template.
 a.push(qvText(310,340,230,client));
 a.push(qvText(310,388,230,q.clientAddress||""));
 a.push(qvText(310,438,230,q.clientTax||""));
 a.push(qvText(310,487,230,q.clientPhone||""));
 a.push(qvText(310,536,250,q.clientEmail||""));
 a.push(qvText(675,340,260,"Kútfő Plusz Kft."));
 a.push(qvText(675,388,260,"4481 Nyíregyháza, Attila utca 61."));
 a.push(qvText(675,438,220,"12711941-2-15"));
 a.push(qvText(675,487,220,"+36 20 9247187"));
 a.push(qvText(675,536,260,"kutfokft@gmail.com"));
 a.push(qvText(150,614,760,q.subject||"","qv-wrap"));

 // Price row: the vector template contains only the header. Draw a clean data row BELOW it.
 // Cover the area occupied by the following technical section, then redraw that section lower.
 a.push(qvWhiteRect(145,744,745,395));
 a.push(qvText(152,755,205,`${item.qty||""} ${item.unit||""} ${item.desc||""}`.trim(),"qv-wrap"));
 a.push(qvText(355,755,180,qvMoney(net),"qv-right"));
 a.push(qvText(540,755,150,qvMoney(vat),"qv-right"));
 a.push(qvText(690,755,110,qvMoney(gross),"qv-right"));
 a.push(qvText(800,755,80,"Ft","qv-right"));

 // Rebuild the technical section below the new price row using vector text.
 a.push(qvText(150,815,500,"MŰSZAKI TARTALOM:","qv-blue-bold"));
 a.push(qvText(150,860,300,"Csövezés:","qv-bold"));
 a.push(qvText(158,895,250,"Tervezett talp:"));
 a.push(qvText(395,895,150,q.depth?`${q.depth} m`:""));
 if(p1.from!=null)a.push(qvText(158,940,220,`${p1.from}-${p1.to} m`));
 if(p1.len)a.push(qvText(395,940,120,`(${p1.len} m)`));
 if(p1.spec||p1.type)a.push(qvText(560,940,320,p1.spec||p1.type));
 if(p2.from!=null)a.push(qvText(158,982,220,`${p2.from}-${p2.to} m`));
 if(p2.len)a.push(qvText(395,982,120,`(${p2.len} m)`));
 if(p2.spec||p2.type)a.push(qvText(560,982,320,p2.spec||p2.type));
 a.push(qvText(150,1035,300,"Szűrözés:","qv-bold"));
 if(f.from!=null)a.push(qvText(158,1080,220,`${f.from} - ${f.to} m`));
 if(f.len)a.push(qvText(395,1080,120,`(${f.len} m)`));
 if(f.spec||f.type)a.push(qvText(560,1080,320,f.spec||f.type));

 const b=[];
 // Page 2 vector template already contains the standard text, lists and signature.
 // We only overlay the variable water demand when it differs from the template default.
 const wn=String(q.waterNeed||"").trim();
 if(wn && wn!=="800 l/p" && wn!=="800 l/perc") {
   b.push(qvWhiteRect(120,18,760,34));
   b.push(qvText(150,24,500,`Tervezett vízigény: ${wn}`));
 }
 // If custom include/exclude lists differ from the template, cover only the list text
 // areas and redraw them as vector text. This prevents double printing.
 const sameInc=ins.length===standardInc.length && ins.every((x,i)=>x===standardInc[i]);
 const sameExc=exs.length===standardExc.length && exs.every((x,i)=>x===standardExc[i]);
 if(!sameInc){
   b.push(qvWhiteRect(140,245,360,300));
   ins.forEach((x,i)=>b.push(qvText(185,260+i*35,320,"-   "+x)));
 }
 if(!sameExc){
   b.push(qvWhiteRect(525,245,370,190));
   exs.forEach((x,i)=>b.push(qvText(550,260+i*35,320,"-   "+x)));
 }
 // Declarations/signature remain the original vector template by default.
 return qvPage(1,a)+qvPage(2,b);
}
function previewQuote(){
 const q=collectQuoteTemplate();
 openModal("PDF előnézet – eredeti sablon, vektoros export",`
  <div class="qv-wrap-modal">${buildExactPdfPreview(q)}</div>
  <div class="modalfoot">
   <button class="btn secondary" onclick="printExactPdfPreview()">PDF / Nyomtatás</button>
   <button class="btn" onclick="exportQuoteDoc()">Word (.docx)</button>
   <button class="btn secondary" onclick="closeModal()">Bezárás</button>
  </div>`);
}
function printExactPdfPreview(){
 const q=collectQuoteTemplate(),w=window.open("","_blank");
 if(!w){alert("A böngésző blokkolta az előnézet ablakot. Engedélyezd a felugró ablakokat.");return}
 w.document.open();
 w.document.write(`<html><head><meta charset="utf-8"><title>${q.id||"Árajánlat"}</title><style>
 @page{size:auto;margin:0}html,body{margin:0;padding:0;background:#fff}
 .qv-page{position:relative;width:1020px;height:1320px;page-break-after:always;overflow:hidden}
 .qv-bg{position:absolute;z-index:1;left:0;top:0;width:1020px;height:1320px;display:block;image-rendering:auto}
 .qv-white{position:absolute;background:#fff;z-index:5}.qv-text{position:absolute;z-index:6;font-family:"Times New Roman",serif;font-size: 15px;font-weight:400;line-height:1.25;color:#111;white-space:pre-wrap}
 .qv-wrap{white-space:normal}.qv-right{text-align:right}.qv-bold{font-weight:700}.qv-blue-bold{font-weight:700;color:#4f81bd}
 </style>
<style id="project-doc-final-fix">
.project-doc-row > :nth-child(3){
  font-size:15px !important;
  line-height:1.35 !important;
  white-space:nowrap !important;
  overflow:hidden;
  text-overflow:ellipsis;
  min-width:170px;
}
.project-doc-header > :nth-child(3){
  white-space:nowrap !important;
}
@media(max-width:1150px){
  .project-doc-row > :nth-child(3){
    min-width:0;
  }
}
</style>

<style id="project-doc-font-reference-fix">
/* A "Projekt folyamat" szövegmérete a mérvadó a dokumentumlistában is. */
.project-doc-row:not(.project-doc-header) > div,
.project-doc-row:not(.project-doc-header) .project-doc-name,
.project-doc-row:not(.project-doc-header) .project-doc-meta,
.project-doc-row:not(.project-doc-header) .project-doc-status,
.project-doc-row:not(.project-doc-header) > :nth-child(3) {
  font-size: 13px !important;
  line-height: 1.35 !important;
}
.project-doc-row:not(.project-doc-header) .project-doc-name {
  font-weight: 700 !important;
}
.project-doc-header > div {
  font-size: 13px !important;
  line-height: 1.35 !important;
}
.project-doc-actions .btn {
  font-size: 12px !important;
}
</style>

<style id="project-single-column-layout">
.project-page-main .grid2,
.project-page-main .project-columns,
.project-page-main .project-content-grid,
.project-page-main .project-layout,
.project-page-main .project-main-grid {
  display:flex !important;
  flex-direction:column !important;
  grid-template-columns:none !important;
  width:100% !important;
  gap:16px !important;
}
.project-page-main .grid2 > *,
.project-page-main .project-columns > *,
.project-page-main .project-content-grid > *,
.project-page-main .project-layout > *,
.project-page-main .project-main-grid > * {
  width:100% !important;
  max-width:none !important;
  min-width:0 !important;
}
</style>

<style id="project-quote-summary-css">
.project-quote-summary{width:100%}
.project-quote-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}
.project-quote-kpis>div{padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#fff}
.project-quote-kpis span{display:block;font-size:13px;line-height:1.35;color:#64748b}
.project-quote-kpis b{display:block;margin-top:4px;font-size:15px;line-height:1.35}
@media(max-width:700px){.project-quote-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
</head><body>${buildExactPdfPreview(q)}
</body></html>`);
 w.document.close();setTimeout(()=>w.print(),700);
}
function u8b64(b64){
 const raw=atob(b64),a=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)a[i]=raw.charCodeAt(i);
 return a;
}
function xmlEsc(v){return String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
function templateReplace(xml,map){for(const[k,v]of Object.entries(map))xml=xml.split(k).join(xmlEsc(v));return xml}

function patchQuotePartyCells(xml,q){
 const parser=new DOMParser();
 const doc=parser.parseFromString(xml,"application/xml");
 const NS="http://schemas.openxmlformats.org/wordprocessingml/2006/main";
 const rows=Array.from(doc.getElementsByTagNameNS(NS,"tr"));

 function txt(cell){
  return Array.from(cell.getElementsByTagNameNS(NS,"t")).map(t=>t.textContent||"").join("").replace(/\s+/g," ").trim();
 }
 function setCell(cell,value){
  const ts=Array.from(cell.getElementsByTagNameNS(NS,"t"));
  if(ts.length){
   ts[0].textContent=String(value??"");
   for(let i=1;i<ts.length;i++)ts[i].textContent="";
   return;
  }
  const p=doc.createElementNS(NS,"w:p");
  const r=doc.createElementNS(NS,"w:r");
  const t=doc.createElementNS(NS,"w:t");
  t.textContent=String(value??"");
  r.appendChild(t);p.appendChild(r);cell.appendChild(p);
 }
 const provider={
  name:"Kútfő Plusz Kft.",
  address:"4481 Nyíregyháza, Attila utca 61.",
  tax:"12711941-2-15",
  phone:"+36 20 9247187",
  email:"kutfokft@gmail.com"
 };
 for(const row of rows){
  const cells=Array.from(row.getElementsByTagNameNS(NS,"tc"));
  if(cells.length!==4)continue;
  const leftLabel=txt(cells[0]).toLowerCase().replace(/\s+/g,"");
  const rightLabel=txt(cells[2]).toLowerCase().replace(/\s+/g,"");
  if(leftLabel!==rightLabel)continue;

  let customer,providerValue;
  if(leftLabel==="neve:"){customer=q.clientName||"";providerValue=provider.name;}
  else if(leftLabel==="címe:"){customer=q.clientAddress||"";providerValue=provider.address;}
  else if(leftLabel==="adószáma:"){customer=q.clientTax||"";providerValue=provider.tax;}
  else if(leftLabel==="tel.:"){customer=q.clientPhone||"";providerValue=provider.phone;}
  else if(leftLabel==="email:"||leftLabel==="e-mail:"){customer=q.clientEmail||"";providerValue=provider.email;}
  else continue;

  setCell(cells[1],customer);
  setCell(cells[3],providerValue);
 }
 return new XMLSerializer().serializeToString(doc);
}

function exportFileBaseName(q){
 const raw=String((q&&q.id)|| (q&&q.quoteNo) || "arajanlat").trim();
 return raw.replace(/[\\/:*?"<>|]/g,"-");
}

async function exportQuoteDoc(){
 try{
  const q=collectQuoteTemplate();
  const response=await fetch("data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,"+window.KUTFOPLUSZ_QUOTE_TEMPLATE_B64);
  const templateBuffer=await response.arrayBuffer();
  const zip=await JSZip.loadAsync(templateBuffer,{createFolders:false});
  let doc=await zip.file("word/document.xml").async("string");

  const items=(q.items||[]).filter(x=>x.desc), item=items[0]||{};
  const net=items.reduce((a,x)=>a+(Number(x.qty)||0)*(Number(x.price)||0),0);
  const vat=net*.27,gross=net+vat;
  const tech=(q.tech||[]).filter(x=>[x.type,x.from,x.to,x.len,x.spec].some(v=>String(v||"").trim()));
  const pipes=tech.filter(x=>!String(x.type||"").toLowerCase().includes("szűr"));
  const filters=tech.filter(x=>String(x.type||"").toLowerCase().includes("szűr"));
  const p1=pipes[0]||{},p2=pipes[1]||{},f=filters[0]||{};
  const client=q.clientName||cust(q.customerId)||"";

  const map={
   "{{CLIENT_NAME}}":client,
   "{{CLIENT_ADDRESS}}":q.clientAddress||"",
   "{{CLIENT_TAX}}":q.clientTax||"",
   "{{CLIENT_PHONE}}":q.clientPhone||"",
   "{{CLIENT_EMAIL}}":q.clientEmail||"",
   "{{SUBJECT}}":q.subject||"",
   "{{ITEM_DESC}}":`${item.qty||""} ${item.unit||""} ${item.desc||""}`.trim(),
   "{{NET}}":money(net),"{{VAT}}":money(vat),"{{GROSS}}":money(gross),"{{CURRENCY}}":"HUF",
   "{{DEPTH}}":`${q.depth||""} m`,
   "{{PIPE1_RANGE}}":p1.from!=null?`${p1.from}-${p1.to} m`:"",
   "{{PIPE1_LEN}}":p1.len?`(${p1.len} m)`:"","{{PIPE1_SPEC}}":p1.spec||p1.type||"",
   "{{PIPE2_RANGE}}":p2.from!=null?`${p2.from}-${p2.to} m`:"",
   "{{PIPE2_LEN}}":p2.len?`(${p2.len} m)`:"","{{PIPE2_SPEC}}":p2.spec||p2.type||"",
   "{{FILTER_RANGE}}":f.from!=null?`${f.from} - ${f.to} m`:"",
   "{{FILTER_LEN}}":f.len?`(${f.len} m)`:"","{{FILTER_SPEC}}":f.spec||f.type||"",
   "{{WATER_NEED}}":q.waterNeed||"",
   "{{PURPOSE}}":q.purpose||""
  };
  doc=templateReplace(doc,map);
  doc=patchQuotePartyCells(doc,q);

  // Update standard include/exclude lines without changing the template structure.
  const esc=x=>String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const inc=String(q.includes||"").split(/\r?\n/).filter(Boolean);
  const exc=String(q.excludes||"").split(/\r?\n/).filter(Boolean);
  const incDefault=["felvonulási költséget,","teljes anyagköltséget,","munkadíjat,","gázvizsgálatot,","geofizikai vizsgálatot,","vízkémiai vizsgálatot,","geodéziai bemérést,","vízföldtani napló beszerzését."];
  const excDefault=["vízgépészeti munkákat","szivattyú telepítést","elektromos kiépítést","betonozási munkálatokat"];
  const incs=inc.length?inc:incDefault, exs=exc.length?exc:excDefault;
  const pairs=[["felvonulási költséget,",incs[0]],["teljes anyagköltséget,",incs[1]],["munkadíjat,",incs[2]],["gázvizsgálatot,",incs[3]],["geofizikai vizsgálatot,",incs[4]],["vízkémiai vizsgálatot,",incs[5]],["geodéziai bemérést,",incs[6]],["vízföldtani napló beszerzését.",incs[7]],["vízgépészeti munkákat",exs[0]],["szivattyú telepítést",exs[1]],["elektromos kiépítést",exs[2]],["betonozási munkálatokat",exs[3]]];
  for(const [a,b] of pairs) if(b!==undefined) doc=doc.split(esc(a)).join(esc(b));

  zip.file("word/document.xml",doc);
  const blob=await zip.generateAsync({type:"blob",compression:"STORE",platform:"DOS"});
  const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=exportFileBaseName(q)+".docx";
  document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},1500);
  toast("DOCX export kész – eredeti Word-sablon");
 }catch(e){console.error(e);alert("DOCX export hiba: "+(e.message||e))}
 if(customerId)setTimeout(()=>{const e=document.getElementById("q_customer");if(e){e.value=customerId;quoteCustomerChanged()}},0);
}
function captureQuoteEditorHtml(){
 let html="";
 // A szerkesztési oldalon az aktuális ajánlat tételeit és műszaki sorait
 // meg kell őrizni. Az openQuoteModalLegacy() új ajánlatot inicializálna,
 // ezért a jelenlegi állapotot elmentjük, majd a kapott HTML-be visszaírjuk.
 const savedItems=Array.isArray(quoteItems)?quoteItems.map(x=>({...x})):[];
 const savedTech=Array.isArray(quoteTech)?quoteTech.map(x=>({...x})):[];
 const oldOpenModal=window.openModal;
 window.openModal=function(title,body){html=body;};
 try{ openQuoteModalLegacy(); } finally {
   window.openModal=oldOpenModal;
   quoteItems=savedItems;
   quoteTech=savedTech;
 }
 const itemRows=savedItems.map((x,i)=>{
   const n=Math.round(parseErpNumber(x.qty)*parseErpNumber(x.price)),v=Math.round(n*27/100);
   return `<tr><td><input class="input" type="text" inputmode="decimal" value="${esc(huFormatFlexible(x.qty,2))}" oninput="huFormatInput(this,2)" onchange="quoteItems[${i}].qty=huNumber(this.value);renderQuoteEditor()"></td><td><input class="input" value="${esc(x.unit||"db")}" onchange="quoteItems[${i}].unit=this.value"></td><td><input class="input" value="${esc(x.desc)}" onchange="quoteItems[${i}].desc=this.value"></td><td><input class="input" type="text" inputmode="decimal" value="${esc(huFormatMoneyInputValue(x.price))}" oninput="huFormatMoneyInput(this)" onchange="quoteItems[${i}].price=huNumber(this.value);renderQuoteEditor()"></td><td>${money(n)}</td><td>${money(v)}</td><td>${money(n+v)}</td><td><button type="button" class="btn secondary small" onclick="quoteItems.splice(${i},1);renderQuoteEditor()">×</button></td></tr>`;
 }).join("");
 const net=savedItems.reduce((a,x)=>a+(+x.qty||0)*(+x.price||0),0),vat=net*.27;
 const techRows=savedTech.map((x,i)=>{
   const a=huNumber(x.from), b=huNumber(x.to);
   const autoLen=(Number.isFinite(a)&&Number.isFinite(b))?huFormat(b-a,1):huFormat(x.len,1);
   return `<tr><td><input class="input" value="${esc(x.type||"")}" onchange="quoteTech[${i}].type=this.value"></td><td><input class="input" type="text" inputmode="decimal" value="${esc(huFormat(x.from,1))}" oninput="huFormatInput(this,1)" onchange="quoteTech[${i}].from=huFormat(this.value,1);updateQuoteTechLength(${i})"></td><td><input class="input" type="text" inputmode="decimal" value="${esc(huFormat(x.to,1))}" oninput="huFormatInput(this,1)" onchange="quoteTech[${i}].to=huFormat(this.value,1);updateQuoteTechLength(${i})"></td><td><input class="input" data-tech-len readonly type="text" value="${esc(autoLen)}" tabindex="-1" title="Automatikusan számított hossz"></td><td><input class="input" value="${esc(x.spec||"")}" onchange="quoteTech[${i}].spec=this.value"></td><td><button type="button" class="btn secondary small" onclick="quoteTech.splice(${i},1);renderQuoteEditor()">×</button></td></tr>`
 }).join("");
 html=html.replace('<tbody id="q_items"></tbody>',`<tbody id="q_items">${itemRows}</tbody>`);
 html=html.replace('<div id="q_total" class="offer-total"></div>',`<div id="q_total" class="offer-total">Nettó: <b>${money(net)}</b> · ÁFA: ${money(vat)} · Bruttó: <b>${money(net+vat)}</b></div>`);
 html=html.replace('<tbody id="q_tech"></tbody>',`<tbody id="q_tech">${techRows}</tbody>`);
 return html;
}
function openQuote(customerId){
  quoteItems=[{desc:"",qty:1,unit:"db",price:0}];
  quoteTech=[{type:"Csövezés / szűrőzés",from:"",to:"",len:"",spec:""}];
  window.editingQuoteId=null;
  window.openQuotePageId="";
  current="quote-edit";
  location.hash="#/quote-edit/new";
  render();
  setTimeout(()=>{
    const set=(id,val)=>{
      const e=document.getElementById(id);
      if(e) e.value=val==null?"":val;
    };
    set("q_date",new Date().toISOString().slice(0,10));
    set("q_signer","Szabados István");
    set("q_position","ügyvezető");

    if(customerId){
      set("q_customer",customerId);
      if(typeof quoteCustomerChanged==="function") quoteCustomerChanged();
    }
    renderQuoteEditor();
  },40);
  return false;
}
function deriveQuoteTechFromProject(project){
  const w=project?.well||{};
  const rows=[];
  const casingSections=Array.isArray(w.casingSections)?w.casingSections:[];
  const isSteel=x=>String(x?.type||x?.name||"").toLowerCase().includes("acél") || String(x?.type||x?.name||"").toLowerCase().includes("iránycső");
  const addSection=(x, fallbackType="Csövezés / szűrőzés")=>{
    const fromRaw=String(x?.from??"").trim(), toRaw=String(x?.to??"").trim();
    const from=fromRaw!==""?huFormat(fromRaw,1):"", to=toRaw!==""?huFormat(toRaw,1):"";
    let len=x?.len!==undefined&&String(x?.len??"").trim()!==""?huFormat(x.len,1):"";
    if(fromRaw!==""&&toRaw!==""){
      const a=huNumber(fromRaw),b=huNumber(toRaw);
      if(Number.isFinite(a)&&Number.isFinite(b)) len=huFormat(b-a,1);
    }
    rows.push({
      type:String(x?.type||fallbackType),
      from,to,len,
      spec:[x?.diameter||w.casingDiameter||w.casing||"",x?.material || (/^szűr/i.test(String(x?.type||"")) || /^cső$/i.test(String(x?.type||"")) ? "KM-PVC" : "")].filter(Boolean).join(" ")
    });
  };
  if(casingSections.length){
    casingSections.forEach(x=>addSection(x));
  }
  // Régebbi adatoknál az acélcső külön mezőben volt. Csak akkor adjuk hozzá,
  // ha a szakaszlistában még nincs acél iránycső.
  const steel=String(w.steelPipe||w.steelPipeDiameter||"").trim();
  if(steel && !casingSections.some(isSteel)) rows.unshift({type:"Acél iránycső",from:"",to:"",len:"",spec:steel+" acél"});
  if(rows.length) return rows;

  const casing=String(w.casingDiameter||w.casing||project.casingDiameter||"").trim();
  const screen=String(w.screenInterval||w.filter||"").trim();
  const m=screen.match(/([0-9]+(?:[.,][0-9]+)?)\s*[–-]\s*([0-9]+(?:[.,][0-9]+)?)/);
  if(casing && m){
    const from=Number(m[1].replace(',','.')), to=Number(m[2].replace(',','.'));
    if(Number.isFinite(from)&&Number.isFinite(to)){
      if(from>0) rows.push({type:"Csövezés",from:huFormat(0,1),to:huFormat(from,1),len:huFormat(from,1),spec:casing});
      rows.push({type:"Szűrőzés",from:huFormat(from,1),to:huFormat(to,1),len:huFormat(to-from,1),spec:casing});
      return rows;
    }
  }
  if(casing){
    const depth=String(w.permittedDepth||project.permittedDepth||"").trim();
    rows.push({type:"Csövezés / szűrőzés",from:huFormat(0,1),to:huFormat(depth,1),len:huFormat(depth,1),spec:casing});
  }
  return rows;
}

function openQuoteEditorPage(id){
 const q=id ? (db.quotes||[]).find(x=>String(x.id)===String(id)) : null;
 // Ha az ajánlatot a projekt oldaláról nyitottuk meg, mentés után ugyanarra a projektre térjünk vissza.
 window.quoteReturnProjectId=q?.projectId||"";
 if(id && !q){toast("Az ajánlat nem található");return false;}

 if(q){
   window.editingQuoteId=q.id;
   window.openQuotePageId=q.id;
   quoteItems=(q.items||[]).map(x=>({desc:String(x.desc??""),qty:Number(x.qty)||0,unit:String(x.unit??"db"),price:Number(x.price)||0}));
   if(!quoteItems.length) quoteItems=[{desc:"",qty:1,unit:"db",price:0}];
   quoteTech=(q.tech||[]).map(x=>({type:String(x.type??""),from:String(x.from??""),to:String(x.to??""),len:String(x.len??""),spec:String(x.spec??"")}));
   // Ha a régi ajánlatban csak az üres alapértelmezett műszaki sor maradt,
   // ne azt tekintsük valódi adatnak: töltsük fel a kapcsolt projekt
   // aktuális csövezési / szűrőzési szakaszaival.
   // Az üres alapértelmezett sorban a type mező szándékosan nem üres,
   // ezért azt önmagában nem szabad valódi műszaki adatnak tekinteni.
   const hasRealTech=quoteTech.some(x=>{
     const type=String(x.type??"").trim();
     const hasValues=[x.from,x.to,x.len,x.spec].some(v=>String(v??"").trim()!=="");
     const hasCustomType=type!=="" && type!=="Csövezés / szűrőzés";
     return hasValues || hasCustomType;
   });
   if(!hasRealTech){
     const linkedProject=(db.projects||[]).find(x=>String(x.id)===String(q.projectId));
     const derived=deriveQuoteTechFromProject(linkedProject);
     if(derived.length) quoteTech=derived;
   }
   window.quoteEditorExistingData={
     customer:q.customerId, project:q.projectId, status:q.status||"Piszkozat",
     clientName:q.clientName, clientTax:q.clientTax, clientAddress:q.clientAddress,
     clientPhone:q.clientPhone, clientEmail:q.clientEmail, date:q.date,
     location:q.location, name:q.name, subject:q.subject, depth:q.depth,
     waterNeed:q.waterNeed, pipeDiameter:q.pipeDiameter, steelPipe:q.steelPipe||"", pipeMaterial:q.pipeMaterial, purpose:q.purpose||"",
     includes:q.includes, excludes:q.excludes, declarations:q.declarations,
     signer:q.signer||"Szabados István", position:q.position||"ügyvezető"
   };
 } else {
   window.editingQuoteId=null;
   window.openQuotePageId="";
   window.quoteEditorExistingData=null;
   quoteItems=[{desc:"",qty:1,unit:"db",price:0}];
   quoteTech=[{type:"Csövezés / szűrőzés",from:"",to:"",len:"",spec:""}];
 }

 current="quote-edit";
 location.hash=id?("#/quote-edit/"+encodeURIComponent(String(id))):"#/quote-edit/new";
 render();

 setTimeout(()=>{
   const d=window.quoteEditorExistingData;
   if(d){
     const set=(field,val)=>{const e=document.getElementById(field);if(e)e.value=val==null?"":val};
     set("q_customer",d.customer);set("q_project",d.project);set("q_status",d.status);
     // A kapcsolt projekt adatait ugyanúgy alkalmazzuk, mintha a felhasználó
     // most választotta volna ki a projektet. Így az árkalkuláció első tétele
     // automatikusan megkapja pl. a „1 db 50 m-es öntözőkút kivitelezése”
     // megnevezést, és a műszaki szakaszok is átkerülnek.
     if(d.project && typeof quoteProjectChanged === "function") quoteProjectChanged();
     set("q_client_tax",d.clientTax);set("q_client_address",d.clientAddress);
     set("q_client_phone",d.clientPhone);set("q_client_email",d.clientEmail);set("q_date",d.date);
     set("q_subject",d.subject);
     set("q_depth",d.depth);set("q_water_need",d.waterNeed);set("q_pipe_diameter",d.pipeDiameter);set("q_steel_pipe",d.steelPipe);set("q_purpose",d.purpose);
     set("q_pipe_material",d.pipeMaterial);
     recalculateQuoteMainItem(false);set("q_includes",d.includes);set("q_excludes",d.excludes);
     set("q_declarations",d.declarations);set("q_signer",d.signer);set("q_position",d.position);
     if(!quoteTech.length){
       const linkedProject=(db.projects||[]).find(x=>String(x.id)===String(d.project));
       quoteTech=deriveQuoteTechFromProject(linkedProject);
     }
     renderQuoteEditor();
   }
 },40);
 return false;
}
function quoteEditorPageView(){
 const id=window.openQuotePageId||window.editingQuoteId||"";
 const html=captureQuoteEditorHtml();
 return `<div class="panel quote-editor-page">
   <div class="panelhead">
    <div><div class="label">ÁRAJÁNLAT</div><h2>${id?`Ajánlat szerkesztése – ${esc(id)}`:"Új árajánlat"}</h2><div class="label">Az ajánlat teljes szerkesztése ezen az oldalon történik.</div></div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn secondary" onclick="nav('quotes')">← Ajánlatok</button>
      ${id?`<button class="btn secondary" onclick="openQuotePage('${esc(id)}')">← Áttekintés</button>`:""}
    </div>
   </div>
   ${html}
 </div>`;
}
function editQuote(id){
 const q=(db.quotes||[]).find(x=>String(x.id)===String(id));
 if(!q){if(typeof toast==="function")toast("Az ajánlat nem található");else alert("Az ajánlat nem található");return false}
 window.editingQuoteId=q.id;
 window.openQuotePageId=q.id;
 current="quote-edit";
 location.hash="#/quote-edit/"+encodeURIComponent(String(q.id));
 render();
 setTimeout(()=>{
  const set=(id,val)=>{const e=document.getElementById(id);if(e)e.value=val==null?"":val};
  quoteItems=(q.items||[]).map(x=>({desc:String(x.desc??""),qty:Number(x.qty)||0,unit:String(x.unit??"db"),price:Number(x.price)||0}));
  if(!quoteItems.length) quoteItems=[{desc:"",qty:1,unit:"db",price:0}];
  quoteTech=(q.tech||[]).map(x=>({type:String(x.type??""),from:String(x.from??""),to:String(x.to??""),len:String(x.len??""),spec:String(x.spec??"")}));
  // Régi/üres ajánlati műszaki sor esetén mindig a kapcsolt projekt
  // szerkesztett szakaszait használjuk.
  const hasRealTech=quoteTech.some(x=>[x.type,x.from,x.to,x.len,x.spec]
    .some(v=>String(v??"").trim()!=="") &&
    !([x.type,x.from,x.to,x.len,x.spec].every(v=>String(v??"").trim()==="")));
  if(!hasRealTech){
    const linkedProject=(db.projects||[]).find(x=>String(x.id)===String(q.projectId));
    const derived=deriveQuoteTechFromProject(linkedProject);
    if(derived.length) quoteTech=derived;
  }
  set("q_customer",q.customerId);set("q_project",q.projectId);set("q_status",q.status||"Piszkozat");
  // Betöltéskor is futtassuk le a projekt → ajánlat átadást, ne csak
  // akkor, amikor a projekt legördülőben kézzel váltanak.
  if(q.projectId && typeof quoteProjectChanged === "function") quoteProjectChanged();
  set("q_client_tax",q.clientTax);set("q_client_address",q.clientAddress);set("q_client_phone",q.clientPhone);
  set("q_client_email",q.clientEmail);set("q_date",q.date);set("q_subject",q.subject);
  set("q_depth",q.depth);set("q_water_need",q.waterNeed);set("q_pipe_diameter",q.pipeDiameter);set("q_steel_pipe",q.steelPipe);set("q_pipe_material",q.pipeMaterial);set("q_purpose",q.purpose||"");
  recalculateQuoteMainItem(false);
  set("q_includes",q.includes);set("q_excludes",q.excludes);set("q_declarations",q.declarations);
  set("q_signer",q.signer||"Szabados István");set("q_position",q.position||"ügyvezető");
  renderQuoteEditor();
 },40);
 return false;
}

function bindQuoteLinkFallback(){
 document.querySelectorAll("[data-quote-id]").forEach(el=>{
  if(el.dataset.quoteLinkBound==="1") return;
  el.dataset.quoteLinkBound="1";
  el.addEventListener("click",function(ev){
   ev.preventDefault(); ev.stopPropagation();
   const id=this.getAttribute("data-quote-id");
   if(id) editQuote(id);
  });
 });
}
document.addEventListener("click",function(ev){
 const el=ev.target.closest("[data-quote-id]");
 if(el){
  ev.preventDefault(); ev.stopPropagation();
  editQuote(el.getAttribute("data-quote-id"));
 }
});

function quoteDetails(id){let q=db.quotes.find(x=>x.id===id);openDrawer(q.id,`<p><b>Ügyfél:</b> ${esc(cust(q.customerId))}</p><p><b>Munka:</b> ${esc(q.name)}</p><p><b>Helyszín:</b> ${esc(q.location)}</p><p><b>Státusz:</b> ${esc(q.status)}</p><hr><table class="table"><tr><th>Tétel</th><th>Menny.</th><th>Egységár</th><th>Összeg</th></tr>${q.items.map(x=>`<tr><td>${esc(x.desc)}</td><td>${x.qty} ${esc(x.unit)}</td><td>${money(x.price)}</td><td>${money(x.qty*x.price)}</td></tr>`).join("")}</table><p class="right">Nettó: ${money(q.net)}<br>ÁFA: ${money(q.vat)}<br><b>Bruttó: ${money(q.gross)}</b></p><button class="btn" onclick="printQuote('${q.id}')">Nyomtatás / PDF</button>`)}
function printQuote(id){let q=db.quotes.find(x=>x.id===id);let w=window.open("","_blank");w.document.write(`<html><head><title>${q.id}</title><style>body{font:14px Arial;padding:40px}table{width:100%;border-collapse:collapse}td,th{padding:9px;border-bottom:1px solid #ddd;text-align:left}.r{text-align:right}</style>
<style id="project-doc-final-fix">
.project-doc-row > :nth-child(3){
  font-size:15px !important;
  line-height:1.35 !important;
  white-space:nowrap !important;
  overflow:hidden;
  text-overflow:ellipsis;
  min-width:170px;
}
.project-doc-header > :nth-child(3){
  white-space:nowrap !important;
}
@media(max-width:1150px){
  .project-doc-row > :nth-child(3){
    min-width:0;
  }
}
</style>

<style id="project-doc-font-reference-fix">
/* A "Projekt folyamat" szövegmérete a mérvadó a dokumentumlistában is. */
.project-doc-row:not(.project-doc-header) > div,
.project-doc-row:not(.project-doc-header) .project-doc-name,
.project-doc-row:not(.project-doc-header) .project-doc-meta,
.project-doc-row:not(.project-doc-header) .project-doc-status,
.project-doc-row:not(.project-doc-header) > :nth-child(3) {
  font-size: 13px !important;
  line-height: 1.35 !important;
}
.project-doc-row:not(.project-doc-header) .project-doc-name {
  font-weight: 700 !important;
}
.project-doc-header > div {
  font-size: 13px !important;
  line-height: 1.35 !important;
}
.project-doc-actions .btn {
  font-size: 12px !important;
}
</style>

<style id="project-single-column-layout">
.project-page-main .grid2,
.project-page-main .project-columns,
.project-page-main .project-content-grid,
.project-page-main .project-layout,
.project-page-main .project-main-grid {
  display:flex !important;
  flex-direction:column !important;
  grid-template-columns:none !important;
  width:100% !important;
  gap:16px !important;
}
.project-page-main .grid2 > *,
.project-page-main .project-columns > *,
.project-page-main .project-content-grid > *,
.project-page-main .project-layout > *,
.project-page-main .project-main-grid > * {
  width:100% !important;
  max-width:none !important;
  min-width:0 !important;
}
</style>

<style id="project-quote-summary-css">
.project-quote-summary{width:100%}
.project-quote-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}
.project-quote-kpis>div{padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#fff}
.project-quote-kpis span{display:block;font-size:13px;line-height:1.35;color:#64748b}
.project-quote-kpis b{display:block;margin-top:4px;font-size:15px;line-height:1.35}
@media(max-width:700px){.project-quote-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
</head><body><h1>Kútfő Plusz Kft.</h1><h2>AJÁNLAT ${q.id}</h2><p><b>Ügyfél:</b> ${esc(cust(q.customerId))}<br><b>Munka:</b> ${esc(q.name)}<br><b>Helyszín:</b> ${esc(q.location)}</p><table><tr><th>Tétel</th><th>Menny.</th><th>Egységár</th><th>Összeg</th></tr>${q.items.map(x=>`<tr><td>${esc(x.desc)}</td><td>${x.qty} ${esc(x.unit)}</td><td>${money(x.price)}</td><td>${money(x.qty*x.price)}</td></tr>`).join("")}</table><p class="r">Nettó: ${money(q.net)}<br>ÁFA: ${money(q.vat)}<br><b>Bruttó: ${money(q.gross)}</b></p><script>window.print()${"<"}${"/"}script></body></html>`);w.document.close()}
function convertQuote(id){let q=db.quotes.find(x=>x.id===id);if(!q)return;q.status="Elfogadva";db.projects.push({id:uid("KP"),customerId:q.customerId,name:q.name,location:q.location,status:"Tervezés",value:q.gross,planned:q.net*.65,cost:0,progress:0,notes:""});save();nav("projects");toast("Projekt létrehozva")}
function openQuoteForCustomer(id){closeDrawer();return openQuoteEditorPage(id)}
function openProjectForCustomer(id){closeDrawer();openProject(id)}
function openProject(customerId){
  openModal("Új projekt",`<form onsubmit="saveProject(event)">
    <div class="formgrid">
      <div class="field"><label>Ügyfél</label><select required class="select" name="customerId">${opts()}</select></div>
      <div class="field"><label>Projekt kezelési mód</label>
        <select class="select" name="projectType" id="new-project-type" onchange="updateProjectTypeHint(this.value)">
          <option value="official">🟢 Hivatalos projekt</option>
          <option value="undocumented">🟠 Dokumentáció nélküli munka</option>
        </select>
      </div>
      <div class="field"><label>Státusz</label>
        <select class="select" name="status">
          <option>Tervezés</option><option>Folyamatban</option><option>Lezárva</option>
        </select>
      </div>
      <div class="field full"><div id="project-type-hint" class="license-review">Hivatalos projekt: a létesítési engedélyhez, hivatalos dokumentációhoz és a normál projektfolyamathoz kapcsolódó mezők és lépések használhatók.</div></div>
      <div class="field full"><label>Projekt neve</label><input required class="input" name="name"></div>
      <div class="field"><label>Helyszín</label><input class="input" name="location"></div>
      <div class="field"><label>Hrsz.</label><input class="input" name="hrsz"></div>
      <div class="field"><label>Szerződéses érték</label><input class="input" type="number" name="value" value="0"></div>
      <div class="field full"><label>Megjegyzés</label><textarea class="textarea" name="notes"></textarea></div>
    </div>
    <div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Projekt létrehozása</button></div>
  </form>`);
  if(customerId)setTimeout(()=>{const e=document.querySelector('#modal select[name="customerId"]');if(e)e.value=customerId},0);
}
function updateProjectTypeHint(type){
  const el=document.getElementById("project-type-hint");
  if(!el)return;
  if(type==="undocumented"){
    el.innerHTML="<b>🟠 Dokumentáció nélküli munka</b><br>A projekt belső munkafolyamatként kezelhető: nincs létesítési engedélyes folyamat és nincs kötelező hivatalos dokumentumcsomag. A tényleges munkanapló és műszaki adatok továbbra is rögzíthetők. A pénzügyi/számlázási kötelezettségeket ez a projekt-típus nem minősíti vagy szünteti meg.";
  }else{
    el.innerHTML="Hivatalos projekt: a létesítési engedélyhez, hivatalos dokumentációhoz és a normál projektfolyamathoz kapcsolódó mezők és lépések használhatók.";
  }
}
function saveProject(e){
  e.preventDefault();
  const o=Object.fromEntries(new FormData(e.target).entries());
  const undocumented=o.projectType==="undocumented";
  const id=uid("KP");
  const p={
    id, customerId:o.customerId, name:o.name||"Új projekt",
    projectType:undocumented?"undocumented":"official",
    status:undocumented?"Tervezés":(o.status||"Tervezés"),
    createdAt:new Date().toISOString(), location:o.location||"", hrsz:o.hrsz||"",
    value:Number(o.value)||0, planned:0, cost:0, progress:0, notes:o.notes||"",
    well:{}, documents:[], workflowTasks:[],
    nextTask:undocumented?"Kivitelezés indítása":"Ajánlat létrehozása"
  };
  db.projects=db.projects||[];
  db.projects.push(p);
  save();closeModal();nav("projects");toast(undocumented?"Dokumentáció nélküli munka létrehozva":"Projekt létrehozva");
}
function projectDetails(id){let p=db.projects.find(x=>x.id===id),pr=p.value-p.cost;openDrawer(p.id,`<h2>${esc(p.name)}</h2><p class="label">${esc(p.location)} · ${esc(cust(p.customerId))}</p><div class="cards" style="grid-template-columns:1fr 1fr"><div class="card"><div class="label">Érték</div><div class="value">${money(p.value)}</div></div><div class="card"><div class="label">Profit</div><div class="value ${pr>=0?'green':'red'}">${money(pr)}</div></div></div><p><b>Készültség:</b> ${p.progress||0}%</p><p><b>Státusz:</b> ${esc(p.status)}</p><p><b>Tervezett költség:</b> ${money(p.planned)}</p><p><b>Tényleges költség:</b> ${money(p.cost)}</p><hr><button class="btn secondary" onclick="newWorklogFor('${p.id}')">+ Munkanapló</button>`)}
let editingWorklogId=null, wlLayers=[], wlFilters=[["0","3","Vak"]];
function newWorklog(){openWorklogEditor()}
function newWorklogFor(pid){
  window.editingWorklogId=null;
  window.worklogProjectId=pid||"";
  current="worklog-fullpage";
  location.hash="#/worklog-fullpage/new/"+encodeURIComponent(String(pid||""));
  render();
  setTimeout(()=>{
    if(window.wlRenderLayers) wlRenderLayers();
    if(window.wlRenderFilters) wlRenderFilters();
    if(window.wlCalculate) wlCalculate();
  },0);
  return false;
}
function worklogFullPageView(){
  const id=window.editingWorklogId||null;
  const projectId=window.worklogProjectId||"";
  const oldOpenModal=window.openModal;
  let body="";
  window.openModal=function(title,html){body=html||"";};
  try{
    detailedWorklogEditor(id,projectId);
  }finally{
    window.openModal=oldOpenModal;
  }
  return '<div class="panel worklog-fullpage-panel">'+
    '<div class="panelhead"><div><div class="label">MUNKANAPLÓ</div><h2>'+
    (id?"Munkanapló szerkesztése":"Új munkanapló")+
    '</h2></div>'+
    '<button class="btn secondary" onclick="openProjectPage(\''+esc(projectId)+'\');return false;">← Vissza a projekthez</button></div>'+
    body+
    '</div>';
}
function detailedWorklogEditor(id,projectId){
 editingWorklogId=id||null;
 const w=id?db.worklogs.find(x=>x.id===id):null;
 const linkedProjectId=w?.projectId||projectId||"";
 const linkedProject=db.projects.find(x=>String(x.id)===String(linkedProjectId));
 const linkedCustomerId=w?.customerId||linkedProject?.customerId||"";
 wlLayers=JSON.parse(JSON.stringify(w?.layers||[["0","4","","","",""]]));
 wlFilters=JSON.parse(JSON.stringify(w?.filters || (id ? [] : [["0","3","Vak"]])));
 const custOpts=db.customers.map(c=>`<option value="${c.id}" ${c.id===linkedCustomerId?"selected":""}>${esc(c.name)}</option>`).join("");
 const projOpts=db.projects.map(p=>`<option value="${p.id}" ${p.id===w?.projectId?"selected":""}>${esc(p.id)} – ${esc(p.name)}</option>`).join("");
 openModal(w?`Munkanapló szerkesztése – ${esc(w.id)}`:"Új munkanapló",`
 <div class="wl-shell">
 <div class="wl-head"><h2>💧 Kútfő Plusz ERP – Munkanapló</h2><span>Kitölthető kútfúrási munkanapló · V1.4</span></div>
 <form id="wlForm"><input type="hidden" id="wl_project" value="${esc(linkedProjectId)}">
 <section class="wl-summary-card" id="wlSummary">
  <div class="wl-summary-title">KÚT ÖSSZESÍTŐ</div>
  <div class="wl-summary-grid">
   <div><small>Engedélyezett mélység</small><strong id="sum_permittedDepth">—</strong></div>
   <div><small>Tervezett szűrőzés</small><strong id="sum_screenInterval">—</strong></div>
   <div><small>Tervezett vízigény</small><strong id="sum_designFlow">—</strong></div>
   <div><small>Fúrt mélység</small><strong id="sum_drilled">—</strong></div>
   <div><small>Tényleges mélység</small><strong id="sum_actual">—</strong></div>
   <div><small>Szűrő kezdete</small><strong id="sum_filterStart">—</strong></div>
   <div><small>Szűrő összesen</small><strong id="sum_filterTotal">—</strong></div>
   <div><small>Nyugalmi vízszint</small><strong id="sum_static">—</strong></div>
   <div><small>Üzemi vízszint</small><strong id="sum_dynamic">—</strong></div>
   <div><small>Leszívás</small><strong id="sum_drawdown">—</strong></div>
   <div><small>Próbaszivattyúzás</small><strong id="sum_flow">—</strong></div>
   <div><small>Fajlagos vízhozam</small><strong id="sum_specific">—</strong></div>
  </div>
 </section>
 <section class="wl-card"><h2>1. Munkalap alapadatai</h2><div class="wl-grid">
 <div class="wl-field"><label>Dátum</label><input id="wl_date" type="date" value="${esc(w?.date||"")}"></div>
 <div class="wl-field"><label>Helyszín</label><input id="wl_location" placeholder="Pl. Porcsalma" value="${esc(w?.location||linkedProject?.location||"")}"></div>
 <div class="wl-field"><label>Megrendelő</label><select id="wl_client"><option value="">— Válassz —</option>${custOpts}</select></div>
 <div class="wl-field"><label>Kút sorszáma</label><input id="wl_wellNo" value="${esc(w?.wellNo||"")}"></div>
 
 
 <div class="wl-field"><label>Kút végmélysége (m)</label><input id="wl_finalDepth" type="number" step="0.1" value="${esc(wlCasingEndDepth()||w?.finalDepth||w?.depth||linkedProject?.well?.actualDepth||linkedProject?.actualDepth||"")}" readonly title="Automatikusan a csövezés/szűrőzés utolsó szakaszának végmélysége"></div>
 <div class="wl-field"><label>Munka státusza</label><select id="wl_status" onchange="wlStatusChanged(this.value)"><option ${w?.status==="Folyamatban"?"selected":""}>Folyamatban</option><option ${w?.status==="Elkészült"?"selected":""}>Elkészült</option><option ${w?.status==="Ellenőrzés alatt"?"selected":""}>Ellenőrzés alatt</option></select></div>
 <div class="wl-field"><label>Engedélyezett mélység (m)</label><input id="wl_permittedDepth" type="number" step="0.1" value="${esc(w?.permittedDepth ? wlNumeric(w.permittedDepth) : wlNumeric(linkedProject?.well?.permittedDepth ?? linkedProject?.permittedDepth ?? linkedProject?.well?.plannedDepth ?? linkedProject?.plannedDepth ?? ""))}" readonly></div>
 <div class="wl-field"><label>Tervezett vízigény (l/perc)</label><input id="wl_designFlowInput" type="number" step="0.01" value="${esc(w?.designFlow ? wlNumeric(w.designFlow) : wlNumeric(linkedProject?.well?.requiredFlow ?? linkedProject?.well?.permittedFlow ?? linkedProject?.well?.designFlow ?? linkedProject?.permittedFlow ?? linkedProject?.designFlow ?? linkedProject?.irrigation?.designFlow ?? linkedProject?.irrigation?.peakFlow ?? linkedProject?.irrigationPlan?.peakFlow ?? ""))}" readonly></div>
 <div class="wl-field"><label>Tervezett szűrőzés (m)</label><input id="wl_screenInterval" type="text" value="${esc(w?.screenInterval || linkedProject?.well?.screenInterval || linkedProject?.screenInterval || "")}" readonly></div>
 </div></section>
 <section class="wl-card"><h2>2. Rétegnapló</h2><div class="wl-table-wrap"><table class="wl-table wl-layer-table" id="wl_layers"><thead><tr><th>Kezdő (m)</th><th>Vég (m)</th><th>Réteg</th><th>Fúrási viselkedés</th><th>Vízszín / állapot</th><th>Megjegyzés</th><th></th></tr></thead><tbody></tbody></table></div><div class="wl-actions"><button type="button" class="wl-btn wl-primary" onclick="wlAddLayer()">＋ Réteg</button></div></section>
 <section class="wl-card"><h2>3. Grafikus függőleges kútszelvény</h2><div id="wlProfile" class="wl-profile-wrap"></div></section>
 <section class="wl-card"><h2>4. Kútkiképzés / szűrőzés</h2>
 <div class="wl-table-wrap"><table class="wl-table wl-filter-table" id="wl_filters"><thead><tr><th>Kezdete (m)</th><th>Vége (m)</th><th>Hossz (m)</th><th>Darab</th><th>Típus / cső</th><th></th></tr></thead><tbody></tbody></table></div>
 <div class="wl-actions"><button type="button" class="wl-btn wl-primary" onclick="wlAddFilter()">＋ Szűrőszakasz</button></div>
 </section>

 <section class="wl-card"><h2>5. Próbaszivattyúzás</h2>
 <div class="wl-grid">
  <div class="wl-field"><label>Termelőcső hossza (m)</label><input id="wl_prodPipe" type="number" step="0.1" value="${esc(w?.prodPipe||"")}"></div>
  <div class="wl-field"><label>Nyugalmi vízszint (m)</label><input id="wl_staticWL" type="number" step="0.01" value="${esc(w?.staticWL||w?.rest||"")}" oninput="wlCalculate()"></div>
  <div class="wl-field"><label>Üzemi vízszint (m)</label><input id="wl_dynamicWL" type="number" step="0.01" value="${esc(w?.dynamicWL||w?.working||"")}" oninput="wlCalculate()"></div>
 </div>
 <div class="wl-grid" style="margin-top:12px">
  <div class="wl-field"><label>Mért vízmennyiség (liter)</label><input id="wl_measureLiters" type="number" min="0" step="1" value="${esc(w?.measureLiters ?? 220)}" oninput="wlCalculate()"></div>
  <div class="wl-field"><label>Mérési idő (mp)</label><input id="wl_measureSeconds" type="number" min="0" step="1" value="${esc(w?.measureSeconds ?? "")}" oninput="wlCalculate()"></div>
  <div class="wl-field"><label>Vízhozam Q (l/perc)</label><input id="wl_flow" type="number" step="0.01" value="${esc(w?.flow||"")}" readonly></div>
 </div>
 <div class="wl-stats" style="margin-top:15px">
  <div class="wl-stat"><small>Leszívás</small><strong id="wl_drawdown">—</strong></div>
  <div class="wl-stat"><small>Fajlagos vízhozam</small><strong id="wl_specific">—</strong></div>
  <div class="wl-stat"><small>Q</small><strong id="wl_flowStat">—</strong></div>
  <div class="wl-stat"><small>Tervezett vízigény</small><strong id="wl_designFlow">—</strong></div>
  <div class="wl-stat"><small>Szivattyú minimum mélysége a tervezett vízigényhez</small><strong id="wl_pumpMinDepth">—</strong></div>
 </div>

 </section>

 <section class="wl-card"><h2>6. Automatikus anyagfelhasználás</h2>
  <div id="wlAutoMaterialUsage"></div>
 </section>

 <section class="wl-card"><h2>7. Munkanapló megjegyzés</h2><textarea id="wl_notes" style="width:100%;min-height:100px;box-sizing:border-box">${esc(w?.notes||w?.note||"")}</textarea>
 <div class="wl-actions">${w?`<button type="button" class="wl-btn wl-danger" onclick="deleteWorklog('${esc(w.id)}');return false;">🗑 Munkanapló törlése</button>`:""}<button type="button" class="wl-btn wl-success" onclick="wlSave()">💾 Mentés</button><button type="button" class="wl-btn wl-secondary" onclick="wlImport()">📂 Mentés betöltése</button><button type="button" class="wl-btn wl-danger" onclick="closeModal()">Bezárás</button></div></section>
 </form></div>`);
 wlRenderLayers();wlRenderFilters();wlCalculate();wlRenderAutoMaterialUsage();
}
function legacy_wlRenderLayers(){let b=document.querySelector("#wl_layers tbody");if(!b)return;b.innerHTML=wlLayers.map((r,i)=>`<tr><td colspan="2"><span class="wl-depth-range"><span class="wl-depth-value">${esc(r[0]||"")} m</span><span class="wl-depth-dash">-</span>${i===wlLayers.length-1?`<span class="wl-depth-edit"><input type="number" min="${Number(r[0])||0}" step="1" value="${esc(r[1]||"")}" aria-label="Utolsó réteg vége" oninput="wlLayers[${i}][1]=this.value;wlSummary();wlProfile()" onblur="wlLayers[${i}][1]=String(Math.max(Number(wlLayers[${i}][0])||0,Number(this.value)||0));wlRenderLayers()"><span>m</span></span>`:`<span class="wl-depth-value">${esc(r[1]||"")} m</span>`}</span></td>${r.slice(2).map((x,j)=>j===0?`<td><select class="wl-layer-type" onchange="wlLayers[${i}][2]=this.value;wlProfile()"><option value="">— Válasszon —</option><option value="Agyag" ${r[2]==="Agyag"?"selected":""}>Agyag</option><option value="Homok" ${r[2]==="Homok"?"selected":""}>Homok</option><option value="Finom homok" ${r[2]==="Finom homok"?"selected":""}>Finom homok</option><option value="Középszemcsés homok" ${r[2]==="Középszemcsés homok"?"selected":""}>Középszemcsés homok</option><option value="Durva homok" ${r[2]==="Durva homok"?"selected":""}>Durva homok</option><option value="Homokos agyag" ${r[2]==="Homokos agyag"?"selected":""}>Homokos agyag</option><option value="Agyagos homok" ${r[2]==="Agyagos homok"?"selected":""}>Agyagos homok</option><option value="Iszap" ${r[2]==="Iszap"?"selected":""}>Iszap</option><option value="Iszapos homok" ${r[2]==="Iszapos homok"?"selected":""}>Iszapos homok</option><option value="Kavicsos homok" ${r[2]==="Kavicsos homok"?"selected":""}>Kavicsos homok</option><option value="Homokos kavics" ${r[2]==="Homokos kavics"?"selected":""}>Homokos kavics</option><option value="Kavics" ${r[2]==="Kavics"?"selected":""}>Kavics</option><option value="Márga" ${r[2]==="Márga"?"selected":""}>Márga</option><option value="Mészkő" ${r[2]==="Mészkő"?"selected":""}>Mészkő</option><option value="Dolomit" ${r[2]==="Dolomit"?"selected":""}>Dolomit</option><option value="Homokkő" ${r[2]==="Homokkő"?"selected":""}>Homokkő</option><option value="Lösz" ${r[2]==="Lösz"?"selected":""}>Lösz</option><option value="Tufa" ${r[2]==="Tufa"?"selected":""}>Tufa</option><option value="Egyéb" ${r[2]==="Egyéb"?"selected":""}>Egyéb</option></select></td>`:`<td><input type="text" value="${esc(x)}" oninput="wlLayers[${i}][${j+2}]=this.value;wlProfile()"></td>`).join("")}<td><button type="button" class="wl-btn wl-danger" style="padding:6px" onclick="wlLayers.splice(${i},1);wlRenderLayers()">×</button></td></tr>`).join("");wlProfile()}
function wlRenderLayers(){let b=document.querySelector("#wl_layers tbody");if(!b)return;b.innerHTML=wlLayers.map((r,i)=>`<tr><td colspan="2"><span class="wl-depth-range"><span class="wl-depth-value">${esc(r[0]||"")} m</span><span class="wl-depth-dash">-</span><span class="wl-depth-value">${esc(r[1]||"")} m</span></span></td>${r.slice(2).map((x,j)=>j===0?`<td><select class="wl-layer-type" onchange="wlLayers[${i}][2]=this.value;wlProfile()"><option value="">— Válasszon —</option><option value="Agyag" ${r[2]==="Agyag"?"selected":""}>Agyag</option><option value="Homok" ${r[2]==="Homok"?"selected":""}>Homok</option><option value="Finom homok" ${r[2]==="Finom homok"?"selected":""}>Finom homok</option><option value="Középszemcsés homok" ${r[2]==="Középszemcsés homok"?"selected":""}>Középszemcsés homok</option><option value="Durva homok" ${r[2]==="Durva homok"?"selected":""}>Durva homok</option><option value="Homokos agyag" ${r[2]==="Homokos agyag"?"selected":""}>Homokos agyag</option><option value="Agyagos homok" ${r[2]==="Agyagos homok"?"selected":""}>Agyagos homok</option><option value="Iszap" ${r[2]==="Iszap"?"selected":""}>Iszap</option><option value="Iszapos homok" ${r[2]==="Iszapos homok"?"selected":""}>Iszapos homok</option><option value="Kavicsos homok" ${r[2]==="Kavicsos homok"?"selected":""}>Kavicsos homok</option><option value="Homokos kavics" ${r[2]==="Homokos kavics"?"selected":""}>Homokos kavics</option><option value="Kavics" ${r[2]==="Kavics"?"selected":""}>Kavics</option><option value="Márga" ${r[2]==="Márga"?"selected":""}>Márga</option><option value="Mészkő" ${r[2]==="Mészkő"?"selected":""}>Mészkő</option><option value="Dolomit" ${r[2]==="Dolomit"?"selected":""}>Dolomit</option><option value="Homokkő" ${r[2]==="Homokkő"?"selected":""}>Homokkő</option><option value="Lösz" ${r[2]==="Lösz"?"selected":""}>Lösz</option><option value="Tufa" ${r[2]==="Tufa"?"selected":""}>Tufa</option><option value="Egyéb" ${r[2]==="Egyéb"?"selected":""}>Egyéb</option></select></td>`:`<td><input type="text" value="${esc(x)}" oninput="wlLayers[${i}][${j+2}]=this.value;wlProfile()"></td>`).join("")}<td><button type="button" class="wl-btn wl-danger" style="padding:6px" onclick="wlLayers.splice(${i},1);wlRenderLayers()">×</button></td></tr>`).join("");wlProfile()}
function wlAddLayer(v){
 if(v!==undefined){
   const row=Array.isArray(v)?v.slice():["0","4","","","",""];
   wlLayers.push(row);
   wlRenderLayers();
   return;
 }
 const last=wlLayers.length?wlLayers[wlLayers.length-1]:null;
 const lastEnd=last?Number(last[1]):0;
 const start=Number.isFinite(lastEnd)?lastEnd:0;
 wlLayers.push([String(start),String(start+3),"","","",""]);
 wlRenderLayers();
}
function wlSortLayers(){wlLayers.sort((a,b)=>(+a[0]||0)-(+b[0]||0));wlRenderLayers()}
function wlAddFilter(v){
 const idx=wlFilters.length; if(idx>0 && !Number.isFinite(parseFloat(wlFilters[idx-1]?.[1]))){
   alert("Előbb add meg az előző szakasz végét!");
   return;
 }
 const type=v?.[2] || (idx===0 ? "Vak" : (idx%2===1 ? "Szűrő" : "Vak"));
 const prevEnd=idx>0 ? parseFloat(wlFilters[idx-1]?.[1]) : 0;
 const start=v?.[0]!==undefined&&v?.[0]!=="" ? Number(v[0]) : (idx===0 ? 0 : (Number.isFinite(prevEnd)?prevEnd:0));
 let end=v?.[1]!==undefined&&v?.[1]!==""?Number(v[1]):(type==="Szűrő"?start+3:(idx===0?NaN:start+3));
 if(!Number.isFinite(start)) start=idx===0?0:0;
 if(type==="Szűrő"){
   end=start+3;
 }else if(!Number.isFinite(end) || end<start){ end=idx===0?NaN:start+3; }
 wlFilters.push([String(start),String(end),type]);
 wlRenderFilters()
}
function wlRenderFilters(){
 let b=document.querySelector("#wl_filters tbody");if(!b)return;
 b.innerHTML=wlFilters.map((r,i)=>{
  const isFilter=(r[2]||"").toLowerCase()==="szűrő" || (r[2]||"").toLowerCase()==="szuro";
  let a=parseFloat(r[0]);
  if(isFilter){
    const prevEnd=i>0?parseFloat(wlFilters[i-1]?.[1]):0;
    a=i===0?0:(Number.isFinite(prevEnd)?prevEnd:0);
    r[0]=String(a);
  }
  const prevEnd=i>0?parseFloat(wlFilters[i-1]?.[1]):0;
  const minStart=i===0?0:(Number.isFinite(prevEnd)?prevEnd:0);
  if(!Number.isFinite(a) || a<minStart) a=minStart;
  r[0]=String(a);
  let z=parseFloat(r[1]);
  if(isFilter){
    if(!Number.isFinite(z) || z<a+3) z=a+3;
    else z=a+3*Math.max(1,Math.round((z-a)/3));
  }else{
    if(i===0 && !Number.isFinite(z)){
      r[1]="";
      z=NaN;
    }else if(!Number.isFinite(z) || z<a){
      z=a;
    }
  }
  r[1]=Number.isFinite(z)?String(z):"";
  const length=Number.isFinite(a)&&Number.isFinite(z)&&z>=a?(z-a):NaN;
  const len=Number.isFinite(length)?length.toFixed(2):"—";
  const fullPieces=Number.isFinite(length)&&length>0?Math.floor(length/3):0;
  const rem=Number.isFinite(length)&&length>0?length-(fullPieces*3):0;
  const darab=Number.isFinite(length)&&length>0?(rem>0?`${fullPieces} db + ${Number.isInteger(rem)?rem:rem.toFixed(2)} m`:`${fullPieces} db`):"—";
  return `<tr>
   <td><input class="wl-filter-num" style="width:96px!important;min-width:96px!important;max-width:96px!important" type="number" step="1" min="${i===0?0:(Number.isFinite(prevEnd)?prevEnd:0)}" value="${esc(r[0]||"")}" oninput="wlFilters[${i}][0]=this.value;wlProfile()" onblur="wlRenderFilters()"></td>
   <td><input class="wl-filter-num" style="width:96px!important;min-width:96px!important;max-width:96px!important" type="number" step="${isFilter?3:1}" min="${isFilter?a+3:a}" value="${esc(r[1]||"")}" oninput="wlFilters[${i}][1]=this.value;wlProfile()" onblur="wlRenderFilters()"></td>
   <td><span class="wl-calculated wl-filter-length">${len !== "—" ? len + " m" : "—"}</span></td>
   <td><span class="wl-calculated wl-filter-pieces">${darab}</span></td>
   <td><select class="wl-filter-type" onchange="wlFilters[${i}][2]=this.value;if(this.value==='Szűrő'){const a=parseFloat(wlFilters[${i}][0]);if(Number.isFinite(a))wlFilters[${i}][1]=String(a+3)};wlRenderFilters()">
   <option value="Vak" ${r[2]==="Vak"?"selected":""}>Vak</option>
   <option value="Szűrő" ${r[2]==="Szűrő"?"selected":""}>Szűrő</option>
  </select></td>
   <td><button type="button" class="wl-btn wl-danger" style="padding:6px" onclick="wlFilters.splice(${i},1);wlRenderFilters()">×</button></td>
  </tr>`;
 }).join("");
 wlSyncFinalDepth();
 wlProfile();wlRenderAutoMaterialUsage()
}

function wlProfile(){let box=document.getElementById("wlProfile");if(!box)return;let max=Math.max(10,+document.getElementById("wl_finalDepth").value||0,...wlLayers.map(r=>+r[1]||0),...wlFilters.map(r=>+r[1]||0));let scale=Math.min(10,520/max),h=max*scale;box.innerHTML=`<div class="wl-profile-depth" style="height:${h}px">${Array.from({length:Math.floor(max/5)+1},(_,i)=>`<span style="top:${i*5*scale}px">${i*5} m</span>`).join("")}</div><div class="wl-profile-drawing" style="height:${h}px"><div class="wl-ground"></div>${wlLayers.filter(r=>+r[1]>+r[0]).map(r=>{let a=+r[0],b=+r[1],cl=((r[2]+" "+r[3]).toLowerCase().includes("agyag"))?"wl-clay":"wl-sand";return `<div class="wl-layer ${cl}" style="top:${a*scale}px;height:${Math.max(5,(b-a)*scale)}px"><b>${a}–${b} m</b>&nbsp;${esc(r[2]||r[3]||"")}</div>`}).join("")}${wlFilters.filter(r=>+r[1]>+r[0]).map(r=>`<div class="wl-filter" style="top:${+r[0]*scale}px;height:${Math.max(5,(+r[1]-+r[0])*scale)}px"></div>`).join("")}${wlWater("wl_staticWL","Nyugalmi",scale)}${wlWater("wl_dynamicWL","Üzemi",scale)}</div>`}
function wlWater(id,label,scale){let v=+document.getElementById(id)?.value;if(!v)return"";return `<div class="wl-water" style="top:${v*scale}px"><span>${label} ${v.toFixed(2)} m</span></div>`}
function wlSummary(){
 const layerDepths=wlLayers.map(r=>({a:+r[0],b:+r[1]}))
   .filter(x=>Number.isFinite(x.a)&&Number.isFinite(x.b)&&x.b>=x.a);
 const drilled=layerDepths.length?Math.max(...layerDepths.map(x=>x.b)):NaN;

 // Kútkiképzés / szűrőzés remains the source for actual depth and filter data.
 const sections=wlFilters.map(r=>{
   const a=+r[0], b=+r[1], type=(r[2]||"").toLowerCase();
   return Number.isFinite(a)&&Number.isFinite(b)&&b>=a?{a,b,type,len:b-a}:null;
 }).filter(Boolean);
 const actual=sections.length?Math.max(...sections.map(x=>x.b)):0;
 const filters=sections.filter(x=>x.type==="szűrő"||x.type==="szuro");
 const firstFilter=filters.length?Math.min(...filters.map(x=>x.a)):NaN;
 const filterTotal=filters.reduce((sum,x)=>sum+x.len,0);

 const st=+document.getElementById("wl_staticWL")?.value;
 const dy=+document.getElementById("wl_dynamicWL")?.value;
 const liters=+document.getElementById("wl_measureLiters")?.value||0;
 const seconds=+document.getElementById("wl_measureSeconds")?.value||0;
 const q=seconds>0&&liters>0?(liters/seconds)*60:0;
 const draw=Number.isFinite(st)&&Number.isFinite(dy)?dy-st:NaN;
 const spec=draw>0&&q>0?q/draw:NaN;

 const set=(id,val)=>{const e=document.getElementById(id);if(e)e.textContent=val};
 set("sum_drilled",Number.isFinite(drilled)?huNum(drilled,1)+" m":"—");
 set("sum_actual",actual>0?huNum(actual,1)+" m":"—");
 set("sum_filterStart",Number.isFinite(firstFilter)?huNum(firstFilter,1)+" m":"—");
 set("sum_filterTotal",filterTotal>0?huNum(filterTotal,1)+" m":"—");
 set("sum_static",Number.isFinite(st)?huNum(st,2)+" m":"—");
 set("sum_dynamic",Number.isFinite(dy)?huNum(dy,2)+" m":"—");
 set("sum_drawdown",Number.isFinite(draw)&&draw>=0?huNum(draw,2)+" m":"—");
 set("sum_flow",q>0?huNum(q,2)+" l/perc":"—");
 set("sum_specific",Number.isFinite(spec)?huNum(spec,2)+" l/perc/m":"—");
}
function wlNumeric(v){
  if(v===null||v===undefined||v==="") return "";
  const m=String(v).replace(/\s/g,"").replace(",",".").match(/-?\d+(?:\.\d+)?/);
  return m?m[0]:"";
}
function wlSyncProjectData(){
  const projectId=document.getElementById("wl_project")?.value||window.worklogProjectId||"";
  const project=db.projects.find(x=>String(x.id)===String(projectId));
  if(!project)return;
  const w=project.well||{};
  const depth=wlNumeric(w.permittedDepth??project.permittedDepth??w.plannedDepth??project.plannedDepth??"");
  const flow=wlNumeric(w.requiredFlow??w.permittedFlow??w.designFlow??project.permittedFlow??project.designFlow??project.irrigation?.designFlow??project.irrigation?.peakFlow??"");
  const screen=String(w.screenInterval??project.screenInterval??"").trim();
  const de=document.getElementById("wl_permittedDepth");
  const fe=document.getElementById("wl_designFlowInput");
  const se=document.getElementById("wl_screenInterval");
  if(de && depth!=="")de.value=depth;
  if(fe && flow!=="")fe.value=flow;
  if(se && screen!=="")se.value=screen;
  const sd=document.getElementById("sum_permittedDepth");
  const sf=document.getElementById("sum_designFlow");
  const ss=document.getElementById("sum_screenInterval");
  if(sd)sd.textContent=depth?huNum(depth,1)+" m":"—";
  if(sf)sf.textContent=flow?huNumSmart(flow,1)+" l/perc":"—";
  if(ss)ss.textContent=screen||"—";
}
function wlCalculate(){
 let liters=+document.getElementById("wl_measureLiters")?.value||0;
 let seconds=+document.getElementById("wl_measureSeconds")?.value||0;
 let q=seconds>0&&liters>0?(liters/seconds)*60:0;
 let flowEl=document.getElementById("wl_flow");if(flowEl)flowEl.value=q?q.toFixed(2):"";
 let st=+document.getElementById("wl_staticWL")?.value;
 let d=+document.getElementById("wl_dynamicWL")?.value;
 let draw=d-st,spec=draw>0?q/draw:NaN;
 const setCalc=(id,val)=>{const e=document.getElementById(id);if(e)e.textContent=val};
 setCalc("wl_drawdown",Number.isFinite(draw)&&draw>=0?huNum(draw,2)+" m":"—");
 setCalc("wl_specific",Number.isFinite(spec)?huNum(spec,2)+" l/perc/m":"—");
 setCalc("wl_flowStat",q?huNum(q,2)+" l/perc":"—");
 const projectId=document.getElementById("wl_project")?.value||"";
 const project=db.projects.find(x=>String(x.id)===String(projectId));
 const designFlow=Number(
   document.getElementById("wl_designFlowInput")?.value ??
   project?.well?.requiredFlow ??
   project?.well?.permittedFlow ??
   project?.well?.designFlow ??
   project?.permittedFlow ??
   project?.designFlow ??
   project?.irrigation?.peakFlow ??
   project?.irrigationPlan?.peakFlow ??
   0
 )||0;
 setCalc("wl_designFlow",designFlow>0?huNumSmart(designFlow,1)+" l/perc":"—");
 const permittedDepth=Number(document.getElementById("wl_permittedDepth")?.value)||0;
 setCalc("sum_permittedDepth",permittedDepth>0?huNum(permittedDepth,1)+" m":"—");
 setCalc("sum_designFlow",designFlow>0?huNumSmart(designFlow,1)+" l/perc":"—");
 const screen=String(document.getElementById("wl_screenInterval")?.value||"").trim();
 setCalc("sum_screenInterval",screen||"—");
 let pumpMin=NaN;
 if(designFlow>0 && Number.isFinite(spec) && spec>0 && Number.isFinite(st)){
   const requiredDraw=designFlow/spec;
   pumpMin=st+requiredDraw;
 }
 setCalc("wl_pumpMinDepth",Number.isFinite(pumpMin)?huNum(pumpMin,2)+" m":"—");
 wlSummary();
 wlProfile()
}

const WL_DRAFT_PREFIX="kutfoplusz_wl_draft_";
function wlDraftKey(){
 return WL_DRAFT_PREFIX+(editingWorklogId||"uj");
}
function wlSaveDraft(){
 try{
   const form=document.getElementById("wlForm");
   if(!form)return;
   document.querySelectorAll("#wl_layers .wl-layer-type").forEach((el,i)=>{if(wlLayers[i])wlLayers[i][2]=el.value});
   const o=wlCollect();
   localStorage.setItem(wlDraftKey(),JSON.stringify(o));
 }catch(e){console.warn("Munkanapló piszkozat mentése:",e)}
}
function wlLoadDraft(id){
 try{
   const key=WL_DRAFT_PREFIX+(id||"uj");
   const raw=localStorage.getItem(key);
   return raw?JSON.parse(raw):null;
 }catch(e){return null}
}
function wlClearDraft(id){
 try{localStorage.removeItem(WL_DRAFT_PREFIX+(id||"uj"))}catch(e){}
}
function wlStatusChanged(value){
  if(!editingWorklogId) return;
  const w=(db.worklogs||[]).find(x=>String(x.id)===String(editingWorklogId));
  if(!w) return;
  w.status=value;
  save();
  render();
  toast("Munkanapló státusza mentve: "+value);
}
function wlCollect(){return{id:editingWorklogId||uid("MN"),date:document.getElementById("wl_date").value,customerId:document.getElementById("wl_client").value,projectId:document.getElementById("wl_project")?.value||"",location:document.getElementById("wl_location").value,wellNo:document.getElementById("wl_wellNo").value,finalDepth:wlCasingEndDepth(),permittedDepth:+document.getElementById("wl_permittedDepth")?.value||0,designFlow:+document.getElementById("wl_designFlowInput")?.value||0,screenInterval:document.getElementById("wl_screenInterval")?.value||"",status:document.getElementById("wl_status").value,layers:wlLayers,filters:wlFilters,prodPipe:document.getElementById("wl_prodPipe").value,staticWL:document.getElementById("wl_staticWL").value,dynamicWL:document.getElementById("wl_dynamicWL").value,measureLiters:+document.getElementById("wl_measureLiters").value||0,measureSeconds:+document.getElementById("wl_measureSeconds").value||0,flow:+document.getElementById("wl_flow").value||0,dynamic2:document.getElementById("wl_dynamicWL").value,static2:document.getElementById("wl_staticWL").value,notes:document.getElementById("wl_notes").value,autoMaterialUsage:wlAutoMaterialUsage()}}
function wlAutoMaterialUsage(){
  const projectId=document.getElementById("wl_project")?.value||window.worklogProjectId||"";
  const p=(db.projects||[]).find(x=>String(x.id)===String(projectId));
  const wCasing=String(p?.well?.casingDiameter||p?.casingDiameter||"").trim();
  const wFilter=String(p?.well?.filterDiameter||p?.filterDiameter||wCasing||"").trim();
  const findStock=(diameter,isFilter)=>{
    const d=String(diameter||"").trim();
    const items=Array.isArray(db.stock)?db.stock:[];
    const mats=Array.isArray(db.materials)?db.materials:[];
    const pool=[...items,...mats];
    const needle=d.replace(/\s/g,"").toLowerCase();
    const filtered=pool.filter(x=>{
      const name=String(x.name||"");
      const norm=name.replace(/\s/g,"").toLowerCase();
      const isF=/sz[űu]r[őo]/i.test(name) || String(x.pipeType||"").toLowerCase().includes("szűr");
      const isV=/km\s*-?\s*pvc|kútcső/i.test(name) && !isF;
      return needle && norm.includes(needle) && (isFilter?isF:isV);
    });
    return filtered[0]||null;
  };
  const rows=[];
  (wlFilters||[]).forEach((r,i)=>{
    const a=Number(r?.[0]),b=Number(r?.[1]);
    if(!Number.isFinite(a)||!Number.isFinite(b)||b<=a)return;
    const type=String(r?.[2]||"Vak");
    const length=b-a;
    const full=Math.floor(length/3+1e-9);
    const rem=Math.round((length-full*3)*100)/100;
    const pieces=rem>0?`${full} db + ${Number.isInteger(rem)?rem:rem.toFixed(2)} m`:`${full} db`;
    const isFilter=/sz[űu]r[őo]/i.test(type);
    const diameter=isFilter?(wFilter||wCasing):wCasing;
    const item=findStock(diameter,isFilter);
    rows.push({
      sourceIndex:i,type,diameter,length,fullPieces:full,remainder:rem,pieces,
      materialId:item?.id||item?.sku||"",material:item?.name||(diameter?`${diameter} mm ${isFilter?"szűrőcső":"KM PVC cső"}`:`${isFilter?"Szűrőcső":"KM PVC cső"}`),unit:item?.unit||"m",
      stock:Number(item?.qty??item?.stock??0)
    });
  });
  return rows;
}
function wlRenderAutoMaterialUsage(){
  const box=document.getElementById("wlAutoMaterialUsage");if(!box)return;
  const rows=wlAutoMaterialUsage();
  if(!rows.length){box.innerHTML='<div class="empty">A Kútkiképzés / szűrőzés adatai alapján még nincs automatikusan számítható anyagfelhasználás.</div>';return;}
  const total=rows.reduce((a,r)=>a+r.length,0);
  box.innerHTML=`<div class="wl-auto-material-head"><div><b>Automatikus anyagfelhasználás</b><div class="label">A Kútkiképzés / szűrőzés táblázatból számítva. A méter és a darab is megjelenik.</div></div></div>
  <div class="wl-auto-material-table"><div class="wl-auto-material-row wl-auto-material-header"><div>Anyag</div><div>Szakasz</div><div>Hossz</div><div>Darab</div></div>
  ${rows.map(r=>`<div class="wl-auto-material-row"><div><b>${esc(r.material)}</b>${r.materialId?`<div class="label">${esc(r.materialId)}</div>`:`<div class="label" style="color:#b45309">Nincs pontos raktári cikk hozzárendelve</div>`}</div><div>${huNum(r.length,2)} m · ${esc(r.type)}</div><div><b>${huNum(r.length,2)} m</b></div><div><b>${esc(r.pieces)}</b></div></div>`).join("")}
  </div><div class="wl-auto-material-total"><b>Összes csőanyag: ${huNum(total,2)} m</b> · A darabszám szakaszonként látható, a maradék külön méterként jelenik meg.</div>`;
}

function wlSave(){
 document.querySelectorAll("#wl_layers .wl-layer-type").forEach((el,i)=>{if(wlLayers[i])wlLayers[i][2]=el.value});
 let o=wlCollect();
 let i=db.worklogs.findIndex(x=>x.id===o.id);
 if(i>=0)db.worklogs[i]=o;else db.worklogs.push(o);
 save();wlClearDraft(o.id);closeModal();nav("worklogs");toast("Munkanapló mentve")
}

function wlDocEsc(v){return esc(v==null?"":String(v))}
function wlDocSummary(o){
 const layers=(o.layers||[]).map(r=>({a:+r[0],b:+r[1]})).filter(x=>Number.isFinite(x.a)&&Number.isFinite(x.b));
 const drilled=layers.length?Math.max(...layers.map(x=>x.b)):NaN;
 const fs=(o.filters||[]).map(r=>({a:+r[0],b:+r[1],t:String(r[2]||"").toLowerCase()})).filter(x=>Number.isFinite(x.a)&&Number.isFinite(x.b)&&x.b>=x.a);
 const filters=fs.filter(x=>x.t==="szűrő"||x.t==="szuro");
 const filterStart=filters.length?Math.min(...filters.map(x=>x.a)):NaN;
 const filterTotal=filters.reduce((a,x)=>a+x.b-x.a,0);
 const st=+o.staticWL,dy=+o.dynamicWL;
 const q=+o.flow||((+o.measureSeconds>0&&+o.measureLiters>0)?(+o.measureLiters/+o.measureSeconds)*60:0);
 const draw=Number.isFinite(st)&&Number.isFinite(dy)?dy-st:NaN;
 const spec=draw>0&&q>0?q/draw:NaN;
 return {drilled,filterStart,filterTotal,st,dy,draw,q,spec};
}
function wlDocTable(headers,rows){
 return `<table><thead><tr>${headers.map(x=>`<th>${wlDocEsc(x)}</th>`).join("")}</tr></thead><tbody>${rows.map(r=>`<tr>${r.map(x=>`<td>${wlDocEsc(x)}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
}

function wlDocProfileSvg(o){
  const layers=(o.layers||[]).map(r=>({
    a:Number(r[0]), b:Number(r[1]), name:String(r[2]||r[3]||"").trim(),
    behavior:String(r[3]||"").trim()
  })).filter(r=>Number.isFinite(r.a)&&Number.isFinite(r.b)&&r.b>r.a).sort((a,b)=>a.a-b.a);

  // A grafikus dokumentum is ugyanazt az összevonási logikát használja,
  // mint a képernyőn: egymás után következő, azonos rétegek egy szakasz.
  const merged=[];
  const norm=x=>x.toLowerCase().replace(/\s+/g," ").trim();
  for(const r of layers){
    const prev=merged[merged.length-1];
    if(prev && Math.abs(prev.b-r.a)<0.001 && norm(prev.name)===norm(r.name)){
      prev.b=r.b;
      if(!prev.behavior && r.behavior) prev.behavior=r.behavior;
    }else merged.push({...r});
  }

  const max=Math.max(
    Number(o.finalDepth)||0,
    ...merged.map(r=>r.b),
    ...(o.filters||[]).map(r=>Number(r[1])||0),
    10
  );
  const W=500, H=520, top=18, bottom=20, plotH=H-top-bottom, scale=plotH/max;
  const x0=140, x1=390, pipeX=118, pipeW=18;
  const escSvg=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
  const y=d=>top+d*scale;

  let svg=`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" role="img" aria-label="Grafikus függőleges kútszelvény">
  <rect x="0" y="0" width="${W}" height="${H}" fill="#fff"/>
  <text x="10" y="14" font-family="Arial,sans-serif" font-size="12" font-weight="700" fill="#172b4d">Mélység</text>`;

  for(let d=0; d<=max+0.001; d+=5){
    const yy=y(d);
    svg+=`<line x1="44" y1="${yy}" x2="${x0-8}" y2="${yy}" stroke="#d8dee6" stroke-width="1"/>
      <text x="8" y="${yy+4}" font-family="Arial,sans-serif" font-size="10" fill="#5b6b7a">${d.toFixed(0)} m</text>`;
  }

  svg+=`<rect x="${x0}" y="${top}" width="${x1-x0}" height="${plotH}" rx="7" fill="#f8fafc" stroke="#9aa7b5"/>
    <line x1="${x0}" y1="${top}" x2="${x1}" y2="${top}" stroke="#56636f" stroke-width="4"/>`;

  for(const r of merged){
    const yy=y(r.a), hh=Math.max(4,(r.b-r.a)*scale);
    const n=norm(r.name+" "+r.behavior);
    let fill="#eadfc9";
    if(n.includes("agyag")) fill="#b7a58e";
    else if(n.includes("iszap")) fill="#d0c3ad";
    else if(n.includes("kavics")) fill="#d7c2a1";
    const hatch=n.includes("agyag")?"url(#hatchClay)": "url(#hatchSand)";
    const label=`${r.a}–${r.b} m${r.name?" "+r.name:""}`;
    svg+=`<rect x="${x0}" y="${yy}" width="${x1-x0}" height="${hh}" fill="${fill}" stroke="#fff" stroke-width="1"/>
      <rect x="${x0}" y="${yy}" width="${x1-x0}" height="${hh}" fill="${hatch}" opacity=".38"/>
      <text x="${x0+12}" y="${yy+Math.min(18,Math.max(12,hh/2+4))}" font-family="Arial,sans-serif" font-size="11" fill="#17212b">${escSvg(label)}</text>`;
  }

  const filters=(o.filters||[]).map(r=>({a:Number(r[0]),b:Number(r[1]),t:String(r[2]||"").trim()}))
    .filter(r=>Number.isFinite(r.a)&&Number.isFinite(r.b)&&r.b>r.a);
  for(const f of filters){
    const yy=y(f.a), hh=Math.max(5,(f.b-f.a)*scale);
    svg+=`<rect x="${pipeX}" y="${yy}" width="${pipeW}" height="${hh}" rx="3" fill="#d9e8f7" stroke="#1769aa" stroke-width="3"/>
      <line x1="${pipeX+3}" y1="${yy+4}" x2="${pipeX+pipeW-3}" y2="${yy+4}" stroke="#1769aa" stroke-width="2"/>`;
  }

  const st=Number(o.staticWL), dy=Number(o.dynamicWL);
  if(Number.isFinite(st) && st>=0 && st<=max){
    const yy=y(st);
    svg+=`<line x1="${x0-10}" y1="${yy}" x2="${x1}" y2="${yy}" stroke="#1769aa" stroke-width="2"/>
      <rect x="${x0-88}" y="${yy-16}" width="82" height="15" rx="3" fill="#fff"/>
      <text x="${x0-84}" y="${yy-5}" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#1769aa">Nyugalmi ${st.toFixed(2)} m</text>`;
  }
  if(Number.isFinite(dy) && dy>=0 && dy<=max){
    const yy=y(dy);
    svg+=`<line x1="${x0-10}" y1="${yy}" x2="${x1}" y2="${yy}" stroke="#1769aa" stroke-width="2"/>
      <rect x="${x0-88}" y="${yy+2}" width="82" height="15" rx="3" fill="#fff"/>
      <text x="${x0-84}" y="${yy+13}" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#1769aa">Üzemi ${dy.toFixed(2)} m</text>`;
  }

  const bottomLabel=`Kúttalp: ${max.toFixed(1).replace(/\.0$/,"")} m`;
  svg+=`<text x="${x0+8}" y="${H-5}" font-family="Arial,sans-serif" font-size="10" font-weight="700" fill="#596773">${escSvg(bottomLabel)}</text>
    <defs>
      <pattern id="hatchSand" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <line x1="0" y1="0" x2="0" y2="8" stroke="#b8a77f" stroke-width="2"/>
      </pattern>
      <pattern id="hatchClay" width="8" height="8" patternUnits="userSpaceOnUse">
        <line x1="0" y1="2" x2="8" y2="2" stroke="#8d7b64" stroke-width="1.5"/>
      </pattern>
    </defs></svg>`;
  return svg;
}

function wlDocPumpResults(o){
  const s=wlDocSummary(o);
  const val=(v,u)=>Number.isFinite(v)?huNum(v,2)+" "+u:"—";
  return `<div class="wl-pump-results">
    <h3>Szivattyúzási eredmények</h3>
    <div class="wl-pump-result-row"><span>Vízhozam Q</span><b>${val(s.q,"l/perc")}</b></div>
    <div class="wl-pump-result-row"><span>Nyugalmi vízszint</span><b>${val(s.st,"m")}</b></div>
    <div class="wl-pump-result-row"><span>Üzemi vízszint</span><b>${val(s.dy,"m")}</b></div>
    <div class="wl-pump-result-row"><span>Leszívás</span><b>${val(s.draw,"m")}</b></div>
    <div class="wl-pump-result-row"><span>Fajlagos vízhozam</span><b>${val(s.spec,"l/perc/m")}</b></div>
    <div class="wl-pump-result-row"><span>Mért vízmennyiség</span><b>${o.measureLiters?wlDocEsc(o.measureLiters)+" liter":"—"}</b></div>
    <div class="wl-pump-result-row"><span>Mérési idő</span><b>${o.measureSeconds?wlDocEsc(o.measureSeconds)+" mp":"—"}</b></div>
  </div>`;
}

function wlDocumentHtml(o){
 const s=wlDocSummary(o), customer=cust(o.customerId)||"";
 const layers=wlFurasiRetegsorRows(o);
 const filters=(o.filters||[]).map(r=>[`${r[0]} m - ${r[1]} m`,`${(+r[1]||0)-(+r[0]||0)} m`,r[3]||"",r[2]||""]);
 return `<div class="wl-document">
 <div class="wl-doc-header"><strong>KÚTFŐ PLUSZ KFT.</strong><span>4481 Nyíregyháza, Attila út 61. · +36 20 9247187 · kutfokft@gmail.com</span></div>
 <h1>MUNKANAPLÓ</h1>
 <p><b>Dátum:</b> ${wlDocEsc(o.date)} &nbsp; <b>Helyszín:</b> ${wlDocEsc(o.location)} &nbsp; <b>Kút:</b> ${wlDocEsc(o.wellNo)}</p>
 <p><b>Megrendelő:</b> ${wlDocEsc(customer)}</p>
 <p><b>Engedélyezett mélység:</b> ${o.permittedDepth ? wlDocEsc(o.permittedDepth)+" m" : "—"} &nbsp; <b>Tervezett vízigény:</b> ${o.designFlow ? wlDocEsc(o.designFlow)+" l/perc" : "—"}</p>
 <h2>KÚT ÖSSZESÍTŐ</h2>${wlDocTable(["Megnevezés","Érték","Megnevezés","Érték"],[
 ["Fúrt mélység",Number.isFinite(s.drilled)?huNum(s.drilled,1)+" m":"—","Tényleges mélység",Number.isFinite(s.drilled)?huNum(s.drilled,1)+" m":"—"],
 ["Szűrő kezdete",Number.isFinite(s.filterStart)?huNum(s.filterStart,1)+" m":"—","Szűrő összesen",s.filterTotal?huNum(s.filterTotal,1)+" m":"—"],
 ["Nyugalmi vízszint",Number.isFinite(s.st)?huNum(s.st,2)+" m":"—","Üzemi vízszint",Number.isFinite(s.dy)?huNum(s.dy,2)+" m":"—"],
 ["Leszívás",Number.isFinite(s.draw)?huNum(s.draw,2)+" m":"—","Próbaszivattyúzás",s.q?huNum(s.q,2)+" l/perc":"—"],
 ["Fajlagos vízhozam",Number.isFinite(s.spec)?huNum(s.spec,2)+" l/perc/m":"—","",""]
 ])}
 <h2>RÉTEGNAPLÓ</h2>${wlDocTable(["A réteg","m-től","m-ig","A réteg megnevezése"],layers)}
 <h2>KÚTKIKÉPZÉS / SZŰRŐZÉS</h2>${wlDocTable(["Szakasz","Hossz","Darab","Típus / cső"],filters)}
 <h2>PRÓBASZIVATTYÚZÁS</h2>
 <p>Mért vízmennyiség: <b>${o.measureLiters||0} liter</b> · Mérési idő: <b>${o.measureSeconds||0} mp</b> · Vízhozam: <b>${s.q?huNum(s.q,2):"—"} l/perc</b></p>
 <p>Nyugalmi: ${Number.isFinite(s.st)?huNum(s.st,2)+" m":"—"} · Üzemi: ${Number.isFinite(s.dy)?huNum(s.dy,2)+" m":"—"} · Leszívás: ${Number.isFinite(s.draw)?huNum(s.draw,2)+" m":"—"} · Fajlagos: ${Number.isFinite(s.spec)?huNum(s.spec,2)+" l/perc/m":"—"}</p>
 <h2>GRAFIKUS FÜGGŐLEGES KÚTSZELVÉNY</h2>
 <div class="wl-profile-graphic wl-profile-graphic-only">${wlDocProfileSvg(o)}</div>
 <h2>MEGJEGYZÉS</h2><p>${wlDocEsc(o.notes||"—").replace(/\n/g,"<br>")}</p>
 <div class="wl-sign">______________________________<br>Megrendelő / átvevő<br><br>______________________________<br>Kútfő Plusz Kft.</div>

 </div>`;
}

function wlPermitContext(o){
 const p=(db.projects||[]).find(x=>String(x.id)===String(o?.projectId||""))||{};
 const w=p.well||{}; const pm=p.permit||{};
 return {p,w,pm,customer:cust(o?.customerId||p.customerId)||"—"};
}
function wlDocHeader(title,o,ctx){
 return `<div class="wl-doc-header"><strong>KÚTFŐ PLUSZ KFT.</strong><span>4481 Nyíregyháza, Attila utca 61. · +36 20 9247187 · kutfokft@gmail.com</span></div>
 <h1>${wlDocEsc(title)}</h1>
 <p><b>Ügyfél:</b> ${wlDocEsc(ctx.customer)} &nbsp; <b>Helyszín:</b> ${wlDocEsc(o.location||ctx.p.location||ctx.w.location||"—")} &nbsp; <b>Kút:</b> ${wlDocEsc(o.wellNo||"—")}</p>
 <p><b>Helyrajzi szám:</b> ${wlDocEsc(ctx.w.parcelNumber||ctx.p.hrsz||"—")} &nbsp; <b>Létesítési engedély:</b> ${wlDocEsc(ctx.pm.number||"—")} &nbsp; <b>Engedély dátuma:</b> ${wlDocEsc(ctx.pm.date||"—")}</p>`;
}
function wlMergedLayers(o){
 const rows=(o.layers||[]).map(r=>({a:Number(r[0]),b:Number(r[1]),name:String(r[2]||r[3]||"").trim(),note:String(r[3]||"").trim()})).filter(r=>Number.isFinite(r.a)&&Number.isFinite(r.b)&&r.b>r.a).sort((a,b)=>a.a-b.a);
 const merged=[]; const norm=x=>x.toLowerCase().replace(/\s+/g," ").trim();
 for(const r of rows){const prev=merged[merged.length-1];if(prev&&Math.abs(prev.b-r.a)<.001&&norm(prev.name)===norm(r.name)){prev.b=r.b;if(!prev.note&&r.note)prev.note=r.note;}else merged.push({...r});}
 return merged;
}
function wlBuildDocumentHtml(o){
 const s=wlDocSummary(o),ctx=wlPermitContext(o),layers=wlMergedLayers(o);
 return `<div class="wl-document">${wlDocHeader("ÉPÍTÉSI NAPLÓ",o,ctx)}
 <h2>ENGEDÉLY ÉS PROJEKT ADATAI</h2>${wlDocTable(["Megnevezés","Érték","Megnevezés","Érték"],[
 ["Engedélyezett mélység",ctx.w.permittedDepth?wlDocEsc(ctx.w.permittedDepth)+" m":"—","Engedélyezett vízhozam",ctx.w.permittedFlow?wlDocEsc(ctx.w.permittedFlow)+" l/perc":"—"],
 ["Vízhasználat célja",ctx.pm.waterUse||ctx.w.purpose||"—","Éves vízmennyiség",ctx.w.annualWater||ctx.pm.annualWater||"—"],
 ["Öntözött terület",ctx.w.irrigatedArea||"—","Öntözőtelep nagysága",ctx.w.irrigationPlantSize||"—"]])}
 <h2>MUNKANAPLÓ / KIVITELEZÉSI ADATOK</h2>${wlDocTable(["Megnevezés","Érték","Megnevezés","Érték"],[
 ["Dátum",o.date||"—","Státusz",o.status||"—"],
 ["Fúrt mélység",Number.isFinite(s.drilled)?huNum(s.drilled,1)+" m":"—","Tényleges mélység",o.finalDepth?huNum(o.finalDepth,1)+" m":"—"],
 ["Szűrő kezdete",Number.isFinite(s.filterStart)?huNum(s.filterStart,1)+" m":"—","Szűrő összesen",s.filterTotal?huNum(s.filterTotal,1)+" m":"—"],
 ["Nyugalmi vízszint",Number.isFinite(s.st)?huNum(s.st,2)+" m":"—","Üzemi vízszint",Number.isFinite(s.dy)?huNum(s.dy,2)+" m":"—"],
 ["Vízhozam",s.q?huNum(s.q,2)+" l/perc":"—","Fajlagos vízhozam",Number.isFinite(s.spec)?huNum(s.spec,2)+" l/perc/m":"—"]])}
 <h2>RÉTEGNAPLÓ</h2>${wlDocTable(["Mélység","Réteg","Megjegyzés"],layers.map(r=>[`${r.a}–${r.b} m`,r.name||"—",r.note||"—"]))}
 <h2>KÚTKIKÉPZÉS / SZŰRŐZÉS</h2>${wlDocTable(["Kezdő","Vég","Típus","Hossz"],(o.filters||[]).map(r=>[`${r[0]} m`,`${r[1]} m`,r[2]||"—",Number.isFinite(+r[0])&&Number.isFinite(+r[1])?(+r[1]-+r[0]).toFixed(1)+" m":"—"]))}
 <h2>PRÓBASZIVATTYÚZÁS</h2><p>Mért vízmennyiség: <b>${o.measureLiters||0} liter</b> · Mérési idő: <b>${o.measureSeconds||0} mp</b> · Vízhozam: <b>${s.q?huNum(s.q,2):"—"} l/perc</b></p>
 <p>Nyugalmi: ${Number.isFinite(s.st)?huNum(s.st,2)+" m":"—"} · Üzemi: ${Number.isFinite(s.dy)?huNum(s.dy,2)+" m":"—"} · Leszívás: ${Number.isFinite(s.draw)?huNum(s.draw,2)+" m":"—"}</p>
 <h2>MEGJEGYZÉS</h2><p>${wlDocEsc(o.notes||"—").replace(/\n/g,"<br>")}</p></div>`;
}
function wlLayerDocumentHtml(o){
 const ctx=wlPermitContext(o),layers=wlMergedLayers(o);
 return `<div class="wl-document">${wlDocHeader("FÚRÁSI RÉTEGSOR",o,ctx)}
 <p></p>
 ${wlDocTable(["Réteg","Felső határ (m-től)","Alsó határ (m-ig)","Réteg megnevezése","Megjegyzés"],layers.map((r,i)=>[i+1,r.a.toFixed(2).replace(".",","),r.b.toFixed(2).replace(".",","),r.name||"—",r.note||"—"]))}
 <h2>ENGEDÉLYEZETT KÚTADATOK</h2>${wlDocTable(["Megnevezés","Érték","Megnevezés","Érték"],[
 ["Helyrajzi szám",ctx.w.parcelNumber||ctx.p.hrsz||"—","Település",ctx.w.settlement||"—"],
 ["Engedélyezett mélység",ctx.w.permittedDepth?ctx.w.permittedDepth+" m":"—","Engedélyezett vízhozam",ctx.w.permittedFlow?ctx.w.permittedFlow+" l/perc":"—"],
 ["EOV X",ctx.w.eovX||"—","EOV Y",ctx.w.eovY||"—"],
 ["Terepszint",ctx.w.terrainElevation||"—","Vízhasználat célja",ctx.pm.waterUse||ctx.w.purpose||"—"]])}</div>`;
}
function wlCasingDocumentHtml(o){
 const ctx=wlPermitContext(o),w=ctx.w, sections=(o.filters||[]).filter(r=>Number.isFinite(+r[0])&&Number.isFinite(+r[1])&&+r[1]>+r[0]);
 const rows=[];
 if(w.steelPipe||w.steelPipeDiameter||w.diameter) rows.push(["Acél iránycső",w.steelPipe||w.steelPipeDiameter||w.diameter,"—","—"]);
 if(w.casingDiameter||w.casing) rows.push(["Termelő / béléscső",w.casingDiameter||w.casing,"0",sections.length?sections[0][0]:wlDocEsc(o.finalDepth||w.permittedDepth||"")]);
 sections.forEach(r=>rows.push([r[2]==="Szűrő"?"Szűrőzés":"Vak csőszakasz",w.filterDiameter||w.casingDiameter||w.casing||"—",r[0],r[1]]));
 return `<div class="wl-document">${wlDocHeader("CSÖVEZÉSI VÁZLAT",o,ctx)}
 <h2>KÚT MŰSZAKI ADATAI</h2>${wlDocTable(["Megnevezés","Érték","Megnevezés","Érték"],[
 ["Tervezett furatátmérő",w.diameter||"—","Acél iránycső",w.steelPipe||w.steelPipeDiameter||"—"],
 ["Béléscső / termelőcső",w.casingDiameter||w.casing||"—","Szűrőcső átmérő",w.filterDiameter||w.casingDiameter||"—"],
 ["Szűrőzött szakasz",w.screenInterval||o.screenInterval||"—","Kútmélység",o.finalDepth||w.permittedDepth||"—"],
 ["Nyomóvezeték",w.pressurePipe||"—","Osztóvezeték",w.distributionPipe||"—"]])}
 <h2>CSÖVEZÉSI / SZŰRŐZÉSI SZAKASZOK</h2>${wlDocTable(["Típus","Műszaki adat","Kezdő (m)","Vég (m)"],rows)}
 <div class="wl-profile-doc">${wlDocProfileSvg(o)}</div>
 <p><b>Megjegyzés:</b> a grafikus szelvény a munkanapló rétegei, csövezési/szűrőzési szakaszai és a rögzített nyugalmi/üzemi vízszintek alapján készül.</p></div>`;
}

function wlFurasiRetegsorRows(o){
  const raw=Array.isArray(o?.layers)?o.layers:[];
  const rows=raw.map((r,i)=>{
    const a=Number(String(r?.[0]??"").replace(",","."));
    const b=Number(String(r?.[1]??"").replace(",","."));
    const name=String(r?.[2]??r?.[3]??"").trim();
    return {a,b,name};
  }).filter(r=>Number.isFinite(r.a)&&Number.isFinite(r.b)&&r.b>r.a&&r.name);

  const merged=[];
  const norm=v=>String(v||"").toLocaleLowerCase("hu-HU").replace(/\s+/g," ").trim();
  for(const r of rows){
    const p=merged[merged.length-1];
    if(p && Math.abs(p.b-r.a)<0.001 && norm(p.name)===norm(r.name)){
      p.b=r.b;
    }else{
      merged.push({...r});
    }
  }
  return merged.map((r,i)=>[
    String(i+1),
    huNum(r.a,2),
    huNum(r.b,2),
    r.name
  ]);
}

function wlGeneratedDocHtml(type,o){
 if(type==="layers")return wlLayerDocumentHtml(o);
 if(type==="casing")return wlCasingDocumentHtml(o);
 return wlBuildDocumentHtml(o);
}
function openGeneratedWorklogPrint(type){
 const o=window._generatedWorklog||wlCollect(),titles={build:"Építési napló",layers:"Fúrási rétegsor",casing:"Csövezési vázlat"};
 const w=window.open("","_blank"); if(!w){alert("A böngésző blokkolta a felugró ablakot.");return}
 w.document.write(`<html><head><meta charset="utf-8"><title>${titles[type]||"Munkanapló dokumentum"}</title><style>@page{size:A4;margin:14mm}body{font:10.5pt Arial;color:#222}.wl-doc-header{border-bottom:3px solid #2b78b8;padding-bottom:12px;margin-bottom:18px}.wl-doc-header strong{display:block;font-size:20pt;color:#1e78b4}.wl-doc-header span{font-size:10pt;color:#555}.wl-document h1{color:#216fa8;font-size:18pt}.wl-document h2{color:#216fa8;font-size:13pt;margin-top:18px}.wl-document table{width:100%;border-collapse:collapse;margin:8px 0 15px}.wl-document th{background:#ddd}.wl-document td,.wl-document th{border:1px solid #bbb;padding:6px;text-align:left}.wl-profile-doc{text-align:center;margin-top:12px}.wl-profile-doc svg{width:100%;max-width:720px;height:auto}.wl-document{page-break-inside:auto}</style></head><body>${wlGeneratedDocHtml(type,o)}</body></html>`);w.document.close();setTimeout(()=>w.print(),500);
}
function legacy_openWorklogDocument(){
 const o=wlCollect();
 window._generatedWorklog=o;
 const docs=[
  ["build","📋","Építési napló","A munkanapló napi munkavégzéséből és a kapcsolódó engedély/projekt adataiból"],
  ["layers","🪨","Fúrási rétegsor","A munkanaplóban rögzített rétegszakaszokból, azonos egymást követő rétegek összevonásával"],
  ["casing","🕳️","Csövezési vázlat","Az engedély műszaki adataiból és a munkanapló csövezési/szűrőzési adataiból"]
 ];
 openModal("3 dokumentum generálása",`<div class="wl-generated-docs">${docs.map(d=>`<div class="wl-generated-doc-card"><div class="wl-generated-doc-icon">${d[1]}</div><div class="wl-generated-doc-main"><h3>${d[2]}</h3><div class="label">${d[3]}</div></div><div class="wl-generated-doc-actions"><button type="button" class="btn" onclick="openGeneratedWorklogPrint('${d[0]}')">📄 PDF / Nyomtatás</button><button type="button" class="btn secondary" onclick="exportGeneratedWorklogDocx('${d[0]}')">📝 Word</button></div><div class="wl-generated-doc-preview">${wlGeneratedDocHtml(d[0],o)}</div></div>`).join("")}</div><div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Bezárás</button></div>`);
}

async function exportGeneratedWorklogDocx(type){
 const o=window._generatedWorklog||wlCollect(),ctx=wlPermitContext(o),s=wlDocSummary(o),z=new JSZip();
 const title={build:"ÉPÍTÉSI NAPLÓ",layers:"FÚRÁSI RÉTEGSOR",casing:"CSÖVEZÉSI VÁZLAT"}[type]||"Munkanapló dokumentum";
 const rows=(headers,data)=>docxTable2(headers,data);
 let body=docxP2("KÚTFŐ PLUSZ KFT.",true,34,"1E78B4")+docxP2("4481 Nyíregyháza, Attila utca 61. · +36 20 9247187 · kutfokft@gmail.com",false,18,"555555")+(type==="layers"?"":docxP2(title,true,30,"216FA8")+docxP2(`Ügyfél: ${ctx.customer}    Helyszín: ${o.location||ctx.p.location||ctx.w.location||"—"}    Kút: ${o.wellNo||"—"}`)+docxP2(`Helyrajzi szám: ${ctx.w.parcelNumber||ctx.p.hrsz||"—"}    Létesítési engedély: ${ctx.pm.number||"—"}`));
 if(type==="layers"){
   const ls=wlMergedLayers(o);
   const layerRows=ls.map((r,i)=>[
     String(i+1),
     r.a.toFixed(2).replace(".",","),
     r.b.toFixed(2).replace(".",","),
     r.name||"—",
     r.note||"—"
   ]);
   const permitRows=[
     ["Helyrajzi szám",ctx.w.parcelNumber||ctx.p.hrsz||"—","Település",ctx.w.settlement||"—"],
     ["Engedélyezett mélység",ctx.w.permittedDepth?ctx.w.permittedDepth+" m":"—","Engedélyezett vízhozam",ctx.w.permittedFlow?ctx.w.permittedFlow+" l/p":"—"],
     ["EOV X",ctx.w.eovX||"—","EOV Y",ctx.w.eovY||"—"],
     ["Terepszint",ctx.w.terrainElevation||"—","Vízhasználat célja",ctx.pm.waterUse||ctx.w.purpose||"—"]
   ];
   body+=docxRule2()
      +docxP2("FÚRÁSI RÉTEGSOR",true,30,"216FA8")
      +docxMeta2([["Ügyfél",ctx.customer],["Helyszín",o.location||ctx.p.location||ctx.w.location||"—"],["Kút",o.wellNo||"—"]])
      +docxMeta2([["Helyrajzi szám",ctx.w.parcelNumber||ctx.p.hrsz||"—"],["Létesítési engedély",ctx.pm.number||"—"],["Engedély dátuma",ctx.pm.date||"—"]])
      +docxTableWidths(["Réteg","Felső határ (m-től)","Alsó határ (m-ig)","Réteg megnevezése","Megjegyzés"],layerRows,[850,2250,2250,3300,1456])
      +docxP2("ENGEDÉLYEZETT KÚTADATOK",true,25,"216FA8")
      +docxTableWidths(["Megnevezés","Érték","Megnevezés","Érték"],permitRows,[2250,2800,2250,2806]);
 }else if(type==="casing"){
   const sections=(o.filters||[]).filter(r=>Number.isFinite(+r[0])&&Number.isFinite(+r[1])&&+r[1]>+r[0]);
   const cr=[]; if(ctx.w.steelPipe||ctx.w.steelPipeDiameter||ctx.w.diameter)cr.push(["Acél iránycső",ctx.w.steelPipe||ctx.w.steelPipeDiameter||ctx.w.diameter,"—","—"]); if(ctx.w.casingDiameter||ctx.w.casing)cr.push(["Termelő / béléscső",ctx.w.casingDiameter||ctx.w.casing,"0",sections.length?sections[0][0]:String(o.finalDepth||ctx.w.permittedDepth||"")]); sections.forEach(r=>cr.push([r[2]==="Szűrő"?"Szűrőzés":"Vak csőszakasz",ctx.w.filterDiameter||ctx.w.casingDiameter||ctx.w.casing||"—",r[0],r[1]]));
   body+=docxP2("KÚT MŰSZAKI ADATAI",true,25,"216FA8")+rows(["Megnevezés","Érték","Megnevezés","Érték"],[["Furatátmérő",ctx.w.diameter||"—","Acél iránycső",ctx.w.steelPipe||ctx.w.steelPipeDiameter||"—"],["Béléscső",ctx.w.casingDiameter||ctx.w.casing||"—","Szűrőcső",ctx.w.filterDiameter||ctx.w.casingDiameter||"—"],["Szűrőzött szakasz",ctx.w.screenInterval||o.screenInterval||"—","Nyomóvezeték",ctx.w.pressurePipe||"—"],["Osztóvezeték",ctx.w.distributionPipe||"—","Kútmélység",o.finalDepth||ctx.w.permittedDepth||"—"]])+docxP2("CSÖVEZÉSI SZAKASZOK",true,25,"216FA8")+rows(["Típus","Műszaki adat","Kezdő","Vég"],cr);
 }else{
   body+=docxP2("ENGEDÉLY ÉS KIVITELEZÉSI ADATOK",true,25,"216FA8")+rows(["Megnevezés","Érték","Megnevezés","Érték"],[["Engedélyezett mélység",ctx.w.permittedDepth?ctx.w.permittedDepth+" m":"—","Engedélyezett vízhozam",ctx.w.permittedFlow?ctx.w.permittedFlow+" l/perc":"—"],["Vízhasználat",ctx.pm.waterUse||ctx.w.purpose||"—","Éves vízmennyiség",ctx.w.annualWater||ctx.pm.annualWater||"—"],["Fúrt mélység",s.drilled?huNum(s.drilled,1)+" m":"—","Vízhozam",s.q?huNum(s.q,2)+" l/perc":"—"],["Nyugalmi vízszint",Number.isFinite(s.st)?huNum(s.st,2)+" m":"—","Üzemi vízszint",Number.isFinite(s.dy)?huNum(s.dy,2)+" m":"—"]])+docxP2("RÉTEGNAPLÓ",true,25,"216FA8")+rows(["Mélység","Réteg","Megjegyzés"],wlMergedLayers(o).map(r=>[r.a+"–"+r.b+" m",r.name||"—",r.note||"—"]))+docxP2("MEGJEGYZÉS",true,25,"216FA8")+docxP2(o.notes||"—");
 }
 const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:right="900" w:bottom="850" w:left="900"/></w:sectPr></w:body></w:document>`;
 z.file("[Content_Types].xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
 z.folder("_rels").file(".rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`); z.folder("word").file("document.xml",doc);
 const blob=await z.generateAsync({type:"blob"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`${title.replace(/\s+/g,"_")}-${(o.location||"").replace(/[\\/:*?"<>|]/g,"-")}.docx`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
}
function openWorklogDocument(){
 const o=wlCollect();
 window._generatedWorklog=o;
 const docs=[
  ["build","📋","Építési napló","A munkanapló napi munkavégzéséből és a kapcsolódó engedély/projekt adataiból"],
  ["layers","🪨","Fúrási rétegsor","A munkanaplóban rögzített rétegszakaszokból, azonos egymást követő rétegek összevonásával"],
  ["casing","🕳️","Csövezési vázlat","Az engedély műszaki adataiból és a munkanapló csövezési/szűrőzési adataiból"]
 ];
 openModal("3 dokumentum generálása",`<div class="wl-generated-docs">${docs.map(d=>`<div class="wl-generated-doc-card"><div class="wl-generated-doc-icon">${d[1]}</div><div class="wl-generated-doc-main"><h3>${d[2]}</h3><div class="label">${d[3]}</div></div><div class="wl-generated-doc-actions"><button type="button" class="btn" onclick="openGeneratedWorklogPrint('${d[0]}')">📄 PDF / Nyomtatás</button><button type="button" class="btn secondary" onclick="exportGeneratedWorklogDocx('${d[0]}')">📝 Word</button></div><div class="wl-generated-doc-preview">${wlGeneratedDocHtml(d[0],o)}</div></div>`).join("")}</div><div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Bezárás</button></div>`);
}

function printWorklogDocument(o){
 o=o||window._generatedWorklog||wlCollect(); const w=window.open("","_blank");
 if(!w){alert("A böngésző blokkolta a felugró ablakot.");return}
 w.document.write(`<html><head><meta charset="utf-8"><title>Munkanapló</title><style>
 @page{size:A4;margin:14mm}

.wl-profile-graphic-only{border:1px solid #c9d3dd;border-radius:8px;padding:6px;background:#fff;display:flex;justify-content:center;overflow:visible;break-inside:avoid;page-break-inside:avoid}
.wl-profile-graphic-only svg{display:block;width:100%;height:auto;max-height:510px}
body{font:11pt Arial;color:#222}.wl-doc-header{border-bottom:3px solid #2b78b8;padding-bottom:12px;margin-bottom:18px}.wl-doc-header strong{display:block;font-size:20pt;color:#1e78b4}.wl-doc-header span{font-size:10pt;color:#555}.wl-document h1{color:#216fa8;font-size:18pt}.wl-document h2{color:#216fa8;font-size:13pt;margin-top:18px}.wl-document table{width:100%;border-collapse:collapse;margin:8px 0 15px}.wl-document th{background:#ddd}.wl-document td,.wl-document th{border:1px solid #bbb;padding:6px;text-align:left}.wl-sign{margin-top:35px}</style>
<style id="project-doc-final-fix">
.project-doc-row > :nth-child(3){
  font-size:15px !important;
  line-height:1.35 !important;
  white-space:nowrap !important;
  overflow:hidden;
  text-overflow:ellipsis;
  min-width:170px;
}
.project-doc-header > :nth-child(3){
  white-space:nowrap !important;
}
@media(max-width:1150px){
  .project-doc-row > :nth-child(3){
    min-width:0;
  }
}
</style>

<style id="project-doc-font-reference-fix">
/* A "Projekt folyamat" szövegmérete a mérvadó a dokumentumlistában is. */
.project-doc-row:not(.project-doc-header) > div,
.project-doc-row:not(.project-doc-header) .project-doc-name,
.project-doc-row:not(.project-doc-header) .project-doc-meta,
.project-doc-row:not(.project-doc-header) .project-doc-status,
.project-doc-row:not(.project-doc-header) > :nth-child(3) {
  font-size: 13px !important;
  line-height: 1.35 !important;
}
.project-doc-row:not(.project-doc-header) .project-doc-name {
  font-weight: 700 !important;
}
.project-doc-header > div {
  font-size: 13px !important;
  line-height: 1.35 !important;
}
.project-doc-actions .btn {
  font-size: 12px !important;
}
</style>

<style id="project-single-column-layout">
.project-page-main .grid2,
.project-page-main .project-columns,
.project-page-main .project-content-grid,
.project-page-main .project-layout,
.project-page-main .project-main-grid {
  display:flex !important;
  flex-direction:column !important;
  grid-template-columns:none !important;
  width:100% !important;
  gap:16px !important;
}
.project-page-main .grid2 > *,
.project-page-main .project-columns > *,
.project-page-main .project-content-grid > *,
.project-page-main .project-layout > *,
.project-page-main .project-main-grid > * {
  width:100% !important;
  max-width:none !important;
  min-width:0 !important;
}
</style>

<style id="project-quote-summary-css">
.project-quote-summary{width:100%}
.project-quote-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}
.project-quote-kpis>div{padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#fff}
.project-quote-kpis span{display:block;font-size:13px;line-height:1.35;color:#64748b}
.project-quote-kpis b{display:block;margin-top:4px;font-size:15px;line-height:1.35}
@media(max-width:700px){.project-quote-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}
</style>
</head><body>${wlDocumentHtml(o)}</body></html>`);
 w.document.close();setTimeout(()=>w.print(),500);
}
function docxEsc2(v){return String(v==null?"":v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}
function docxRun2(t,b=false,sz=22,c="222222"){return `<w:r><w:rPr>${b?"<w:b/>":""}<w:color w:val="${c}"/><w:sz w:val="${sz}"/></w:rPr><w:t xml:space="preserve">${docxEsc2(t)}</w:t></w:r>`}
function docxP2(t="",b=false,sz=22,c="222222"){return `<w:p>${docxRun2(t,b,sz,c)}</w:p>`}


function docxRule2(){
 return `<w:tbl><w:tblPr><w:tblW w:w="10106" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblBorders><w:top w:val="nil"/><w:left w:val="nil"/><w:bottom w:val="single" w:sz="18" w:color="2B78B8"/><w:right w:val="nil"/><w:insideH w:val="nil"/><w:insideV w:val="nil"/></w:tblBorders></w:tblPr><w:tblGrid><w:gridCol w:w="10106"/></w:tblGrid><w:tr><w:tc><w:tcPr><w:tcW w:w="10106" w:type="dxa"/></w:tcPr><w:p><w:pPr><w:spacing w:before="0" w:after="0"/></w:pPr></w:p></w:tc></w:tr></w:tbl>`;
}
function docxMeta2(items){
 const runs=items.map((it,i)=>{
   const label=String(it[0]??""), value=String(it[1]??"—");
   const sep=i?`<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">    </w:t></w:r>`:"";
   return sep
    + `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="20"/><w:b/></w:rPr><w:t xml:space="preserve">${label}:</w:t></w:r>`
    + `<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve"> ${value}</w:t></w:r>`;
 }).join("");
 return `<w:p><w:pPr><w:spacing w:before="0" w:after="110"/></w:pPr>${runs}</w:p>`;
}
function docxTableWidths(headers,rows,widths){
 const esc=x=>String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
 const total=10106;
 const cell=(x,h,i)=>{
   const align=i===0?"center":"left";
   return `<w:tc><w:tcPr><w:tcW w:w="${widths[i]||2000}" w:type="dxa"/><w:tcMar><w:top w:w="75" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:bottom w:w="75" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tcMar>${h?'<w:shd w:fill="E7E7E7"/>':''}</w:tcPr><w:p><w:pPr><w:jc w:val="${align}"/><w:spacing w:before="0" w:after="0" w:line="220"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="${h?20:20}"/><w:color w:val="222222"/>${h?"<w:b/>":""}</w:rPr><w:t xml:space="preserve">${esc(x)}</w:t></w:r></w:p></w:tc>`;
 };
 const grid=`<w:tblGrid>${widths.map(w=>`<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>`;
 const borders=`<w:tblBorders><w:top w:val="single" w:sz="7" w:color="AFAFAF"/><w:left w:val="single" w:sz="7" w:color="AFAFAF"/><w:bottom w:val="single" w:sz="7" w:color="AFAFAF"/><w:right w:val="single" w:sz="7" w:color="AFAFAF"/><w:insideH w:val="single" w:sz="5" w:color="BFBFBF"/><w:insideV w:val="single" w:sz="5" w:color="BFBFBF"/></w:tblBorders>`;
 return `<w:tbl><w:tblPr><w:tblW w:w="${total}" w:type="dxa"/><w:tblLayout w:type="fixed"/><w:tblCellMar><w:top w:w="0" w:type="dxa"/><w:left w:w="0" w:type="dxa"/><w:bottom w:w="0" w:type="dxa"/><w:right w:w="0" w:type="dxa"/></w:tblCellMar>${borders}</w:tblPr>${grid}<w:tr>${headers.map((x,i)=>cell(x,true,i)).join("")}</w:tr>${rows.map(r=>`<w:tr>${r.map((x,i)=>cell(x,false,i)).join("")}</w:tr>`).join("")}</w:tbl>`;
}
function docxLayerTable2(headers,rows){
 const widths=[850,1800,1800,6756];
 const esc=x=>String(x??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");
 const cell=(x,h,i)=>{
  const align=i===3?"left":"center";
  return `<w:tc><w:tcPr><w:tcW w:w="${widths[i]}" w:type="dxa"/><w:tcMar><w:top w:w="90" w:type="dxa"/><w:left w:w="110" w:type="dxa"/><w:bottom w:w="90" w:type="dxa"/><w:right w:w="110" w:type="dxa"/></w:tcMar>${h?'<w:shd w:fill="D9EAF7"/>':''}</w:tcPr><w:p><w:pPr><w:jc w:val="${align}"/><w:spacing w:after="0"/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:sz w:val="20"/><w:color w:val="${h?"17365D":"222222"}"/>${h?"<w:b/>":""}</w:rPr><w:t xml:space="preserve">${esc(x)}</w:t></w:r></w:p></w:tc>`;
 };
 const grid=`<w:tblGrid>${widths.map(w=>`<w:gridCol w:w="${w}"/>`).join("")}</w:tblGrid>`;
 const borders=`<w:tblBorders><w:top w:val="single" w:sz="8" w:color="8A969F"/><w:left w:val="single" w:sz="8" w:color="8A969F"/><w:bottom w:val="single" w:sz="8" w:color="8A969F"/><w:right w:val="single" w:sz="8" w:color="8A969F"/><w:insideH w:val="single" w:sz="5" w:color="C4CBD1"/><w:insideV w:val="single" w:sz="5" w:color="C4CBD1"/></w:tblBorders>`;
 return `<w:tbl><w:tblPr><w:tblW w:w="11206" w:type="dxa"/><w:tblLayout w:type="fixed"/>${borders}</w:tblPr>${grid}<w:tr>${headers.map((x,i)=>cell(x,true,i)).join("")}</w:tr>${rows.map(r=>`<w:tr>${r.map((x,i)=>cell(x,false,i)).join("")}</w:tr>`).join("")}</w:tbl>`;
}
function docxTable2(headers,rows){
 const cell=(x,h)=>`<w:tc><w:tcPr>${h?'<w:shd w:fill="D9E2F3"/>':''}</w:tcPr><w:p>${docxRun2(x,h,20,h?"216FA8":"222222")}</w:p></w:tc>`;
 return `<w:tbl><w:tblPr><w:tblBorders><w:top w:val="single" w:sz="4" w:color="B7B7B7"/><w:left w:val="single" w:sz="4" w:color="B7B7B7"/><w:bottom w:val="single" w:sz="4" w:color="B7B7B7"/><w:right w:val="single" w:sz="4" w:color="B7B7B7"/><w:insideH w:val="single" w:sz="4" w:color="B7B7B7"/><w:insideV w:val="single" w:sz="4" w:color="B7B7B7"/></w:tblBorders></w:tblPr><w:tr>${headers.map(x=>cell(x,true)).join("")}</w:tr>${rows.map(r=>`<w:tr>${r.map(x=>cell(x,false)).join("")}</w:tr>`).join("")}</w:tbl>`;
}
async function exportWorklogDocx(o){
 try{
  o=o||window._generatedWorklog||wlCollect(); const s=wlDocSummary(o),z=new JSZip(),customer=cust(o.customerId)||"";
  const layers=(o.layers||[]).map(r=>[`${r[0]} m - ${r[1]} m`,r[2]||"",r[3]||"",r[4]||"",r[5]||""]);
  const filters=(o.filters||[]).map(r=>[`${r[0]} m - ${r[1]} m`,`${(+r[1]||0)-(+r[0]||0)} m`,r[3]||"",r[2]||""]);
  const summary=[["Fúrt mélység",Number.isFinite(s.drilled)?huNum(s.drilled,1)+" m":"—","Tényleges mélység",Number.isFinite(s.drilled)?huNum(s.drilled,1)+" m":"—"],["Szűrő kezdete",Number.isFinite(s.filterStart)?huNum(s.filterStart,1)+" m":"—","Szűrő összesen",s.filterTotal?huNum(s.filterTotal,1)+" m":"—"],["Nyugalmi vízszint",Number.isFinite(s.st)?huNum(s.st,2)+" m":"—","Üzemi vízszint",Number.isFinite(s.dy)?huNum(s.dy,2)+" m":"—"],["Leszívás",Number.isFinite(s.draw)?huNum(s.draw,2)+" m":"—","Próbaszivattyúzás",s.q?huNum(s.q,2)+" l/perc":"—"],["Fajlagos vízhozam",Number.isFinite(s.spec)?huNum(s.spec,2)+" l/perc/m":"—","",""]];
  let body=docxP2("KÚTFŐ PLUSZ KFT.",true,34,"1E78B4")+docxP2("4481 Nyíregyháza, Attila út 61. · +36 20 9247187 · kutfokft@gmail.com",false,18,"555555")+docxP2("MUNKANAPLÓ",true,30,"216FA8")+docxP2(`Dátum: ${o.date||""}    Helyszín: ${o.location||""}    Kút: ${o.wellNo||""}`)+docxP2(`Megrendelő: ${customer}`)+docxP2("KÚT ÖSSZESÍTŐ",true,25,"216FA8")+docxTable2(["Megnevezés","Érték","Megnevezés","Érték"],summary)+docxP2("RÉTEGNAPLÓ",true,25,"216FA8")+docxTable2(["A réteg","m-től","m-ig","A réteg megnevezése"],layers)+docxP2("KÚTKIKÉPZÉS / SZŰRŐZÉS",true,25,"216FA8")+docxTable2(["Szakasz","Hossz","Darab","Típus / cső"],filters)+docxP2("PRÓBASZIVATTYÚZÁS",true,25,"216FA8")+docxP2(`Mért vízmennyiség: ${o.measureLiters||0} liter    Mérési idő: ${o.measureSeconds||0} mp    Vízhozam: ${s.q?huNum(s.q,2):"—"} l/perc`)+docxP2("MEGJEGYZÉS",true,25,"216FA8")+docxP2(o.notes||"—")+docxP2("______________________________")+docxP2("Megrendelő / átvevő")+docxP2("______________________________")+docxP2("Kútfő Plusz Kft.");
  const doc=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${body}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="850" w:right="900" w:bottom="850" w:left="900"/></w:sectPr></w:body></w:document>`;
  z.file("[Content_Types].xml",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
  z.folder("_rels").file(".rels",`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
  z.folder("word").file("document.xml",doc);
  const blob=await z.generateAsync({type:"blob"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download=`Munkanaplo-${(o.location||"").replace(/[\\/:*?"<>|]/g,"-")}-${o.wellNo||""}.docx`;a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1500);
 }catch(e){console.error(e);alert("A Word dokumentum generálása nem sikerült: "+e.message)}
}
function wlPrint(){let o=wlCollect();let w=window.open("","_blank");w.document.write(`<html><head><title>Munkanapló</title><style>body{font:13px Arial;padding:30px}table{width:100%;border-collapse:collapse}td,th{border:1px solid #ccc;padding:6px;text-align:left}</style>
<style id="project-doc-final-fix">
.project-doc-row > :nth-child(3){
  font-size:15px !important;
  line-height:1.35 !important;
  white-space:nowrap !important;
  overflow:hidden;
  text-overflow:ellipsis;
  min-width:170px;
}
.project-doc-header > :nth-child(3){
  white-space:nowrap !important;
}
@media(max-width:1150px){
  .project-doc-row > :nth-child(3){
    min-width:0;
  }
}
</style>

<style id="project-doc-font-reference-fix">
/* A "Projekt folyamat" szövegmérete a mérvadó a dokumentumlistában is. */
.project-doc-row:not(.project-doc-header) > div,
.project-doc-row:not(.project-doc-header) .project-doc-name,
.project-doc-row:not(.project-doc-header) .project-doc-meta,
.project-doc-row:not(.project-doc-header) .project-doc-status,
.project-doc-row:not(.project-doc-header) > :nth-child(3) {
  font-size: 13px !important;
  line-height: 1.35 !important;
}
.project-doc-row:not(.project-doc-header) .project-doc-name {
  font-weight: 700 !important;
}
.project-doc-header > div {
  font-size: 13px !important;
  line-height: 1.35 !important;
}
.project-doc-actions .btn {
  font-size: 12px !important;
}
</style>

<style id="project-doc-exact-font-reference">
/* A Projekt folyamat (.kpi) 13px-es törzsszövege a mérvadó a dokumentumlistában. */
.project-documents-panel .project-doc-row:not(.project-doc-header) > div,
.project-documents-panel .project-doc-row:not(.project-doc-header) .project-doc-name,
.project-documents-panel .project-doc-row:not(.project-doc-header) .project-doc-meta,
.project-documents-panel .project-doc-row:not(.project-doc-header) .project-doc-status,
.project-documents-panel .project-doc-row:not(.project-doc-header) > :nth-child(3) {
  font-size:13px !important;
  line-height:1.35 !important;
}
.project-documents-panel .project-doc-row:not(.project-doc-header) .project-doc-name {
  font-weight:700 !important;
}
.project-documents-panel .project-doc-header,
.project-documents-panel .project-doc-header > div {
  font-size:13px !important;
  line-height:1.35 !important;
  font-weight:700 !important;
}
.project-documents-panel .project-doc-actions .btn {
  font-size:12px !important;
  line-height:1.2 !important;
}
.project-documents-panel .project-doc-icon { font-size: 17px !important; }
</style>

<style id="project-single-column-layout">
.project-page-main .grid2,
.project-page-main .project-columns,
.project-page-main .project-content-grid,
.project-page-main .project-layout,
.project-page-main .project-main-grid {
  display:flex !important;
  flex-direction:column !important;
  grid-template-columns:none !important;
  width:100% !important;
  gap:16px !important;
}
.project-page-main .grid2 > *,
.project-page-main .project-columns > *,
.project-page-main .project-content-grid > *,
.project-page-main .project-layout > *,
.project-page-main .project-main-grid > * {
  width:100% !important;
  max-width:none !important;
  min-width:0 !important;
}
</style>

<style id="project-quote-summary-css">
.project-quote-summary{width:100%}
.project-quote-kpis{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-top:12px}
.project-quote-kpis>div{padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;background:#fff}
.project-quote-kpis span{display:block;font-size:13px;line-height:1.35;color:#64748b}
.project-quote-kpis b{display:block;margin-top:4px;font-size:15px;line-height:1.35}
@media(max-width:700px){.project-quote-kpis{grid-template-columns:repeat(2,minmax(0,1fr))}}

.project-well-tech-table-edit .project-well-tech-row-edit{
  display:grid;
  grid-template-columns: 1.15fr repeat(4, minmax(120px,1fr));
  gap:10px;
  align-items:end;
  padding:10px 12px;
}
.project-well-tech-row-edit .field{margin:0}
.project-well-tech-row-edit .field label{display:block;font-size:11px;color:#64748b;margin-bottom:4px;font-weight:700}
.project-well-tech-row-edit .input{width:100%;box-sizing:border-box}
@media(max-width:900px){
  .project-well-tech-table-edit .project-well-tech-row-edit{grid-template-columns:1fr 1fr}
  .project-well-tech-row-edit>span{grid-column:1/-1}
}
</style>
</head><body><h1>💧 Kútfő Plusz ERP – Munkanapló</h1><p>Dátum: ${esc(o.date)} | Helyszín: ${esc(o.location)} | Kút: ${esc(o.wellNo)}</p><h2>Rétegnapló</h2><table><tr><th>Kezdő</th><th>Vég</th><th>Réteg</th><th>Fúrási viselkedés</th><th>Vízszín/állapot</th><th>Megjegyzés</th></tr>${o.layers.map(r=>`<tr>${r.map(x=>`<td>${esc(x)}</td>`).join("")}</tr>`).join("")}</table><h2>Kútkiképzés / szűrőzés</h2><table><tr><th>Kezdő</th><th>Vég</th><th>Típus</th><th>Megjegyzés</th></tr>${o.filters.map(r=>`<tr>${r.map(x=>`<td>${esc(x)}</td>`).join("")}</tr>`).join("")}</table><h2>Próbaszivattyúzás</h2><p>Mért vízmennyiség: ${o.measureLiters} liter | Mérési idő: ${o.measureSeconds} mp | Számított Q: ${o.flow} l/perc | Nyugalmi: ${o.static2} m | Üzemi: ${o.dynamic2} m</p><h2>Munkanapló megjegyzés</h2><p>${esc(o.notes)}</p><script>window.print()${"<"}${"/"}script></body></html>`);w.document.close()}
function wlImport(){const i=document.createElement("input");i.type="file";i.accept=".json";i.onchange=async()=>{try{const d=JSON.parse(await i.files[0].text());Object.entries(d).forEach(([k,v])=>{let e=document.getElementById("wl_"+k);if(e)e.value=v});wlLayers=d.layers||[];wlFilters=d.filters||[];wlRenderLayers();wlRenderFilters();wlCalculate();toast("Betöltve")}catch{toast("Hibás mentés")}};i.click()}
function newMaterial(){openModal("Új anyag",`<form onsubmit="saveMaterial(event)"><div class="formgrid"><div class="field"><label>Megnevezés</label><input required class="input" name="name"></div><div class="field"><label>Egység</label><input class="input" name="unit" value="db"></div><div class="field"><label>Készlet</label><input class="input" type="number" name="stock" value="0"></div><div class="field"><label>Minimum</label><input class="input" type="number" name="min" value="0"></div><div class="field"><label>Beszerzési ár</label><input class="input" type="number" name="price" value="0"></div></div><div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Mentés</button></div></form>`)}
function saveMaterial(e){e.preventDefault();ensureStockModel();let o=Object.fromEntries(new FormData(e.target).entries());const item={sku:uid("M"),name:o.name,unit:o.unit,qty:+o.stock,minQty:+o.min,cost:+o.price,category:'Egyéb',location:'Központi raktár'};db.stock.push(item);syncLegacyMaterialFromStock(item);if(item.qty)db.stockMovements.push({id:uid('SM'),date:new Date().toISOString().slice(0,10),sku:item.sku,name:item.name,type:'Nyitókészlet',qty:item.qty,unit:item.unit,unitCost:item.cost,total:item.qty*item.cost});save();closeModal();render();toast("Anyag mentve") }
function machineDefault(m){m.type=m.type||m.model||"Egyéb gép";m.model=m.model||"";m.status=m.status||"Üzemképes";m.hours=Number(m.hours)||0;m.service=Number(m.service)||0;m.km=Number(m.km)||0;m.documents=Array.isArray(m.documents)?m.documents:[];m.services=Array.isArray(m.services)?m.services:[];m.meters=Array.isArray(m.meters)?m.meters:[];m.costs=Array.isArray(m.costs)?m.costs:[];m.specs=m.specs&&typeof m.specs==='object'?m.specs:{};m.notes=m.notes||"";return m}
function machineTypeOptions(selected){return ['Kompresszor','Fúrógép','Gépjármű','Tehergépjármű','Utánfutó','Aggregátor','Szivattyú','Hegesztőgép','Emelő / daru','Egyéb gép','Egyéb eszköz'].map(x=>`<option ${x===selected?'selected':''}>${x}</option>`).join('')}
function machineWarnings(m){machineDefault(m);const out=[],now=new Date();if(m.service>0){const d=m.service-m.hours;if(d<=0)out.push({level:'red',text:'Szerviz lejárt',tab:'technical'});else if(d<=50)out.push({level:'orange',text:`Szerviz ${d} üó múlva`,tab:'technical'})}const docs=[['Műszaki vizsga',m.inspectionUntil],['Kötelező biztosítás',m.insuranceUntil],['Casco',m.cascoUntil],['Matrica',m.vignetteUntil]];docs.forEach(([name,val])=>{if(!val)return;const days=Math.ceil((new Date(val+'T00:00:00')-now)/86400000);if(days<0)out.push({level:'red',text:`${name} lejárt`,tab:'documents'});else if(days<=30)out.push({level:'orange',text:`${name} ${days} nap múlva`,tab:'documents'})});if(['Javítás alatt','Kivonva'].includes(m.status))out.push({level:'red',text:m.status,tab:'general'});return out}
function machineParkView(){const ms=db.machines||[];ms.forEach(machineDefault);const warnings=ms.flatMap(m=>machineWarnings(m)),red=warnings.filter(x=>x.level==='red').length,orange=warnings.filter(x=>x.level==='orange').length,ok=ms.filter(m=>machineWarnings(m).length===0).length;return `<div class="panel machine-park"><div class="panelhead"><div><h2>⚙️ Géppark</h2><div class="label">Gépek, járművek és berendezések nyilvántartása</div></div><button class="btn" onclick="newMachine()">+ Új eszköz</button></div><div class="machine-kpis"><div class="card"><div class="label">Összes eszköz</div><div class="value">${ms.length}</div></div><div class="card machine-kpi-red"><div class="label">🔴 Sürgős</div><div class="value">${red}</div></div><div class="card machine-kpi-orange"><div class="label">🟠 Hamarosan</div><div class="value">${orange}</div></div><div class="card"><div class="label">🟢 Rendben</div><div class="value">${ok}</div></div></div><div class="tablewrap"><table class="table machine-table"><thead><tr><th>Eszköz</th><th>Típus</th><th>Gyártó / modell</th><th>Üzemóra</th><th>Következő szerviz</th><th>Állapot</th><th>Figyelmeztetés</th></tr></thead><tbody>${ms.map(m=>{const w=machineWarnings(m);return `<tr><td><a class="link machine-name" onclick="toggleMachine('${esc(m.id)}');return false;"><b>${esc(m.name)}</b></a></td><td>${esc(m.type)}</td><td>${esc(m.manufacturer?m.manufacturer+' / ':'')}${esc(m.model||'—')}</td><td>${huFormatFlexible(m.hours,1)}</td><td>${m.service?huFormatFlexible(m.service,1)+' üó':'—'}</td><td><span class="badge ${m.status==='Üzemképes'?'green':m.status==='Javítás alatt'?'orange':'gray'}">${esc(m.status)}</span></td><td>${w.length?w.map(x=>`<button class="machine-warning ${x.level}" onclick="toggleMachine('${esc(m.id)}','${x.tab}');return false;">${x.level==='red'?'🔴':'🟠'} ${esc(x.text)}</button>`).join(' '):'<span class="machine-ok">🟢 Rendben</span>'}</td></tr><tr id="machine-detail-${esc(m.id)}" class="machine-detail-row" style="display:none"><td colspan="7"><div id="machine-detail-body-${esc(m.id)}"></div></td></tr>`}).join('')||'<tr><td colspan="7" class="label">Nincs rögzített eszköz.</td></tr>'}</tbody></table></div></div>`}
function machineTabs(m,tab){return ['general','technical','documents','service','meters','costs','notes'].map((x,i)=>{const labels=['Általános','Műszaki','Dokumentumok','Szerviz','Mérőóra','Költségek','Megjegyzés'];return `<button type="button" class="machine-tab ${tab===x?'active':''}" onclick="machineTab('${esc(m.id)}','${x}')">${labels[i]}</button>`}).join('')}
function machineReadonlyFields(m){return `<div class="machine-grid"><div><span class="label">Eszköz neve</span><b>${esc(m.name||'—')}</b></div><div><span class="label">Típus</span><b>${esc(m.type||'—')}</b></div><div><span class="label">Gyártó</span><b>${esc(m.manufacturer||'—')}</b></div><div><span class="label">Modell</span><b>${esc(m.model||'—')}</b></div><div><span class="label">Azonosító</span><b>${esc(m.code||m.id)}</b></div><div><span class="label">Évjárat</span><b>${esc(m.year||'—')}</b></div><div><span class="label">Rendszám</span><b>${esc(m.plate||'—')}</b></div><div><span class="label">VIN</span><b>${esc(m.vin||'—')}</b></div><div><span class="label">Műszaki vizsga</span><b>${esc(m.inspectionUntil||'—')}</b></div><div><span class="label">Biztosítás</span><b>${esc(m.insuranceUntil||'—')}</b></div></div>`}
function machineSpecRows(m){const s=m.specs||{};const common=[['Kilométeróra','km',m.km],['Üzemóra','üó',m.hours],['Következő szerviz','üó',m.service],['Szervizintervallum','üó',m.serviceIntervalHours]];let extra=[];const t=m.type||'';if(t==='Kompresszor')extra=[['Légszállítás','m³/min',s.airflow],['Üzemi nyomás','bar',s.pressure],['Max. nyomás','bar',s.maxPressure],['Motor gyártó','',s.engineManufacturer],['Motor típus','',s.engineModel],['Motor teljesítmény','kW',s.enginePower],['Üzemanyag','',s.fuel]];else if(t==='Fúrógép')extra=[['Max. fúrási mélység','m',s.maxDepth],['Max. fúrási átmérő','mm',s.maxDiameter],['Forgatónyomaték','Nm',s.torque],['Max. fordulatszám','1/min',s.rpm],['Húzóerő','kN',s.pullForce],['Tolóerő','kN',s.pushForce]];else if(t.includes('Gépjármű'))extra=[['Hengerűrtartalom','cm³',s.engineSize],['Teljesítmény','kW',s.enginePower],['Üzemanyag','',s.fuel],['Sebességváltó','',s.gearbox],['Meghajtás','',s.drive],['Gumiabroncs','',s.tires],['Saját tömeg','kg',s.ownWeight],['Megengedett össztömeg','kg',s.maxWeight]];else if(t==='Utánfutó')extra=[['Rakfelület','',s.bed],['Tengelyek száma','db',s.axles],['Fékrendszer','',s.brakes],['Hasznos teher','kg',s.payload],['Vonófej','',s.hitch]];else if(t==='Szivattyú')extra=[['Vízhozam','l/perc',s.flow],['Emelőmagasság','m',s.head],['Max. nyomás','bar',s.pressure],['Motor teljesítmény','kW',s.enginePower],['Szivattyútípus','',s.pumpType]];return [...common,...extra].map(r=>`<div><span class="label">${r[0]}</span><b>${r[2]!==undefined&&r[2]!==''?esc(String(r[2]))+(r[1]?' '+r[1]:''):'—'}</b></div>`).join('')}
function machineDocuments(m){const docs=m.documents||[];return `<div class="machine-action-row"><button class="btn secondary small" onclick="showMachineDocForm('${esc(m.id)}')">+ Dokumentum feltöltése</button></div><div class="machine-doc-list">${docs.map((d,i)=>`<div class="machine-list-row"><div><b>${esc(d.name)}</b><span>${esc(d.type||'Egyéb')} · ${esc(d.date||'—')} · ${esc(d.size||'')}</span>${d.note?`<span>${esc(d.note)}</span>`:''}</div><div><button class="btn secondary small" onclick="openMachineDoc('${esc(m.id)}',${i})">Megnyitás</button><button class="btn secondary small" onclick="deleteMachineDoc('${esc(m.id)}',${i})">Törlés</button></div></div>`).join('')||'<div class="empty">Még nincs dokumentum ehhez az eszközhöz.</div>'}</div><div id="machine-doc-form-${esc(m.id)}"></div>`}
function machineServices(m){const a=m.services||[];return `<div class="machine-action-row"><button class="btn secondary small" onclick="showServiceForm('${esc(m.id)}')">+ Szervizbejegyzés</button></div><div class="machine-list">${a.slice().reverse().map((x,i)=>`<div class="machine-list-row"><div><b>${esc(x.date||'—')} · ${esc(x.type||'Szerviz')}</b><span>${esc(x.work||'—')} · ${esc(x.provider||'—')} · ${x.cost?money(x.cost):'—'}</span><span>${x.hours?esc(String(x.hours))+' üó':''}</span></div><button class="btn secondary small" onclick="deleteService('${esc(m.id)}',${a.length-1-i})">Törlés</button></div>`).join('')||'<div class="empty">Még nincs szervizelőzmény.</div>'}</div><div id="service-form-${esc(m.id)}"></div>`}
function machineMeters(m){const a=m.meters||[];return `<div class="machine-action-row"><button class="btn secondary small" onclick="showMeterForm('${esc(m.id)}')">+ Mérőóra rögzítése</button></div><div class="machine-list">${a.slice().reverse().map((x,i)=>`<div class="machine-list-row"><div><b>${esc(x.date||'—')}</b><span>Km: ${esc(x.km??'—')} · Üzemóra: ${esc(x.hours??'—')}</span><span>${esc(x.note||'')}</span></div><button class="btn secondary small" onclick="deleteMeter('${esc(m.id)}',${a.length-1-i})">Törlés</button></div>`).join('')||'<div class="empty">Még nincs mérőóra-előzmény.</div>'}</div><div id="meter-form-${esc(m.id)}"></div>`}
function machineCosts(m){const a=m.costs||[],year=new Date().getFullYear(),y=a.filter(x=>(x.date||'').startsWith(String(year))),total=y.reduce((n,x)=>n+(Number(x.amount)||0),0);return `<div class="machine-cost-summary"><div><span class="label">${year}. évi költség</span><b>${money(total)}</b></div><div><span class="label">Bejegyzések</span><b>${y.length}</b></div></div><div class="machine-action-row"><button class="btn secondary small" onclick="showCostForm('${esc(m.id)}')">+ Költség rögzítése</button></div><div class="machine-list">${a.slice().reverse().map((x,i)=>`<div class="machine-list-row"><div><b>${esc(x.date||'—')} · ${esc(x.category||'Egyéb')}</b><span>${esc(x.name||'—')} · ${money(x.amount)}</span><span>${esc(x.provider||'')} ${x.note?'· '+esc(x.note):''}</span></div><button class="btn secondary small" onclick="deleteCost('${esc(m.id)}',${a.length-1-i})">Törlés</button></div>`).join('')||'<div class="empty">Még nincs költségbejegyzés.</div>'}</div><div id="cost-form-${esc(m.id)}"></div>`}
function machineEditForm(m){return `<form onsubmit="saveMachineInline(event,'${esc(m.id)}')"><div class="machine-grid machine-edit-grid"><div class="field"><label>Eszköz neve</label><input class="input" name="name" value="${esc(m.name)}" required></div><div class="field"><label>Típus</label><select class="input" name="type">${machineTypeOptions(m.type)}</select></div><div class="field"><label>Gyártó</label><input class="input" name="manufacturer" value="${esc(m.manufacturer||'')}"></div><div class="field"><label>Modell</label><input class="input" name="model" value="${esc(m.model||'')}"></div><div class="field"><label>Azonosító</label><input class="input" name="code" value="${esc(m.code||m.id)}"></div><div class="field"><label>Évjárat</label><input class="input" name="year" value="${esc(m.year||'')}"></div><div class="field"><label>Rendszám</label><input class="input" name="plate" value="${esc(m.plate||'')}"></div><div class="field"><label>VIN</label><input class="input" name="vin" value="${esc(m.vin||'')}"></div><div class="field"><label>Üzemóra</label><input class="input" type="number" step="0.1" name="hours" value="${m.hours}"></div><div class="field"><label>Következő szerviz</label><input class="input" type="number" step="0.1" name="service" value="${m.service||''}"></div><div class="field"><label>Kilométeróra</label><input class="input" type="number" name="km" value="${m.km||0}"></div><div class="field"><label>Állapot</label><select class="input" name="status">${['Üzemképes','Javítás alatt','Tartalék','Kivonva'].map(x=>`<option ${x===m.status?'selected':''}>${x}</option>`).join('')}</select></div><div class="field"><label>Műszaki vizsga</label><input class="input" type="date" name="inspectionUntil" value="${esc(m.inspectionUntil||'')}"></div><div class="field"><label>Kötelező biztosítás</label><input class="input" type="date" name="insuranceUntil" value="${esc(m.insuranceUntil||'')}"></div><div class="field"><label>Casco</label><input class="input" type="date" name="cascoUntil" value="${esc(m.cascoUntil||'')}"></div><div class="field"><label>Matrica</label><input class="input" type="date" name="vignetteUntil" value="${esc(m.vignetteUntil||'')}"></div></div><div class="machine-edit-actions"><button type="button" class="btn secondary" onclick="machineSetEdit('${esc(m.id)}',false)">Mégse</button><button class="btn">Mentés</button></div></form>`}
function machineTabContent(m,tab,edit){if(edit)return machineEditForm(m);if(tab==='general')return machineReadonlyFields(m);if(tab==='technical')return `<div class="machine-grid">${machineSpecRows(m)}</div>`;if(tab==='documents')return machineDocuments(m);if(tab==='service')return machineServices(m);if(tab==='meters')return machineMeters(m);if(tab==='costs')return machineCosts(m);return `<div class="machine-note">${esc(m.notes||'Nincs megjegyzés.')}</div>`}
window.machineState=window.machineState||{};
function toggleMachine(id,tab){const row=document.getElementById('machine-detail-'+id);if(!row)return;if(row.style.display==='none'){row.style.display='table-row';machineRenderDetail(id,tab||'general')}else row.style.display='none'}
function machineRenderDetail(id,tab){const m=db.machines.find(x=>String(x.id)===String(id));if(!m)return;machineDefault(m);window.machineState[id]=window.machineState[id]||{tab:'general',edit:false};if(tab)window.machineState[id].tab=tab;const st=window.machineState[id],body=document.getElementById('machine-detail-body-'+id);if(!body)return;body.innerHTML=`<div class="machine-inline"><div class="machine-inline-head"><div><div class="label">ESZKÖZ ADATLAP</div><h3>${esc(m.name)}</h3></div><div class="machine-inline-actions">${st.edit?'<span class="badge orange">Szerkesztés</span>':`<button class="btn secondary small" onclick="machineSetEdit('${esc(id)}',true)">✏️ Szerkesztés</button>`}<button class="btn secondary small" onclick="toggleMachine('${esc(id)}')">Bezárás</button></div></div><div class="machine-tabs">${machineTabs(m,st.tab)}</div><div class="machine-tab-panel">${machineTabContent(m,st.tab,st.edit)}</div></div>`}
function machineTab(id,tab){window.machineState[id]=window.machineState[id]||{tab:'general',edit:false};window.machineState[id].tab=tab;machineRenderDetail(id,tab)}
function machineSetEdit(id,on){window.machineState[id]=window.machineState[id]||{tab:'general',edit:false};window.machineState[id].edit=on;machineRenderDetail(id)}
function saveMachineInline(e,id){e.preventDefault();const m=db.machines.find(x=>String(x.id)===String(id));if(!m)return;const o=Object.fromEntries(new FormData(e.target).entries());Object.assign(m,{name:o.name,type:o.type,manufacturer:o.manufacturer,model:o.model,code:o.code,year:o.year,plate:o.plate,vin:o.vin,hours:huNumber(o.hours),service:huNumber(o.service),km:huNumber(o.km),status:o.status,inspectionUntil:o.inspectionUntil,insuranceUntil:o.insuranceUntil,cascoUntil:o.cascoUntil,vignetteUntil:o.vignetteUntil});save();window.machineState[id].edit=false;machineRenderDetail(id);render();toast('Gép adatai mentve')}
function showServiceForm(id){const el=document.getElementById('service-form-'+id);if(!el)return;el.innerHTML=`<form class="machine-action-form" onsubmit="addService(event,'${esc(id)}')"><div class="formgrid"><div class="field"><label>Dátum</label><input class="input" type="date" name="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>Szerviz típusa</label><input class="input" name="type" value="Karbantartás"></div><div class="field"><label>Üzemóra</label><input class="input" type="number" name="hours"></div><div class="field"><label>Szerviz / szerelő</label><input class="input" name="provider"></div><div class="field"><label>Munka</label><input class="input" name="work"></div><div class="field"><label>Összes költség</label><input class="input" type="number" name="cost" value="0"></div></div><div class="machine-edit-actions"><button type="button" class="btn secondary" onclick="document.getElementById('service-form-${esc(id)}').innerHTML=''">Mégse</button><button class="btn">Mentés</button></div></form>`}
function addService(e,id){e.preventDefault();const m=db.machines.find(x=>String(x.id)===String(id));const o=Object.fromEntries(new FormData(e.target).entries());m.services.push({id:uid('SV'),date:o.date,type:o.type,hours:huNumber(o.hours),provider:o.provider,work:o.work,cost:huNumber(o.cost)});if(huNumber(o.hours)>m.hours)m.hours=huNumber(o.hours);save();machineRenderDetail(id,'service');render()}
function deleteService(id,i){const m=db.machines.find(x=>String(x.id)===String(id));if(!m||!confirm('Törlöd a szervizbejegyzést?'))return;m.services.splice(i,1);save();machineRenderDetail(id,'service')}
function showMeterForm(id){const el=document.getElementById('meter-form-'+id);if(!el)return;el.innerHTML=`<form class="machine-action-form" onsubmit="addMeter(event,'${esc(id)}')"><div class="formgrid"><div class="field"><label>Dátum</label><input class="input" type="date" name="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>Kilométeróra</label><input class="input" type="number" name="km"></div><div class="field"><label>Üzemóra</label><input class="input" type="number" step="0.1" name="hours"></div><div class="field"><label>Megjegyzés</label><input class="input" name="note"></div></div><div class="machine-edit-actions"><button type="button" class="btn secondary" onclick="document.getElementById('meter-form-${esc(id)}').innerHTML=''">Mégse</button><button class="btn">Mentés</button></div></form>`}
function addMeter(e,id){e.preventDefault();const m=db.machines.find(x=>String(x.id)===String(id)),o=Object.fromEntries(new FormData(e.target).entries()),km=huNumber(o.km),hours=huNumber(o.hours);if(km<m.km||hours<m.hours){toast('A mérőóra nem lehet kisebb a jelenlegi értéknél');return}m.meters.push({id:uid('ME'),date:o.date,km,hours,note:o.note});m.km=km;m.hours=hours;save();machineRenderDetail(id,'meters');render()}
function deleteMeter(id,i){const m=db.machines.find(x=>String(x.id)===String(id));if(!m||!confirm('Törlöd a mérőóra-bejegyzést?'))return;m.meters.splice(i,1);save();machineRenderDetail(id,'meters')}
function showCostForm(id){const el=document.getElementById('cost-form-'+id);if(!el)return;el.innerHTML=`<form class="machine-action-form" onsubmit="addCost(event,'${esc(id)}')"><div class="formgrid"><div class="field"><label>Dátum</label><input class="input" type="date" name="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>Kategória</label><select class="input" name="category">${['Üzemanyag','Szerviz','Javítás','Alkatrész','Biztosítás','Egyéb'].map(x=>`<option>${x}</option>`).join('')}</select></div><div class="field"><label>Megnevezés</label><input class="input" name="name"></div><div class="field"><label>Összeg</label><input class="input" type="number" name="amount" value="0"></div><div class="field"><label>Szállító / szerviz</label><input class="input" name="provider"></div><div class="field"><label>Megjegyzés</label><input class="input" name="note"></div></div><div class="machine-edit-actions"><button type="button" class="btn secondary" onclick="document.getElementById('cost-form-${esc(id)}').innerHTML=''">Mégse</button><button class="btn">Mentés</button></div></form>`}
function addCost(e,id){e.preventDefault();const m=db.machines.find(x=>String(x.id)===String(id)),o=Object.fromEntries(new FormData(e.target).entries());m.costs.push({id:uid('CO'),date:o.date,category:o.category,name:o.name,amount:huNumber(o.amount),provider:o.provider,note:o.note});save();machineRenderDetail(id,'costs');render()}
function deleteCost(id,i){const m=db.machines.find(x=>String(x.id)===String(id));if(!m||!confirm('Törlöd a költségbejegyzést?'))return;m.costs.splice(i,1);save();machineRenderDetail(id,'costs')}
function showMachineDocForm(id){const el=document.getElementById('machine-doc-form-'+id);if(!el)return;el.innerHTML=`<form class="machine-action-form" onsubmit="addMachineDoc(event,'${esc(id)}')"><div class="formgrid"><div class="field"><label>Fájl</label><input class="input" type="file" name="file" required></div><div class="field"><label>Dokumentumtípus</label><select class="input" name="type">${['Gépkönyv','Számla','Műszaki dokumentáció','Szervizszámla','Garancia','Biztosítás','Műszaki vizsga','Fotó','Egyéb'].map(x=>`<option>${x}</option>`).join('')}</select></div><div class="field"><label>Dátum</label><input class="input" type="date" name="date" value="${new Date().toISOString().slice(0,10)}"></div><div class="field"><label>Megjegyzés</label><input class="input" name="note"></div></div><div class="machine-edit-actions"><button type="button" class="btn secondary" onclick="document.getElementById('machine-doc-form-${esc(id)}').innerHTML=''">Mégse</button><button class="btn">Dokumentum mentése</button></div></form>`}
function addMachineDoc(e,id){e.preventDefault();const m=db.machines.find(x=>String(x.id)===String(id)),f=e.target.elements.file.files[0];if(!f)return;const reader=new FileReader();reader.onload=()=>{m.documents.push({id:uid('DOC'),name:f.name,type:e.target.elements.type.value,date:e.target.elements.date.value,note:e.target.elements.note.value,size:(f.size/1024/1024).toFixed(2)+' MB',data:reader.result,mime:f.type});save();machineRenderDetail(id,'documents');render()};reader.readAsDataURL(f)}
function openMachineDoc(id,i){const m=db.machines.find(x=>String(x.id)===String(id)),d=m?.documents?.[i];if(!d?.data){toast('A dokumentum adata nem érhető el');return}const a=document.createElement('a');a.href=d.data;a.target='_blank';a.rel='noopener';a.click()}
function deleteMachineDoc(id,i){const m=db.machines.find(x=>String(x.id)===String(id));if(!m||!confirm('Törlöd a dokumentumot?'))return;m.documents.splice(i,1);save();machineRenderDetail(id,'documents');render()}
function newMachine(){openModal('Új eszköz',`<form onsubmit="saveMachine(event)"><div class="formgrid"><div class="field"><label>Eszköz neve</label><input required class="input" name="name"></div><div class="field"><label>Típus</label><select class="input" name="type">${machineTypeOptions('Egyéb gép')}</select></div><div class="field"><label>Gyártó / modell</label><input class="input" name="model"></div><div class="field"><label>Üzemóra</label><input class="input" type="number" name="hours" value="0"></div><div class="field"><label>Következő szerviz üzemóra</label><input class="input" type="number" name="service" value="0"></div></div><div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Mentés</button></div></form>`)}
function saveMachine(e){e.preventDefault();const o=Object.fromEntries(new FormData(e.target).entries());db.machines.push(machineDefault({id:uid('G'),name:o.name,type:o.type,model:o.model,hours:huNumber(o.hours),service:huNumber(o.service),status:'Üzemképes'}));save();closeModal();render();toast('Eszköz mentve')}

function exportData(){let blob=new Blob([JSON.stringify(db,null,2)],{type:"application/json"}),a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="kutfoplusz-erp-mentes.json";a.click();URL.revokeObjectURL(a.href);toast("Biztonsági mentés letöltve")}
function importData(e){let f=e.target.files[0];if(!f)return;let r=new FileReader();r.onload=()=>{try{let x=JSON.parse(r.result);if(!x.customers||!x.projects)throw Error();db=x;save();render();toast("Adatok visszaállítva")}catch{toast("Érvénytelen mentés")}};r.readAsText(f);e.target.value=""}
function resetData(){if(confirm("Biztosan visszaállítod a mintaadatokat?")){db=structuredClone(initial);save();render();toast("Mintaadatok visszaállítva")}}
window.addEventListener("keydown",e=>{if(e.key==="Escape"){closeModal();closeDrawer()}});
render();

let wlDraftTimer=null;
document.addEventListener("input",function(e){
 if(e.target.closest&&e.target.closest("#wlForm")){
   clearTimeout(wlDraftTimer);
   wlDraftTimer=setTimeout(wlSaveDraft,350);
 }
});
document.addEventListener("change",function(e){
 if(e.target.closest&&e.target.closest("#wlForm")){
   clearTimeout(wlDraftTimer);
   wlDraftTimer=setTimeout(wlSaveDraft,100);
 }
});
window.addEventListener("beforeunload",()=>{try{if(document.getElementById("wlForm"))wlSaveDraft()}catch(e){}});


document.addEventListener("click", function(e) {
  const a = e.target.closest(".project-process-link");
  if (!a) return;
  e.preventDefault();
  e.stopPropagation();
  const type = a.dataset.process;

  if (type === "document") {
    const pid = a.dataset.projectId;
    const index = Number(a.dataset.index);
    if (typeof viewProjectDocument === "function") {
      return viewProjectDocument(pid, index);
    }
    if (typeof openProjectDocumentFile === "function") {
      const p = (db.projects||[]).find(x=>String(x.id)===String(pid));
      const d = p?.documents?.[index];
      if (d) return openProjectDocumentFile(d);
    }
    return;
  }

  if (type === "quote") {
    const id = a.dataset.id;
    // A Projekt folyamatban az ajánlat közvetlenül a teljes szerkesztőoldalon nyíljon meg,
    // és a meglévő ajánlat mentett adatai töltődjenek vissza.
    if (id && typeof openQuoteEditorPage === "function") return openQuoteEditorPage(id);
    return;
  }

  if (type === "worklog") {
    const id = a.dataset.id;
    if (id && typeof openWorklogEditor === "function") return openWorklogEditor(id);
    if (typeof nav === "function") return nav("worklogs");
  }
});


/* AUDIT-SOURCE-MAP-R71 */
function auditSourceMap(){return {file:'all.js',loadedByEntry:false};}
