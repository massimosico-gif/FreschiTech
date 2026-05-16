import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  X,
  Truck,
  Settings
} from 'lucide-react'

import Card from '../ui/Card'

const ResourceListManager = ({ input, setInput, addItem, removeItem, vehicles }) => (
  <Card hoverEffect={true} className="p-0 overflow-hidden">
    <div className="p-10 space-y-8">
      <div className="flex items-center gap-6">
        <div className="p-5 bg-slate-50 text-accent rounded-[2rem] shadow-sm">
          <Truck size={32} />
        </div>
        <div>
          <h3 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Parco Mezzi</h3>
          <p className="text-[0.7rem] font-black text-slate-400 uppercase tracking-[0.2em] mt-1">Gestione dei mezzi a disposizione per le trasferte</p>
        </div>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Settings className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
          <input 
            type="text" 
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            placeholder="Inserisci nome mezzo (es. Furgone Lely, Fiat Doblò...)"
            className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm"
          />
        </div>
        <button 
          onClick={addItem}
          className="px-8 bg-accent hover:bg-accent-hover text-white rounded-2xl font-black text-[0.7rem] uppercase tracking-widest transition-all shadow-lg shadow-accent/20 active:scale-95"
        >
          Aggiungi Mezzo
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-8 border-t border-slate-50">
        {vehicles.length > 0 ? vehicles.map((item, idx) => (
          <div 
            key={idx} 
            className="flex items-center justify-between bg-slate-50 p-5 rounded-3xl group hover:bg-red-50 transition-all animate-fade-in"
          >
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center text-slate-300 group-hover:text-accent transition-colors shadow-sm">
                <Truck size={18} />
              </div>
              <span className="text-[0.8rem] font-black uppercase tracking-widest text-slate-600 group-hover:text-accent">{item}</span>
            </div>
            <button 
              onClick={() => removeItem(item)}
              className="p-2 text-slate-300 hover:text-accent transition-all"
            >
              <X size={18} />
            </button>
          </div>
        )) : (
          <div className="col-span-full py-12 text-center">
            <p className="text-sm font-bold text-slate-300 uppercase tracking-[0.2em] italic">Nessun mezzo registrato nel sistema</p>
          </div>
        )}
      </div>
    </div>
  </Card>
)

const ResourcesSettings = () => {
  const [settings, setSettings] = useState({
    vehicles: []
  })
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', message: '' })

  useEffect(() => {
    invoke('get_global_settings')
      .then(res => {
        setSettings({
          vehicles: res.vehicles || []
        })
        setLoading(false)
      })
      .catch(err => {
        console.error("Errore caricamento mezzi:", err)
        setLoading(false)
      })
  }, [])

  const saveSettings = async (newSettings) => {
    try {
      await invoke('save_global_settings', { settings: newSettings })
      setStatus({ type: 'success', message: 'Parco mezzi aggiornato' })
      setTimeout(() => setStatus({ type: '', message: '' }), 2000)
    } catch (err) {
      setStatus({ type: 'error', message: 'Errore nel salvataggio automatico' })
    }
  }

  const addItem = () => {
    const value = input.trim()
    if (!value) return
    if (settings.vehicles.includes(value)) return

    const newSettings = {
      ...settings,
      vehicles: [...settings.vehicles, value]
    }
    setSettings(newSettings)
    setInput('')
    saveSettings(newSettings)
  }

  const removeItem = (value) => {
    const newSettings = {
      ...settings,
      vehicles: settings.vehicles.filter(item => item !== value)
    }
    setSettings(newSettings)
    saveSettings(newSettings)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-accent" size={48} />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-premium-in">
      {status.message && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-2xl flex items-center gap-4 shadow-2xl z-50 animate-premium-in ${
          status.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-50 text-red-600 border border-red-100'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={20} className="text-green-400" /> : <AlertCircle size={20} />}
          <span className="text-[0.65rem] font-black uppercase tracking-widest">{status.message}</span>
        </div>
      )}

      <ResourceListManager 
        input={input}
        setInput={setInput}
        addItem={addItem}
        removeItem={removeItem}
        vehicles={settings.vehicles}
      />
    </div>
  )
}

export default ResourcesSettings
