import React, { useState, useEffect, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  Search, 
  Euro, 
  Trash2, 
  Edit3, 
  Truck
} from 'lucide-react'
import EntityCard from '../ui/EntityCard'
import { ConfirmModal } from '@tecno/ui/feedback'
import DrawerShell from '../ui/DrawerShell'
import { useToast } from '@tecno/ui/feedback'

const ResourcesSettings = () => {
  const toast = useToast()
  const [allGlobalSettings, setAllGlobalSettings] = useState({})
  const [settings, setSettings] = useState({
    vehicles: []
  })
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', message: '' })
  
  // Drawer states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedVehicle, setSelectedVehicle] = useState(null)
  
  // Delete confirm states
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [vehicleToDelete, setVehicleToDelete] = useState(null)

  // Controlled form states
  const [name, setName] = useState('')
  const [cost, setCost] = useState(0.50)

  useEffect(() => {
    if (isDrawerOpen) {
      setName(selectedVehicle?.name || '')
      setCost(selectedVehicle?.km_cost !== undefined ? selectedVehicle.km_cost : 0.50)
    }
  }, [isDrawerOpen, selectedVehicle])

  const isSaveDisabled = useMemo(() => {
    const parsedCost = parseFloat(cost)
    const isValid = name.trim() !== '' && !isNaN(parsedCost) && parsedCost >= 0
    if (!isValid) return true
    if (selectedVehicle) {
      return name === selectedVehicle.name && parsedCost === selectedVehicle.km_cost
    }
    return false
  }, [name, cost, selectedVehicle])

  const loadSettings = async () => {
    setLoading(true)
    try {
      const res = await invoke('get_global_settings')
      setAllGlobalSettings(res)
      
      // Map elements. If a vehicle is a string, convert to { name: string, km_cost: 0.50 }
      const mappedVehicles = (res.vehicles || []).map(v => 
        typeof v === 'string' ? { name: v, km_cost: 0.50 } : v
      )
      setSettings({
        vehicles: mappedVehicles
      })
    } catch (err) {
      console.error("Errore caricamento mezzi:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSettings()
  }, [])

  const filteredVehicles = settings.vehicles.filter(v => 
    v.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async (e) => {
    e.preventDefault()
    if (isSaveDisabled) return
    const vehName = name.trim()
    const kmCost = parseFloat(cost)

    if (!vehName) return

    let updatedVehicles;
    if (selectedVehicle) {
      // Modifica di un furgone esistente
      updatedVehicles = settings.vehicles.map(v => 
        v.name === selectedVehicle.name ? { name: vehName, km_cost: kmCost } : v
      )
    } else {
      // Nuovo furgone
      if (settings.vehicles.some(v => v.name.toLowerCase() === vehName.toLowerCase())) {
        toast.error("Un mezzo con questo nome esiste già.")
        return
      }
      updatedVehicles = [...settings.vehicles, { name: vehName, km_cost: kmCost }]
    }

    const newSettings = {
      ...allGlobalSettings,
      vehicles: updatedVehicles
    }

    try {
      await invoke('save_global_settings', { settings: newSettings })
      setAllGlobalSettings(newSettings)
      setSettings({ vehicles: updatedVehicles })
      setIsDrawerOpen(false)
      setStatus({ type: 'success', message: 'Parco mezzi aggiornato' })
      setTimeout(() => setStatus({ type: '', message: '' }), 2000)
    } catch (err) {
      toast.error("Errore salvataggio: " + err)
    }
  }

  const handleDelete = async () => {
    if (vehicleToDelete) {
      const updatedVehicles = settings.vehicles.filter(v => v.name !== vehicleToDelete)
      const newSettings = {
        ...allGlobalSettings,
        vehicles: updatedVehicles
      }
      try {
        await invoke('save_global_settings', { settings: newSettings })
        setAllGlobalSettings(newSettings)
        setSettings({ vehicles: updatedVehicles })
        setIsConfirmOpen(false)
        setStatus({ type: 'success', message: 'Mezzo rimosso' })
        setTimeout(() => setStatus({ type: '', message: '' }), 2000)
      } catch (err) {
        toast.error("Errore rimozione: " + err)
      }
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-accent" size={48} />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-premium-in">
      {status.message && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-2xl flex items-center gap-4 shadow-2xl z-50 animate-premium-in ${
          status.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-50 text-red-600 border border-red-100'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={20} className="text-green-400" /> : <AlertCircle size={20} />}
          <span className="text-[0.65rem] font-black uppercase tracking-widest">{status.message}</span>
        </div>
      )}

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Parco Mezzi</h1>
          <p className="text-[0.7rem] font-black uppercase tracking-[0.3em] text-slate-400 mt-1">Gestione dei mezzi e costi chilometrici</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-accent transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Cerca mezzo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/50 backdrop-blur-md border border-white/50 rounded-2xl py-3 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all w-64 shadow-sm"
            />
          </div>
          
          <button 
            onClick={() => { setSelectedVehicle(null); setIsDrawerOpen(true); }}
            className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-accent/30 transition-all hover:-translate-y-1"
          >
            <Plus size={18} />
            Aggiungi Mezzo
          </button>
        </div>
      </div>

      {filteredVehicles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredVehicles.map(veh => (
            <EntityCard 
              key={veh.name}
              icon={<Truck size={24} />}
              title={veh.name}
              subtitle={`Costo al km: € ${veh.km_cost.toFixed(2)} / km`}
              onEdit={() => { setSelectedVehicle(veh); setIsDrawerOpen(true); }}
              onDelete={() => { setVehicleToDelete(veh.name); setIsConfirmOpen(true); }}
              onClick={() => { setSelectedVehicle(veh); setIsDrawerOpen(true); }}
              footerItems={[
                { icon: <Euro size={12} />, label: `€ ${veh.km_cost.toFixed(2)} / km` }
              ]}
            />
          ))}
        </div>
      ) : (
        <div className="glass-panel p-20 text-center rounded-[3.5rem] border-2 border-dashed border-slate-200">
          <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
            <Truck size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Nessun mezzo registrato</h3>
          <p className="text-slate-400 text-sm mt-2">Aggiungi i tuoi mezzi per tracciare i costi chilometrici di trasferta.</p>
        </div>
      )}

      <DrawerShell 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        title={selectedVehicle ? "Modifica Mezzo" : "Nuovo Mezzo"}
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">Nome Mezzo / Furgone</label>
            <input 
              required
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={(e) => setTimeout(() => e.target.select(), 0)}
              className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-accent/20 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">Costo Chilometrico Standard (€/km)</label>
            <input 
              required
              type="number"
              step="0.01"
              name="cost"
              value={cost}
              onChange={(e) => setCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
              onFocus={(e) => setTimeout(() => e.target.select(), 0)}
              className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-accent/20 transition-all"
            />
          </div>
          <button 
            type="submit"
            disabled={isSaveDisabled}
            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all mt-4 ${
              isSaveDisabled 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                : 'bg-accent text-white hover:bg-accent/90 shadow-xl shadow-accent/20'
            }`}
          >
            {selectedVehicle ? 'Salva Modifiche' : 'Aggiungi Parco Mezzi'}
          </button>
        </form>
      </DrawerShell>

      <ConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Rimuovi Mezzo"
        message="Sei sicuro di voler rimuovere questo mezzo dal parco mezzi?"
      />
    </div>
  )
}

export default ResourcesSettings
