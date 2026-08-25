/**
 * costing.ts
 *
 * Unica fonte di verita' per le formule economiche della commessa.
 *
 * Le stesse formule erano ripetute in quattro punti — `useProjectStore`,
 * `AnalyticsTab`, `pdfDataPreparer` e le query SQL di `get_stats` /
 * `get_projects` — con il rischio che una modifica al calcolo del ricarico
 * venisse replicata a mano solo in alcuni. Le tre implementazioni JavaScript
 * ora vivono qui; la controparte SQL resta nel backend, e va tenuta allineata
 * a queste definizioni.
 *
 * Convenzione: `markup` e' una frazione (0.25 = 25%), non una percentuale.
 */

import type { CostCenter, Expense, Labor, Material } from '../types';

/**
 * Converte un valore di provenienza incerta in numero.
 *
 * Accetta anche la virgola come separatore decimale: i valori arrivano da
 * SQLite gia' come numeri, ma i form li producono come stringhe.
 */
export const parseNum = (val: unknown): number => {
  if (val === null || val === undefined) return 0;
  if (typeof val === 'number') return Number.isFinite(val) ? val : 0;
  const parsed = parseFloat(String(val).replace(',', '.'));
  return Number.isNaN(parsed) ? 0 : parsed;
};

/** Applica un ricarico frazionario a un costo. */
export const applyMarkup = (cost: number, markup: unknown): number =>
  cost * (1 + parseNum(markup));

// ─── Materiali ───────────────────────────────────────────────────────

export const materialCost = (m: Material): number =>
  parseNum(m.quantity) * parseNum(m.unit_price);

export const materialSale = (m: Material): number =>
  applyMarkup(materialCost(m), m.markup);

// ─── Centri di costo ─────────────────────────────────────────────────

/**
 * Costo di un centro di costo: macchinario, trasporto e installazione.
 */
export const costCenterCost = (cc: CostCenter): number =>
  parseNum(cc.base_cost) + parseNum(cc.shipping) + parseNum(cc.install_fee);

/**
 * Valore di vendita: il ricarico si applica al solo costo del macchinario.
 * Trasporto e installazione vengono ribaltati a costo, senza margine.
 */
export const costCenterSale = (cc: CostCenter): number =>
  applyMarkup(parseNum(cc.base_cost), cc.markup) +
  parseNum(cc.shipping) +
  parseNum(cc.install_fee);

// ─── Manodopera ──────────────────────────────────────────────────────

/** Sola componente oraria, senza trasferta. */
export const laborHoursCost = (l: Labor): number =>
  parseNum(l.hours) * parseNum(l.hourly_cost);

export const laborHoursSale = (l: Labor): number =>
  applyMarkup(laborHoursCost(l), l.markup);

/** Sola componente di trasferta. */
export const laborTravelCost = (l: Labor): number => parseNum(l.travel_cost);

export const laborTravelSale = (l: Labor): number =>
  applyMarkup(laborTravelCost(l), l.markup);

/** Ore piu' trasferta. */
export const laborCost = (l: Labor): number =>
  laborHoursCost(l) + laborTravelCost(l);

export const laborSale = (l: Labor): number =>
  applyMarkup(laborCost(l), l.markup);

// ─── Spese ───────────────────────────────────────────────────────────

export const expenseCost = (e: Expense): number => parseNum(e.amount);

export const expenseSale = (e: Expense): number =>
  applyMarkup(expenseCost(e), e.markup);

// ─── Aggregati ───────────────────────────────────────────────────────

const sumBy = <T,>(items: readonly T[], fn: (item: T) => number): number =>
  items.reduce((acc, item) => acc + fn(item), 0);

export interface ProjectTotals {
  /** Costo vivo sostenuto. */
  costoTotale: number;
  /** Valore a listino, ovvero costo piu' ricarichi. */
  valoreLavori: number;
  /** Somma dei preventivi accettati dei centri di costo. */
  preventivoAccettato: number;
  /** Margine rispetto a quanto effettivamente accettato dal cliente. */
  utile: number;
  /** Margine teorico se tutto fosse venduto a listino. */
  utileListino: number;
}

export interface ProjectTotalsInput {
  costCenters: readonly CostCenter[];
  materials: readonly Material[];
  labor: readonly Labor[];
  expenses: readonly Expense[];
}

/**
 * Calcola i totali economici a partire dalle voci gia' filtrate dal chiamante
 * (per commessa intera o per singolo centro di costo).
 */
export const computeProjectTotals = ({
  costCenters,
  materials,
  labor,
  expenses,
}: ProjectTotalsInput): ProjectTotals => {
  const costoTotale =
    sumBy(materials, materialCost) +
    sumBy(costCenters, costCenterCost) +
    sumBy(labor, laborCost) +
    sumBy(expenses, expenseCost);

  const valoreLavori =
    sumBy(materials, materialSale) +
    sumBy(costCenters, costCenterSale) +
    sumBy(labor, laborSale) +
    sumBy(expenses, expenseSale);

  const preventivoAccettato = sumBy(costCenters, (cc) =>
    parseNum(cc.accepted_budget)
  );

  return {
    costoTotale,
    valoreLavori,
    preventivoAccettato,
    utile: preventivoAccettato - costoTotale,
    utileListino: valoreLavori - costoTotale,
  };
};

/** Margine in percentuale sul valore di vendita. 0 se non c'e' vendita. */
export const marginPercent = (cost: number, sale: number): number =>
  sale > 0 ? ((sale - cost) / sale) * 100 : 0;
