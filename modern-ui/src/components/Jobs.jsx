import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Plus, Search, Briefcase, Loader2, Calendar, User, Activity } from 'lucide-react'
import EntityCard from './ui/EntityCard'
import EditJobDrawer from './EditJobDrawer'
import { ConfirmModal } from '@tecno/ui/feedback'
import Select from './ui/Select'
import { useToast } from '@tecno/ui/feedback'

const Jobs = ({ onOpenProject }) => {
  const toast = useToast()
  const [search, setSearch] = useState('')
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedJob, setSelectedJob] = useState(null)
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)

  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [jobToDelete, setJobToDelete] = useState(null)

  const [statusFilter, setStatusFilter] = useState('all')

  const statusFilterOptions = [
    { id: 'all', label: 'Tutti gli stati' },
    { id: 'active', label: 'Attive / In corso', color: 'bg-green-500' },
    { id: 'completed', label: 'Completate', color: 'bg-slate-400' },
    { id: 'on_hold', label: 'Sospese', color: 'bg-amber-500' }
  ]

  const loadJobs = () => {
    setLoading(true)
    invoke('get_projects')
      .then(data => {
        setJobs(data)
        setLoading(false)
      })
      .catch(err => {
        console.error("Errore caricamento commesse:", err)
        setLoading(false)
      })
  }

  useEffect(() => {
    loadJobs()
  }, [])

  const filteredJobs = jobs.filter(j => {
    const matchesSearch = j.name.toLowerCase().includes(search.toLowerCase()) || 
      (j.client_name && j.client_name.toLowerCase().includes(search.toLowerCase()))
    
    const matchesStatus = statusFilter === 'all' || j.status === statusFilter
    
    return matchesSearch && matchesStatus
  })

  const handleEdit = (job) => {
    setSelectedJob(job)
    setIsDrawerOpen(true)
  }

  const handleAdd = () => {
    setSelectedJob(null)
    setIsDrawerOpen(true)
  }

  const handleSave = (formData) => {
    invoke('save_project', { project: formData })
      .then(() => {
        loadJobs()
        setIsDrawerOpen(false)
      })
      .catch(err => {
        console.error("Errore salvataggio commessa:", err)
        toast.error("Impossibile salvare la commessa.")
      })
  }

  const handleDeleteClick = (id) => {
    setJobToDelete(id)
    setIsConfirmOpen(true)
  }

  const handleConfirmDelete = () => {
    if (jobToDelete) {
      invoke('delete_project', { id: jobToDelete })
        .then(() => {
          loadJobs()
          setJobToDelete(null)
        })
        .catch(err => {
          console.error("Errore eliminazione:", err)
          toast.error("Errore durante l'eliminazione.")
        })
    }
  }

  return (
    <div className="space-y-8 animate-premium-in">
      {/* Header Pagina */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Commesse</h1>
          <p className="text-[0.7rem] font-black uppercase tracking-[0.3em] text-slate-400 mt-1">Gestione cantieri e attività</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
          <div className="relative group flex-1 sm:flex-initial">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-accent transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Cerca commessa o cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/50 backdrop-blur-md border border-white/50 rounded-2xl py-3.5 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all w-full sm:w-64 shadow-sm"
            />
          </div>

          <div className="w-full sm:w-56">
            <Select 
              options={statusFilterOptions}
              value={statusFilter}
              onChange={setStatusFilter}
              icon={Activity}
              placeholder="Filtra per stato"
            />
          </div>
          
          <button 
            onClick={handleAdd}
            className="flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-accent/30 transition-all hover:-translate-y-1 whitespace-nowrap"
          >
            <Plus size={18} />
            Nuova Commessa
          </button>
        </div>
      </div>

      {/* Grid Commesse */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 text-slate-400 gap-4">
          <Loader2 size={40} className="animate-spin" />
          <span className="text-[0.7rem] font-black uppercase tracking-widest">Caricamento database...</span>
        </div>
      ) : filteredJobs.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredJobs.map(job => (
            <EntityCard 
              key={job.id}
              onClick={() => onOpenProject(job.id)}
              onEdit={() => handleEdit(job)}
              onDelete={() => handleDeleteClick(job.id)}
              icon={<Briefcase size={24} />}
              title={job.name}
              subtitle={job.client_name || 'Cliente non assegnato'}
              subtitleIcon={User}
              badge={job.status === 'active' ? 'Attiva' : job.status === 'completed' ? 'Completata' : 'Sospesa'}
              badgeColor={
                job.status === 'active' ? 'bg-green-50 text-green-500' : 
                job.status === 'completed' ? 'bg-slate-50 text-slate-400' : 
                'bg-amber-50 text-amber-500'
              }
              stats={[
                { label: 'Preventivo', value: `€ ${(job.budget || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}` },
                { label: 'Costo Totale', value: `€ ${(job.costo_totale || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}` },
                { 
                  label: 'Utile Previsto', 
                  value: `€ ${(job.utile_previsto || 0).toLocaleString('it-IT', { minimumFractionDigits: 2 })}`,
                  highlight: true
                }
              ]}
              footerItems={[
                { icon: <Calendar size={12} />, label: job.start_date || 'N/D' }
              ]}
            />
          ))}
        </div>
      ) : (
        <div className="glass-panel p-20 text-center rounded-[3.5rem] border-2 border-dashed border-slate-200">
          <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
            <Briefcase size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Nessuna commessa trovata</h3>
          <p className="text-slate-400 text-sm mt-2">Crea la tua prima commessa per iniziare a tracciare i costi.</p>
        </div>
      )}

      {/* Drawer di Modifica/Inserimento */}
      <EditJobDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        job={selectedJob}
        onSave={handleSave}
      />

      <ConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Elimina Commessa"
        message="Sei sicuro di voler eliminare questa commessa? Tutti i dati associati (materiali, manodopera, costi) verranno persi permanentemente."
      />
    </div>
  )
}

export default Jobs
