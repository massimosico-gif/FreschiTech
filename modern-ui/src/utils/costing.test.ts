import { describe, expect, it } from 'vitest';

import {
  applyMarkup,
  computeProjectTotals,
  costCenterCost,
  costCenterSale,
  expenseCost,
  expenseSale,
  laborCost,
  laborHoursCost,
  laborSale,
  laborTravelCost,
  marginPercent,
  materialCost,
  materialSale,
  parseNum,
} from './costing';
import type { CostCenter, Expense, Labor, Material } from '../types';

// ─── Costruttori di comodo ───────────────────────────────────────────

const material = (over: Partial<Material> = {}): Material => ({
  project_id: 1,
  description: 'Cavo',
  quantity: 1,
  unit_price: 0,
  markup: 0,
  ...over,
});

const costCenter = (over: Partial<CostCenter> = {}): CostCenter => ({
  project_id: 1,
  model: 'Quadro',
  base_cost: 0,
  markup: 0,
  shipping: 0,
  install_fee: 0,
  ...over,
});

const labor = (over: Partial<Labor> = {}): Labor => ({
  project_id: 1,
  operator: 'Mario Rossi',
  hours: 0,
  hourly_cost: 0,
  markup: 0,
  is_travel: false,
  ...over,
});

const expense = (over: Partial<Expense> = {}): Expense => ({
  project_id: 1,
  description: 'Pedaggio',
  amount: 0,
  markup: 0,
  ...over,
});

// ─── parseNum ────────────────────────────────────────────────────────

describe('parseNum', () => {
  it('restituisce 0 per null e undefined', () => {
    expect(parseNum(null)).toBe(0);
    expect(parseNum(undefined)).toBe(0);
  });

  it('accetta la virgola come separatore decimale', () => {
    expect(parseNum('1,5')).toBe(1.5);
  });

  it('restituisce 0 per valori non numerici', () => {
    expect(parseNum('n/d')).toBe(0);
    expect(parseNum('')).toBe(0);
  });

  it('neutralizza NaN e Infinity invece di propagarli nei totali', () => {
    expect(parseNum(NaN)).toBe(0);
    expect(parseNum(Infinity)).toBe(0);
  });
});

describe('applyMarkup', () => {
  it('tratta il ricarico come frazione, non come percentuale', () => {
    expect(applyMarkup(100, 0.25)).toBe(125);
  });

  it('lascia il costo invariato con ricarico assente', () => {
    expect(applyMarkup(100, null)).toBe(100);
  });
});

// ─── Voci singole ────────────────────────────────────────────────────

describe('materiali', () => {
  it('moltiplica quantita per prezzo unitario', () => {
    expect(materialCost(material({ quantity: 100, unit_price: 1.72 }))).toBeCloseTo(172);
  });

  it('applica il ricarico al totale di riga', () => {
    expect(
      materialSale(material({ quantity: 100, unit_price: 1.72, markup: 0.25 }))
    ).toBeCloseTo(215);
  });
});

describe('centri di costo', () => {
  const cc = costCenter({
    base_cost: 1000,
    markup: 0.2,
    shipping: 50,
    install_fee: 100,
  });

  it('somma macchinario, trasporto e installazione nel costo', () => {
    expect(costCenterCost(cc)).toBe(1150);
  });

  it('applica il ricarico al solo macchinario', () => {
    // 1000 * 1.2 + 50 + 100 — trasporto e installazione a costo.
    expect(costCenterSale(cc)).toBe(1350);
  });
});

describe('manodopera', () => {
  const l = labor({ hours: 8, hourly_cost: 30, markup: 0.5, travel_cost: 15 });

  it('separa la componente oraria da quella di trasferta', () => {
    expect(laborHoursCost(l)).toBe(240);
    expect(laborTravelCost(l)).toBe(15);
  });

  it('somma ore e trasferta nel costo complessivo', () => {
    expect(laborCost(l)).toBe(255);
  });

  it('applica il ricarico anche alla trasferta', () => {
    expect(laborSale(l)).toBeCloseTo(382.5);
  });

  it('tratta travel_cost mancante come zero', () => {
    expect(laborCost(labor({ hours: 2, hourly_cost: 30 }))).toBe(60);
  });
});

describe('spese', () => {
  it('usa l importo come costo e vi applica il ricarico', () => {
    expect(expenseCost(expense({ amount: 450 }))).toBe(450);
    expect(expenseSale(expense({ amount: 450, markup: 0.1 }))).toBeCloseTo(495);
  });
});

// ─── Aggregato ───────────────────────────────────────────────────────

describe('computeProjectTotals', () => {
  const input = {
    costCenters: [costCenter({ base_cost: 1000, markup: 0.2, shipping: 50, install_fee: 100, accepted_budget: 1400 })],
    materials: [material({ quantity: 100, unit_price: 1.72, markup: 0.25 })],
    labor: [labor({ hours: 8, hourly_cost: 30, markup: 0.5, travel_cost: 15 })],
    expenses: [expense({ amount: 450, markup: 0.1 })],
  };

  it('somma il costo vivo di tutte le componenti', () => {
    // 172 (materiali) + 1150 (CC) + 255 (manodopera) + 450 (spese)
    expect(computeProjectTotals(input).costoTotale).toBeCloseTo(2027);
  });

  it('somma il valore a listino di tutte le componenti', () => {
    // 215 + 1350 + 382.5 + 495
    expect(computeProjectTotals(input).valoreLavori).toBeCloseTo(2442.5);
  });

  it('riporta il preventivo accettato dai centri di costo', () => {
    expect(computeProjectTotals(input).preventivoAccettato).toBe(1400);
  });

  it('calcola utile reale e utile a listino con basi diverse', () => {
    const totals = computeProjectTotals(input);
    // L'utile reale confronta il costo con quanto accettato dal cliente,
    // l'utile a listino con il valore teorico di vendita.
    expect(totals.utile).toBeCloseTo(1400 - 2027);
    expect(totals.utileListino).toBeCloseTo(2442.5 - 2027);
  });

  it('restituisce zeri su una commessa vuota senza produrre NaN', () => {
    const totals = computeProjectTotals({
      costCenters: [],
      materials: [],
      labor: [],
      expenses: [],
    });
    expect(totals).toEqual({
      costoTotale: 0,
      valoreLavori: 0,
      preventivoAccettato: 0,
      utile: 0,
      utileListino: 0,
    });
  });

  it('segnala una perdita quando il costo supera il preventivo accettato', () => {
    const totals = computeProjectTotals({
      costCenters: [costCenter({ base_cost: 500, accepted_budget: 100 })],
      materials: [],
      labor: [],
      expenses: [],
    });
    expect(totals.utile).toBeLessThan(0);
  });
});

describe('marginPercent', () => {
  it('calcola il margine sul prezzo di vendita', () => {
    expect(marginPercent(75, 100)).toBe(25);
  });

  it('evita la divisione per zero quando non c e vendita', () => {
    expect(marginPercent(50, 0)).toBe(0);
  });
});
