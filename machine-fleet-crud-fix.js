/* Géppark CRUD interaction bridge.
 * The main CRUD module owns the actual operations; this bridge only guarantees
 * that the visible buttons invoke those operations even if another ERP listener
 * interferes with delegated events.
 */
(function(){
  'use strict';
  function bind(){
    if(!window.__kpFleetCRUD || typeof window.newMachine!=='function') return false;
    document.querySelectorAll('#mf_new').forEach(function(b){
      if(b.__fleetBound)return;
      b.__fleetBound=true;
      b.onclick=function(e){e.preventDefault();e.stopPropagation();window.newMachine();};
    });
    document.querySelectorAll('[data-mf-profile]').forEach(function(b){
      if(b.__fleetBound)return;
      b.__fleetBound=true;
      b.onclick=function(e){e.preventDefault();e.stopPropagation();window.machineProfile(b.dataset.mfProfile);};
    });
    document.querySelectorAll('[data-mf-edit]').forEach(function(b){
      if(b.__fleetBound)return;
      b.__fleetBound=true;
      b.onclick=function(e){e.preventDefault();e.stopPropagation();window.editMachine(b.dataset.mfEdit);};
    });
    document.querySelectorAll('[data-mf-delete]').forEach(function(b){
      if(b.__fleetBound)return;
      b.__fleetBound=true;
      b.onclick=function(e){e.preventDefault();e.stopPropagation();window.deleteMachine(b.dataset.mfDelete);};
    });
    return true;
  }
  new MutationObserver(bind).observe(document.documentElement,{subtree:true,childList:true});
  var n=0,t=setInterval(function(){if(bind()||++n>120)clearInterval(t);},100);
  bind();
})();
