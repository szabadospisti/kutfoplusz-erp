/* Supabase-backed project CRUD helper. The UI should call these hooks before updating local state. */
(function(){
  'use strict';
  window.KPSupabaseProjectCRUD = {
    async save(project, supabase){
      if (!supabase) throw new Error('Supabase kapcsolat hiányzik.');
      const row = {...project};
      delete row.id;
      if (project.id) {
        const { data, error } = await supabase.from('projects').update(row).eq('id', project.id).select().single();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase.from('projects').insert(row).select().single();
      if (error) throw error;
      return data;
    },
    async remove(projectId, supabase){
      if (!projectId) throw new Error('Hiányzó projektazonosító.');
      if (!confirm('Biztosan törlöd ezt a projektet?')) return false;
      const { count, error: checkError } = await supabase.from('work_logs').select('id', {count:'exact', head:true}).eq('project_id', projectId);
      if (checkError) throw checkError;
      if ((count || 0) > 0) throw new Error('A projekthez munkanapló tartozik, ezért nem törölhető.');
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;
      return true;
    }
  };
})();
