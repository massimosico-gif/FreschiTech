/**
 * usePendingBulkAction
 *
 * Azione massiva differita con conto alla rovescia annullabile: l'utente
 * sceglie il centro di costo o l'ambito di destinazione, ha qualche secondo
 * per annullare, poi l'operazione parte.
 *
 * La stessa logica (stato pending, intervallo, cleanup del timer, esecuzione
 * con gli id catturati al momento della scelta) era duplicata per intero fra
 * MaterialsTab e LaborTab, per un totale di circa 240 righe.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

const DEFAULT_COUNTDOWN_SECONDS = 5;

/** Descrive l'operazione in attesa, per il banner di annullamento. */
export interface PendingAction<TPayload> {
  /** Discriminante scelto dal chiamante, es. 'move' o 'phase'. */
  type: string;
  /** Righe coinvolte, catturate quando l'utente ha confermato la scelta. */
  ids: number[];
  /** Dati specifici dell'operazione (centro di costo, fase, etichette). */
  payload: TPayload;
}

export interface UsePendingBulkActionResult<TPayload> {
  pending: PendingAction<TPayload> | null;
  countdown: number;
  /** Avvia il conto alla rovescia per l'operazione indicata. */
  schedule: (type: string, ids: number[], payload: TPayload) => void;
  /** Annulla l'operazione in attesa. */
  cancel: () => void;
  /** Esegue subito l'operazione, senza attendere la fine del countdown. */
  runNow: () => void;
}

/**
 * @param execute  Cosa fare allo scadere del countdown. Riceve l'azione
 *                 completa, cosi' che gli id non dipendano dallo stato
 *                 corrente della selezione (che nel frattempo viene svuotata).
 * @param seconds  Secondi di attesa prima dell'esecuzione.
 */
export const usePendingBulkAction = <TPayload,>(
  execute: (action: PendingAction<TPayload>) => void | Promise<void>,
  seconds: number = DEFAULT_COUNTDOWN_SECONDS
): UsePendingBulkActionResult<TPayload> => {
  const [pending, setPending] = useState<PendingAction<TPayload> | null>(null);
  const [countdown, setCountdown] = useState(seconds);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // `execute` e' spesso una arrow ricreata a ogni render: tenerla in un ref
  // evita di dover riavviare il timer quando cambia identita'. Il ref si
  // aggiorna in un effetto, non durante il render.
  const executeRef = useRef(execute);
  useEffect(() => {
    executeRef.current = execute;
  }, [execute]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  // Il timer non deve sopravvivere allo smontaggio del componente.
  useEffect(() => stopTimer, [stopTimer]);

  const fire = useCallback(
    (action: PendingAction<TPayload>) => {
      stopTimer();
      setPending(null);
      void executeRef.current(action);
    },
    [stopTimer]
  );

  const schedule = useCallback(
    (type: string, ids: number[], payload: TPayload) => {
      if (ids.length === 0) return;

      const action: PendingAction<TPayload> = { type, ids: [...ids], payload };
      stopTimer();
      setPending(action);
      setCountdown(seconds);

      let remaining = seconds;
      timerRef.current = setInterval(() => {
        remaining -= 1;
        if (remaining <= 0) {
          fire(action);
        } else {
          setCountdown(remaining);
        }
      }, 1000);
    },
    [fire, seconds, stopTimer]
  );

  const cancel = useCallback(() => {
    stopTimer();
    setPending(null);
  }, [stopTimer]);

  const runNow = useCallback(() => {
    if (pending) fire(pending);
  }, [fire, pending]);

  return { pending, countdown, schedule, cancel, runNow };
};

export default usePendingBulkAction;
