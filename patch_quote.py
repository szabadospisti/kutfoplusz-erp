from pathlib import Path
p=Path('index.html')
s=p.read_text(encoding='utf-8')
changes=[]

def replace_once(old,new,label):
    global s
    if old in s:
        s=s.replace(old,new,1); changes.append(label); return
    print(label+': already applied or source differs')

replace_once('''function quoteCustomerChanged(){
 const id=document.getElementById("q_customer").value,c=(db.customers||[]).find(x=>x.id===id);if(!c)return;
 ["name","address","tax","phone","email"].forEach(k=>{const el=document.getElementById("q_client_"+k);if(el)el.value=c[k]||"");
}
''','''function quoteCustomerChanged(){
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
''','customer filter')

replace_once('''function quoteProjectChanged(){
 const id=document.getElementById("q_project")?.value,p=(db.projects||[]).find(x=>x.id===id);if(!p)return;
 if(p.customerId){const ce=document.getElementById("q_customer");if(ce)ce.value=p.customerId;quoteCustomerChanged()}
''','''function quoteProjectChanged(){
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
''','project/customer invariant')

replace_once(''' const meterRate=drillingPriceForDiameter(diameter);
 if(!Array.isArray(quoteItems)) quoteItems=[];
''',''' const projectId=document.getElementById("q_project")?.value||"";
 const project=(db.projects||[]).find(x=>String(x.id)===String(projectId));
 const meterRate=quoteMeterRateForProject(diameter,project);
 if(!Array.isArray(quoteItems)) quoteItems=[];
''','project-aware price')

replace_once(''' const current=String(quoteItems[0].desc||"");
 const projectId=document.getElementById("q_project")?.value||"";
 const project=(db.projects||[]).find(x=>String(x.id)===String(projectId));
 const purpose='''',''' const current=String(quoteItems[0].desc||"");
 const purpose='''','duplicate project declaration removal')

replace_once('''function saveQuoteFromTemplate(){
 const o=collectQuoteTemplate();db.quotes=db.quotes||[];''','''function saveQuoteFromTemplate(){
 const customerId=String(document.getElementById("q_customer")?.value||"");
 const projectId=String(document.getElementById("q_project")?.value||"");
 const selectedProject=(db.projects||[]).find(x=>String(x.id)===projectId);
 if(!customerId || !projectId || !selectedProject || String(selectedProject.customerId||"")!==customerId){
   toast("Az ajánlat csak a kiválasztott ügyfél saját projektjéhez menthető.");
   return false;
 }
 const o=collectQuoteTemplate();db.quotes=db.quotes||[];''','save invariant')

p.write_text(s,encoding='utf-8')
print('applied:',', '.join(changes) if changes else 'none')
