import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Plus, Search, Building2, User, Mail, MapPin, Loader2, Users, ArrowLeft, Briefcase, Phone } from 'lucide-react'
import EntityCard from './ui/EntityCard'
import EditClientDrawer from './EditClientDrawer'
import { ConfirmModal } from '@tecno/ui/feedback'
import { useToast } from '@tecno/ui/feedback'

const formatCurrency = (value) => {
  const num = Number(value || 0);
  const rounded = num.toFixed(2);
  const [integerPart, decimalPart] = rounded.split('.');
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${formattedInteger},${decimalPart}`;
}

const Clients = ({ onOpenProject }) => {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState(null)

  // Details view states
  const [viewMode, setViewMode] = useState('list') // 'list' or 'detail'
  const [selectedClientForDetails, setSelectedClientForDetails] = useState(null)
  const [clientProjects, setClientProjects] = useState([])
  const [loadingProjects, setLoadingProjects] = useState(false)
  const [projectSearch, setProjectSearch] = useState('')

  const loadClients = () => {
    setLoading(true)
    invoke('get_clients')
      .then(data => {
        setClients(data)
        setLoading(false)
      })
      .catch(err => {
        console.error("Errore caricamento clienti:", err)
        setLoading(false)
      })
  }

  useEffect(() => {
    loadClients()
  }, [])

  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.city && c.city.toLowerCase().includes(search.toLowerCase()))
  )

  const handleEdit = (client) => {
    setSelectedClient(client)
    setIsDrawerOpen(true)
  }

  const handleAdd = () => {
    setSelectedClient(null)
    setIsDrawerOpen(true)
  }

  const handleSave = (formData) => {
    invoke('save_client', { client: formData })
      .then(() => {
        loadClients()
        setIsDrawerOpen(false)
        if (selectedClientForDetails && selectedClientForDetails.id === formData.id) {
          setSelectedClientForDetails(formData)
        }
      })
      .catch(err => {
        console.error("Errore salvataggio cliente:", err)
        toast.error("Impossibile salvare il cliente.")
      })
  }

  const handleDeleteClick = (id) => {
    setClientToDelete(id)
    setIsConfirmOpen(true)
  }

  const handleConfirmDelete = () => {
    if (clientToDelete) {
      invoke('delete_client', { id: clientToDelete })
        .then(() => {
          loadClients()
          setIsConfirmOpen(false)
          if (selectedClientForDetails && selectedClientForDetails.id === clientToDelete) {
            setViewMode('list')
            setSelectedClientForDetails(null)
          }
          setClientToDelete(null)
        })
        .catch(err => {
          console.error("Errore eliminazione:", err)
          toast.error("Errore durante l'eliminazione.")
        })
    }
  }

  const handleClientClick = (client) => {
    setSelectedClientForDetails(client)
    setViewMode('detail')
    setProjectSearch('')
    setLoadingProjects(true)
    invoke('get_projects')
      .then(allProjects => {
        const filtered = allProjects.filter(p => p.client_id === client.id)
        setClientProjects(filtered)
        setLoadingProjects(false)
      })
      .catch(err => {
        console.error("Errore caricamento commesse cliente:", err)
        setLoadingProjects(false)
      })
  }

  if (viewMode === 'detail' && selectedClientForDetails) {
    const client = selectedClientForDetails
    
    // Calcolo totali su TUTTE le commesse del cliente (prima del filtro di ricerca)
    const totalBudget = clientProjects.reduce((sum, p) => sum + Number(p.budget || 0), 0)
    const totalProfit = clientProjects.reduce((sum, p) => sum + Number(p.utile_previsto || 0), 0)

    // Filtro delle commesse per nome
    const filteredProjects = clientProjects.filter(p => 
      p.name.toLowerCase().includes(projectSearch.toLowerCase())
    )

    return (
      <div key="detail" className="space-y-8 animate-premium-in">
        {/* Breadcrumb Path */}
        <div className="flex items-center gap-2 text-[0.7rem] font-black uppercase tracking-widest text-slate-400 font-sans">
          <ArrowLeft size={16} className="text-slate-400 mr-1" />
          <button 
            onClick={() => {
              setViewMode('list')
              setSelectedClientForDetails(null)
              setProjectSearch('')
            }}
            className="hover:text-accent transition-colors cursor-pointer"
          >
            Clienti
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-slate-600">{client.name}</span>
        </div>

        {/* Title */}
        <div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter leading-none">{client.name}</h1>
          <p className="text-[0.7rem] font-black uppercase tracking-[0.3em] text-slate-400 mt-1">Dettaglio Cliente & Commesse</p>
        </div>

        {/* Client Card Details and Commesse */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Client profile summary */}
          <div className="lg:col-span-1 glass-panel p-8 rounded-[2.5rem] bg-white/40 border border-white/60 backdrop-blur-md shadow-sm space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-accent/10 text-accent rounded-3xl flex items-center justify-center shrink-0">
                {client.type === 'company' ? <Building2 size={32} /> : <User size={32} />}
              </div>
              <div>
                <span className="inline-block text-[0.65rem] font-black tracking-widest uppercase bg-accent/10 text-accent px-3 py-1 rounded-full mb-1">
                  {client.type === 'company' ? 'Azienda' : 'Privato'}
                </span>
                <h3 className="text-xl font-bold text-slate-800">{client.name}</h3>
              </div>
            </div>

            <hr className="border-slate-200/50" />

            <div className="space-y-4">
              {client.email && (
                <div className="flex items-center gap-3 text-slate-600">
                  <Mail size={16} className="text-slate-400 shrink-0" />
                  <span className="text-sm font-medium break-all">{client.email}</span>
                </div>
              )}
              {client.phone && (
                <div className="flex items-center gap-3 text-slate-600">
                  <Phone size={16} className="text-slate-400 shrink-0" />
                  <span className="text-sm font-medium">{client.phone}</span>
                </div>
              )}
              {(client.address || client.city) && (
                <div className="flex items-center gap-3 text-slate-600">
                  <MapPin size={16} className="text-slate-400 shrink-0" />
                  <span className="text-sm font-medium">
                    {client.address ? `${client.address}, ` : ''}{client.city || ''} {client.cap ? `(${client.cap})` : ''}
                  </span>
                </div>
              )}
            </div>

            <hr className="border-slate-200/50" />

            {/* Riepilogo Economico Commesse */}
            <div className="space-y-4 bg-white/35 backdrop-blur-sm p-5 rounded-3xl border border-white/40 shadow-sm">
              <h4 className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400">Riepilogo Totali</h4>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-500">Tot. Preventivi</span>
                  <span className="text-sm font-black text-slate-800">
                    € {formatCurrency(totalBudget)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[0.7rem] font-bold uppercase tracking-wider text-slate-500">Tot. Utile Previsto</span>
                  <span className={`text-sm font-black ${totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    € {formatCurrency(totalProfit)}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-4 flex gap-4">
              <button 
                onClick={() => handleEdit(client)}
                className="w-full text-center bg-white/80 hover:bg-white text-slate-700 border border-slate-200 py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all hover:-translate-y-0.5 shadow-sm"
              >
                Modifica Dati
              </button>
              <button 
                onClick={() => handleDeleteClick(client.id)}
                className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-600 rounded-2xl font-bold text-xs transition-all hover:-translate-y-0.5"
              >
                Elimina
              </button>
            </div>
          </div>

          {/* Associated Projects (Commesse) */}
          <div className="lg:col-span-2 glass-panel p-8 rounded-[2.5rem] bg-white/40 border border-white/60 backdrop-blur-md shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                  <Briefcase size={22} className="text-accent" />
                  Commesse Associate ({clientProjects.length})
                </h2>
                <p className="text-[0.65rem] font-bold uppercase tracking-wider text-slate-400 mt-1">Elenco dei progetti di questo cliente</p>
              </div>
              <div className="relative group shrink-0">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-accent transition-colors" size={14} />
                <input 
                  type="text" 
                  placeholder="Cerca commessa per nome..."
                  value={projectSearch}
                  onChange={(e) => setProjectSearch(e.target.value)}
                  className="bg-white/50 backdrop-blur-md border border-white/50 rounded-xl py-2 pl-9 pr-4 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all w-72 shadow-sm"
                />
              </div>
            </div>

            {loadingProjects ? (
              <div className="flex flex-col items-center justify-center py-12 text-slate-400 gap-4">
                <Loader2 size={32} className="animate-spin" />
                <span className="text-[0.7rem] font-black uppercase tracking-widest">Caricamento commesse...</span>
              </div>
            ) : filteredProjects.length > 0 ? (
              <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                {filteredProjects.map(project => (
                  <div 
                    key={project.id}
                    onClick={() => onOpenProject && onOpenProject(project.id)}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-5 bg-white/50 hover:bg-white border border-white/50 hover:border-slate-300/60 rounded-3xl transition-all duration-300 hover:shadow-[0_10px_25px_-5px_rgba(15,23,42,0.08)] hover:-translate-y-0.5 group gap-4 cursor-pointer"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">#{project.code || project.id}</span>
                        <span className={`inline-block text-[0.6rem] font-black tracking-wider uppercase px-2 py-0.5 rounded-full ${
                          project.status === 'completed' 
                            ? 'bg-emerald-50 text-emerald-600' 
                            : project.status === 'in_progress'
                            ? 'bg-amber-50 text-amber-600'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {project.status === 'completed' ? 'Completato' : project.status === 'in_progress' ? 'In Corso' : 'Pianificato'}
                        </span>
                      </div>
                      <h4 className="text-base font-bold text-slate-800 mt-1">{project.name}</h4>
                      {project.description && (
                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{project.description}</p>
                      )}
                      
                      {/* Budget and Profit info */}
                      <div className="flex items-center gap-6 mt-3 text-xs text-slate-500 font-semibold">
                        <div>
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[0.6rem]">Preventivo: </span>
                          <span className="text-slate-700">€ {formatCurrency(project.budget)}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 font-bold uppercase tracking-wider text-[0.6rem]">Utile Previsto: </span>
                          <span className={Number(project.utile_previsto || 0) >= 0 ? "text-emerald-600 font-bold" : "text-rose-600 font-bold"}>
                            € {formatCurrency(project.utile_previsto)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div 
                      className="flex items-center justify-center gap-2 bg-accent/10 group-hover:bg-accent group-hover:text-white text-accent px-4 py-2.5 rounded-xl font-bold text-xs uppercase tracking-wider transition-all self-start sm:self-center"
                    >
                      Entra
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center border-2 border-dashed border-slate-200 rounded-3xl">
                <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4 text-slate-300">
                  <Briefcase size={20} />
                </div>
                <h4 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Nessuna commessa</h4>
                <p className="text-xs text-slate-400 mt-1">Non ci sono commesse corrispondenti alla ricerca.</p>
              </div>
            )}
          </div>
        </div>

        {/* Drawer di Modifica/Inserimento */}
        <EditClientDrawer 
          isOpen={isDrawerOpen} 
          onClose={() => setIsDrawerOpen(false)} 
          client={selectedClient}
          onSave={handleSave}
        />

        <ConfirmModal 
          isOpen={isConfirmOpen}
          onClose={() => setIsConfirmOpen(false)}
          onConfirm={handleConfirmDelete}
          title="Elimina Cliente"
          message="Sei sicuro di voler eliminare questo cliente? Questa azione non può essere annullata e verranno eliminate anche tutte le sue commesse."
        />
      </div>
    )
  }

  return (
    <div key="list" className="space-y-8 animate-premium-in">
      {/* Header Pagina */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Anagrafica Clienti</h1>
          <p className="text-[0.7rem] font-black uppercase tracking-[0.3em] text-slate-400 mt-1">Gestione completa database</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-accent transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Cerca cliente o città..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/50 backdrop-blur-md border border-white/50 rounded-2xl py-3 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all w-64 shadow-sm"
            />
          </div>
          
          <button 
            onClick={handleAdd}
            className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-accent/30 transition-all hover:-translate-y-1"
          >
            <Plus size={18} />
            Nuovo Cliente
          </button>
        </div>
      </div>

      {/* Grid Clienti */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 text-slate-400 gap-4">
          <Loader2 size={40} className="animate-spin" />
          <span className="text-[0.7rem] font-black uppercase tracking-widest">Caricamento database...</span>
        </div>
      ) : filteredClients.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredClients.map(client => (
            <EntityCard 
              key={client.id}
              onClick={() => handleClientClick(client)}
              onDelete={() => handleDeleteClick(client.id)}
              icon={client.type === 'company' ? <Building2 size={24} /> : <User size={24} />}
              title={client.name}
              subtitle={client.city || 'Città non specificata'}
              subtitleIcon={MapPin}
              badge={client.type === 'company' ? 'Azienda' : 'Privato'}
              footerItems={[
                client.email ? { icon: <Mail size={12} />, label: client.email } : null
              ].filter(Boolean)}
            />
          ))}
        </div>
      ) : (
        <div className="glass-panel p-20 text-center rounded-[3.5rem] border-2 border-dashed border-slate-200">
          <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
            <Users className="text-slate-300" size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Nessun cliente trovato</h3>
          <p className="text-slate-400 text-sm mt-2">Inizia aggiungendo il tuo primo cliente al database.</p>
        </div>
      )}

      {/* Drawer di Modifica/Inserimento */}
      <EditClientDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        client={selectedClient}
        onSave={handleSave}
      />

      <ConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Elimina Cliente"
        message="Sei sicuro di voler eliminare questo cliente? Questa azione non può essere annullata e verranno eliminate anche tutte le sue commesse."
      />
    </div>
  )
}

export default Clients
