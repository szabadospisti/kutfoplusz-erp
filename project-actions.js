/* Project actions module - loaded by index.html when available. */
(function(){
  'use strict';
  window.KPProjectActions = {
    version: '1.0.0',
    attach: function(root){
      root = root || document;
      return root;
    },
    edit: function(projectId){
      if (typeof window.editProject === 'function') return window.editProject(projectId);
      if (typeof window.openProjectEditor === 'function') return window.openProjectEditor(projectId);
      throw new Error('A projekt szerkesztő funkció még nincs összekötve az index.html projektmoduljával.');
    },
    remove: async function(projectId){
      if (!projectId) throw new Error('Hiányzó projektazonosító.');
      if (!confirm('Biztosan törlöd ezt a projektet?')) return false;
      if (typeof window.deleteProject === 'function') return window.deleteProject(projectId);
      throw new Error('A projekt törlő funkció még nincs összekötve az index.html projektmoduljával.');
    }
  };
})();
