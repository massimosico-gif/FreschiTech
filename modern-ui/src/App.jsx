import React, { useCallback, useMemo, useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import Clients from './components/Clients'
import Jobs from './components/Jobs'
import ProjectDetails from './components/ProjectDetails'
import Team from './components/Team'
import Settings from './components/Settings'
import Quotes from './components/Quotes'
import CommandPalette from './components/ui/CommandPalette'
import QuickEntry from './components/QuickEntry'
import useProjectStore from './hooks/useProjectStore'
import useHotkeys from './hooks/useHotkeys'
import { rememberProject } from './utils/recentProjects'

const SIDEBAR_KEY = 'sidebar_open'

/** Ordine delle voci di menu: determina anche le scorciatoie Ctrl+1..5. */
const VIEW_ORDER = ['dashboard', 'clients', 'projects', 'quotes', 'settings']

const App = () => {
  const [view, setView] = useState('dashboard')
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [pendingCostCenterId, setPendingCostCenterId] = useState(null)

  // La barra laterale ricorda come e' stata lasciata: e' una preferenza di
  // chi lavora, non uno stato transitorio da ricalcolare a ogni avvio.
  const [isSidebarOpen, setSidebarOpen] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) === 'true'
  )

  const [isPaletteOpen, setPaletteOpen] = useState(false)
  const [isQuickEntryOpen, setQuickEntryOpen] = useState(false)

  const selectedCostCenterId = useProjectStore(s => s.selectedCostCenterId)

  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => {
      localStorage.setItem(SIDEBAR_KEY, String(!prev))
      return !prev
    })
  }, [])

  const getBgClass = () => {
    if (view === 'project_details') {
      return selectedCostCenterId
        ? 'bg-slate-900/5 border border-slate-900/5 backdrop-blur-xl shadow-inner'
        : 'bg-white/40 border border-white/40 backdrop-blur-md shadow-sm';
    }
    return 'border-transparent';
  }

  const handleOpenProject = useCallback((id) => {
    rememberProject(id)
    setSelectedProjectId(id)
    setPendingCostCenterId(null)
    setView('project_details')
  }, [])

  /**
   * Apre una commessa gia' dentro un suo centro di costo.
   *
   * L'id viaggia come prop fino allo store, che lo applica a caricamento
   * finito: e' l'unico momento in cui si sa se quel centro esiste ancora.
   */
  const handleOpenCostCenter = useCallback((projectId, costCenterId) => {
    rememberProject(projectId)
    setSelectedProjectId(projectId)
    setPendingCostCenterId(costCenterId)
    setView('project_details')
  }, [])

  // ─── Scorciatoie globali ──────────────────────────────────────────
  const hotkeys = useMemo(() => [
    ...VIEW_ORDER.map((id, index) => ({
      combo: `ctrl+${index + 1}`,
      handler: () => setView(id),
      description: `Vai a ${id}`,
    })),
    { combo: 'ctrl+b', handler: toggleSidebar, description: 'Apri/chiudi barra laterale' },
    { combo: 'ctrl+k', handler: () => setPaletteOpen(true), description: 'Ricerca globale' },
    { combo: 'ctrl+n', handler: () => setQuickEntryOpen(true), description: 'Inserimento rapido' },
  ], [toggleSidebar])

  useHotkeys(hotkeys)

  const renderContent = () => {
    switch (String(view).trim()) {
      case 'dashboard':
        return <Dashboard onOpenProject={handleOpenProject} onNavigate={setView} />;
      case 'clients':
        return <Clients onOpenProject={handleOpenProject} />;
      case 'team':
        return <Team />;
      case 'projects':
        return <Jobs onOpenProject={handleOpenProject} />;
      case 'project_details':
        return (
          <ProjectDetails
            projectId={selectedProjectId}
            initialCostCenterId={pendingCostCenterId}
            onBack={() => setView('projects')}
          />
        );
      case 'settings':
        return <Settings />;
      case 'quotes':
        return <Quotes />;
      default:
        return (
          <div className="bg-white/40 backdrop-blur-md border border-white/50 rounded-3xl p-12 floating-card">
            <h1 className="text-3xl font-black mb-4 text-accent">Pagina in fase di sviluppo</h1>
            <p className="text-[#64748b]">Stiamo portando i contenuti della pagina <strong>{view}</strong> nel nuovo formato React.</p>
          </div>
        );
    }
  }

  return (
    <div className="relative min-h-screen">
      {/* Background Aurora Effect */}
      <div className="aurora-container">
        <div className="aurora-blob blob-1"></div>
        <div className="aurora-blob blob-2"></div>
        <div className="aurora-blob blob-3"></div>
      </div>

      <Sidebar
        view={view === 'project_details' ? 'projects' : view}
        setView={setView}
        isOpen={isSidebarOpen}
        onToggle={toggleSidebar}
      />

      {/*
        Lo spostamento del contenuto resta, ma ora e' la conseguenza di un
        click: nessuno se lo trova addosso perche' e' passato col mouse.
      */}
      <main
        className="transition-transform duration-300 ease-out min-h-screen relative z-10 pl-20"
        style={{
          willChange: 'transform',
          transform: isSidebarOpen ? 'translateX(13rem) translateZ(0)' : 'translateX(0) translateZ(0)'
        }}
      >
        <Header view={view} onOpenSearch={() => setPaletteOpen(true)} onQuickEntry={() => setQuickEntryOpen(true)} />
        <div className="p-8">
          <div className={`transition-all duration-300 rounded-[2.5rem] ${view === 'project_details' ? 'p-10 border' : ''} ${getBgClass()}`}>
            {renderContent()}
          </div>
        </div>
      </main>

      {/*
        Montati solo quando servono: cosi' ogni apertura riparte da uno stato
        pulito senza bisogno di un effetto che azzeri i campi — e un effetto
        in meno e' un render a cascata in meno.
      */}
      {isPaletteOpen && (
        <CommandPalette
          onClose={() => setPaletteOpen(false)}
          onOpenProject={handleOpenProject}
          onOpenCostCenter={handleOpenCostCenter}
          onNavigate={setView}
        />
      )}

      {isQuickEntryOpen && (
        <QuickEntry
          onClose={() => setQuickEntryOpen(false)}
          onOpenProject={handleOpenProject}
        />
      )}
    </div>
  )
}

export default App
