import React from 'react'

/**
 * Rappresentazione di un tasto della tastiera.
 *
 * Serve a rendere visibili le scorciatoie nel punto in cui si usano: una
 * scorciatoia che nessuno sa che esiste non fa risparmiare tempo a nessuno.
 */
const Kbd = ({ children, className = '' }) => (
  <kbd
    className={`inline-flex items-center justify-center min-w-[1.6rem] px-1.5 py-0.5 rounded-md border border-slate-300/80 bg-white/80 text-[0.7rem] font-bold leading-none text-slate-500 shadow-[0_1px_0_rgba(15,23,42,0.12)] ${className}`}
  >
    {children}
  </kbd>
)

export default Kbd
