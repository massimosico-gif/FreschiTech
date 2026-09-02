import React from 'react'
import { Loader2 } from 'lucide-react'

const LoadingOverlay = ({ message = 'Operazione in corso...' }) => {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/10 backdrop-blur-[2px] animate-fade-in">
      <div className="bg-white/90 backdrop-blur-md p-8 rounded-[2.5rem] shadow-2xl border border-white/60 flex flex-col items-center gap-6 animate-premium-in">
        <div className="relative">
          <div className="w-16 h-16 rounded-full border-4 border-[#8bc53f]/10"></div>
          <Loader2 className="absolute inset-0 text-[#8bc53f] animate-spin" size={64} />
        </div>
        <div className="text-center space-y-1">
          <p className="text-[0.75rem] font-black uppercase tracking-[0.3em] text-[#8bc53f]">{message}</p>
          <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest">Attendere prego</p>
        </div>
      </div>
    </div>
  )
}

export default LoadingOverlay
