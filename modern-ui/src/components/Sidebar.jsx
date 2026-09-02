import React from 'react'
import {
  LayoutDashboard,
  Users,
  Briefcase,
  Settings,
  FileText,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react'

/**
 * Barra di navigazione laterale.
 *
 * Si espande **al click**, non al passaggio del mouse. Prima bastava sfiorare
 * il bordo sinistro perche' si aprisse spingendo tutto il contenuto di 13rem:
 * chi stava digitando in una tabella si vedeva scappare la riga da sotto il
 * cursore. Ora lo stato lo decide chi lavora, e resta come lo ha lasciato.
 */
const Sidebar = ({ view, setView, isOpen, onToggle }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'clients', label: 'Clienti', icon: <Users size={18} /> },
    { id: 'projects', label: 'Commesse', icon: <Briefcase size={18} /> },
    { id: 'quotes', label: 'Preventivi (TEST)', icon: <FileText size={18} /> },
    { id: 'settings', label: 'Impostazioni', icon: <Settings size={18} /> },
  ]

  return (
    <aside
      className="fixed left-0 top-0 bottom-0 z-50 w-72 border-none overflow-hidden transition-[clip-path] duration-300 ease-out pointer-events-auto"
      style={{
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        willChange: 'clip-path',
        clipPath: isOpen ? 'inset(0 0 0 0)' : 'inset(0 13rem 0 0)',
        WebkitClipPath: isOpen ? 'inset(0 0 0 0)' : 'inset(0 13rem 0 0)',
        maskImage: 'linear-gradient(to right, black 80%, transparent 100%)',
        WebkitMaskImage: 'linear-gradient(to right, black 80%, transparent 100%)'
      }}
    >
      {/* Isolated Blur Background Layer */}
      <div
        className="absolute inset-0 bg-white/70 pointer-events-none"
        style={{
          WebkitBackdropFilter: 'blur(12px)',
          backdropFilter: 'blur(12px)',
          transform: 'translateZ(0)'
        }}
      />

      <div className="relative z-10 h-full">

        {/* Logo + interruttore di apertura */}
        <div className="h-32 w-[13rem] flex items-center">
          <button
            type="button"
            onClick={onToggle}
            title={isOpen ? 'Chiudi la barra laterale (Ctrl+B)' : 'Apri la barra laterale (Ctrl+B)'}
            aria-label={isOpen ? 'Chiudi la barra laterale' : 'Apri la barra laterale'}
            aria-expanded={isOpen}
            className="w-[80px] h-full flex items-center justify-center shrink-0 group cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 rounded-3xl"
          >
            <img
              src="/logo-lely.png"
              alt="FreschiTech"
              className={`transition-transform duration-300 ease-out w-16 h-16 object-contain drop-shadow-lg ${
                isOpen ? 'scale-105' : 'scale-[0.8] group-hover:scale-95'
              }`}
              style={{ willChange: 'transform' }}
            />
          </button>

          <button
            type="button"
            onClick={onToggle}
            title={isOpen ? 'Chiudi (Ctrl+B)' : 'Apri (Ctrl+B)'}
            className={`ml-auto mr-5 p-2 rounded-xl text-slate-400 hover:text-accent hover:bg-white/70 transition-colors ${
              isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
          >
            {isOpen ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          </button>
        </div>

        <nav className="p-2 mt-4 space-y-1">
          {menuItems.map((item, index) => (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              title={`${item.label} — Ctrl+${index + 1}`}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-3xl transition-colors duration-200 group relative cursor-pointer focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/20 ${
                view === item.id
                  ? 'bg-white shadow-xl text-accent'
                  : 'text-slate-500 hover:bg-white/50 hover:text-slate-700'
              }`}
            >
              {/* Barra indicatore laterale (più sottile e discreta) */}
              {view === item.id && (
                <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-accent rounded-full"></div>
              )}

              <div className={`transition-transform duration-200 ${
                view === item.id ? 'scale-110' : 'group-hover:scale-110 group-hover:text-accent'
              }`}>
                {item.icon}
              </div>

              <div className={`flex-1 flex items-center justify-between gap-3 text-left transition-opacity duration-200 overflow-hidden whitespace-nowrap ${
                isOpen ? 'opacity-100 w-auto' : 'opacity-0 w-0'
              }`}>
                <span className="text-[0.72rem] font-black uppercase tracking-widest">{item.label}</span>
                <span className={`text-[0.7rem] font-bold tabular-nums ${
                  view === item.id ? 'text-accent/50' : 'text-slate-300'
                }`}>
                  ⌃{index + 1}
                </span>
              </div>
            </button>
          ))}
        </nav>

      </div>
    </aside>
  )
}

export default Sidebar
