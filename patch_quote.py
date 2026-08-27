from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
old='''function quoteCustomerChanged(){
 const id=document.getElementById("q_customer").value,c=(db.customers||[]).find(x=>x.id===id);if(!c)return;
 ["name","address","tax","phone","email"].forEach(k=>{const el=document.getElementById("q_client_"+k);if(el)el.value=c[k]||""});
}
'''
new='''function quoteCustomerChanged(){
 const ce=document.getElementById("q_customer");
 const id=ce?.value||"";
 const c=(db.customers||[]).find(x=>String(x.id)===String(id));
 if(!c)return;
 ["name","address","tax","phone","email"].forEach(k=>{const el=document.getElementById("q_client_"+k);if(el)el.value=c[k]||""});
 const pe=document.getElementById("q_project");
 if(pe){
   const selected=String(pe.value||"");
   const projects=(db.projects||[]).filter(p=>String(p.customerId||"")===String(id));
   pe.innerHTML='<option value="">— Válassz projektet —</option>'+projects.map(p=>`<option value="${esc(p.id)}">${esc(p.id)} – ${esc(p.name)}</option>`).join("");
   pe.value=projects.some(p=>String(p.id)===selected)?selected:"";
   pe.disabled=false;
 }
}
'''
old2='''function quoteProjectChanged(){
 const id=document.getElementById("q_project")?.value,p=(db.projects||[]).find(x=>x.id===id);if(!p)return;
 if(p.customerId){const ce=document.getElementById("q_customer");if(ce)ce.value=p.customerId;quoteCustomerChanged()}
'''
new2='''function quoteProjectChanged(){
 const pe=document.getElementById("q_project");
 const id=pe?.value||"";
 const p=(db.projects||[]).find(x=>String(x.id)===String(id));
 if(!p){
   if(pe)pe.value="";
   recalculateQuoteMainItem(false);
   renderQuoteEditor();
   return;
 }
 const ce=document.getElementById("q_customer");
 const selectedCustomerId=ce?.value||"";
 if(selectedCustomerId && String(p.customerId||"")!==String(selectedCustomerId)){
   if(pe)pe.value="";
   toast("Ez a projekt nem tartozik a kiválasztott ügyfélhez.");
   recalculateQuoteMainItem(false);
   renderQuoteEditor();
   return;
 }
 if(p.customerId && !selectedCustomerId){
   if(ce)ce.value=p.customerId;
 }
 quoteCustomerChanged();
 if(pe)pe.value=id;
'''
old3=''' const meterRate=drillingPriceForDiameter(diameter);
 if(!Array.isArray(quoteItems)) quoteItems=[];
'''
new3=''' const projectId=document.getElementById("q_project")?.value||"";
 const project=(db.projects||[]).find(x=>String(x.id)===String(projectId));
 const meterRate=quoteMeterRateForProject(diameter,project);
 if(!Array.isArray(quoteItems)) quoteItems=[];
'''
old4=''' const current=String(quoteItems[0].desc||"");
 const projectId=document.getElementById("q_project")?.value||"";
 const project=(db.projects||[]).find(x=>String(x.id)===String(projectId));
 const purpose='''
new4=''' const current=String(quoteItems[0].desc||"");
 const purpose='''
marker='''function saveQuoteFromTemplate(){
 const o=collectQuoteTemplate();db.quotes=db.quotes||[];'''
replacement='''function saveQuoteFromTemplate(){
 const customerId=String(document.getElementById("q_customer")?.value||"");
 const projectId=String(document.getElementById("q_project")?.value||"");
 const selectedProject=(db.projects||[]).find(x=>String(x.id)===projectId);
 if(!customerId || !projectId || !selectedProject || String(selectedProject.customerId||"")!==customerId){
   toast("Az ajánlat csak a kiválasztott ügyfél saját projektjéhez menthető.");
   return false;
 }
 const o=collectQuoteTemplate();db.quotes=db.quotes||[];'''
for a,b in [(old,new),(old2,new2),(old3,new3),(old4,new4),(marker,replacement)]:
    if a not in s:
        raise SystemExit('expected source block not found')
    s=s.replace(a,b,1)
p.write_text(s,encoding='utf-8')
print('quote patch applied')
