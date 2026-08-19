/* Kútfő Plusz ERP – stabil törlési hookok */
(function(){
  'use strict';
  function install(){
    if(typeof window.deleteCustomer!=='function') return setTimeout(install,100);
    window.deleteCustomer=async function(id){
      const customer=(window.db&&Array.isArray(db.customers))?db.customers.find(function(x){return String(x.id)===String(id);}):null;
      if(!customer)return;
      if(!confirm('Biztosan törlöd ezt az ügyfelet?\n\n'+(customer.name||customer.company_name||id)))return;
      try{
        if(window.KPCustomerSupabase) await window.KPCustomerSupabase.remove(customer.supabaseId||id);
        db.customers=db.customers.filter(function(x){return String(x.id)!==String(id);});
        if(typeof save==='function')await save();
        if(typeof nav==='function')nav('customers');
        if(typeof toast==='function')toast('Ügyfél törölve');
      }catch(err){console.error(err);if(typeof toast==='function')toast('Törlés sikertelen: '+(err.message||err));}
    };
  }
  install();
})();
