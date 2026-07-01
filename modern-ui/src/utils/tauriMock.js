// TecnoRilievi / FreschiTech - Mock database in-memory e localStorage per Anteprima Web
// Sostituisce le chiamate Tauri a Rust quando l'app viene eseguita nel browser.

const MOCK_STORAGE_KEY = 'freschitech_mock_db';

// Dati iniziali pre-popolati per non mostrare l'app vuota al primo avvio
const INITIAL_DB = {
  clients: [
    { id: 1, type: 'condominium', name: 'Condominio Stella Marina', street: 'Via Bafile 120', city: 'Jesolo', zip_code: '30016', province: 'VE', vat_id: '12345678901', tax_code: '12345678901', email: 'info@stellamarina.it', pec: 'stellamarina@pec.it', phone: '0421 380000', notes: 'Custode presente la mattina', distance: 15 },
    { id: 2, type: 'private', name: 'Rossi Mario', street: 'Cannaregio 4560', city: 'Venezia', zip_code: '30121', province: 'VE', vat_id: '', tax_code: 'RSSMRA80A01L736U', email: 'mario.rossi@gmail.com', pec: '', phone: '335 1234567', notes: 'Richiede preavviso telefonico', distance: 25 }
  ],
  projects: [
    { id: 1, client_id: 1, name: 'Rifacimento Impianto Elettrico Scala A', description: 'Adeguamento e rifacimento impianto elettrico comune Scala A e luci emergenza', status: 'active', start_date: '2026-06-01', end_date: '2026-07-15', budget: 15000.0, distance: 15, km_cost: 0.50, address: 'Via Bafile 120, Jesolo' },
    { id: 2, client_id: 2, name: 'Installazione Climatizzatori Daikin', description: 'Fornitura e posa dual split Daikin in soggiorno e camera principale', status: 'active', start_date: '2026-06-10', end_date: '2026-06-25', budget: 4500.0, distance: 25, km_cost: 0.50, address: 'Cannaregio 4560, Venezia' }
  ],
  cost_centers: [
    { id: 1, project_id: 1, brand: 'Gewiss', model: 'Quadro Scala A', category: 'Quadri', base_cost: 850.0, markup: 0.20, shipping: 30.0, install_fee: 150.0, install_fee_percent: 0.06, accepted_budget: 1200.0 },
    { id: 2, project_id: 2, brand: 'Daikin', model: 'Dual Split Emura', category: 'Climatizzazione', base_cost: 1800.0, markup: 0.15, shipping: 50.0, install_fee: 300.0, install_fee_percent: 0.06, accepted_budget: 2500.0 }
  ],
  materials: [
    { id: 1, project_id: 1, cost_center_id: 1, phase: 'Inizio lavori', date: '2026-06-02', code: 'CAV-FG16-3G2.5', description: 'Cavo FG16OR16 3G2.5 mm² - Isolamento Butilico', supplier: 'MARCHIOL S.P.A.', quantity: 100, unit: 'm', unit_price: 1.72, markup: 0.25 },
    { id: 2, project_id: 1, cost_center_id: 1, phase: 'Inizio lavori', date: '2026-06-02', code: 'SCAT-PT6', description: 'Scatola derivazione PT6 c/cop', supplier: 'MARCHIOL S.P.A.', quantity: 10, unit: 'pz', unit_price: 3.90, markup: 0.25 }
  ],
  labor: [
    { id: 1, project_id: 1, cost_center_id: 1, phase: 'Cablaggio', date: '2026-06-03', operator: 'Mario Rossi', description: 'Posa cavi e installazione scatole', hours: 8, hourly_cost: 30.0, markup: 0.0, is_travel: 0, vehicle: '', travel_cost: 0.0 },
    { id: 2, project_id: 1, cost_center_id: 1, phase: 'Cablaggio', date: '2026-06-03', operator: 'Luca Bianchi', description: 'Trasferta Jesolo c/o cantiere Stella Marina', hours: 1, hourly_cost: 30.0, markup: 0.0, is_travel: 1, vehicle: 'Furgone Ducato', travel_cost: 15.0 }
  ],
  expenses: [
    { id: 1, project_id: 1, cost_center_id: 1, phase: 'Accessori', date: '2026-06-04', description: 'Parcheggio e pedaggio cantiere Jesolo', amount: 12.0, markup: 0.0, supplier: 'Autostrade' }
  ],
  employees: [
    { id: 1, name: 'Mario Rossi', default_hourly_cost: 35.0 },
    { id: 2, name: 'Luca Bianchi', default_hourly_cost: 30.0 },
    { id: 3, name: 'Giuseppe Verdi', default_hourly_cost: 28.0 }
  ],
  global_settings: {
    default_hourly_cost: '30.0',
    default_markup: '0.25',
    company_name: 'FreschiTech S.r.l.',
    company_address: 'Via dell\'Artigianato 15, Padova'
  },
  catalog_materials: [
    { id: 101, code: 'CAV-FG16-3G2.5', description: 'Cavo FG16OR16 3G2.5 mm² - Isolamento Butilico', unit: 'm', unit_price: 1.72, supplier: 'MARCHIOL S.P.A.', markup: 0.25 },
    { id: 102, code: 'SCAT-PT6', description: 'Scatola derivazione PT6 c/cop', unit: 'pz', unit_price: 3.90, supplier: 'MARCHIOL S.P.A.', markup: 0.20 },
    { id: 103, code: 'INT-BIPT16', description: 'Interruttore bipolare 16A', unit: 'pz', unit_price: 7.20, supplier: 'MARCHIOL S.P.A.', markup: 0.25 },
    { id: 104, code: 'TUB-RK15-20', description: 'Tubo corrugato RK15 d20', unit: 'm', unit_price: 0.38, supplier: 'MARCHIOL S.P.A.', markup: 0.15 }
  ],
  quotes: [],
  quote_items: []
};

// Funzione di lettura helper
function loadDB() {
  const data = localStorage.getItem(MOCK_STORAGE_KEY);
  if (!data) {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(INITIAL_DB));
    return JSON.parse(JSON.stringify(INITIAL_DB));
  }
  try {
    return JSON.parse(data);
  } catch (e) {
    return JSON.parse(JSON.stringify(INITIAL_DB));
  }
}

// Funzione di scrittura helper
function saveDB(db) {
  localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(db));
}

// Mock della funzione invoke
export async function invoke(commandName, args = {}) {
  console.log(`[MOCK TAURI INVOKE] Executing ${commandName}`, args);
  const db = loadDB();

  switch (commandName) {
    case 'get_clients':
      return db.clients;
    case 'save_client': {
      const client = args.client;
      if (!client.id) {
        client.id = db.clients.length > 0 ? Math.max(...db.clients.map(c => c.id)) + 1 : 1;
        db.clients.push(client);
      } else {
        db.clients = db.clients.map(c => c.id === client.id ? { ...c, ...client } : c);
      }
      saveDB(db);
      return client.id;
    }
    case 'delete_client':
      db.clients = db.clients.filter(c => c.id !== args.id);
      db.projects = db.projects.filter(p => p.client_id !== args.id);
      saveDB(db);
      return true;

    case 'get_projects':
      return db.projects;
    case 'save_project': {
      const project = args.project;
      if (!project.id) {
        project.id = db.projects.length > 0 ? Math.max(...db.projects.map(p => p.id)) + 1 : 1;
        db.projects.push(project);
      } else {
        db.projects = db.projects.map(p => p.id === project.id ? { ...p, ...project } : p);
      }
      saveDB(db);
      return project.id;
    }
    case 'delete_project':
      db.projects = db.projects.filter(p => p.id !== args.id);
      db.cost_centers = db.cost_centers.filter(cc => cc.project_id !== args.id);
      db.materials = db.materials.filter(m => m.project_id !== args.id);
      db.labor = db.labor.filter(l => l.project_id !== args.id);
      db.expenses = db.expenses.filter(ex => ex.project_id !== args.id);
      saveDB(db);
      return true;

    case 'get_cost_centers':
      return db.cost_centers;
    case 'save_cost_center': {
      const cc = args.costCenter;
      if (!cc.id) {
        cc.id = db.cost_centers.length > 0 ? Math.max(...db.cost_centers.map(x => x.id)) + 1 : 1;
        db.cost_centers.push(cc);
      } else {
        db.cost_centers = db.cost_centers.map(x => x.id === cc.id ? { ...x, ...cc } : x);
      }
      saveDB(db);
      return cc.id;
    }
    case 'delete_cost_center':
      db.cost_centers = db.cost_centers.filter(x => x.id !== args.id);
      db.materials = db.materials.filter(m => m.cost_center_id !== args.id);
      db.labor = db.labor.filter(l => l.cost_center_id !== args.id);
      db.expenses = db.expenses.filter(ex => ex.cost_center_id !== args.id);
      saveDB(db);
      return true;

    case 'get_materials':
      return db.materials;
    case 'save_material': {
      const mat = args.material;
      if (!mat.id) {
        mat.id = db.materials.length > 0 ? Math.max(...db.materials.map(x => x.id)) + 1 : 1;
        db.materials.push(mat);
      } else {
        db.materials = db.materials.map(x => x.id === mat.id ? { ...x, ...mat } : x);
      }
      saveDB(db);
      return mat.id;
    }
    case 'delete_material':
      db.materials = db.materials.filter(x => x.id !== args.id);
      saveDB(db);
      return true;

    case 'get_labor':
      return db.labor;
    case 'save_labor': {
      const lab = args.labor;
      if (!lab.id) {
        lab.id = db.labor.length > 0 ? Math.max(...db.labor.map(x => x.id)) + 1 : 1;
        db.labor.push(lab);
      } else {
        db.labor = db.labor.map(x => x.id === lab.id ? { ...x, ...lab } : x);
      }
      saveDB(db);
      return lab.id;
    }
    case 'delete_labor':
      db.labor = db.labor.filter(x => x.id !== args.id);
      saveDB(db);
      return true;

    case 'get_expenses':
      return db.expenses;
    case 'save_expense': {
      const exp = args.expense;
      if (!exp.id) {
        exp.id = db.expenses.length > 0 ? Math.max(...db.expenses.map(x => x.id)) + 1 : 1;
        db.expenses.push(exp);
      } else {
        db.expenses = db.expenses.map(x => x.id === exp.id ? { ...x, ...exp } : x);
      }
      saveDB(db);
      return exp.id;
    }
    case 'delete_expense':
      db.expenses = db.expenses.filter(x => x.id !== args.id);
      saveDB(db);
      return true;

    case 'get_employees':
      return db.employees;
    case 'save_employee': {
      const emp = args.employee;
      if (!emp.id) {
        emp.id = db.employees.length > 0 ? Math.max(...db.employees.map(x => x.id)) + 1 : 1;
        db.employees.push(emp);
      } else {
        db.employees = db.employees.map(x => x.id === emp.id ? { ...x, ...emp } : x);
      }
      saveDB(db);
      return emp.id;
    }
    case 'delete_employee':
      db.employees = db.employees.filter(x => x.id !== args.id);
      saveDB(db);
      return true;

    case 'get_global_settings':
      return db.global_settings;
    case 'save_global_settings':
      db.global_settings = { ...db.global_settings, ...args.settings };
      saveDB(db);
      return true;

    case 'get_catalog_summary':
      return {
        total_count: db.catalog_materials.length,
        supplier_count: new Set(db.catalog_materials.map(x => x.supplier).filter(Boolean)).size
      };

    case 'clear_catalog_materials':
      db.catalog_materials = [];
      saveDB(db);
      return true;

    case 'search_catalog_materials': {
      const query = (args.query || '').toLowerCase();
      // Ricerca per codice, poi descrizione
      return db.catalog_materials.filter(m => 
        (m.code && m.code.toLowerCase().includes(query)) || 
        m.description.toLowerCase().includes(query)
      ).slice(0, 30);
    }
    case 'search_suppliers': {
      const query = (args.query || '').toLowerCase();
      const uniqueSuppliers = Array.from(new Set(db.catalog_materials.map(x => x.supplier).filter(Boolean)));
      return uniqueSuppliers.filter(s => s.toLowerCase().includes(query)).slice(0, 10);
    }

    case 'get_quotes':
      return db.quotes;
    case 'get_quote_details': {
      const quote = db.quotes.find(q => q.id === args.quoteId);
      const items = db.quote_items.filter(i => i.quote_id === args.quoteId);
      return { quote, items };
    }
    case 'save_quote': {
      const quote = args.quote;
      const items = args.items || [];
      if (!quote.id) {
        quote.id = db.quotes.length > 0 ? Math.max(...db.quotes.map(q => q.id)) + 1 : 1;
        db.quotes.push(quote);
      } else {
        db.quotes = db.quotes.map(q => q.id === quote.id ? { ...q, ...quote } : q);
      }
      // Pulisce e ricrea gli item del preventivo
      db.quote_items = db.quote_items.filter(i => i.quote_id !== quote.id);
      items.forEach((item, idx) => {
        item.id = db.quote_items.length > 0 ? Math.max(...db.quote_items.map(x => x.id)) + 1 : 1;
        item.quote_id = quote.id;
        db.quote_items.push(item);
      });
      saveDB(db);
      return quote.id;
    }
    case 'delete_quote':
      db.quotes = db.quotes.filter(q => q.id !== args.id);
      db.quote_items = db.quote_items.filter(i => i.quote_id !== args.id);
      saveDB(db);
      return true;

    case 'get_stats': {
      // Calcola e ritorna le statistiche per la dashboard
      const numClients = db.clients.length;
      const numProjects = db.projects.length;
      const totalBudget = db.projects.reduce((acc, p) => acc + (p.budget || 0), 0);
      return {
        clients_count: numClients,
        projects_count: numProjects,
        total_budget: totalBudget,
        active_projects: db.projects.filter(p => p.status === 'active').length
      };
    }

    case 'log_frontend_error':
      console.warn('Frontend log intercepted:', args.message, args.stack);
      return true;

    case 'save_pdf_file':
      console.log('PDF saving mock (web environment):', args.destPath, `bytes length: ${args.content?.length}`);
      // Nelle preview web, facciamo scaricare direttamente il PDF al browser!
      try {
        const uint8 = new Uint8Array(args.content);
        const blob = new Blob([uint8], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = args.destPath.split(/[\\/]/).pop() || 'report.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } catch (err) {
        console.error('Impossibile forzare il download del PDF:', err);
      }
      return true;

    default:
      console.warn(`[MOCK TAURI] Command ${commandName} is not explicitly mocked, returning default value.`);
      return null;
  }
}

// Mock dei plugin Tauri
export async function save(options = {}) {
  console.log('[MOCK DIALOG] save dialog open', options);
  return options.defaultPath || 'C:\\Fatture\\documento.pdf';
}

export async function open(options = {}) {
  console.log('[MOCK DIALOG] open dialog open', options);
  return null;
}

export async function relaunch() {
  console.log('[MOCK PROCESS] relaunch application triggered');
  window.location.reload();
}

export async function check() {
  console.log('[MOCK UPDATER] check for updates triggered');
  return null;
}

export async function getVersion() {
  return '5.0.6-web';
}

export function getCurrentWindow() {
  return {
    minimize: () => console.log('Window minimize requested'),
    maximize: () => console.log('Window maximize requested'),
    close: () => console.log('Window close requested'),
    listen: (name, cb) => console.log(`Window listening for ${name}`)
  };
}
