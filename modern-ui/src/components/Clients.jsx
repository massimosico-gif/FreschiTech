import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Plus, Search, Building2, User, Mail, MapPin, Loader2, Users } from 'lucide-react'
import EntityCard from './ui/EntityCard'
import EditClientDrawer from './EditClientDrawer'
import ConfirmModal from './ui/ConfirmModal'

const Clients = () => {
  const [search, setSearch] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [clientToDelete, setClientToDelete] = useState(null)

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
      })
      .catch(err => {
        console.error("Errore salvataggio cliente:", err)
        alert("Impossibile salvare il cliente.")
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
          setClientToDelete(null)
        })
        .catch(err => {
          console.error("Errore eliminazione:", err)
          alert("Errore durante l'eliminazione.")
        })
    }
  }

  return (
    <div className="space-y-8 animate-premium-in">
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
              onClick={() => handleEdit(client)}
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
