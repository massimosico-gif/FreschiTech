import { describe, expect, it } from 'vitest';

import { prepareClientPdfData, prepareInternalPdfData } from './pdfDataPreparer';
import type { CostCenter, Expense, Labor, Material, Project } from '../types';

const project: Project = {
  id: 1,
  client_id: 1,
  name: 'Commessa test',
  budget: 3000,
};

const costCenters: CostCenter[] = [
  {
    id: 10,
    project_id: 1,
    brand: 'Gewiss',
    model: 'Quadro Scala A',
    category: 'Quadri',
    base_cost: 1000,
    markup: 0.2,
    shipping: 50,
    install_fee: 100,
    accepted_budget: 1400,
  },
];

const materials: Material[] = [
  {
    id: 1,
    project_id: 1,
    cost_center_id: 10,
    description: 'Cavo FG16',
    quantity: 100,
    unit: 'm',
    unit_price: 1.72,
    markup: 0.25,
  },
  {
    id: 2,
    project_id: 1,
    cost_center_id: null,
    description: 'Materiale di consumo',
    quantity: 2,
    unit: 'pz',
    unit_price: 10,
    markup: 0,
  },
];

const labor: Labor[] = [
  {
    id: 1,
    project_id: 1,
    cost_center_id: 10,
    operator: 'Mario Rossi',
    description: 'Posa cavi',
    hours: 8,
    hourly_cost: 30,
    markup: 0.5,
    is_travel: true,
    vehicle: 'Furgone',
    travel_cost: 15,
  },
];

const expenses: Expense[] = [
  {
    id: 1,
    project_id: 1,
    cost_center_id: 10,
    description: 'Noleggio autogru',
    amount: 450,
    markup: 0.1,
  },
];

describe('prepareClientPdfData', () => {
  const data = prepareClientPdfData(costCenters, materials, labor, expenses);

  it('crea un gruppo per ogni centro di costo piu quello generale', () => {
    expect(data.groups).toHaveLength(2);
    expect(data.groups[1].title).toContain('GENERALI');
  });

  it('assegna al gruppo generale le voci senza centro di costo', () => {
    const generale = data.groups[1];
    expect(generale.rows.some(r => r[1].includes('Materiale di consumo'))).toBe(true);
  });

  it('espone al cliente solo i valori di vendita', () => {
    // 1350 (fornitura CC) + 215 (cavo) + 360 (8h a 45/h) + 495 (spesa) + 22.5 (trasferta)
    expect(data.groups[0].subtotal).toBeCloseTo(2442.5);
  });

  it('non conta due volte la trasferta di una riga con ore e viaggio', () => {
    const gruppo = data.groups[0];
    const manodopera = gruppo.rows.filter(r => r[1].startsWith('Manodopera:'));
    const trasferte = gruppo.rows.filter(r => r[1].startsWith('Trasferta'));

    // La stessa riga di labor compare due volte, ma con importi disgiunti:
    // le ore nella manodopera, il viaggio nella trasferta.
    expect(manodopera).toHaveLength(1);
    expect(trasferte).toHaveLength(1);
    expect(manodopera[0][5]).toContain('360');
    expect(trasferte[0][5]).toContain('22,5');
  });

  it('somma i subtotali nel totale generale', () => {
    const somma = data.groups.reduce((acc, g) => acc + g.subtotal, 0);
    expect(data.grandTotalSale).toBeCloseTo(somma);
  });
});

describe('prepareInternalPdfData', () => {
  const data = prepareInternalPdfData(project, costCenters, materials, labor, expenses);

  it('riporta costo e vendita coerenti con il PDF cliente', () => {
    const cliente = prepareClientPdfData(costCenters, materials, labor, expenses);
    expect(data.summary.grandTotalSale).toBeCloseTo(cliente.grandTotalSale);
  });

  it('calcola il costo vivo complessivo', () => {
    // 1150 (CC) + 172 (cavo) + 20 (consumo) + 240 (ore) + 15 (viaggio) + 450 (spesa)
    expect(data.summary.grandTotalCost).toBeCloseTo(2047);
  });

  it('calcola il margine come differenza fra vendita e costo', () => {
    expect(data.summary.grandMargin).toBeCloseTo(
      data.summary.grandTotalSale - data.summary.grandTotalCost
    );
  });

  it('confronta il budget con il costo per l utile effettivo', () => {
    expect(data.summary.utileEffettivo).toBeCloseTo(3000 - data.summary.grandTotalCost);
  });

  it('totalizza le ore di manodopera', () => {
    expect(data.summary.totalLaborHours).toBe(8);
  });

  it('non produce NaN sul margine quando non ci sono vendite', () => {
    const vuoto = prepareInternalPdfData({ ...project, budget: 0 }, [], [], [], []);
    expect(vuoto.summary.grandMarginPercent).toBe(0);
    expect(vuoto.summary.utileEffettivoPercent).toBe(0);
  });
});

/*
  Esportazione ristretta a un solo centro di costo.

  E' il caso prodotto dal menu "Esporta PDF" dentro un centro di costo: al
  preparatore si passa un elenco di un solo centro e le sole voci che gli
  appartengono. Qui si verifica che il documento che ne esce sia coerente e
  non si porti dietro niente del resto della commessa.
*/
describe('un documento ristretto a un solo centro di costo', () => {
  const secondoCc: CostCenter = {
    id: 20,
    project_id: 1,
    brand: 'ABB',
    model: 'Quadro B',
    category: 'Quadri',
    base_cost: 500,
    markup: 0.1,
    shipping: 0,
    install_fee: 0,
    accepted_budget: 600,
  };

  const materialeAltroCc: Material = {
    id: 3,
    project_id: 1,
    cost_center_id: 20,
    description: 'Cavo del secondo centro',
    quantity: 10,
    unit: 'm',
    unit_price: 2,
    markup: 0.1,
  };

  const tuttiICentri = [...costCenters, secondoCc];
  const tuttiIMateriali = [...materials, materialeAltroCc];

  // Quello che `useFilteredMaterials` consegna con il centro 10 selezionato:
  // solo le sue voci. Le righe senza centro di costo restano fuori, perche'
  // non appartengono a quel centro.
  const materialiDelCentro = tuttiIMateriali.filter(m => m.cost_center_id === 10);

  const completo = prepareClientPdfData(tuttiICentri, tuttiIMateriali, labor, expenses);
  const ristretto = prepareClientPdfData([costCenters[0]], materialiDelCentro, labor, expenses);

  const descrizioni = (dati: { groups: Array<{ rows: Array<readonly string[]> }> }) =>
    dati.groups.flatMap(g => g.rows.map(r => r[1])).join(' | ');

  it('contiene un gruppo solo, invece dei tre del documento completo', () => {
    // Completo: due centri di costo piu' il gruppo delle voci generali.
    expect(completo.groups).toHaveLength(3);
    expect(ristretto.groups).toHaveLength(1);
  });

  it('non riporta le voci degli altri centri di costo', () => {
    expect(descrizioni(ristretto)).toContain('Cavo FG16');
    expect(descrizioni(ristretto)).not.toContain('Cavo del secondo centro');
    expect(descrizioni(completo)).toContain('Cavo del secondo centro');
  });

  it('esclude le voci non assegnate a nessun centro di costo', () => {
    // Conseguenza voluta del filtro: "Materiale di consumo" non ha centro di
    // costo, quindi non appartiene a questo. Nel documento completo c'e'.
    expect(descrizioni(completo)).toContain('Materiale di consumo');
    expect(descrizioni(ristretto)).not.toContain('Materiale di consumo');
  });

  it('il totale e piu basso di quello della commessa intera', () => {
    expect(ristretto.grandTotalSale).toBeGreaterThan(0);
    expect(ristretto.grandTotalSale).toBeLessThan(completo.grandTotalSale);
  });

  it('restringere non sfalsa i conti del centro di costo', () => {
    // Lo stesso centro di costo vale lo stesso, da solo o in mezzo agli
    // altri: e' la prova che passare un sottoinsieme non altera i calcoli.
    expect(ristretto.grandTotalSale).toBeCloseTo(completo.groups[0].subtotal, 2);
    expect(ristretto.groups[0].subtotal).toBeCloseTo(completo.groups[0].subtotal, 2);
  });

  it('anche il report interno resta coerente', () => {
    const internoRistretto = prepareInternalPdfData(project, [costCenters[0]], materialiDelCentro, labor, expenses);
    const internoCompleto = prepareInternalPdfData(project, tuttiICentri, tuttiIMateriali, labor, expenses);

    expect(internoRistretto.summary.grandTotalCost).toBeLessThan(internoCompleto.summary.grandTotalCost);
    expect(internoRistretto.summary.grandTotalSale).toBeLessThan(internoCompleto.summary.grandTotalSale);
    // Il margine resta la differenza fra vendita e costo di CIO' CHE C'E' nel
    // documento, non un residuo di quello completo.
    expect(internoRistretto.summary.grandMargin).toBeCloseTo(
      internoRistretto.summary.grandTotalSale - internoRistretto.summary.grandTotalCost, 2
    );
  });
});
