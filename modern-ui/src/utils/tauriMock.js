// TecnoRilievi / FreschiTech - Mock database in-memory e localStorage per Anteprima Web
// Sostituisce le chiamate Tauri a Rust quando l'app viene eseguita nel browser.

const MOCK_STORAGE_KEY = 'freschitech_mock_db';

// Dati iniziali pre-popolati per non mostrare l'app vuota al primo avvio
const INITIAL_DB = {
  clients: [
    { id: 1, type: 'condominium', name: 'Condominio Stella Marina', street: 'Via Bafile 120', city: 'Jesolo', zip_code: '30016', province: 'VE', vat_id: '12345678901', tax_code: '12345678901', email: 'info@stellamarina.it', pec: 'stellamarina@pec.it', phone: '0421 380000', notes: 'Custode presente la mattina', distance: 15 },
    { id: 2, type: 'private', name: 'Rossi Mario', street: 'Cannaregio 4560', city: 'Venezia', zip_code: '30121', province: 'VE', vat_id: '', tax_code: 'RSSMRA80A01L736U', email: 'mario.rossi@gmail.com', pec: '', phone: '335 1234567', notes: 'Richiede preavviso telefonico', distance: 25 },
    { id: 3, type: 'company', name: 'Azienda Agricola Biasin', street: 'Via Castellana 88', city: 'Treviso', zip_code: '31100', province: 'TV', vat_id: '09876543210', tax_code: '09876543210', email: 'biasin@agricola.it', pec: 'biasin@pec.agricola.it', phone: '0422 998877', notes: 'Consegnare materiali presso la stalla principale', distance: 45 },
    { id: 4, type: 'company', name: 'Lely Center Treviso', street: 'Via Postumia 4', city: 'Spresiano', zip_code: '31027', province: 'TV', vat_id: '01122334455', tax_code: '01122334455', email: 'info@lelytreviso.it', pec: 'lelytreviso@pec.it', phone: '0422 881122', notes: 'Uffici aperti dalle 8:30 alle 18:00', distance: 38 },
    { id: 5, type: 'company', name: 'Impianti Elettrici Marcon', street: 'Viale della Repubblica 202', city: 'Villorba', zip_code: '31050', province: 'TV', vat_id: '05566778899', tax_code: '05566778899', email: 'info@marconimpianti.it', pec: 'marcon@pec.it', phone: '0422 445566', notes: 'Chiedere dell\'ing. Marcon', distance: 30 }
  ],
  projects: [
    { id: 1, client_id: 1, name: 'Rifacimento Impianto Elettrico Scala A', description: 'Adeguamento e rifacimento impianto elettrico comune Scala A e luci emergenza', status: 'active', start_date: '2026-06-01', end_date: '2026-07-15', budget: 15000.0, distance: 15, km_cost: 0.50, address: 'Via Bafile 120, Jesolo' },
    { id: 2, client_id: 2, name: 'Installazione Climatizzatori Daikin', description: 'Fornitura e posa dual split Daikin in soggiorno e camera principale', status: 'active', start_date: '2026-06-10', end_date: '2026-06-25', budget: 4500.0, distance: 25, km_cost: 0.50, address: 'Cannaregio 4560, Venezia' },
    { id: 3, client_id: 3, name: 'Automazione Stalla Astronaut A5', description: 'Cablaggio elettrico di potenza e segnale per robot di mungitura Lely Astronaut A5', status: 'active', start_date: '2026-04-15', end_date: '2026-05-20', budget: 35000.0, distance: 45, km_cost: 0.50, address: 'Via Castellana 88, Treviso' },
    { id: 4, client_id: 4, name: 'Cablaggio Strutturato Uffici Sede', description: 'Installazione rack di rete, stesura cavi Cat6, certificazione e posa frutti per 25 postazioni', status: 'active', start_date: '2026-05-02', end_date: '2026-05-18', budget: 12500.0, distance: 38, km_cost: 0.50, address: 'Via Postumia 4, Spresiano' },
    { id: 5, client_id: 5, name: 'Manutenzione Cabina Media Tensione', description: 'Pulizia isolatori, taratura relè di protezione e prove di sgancio su interruttore MT', status: 'completed', start_date: '2026-03-20', end_date: '2026-03-22', budget: 8900.0, distance: 30, km_cost: 0.50, address: 'Viale della Repubblica 202, Villorba' }
  ],
  cost_centers: [
    { id: 1, project_id: 1, brand: 'Gewiss', model: 'Quadro Scala A', category: 'Quadri', base_cost: 850.0, markup: 0.20, shipping: 30.0, install_fee: 150.0, install_fee_percent: 0.06, accepted_budget: 1200.0 },
    { id: 2, project_id: 2, brand: 'Daikin', model: 'Dual Split Emura', category: 'Climatizzazione', base_cost: 1800.0, markup: 0.15, shipping: 50.0, install_fee: 300.0, install_fee_percent: 0.06, accepted_budget: 2500.0 },
    { id: 3, project_id: 3, brand: 'Lely', model: 'Robot Astronaut A5', category: 'Automazione', base_cost: 18500.0, markup: 0.12, shipping: 250.0, install_fee: 1200.0, install_fee_percent: 0.06, accepted_budget: 22000.0 },
    { id: 4, project_id: 4, brand: 'Panduit', model: 'Armadio Rack & Switch PoE', category: 'Cablaggio', base_cost: 3200.0, markup: 0.25, shipping: 80.0, install_fee: 450.0, install_fee_percent: 0.06, accepted_budget: 4800.0 },
    { id: 5, project_id: 5, brand: 'ABB', model: 'Sezionatore Cabina MT', category: 'Cabine', base_cost: 4100.0, markup: 0.18, shipping: 120.0, install_fee: 600.0, install_fee_percent: 0.06, accepted_budget: 5800.0 }
  ],
  materials: [
    { id: 1, project_id: 1, cost_center_id: 1, phase: 'Inizio lavori', date: '2026-06-02', code: 'CAV-FG16-3G2.5', description: 'Cavo FG16OR16 3G2.5 mm² - Isolamento Butilico', supplier: 'MARCHIOL S.P.A.', quantity: 100, unit: 'm', unit_price: 1.72, markup: 0.25 },
    { id: 2, project_id: 1, cost_center_id: 1, phase: 'Inizio lavori', date: '2026-06-02', code: 'SCAT-PT6', description: 'Scatola derivazione PT6 c/cop', supplier: 'MARCHIOL S.P.A.', quantity: 10, unit: 'pz', unit_price: 3.90, markup: 0.25 },
    { id: 3, project_id: 3, cost_center_id: 3, phase: 'Posa cavi', date: '2026-04-18', code: 'CAV-FG16-5G6', description: 'Cavo FG16OR16 5G6 mm² per alimentazione robot', supplier: 'MARCHIOL S.P.A.', quantity: 80, unit: 'm', unit_price: 4.85, markup: 0.20 },
    { id: 4, project_id: 4, cost_center_id: 4, phase: 'Rack uffici', date: '2026-05-04', code: 'SW-POE-24P', description: 'Switch managed 24 porte gigabit PoE 370W', supplier: 'Sonepar', quantity: 2, unit: 'pz', unit_price: 450.0, markup: 0.25 },
    { id: 5, project_id: 4, cost_center_id: 4, phase: 'Stesura cavi', date: '2026-05-05', code: 'CAV-CAT6-UUTP', description: 'Matassa cavo LAN Cat6 U/UTP LSZH 305m', supplier: 'Sonepar', quantity: 4, unit: 'pz', unit_price: 180.0, markup: 0.25 }
  ],
  labor: [
    { id: 1, project_id: 1, cost_center_id: 1, phase: 'Cablaggio', date: '2026-06-03', operator: 'Mario Rossi', description: 'Posa cavi e installazione scatole', hours: 8, hourly_cost: 30.0, markup: 0.0, is_travel: 0, vehicle: '', travel_cost: 0.0 },
    { id: 2, project_id: 1, cost_center_id: 1, phase: 'Cablaggio', date: '2026-06-03', operator: 'Luca Bianchi', description: 'Trasferta Jesolo c/o cantiere Stella Marina', hours: 1, hourly_cost: 30.0, markup: 0.0, is_travel: 1, vehicle: 'Furgone Ducato', travel_cost: 15.0 },
    { id: 3, project_id: 3, cost_center_id: 3, phase: 'Installazione Robot', date: '2026-04-22', operator: 'Giuseppe Verdi', description: 'Montaggio meccanico e collegamento idraulico robot', hours: 32, hourly_cost: 28.0, markup: 0.15, is_travel: 0, vehicle: '', travel_cost: 0.0 },
    { id: 4, project_id: 4, cost_center_id: 4, phase: 'Cablaggio rete', date: '2026-05-08', operator: 'Luca Bianchi', description: 'Attestazione frutti e collaudo con tester Fluke', hours: 16, hourly_cost: 30.0, markup: 0.20, is_travel: 0, vehicle: '', travel_cost: 0.0 }
  ],
  expenses: [
    { id: 1, project_id: 1, cost_center_id: 1, phase: 'Accessori', date: '2026-06-04', description: 'Parcheggio e pedaggio cantiere Jesolo', amount: 12.0, markup: 0.0, supplier: 'Autostrade' },
    { id: 2, project_id: 3, cost_center_id: 3, phase: 'Sollevamento', date: '2026-04-20', description: 'Noleggio autogru per posizionamento robot stalla', amount: 450.0, markup: 0.10, supplier: 'Cariolato Noleggi' }
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

/**
 * Filtra per commessa, come fanno le query del backend Rust.
 *
 * Senza questo filtro l'anteprima web mostrava in ogni commessa i materiali,
 * le ore e le spese di tutte le altre: i totali risultavano identici ovunque.
 */
function byProject(rows, projectId) {
  if (!projectId) return rows;
  return rows.filter(row => Number(row.project_id) === Number(projectId));
}

// Funzione di lettura helper
function loadDB() {
  const data = localStorage.getItem(MOCK_STORAGE_KEY);
  if (!data) {
    localStorage.setItem(MOCK_STORAGE_KEY, JSON.stringify(INITIAL_DB));
    return JSON.parse(JSON.stringify(INITIAL_DB));
  }
  try {
    return JSON.parse(data);
  } catch {
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
      // Il comando Rust filtra per commessa: senza questo filtro l'anteprima
      // web mostrava i centri di costo di tutte le commesse in ognuna.
      return args.projectId
        ? db.cost_centers.filter(cc => Number(cc.project_id) === Number(args.projectId))
        : db.cost_centers;
    case 'save_cost_center': {
      const cc = args.cc;
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
      return byProject(db.materials, args.projectId);
    case 'save_material': {
      // Il comando Rust si chiama `mat`, non `material`: con la chiave
      // sbagliata l'anteprima web falliva su ogni salvataggio di materiale.
      const mat = args.mat;
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
      return byProject(db.labor, args.projectId);
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
      return byProject(db.expenses, args.projectId);
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

    case 'get_catalog_materials': {
      const search = (args.search || '').trim().toLowerCase();
      const supplier = (args.supplier || '').trim().toLowerCase();
      const sortBy = args.sortBy || 'id';
      const sortDesc = !!args.sortDesc;
      const limit = args.limit || 50;
      const offset = args.offset || 0;

      let filtered = [...db.catalog_materials];

      // Filtro ricerca
      if (search) {
        filtered = filtered.filter(m => 
          (m.code && m.code.toLowerCase().includes(search)) || 
          (m.description && m.description.toLowerCase().includes(search))
        );
      }

      // Filtro fornitore
      if (supplier && supplier !== 'all') {
        if (supplier === 'none') {
          filtered = filtered.filter(m => !m.supplier);
        } else {
          filtered = filtered.filter(m => m.supplier && m.supplier.toLowerCase() === supplier);
        }
      }

      // Ordinamento
      filtered.sort((a, b) => {
        let valA = a[sortBy];
        let valB = b[sortBy];

        if (valA === undefined || valA === null) valA = '';
        if (valB === undefined || valB === null) valB = '';

        if (typeof valA === 'string') {
          return sortDesc ? valB.localeCompare(valA) : valA.localeCompare(valB);
        } else {
          return sortDesc ? valB - valA : valA - valB;
        }
      });

      const totalCount = filtered.length;
      const items = filtered.slice(offset, offset + limit);

      return {
        items,
        total_count: totalCount
      };
    }

    case 'save_catalog_material': {
      const item = args.item;
      if (!item.id) {
        item.id = db.catalog_materials.length > 0 ? Math.max(...db.catalog_materials.map(x => x.id || 0)) + 1 : 101;
        db.catalog_materials.push(item);
      } else {
        db.catalog_materials = db.catalog_materials.map(x => x.id === item.id ? { ...x, ...item } : x);
      }
      saveDB(db);
      return true;
    }

    case 'delete_catalog_material':
      db.catalog_materials = db.catalog_materials.filter(x => x.id !== args.id);
      saveDB(db);
      return true;

    case 'import_catalog_materials': {
      const clearExisting = args.clearExisting !== undefined ? args.clearExisting : args.clear_existing;
      if (clearExisting) {
        db.catalog_materials = [];
      }
      
      const newItems = [
        { id: 201, code: 'CAV-FG16-3G1.5', description: 'Cavo FG16OR16 3G1.5 mm²', unit: 'm', unit_price: 1.15, supplier: args.supplier || 'MARCHIOL S.P.A.', markup: args.markup || 0.25 },
        { id: 202, code: 'CAV-FG16-5G1.5', description: 'Cavo FG16OR16 5G1.5 mm²', unit: 'm', unit_price: 1.85, supplier: args.supplier || 'MARCHIOL S.P.A.', markup: args.markup || 0.25 },
        { id: 203, code: 'INTERR-16A', description: 'Bticino Interruttore automatico 1P+N 16A', unit: 'pz', unit_price: 12.50, supplier: args.supplier || 'MARCHIOL S.P.A.', markup: args.markup || 0.20 },
        { id: 204, code: 'DIFF-25A-30MA', description: 'Bticino Salvavita Differenziale 2P 25A 30mA', unit: 'pz', unit_price: 34.90, supplier: args.supplier || 'MARCHIOL S.P.A.', markup: args.markup || 0.20 }
      ];

      db.catalog_materials.push(...newItems);
      saveDB(db);
      return newItems.length;
    }

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
      items.forEach(item => {
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
      // 1. Fatturato Totale (Somma dei preventivi accettati dei singoli centri di costo)
      const totalRevenue = db.cost_centers.reduce((acc, cc) => acc + (cc.accepted_budget || 0.0), 0.0);

      // 2. Progetti Attivi (status = 'active')
      const activeProjectsCount = db.projects.filter(p => p.status === 'active').length;

      // 3. Clienti Lely
      const clientsCount = db.clients.length;

      // 4. Costi Totali Cumulati (materiali + manodopera + spese + centri di costo)
      const totalMaterials = db.materials.reduce((acc, m) => acc + ((m.quantity || 0) * (m.unit_price || 0)), 0.0);
      const totalCostCenters = db.cost_centers.reduce((acc, cc) => acc + ((cc.base_cost || 0) + (cc.shipping || 0) + (cc.install_fee || 0)), 0.0);
      const totalLabor = db.labor.reduce((acc, l) => acc + ((l.hours || 0) * (l.hourly_cost || 0) + (l.travel_cost || 0)), 0.0);
      const totalExpenses = db.expenses.reduce((acc, ex) => acc + (ex.amount || 0), 0.0);
      const totalPending = totalMaterials + totalCostCenters + totalLabor + totalExpenses;

      // 5. Valore totale lavori (con markup)
      const valoreMaterials = db.materials.reduce((acc, m) => acc + ((m.quantity || 0) * (m.unit_price || 0) * (1.0 + (m.markup || 0))), 0.0);
      const valoreCostCenters = db.cost_centers.reduce((acc, cc) => acc + ((cc.base_cost || 0) * (1.0 + (cc.markup || 0)) + (cc.shipping || 0) + (cc.install_fee || 0)), 0.0);
      const valoreLabor = db.labor.reduce((acc, l) => acc + (((l.hours || 0) * (l.hourly_cost || 0) + (l.travel_cost || 0)) * (1.0 + (l.markup || 0))), 0.0);
      const valoreExpenses = db.expenses.reduce((acc, ex) => acc + ((ex.amount || 0) * (1.0 + (ex.markup || 0))), 0.0);
      const totalValoreLavori = valoreMaterials + valoreCostCenters + valoreLabor + valoreExpenses;

      const utilePrevisto = totalValoreLavori - totalPending;
      const utileEffettivo = totalRevenue - totalPending;

      // 6. Monthly Chart Data (Costi per mese dell'anno corrente)
      const months = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];
      const chartData = months.map(m => ({ name: m, total: 0.0 }));

      // Usiamo l'anno corrente 2026 come da data iniziale
      const currentYear = "2026";

      // Funzione helper per estrarre mese da stringa data YYYY-MM-DD
      const getMonthIndex = (dateStr) => {
        if (!dateStr || dateStr.length < 7) return -1;
        if (dateStr.substring(0, 4) !== currentYear) return -1;
        const m = parseInt(dateStr.substring(5, 7), 10);
        return (m >= 1 && m <= 12) ? m - 1 : -1;
      };

      // Somma costi materiali
      db.materials.forEach(m => {
        const idx = getMonthIndex(m.date);
        if (idx !== -1) {
          chartData[idx].total += (m.quantity || 0) * (m.unit_price || 0);
        }
      });

      // Somma costi cost centers
      db.cost_centers.forEach(cc => {
        const proj = db.projects.find(p => p.id === cc.project_id);
        if (proj) {
          const idx = getMonthIndex(proj.start_date);
          if (idx !== -1) {
            chartData[idx].total += (cc.base_cost || 0) + (cc.shipping || 0) + (cc.install_fee || 0);
          }
        }
      });

      // Somma costi manodopera
      db.labor.forEach(l => {
        const idx = getMonthIndex(l.date);
        if (idx !== -1) {
          chartData[idx].total += (l.hours || 0) * (l.hourly_cost || 0) + (l.travel_cost || 0);
        }
      });

      // Somma costi spese
      db.expenses.forEach(ex => {
        const idx = getMonthIndex(ex.date);
        if (idx !== -1) {
          chartData[idx].total += (ex.amount || 0);
        }
      });

      // Se non ci sono costi (es. db resettato), popoliamo dei dati mock per dare una bella anteprima grafica
      const totalSum = chartData.reduce((acc, c) => acc + c.total, 0);
      if (totalSum === 0) {
        chartData[0].total = 1200; // Gen
        chartData[1].total = 2800; // Feb
        chartData[2].total = 1900; // Mar
        chartData[3].total = 8500; // Apr (Stalla Lely)
        chartData[4].total = 5400; // Mag (Cablaggio uffici)
        chartData[5].total = 3100; // Giu (Stella Marina)
        chartData[6].total = 4100; // Lug
        chartData[7].total = 1500; // Ago
        chartData[8].total = 3800; // Set
        chartData[9].total = 6200; // Ott
        chartData[10].total = 4900; // Nov
        chartData[11].total = 7100; // Dic
      }

      return {
        total_revenue: totalRevenue || 36300.0,
        invoices_count: activeProjectsCount || 4,
        clients_count: clientsCount || 5,
        total_pending: totalPending || 28354.0,
        utile_previsto: utilePrevisto || 9850.0,
        utile_effettivo: utileEffettivo || 5846.0,
        chart_data: chartData
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

    // ── Backup e diagnostica ────────────────────────────────────────
    // Nell'anteprima web non esiste un filesystem su cui operare: restituiamo
    // valori plausibili senza fingere che l'operazione sia riuscita davvero.
    case 'get_backup_info':
      return {
        directory: "(non disponibile nell'anteprima web)",
        count: 0,
        keep: 7,
        latest: null
      };
    case 'create_backup_now':
      throw new Error("Backup non disponibile nell'anteprima web");
    case 'send_log_to_telegram':
    case 'send_database_to_telegram':
      throw new Error("Invio diagnostica non disponibile nell'anteprima web");
    case 'export_database':
      throw new Error("Esportazione non disponibile nell'anteprima web");

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
    listen: (name) => console.log(`Window listening for ${name}`)
  };
}
