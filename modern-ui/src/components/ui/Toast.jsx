import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, AlertTriangle, X } from 'lucide-react'

/**
 * Notifica temporanea.
 *
 * Sostituisce i `window.alert()` usati per comunicare l'esito delle
 * operazioni: in una finestra WKWebView l'alert e' modale e BLOCCA l'intero
 * processo finche' non viene chiuso, quindi dopo ogni salvataggio l'utente
 * doveva fermarsi a premere "OK". Qui il messaggio compare, informa e sparisce
 * da solo senza interrompere il lavoro.
 */
const Toast = ({ toast, onDismiss, duration = 3200 }) => {
  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(onDismiss, duration)
    return () => window.clearTimeout(timer)
  }, [toast, onDismiss, duration])

  if (!toast || typeof document === 'undefined') return null

  const isError = toast.type === 'error'

  return createPortal(
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[5000] animate-premium-in">
      <div
        className={`flex items-center gap-3 pl-4 pr-3 py-3 rounded-2xl shadow-2xl border ${
          isError
            ? 'bg-red-50 border-red-200 text-red-700'
            : 'bg-[#0f172a] border-slate-800 text-white'
        }`}
        role="status"
      >
        {isError
          ? <AlertTriangle size={18} className="shrink-0 text-red-500" />
          : <CheckCircle2 size={18} className="shrink-0 text-accent" />}
        <span className="text-[0.78rem] font-bold max-w-md">{toast.message}</span>
        <button
          type="button"
          onClick={onDismiss}
          className={`p-1 rounded-lg transition-colors ${isError ? 'text-red-300 hover:text-red-600' : 'text-white/40 hover:text-white'}`}
        >
          <X size={15} />
        </button>
      </div>
    </div>,
    document.body
  )
}

export default React.memo(Toast)
