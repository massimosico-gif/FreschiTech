import React, { useState } from 'react'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Dashboard from './components/Dashboard'
import Clients from './components/Clients'
import Jobs from './components/Jobs'
import ProjectDetails from './components/ProjectDetails'
import Team from './components/Team'
import Settings from './components/Settings'

const App = () => {
  const [view, setView] = useState('dashboard')
  const [selectedProjectId, setSelectedProjectId] = useState(null)
  const [isSidebarHovered, setSidebarHovered] = useState(false)
  const [expandedItem, setExpandedItem] = useState(null)

  const handleOpenProject = (id) => {
    console.log("App: Apertura progetto ID", id);
    setSelectedProjectId(id)
    setView('project_details')
  }

  const renderContent = () => {
    const currentView = String(view).trim();
    console.log("App: Rendering vista", currentView);
    
    switch(currentView) {
      case 'dashboard':
        return <Dashboard />;
      case 'clients':
        return <Clients />;
      case 'team':
        console.log("App: Caricamento componente Team...");
        return <Team />;
      case 'projects':
        return <Jobs onOpenProject={handleOpenProject} />;
      case 'project_details':
        return <ProjectDetails projectId={selectedProjectId} onBack={() => setView('projects')} />;
      case 'settings':
        return <Settings />;
      default:
        return (
          <div className="bg-white/40 backdrop-blur-md border border-white/50 rounded-3xl p-12 floating-card">
            <h1 className="text-3xl font-black mb-4 text-accent">Pagina in fase di sviluppo</h1>
            <p className="text-[#64748b]">Stiamo portando i contenuti della pagina <strong>{currentView}</strong> nel nuovo formato React.</p>
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
        isSidebarHovered={isSidebarHovered}
        setSidebarHovered={setSidebarHovered}
        expandedItem={expandedItem}
        setExpandedItem={setExpandedItem}
      />

      {/* Subtle overlay for focus effect when sidebar is expanded */}
      <div 
        className={`fixed inset-0 bg-slate-900/10 transition-opacity duration-700 pointer-events-none z-40 ${
          isSidebarHovered ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ willChange: 'opacity' }}
      />

      <main 
        className={`transition-transform duration-700 ease-in-out min-h-screen relative z-10 pl-20 ${
          isSidebarHovered ? 'translate-x-[13rem]' : 'translate-x-0'
        }`}
        style={{ 
          willChange: 'transform',
          transform: isSidebarHovered ? 'translateX(13rem) translateZ(0)' : 'translateX(0) translateZ(0)'
        }}
      >
        <Header view={view} />
        <div className="p-12 animate-fade-in">
          {renderContent()}
        </div>
      </main>
    </div>
  )
}

export default App
