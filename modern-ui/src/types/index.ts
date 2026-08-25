export interface Client {
  id?: number | null;
  type: string;
  name: string;
  street?: string | null;
  city?: string | null;
  zip_code?: string | null;
  province?: string | null;
  vat_id?: string | null;
  tax_code?: string | null;
  email?: string | null;
  pec?: string | null;
  phone?: string | null;
  notes?: string | null;
  distance?: number | null;
}

export interface Project {
  id?: number | null;
  client_id: number;
  name: string;
  description?: string | null;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  budget: number;
  client_name?: string | null;
  costo_totale?: number | null;
  valore_lavori?: number | null;
  utile_previsto?: number | null;
  distance?: number | null;
  km_cost?: number | null;
  address?: string | null;
}

export interface CostCenter {
  id?: number | null;
  project_id: number;
  brand?: string | null;
  model: string;
  category?: string | null;
  base_cost: number;
  markup: number;
  shipping: number;
  install_fee: number;
  install_fee_percent?: number | null;
  accepted_budget?: number | null;
}

export interface Material {
  id?: number | null;
  project_id: number;
  cost_center_id?: number | null;
  phase?: string | null;
  date?: string | null;
  code?: string | null;
  description: string;
  supplier?: string | null;
  quantity: number;
  unit?: string | null;
  unit_price: number;
  markup: number;
  cost_center_name?: string | null;
}

export interface Labor {
  id?: number | null;
  project_id: number;
  cost_center_id?: number | null;
  phase?: string | null;
  date?: string | null;
  operator: string;
  description?: string | null;
  hours: number;
  hourly_cost: number;
  markup: number;
  is_travel: boolean;
  vehicle?: string | null;
  travel_cost?: number | null;
  cost_center_name?: string | null;
}

export interface Expense {
  id?: number | null;
  project_id: number;
  cost_center_id?: number | null;
  phase?: string | null;
  date?: string | null;
  description: string;
  amount: number;
  markup: number;
  supplier?: string | null;
  cost_center_name?: string | null;
}

export interface Employee {
  id?: number | null;
  name: string;
  default_hourly_cost: number;
}

export interface CatalogMaterial {
  id?: number | null;
  code?: string | null;
  description: string;
  unit?: string | null;
  unit_price?: number | null;
  supplier?: string | null;
  markup?: number | null;
}


/**
 * Impostazioni globali, memorizzate come coppie chiave/valore in
 * `global_settings` e restituite dal backend come un unico oggetto JSON.
 *
 * Le chiavi note sono elencate qui; l'index signature copre quelle
 * aggiunte dai singoli pannelli senza obbligare a modificare questo tipo.
 */
export interface GlobalSettings {
  phases_material?: string[];
  phases_labor?: string[];
  categories_cost_center?: string[];
  vehicles?: Array<string | { name: string; km_cost?: number }>;
  default_hourly_cost?: string | number;
  default_markup?: string | number;
  default_install_fee_percent?: string | number;
  company_name?: string;
  company_address?: string;
  telegram_bot_token?: string;
  telegram_chat_id?: string;
  [key: string]: unknown;
}
