import { describe, expect, it } from 'vitest'

import { frammentoNome, nomeFilePdf } from './nomiFile'

describe('frammentoNome', () => {
  it('sostituisce gli spazi con underscore', () => {
    expect(frammentoNome('Stalla Rossi 2')).toBe('Stalla_Rossi_2')
  })

  it('toglie i caratteri che Windows non ammette', () => {
    // Un modello come `A5 1/2"` e' plausibile, e romperebbe il salvataggio.
    expect(frammentoNome('A5 1/2"')).toBe('A5_12')
    expect(frammentoNome('Cc: prova*?<>|\\')).toBe('Cc_prova')
  })

  it('non lascia punti in coda, che Windows rimuove', () => {
    expect(frammentoNome('Lely A5...')).toBe('Lely_A5')
  })

  it('un testo assente non diventa "undefined"', () => {
    expect(frammentoNome(undefined)).toBe('')
    expect(frammentoNome(null)).toBe('')
  })
})

describe('nomeFilePdf', () => {
  const commessa = { name: 'Stalla Rossi' }

  it('senza centro di costo nomina la commessa', () => {
    expect(nomeFilePdf(commessa, null, 'Cliente')).toBe('Commessa_Stalla_Rossi_Cliente.pdf')
  })

  it('con un centro di costo lo mette nel nome', () => {
    // Senza questo, le due esportazioni si sovrascriverebbero a vicenda.
    expect(nomeFilePdf(commessa, { brand: 'Lely', model: 'A5' }, 'ReportInterno'))
      .toBe('Commessa_Stalla_Rossi_CC_Lely_A5_ReportInterno.pdf')
  })

  it('un centro di costo senza marca usa il solo modello', () => {
    expect(nomeFilePdf(commessa, { model: 'A5' }, 'Cliente'))
      .toBe('Commessa_Stalla_Rossi_CC_A5_Cliente.pdf')
  })

  it('un centro di costo senza marca ne modello non aggiunge un CC vuoto', () => {
    expect(nomeFilePdf(commessa, { brand: '', model: '' }, 'Cliente'))
      .toBe('Commessa_Stalla_Rossi_Cliente.pdf')
  })

  it('una commessa senza nome non produce un nome file vuoto', () => {
    expect(nomeFilePdf({ name: '' }, null, 'Cliente')).toBe('Commessa_Commessa_Cliente.pdf')
  })
})
