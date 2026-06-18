import React, { useRef } from 'react'
import { 
  LayoutDashboard, 
  Users,
  Briefcase,
  Settings,
  FileText
} from 'lucide-react'

const Sidebar = ({ 
  view, 
  setView, 
  isSidebarHovered, 
  setSidebarHovered, 
  expandedItem, 
  setExpandedItem 
}) => {
  const sidebarTimeout = useRef(null)
  const expandTimeout = useRef(null)

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: <LayoutDashboard size={18} /> },
    { id: 'clients', label: 'Clienti', icon: <Users size={18} /> },
    { id: 'projects', label: 'Commesse', icon: <Briefcase size={18} /> },
    { id: 'quotes', label: 'Preventivi (TEST)', icon: <FileText size={18} /> },
    { id: 'settings', label: 'Impostazioni', icon: <Settings size={18} /> },
  ]

  const handleMouseEnterItem = (id, hasSubItems) => {
    if (hasSubItems) {
      expandTimeout.current = setTimeout(() => {
        setExpandedItem(id)
      }, 200)
    }
  }

  const handleMouseLeaveItem = () => {
    if (expandTimeout.current) {
      clearTimeout(expandTimeout.current)
    }
  }

  return (
    <aside 
      onMouseEnter={() => { 
        clearTimeout(sidebarTimeout.current); 
        sidebarTimeout.current = setTimeout(() => setSidebarHovered(true), 100); 
      }}
      onMouseLeave={() => { 
        clearTimeout(sidebarTimeout.current); 
        sidebarTimeout.current = setTimeout(() => {
          setSidebarHovered(false)
          setExpandedItem(null) 
        }, 200); 
      }}
      className={`fixed left-0 top-0 bottom-0 z-50 w-72 border-none overflow-hidden transition-[clip-path] duration-700 ease-in-out pointer-events-auto`}
      style={{
        transform: 'translateZ(0)',
        backfaceVisibility: 'hidden',
        willChange: 'clip-path, transform',
        clipPath: isSidebarHovered ? 'inset(0 0 0 0)' : 'inset(0 13rem 0 0)',
        WebkitClipPath: isSidebarHovered ? 'inset(0 0 0 0)' : 'inset(0 13rem 0 0)',
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
      
      <div className="h-32 w-[80px] flex items-center justify-center">
        <img 
          src="/logo-lely.png" 
          alt="FreschiTech Logo" 
          className={`transition-all duration-700 ease-in-out w-16 h-16 ${
            isSidebarHovered ? 'scale-110' : 'scale-[0.8]'
          } object-contain drop-shadow-lg`}
          style={{ 
            willChange: 'transform',
            transform: 'translateZ(0)'
          }}
        />
      </div>
      
      <nav className="p-2 mt-4 space-y-1">
        {menuItems.map(item => (
          <div 
            key={item.id}
            onMouseEnter={() => handleMouseEnterItem(item.id, !!item.subItems)}
            onMouseLeave={handleMouseLeaveItem}
          >
            <button
              onClick={() => {
                if (item.subItems) {
                  setExpandedItem(expandedItem === item.id ? null : item.id)
                  if (item.subItems.length > 0) {
                     // Non cambiare view se ha subitems per ora
                  } else {
                    setView(item.id)
                  }
                } else {
                  setView(item.id)
                }
              }}
              className={`w-full flex items-center gap-4 px-6 py-4 rounded-3xl transition-all duration-500 group relative ${
                view === item.id 
                ? 'bg-white shadow-xl text-accent' 
                : 'text-[#94a3b8] hover:bg-white/50 hover:text-slate-600'
              }`}
            >
              {/* Barra indicatore laterale (più sottile e discreta) */}
              {view === item.id && (
                <div className="absolute left-0 top-1/4 bottom-1/4 w-1 bg-accent rounded-full animate-fade-in"></div>
              )}

              <div className={`transition-all duration-500 ${
                view === item.id ? 'scale-110' : 'group-hover:scale-110 group-hover:text-accent'
              }`}>
                {item.icon}
              </div>
              
              <div className={`flex-1 text-left transition-all duration-700 overflow-hidden whitespace-nowrap ${
                isSidebarHovered ? 'opacity-100 w-auto' : 'opacity-0 w-0'
              }`}>
                <span className="text-xs font-black uppercase tracking-widest">{item.label}</span>
              </div>
            </button>

            {/* Sottomenu (opzionale) */}
            {item.subItems && expandedItem === item.id && isSidebarHovered && (
              <div className="ml-8 mt-2 space-y-1 animate-fade-in">
                {item.subItems.map(sub => (
                  <button
                    key={sub.id}
                    onClick={() => setView(sub.id)}
                    className="w-full text-left px-6 py-3 rounded-2xl text-[0.65rem] font-black uppercase tracking-widest text-[#94a3b8] hover:text-accent hover:bg-white/50 transition-all"
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </nav>


      
      </div>
    </aside>
  )
}

export default Sidebar
