import { describe, expect, it } from 'vitest'

import { nomeFile, unisciFatture } from './fattureMultiple'

/** Riga come la restituisce `parse_invoice_xml`, con gli id che ripartono da 0. */
const riga = (id, descrizione) => ({
  id,
  invoice_item: {
    line_number: String(id + 1),
    code_alternativo: null,
    code_produttore: null,
    description: descrizione,
    quantity: 1,
    unit: 'pz',
    unit_price: 10,
    total_price: 10
  },
  suggested_item: null,
  match_score: 0,
  action: 'create',
  selected_catalog_item_id: null,
  custom_code: '',
  markup: 0.15
})

describe('nomeFile', () => {
  it('spezza i percorsi Windows', () => {
    expect(nomeFile('C:\\Users\\tizio\\Fatture\\IT001.xml')).toBe('IT001.xml')
  })

  it('spezza anche quelli Unix', () => {
    expect(nomeFile('/Users/tizio/Fatture/IT001.xml')).toBe('IT001.xml')
  })
})

describe('unisciFatture', () => {
  const primaFattura = { supplier: 'Rossi SpA', rows: [riga(0, 'Tubo'), riga(1, 'Raccordo')] }
  const secondaFattura = { supplier: 'Bianchi Srl', rows: [riga(0, 'Tubo')] }

  it('rinumera gli id su tutto l insieme', () => {
    // Entrambe le fatture hanno una riga con id 0: unite senza rinumerare,
    // agire su una riga ne cambierebbe un'altra.
    const { righe } = unisciFatture([
      { percorso: 'a/IT001.xml', result: primaFattura },
      { percorso: 'a/IT002.xml', result: secondaFattura }
    ])

    expect(righe.map(r => r.id)).toEqual([0, 1, 2])
    expect(new Set(righe.map(r => r.id)).size).toBe(righe.length)
  })

  it('attacca a ogni riga il fornitore della propria fattura', () => {
    const { righe } = unisciFatture([
      { percorso: 'a/IT001.xml', result: primaFattura },
      { percorso: 'a/IT002.xml', result: secondaFattura }
    ])

    expect(righe.map(r => r.supplier)).toEqual(['Rossi SpA', 'Rossi SpA', 'Bianchi Srl'])
    expect(righe.map(r => r.invoiceRow.supplier)).toEqual(['Rossi SpA', 'Rossi SpA', 'Bianchi Srl'])
  })

  it('distingue due righe identiche dal file di provenienza', () => {
    const { righe } = unisciFatture([
      { percorso: 'a/IT001.xml', result: primaFattura },
      { percorso: 'a/IT002.xml', result: secondaFattura }
    ])

    const tubi = righe.filter(r => r.invoiceRow.description === 'Tubo')
    expect(tubi).toHaveLength(2)
    expect(tubi.map(r => r.sourceFile)).toEqual(['IT001.xml', 'IT002.xml'])
  })

  it('una fattura illeggibile non fa perdere le altre', () => {
    const { righe, sorgenti } = unisciFatture([
      { percorso: 'a/rotta.xml', error: 'XML malformato' },
      { percorso: 'a/IT001.xml', result: primaFattura }
    ])

    expect(righe).toHaveLength(2)
    expect(righe.every(r => r.sourceFile === 'IT001.xml')).toBe(true)
    expect(sorgenti[0]).toMatchObject({ file: 'rotta.xml', count: 0, supplier: null })
    expect(sorgenti[0].error).toContain('XML malformato')
    expect(sorgenti[1]).toMatchObject({ file: 'IT001.xml', supplier: 'Rossi SpA', count: 2, error: null })
  })

  it('gli id restano contigui anche con un file illeggibile in mezzo', () => {
    const { righe } = unisciFatture([
      { percorso: 'a/IT001.xml', result: primaFattura },
      { percorso: 'a/rotta.xml', error: 'illeggibile' },
      { percorso: 'a/IT002.xml', result: secondaFattura }
    ])

    expect(righe.map(r => r.id)).toEqual([0, 1, 2])
  })

  it('una fattura senza cedente ricade sul fornitore generico', () => {
    const { righe, sorgenti } = unisciFatture([
      { percorso: 'a/IT003.xml', result: { supplier: '', rows: [riga(0, 'Tubo')] } }
    ])

    expect(righe[0].supplier).toBe('Fornitore Generico')
    expect(sorgenti[0].supplier).toBe('Fornitore Generico')
  })

  it('una fattura senza righe resta nel riepilogo, a zero', () => {
    // Va mostrata comunque: e' il modo di accorgersi di aver preso un file
    // che non contiene articoli.
    const { righe, sorgenti } = unisciFatture([
      { percorso: 'a/vuota.xml', result: { supplier: 'Rossi SpA', rows: [] } }
    ])

    expect(righe).toHaveLength(0)
    expect(sorgenti[0]).toMatchObject({ file: 'vuota.xml', supplier: 'Rossi SpA', count: 0, error: null })
  })

  it('conserva il ricarico, e lo azzera solo quando manca', () => {
    const conRicarico = riga(0, 'Tubo')
    const senzaRicarico = { ...riga(1, 'Raccordo'), markup: null }
    const { righe } = unisciFatture([
      { percorso: 'a/IT001.xml', result: { supplier: 'Rossi SpA', rows: [conRicarico, senzaRicarico] } }
    ])

    expect(righe[0].markup).toBe(0.15)
    expect(righe[1].markup).toBe(0.0)
  })
})
