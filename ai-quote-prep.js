/* Kútfő Plusz ERP – AI ajánlat-előkészítő
   V1: jóváhagyott dokumentumból és munkából ajánlati tételtervezet.
   Árakat nem talál ki: az egységárakat a felhasználó ellenőrzi és tölti ki.
*/
(function(){
  const escQ=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const num=v=>Number(String(v??'').replace(',','.'))||0;
  const moneyQ=v=>new Intl.NumberFormat('hu-HU',{maximumFractionDigits:0}).format(num(v))+' Ft';

  function projectForDoc(d){return (db.projects||[]).find(p=>p.id===d.projectId)||(db.projects||[]).find(p=>p.notes&&p.notes.includes('Dokumentum: '+d.id));}

  function makeItems(d,p){
    const x=d.extracted||{},t=p&&p.technical||{};const depth=num(p?.plannedDepth||x.plannedDepth),count=Math.max(1,num(p?.wellCount||x.wellCount));const items=[];
    if(depth)items.push({description:`Kútfúrás – ${depth} m tervezett mélység`,qty:depth,unit:'fm',unitPrice:0});
    if(t.guidePipe||x.guidePipe)items.push({description:`Iránycső kialakítása – ${t.guidePipe||x.guidePipe}`,qty:1,unit:'db',unitPrice:0});
    if(t.casing||x.casing)items.push({description:`Béléscsövezés – ${t.casing||x.casing}`,qty:depth||1,unit:'fm',unitPrice:0});
    if(t.filter||x.filter)items.push({description:`Szűrőszakasz kialakítása – ${t.filter||x.filter}`,qty:1,unit:'db',unitPrice:0});
    if(t.annulus||x.annulus)items.push({description:'Gyűrűstér tömedékelés / cementezés / szűrőkavics beépítése',qty:1,unit:'tétel',unitPrice:0});
    (d.tasks||[]).forEach(task=>{const s=String(task.text||'');if(/próbaszivattyúzás|vízhozam/i.test(s))items.push({description:'Próbaszivattyúzás és vízhozam-meghatározás',qty:1,unit:'tétel',unitPrice:0});else if(/geofizikai|visszatöltődés/i.test(s))items.push({description:'Geofizikai mérés és visszatöltődés-mérés',qty:1,unit:'tétel',unitPrice:0});else if(/vízminőségi|vízkémiai/i.test(s))items.push({description:'Vízminőségi / vízkémiai vizsgálat',qty:1,unit:'tétel',unitPrice:0});else if(/geodéziai|megvalósulási/i.test(s))items.push({description:'Geodéziai bemérés és megvalósulási dokumentáció',qty:1,unit:'tétel',unitPrice:0});else if(/üzemeltetési vízjogi/i.test(s))items.push({description:'Üzemeltetési vízjogi engedély dokumentációjának előkészítése',qty:1,unit:'tétel',unitPrice:0});});
    if(!items.length)items.push({description:`${p?.workCategory||x.workCategory||p?.workType||x.workType||'Műszaki munka'} – ajánlati tétel`,qty:count,unit:'db',unitPrice:0});
    const seen=new Set();return items.filter(i=>{const k=i.description.toLowerCase();if(seen.has(k))return false;seen.add(k);return true;});
  }

  function openPrep(docId){
    const d=(db.inboxDocuments||[]).find(x=>x.id===docId);if(!d)return;const p=projectForDoc(d),c=(db.customers||[]).find(x=>x.id===d.customerId||x.id===p?.customerId);if(!p){toast('Előbb jóvá kell hagyni a dokumentumot.');return;}
    const items=makeItems(d,p);
    openModal('AI ajánlat-előkészítés',`<div><div class="notice" style="margin-bottom:14px"><b>${escQ(c?.name||d.extracted?.customerName||'Ügyfél')}</b><br>${escQ(p.name||'Munka')} · ${escQ(p.location||d.extracted?.location||'')} ${p.parcel?'· hrsz. '+escQ(p.parcel):''}<br><span class="label">Az AI csak a műszaki tartalmat állítja össze. Árat nem talál ki.</span></div><div class="panel" style="box-shadow:none;padding:0;border:0"><div class="panelhead"><h2>Javasolt ajánlati tételek</h2><button class="btn secondary small" type="button" onclick="window.kpAddQuotePrepItem()">+ Tétel</button></div><div id="kpQuoteItems">${items.map(i=>`<div class="item" data-qitem style="grid-template-columns:2fr .7fr .7fr .9fr auto;margin-bottom:8px"><input class="input desc" value="${escQ(i.description)}"><input class="input" type="number" step="0.01" value="${i.qty}"><input class="input" value="${escQ(i.unit)}"><input class="input" type="number" step="1" value="${i.unitPrice}" placeholder="Egységár"><button type="button" class="btn danger small" onclick="this.closest('[data-qitem]').remove();window.kpQuotePrepTotal()">×</button></div>`).join('')}</div><div style="display:flex;justify-content:flex-end;gap:14px;padding:12px 0;border-top:1px solid var(--line);font-weight:800">Nettó előzetes összeg: <span id="kpQuoteTotal">0 Ft</span></div><div class="modalfoot"><button type="button" class="btn secondary" onclick="closeModal()">Mégse</button><button type="button" class="btn" onclick="window.kpSaveQuotePrep('${escQ(docId)}')">Ajánlat-előkészítés mentése</button></div></div></div>`);
    setTimeout(()=>window.kpQuotePrepTotal(),0);
  }

  window.kpQuotePrepTotal=function(){const box=document.getElementById('kpQuoteItems');if(!box)return 0;let total=0;box.querySelectorAll('[data-qitem]').forEach(r=>{const a=r.querySelectorAll('input');total+=num(a[1]?.value)*num(a[3]?.value)});const el=document.getElementById('kpQuoteTotal');if(el)el.textContent=moneyQ(total);return total;};
  window.kpAddQuotePrepItem=function(){const box=document.getElementById('kpQuoteItems');if(!box)return;const r=document.createElement('div');r.className='item';r.dataset.qitem='';r.style.cssText='grid-template-columns:2fr .7fr .7fr .9fr auto;margin-bottom:8px';r.innerHTML='<input class="input desc" placeholder="Ajánlati tétel"><input class="input" type="number" step="0.01" value="1"><input class="input" value="db"><input class="input" type="number" step="1" value="0" placeholder="Egységár"><button type="button" class="btn danger small" onclick="this.closest(\'[data-qitem]\').remove();window.kpQuotePrepTotal()">×</button>';box.appendChild(r);};

  window.kpSaveQuotePrep=function(docId){
    const d=(db.inboxDocuments||[]).find(x=>x.id===docId);if(!d)return;const p=projectForDoc(d),c=(db.customers||[]).find(x=>x.id===d.customerId||x.id===p?.customerId),box=document.getElementById('kpQuoteItems');if(!box)return;const items=[];
    box.querySelectorAll('[data-qitem]').forEach(r=>{const a=r.querySelectorAll('input'),description=(a[0]?.value||'').trim();if(description)items.push({description,qty:num(a[1]?.value),unit:a[2]?.value||'db',unitPrice:num(a[3]?.value)});});
    if(!items.length){toast('Legalább egy ajánlati tétel szükséges.');return;}if(!Array.isArray(db.quoteDrafts))db.quoteDrafts=[];const total=items.reduce((s,i)=>s+i.qty*i.unitPrice,0);
    const draft={id:uid('QDR'),createdAt:new Date().toISOString(),status:'Előkészítve',customerId:c?.id||d.customerId||'',projectId:p?.id||d.projectId||'',documentId:d.id,customerName:c?.name||d.extracted?.customerName||'',workName:p?.name||'',items,net:total,source:'AI ajánlat-előkészítő'};db.quoteDrafts.push(draft);save();closeModal();toast('Ajánlat-előkészítés mentve: '+draft.id);
  };

  function patchInbox(){
    const original=window.kpOpenInboxDoc;if(typeof original!=='function'||original.__quotePrepPatched)return;const wrapped=function(id){original(id);setTimeout(()=>{const d=(db.inboxDocuments||[]).find(x=>x.id===id);if(!d||d.status!=='Jóváhagyva')return;const body=document.getElementById('mbody');if(!body)return;const foot=body.querySelector('.modalfoot');if(!foot||foot.querySelector('[data-quote-prep]'))return;const b=document.createElement('button');b.type='button';b.className='btn secondary';b.dataset.quotePrep='1';b.textContent='💰 Ajánlat előkészítése';b.onclick=()=>window.kpOpenQuotePrep(id);foot.insertBefore(b,foot.firstChild);},80)};wrapped.__quotePrepPatched=true;window.kpOpenInboxDoc=wrapped;
  }

  function patchInboxRows(){document.querySelectorAll('#content tbody tr').forEach(tr=>{const btn=tr.querySelector('button[onclick*="kpOpenInboxDoc"]');if(!btn||tr.querySelector('[data-row-quote-prep]'))return;const m=String(btn.getAttribute('onclick')).match(/kpOpenInboxDoc\('([^']+)'\)/);if(!m)return;if(!/Jóváhagyva/.test(tr.innerText))return;const b=document.createElement('button');b.type='button';b.className='btn secondary small';b.dataset.rowQuotePrep='1';b.textContent='💰 Ajánlat';b.onclick=()=>window.kpOpenQuotePrep(m[1]);btn.parentElement.appendChild(b);});}

  window.kpOpenQuotePrep=openPrep;const boot=()=>{patchInbox();patchInboxRows();};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>setTimeout(boot,200));else setTimeout(boot,200);const observer=new MutationObserver(()=>{patchInbox();patchInboxRows();});setTimeout(()=>observer.observe(document.body,{childList:true,subtree:true}),300);
})();
