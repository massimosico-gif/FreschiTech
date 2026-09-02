/**
 * useAutocomplete
 *
 * Stato condiviso per i campi con suggerimenti (codice, descrizione,
 * fornitore) di MaterialsTab e Quotes.
 *
 * Sostituisce sei gestori quasi identici e risolve due problemi che avevano
 * tutti:
 *
 * - **nessun debounce**: ogni carattere digitato lanciava una `invoke`, che sul
 *   catalogo esegue una UNION sull'intera tabella `materials`;
 * - **race condition**: le risposte fuori ordine potevano sovrascrivere i
 *   suggerimenti con i risultati di una ricerca precedente. Ogni richiesta ha
 *   ora un token progressivo e solo l'ultima puo' aggiornare lo stato.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

import type { CatalogMaterial } from '../types';

/** Tipo di ricerca: determina il comando backend e la forma dei risultati. */
export type AutocompleteKind = 'catalog' | 'supplier';

/** Un suggerimento: articolo di listino oppure nome di fornitore. */
export type Suggestion = CatalogMaterial | string;

const DEFAULT_DEBOUNCE_MS = 250;

/** Lunghezza minima della query, per tipo di ricerca. */
const MIN_QUERY_LENGTH: Record<AutocompleteKind, number> = {
  catalog: 2,
  supplier: 1,
};

const COMMAND: Record<AutocompleteKind, string> = {
  catalog: 'search_catalog_materials',
  supplier: 'search_suppliers',
};

export interface UseAutocompleteResult {
  /** Risultati dell'ultima ricerca conclusa. */
  suggestions: Suggestion[];
  /** Campo che sta mostrando la tendina, oppure null. */
  activeField: string | null;
  /** Indice evidenziato per la navigazione da tastiera. */
  highlightedIndex: number;
  setHighlightedIndex: (index: number) => void;
  /** Avvia una ricerca per il campo indicato (debounced). */
  requestSuggestions: (field: string, query: string, kind: AutocompleteKind) => void;
  /** Chiude la tendina e annulla le richieste in volo. */
  clear: () => void;
  /**
   * Gestisce frecce, Invio, Tab ed Escape. Restituisce true se l'evento e'
   * stato consumato, cosi' il chiamante sa di non doverlo processare oltre.
   */
  handleKeyDown: (
    event: React.KeyboardEvent,
    field: string,
    onSelect: (item: Suggestion) => void
  ) => boolean;
}

export const useAutocomplete = (
  debounceMs: number = DEFAULT_DEBOUNCE_MS
): UseAutocompleteResult => {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [activeField, setActiveField] = useState<string | null>(null);
  const [highlightedIndex, setHighlightedIndex] = useState(0);

  // Token dell'ultima richiesta emessa: le risposte piu' vecchie vengono
  // ignorate anche se arrivano dopo.
  const requestToken = useRef(0);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPending = useCallback(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
      debounceTimer.current = null;
    }
    requestToken.current += 1;
  }, []);

  const clear = useCallback(() => {
    cancelPending();
    setSuggestions([]);
    setActiveField(null);
  }, [cancelPending]);

  // Evita di lasciare timer appesi quando il componente viene smontato.
  useEffect(() => cancelPending, [cancelPending]);

  const requestSuggestions = useCallback(
    (field: string, query: string, kind: AutocompleteKind) => {
      cancelPending();

      const trimmed = query.trim();
      if (trimmed.length < MIN_QUERY_LENGTH[kind]) {
        setSuggestions([]);
        setActiveField(null);
        return;
      }

      const token = requestToken.current;

      debounceTimer.current = setTimeout(() => {
        invoke<Suggestion[]>(COMMAND[kind], { query: trimmed })
          .then((results) => {
            if (token !== requestToken.current) return; // risposta superata
            setSuggestions(results);
            setActiveField(field);
            setHighlightedIndex(0);
          })
          .catch((err) => {
            if (token !== requestToken.current) return;
            console.error(`Errore ricerca (${kind}):`, err);
            setSuggestions([]);
            setActiveField(null);
          });
      }, debounceMs);
    },
    [cancelPending, debounceMs]
  );

  const handleKeyDown = useCallback(
    (
      event: React.KeyboardEvent,
      field: string,
      onSelect: (item: Suggestion) => void
    ): boolean => {
      if (activeField !== field || suggestions.length === 0) return false;

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault();
          setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
          return true;
        case 'ArrowUp':
          event.preventDefault();
          setHighlightedIndex(
            (prev) => (prev - 1 + suggestions.length) % suggestions.length
          );
          return true;
        case 'Enter': {
          event.preventDefault();
          const picked = suggestions[highlightedIndex];
          if (picked !== undefined) onSelect(picked);
          return true;
        }
        case 'Tab': {
          // Tab accetta il suggerimento evidenziato e *lascia proseguire* il
          // fuoco al campo successivo: selezionare un articolo di listino
          // riempie codice, descrizione, unita', prezzo e fornitore, quindi
          // fermarsi su questo campo non servirebbe a nulla.
          // Shift+Tab torna indietro senza applicare niente.
          if (event.shiftKey) {
            clear();
            return false;
          }
          const picked = suggestions[highlightedIndex];
          if (picked !== undefined) onSelect(picked);
          return true;
        }
        case 'Escape':
          event.preventDefault();
          clear();
          return true;
        default:
          return false;
      }
    },
    [activeField, suggestions, highlightedIndex, clear]
  );

  return {
    suggestions,
    activeField,
    highlightedIndex,
    setHighlightedIndex,
    requestSuggestions,
    clear,
    handleKeyDown,
  };
};

export default useAutocomplete;
