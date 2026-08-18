/* Kútfő Plusz ERP – UI polish */
(function(){
  function polishInboxIcon(){
    const item=document.querySelector('#nav [data-page="inbox"]');
    if(!item)return;
    const icon=item.querySelector('i');
    if(icon)icon.textContent='📄';
  }
  polishInboxIcon();
  setTimeout(polishInboxIcon,100);
  setTimeout(polishInboxIcon,500);
})();
