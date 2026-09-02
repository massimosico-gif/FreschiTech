import { useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

/** Comune italiano restituito da `search_municipalities`. */
export interface Municipality {
  nome: string;
  cap: string[];
  sigla: string;
}

export interface UseMunicipalitySearchResult {
  results: Municipality[];
  loading: boolean;
}

/**
 * Ricerca comuni con debounce di 300 ms.
 *
 * Le risposte fuori ordine vengono scartate: senza il controllo su `active`
 * una richiesta lenta poteva sovrascrivere i risultati di una piu' recente.
 */
export const useMunicipalitySearch = (query: string): UseMunicipalitySearchResult => {
  const [results, setResults] = useState<Municipality[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);

    const timer = setTimeout(() => {
      invoke<Municipality[]>('search_municipalities', { query })
        .then((data) => {
          if (!active) return;
          setResults(data);
          setLoading(false);
        })
        .catch((err) => {
          if (!active) return;
          console.error('Autocomplete error:', err);
          setLoading(false);
        });
    }, 300);

    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [query]);

  return { results, loading };
};

export default useMunicipalitySearch;
