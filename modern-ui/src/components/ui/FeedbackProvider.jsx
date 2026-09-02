import { useCallback, useMemo, useRef, useState } from 'react'
import Toast from './Toast'
import ConfirmModal from './ConfirmModal'
import { FeedbackContext } from '../../hooks/useFeedback'

/**
 * Notifiche e conferme, in un punto solo.
 *
 * PERCHE' ESISTE
 * --------------
 * Le due funzioni native del browser erano ancora usate in sei componenti:
 *
 *   - `window.alert` in una finestra WKWebView e' MODALE sul processo: blocca
 *     il rendering finche' l'utente non preme OK, e non somiglia a nulla del
 *     resto dell'interfaccia;
 *   - `window.confirm` ha lo stesso problema e in piu' non permette di
 *     distinguere un'azione distruttiva da una innocua.
 *
 * `Toast` e `ConfirmModal` esistevano gia', ma erano usati solo in due punti
 * perche' ognuno richiedeva stato locale nel componente chiamante. Qui lo
 * stato e' unico e i chiamanti usano `useToast` / `useConfirm`.
 */
const FeedbackProvider = ({ children }) => {
  const [toastState, setToastState] = useState(null)
  const [confirmState, setConfirmState] = useState(null)
  const resolverRef = useRef(null)

  const dismissToast = useCallback(() => setToastState(null), [])

  const toast = useMemo(() => {
    const show = (type) => (message) =>
      setToastState({ type, message: String(message ?? '') })
    return { success: show('success'), error: show('error') }
  }, [])

  /**
   * Chiude la conferma risolvendo la Promise.
   *
   * Il pulsante di conferma di `ConfirmModal` invoca `onConfirm` e subito dopo
   * `onClose`, quindi `settle` viene chiamata due volte di fila. L'esito e'
   * comunque corretto — risolvere una Promise gia' risolta non ha effetto —
   * ma il riferimento viene azzerato ugualmente: cosi' la `confirm` successiva
   * non trova un resolver esaurito da annullare e il closure non resta vivo.
   */
  const settle = useCallback((value) => {
    const resolve = resolverRef.current
    resolverRef.current = null
    setConfirmState(null)
    if (resolve) resolve(value)
  }, [])

  const confirm = useCallback((options = {}) => new Promise((resolve) => {
    // Una conferma ancora aperta viene considerata annullata: mai lasciare
    // una Promise sospesa per sempre.
    if (resolverRef.current) resolverRef.current(false)
    resolverRef.current = resolve
    setConfirmState(options)
  }), [])

  const value = useMemo(() => ({ toast, confirm }), [toast, confirm])

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Toast toast={toastState} onDismiss={dismissToast} />
      <ConfirmModal
        isOpen={Boolean(confirmState)}
        title={confirmState?.title}
        message={confirmState?.message}
        confirmText={confirmState?.confirmLabel}
        cancelText={confirmState?.cancelLabel}
        type={confirmState?.type}
        onConfirm={() => settle(true)}
        onClose={() => settle(false)}
      />
    </FeedbackContext.Provider>
  )
}

export default FeedbackProvider
