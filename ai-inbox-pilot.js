/* Kútfő Plusz ERP – Beérkező dokumentumok + AI előfeldolgozás pilot
   V1: document inbox, review, extraction result, approval into customer/work model.
   The AI extraction adapter is intentionally separated so a server-side AI provider can be connected later.
*/
(function(){
  const PILOT_DOC={
    id:'DOC-2026-DOMBRAD-001',
    receivedAt:'2026-08-18',
    type:'Vízjogi létesítési engedély',
    status:'Feldolgozásra vár',
    source:'Dombrád 0414/52 hrsz. – mezőgazdasági célú kút',
    reference:'MVF/1532-11/2025',
    extracted:{
      customerType:'Magánszemély',
      customerName:'Komáromi István',
      customerAddress:'4400 Nyíregyháza, Levendula u. 81.',
      taxNumber:'66805940-1-35',
      workType:'Kútfúrás',
      workCategory:'Mezőgazdasági öntözőkút',
      location:'Dombrád',
      parcel:'0414/52',
      wellCount:1,
      plannedDepth:55,
      wellType:'Rétegvízkút',
      eovX:'324045',
      eovY:'864695',
      groundLevel:'97,0 mBf',
      guidePipe:'0–6 m, Ø324/312 mm acél, palástcementezve',
      casing:'0–55 m, Ø225/200 mm PVC',
      filter:'30–50 m, Ø225/200 mm PVC szűrő',
      annulus:'0–19 m cement; 19–22 m cement; 22–25 m bentonitos homok; 25 m–talpig szűrőkavics',
      annualWater:'2 000 m³/év',
      requestedFlow:'250 l/perc',
      dailyPeak:'33 m³/nap',
      use:'gazdasági célú öntözés',
      season:'idényjellegű',
      permitDeadline:'2027-09-30'
    },
    tasks:[
      {text:'Fúrás megkezdésének bejelentése legalább 8 munkanappal korábban',done:false},
      {text:'Furadékminta és rétegnapló vezetése rétegváltozásonként, legalább 5 méterenként',done:false},
      {text:'Minimum 72 órás próbaszivattyúzás és vízhozam-meghatározás',done:false},
      {text:'Geofizikai mérés és visszatöltődés-mérés',done:false},
      {text:'Vízminőségi / vízkémiai vizsgálatok',done:false},
      {text:'Geodéziai bemérés és megvalósulási dokumentáció',done:false},
      {text:'Üzemeltetési vízjogi engedély dokumentumcsomagjának előkészítése',done:false}
    ]
  };

  function ensureInbox(){
    if(!window.db) return;
    if(!Array.isArray(db.inboxDocuments)) db.inboxDocuments=[];
    if(!db.inboxDocuments.some(x=>x.id===PILOT_DOC.id)){
      db.inboxDocuments.push(JSON.parse(JSON.stringify(PILOT_DOC)));
      if(typeof localSaveOnly==='function') localSaveOnly();
      if(typeof save==='function') save();
    }
  }

  function addNav(){
    const nav=document.getElementById('nav');
    if(!nav || nav.querySelector('[data-page="inbox"]')) return;
    const b=document.createElement('button');
    b.className='nav'; b.dataset.page='inbox'; b.innerHTML='<i>📥</i>Beérkező dokumentumok';
    b.onclick=()=>openInbox();
    nav.appendChild(b);
  }

  function openInbox(){
    if(typeof current!=='undefined') current='inbox';
    if(typeof location!=='undefined') location.hash='#/inbox';
    document.querySelectorAll('.nav').forEach(x=>x.classList.toggle('active',x.dataset.page==='inbox'));
    document.getElementById('title').textContent='Beérkező dokumentumok';
    renderInbox();
  }

  function renderInbox(){
    const c=document.getElementById('content'); if(!c) return;
    ensureInbox();
    const docs=db.inboxDocuments||[];
    c.innerHTML=`<div class="panel">
      <div class="panelhead"><div><h2>📥 Beérkező dokumentumok</h2><div class="label">E-mailből, PDF-ből és más dokumentumból induló ügyfél- és munka-előkészítés</div></div><button class="btn" id="inboxAddBtn">+ Dokumentum</button></div>
      <div class="cards" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">
        <div class="card"><div class="label">Beérkezett</div><div class="value">${docs.length}</div></div>
        <div class="card"><div class="label">Feldolgozásra vár</div><div class="value">${docs.filter(x=>x.status==='Feldolgozásra vár').length}</div></div>
        <div class="card"><div class="label">Jóváhagyott</div><div class="value">${docs.filter(x=>x.status==='Jóváhagyva').length}</div></div>
      </div>
      <div class="tablewrap"><table class="table"><thead><tr><th>Dokumentum</th><th>Típus</th><th>Beérkezett</th><th>Állapot</th><th></th></tr></thead><tbody>
      ${docs.slice().reverse().map(d=>`<tr><td><b>${esc(d.source||d.id)}</b><br><span class="label">${esc(d.reference||'')}</span></td><td>${esc(d.type||'Egyéb')}</td><td>${esc(d.receivedAt||'')}</td><td><span class="badge ${d.status==='Jóváhagyva'?'green':d.status==='AI feldolgozva'?'blue':'amber'}">${esc(d.status||'Beérkezett')}</span></td><td><button class="btn secondary small" onclick="window.kpOpenInboxDoc('${esc(d.id)}')">Megnyitás</button></td></tr>`).join('')||'<tr><td colspan="5" class="empty">Nincs beérkezett dokumentum.</td></tr>'}
      </tbody></table></div>
      <div class="notice" style="margin-top:16px">Pilot mód: az AI által felismert adatok először ellenőrzési nézetben jelennek meg. Jóváhagyás után kerülnek az ügyfélhez és a munkához.</div>
    </div>`;
    document.getElementById('inboxAddBtn').onclick=()=>openUploadDialog();
  }

  function openUploadDialog(){
    openModal('Új beérkező dokumentum',`<form id="inboxForm" onsubmit="window.kpAddInbox(event)">
      <div class="formgrid"><div class="field full"><label>Dokumentum / e-mail tárgya</label><input class="input" name="source" required placeholder="Pl. Létesítési engedély – Dombrád 0414/52"></div>
      <div class="field"><label>Típus</label><select class="select" name="type"><option>Vízjogi létesítési engedély</option><option>Árajánlatkérés</option><option>E-mail</option><option>Egyéb dokumentum</option></select></div>
      <div class="field"><label>Beérkezés dátuma</label><input class="input" type="date" name="receivedAt" value="${new Date().toISOString().slice(0,10)}"></div>
      <div class="field full"><label>Megjegyzés</label><textarea class="textarea" name="notes" placeholder="Ideiglenes megjegyzés"></textarea></div></div>
      <div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button class="btn">Beérkezett dokumentum létrehozása</button></div></form>`);
  }

  function addInbox(e){
    e.preventDefault(); const o=Object.fromEntries(new FormData(e.target).entries());
    if(!Array.isArray(db.inboxDocuments)) db.inboxDocuments=[];
    db.inboxDocuments.push({id:uid('DOC'),...o,status:'Feldolgozásra vár',extracted:{},tasks:[]});
    save(); closeModal(); openInbox(); toast('Dokumentum a beérkezettek közé került');
  }

  function openDoc(id){
    const d=(db.inboxDocuments||[]).find(x=>x.id===id); if(!d)return;
    const x=d.extracted||{};
    openModal('Dokumentum feldolgozása – '+(d.id||''),`<div>
      <div class="notice" style="margin-bottom:15px"><b>${esc(d.type||'Dokumentum')}</b><br>${esc(d.source||'')}<br>Állapot: <b>${esc(d.status||'')}</b></div>
      <h3>1. AI feldolgozás</h3><p class="label">A pilot az engedélyből felismert mezőket ellenőrzésre kínálja fel. A mentés előtt minden adat módosítható.</p>
      <div class="formgrid">${field('Ügyféltípus','customerType',x.customerType)}${field('Ügyfél / név','customerName',x.customerName)}${field('Ügyfél cím','customerAddress',x.customerAddress)}${field('Adószám','taxNumber',x.taxNumber)}${field('Munka típusa','workType',x.workType)}${field('Munka kategória','workCategory',x.workCategory)}${field('Település','location',x.location)}${field('Helyrajzi szám','parcel',x.parcel)}${field('Kút darabszám','wellCount',x.wellCount)}${field('Tervezett mélység (m)','plannedDepth',x.plannedDepth)}${field('Kúttípus','wellType',x.wellType)}${field('EOV X','eovX',x.eovX)}${field('EOV Y','eovY',x.eovY)}${field('Terepszint','groundLevel',x.groundLevel)}${field('Iránycső','guidePipe',x.guidePipe)}${field('Béléscső','casing',x.casing)}${field('Szűrő','filter',x.filter)}${field('Éves vízmennyiség','annualWater',x.annualWater)}${field('Vízhozam','requestedFlow',x.requestedFlow)}${field('Napi csúcs','dailyPeak',x.dailyPeak)}${field('Felhasználás','use',x.use)}${field('Üzemelés','season',x.season)}${field('Engedély határideje','permitDeadline',x.permitDeadline)}<div class="field full"><label>Gyűrűstér / tömedékelés</label><textarea class="textarea" name="annulus">${esc(x.annulus||'')}</textarea></div></div>
      <div class="modalfoot"><button class="btn secondary" type="button" onclick="window.kpSaveExtraction('${esc(d.id)}')">Feldolgozott adatok mentése</button><button class="btn" type="button" onclick="window.kpApproveDocument('${esc(d.id)}')">✓ Jóváhagyom és létrehozom az ügyfelet/munkát</button></div>
      <hr><h3>2. Automatikus feladatok</h3><div id="inboxTasks">${(d.tasks||[]).map((t,i)=>`<label style="display:block;padding:8px 0"><input type="checkbox" ${t.done?'checked':''} onchange="window.kpToggleTask('${esc(d.id)}',${i},this.checked)"> ${esc(t.text)}</label>`).join('')||'<span class="label">Nincs feladat.</span>'}</div>
    </div>`);
  }

  function field(label,name,value){return `<div class="field"><label>${esc(label)}</label><input class="input" name="${esc(name)}" value="${esc(value??'')}"></div>`}

  function saveExtraction(id){
    const d=(db.inboxDocuments||[]).find(x=>x.id===id);if(!d)return;
    const modal=document.getElementById('mbody');const inputs=modal.querySelectorAll('[name]');const out=Object.assign({},d.extracted||{});
    inputs.forEach(el=>{if(el.name!=='annulus')out[el.name]=el.value});const ann=modal.querySelector('[name="annulus"]');if(ann)out.annulus=ann.value;
    d.extracted=out;d.status='AI feldolgozva';save();closeModal();openInbox();toast('AI adatok mentve ellenőrzésre');
  }

  function approveDocument(id){
    const d=(db.inboxDocuments||[]).find(x=>x.id===id);if(!d)return;
    const modal=document.getElementById('mbody');const inputs=modal.querySelectorAll('[name]');const out=Object.assign({},d.extracted||{});
    inputs.forEach(el=>{if(el.name!=='annulus')out[el.name]=el.value});const ann=modal.querySelector('[name="annulus"]');if(ann)out.annulus=ann.value;
    d.extracted=out;
    let customer=(db.customers||[]).find(c=>String(c.name||'').trim().toLowerCase()===String(out.customerName||'').trim().toLowerCase());
    if(!customer){customer={id:uid('C'),name:out.customerName||'Új ügyfél',tax:out.taxNumber||'',contact:'',phone:'',email:'',address:out.customerAddress||'',notes:'AI által feldolgozott dokumentumból létrehozva',customerType:out.customerType||'Magánszemély',billingType:'Számlás'};db.customers.push(customer)}else{customer.tax=customer.tax||out.taxNumber||'';customer.address=customer.address||out.customerAddress||'';customer.customerType=customer.customerType||out.customerType||'';}
    if(!Array.isArray(db.workTypes))db.workTypes=[];
    const workName=`${out.location||''} – ${out.workCategory||out.workType||'Munka'}${out.parcel?' – hrsz. '+out.parcel:''}`.replace(/^ – | – $/g,'');
    const project={id:uid('KP'),customerId:customer.id,name:workName||'Új munka',location:out.location||'',status:'Tervezés',value:0,planned:0,cost:0,progress:0,notes:`Dokumentum: ${d.id}; Engedély: ${d.reference||''}`,workType:out.workType||'Egyéb műszaki munka',workCategory:out.workCategory||'',parcel:out.parcel||'',wellCount:Number(out.wellCount)||0,plannedDepth:Number(out.plannedDepth)||0,wellType:out.wellType||'',eovX:out.eovX||'',eovY:out.eovY||'',groundLevel:out.groundLevel||'',technical:{guidePipe:out.guidePipe||'',casing:out.casing||'',filter:out.filter||'',annulus:out.annulus||'',annualWater:out.annualWater||'',requestedFlow:out.requestedFlow||'',dailyPeak:out.dailyPeak||''}};
    if(!db.projects.some(p=>p.notes&&p.notes.includes('Dokumentum: '+d.id)))db.projects.push(project);
    d.status='Jóváhagyva';d.approvedAt=new Date().toISOString();d.customerId=customer.id;d.projectId=project.id;
    save();closeModal();openInbox();toast('Dokumentum jóváhagyva – ügyfél és munka létrehozva');
  }

  function toggleTask(id,i,done){const d=(db.inboxDocuments||[]).find(x=>x.id===id);if(!d?.tasks?.[i])return;d.tasks[i].done=!!done;save()}

  function wire(){
    ensureInbox(); addNav();
    if(typeof window.titles==='object') window.titles.inbox='Beérkező dokumentumok';
    window.kpOpenInboxDoc=openDoc;window.kpAddInbox=addInbox;window.kpSaveExtraction=saveExtraction;window.kpApproveDocument=approveDocument;window.kpToggleTask=toggleTask;window.openInbox=openInbox;
    const oldNav=window.nav;
    if(typeof oldNav==='function' && !oldNav.__kpInbox){
      const n=function(p){if(p==='inbox'){openInbox();return}return oldNav(p)};n.__kpInbox=true;window.nav=n;
    }
    const oldRender=window.render;
    if(typeof oldRender==='function' && !oldRender.__kpInbox){
      const r=function(){if((location.hash||'').replace(/^#\//,'')==='inbox'){openInbox();return}return oldRender()};r.__kpInbox=true;window.render=r;
    }
  }

  window.addEventListener('hashchange',()=>{if((location.hash||'').replace(/^#\//,'')==='inbox')openInbox()});
  setTimeout(wire,800);
})();
