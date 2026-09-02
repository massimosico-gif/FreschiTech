import React from 'react'
import { Plus, Search } from 'lucide-react'
import Kbd from './ui/Kbd'

const Header = ({ view, onOpenSearch, onQuickEntry }) => {
  const getBreadcrumb = () => {
    switch(view) {
      case 'dashboard': return 'Dashboard'
      case 'clients': return 'Clienti'
      case 'projects': return 'Commesse'
      // Prima ricadeva nel ramo generico e usciva «Project Details».
      case 'project_details': return 'Commessa'
      case 'team': return 'Squadra'
      case 'settings': return 'Impostazioni'
      case 'quotes': return 'Preventivi (Fase di Test)'
      default: return view.replace('_', ' ')
    }
  }

  return (
    <header className="h-32 flex items-center justify-between gap-6 px-12 pt-12 bg-transparent">
      <div className="flex flex-col">
        <span className="text-slate-500 text-[0.7rem] font-black uppercase tracking-[0.2em] mb-1">
          FreschiTech
        </span>
        <h2 className="text-2xl font-black capitalize text-[#0f172a] tracking-tight">
          {getBreadcrumb()}
        </h2>
      </div>

      {/* Le due azioni che si usano di continuo, con la loro scorciatoia
          scritta accanto: e' cosi' che smette di servire il mouse. */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onOpenSearch}
          className="flex items-center gap-3 pl-4 pr-3 py-2.5 rounded-2xl bg-white/60 hover:bg-white border border-white/60 text-slate-500 hover:text-slate-700 shadow-sm transition-colors cursor-pointer"
        >
          <Search size={16} />
          <span className="text-[0.8rem] font-semibold hidden sm:inline">Cerca…</span>
          <Kbd className="hidden sm:inline-flex">Ctrl K</Kbd>
        </button>

        <button
          type="button"
          onClick={onQuickEntry}
          className="flex items-center gap-2.5 pl-4 pr-3 py-2.5 rounded-2xl bg-accent text-white shadow-md shadow-accent/20 hover:bg-accent/90 transition-colors cursor-pointer"
        >
          <Plus size={16} />
          <span className="text-[0.8rem] font-bold hidden sm:inline">Inserimento rapido</span>
          <Kbd className="hidden sm:inline-flex border-white/40 bg-white/15 text-white/90 shadow-none">Ctrl N</Kbd>
        </button>
      </div>
    </header>
  )
}

export default Header
