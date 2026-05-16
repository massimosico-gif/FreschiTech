import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  X,
  Target,
  Box,
  Clock
} from 'lucide-react'

import Card from '../ui/Card'

const ListManager = ({ title, icon: Icon, items, onAdd, onRemove, inputVal, setInputVal, placeholder }) => (
  <Card hoverEffect={true} className="p-0 overflow-hidden h-full">
    <div className="p-8 space-y-6">
      <div className="flex items-center gap-4">
        <div className="p-4 bg-slate-50 rounded-[1.5rem] text-accent shadow-sm">
          <Icon size={24} />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{title}</h3>
          <p className="text-[0.6rem] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Configurazione parametri</p>
        </div>
      </div>

      <div className="flex gap-2">
        <input 
          type="text" 
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onAdd()}
          placeholder={placeholder}
          className="flex-1 bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 transition-all"
        />
        <button 
          onClick={onAdd}
          className="p-3 bg-accent hover:bg-accent-hover text-white rounded-xl transition-all shadow-lg shadow-accent/20 active:scale-95"
        >
          <Plus size={20} />
        </button>
      </div>

      <div className="flex flex-wrap gap-2 pt-4 border-t border-slate-50">
        {items.length > 0 ? items.map((item, idx) => (
          <div 
            key={idx} 
            className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-xl group hover:bg-red-50 transition-all animate-fade-in"
          >
            <span className="text-[0.65rem] font-black uppercase tracking-widest text-slate-600 group-hover:text-accent">{item}</span>
            <button 
              onClick={() => onRemove(item)}
              className="text-slate-300 hover:text-accent transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )) : (
          <div className="py-8 w-full text-center">
            <p className="text-[0.6rem] font-black text-slate-300 uppercase tracking-[0.2em] italic">Nessun elemento definito</p>
          </div>
        )}
      </div>
    </div>
  </Card>
)

const CategoriesSettings = () => {
  const [settings, setSettings] = useState({
    categories_cost_center: [],
    phases_material: [],
    phases_labor: []
  })
  const [inputs, setInputs] = useState({
    cc: '',
    mat: '',
    lab: ''
  })
  const [loading, setLoading] = useState(true)
  const [status, setStatus] = useState({ type: '', message: '' })

  useEffect(() => {
    invoke('get_global_settings')
      .then(res => {
        setSettings({
          categories_cost_center: res.categories_cost_center || [],
          phases_material: res.phases_material || [],
          phases_labor: res.phases_labor || []
        })
        setLoading(false)
      })
      .catch(err => {
        console.error("Errore caricamento categorie:", err)
        setLoading(false)
      })
  }, [])

  const saveSettings = async (newSettings) => {
    try {
      await invoke('save_global_settings', { settings: newSettings })
      setStatus({ type: 'success', message: 'Modifiche salvate automaticamente' })
      setTimeout(() => setStatus({ type: '', message: '' }), 2000)
    } catch (err) {
      setStatus({ type: 'error', message: 'Errore nel salvataggio automatico' })
    }
  }

  const addItem = (listKey, inputKey) => {
    const value = inputs[inputKey].trim()
    if (!value) return
    if (settings[listKey].includes(value)) return

    const newSettings = {
      ...settings,
      [listKey]: [...settings[listKey], value]
    }
    setSettings(newSettings)
    setInputs(prev => ({ ...prev, [inputKey]: '' }))
    saveSettings(newSettings)
  }

  const removeItem = (listKey, value) => {
    const newSettings = {
      ...settings,
      [listKey]: settings[listKey].filter(item => item !== value)
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
    <div className="space-y-8 animate-premium-in">
      {status.message && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-2xl flex items-center gap-4 shadow-2xl z-50 animate-premium-in ${
          status.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-50 text-red-600 border border-red-100'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={20} className="text-green-400" /> : <AlertCircle size={20} />}
          <span className="text-[0.65rem] font-black uppercase tracking-widest">{status.message}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <ListManager 
          title="Categorie Centri Costo"
          icon={Target}
          items={settings.categories_cost_center}
          onAdd={() => addItem('categories_cost_center', 'cc')}
          onRemove={(val) => removeItem('categories_cost_center', val)}
          inputVal={inputs.cc}
          setInputVal={(val) => setInputs(prev => ({ ...prev, cc: val }))}
          placeholder="es. Bovini, Campagna..."
        />
        
        <ListManager 
          title="Fasi Materiali"
          icon={Box}
          items={settings.phases_material}
          onAdd={() => addItem('phases_material', 'mat')}
          onRemove={(val) => removeItem('phases_material', val)}
          inputVal={inputs.mat}
          setInputVal={(val) => setInputs(prev => ({ ...prev, mat: val }))}
          placeholder="es. Preparazione, Semina..."
        />

        <ListManager 
          title="Fasi / Ambiti Ore"
          icon={Clock}
          items={settings.phases_labor}
          onAdd={() => addItem('phases_labor', 'lab')}
          onRemove={(val) => removeItem('phases_labor', val)}
          inputVal={inputs.lab}
          setInputVal={(val) => setInputs(prev => ({ ...prev, lab: val }))}
          placeholder="es. Mungitura, Manutenzione..."
        />
      </div>
    </div>
  )
}

export default CategoriesSettings
