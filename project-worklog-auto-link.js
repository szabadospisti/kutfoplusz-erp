/* Kútfő Plusz ERP – Projekt → Munkanapló kapcsolat.
   A natív newWorklogFor() és detailedWorklogEditor() működését NEM módosítjuk.
   A projektoldali gomb eredeti logikája már átadja a projekt ID-t és a natív
   preselect a munkanaplóban kiválasztja a projektet. */
(function(){
  'use strict';
  if(window.__KP_PROJECT_WORKLOG_AUTO_LINK_SAFE__) return;
  window.__KP_PROJECT_WORKLOG_AUTO_LINK_SAFE__=true;
})();
