import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

const DrawerShell = ({ isOpen, onClose, title, subtitle, icon, children, footer, width = 'max-w-2xl' }) => {
  const [isAnimating, setIsAnimating] = useState(false)
  const [isRendered, setIsRendered] = useState(isOpen)

  useEffect(() => {
    let timer;
    if (isOpen) {
      document.body.style.overflow = 'hidden'
      setIsRendered(true)
      // A delay of 50ms ensures that the browser has fully rendered the drawer
      // in its off-screen position (translate-x-full) before launching the sliding transition.
      timer = setTimeout(() => setIsAnimating(true), 50)
    } else {
      setIsAnimating(false)
      // A delay of 750ms matches the 700ms sliding transition duration,
      // ensuring that the drawer is fully out of sight before it is unmounted.
      timer = setTimeout(() => {
        setIsRendered(false)
        document.body.style.overflow = ''
      }, 750)
    }

    return () => {
      if (timer) clearTimeout(timer)
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isRendered) return null

  return createPortal(
    <div className={`fixed inset-0 z-[250] overflow-hidden ${isAnimating ? 'pointer-events-auto' : 'pointer-events-none'}`}>
      <div 
        className={`fixed inset-0 bg-slate-900/40 backdrop-blur-xl transition-opacity duration-500 transform-gpu ${isAnimating ? 'opacity-100' : 'opacity-0'}`} 
        onClick={onClose} 
      />
      
      <div className={`fixed right-0 top-0 bottom-0 w-full ${width} bg-white/70 backdrop-blur-[40px] shadow-2xl border-l border-white/40 flex flex-col transition-transform duration-700 ease-in-out transform-gpu ${isAnimating ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="h-1.5 w-full bg-gradient-to-r from-transparent via-accent to-transparent"></div>

        <div className="p-10 pb-6 flex justify-between items-start">
          <div className="flex items-center gap-5">
            {icon && (
              <div className="p-5 bg-white rounded-[2rem] shadow-sm text-accent border border-white">
                {icon}
              </div>
            )}
            <div>
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">{title}</h2>
              {subtitle && <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-slate-400 mt-1">{subtitle}</p>}
            </div>
          </div>
          <button onClick={onClose} className="p-3 hover:bg-slate-100 rounded-2xl transition-colors text-slate-400 hover:text-slate-600">
            <X size={24} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-10 py-6 space-y-10 no-scrollbar pb-10">
          {children}
        </div>

        {footer && (
          <div className="p-10 bg-white/40 backdrop-blur-xl border-t border-white/60 flex gap-5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

export default DrawerShell
