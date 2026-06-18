import { create } from 'zustand'
import { useShallow } from 'zustand/react/shallow'
import { invoke } from '@tauri-apps/api/core'
import { Project, Client, CostCenter, Material, Labor, Expense } from '../types'

interface ConfirmConfig {
  isOpen: boolean;
  onConfirm: () => void;
  title: string;
  message: string;
}

export interface ProjectState {
  // State: Dati della Commessa
  projectId: number | string | null;
  project: Project | null;
  client: Client | null;
  costCenters: CostCenter[];
  materials: Material[];
  labor: Labor[];
  expenses: Expense[];
  loading: boolean;
  errorInfo: string | null;

  // State: UI
  activeTab: string;
  selectedCostCenterId: number | null;

  // Drawer states
  isCCDrawerOpen: boolean;
  selectedCC: CostCenter | null;
  isMatDrawerOpen: boolean;
  selectedMat: Material | null;

  // Confirm modal
  confirmConfig: ConfirmConfig;

  // Azioni: Inizializzazione
  initProject: (projectId: number | string) => void;

  // Azioni: Fetch Dati
  fetchData: (isSilent?: boolean) => Promise<void>;

  // Azioni: Navigazione UI
  setActiveTab: (tab: string) => void;
  selectCostCenter: (ccId: number) => void;
  deselectCostCenter: () => void;

  // Azioni: Drawer
  openCCDrawer: (cc?: CostCenter | null) => void;
  closeCCDrawer: () => void;
  openMatDrawer: (mat?: Material | null) => void;
  closeMatDrawer: () => void;

  // Azioni: Confirm Modal
  showConfirm: (config: Omit<ConfirmConfig, 'isOpen'>) => void;
  hideConfirm: () => void;

  // Azioni: CRUD
  saveCostCenter: (ccData: CostCenter) => Promise<void>;
  deleteCostCenter: (id: number) => Promise<void>;
  saveMaterial: (matData: Material) => Promise<void>;
  deleteMaterial: (id: number) => Promise<void>;
  saveLabor: (laborData: Labor | Labor[]) => Promise<void>;
  deleteLabor: (id: number) => Promise<void>;
  saveExpense: (expenseData: Expense) => Promise<void>;
  deleteExpense: (id: number) => Promise<void>;
}

// ─── Utility ─────────────────────────────────────────────────────────
const parseNum = (val: any): number => {
  if (val === null || val === undefined) return 0;
  const parsed = parseFloat(String(val));
  return isNaN(parsed) ? 0 : parsed;
};

// ─── Store ───────────────────────────────────────────────────────────
export const useProjectStore = create<ProjectState>((set, get) => ({
  // ═══ State: Dati della Commessa ════════════════════════════════════
  projectId: null,
  project: null,
  client: null,
  costCenters: [],
  materials: [],
  labor: [],
  expenses: [],
  loading: true,
  errorInfo: null,

  // ═══ State: UI ═════════════════════════════════════════════════════
  activeTab: 'cost_centers',
  selectedCostCenterId: null,

  // Drawer states
  isCCDrawerOpen: false,
  selectedCC: null,
  isMatDrawerOpen: false,
  selectedMat: null,

  // Confirm modal
  confirmConfig: { isOpen: false, onConfirm: () => {}, title: '', message: '' },

  // ═══ Azioni: Inizializzazione ══════════════════════════════════════

  /** Inizializza lo store con un nuovo projectId e carica i dati. */
  initProject: (projectId) => {
    set({ projectId, selectedCostCenterId: null, activeTab: 'cost_centers' });
    get().fetchData();
  },

  // ═══ Azioni: Fetch Dati ════════════════════════════════════════════

  /** Carica tutti i dati della commessa dal backend Rust. */
  fetchData: async (isSilent = false) => {
    const { projectId } = get();
    if (!projectId) return;

    if (!isSilent) set({ loading: true });
    set({ errorInfo: null });

    try {
      const [projects, clients, centers, mats, hours, others] = await Promise.all([
        invoke<Project[]>('get_projects'),
        invoke<Client[]>('get_clients'),
        invoke<CostCenter[]>('get_cost_centers', { projectId: Number(projectId) }),
        invoke<Material[]>('get_materials', { projectId: Number(projectId) }),
        invoke<Labor[]>('get_labor', { projectId: Number(projectId) }),
        invoke<Expense[]>('get_expenses', { projectId: Number(projectId) })
      ]);

      const p = projects.find(item => Number(item.id) === Number(projectId));
      if (p) {
        const c = clients.find(item => item.id === p.client_id);
        set({
          project: p,
          client: c || null,
          costCenters: centers,
          materials: mats,
          labor: hours,
          expenses: others,
          loading: false
        });
      } else {
        set({ errorInfo: `Progetto ID ${projectId} non trovato`, loading: false });
      }
    } catch (err) {
      console.error("Errore caricamento:", err);
      set({ errorInfo: `Errore: ${err}`, loading: false });
    }
  },

  // ═══ Azioni: Navigazione UI ════════════════════════════════════════

  setActiveTab: (tab) => set({ activeTab: tab }),

  selectCostCenter: (ccId) => set({ selectedCostCenterId: ccId, activeTab: 'dashboard' }),

  deselectCostCenter: () => set({ selectedCostCenterId: null, activeTab: 'cost_centers' }),

  // ═══ Azioni: Drawer ═══════════════════════════════════════════════

  openCCDrawer: (cc = null) => set({ isCCDrawerOpen: true, selectedCC: cc }),
  closeCCDrawer: () => set({ isCCDrawerOpen: false }),

  openMatDrawer: (mat = null) => set({ isMatDrawerOpen: true, selectedMat: mat }),
  closeMatDrawer: () => set({ isMatDrawerOpen: false }),

  // ═══ Azioni: Confirm Modal ═════════════════════════════════════════

  showConfirm: (config) => set({ confirmConfig: { ...config, isOpen: true } }),
  hideConfirm: () => set(state => ({ confirmConfig: { ...state.confirmConfig, isOpen: false } })),

  // ═══ Azioni: CRUD ═════════════════════════════════════════════════

  saveCostCenter: async (ccData) => {
    try {
      await invoke('save_cost_center', { cc: ccData });
      set({ isCCDrawerOpen: false });
      get().fetchData(true);
    } catch (err: any) { alert(err); }
  },

  deleteCostCenter: async (id) => {
    try {
      await invoke('delete_cost_center', { id });
      get().fetchData(true);
    } catch (err: any) { alert(err); }
  },

  saveMaterial: async (matData) => {
    try {
      await invoke('save_material', { mat: matData });
      set({ isMatDrawerOpen: false });
      get().fetchData(true);
    } catch (err: any) { alert(err); }
  },

  deleteMaterial: async (id) => {
    try {
      await invoke('delete_material', { id });
      get().fetchData(true);
    } catch (err: any) { alert(err); }
  },

  saveLabor: async (laborData) => {
    try {
      if (Array.isArray(laborData)) {
        await Promise.all(laborData.map(l => invoke('save_labor', { labor: l })));
      } else {
        await invoke('save_labor', { labor: laborData });
      }
      get().fetchData(true);
    } catch (err: any) { alert(err); }
  },

  deleteLabor: async (id) => {
    try {
      await invoke('delete_labor', { id });
      get().fetchData(true);
    } catch (err: any) { alert(err); }
  },

  saveExpense: async (expenseData) => {
    try {
      await invoke('save_expense', { expense: expenseData });
      get().fetchData(true);
    } catch (err: any) { alert(err); }
  },

  deleteExpense: async (id) => {
    try {
      await invoke('delete_expense', { id });
      get().fetchData(true);
    } catch (err: any) { alert(err); }
  },
}));

// ═══ Selettori Derivati (Computed) ═══════════════════════════════════

/**
 * Calcola le statistiche aggregate per la commessa o per un CC specifico.
 * Usato da DashboardTab e ProjectHeader.
 */
export const useProjectStats = () => useProjectStore(useShallow(state => {
  const { costCenters, materials, labor, expenses, selectedCostCenterId } = state;

  const filteredMats = selectedCostCenterId
    ? materials.filter(m => Number(m.cost_center_id) === Number(selectedCostCenterId))
    : materials;
  const filteredLabor = selectedCostCenterId
    ? labor.filter(l => Number(l.cost_center_id) === Number(selectedCostCenterId))
    : labor;
  const filteredExpenses = selectedCostCenterId
    ? expenses.filter(e => Number(e.cost_center_id) === Number(selectedCostCenterId))
    : expenses;

  const activeCC = selectedCostCenterId
    ? costCenters.find(cc => cc.id === Number(selectedCostCenterId))
    : null;

  const matTotalCost = filteredMats.reduce((acc, m) => acc + (parseNum(m.quantity) * parseNum(m.unit_price)), 0);
  const matTotalSale = filteredMats.reduce((acc, m) => acc + (parseNum(m.quantity) * parseNum(m.unit_price) * (1 + parseNum(m.markup))), 0);

  let ccCost = 0;
  let ccSale = 0;
  let ccAccepted = 0;

  if (selectedCostCenterId && activeCC) {
    ccCost = parseNum(activeCC.base_cost) + parseNum(activeCC.shipping) + parseNum(activeCC.install_fee);
    ccSale = parseNum(activeCC.base_cost) * (1 + parseNum(activeCC.markup)) + parseNum(activeCC.shipping) + parseNum(activeCC.install_fee);
    ccAccepted = parseNum(activeCC.accepted_budget);
  } else {
    ccCost = costCenters.reduce((acc, cc) => acc + parseNum(cc.base_cost) + parseNum(cc.shipping) + parseNum(cc.install_fee), 0);
    ccSale = costCenters.reduce((acc, cc) => acc + parseNum(cc.base_cost) * (1 + parseNum(cc.markup)) + parseNum(cc.shipping) + parseNum(cc.install_fee), 0);
    ccAccepted = costCenters.reduce((acc, cc) => acc + parseNum(cc.accepted_budget), 0);
  }

  const laborTotalCost = filteredLabor.reduce((acc, l) => acc + (parseNum(l.hours) * parseNum(l.hourly_cost)) + parseNum(l.travel_cost), 0);
  const laborTotalSale = filteredLabor.reduce((acc, l) => acc + ((parseNum(l.hours) * parseNum(l.hourly_cost)) + parseNum(l.travel_cost)) * (1 + parseNum(l.markup)), 0);
  const expenseTotalCost = filteredExpenses.reduce((acc, ex) => acc + parseNum(ex.amount), 0);
  const expenseTotalSale = filteredExpenses.reduce((acc, ex) => acc + (parseNum(ex.amount) * (1 + parseNum(ex.markup))), 0);

  const costoTotale = matTotalCost + ccCost + laborTotalCost + expenseTotalCost;
  const valoreLavori = matTotalSale + ccSale + laborTotalSale + expenseTotalSale;

  return {
    costoTotale,
    valoreLavori,
    preventivoAccettato: ccAccepted,
    utile: ccAccepted - costoTotale,
    utileListino: valoreLavori - costoTotale
  };
}));

/**
 * Restituisce i materiali filtrati per il CC attivo (o tutti se nessun CC è selezionato).
 */
export const useFilteredMaterials = () => useProjectStore(useShallow(state => {
  const { materials, selectedCostCenterId } = state;
  return selectedCostCenterId
    ? materials.filter(m => Number(m.cost_center_id) === Number(selectedCostCenterId))
    : materials;
}));

/**
 * Restituisce la manodopera filtrata per il CC attivo (o tutti se nessun CC è selezionato).
 */
export const useFilteredLabor = () => useProjectStore(useShallow(state => {
  const { labor, selectedCostCenterId } = state;
  return selectedCostCenterId
    ? labor.filter(l => Number(l.cost_center_id) === Number(selectedCostCenterId))
    : labor;
}));

/**
 * Restituisce le spese filtrate per il CC attivo (o tutti se nessun CC è selezionato).
 */
export const useFilteredExpenses = () => useProjectStore(useShallow(state => {
  const { expenses, selectedCostCenterId } = state;
  return selectedCostCenterId
    ? expenses.filter(e => Number(e.cost_center_id) === Number(selectedCostCenterId))
    : expenses;
}));

/**
 * Restituisce il CC attivamente selezionato (o null).
 */
export const useActiveCC = () => useProjectStore(state => {
  const { costCenters, selectedCostCenterId } = state;
  if (!selectedCostCenterId) return null;
  return costCenters.find(cc => cc.id === Number(selectedCostCenterId)) || null;
});

export default useProjectStore;
