from pathlib import Path
import re
p=Path('index.html')
s=p.read_text(encoding='utf-8')

customer_new='''function quoteCustomerChanged(){
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
project_new='''function quoteProjectChanged(){
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
 if(p.customerId && !selectedCustomerId && ce) ce.value=p.customerId;
 quoteCustomerChanged();
 if(pe)pe.value=id;
'''

s,n1=re.subn(r'function quoteCustomerChanged\(\)\{.*?\n\}\n(?=function quoteMeterRateForProject)',customer_new,s,count=1,flags=re.S)
s,n2=re.subn(r'function quoteProjectChanged\(\)\{.*?\n(?= const w=p\.well\|\|\{)',project_new,s,count=1,flags=re.S)
# Current quote calculator must derive its rate from the selected project type.
s=s.replace(' const meterRate=drillingPriceForDiameter(diameter);\n',' const projectId=document.getElementById("q_project")?.value||"";\n const project=(db.projects||[]).find(x=>String(x.id)===String(projectId));\n const meterRate=quoteMeterRateForProject(diameter,project);\n',1)
# Remove the now-duplicate project lookup in the calculator if it exists.
s=s.replace(' const current=String(quoteItems[0].desc||"");\n const projectId=document.getElementById("q_project")?.value||"";\n const project=(db.projects||[]).find(x=>String(x.id)===String(projectId));\n const purpose=', ' const current=String(quoteItems[0].desc||"");\n const purpose=',1)
# Defense in depth at save time.
marker='function saveQuoteFromTemplate(){\n const o=collectQuoteTemplate();db.quotes=db.quotes||[];'
replacement='''function saveQuoteFromTemplate(){
 const customerId=String(document.getElementById("q_customer")?.value||"");
 const projectId=String(document.getElementById("q_project")?.value||"");
 const selectedProject=(db.projects||[]).find(x=>String(x.id)===projectId);
 if(!customerId || !projectId || !selectedProject || String(selectedProject.customerId||"")!==customerId){
   toast("Az ajánlat csak a kiválasztott ügyfél saját projektjéhez menthető.");
   return false;
 }
 const o=collectQuoteTemplate();db.quotes=db.quotes||[];'''
s=s.replace(marker,replacement,1)

if n1!=1 or n2!=1:
    raise SystemExit(f'quote functions not found: customer={n1}, project={n2}')
p.write_text(s,encoding='utf-8')
print(f'quote patch applied: customer={n1}, project={n2}')
