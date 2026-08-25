import { describe, expect, it } from 'vitest';

import { validateTaxCode, validateVAT } from './validation';

describe('validateVAT', () => {
  it('accetta una partita IVA con check digit corretto', () => {
    // Partite IVA reali di enti pubblici, usate come casi noti validi.
    expect(validateVAT('00743110157')).toBe(true); // Comune di Milano
    expect(validateVAT('02438750586')).toBe(true); // Comune di Roma
  });

  it('rifiuta un check digit sbagliato', () => {
    expect(validateVAT('00743110158')).toBe(false);
  });

  it('rifiuta lunghezze diverse da 11 cifre', () => {
    expect(validateVAT('0074311015')).toBe(false);
    expect(validateVAT('007431101570')).toBe(false);
  });

  it('rifiuta caratteri non numerici', () => {
    expect(validateVAT('0074311015A')).toBe(false);
  });

  it('considera valido il campo vuoto: la partita IVA e facoltativa', () => {
    expect(validateVAT('')).toBe(true);
    expect(validateVAT(null)).toBe(true);
    expect(validateVAT(undefined)).toBe(true);
  });
});

describe('validateTaxCode', () => {
  it('accetta un codice fiscale con carattere di controllo corretto', () => {
    expect(validateTaxCode('RSSMRA80A01L736U')).toBe(true);
  });

  it('non e sensibile al maiuscolo/minuscolo', () => {
    expect(validateTaxCode('rssmra80a01l736u')).toBe(true);
  });

  it('rifiuta un carattere di controllo sbagliato', () => {
    expect(validateTaxCode('RSSMRA80A01L736A')).toBe(false);
  });

  it('rifiuta lunghezze diverse da 16 caratteri', () => {
    expect(validateTaxCode('RSSMRA80A01L736')).toBe(false);
  });

  it('rifiuta i caratteri non alfanumerici', () => {
    expect(validateTaxCode('RSSMRA80A01L736-')).toBe(false);
  });

  it('considera valido il campo vuoto: il codice fiscale e facoltativo', () => {
    expect(validateTaxCode('')).toBe(true);
    expect(validateTaxCode(null)).toBe(true);
  });
});
