/* Ügyfél + munka alapmodell – moduláris ERP bővítés */
(function(){
  const WORK_TYPES=[
    {v:'Kútfúrás',g:'💧',d:'Új kút, fúrás, csövezés, szűrőzés, kútkiképzés'},
    {v:'Szivattyútechnika',g:'🔧',d:'Szivattyú beépítés, kiépítés, csere, vezérlés, hidrofor'},
    {v:'Kútjavítás / karbantartás',g:'🛠',d:'Kompresszorozás, tisztítás, mosatás, javítás'},
    {v:'Tervezés / engedélyezés',g:'📐',d:'Vízjogi engedély, terv, kútszelvény, geodézia'},
    {v:'Egyéb műszaki munka',g:'🚜',d:'Kiszállás, felmérés, kompresszoros vagy egyéb munka'}
  ];
  const workType=v=>WORK_TYPES.find(x=>x.v===v)||WORK_TYPES[4];
  const esc0=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  // Régi rekordok kompatibilitása.
  (db.customers||[]).forEach(c=>{
    if(!c.customerType)c.customerType=c.tax?'Cég':'Magánszemély';
    if(!c.billingMode)c.billingMode=c.tax?'Számlás':'Nem számlás';
    if(!c.taxMode)c.taxMode=c.tax?'27% ÁFA':'Nem számlás';
    if(!Array.isArray(c.contacts))c.contacts=[];
    if(!Array.isArray(c.properties))c.properties=[];
    if(!Array.isArray(c.documents))c.documents=[];
  });
  (db.projects||[]).forEach(p=>{if(!p.workType)p.workType='Kútfúrás';if(!p.billingMode){const c=db.customers.find(x=>x.id===p.customerId);p.billingMode=c?.billingMode||'Számlás';}});

  function typeOptions(selected){return WORK_TYPES.map(x=>`<option value="${esc0(x.v)}" ${selected===x.v?'selected':''}>${x.g} ${esc0(x.v)}</option>`).join('')}
  function customerOptions(selected){return '<option value="">— Nincs kiválasztva —</option>'+db.customers.map(c=>`<option value="${esc0(c.id)}" ${selected===c.id?'selected':''}>${esc0(c.name)}</option>`).join('')}
  function customerWorkCount(id){return db.projects.filter(p=>p.customerId===id).length}

  window.newCustomer=function(c){
    openModal(c?.id?'Ügyfél szerkesztése':'Új ügyfél',`<form onsubmit="saveCustomer(event,'${esc0(c?.id||'')}')">
      <div class="formgrid">
        <div class="field"><label>Ügyfél típusa</label><select class="select" name="customerType"><option ${c?.customerType==='Cég'?'selected':''}>Cég</option><option ${c?.customerType==='Egyéni vállalkozó'?'selected':''}>Egyéni vállalkozó</option><option ${c?.customerType==='Magánszemély'?'selected':''}>Magánszemély</option></select></div>
        <div class="field"><label>Számlázás</label><select class="select" name="billingMode"><option ${c?.billingMode==='Számlás'?'selected':''}>Számlás</option><option ${c?.billingMode==='Nem számlás'?'selected':''}>Nem számlás</option></select></div>
        <div class="field full"><label>Cégnév / név</label><input required class="input" name="name" value="${esc0(c?.name)}"></div>
        <div class="field"><label>Adószám</label><input class="input" name="tax" value="${esc0(c?.tax)}"></div>
        <div class="field"><label>Cégjegyzékszám / nyilv. szám</label><input class="input" name="companyNo" value="${esc0(c?.companyNo)}"></div>
        <div class="field"><label>Adózási mód</label><select class="select" name="taxMode"><option>27% ÁFA</option><option>Fordított adózás</option><option>Alanyi adómentes</option><option>Nem számlás</option><option>Egyéb</option></select></div>
        <div class="field"><label>Kapcsolattartó</label><input class="input" name="contact" value="${esc0(c?.contact)}"></div>
        <div class="field"><label>Telefon</label><input class="input" name="phone" value="${esc0(c?.phone)}"></div>
        <div class="field"><label>E-mail</label><input class="input" name="email" type="email" value="${esc0(c?.email)}"></div>
        <div class="field full"><label>Székhely / lakcím</label><input class="input" name="address" value="${esc0(c?.address)}"></div>
        <div class="field full"><label>Számlázási adatok / megjegyzés</label><textarea class="textarea" name="billingNotes">${esc0(c?.billingNotes||'')}</textarea></div>
        <div class="field full"><label>Általános megjegyzés</label><textarea class="textarea" name="notes">${esc0(c?.notes)}</textarea></div>
      </div>
      <div class="modalfoot">${c?.id?`<button type="button" class="btn danger" onclick="deleteCustomer('${esc0(c.id)}')">Törlés</button>`:''}<span style="flex:1"></span><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Mentés</button></div>
    </form>`);
  };

  window.saveCustomer=function(e,id){
    e.preventDefault();const o=Object.fromEntries(new FormData(e.target).entries());
    const c=db.customers.find(x=>x.id===id);
    if(c)Object.assign(c,o);else db.customers.push({id:uid('C'),status:'Aktív',contacts:[],properties:[],documents:[],...o});
    save();closeModal();render();toast('Ügyfél mentve');
  };
  window.editCustomer=id=>window.newCustomer(db.customers.find(x=>x.id===id));

  window.customerDetails=function(id){
    const c=db.customers.find(x=>x.id===id);if(!c)return;
    const ps=db.projects.filter(p=>p.customerId===id),qs=db.quotes.filter(q=>q.customerId===id);
    const types={};ps.forEach(p=>types[p.workType||'Kútfúrás']=(types[p.workType||'Kútfúrás']||0)+1);
    openDrawer(c.name,`<div class="panel" style="box-shadow:none;margin-bottom:12px"><div class="panelhead"><div><span class="badge blue">${esc0(c.customerType||'Magánszemély')}</span> <span class="badge ${c.billingMode==='Nem számlás'?'amber':'green'}">${esc0(c.billingMode||'Számlás')}</span></div><button class="btn small" onclick="newCustomer(db.customers.find(x=>x.id==='${esc0(id)}'))">Szerkesztés</button></div>
      <div class="kpi"><span>Adózási mód</span><b>${esc0(c.taxMode||'—')}</b></div><div class="kpi"><span>Adószám</span><b>${esc0(c.tax||'—')}</b></div><div class="kpi"><span>Kapcsolattartó</span><b>${esc0(c.contact||'—')}</b></div><div class="kpi"><span>Telefon</span><b>${esc0(c.phone||'—')}</b></div><div class="kpi"><span>E-mail</span><b>${esc0(c.email||'—')}</b></div><div class="kpi"><span>Cím</span><b>${esc0(c.address||'—')}</b></div></div>
      <div class="panel" style="box-shadow:none;margin-bottom:12px"><div class="panelhead"><h2>Munkák / szolgáltatások (${ps.length})</h2><button class="btn small" onclick="openProjectForCustomer('${esc0(id)}')">+ Új munka</button></div>${ps.map(p=>{const wt=workType(p.workType);return `<div class="kpi"><span><b>${wt.g} ${esc0(p.name)}</b><br><small>${esc0(p.location||'')} · ${esc0(p.workType||'Kútfúrás')}</small></span><span class="badge ${p.status==='Folyamatban'?'green':'blue'}">${esc0(p.status||'Tervezés')}</span></div>`}).join('')||'<div class="empty">Még nincs munka.</div>'}<div class="label" style="margin-top:10px">Típusok: ${Object.entries(types).map(([k,v])=>`${esc0(k)} (${v})`).join(' · ')||'—'}</div></div>
      <div class="panel" style="box-shadow:none;margin-bottom:12px"><div class="panelhead"><h2>Árajánlatok (${qs.length})</h2><button class="btn small secondary" onclick="openQuoteForCustomer('${esc0(id)}')">+ Új ajánlat</button></div>${qs.map(q=>`<div class="kpi"><a class="link" onclick="editQuote('${esc0(q.id)}')">${esc0(q.id)}</a><span>${money(q.gross)} · ${esc0(q.status||'Piszkozat')}</span></div>`).join('')||'<div class="empty">Nincs ajánlat.</div>'}</div>
      <div class="panel" style="box-shadow:none;margin-bottom:12px"><div class="panelhead"><h2>Ingatlanok / munkaterületek</h2></div>${(c.properties||[]).map((p,i)=>`<div class="kpi"><span>${esc0(p.name||('Ingatlan '+(i+1)))}</span><b>${esc0(p.location||'')} ${p.hrsz?'· hrsz. '+esc0(p.hrsz):''}</b></div>`).join('')||'<div class="empty">Még nincs rögzített ingatlan. Ezt a következő fejlesztési lépésben lehet részletesíteni.</div>'}</div>
      <div class="panel" style="box-shadow:none"><div class="panelhead"><h2>Dokumentumközpont</h2></div><div class="empty">Az ügyfélhez kapcsolható dokumentumstruktúra előkészítve. Következő lépés: ajánlatkérés, engedély, ajánlat, szerződés, munkanapló, kútdokumentáció és számla kezelése.</div></div>`);
  };

  window.openProject=function(customerId){
    openModal('Új munka / projekt',`<form onsubmit="saveProject(event)"><div class="formgrid">
      <div class="field full"><label>Munka típusa</label><select required class="select" name="workType">${typeOptions('Kútfúrás')}</select></div>
      <div class="field"><label>Ügyfél</label><select required class="select" name="customerId">${customerOptions(customerId||'')}</select></div>
      <div class="field"><label>Számlázás</label><select class="select" name="billingMode"><option>Számlás</option><option>Nem számlás</option></select></div>
      <div class="field"><label>Státusz</label><select class="select" name="status"><option>Tervezés</option><option>Folyamatban</option><option>Lezárva</option></select></div>
      <div class="field"><label>Munka neve</label><input required class="input" name="name" placeholder="pl. Szivattyú beépítés"></div>
      <div class="field"><label>Helyszín</label><input class="input" name="location"></div>
      <div class="field"><label>Szerződéses érték</label><input class="input" type="number" name="value" value="0"></div>
      <div class="field full"><label>Műszaki / munkaleírás</label><textarea class="textarea" name="notes" placeholder="Mit kell elvégezni? Milyen műszaki tartalommal?"></textarea></div>
      </div><div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Munka mentése</button></div></form>`);
  };
  window.saveProject=function(e){
    e.preventDefault();const o=Object.fromEntries(new FormData(e.target).entries());
    if(!o.billingMode){const c=db.customers.find(x=>x.id===o.customerId);o.billingMode=c?.billingMode||'Számlás'}
    db.projects.push({id:uid('KP'),...o,value:+o.value||0,planned:0,cost:0,progress:0});save();closeModal();nav('projects');toast('Munka létrehozva');
  };

  window.projectRows=function(arr=db.projects){return `<div class="tablewrap"><table class="table"><thead><tr><th>Munka</th><th>Típus</th><th>Ügyfél</th><th>Helyszín</th><th>Érték</th><th>Állapot</th></tr></thead><tbody>${arr.map(p=>{const wt=workType(p.workType);return `<tr><td><a class="link" onclick="projectDetails('${esc0(p.id)}')"><b>${esc0(p.id)}</b></a><br>${esc0(p.name)}</td><td>${wt.g} ${esc0(p.workType||'Kútfúrás')}</td><td>${esc0(cust(p.customerId))}</td><td>${esc0(p.location||'')}</td><td>${money(p.value)}</td><td><span class="badge ${p.status==='Folyamatban'?'green':'blue'}">${esc0(p.status||'Tervezés')}</span></td></tr>`}).join('')}</tbody></table></div>`};

  views.customers=()=>`<div class="panel"><div class="panelhead"><div><h2>Ügyfelek</h2><div class="label">Ügyféladatbázis – cégek, egyéni vállalkozók és magánszemélyek</div></div><button class="btn" onclick="newCustomer()">+ Új ügyfél</button></div>
    <div class="cards" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px"><div class="card"><div class="label">Összes ügyfél</div><div class="value">${db.customers.length}</div></div><div class="card"><div class="label">Cégek / EV</div><div class="value">${db.customers.filter(c=>c.customerType==='Cég'||c.customerType==='Egyéni vállalkozó').length}</div></div><div class="card"><div class="label">Magánszemély</div><div class="value">${db.customers.filter(c=>c.customerType==='Magánszemély').length}</div></div><div class="card"><div class="label">Nem számlás</div><div class="value">${db.customers.filter(c=>c.billingMode==='Nem számlás').length}</div></div></div>
    <div class="toolbar"><input id="cs" class="input search" placeholder="Keresés név, adószám, kapcsolattartó, telefon, e-mail vagy cím alapján..." oninput="searchCustomers()"></div>
    <div id="ct">${customerRows()}</div>
    <div class="panel" style="margin-top:18px;box-shadow:none;background:#f8fafc"><div class="panelhead"><h2>🛠 Ügyfél modul – fejlesztési feladatok</h2></div><div class="label">Csak az Ügyfél modulhoz tartozó feladatok.</div><div class="kpi"><span>☐ Több kapcsolattartó kezelése</span><span>☐ Több ingatlan / munkaterület</span></div><div class="kpi"><span>☐ Dokumentumközpont és dokumentumverziók</span><span>☐ Árajánlatkérés feldolgozás</span></div><div class="kpi"><span>☐ Létesítési engedély adatainak kiolvasása</span><span>☐ Ügyfél → ingatlan → munka kapcsolat</span></div><div class="kpi"><span>☐ Számlás / nem számlás automatizmus</span><span>☐ ÁFA / fordított adózás kezelése</span></div></div></div>`;

  views.projects=()=>`<div class="panel"><div class="panelhead"><div><h2>Munkák / projektek</h2><div class="label">Minden elvégzendő szolgáltatás külön munkaként kezelhető – nem csak kútfúrás.</div></div><button class="btn" onclick="openProject()">+ Új munka</button></div><div class="toolbar"><input id="ps" class="input search" placeholder="Keresés munka, ügyfél, helyszín vagy munkatípus alapján..." oninput="searchProjects()"></div><div id="pt">${projectRows()}</div></div>`;

  // A munkatípusból örökölt számlázási mód ajánlatkészítésnél is elérhető lesz.
  window.__KUTFO_WORK_TYPES=WORK_TYPES;
  try{localSaveOnly()}catch(e){}
  render();
})();
