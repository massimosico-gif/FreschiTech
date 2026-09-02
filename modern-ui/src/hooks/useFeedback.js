import { createContext, useContext } from 'react'

/**
 * Contesto di notifiche e conferme. Il valore viene fornito da
 * `components/ui/FeedbackProvider`; qui vivono solo il contesto e gli hook,
 * perche' un file che esporta sia componenti sia funzioni rompe il fast
 * refresh di Vite.
 */
export const FeedbackContext = createContext(null)

const useFeedback = () => {
  const context = useContext(FeedbackContext)
  if (!context) {
    throw new Error('useToast/useConfirm richiedono <FeedbackProvider> a monte.')
  }
  return context
}

/** Notifiche temporanee: `toast.success(...)`, `toast.error(...)`. */
export const useToast = () => useFeedback().toast

/**
 * Conferma con attesa: `if (!(await confirm({ ... }))) return`.
 *
 * Restituisce una Promise<boolean>, così il chiamante mantiene il flusso
 * lineare che aveva con `window.confirm` invece di spezzarsi in callback.
 */
export const useConfirm = () => useFeedback().confirm
