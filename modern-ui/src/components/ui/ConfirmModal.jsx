import React, { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, X } from 'lucide-react'

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, confirmText = "Elimina", cancelText = "Annulla", type = "danger" }) => {
  /*
    Esc annulla.

    PERCHE' SERVE
    -------------
    Questa finestra ha preso il posto di `window.confirm`, che si chiudeva con
    Esc: senza, l'unica via d'uscita e' il mouse, e per un'azione distruttiva
    e' un passo indietro rispetto a quello che si e' sostituito.

    L'hook sta prima del `return` anticipato: le regole degli hook vietano di
    chiamarli condizionalmente.
  */
  useEffect(() => {
    if (!isOpen || typeof document === 'undefined') return undefined

    const alTasto = (evento) => {
      if (evento.key === 'Escape') {
        evento.preventDefault()
        onClose?.()
      }
    }

    document.addEventListener('keydown', alTasto)
    return () => document.removeEventListener('keydown', alTasto)
  }, [isOpen, onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          {/* Backdrop */}
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />

          {/* Modal */}
          <motion.div
            // `role`/`aria-modal` mancavano: per un lettore di schermo questa
            // finestra era un div qualsiasi in mezzo alla pagina, mentre
            // `window.confirm`, che ha sostituito, veniva annunciato.
            role="dialog"
            aria-modal="true"
            aria-label={title}
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="relative w-full max-w-md bg-white/90 backdrop-blur-xl rounded-[2.5rem] border border-white/50 shadow-2xl overflow-hidden"
          >
            <div className="p-8">
              <div className="flex justify-between items-start mb-6">
                <div className={`p-4 rounded-2xl ${type === 'danger' ? 'bg-rose-50 text-rose-500' : 'bg-amber-50 text-amber-500'}`}>
                  <AlertTriangle size={24} />
                </div>
                <button onClick={onClose} className="p-2 text-slate-300 hover:text-slate-500 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">
                {title}
              </h3>
              <p className="text-sm font-bold text-slate-500 leading-relaxed">
                {message}
              </p>
            </div>

            <div className="p-8 bg-slate-50/50 flex gap-4">
              <button 
                onClick={onClose}
                className="flex-1 py-4 bg-white border border-slate-200 text-slate-500 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-slate-100 transition-all"
              >
                {cancelText}
              </button>
              <button 
                onClick={() => {
                  onConfirm()
                  onClose()
                }}
                className={`flex-1 py-4 text-white rounded-2xl text-[0.7rem] font-black uppercase tracking-widest transition-all shadow-xl ${
                  type === 'danger' 
                  ? 'bg-accent hover:bg-accent/90 shadow-accent/20' 
                  : 'bg-amber-500 hover:bg-amber-600 shadow-amber-500/20'
                }`}
              >
                {confirmText}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  )
}

export default ConfirmModal
