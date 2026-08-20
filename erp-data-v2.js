/* Kútfő Plusz ERP – relációs Supabase adat API v2
 * Build nélkül, vanilla JS. Egy entitás = egy Supabase tábla + saját CRUD.
 * A fájl nem használ erp_state / JSON blob mentést.
 */
(function(global){
  'use strict';
  const TABLES = {
    customers:'customers', quotes:'quotes', quoteItems:'quote_items', projects:'projects',
    employees:'employees', machines:'machines', products:'products', warehouses:'warehouses',
    warehouseStock:'warehouse_stock', workLogs:'work_logs', workLogLayers:'work_log_layers',
    materialRequirements:'project_material_requirements', materialUsage:'project_material_usage',
    projectCosts:'project_costs', machineUsage:'machine_usage', machineService:'machine_service'
  };
  let client = null;
  function configure(supabaseClient){ client = supabaseClient; return api; }
  function requireClient(){ if(!client) throw new Error('A Supabase kliens nincs inicializálva.'); return client; }
  function table(name){ const t=TABLES[name]||name; return requireClient().from(t); }
  async function list(name, opts={}){
    let q=table(name).select(opts.select||'*');
    if(opts.eq) Object.entries(opts.eq).forEach(([k,v])=>q=q.eq(k,v));
    if(opts.order) q=q.order(opts.order.column,{ascending:opts.order.ascending!==false});
    if(opts.limit) q=q.limit(opts.limit);
    const {data,error}=await q; if(error) throw error; return data||[];
  }
  async function get(name,id){ const {data,error}=await table(name).select('*').eq('id',id).maybeSingle(); if(error)throw error; return data||null; }
  async function create(name,row){ const {data,error}=await table(name).insert(row).select().single(); if(error)throw error; return data; }
  async function update(name,id,row){ const {data,error}=await table(name).update(row).eq('id',id).select().single(); if(error)throw error; return data; }
  async function remove(name,id){ const {error}=await table(name).delete().eq('id',id); if(error)throw error; return true; }
  async function upsert(name,row,onConflict='id'){ const {data,error}=await table(name).upsert(row,{onConflict}).select(); if(error)throw error; return data; }

  const api={configure,table,list,get,create,update,remove,upsert,TABLES,
    customers:{list:o=>list('customers',o),get:id=>get('customers',id),create:r=>create('customers',r),update:(id,r)=>update('customers',id,r),remove:id=>remove('customers',id)},
    quotes:{list:o=>list('quotes',o),get:id=>get('quotes',id),create:r=>create('quotes',r),update:(id,r)=>update('quotes',id,r),remove:id=>remove('quotes',id)},
    quoteItems:{list:o=>list('quoteItems',o),create:r=>create('quoteItems',r),update:(id,r)=>update('quoteItems',id,r),remove:id=>remove('quoteItems',id)},
    projects:{list:o=>list('projects',o),get:id=>get('projects',id),create:r=>create('projects',r),update:(id,r)=>update('projects',id,r),remove:id=>remove('projects',id)},
    employees:{list:o=>list('employees',o),get:id=>get('employees',id),create:r=>create('employees',r),update:(id,r)=>update('employees',id,r),remove:id=>remove('employees',id)},
    machines:{list:o=>list('machines',o),get:id=>get('machines',id),create:r=>create('machines',r),update:(id,r)=>update('machines',id,r),remove:id=>remove('machines',id)},
    products:{list:o=>list('products',o),get:id=>get('products',id),create:r=>create('products',r),update:(id,r)=>update('products',id,r),remove:id=>remove('products',id)},
    warehouses:{list:o=>list('warehouses',o),get:id=>get('warehouses',id),create:r=>create('warehouses',r),update:(id,r)=>update('warehouses',id,r),remove:id=>remove('warehouses',id)},
    warehouseStock:{list:o=>list('warehouseStock',o),upsert:r=>upsert('warehouseStock',r,'warehouse_id,product_id'),remove:(warehouseId,productId)=>table('warehouseStock').delete().eq('warehouse_id',warehouseId).eq('product_id',productId)},
    workLogs:{list:o=>list('workLogs',o),get:id=>get('workLogs',id),create:r=>create('workLogs',r),update:(id,r)=>update('workLogs',id,r),remove:id=>remove('workLogs',id)},
    workLogLayers:{list:o=>list('workLogLayers',o),create:r=>create('workLogLayers',r),update:(id,r)=>update('workLogLayers',id,r),remove:id=>remove('workLogLayers',id)},
    materialRequirements:{list:o=>list('materialRequirements',o),create:r=>create('materialRequirements',r),update:(id,r)=>update('materialRequirements',id,r),remove:id=>remove('materialRequirements',id)},
    materialUsage:{list:o=>list('materialUsage',o),create:r=>create('materialUsage',r),update:(id,r)=>update('materialUsage',id,r),remove:id=>remove('materialUsage',id)},
    projectCosts:{list:o=>list('projectCosts',o),create:r=>create('projectCosts',r),update:(id,r)=>update('projectCosts',id,r),remove:id=>remove('projectCosts',id)},
    machineUsage:{list:o=>list('machineUsage',o),create:r=>create('machineUsage',r),update:(id,r)=>update('machineUsage',id,r),remove:id=>remove('machineUsage',id)},
    machineService:{list:o=>list('machineService',o),create:r=>create('machineService',r),update:(id,r)=>update('machineService',id,r),remove:id=>remove('machineService',id)}
  };
  global.KPData = api;
})(window);
