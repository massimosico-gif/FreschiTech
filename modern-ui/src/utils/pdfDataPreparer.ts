/**
 * pdfDataPreparer.ts
 * 
 * Modulo di logica pura (senza dipendenze grafiche) che raggruppa i dati
 * della commessa per centro di costo e calcola tutti i valori economici
 * necessari alla generazione dei PDF (cliente e interno).
 * 
 * Questo modulo NON importa jsPDF né disegna nulla: restituisce solo
 * strutture dati pronte per essere consumate da pdfGenerator.js.
 */

import { Project, CostCenter, Material, Labor, Expense } from '../types';
import {
  costCenterCost,
  costCenterSale,
  expenseCost,
  expenseSale,
  laborHoursCost,
  laborHoursSale,
  laborTravelCost,
  laborTravelSale,
  materialCost,
  materialSale,
  parseNum,
} from './costing';

// ─── Utility helpers ────────────────────────────────────────────────
// `parseNum` e le formule economiche vivono in `costing.ts`: e' l'unica fonte
// di verita' condivisa con lo store e con AnalyticsTab.
export { parseNum };

export const formatEuro = (value: number): string => {
  return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(value);
};

export const formatPercent = (value: number): string => {
  return new Intl.NumberFormat('it-IT', { style: 'percent', minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
};

// ─── Costante chiave per il gruppo "Generico" ────────────────────────
const GENERAL_KEY = "general";

interface GroupedData {
  ccInfo: CostCenter | null;
  materials: Material[];
  labor: Labor[];
  expenses: Expense[];
  travel: Labor[];
}

// ─── Raggruppamento dati per centro di costo ─────────────────────────
const groupByCostCenter = (
  costCenters: CostCenter[],
  materials: Material[],
  labor: Labor[],
  expenses: Expense[]
): Record<string, GroupedData> => {
  const grouped: Record<string, GroupedData> = {};

  costCenters.forEach(cc => {
    if (cc.id !== undefined && cc.id !== null) {
      grouped[cc.id] = {
        ccInfo: cc,
        materials: [],
        labor: [],
        expenses: [],
        travel: []
      };
    }
  });

  grouped[GENERAL_KEY] = {
    ccInfo: null,
    materials: [],
    labor: [],
    expenses: [],
    travel: []
  };

  materials.forEach(m => {
    const ccId = m.cost_center_id;
    if (ccId && grouped[ccId]) {
      grouped[ccId].materials.push(m);
    } else {
      grouped[GENERAL_KEY].materials.push(m);
    }
  });

  labor.forEach(l => {
    const ccId = l.cost_center_id;
    const target = (ccId && grouped[ccId]) ? grouped[ccId] : grouped[GENERAL_KEY];

    if (parseNum(l.hours) > 0) {
      target.labor.push(l);
    }
    // Su SQLite il booleano is_travel viene deserializzato a volte come 1/0 o true/false
    const isTravelFlag = l.is_travel as boolean | number | null | undefined;
    if (isTravelFlag === true || isTravelFlag === 1 || parseNum(l.travel_cost) > 0) {
      target.travel.push(l);
    }
  });

  expenses.forEach(e => {
    const ccId = e.cost_center_id;
    if (ccId && grouped[ccId]) {
      grouped[ccId].expenses.push(e);
    } else {
      grouped[GENERAL_KEY].expenses.push(e);
    }
  });

  return grouped;
};

// ─── Genera il titolo del gruppo ─────────────────────────────────────
const buildGroupTitle = (ccInfo: CostCenter | null, isGeneral: boolean): string => {
  if (isGeneral || !ccInfo) {
    return "SPESE E LAVORI GENERALI (NON ASSOCIATI A CENTRI DI COSTO)";
  }
  return `${ccInfo.category?.toUpperCase() || "CENTRO DI COSTO"}: ${ccInfo.brand || ''} ${ccInfo.model}`;
};

// ═══════════════════════════════════════════════════════════════════════
//  PREPARAZIONE DATI PER IL PDF CLIENTE
// ═══════════════════════════════════════════════════════════════════════

export interface ClientPdfGroup {
  title: string;
  rows: Array<[string, string, string, string, string, string]>;
  subtotal: number;
}

export interface ClientPdfData {
  groups: ClientPdfGroup[];
  grandTotalSale: number;
}

export const prepareClientPdfData = (
  costCenters: CostCenter[],
  materials: Material[],
  labor: Labor[],
  expenses: Expense[]
): ClientPdfData => {
  const grouped = groupByCostCenter(costCenters, materials, labor, expenses);
  const groups: ClientPdfGroup[] = [];
  let grandTotalSale = 0;

  Object.keys(grouped).forEach(key => {
    const group = grouped[key];
    const isGeneral = key === GENERAL_KEY;

    const hasData = isGeneral
      ? (group.materials.length > 0 || group.labor.length > 0 || group.expenses.length > 0 || group.travel.length > 0)
      : true;

    if (!hasData) return;

    const title = buildGroupTitle(group.ccInfo, isGeneral);
    const rows: Array<[string, string, string, string, string, string]> = [];
    let subtotal = 0;

    // 1. Fornitura (costo base CC con rincaro + spedizione + fee installazione)
    if (!isGeneral && group.ccInfo) {
      const cc = group.ccInfo;
      const salePrice = costCenterSale(cc);
      subtotal += salePrice;

      rows.push([
        "", // Codice
        `Fornitura ed Installazione: ${cc.brand || ''} ${cc.model} (${cc.category || 'Apparecchiatura'})`,
        "1",
        "pz",
        formatEuro(salePrice),
        formatEuro(salePrice)
      ]);
    }

    // 2. Materiali
    group.materials.forEach(m => {
      const qty = parseNum(m.quantity);
      const salePrice = parseNum(m.unit_price) * (1 + parseNum(m.markup));
      const totalSale = materialSale(m);
      subtotal += totalSale;

      rows.push([
        m.code ? String(m.code).trim() : "", // Codice
        m.description || "Materiale commessa",
        qty.toString(),
        m.unit || "pz",
        formatEuro(salePrice),
        formatEuro(totalSale)
      ]);
    });

    // 3. Manodopera
    group.labor.forEach(l => {
      const hours = parseNum(l.hours);
      const saleRate = parseNum(l.hourly_cost) * (1 + parseNum(l.markup));
      const totalSale = laborHoursSale(l);
      subtotal += totalSale;

      rows.push([
        "", // Codice
        `Manodopera: ${l.operator || 'Operatore'} - ${l.description || 'Lavoro svolto'}`,
        hours.toString(),
        "ore",
        formatEuro(saleRate),
        formatEuro(totalSale)
      ]);
    });

    // 4. Spese
    group.expenses.forEach(e => {
      const salePrice = expenseSale(e);
      subtotal += salePrice;

      rows.push([
        "", // Codice
        `Spesa accessoria: ${e.description || 'Rimborso spese'}`,
        "1",
        "pz",
        formatEuro(salePrice),
        formatEuro(salePrice)
      ]);
    });

    // 5. Trasferte
    group.travel.forEach(t => {
      const salePrice = laborTravelSale(t);
      subtotal += salePrice;

      rows.push([
        "", // Codice
        `Trasferta / Km: ${t.vehicle || 'Mezzo'} - ${t.description || 'Viaggio'}`,
        "1",
        "viaggio",
        formatEuro(salePrice),
        formatEuro(salePrice)
      ]);
    });

    grandTotalSale += subtotal;
    groups.push({ title, rows, subtotal });
  });

  return { groups, grandTotalSale };
};

// ═══════════════════════════════════════════════════════════════════════
//  PREPARAZIONE DATI PER IL PDF INTERNO
// ═══════════════════════════════════════════════════════════════════════

export interface InternalPdfGroup {
  title: string;
  rows: Array<[string, string, string, string, string, string, string, string, string]>;
  subtotalCost: number;
  subtotalSale: number;
  subtotalMargin: number;
  subtotalMarginPercent: number;
}

export interface InternalPdfSummary {
  grandTotalCost: number;
  grandTotalSale: number;
  grandMargin: number;
  grandMarginPercent: number;
  budget: number;
  budgetDiff: number;
  utileEffettivo: number;
  utileEffettivoPercent: number;
  totalLaborHours: number;
}

export interface InternalPdfData {
  groups: InternalPdfGroup[];
  summary: InternalPdfSummary;
}

export const prepareInternalPdfData = (
  project: Project,
  costCenters: CostCenter[],
  materials: Material[],
  labor: Labor[],
  expenses: Expense[]
): InternalPdfData => {
  const grouped = groupByCostCenter(costCenters, materials, labor, expenses);
  const groups: InternalPdfGroup[] = [];
  let grandTotalCost = 0;
  let grandTotalSale = 0;

  Object.keys(grouped).forEach(key => {
    const group = grouped[key];
    const isGeneral = key === GENERAL_KEY;

    const hasData = isGeneral
      ? (group.materials.length > 0 || group.labor.length > 0 || group.expenses.length > 0 || group.travel.length > 0)
      : true;

    if (!hasData) return;

    const title = buildGroupTitle(group.ccInfo, isGeneral);
    const rows: Array<[string, string, string, string, string, string, string, string, string]> = [];
    let subtotalCost = 0;
    let subtotalSale = 0;

    // 1. Fornitura CC
    if (!isGeneral && group.ccInfo) {
      const cc = group.ccInfo;
      const markup = parseNum(cc.markup);

      const itemCost = costCenterCost(cc);
      const itemSale = costCenterSale(cc);
      const margin = itemSale - itemCost;
      const marginPercent = itemSale > 0 ? (margin / itemSale) : 0;

      subtotalCost += itemCost;
      subtotalSale += itemSale;

      rows.push([
        "", // Codice
        `Fornitura: ${cc.brand || ''} ${cc.model}`,
        "1",
        "pz",
        formatEuro(itemCost),
        formatPercent(markup),
        formatEuro(itemSale),
        formatEuro(margin),
        formatPercent(marginPercent)
      ]);
    }

    // 2. Materiali
    group.materials.forEach(m => {
      const qty = parseNum(m.quantity);
      const cost = parseNum(m.unit_price);
      const markup = parseNum(m.markup);
      const sale = cost * (1 + markup);

      const totalCost = materialCost(m);
      const totalSale = materialSale(m);
      const margin = totalSale - totalCost;
      const marginPercent = totalSale > 0 ? (margin / totalSale) : 0;

      subtotalCost += totalCost;
      subtotalSale += totalSale;

      rows.push([
        m.code ? String(m.code).trim() : "", // Codice
        m.description || "Materiale",
        qty.toString(),
        m.unit || "pz",
        formatEuro(cost),
        formatPercent(markup),
        formatEuro(sale),
        formatEuro(margin),
        formatPercent(marginPercent)
      ]);
    });

    // 3. Manodopera
    group.labor.forEach(l => {
      const hours = parseNum(l.hours);
      const cost = parseNum(l.hourly_cost);
      const markup = parseNum(l.markup);
      const sale = cost * (1 + markup);

      const totalCost = laborHoursCost(l);
      const totalSale = laborHoursSale(l);
      const margin = totalSale - totalCost;
      const marginPercent = totalSale > 0 ? (margin / totalSale) : 0;

      subtotalCost += totalCost;
      subtotalSale += totalSale;

      rows.push([
        "", // Codice
        `MO: ${l.operator || 'Operatore'} - ${l.description || 'Lavoro'}`,
        hours.toString(),
        "ore",
        formatEuro(cost),
        formatPercent(markup),
        formatEuro(sale),
        formatEuro(margin),
        formatPercent(marginPercent)
      ]);
    });

    // 4. Spese
    group.expenses.forEach(e => {
      const cost = expenseCost(e);
      const markup = parseNum(e.markup);
      const sale = expenseSale(e);
      const margin = sale - cost;
      const marginPercent = sale > 0 ? (margin / sale) : 0;

      subtotalCost += cost;
      subtotalSale += sale;

      rows.push([
        "", // Codice
        `Spesa: ${e.description || 'Spese'}`,
        "1",
        "pz",
        formatEuro(cost),
        formatPercent(markup),
        formatEuro(sale),
        formatEuro(margin),
        formatPercent(marginPercent)
      ]);
    });

    // 5. Trasferte
    group.travel.forEach(t => {
      const cost = laborTravelCost(t);
      const markup = parseNum(t.markup);
      const sale = laborTravelSale(t);
      const margin = sale - cost;
      const marginPercent = sale > 0 ? (margin / sale) : 0;

      subtotalCost += cost;
      subtotalSale += sale;

      rows.push([
        "", // Codice
        `Viaggio: ${t.vehicle || 'Mezzo'}`,
        "1",
        "viaggio",
        formatEuro(cost),
        formatPercent(markup),
        formatEuro(sale),
        formatEuro(margin),
        formatPercent(marginPercent)
      ]);
    });

    grandTotalCost += subtotalCost;
    grandTotalSale += subtotalSale;

    const subtotalMargin = subtotalSale - subtotalCost;
    const subtotalMarginPercent = subtotalSale > 0 ? (subtotalMargin / subtotalSale) : 0;

    groups.push({ title, rows, subtotalCost, subtotalSale, subtotalMargin, subtotalMarginPercent });
  });

  // Calcoli riassuntivi finali
  const grandMargin = grandTotalSale - grandTotalCost;
  const grandMarginPercent = grandTotalSale > 0 ? (grandMargin / grandTotalSale) : 0;
  const budget = parseNum(project.budget);
  const budgetDiff = budget - grandTotalSale;
  const utileEffettivo = budget - grandTotalCost;
  const utileEffettivoPercent = budget > 0 ? (utileEffettivo / budget) : 0;
  const totalLaborHours = labor.reduce((acc, l) => acc + parseNum(l.hours), 0);

  return {
    groups,
    summary: {
      grandTotalCost,
      grandTotalSale,
      grandMargin,
      grandMarginPercent,
      budget,
      budgetDiff,
      utileEffettivo,
      utileEffettivoPercent,
      totalLaborHours
    }
  };
};
