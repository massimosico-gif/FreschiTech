import React, { useState, useEffect, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { 
  Package, 
  Save, 
  AlertCircle,
  Tag,
  Euro,
  Hash,
  Layers,
  Truck,
  Box,
  Target,
  Calendar
} from 'lucide-react'
import DrawerShell from './ui/DrawerShell'
import Select from './ui/Select'
import DatePicker from './ui/DatePicker'
import PhaseSelector from './ui/PhaseSelector'

const EditMaterialDrawer = ({ isOpen, onClose, material, projectId, costCenters, onSave, defaultCostCenterId = null }) => {
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    project_id: Number(projectId),
    cost_center_id: defaultCostCenterId,
    phase: 'Generale',
    date: new Date().toISOString().split('T')[0],
    code: '',
    description: '',
    supplier: '',
    quantity: 1,
    unit: 'pz',
    unit_price: 0,
    markup: 0.25
  })
  
  const [initialData, setInitialData] = useState('')

  const [phaseOptions, setPhaseOptions] = useState([
    { id: 'Generale', label: 'Generale' }
  ])

  useEffect(() => {
    invoke('get_global_settings').then(res => {
      if (res.phases_material && res.phases_material.length > 0) {
        setPhaseOptions(res.phases_material.map(p => ({ id: p, label: p })))
      }
    }).catch(console.error)
  }, [])

  const handleAddNewPhase = async (newPhaseName) => {
    const trimmed = newPhaseName.trim()
    if (!trimmed) return

    try {
      const currentSettings = await invoke('get_global_settings')
      const phases = currentSettings.phases_material || []

      if (!phases.includes(trimmed)) {
        const updatedPhases = [...phases, trimmed]
        const newSettings = {
          ...currentSettings,
          phases_material: updatedPhases
        }

        await invoke('save_global_settings', { settings: newSettings })
        setPhaseOptions(updatedPhases.map(p => ({ id: p, label: p })))
      }

      setFormData(prev => ({ ...prev, phase: trimmed }))
    } catch (err) {
      console.error("Errore nel salvataggio della nuova fase:", err)
      alert("Impossibile salvare la nuova fase: " + err)
    }
  }

  const ccOptions = useMemo(() => [
    { id: null, label: '-- Generale (Nessun Centro) --' },
    ...costCenters.map(cc => ({
      id: cc.id,
      label: cc.model
    }))
  ], [costCenters])

  useEffect(() => {
    if (isOpen) {
      setErrors({})
      let data;
      if (material) {
        data = {
          ...material,
          quantity: material.quantity || 1,
          unit_price: material.unit_price || 0,
          markup: material.markup || 0.25
        }
      } else {
        data = {
          project_id: Number(projectId),
          cost_center_id: defaultCostCenterId,
          phase: 'Generale',
          date: new Date().toISOString().split('T')[0],
          code: '',
          description: '',
          supplier: '',
          quantity: 1,
          unit: 'pz',
          unit_price: 0,
          markup: 0.25
        }
      }
      setFormData(data)
      setInitialData(JSON.stringify(data))
    }
  }, [isOpen, material, projectId, defaultCostCenterId])

  const isDirty = useMemo(() => {
    return JSON.stringify(formData) !== initialData
  }, [formData, initialData])

  const validateField = (name, value) => {
    let error = ''
    if (name === 'description' && !value) {
      error = 'La descrizione è obbligatoria'
    }
    if (name === 'quantity' && value <= 0) {
      error = 'La quantità deve essere maggiore di 0'
    }
    setErrors(prev => ({ ...prev, [name]: error }))
    return !error
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    validateField(name, value)
  }

  const handleSaveInternal = () => {
    const isDescValid = validateField('description', formData.description)
    const isQtyValid = validateField('quantity', formData.quantity)
    
    if (!isDescValid || !isQtyValid) return
    
    const dataToSave = {
      ...formData,
      project_id: Number(formData.project_id || projectId),
      cost_center_id: formData.cost_center_id ? parseInt(formData.cost_center_id) : null,
      quantity: parseFloat(formData.quantity) || 0,
      unit_price: parseFloat(formData.unit_price) || 0,
      markup: parseFloat(formData.markup) || 0
    }
    
    onSave(dataToSave)
  }

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title={material ? 'Modifica Materiale' : 'Nuovo Materiale'}
      subtitle={formData.description || 'Inserimento articolo a carrello'}
      icon={<Package size={24} />}
      footer={
        <>
          <button type="button" onClick={onClose} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
            Annulla
          </button>
          <button 
            type="button" 
            onClick={handleSaveInternal} 
            disabled={!isDirty}
            className={`flex-1 py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 ${
              isDirty 
              ? 'bg-accent text-white hover:bg-accent/90 shadow-accent/20' 
              : 'bg-slate-100 text-slate-300 shadow-none cursor-not-allowed'
            }`}
          >
            <Save size={18} /> Salva Materiale
          </button>
        </>
      }
    >
      <div className="space-y-10">
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-accent rounded-full"></div>
            <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-800">Classificazione</span>
          </div>

          {!defaultCostCenterId && (
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Centro di Costo</label>
              <Select 
                options={ccOptions}
                value={formData.cost_center_id}
                onChange={(val) => setFormData(p => ({...p, cost_center_id: val}))}
                icon={Target}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Fase / Ambito</label>
              <PhaseSelector 
                phases={phaseOptions}
                value={formData.phase}
                onChange={(val) => setFormData(p => ({...p, phase: val}))}
                onAddNew={handleAddNewPhase}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Data Inserimento</label>
              <DatePicker 
                value={formData.date} 
                onChange={(val) => setFormData(p => ({...p, date: val}))} 
              />
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-sky-400 rounded-full"></div>
            <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-800">Dettaglio Articolo</span>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <div className="col-span-1 space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Codice</label>
              <div className="relative">
                <Hash className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input name="code" value={formData.code} onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm" placeholder="Es: MAT-01" />
              </div>
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Descrizione *</label>
              <input name="description" value={formData.description} onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} className={`w-full bg-white/50 border rounded-2xl py-4 px-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 transition-all shadow-sm ${errors.description ? 'border-rose-300 focus:ring-rose-100' : 'border-white/50 focus:ring-accent/20 focus:bg-white'}`} placeholder="Es: Tubo PVC 50mm" />
              {errors.description && <p className="text-[0.6rem] font-bold text-rose-500 ml-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.description}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Fornitore</label>
            <div className="relative">
              <Truck className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input name="supplier" value={formData.supplier} onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm" placeholder="Es: Idraulica S.r.l." />
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-emerald-400 rounded-full"></div>
            <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-800">Prezzi e Quantità</span>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Quantità</label>
              <div className="relative">
                <Box className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="number" name="quantity" value={formData.quantity} onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} className={`w-full bg-white/50 border rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 transition-all shadow-sm ${errors.quantity ? 'border-rose-300 focus:ring-rose-100' : 'border-white/50 focus:ring-accent/20 focus:bg-white'}`} step="0.01" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Unità di Misura</label>
              <input name="unit" value={formData.unit} onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 px-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm" placeholder="Es: pz, m, kg" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Prezzo Unitario (€)</label>
              <div className="relative">
                <Euro className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="number" name="unit_price" value={formData.unit_price} onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm" step="0.01" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Ricarico (%)</label>
              <input type="number" name="markup" value={formData.markup * 100} onChange={(e) => setFormData(p => ({...p, markup: parseFloat(e.target.value)/100}))} className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 px-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm" />
            </div>
          </div>
          
          <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex justify-between items-center">
            <div>
              <p className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 mb-1">Totale Vendita Previsto</p>
              <p className="text-xl font-black text-slate-800">
                € {((formData.quantity * formData.unit_price) * (1 + formData.markup)).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 mb-1">Margine</p>
              <p className="text-sm font-bold text-emerald-500">
                +€ {((formData.quantity * formData.unit_price) * formData.markup).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </section>
      </div>
    </DrawerShell>
  )
}

export default EditMaterialDrawer
