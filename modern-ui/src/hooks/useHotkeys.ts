/**
 * useHotkeys
 *
 * Registrazione dichiarativa di scorciatoie da tastiera globali.
 *
 * L'applicazione nasce per essere navigata col mouse: questo hook e' la base
 * su cui si appoggiano le scorciatoie che permettono di lavorare senza mai
 * staccare le mani dalla tastiera (Alt+1..5 per le schede, Ctrl+K per la
 * ricerca, Ctrl+N per l'inserimento rapido).
 *
 * Due regole di comportamento, pensate per chi digita a raffica:
 *
 * - **le combinazioni con modificatore funzionano sempre**, anche dentro un
 *   campo di testo: Ctrl+K deve aprire la ricerca anche a meta' descrizione;
 * - **i tasti singoli no**. Premere `?` mentre si scrive una descrizione deve
 *   scrivere un punto interrogativo, non aprire un pannello. Chi vuole il
 *   contrario lo dichiara con `allowInInput`.
 */

import { useEffect, useRef } from 'react';

export interface Hotkey {
  /**
   * Combinazione in forma normalizzata: modificatori in ordine
   * `ctrl+alt+shift+`, poi il tasto in minuscolo.
   * Esempi: `'ctrl+k'`, `'alt+1'`, `'escape'`, `'shift+?'`.
   */
  combo: string;
  handler: (event: KeyboardEvent) => void;
  /** Lascia passare la scorciatoia anche mentre si scrive in un campo. */
  allowInInput?: boolean;
  /** Disattiva questa singola voce senza rimuoverla dall'elenco. */
  enabled?: boolean;
  /** Descrizione mostrata nel pannello delle scorciatoie. */
  description?: string;
}

const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT']);

/** True se il fuoco e' su un campo in cui l'utente sta scrivendo. */
export const isTypingTarget = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;
  if (target.isContentEditable) return true;
  return EDITABLE_TAGS.has(target.tagName);
};

/** Traduce un evento nella forma normalizzata usata da `combo`. */
export const comboFromEvent = (event: KeyboardEvent): string => {
  const parts: string[] = [];
  if (event.ctrlKey || event.metaKey) parts.push('ctrl');
  if (event.altKey) parts.push('alt');
  if (event.shiftKey) parts.push('shift');

  // `event.key` con Alt premuto su alcune tastiere restituisce il carattere
  // alternativo (Alt+1 -> '±' su macOS): `event.code` e' stabile.
  const key = /^Digit\d$/.test(event.code)
    ? event.code.slice(-1)
    : event.key.toLowerCase();

  parts.push(key);
  return parts.join('+');
};

/**
 * Registra le scorciatoie finche' il componente e' montato.
 *
 * L'elenco viene tenuto in un ref: cosi' i gestori possono essere ricreati a
 * ogni render (com'e' normale nei componenti) senza riagganciare il listener.
 */
export const useHotkeys = (hotkeys: Hotkey[], enabled: boolean = true): void => {
  const hotkeysRef = useRef(hotkeys);

  // L'aggiornamento avviene dopo il render, non durante: un ref scritto in
  // fase di render e' un effetto collaterale che React non garantisce.
  useEffect(() => {
    hotkeysRef.current = hotkeys;
  }, [hotkeys]);

  useEffect(() => {
    if (!enabled) return;

    const onKeyDown = (event: KeyboardEvent) => {
      const combo = comboFromEvent(event);
      const typing = isTypingTarget(event.target);
      const hasModifier = event.ctrlKey || event.metaKey || event.altKey;

      for (const hotkey of hotkeysRef.current) {
        if (hotkey.enabled === false) continue;
        if (hotkey.combo !== combo) continue;
        if (typing && !hasModifier && !hotkey.allowInInput) continue;

        event.preventDefault();
        hotkey.handler(event);
        return;
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [enabled]);
};

export default useHotkeys;
