/* Kútfő Plusz ERP 2.0 – quote editor compatibility wrapper
 * DOCX export only. PDF/preview functionality intentionally removed.
 * This file name is retained only as a compatibility entry point because
 * the live index still references it. It prevents the legacy vector-preview
 * module from executing before the index can be cleaned safely.
 */
(function(){
  "use strict";
  /* The legacy vector preview is no longer part of the runtime. Remove its
     parser-visible script element before the browser reaches it. */
  document.querySelectorAll('script[src*="quote_preview_vectors.js"]').forEach(function(el){el.remove();});
  if(typeof window!="undefined" && window.__KUTFOPLUSZ_QUOTE_UI_FIX_LOADED) return;
  const p=document.createElement("script");
  p.src="quote_ui_fix.js?v=18";
  p.async=false;
  p.onload=function(){window.__KUTFOPLUSZ_QUOTE_UI_FIX_LOADED=true;};
  document.head.appendChild(p);
})();