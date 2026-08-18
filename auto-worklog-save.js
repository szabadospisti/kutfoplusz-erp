/* Kútfő Plusz ERP – automatikus munkanapló mentés */
(function(){
  let timer = null;
  let saving = false;
  let queued = false;

  function status(text){
    try {
      if (typeof setCloudStatus === 'function') setCloudStatus(text);
      const form = document.getElementById('wlForm');
      if (form) {
        let el = document.getElementById('wlAutoSaveStatus');
        if (!el) {
          el = document.createElement('span');
          el.id = 'wlAutoSaveStatus';
          el.style.cssText = 'display:inline-flex;align-items:center;padding:7px 11px;border-radius:999px;background:#f0fdf4;color:#15803d;font-size:12px;font-weight:700;margin-left:8px;';
          const buttons = form.querySelector('.modalfoot');
          if (buttons) buttons.prepend(el);
        }
        el.textContent = text;
      }
    } catch(e) {}
  }

  function collectAndSave(){
    if (saving) { queued = true; return; }
    const form = document.getElementById('wlForm');
    if (!form || typeof wlCollect !== 'function') return;

    try {
      saving = true;
      if (typeof setCloudStatus === 'function') setCloudStatus('⏳ Mentés...');
      status('⏳ Automatikus mentés...');

      document.querySelectorAll('#wl_layers .wl-layer-type').forEach((el,i)=>{
        if (window.wlLayers && wlLayers[i]) wlLayers[i][2] = el.value;
      });

      let o = wlCollect();
      if (!o.id || o.id === 'undefined' || o.id === 'null') {
        if (typeof uid === 'function') o.id = uid('MN');
        if (typeof editingWorklogId !== 'undefined') editingWorklogId = o.id;
      }

      if (window.db && Array.isArray(db.worklogs)) {
        const i = db.worklogs.findIndex(x => String(x.id) === String(o.id));
        if (i >= 0) db.worklogs[i] = o;
        else db.worklogs.push(o);
      }

      if (typeof save === 'function') save();
      status('☁️ Automatikusan mentve');
      if (typeof setCloudStatus === 'function') setCloudStatus('☁️ Automatikusan mentve');
    } catch(e) {
      console.warn('Automatikus munkanapló-mentés:', e);
      status('⚠️ Helyi mentés');
    } finally {
      saving = false;
      if (queued) { queued = false; setTimeout(collectAndSave, 250); }
    }
  }

  function schedule(){
    clearTimeout(timer);
    status('✏️ Módosítás folyamatban...');
    timer = setTimeout(collectAndSave, 1200);
  }

  document.addEventListener('input', function(e){
    if (e.target.closest && e.target.closest('#wlForm')) schedule();
  }, true);
  document.addEventListener('change', function(e){
    if (e.target.closest && e.target.closest('#wlForm')) schedule();
  }, true);

  window.addEventListener('beforeunload', function(){
    try { clearTimeout(timer); collectAndSave(); } catch(e) {}
  });
})();
