/* Géppark navigációs guard – a régi inline render ne futhasson le a CRUD előtt. */
(function(){
  'use strict';
  const isFleetNav=e=>{
    const n=e.target?.closest?.('.nav');
    if(!n)return false;
    const view=n.dataset?.view||n.dataset?.page||n.getAttribute('data-target')||'';
    const text=(n.textContent||'').trim().toLowerCase();
    return view==='machines'||view==='machine'||view==='geppark'||text.includes('géppark');
  };
  document.addEventListener('click',e=>{
    if(!isFleetNav(e))return;
    e.preventDefault();
    e.stopImmediatePropagation();
    window.current='machines';
    if(typeof window.render==='function')window.render();
  },true);
  if(window.current==='machines'){
    const r=document.getElementById('content')||document.querySelector('.content');
    if(r)r.innerHTML='';
  }
})();
