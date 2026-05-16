import React from 'react'

const Header = ({ view }) => {
  const getBreadcrumb = () => {
    switch(view) {
      case 'dashboard': return 'Dashboard'
      case 'settings': return 'Impostazioni'
      default: return view.replace('_', ' ')
    }
  }

  return (
    <header className="h-32 flex items-center justify-between px-12 pt-12 bg-transparent">
      <div className="flex flex-col">
        <span className="text-[#64748b] text-[0.65rem] font-black uppercase tracking-[0.3em] mb-1 opacity-50">
          FreschiTech App
        </span>
        <h2 className="text-2xl font-black capitalize text-[#0f172a] tracking-tight">
          {getBreadcrumb()}
        </h2>
      </div>
      <div className="glass-panel px-6 py-2 rounded-full shadow-sm text-[0.7rem] font-black uppercase tracking-widest text-[#64748b]">
        v1.0 Modern UI
      </div>
    </header>
  )
}

export default Header
