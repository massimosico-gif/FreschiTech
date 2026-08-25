/**
 * usePhaseOptions
 *
 * Carica l'elenco delle fasi dalle impostazioni globali e ne consente
 * l'aggiunta.
 *
 * Le tre copie precedenti (`handleAddNewPhase` e `handleAddNewPhaseForBox` in
 * MaterialsTab, `handleAddNewPhase` in LaborTab) erano identiche a meno della
 * chiave di impostazione e della setState finale.
 */

import { useCallback, useEffect, useState } from 'react';
import { invoke } from '@tauri-apps/api/core';

export interface PhaseOption {
  id: string;
  label: string;
}

/** Voce sintetica per "nessun filtro di fase". */
export const ALL_PHASES: PhaseOption = { id: 'all', label: 'Tutte le Fasi' };

/** Fase implicita delle voci senza ambito assegnato. */
export const DEFAULT_PHASE = 'Generale';

/** Chiave dell'elenco fasi dentro `global_settings`. */
export type PhaseSettingsKey = 'phases_material' | 'phases_labor';

export interface UsePhaseOptionsResult {
  /** Fasi configurate, senza la voce "Tutte le Fasi". */
  phases: string[];
  /** Opzioni per i filtri: include "Tutte le Fasi" in testa. */
  filterOptions: PhaseOption[];
  /** Opzioni per i form: mai vuoto, ricade su "Generale". */
  inputOptions: PhaseOption[];
  /**
   * Aggiunge una fase alle impostazioni globali. Restituisce il nome
   * normalizzato, oppure null se il nome era vuoto o il salvataggio e' fallito.
   */
  addPhase: (name: string) => Promise<string | null>;
}

export const usePhaseOptions = (key: PhaseSettingsKey): UsePhaseOptionsResult => {
  const [phases, setPhases] = useState<string[]>([]);

  useEffect(() => {
    let active = true;

    invoke<Record<string, unknown>>('get_global_settings')
      .then((settings) => {
        if (!active) return;
        const list = settings?.[key];
        if (Array.isArray(list) && list.length > 0) {
          setPhases(list.map(String));
        }
      })
      .catch((err) => console.error('Errore caricamento fasi:', err));

    return () => {
      active = false;
    };
  }, [key]);

  const addPhase = useCallback(
    async (name: string): Promise<string | null> => {
      const trimmed = name.trim();
      if (!trimmed) return null;

      try {
        // Rilettura prima della scrittura: `save_global_settings` fa un upsert
        // per chiave, ma partire dalle impostazioni correnti evita di
        // sovrascrivere fasi aggiunte altrove nel frattempo.
        const settings = await invoke<Record<string, unknown>>('get_global_settings');
        const current = Array.isArray(settings?.[key])
          ? (settings[key] as unknown[]).map(String)
          : [];

        if (current.includes(trimmed)) {
          setPhases(current);
          return trimmed;
        }

        const updated = [...current, trimmed];
        await invoke('save_global_settings', {
          settings: { ...settings, [key]: updated },
        });
        setPhases(updated);
        return trimmed;
      } catch (err) {
        console.error('Errore nel salvataggio della nuova fase:', err);
        alert('Impossibile salvare la nuova fase: ' + err);
        return null;
      }
    },
    [key]
  );

  const filterOptions: PhaseOption[] = [
    ALL_PHASES,
    ...phases.map((p) => ({ id: p, label: p })),
  ];

  const inputOptions: PhaseOption[] =
    phases.length > 0
      ? phases.map((p) => ({ id: p, label: p }))
      : [{ id: DEFAULT_PHASE, label: DEFAULT_PHASE }];

  return { phases, filterOptions, inputOptions, addPhase };
};

export default usePhaseOptions;
