import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { 
  Target, 
  Save, 
  AlertCircle,
  Tag,
  Euro,
  Truck,
  Wrench
} from 'lucide-react'
import DrawerShell from './ui/DrawerShell'
import Select from './ui/Select'
import CategorySelector from './ui/CategorySelector'

const EditCostCenterDrawer = ({ isOpen, onClose, cc, projectId, onSave }) => {
  const [errors, setErrors] = useState({})
  const [formData, setFormData] = useState({
    project_id: Number(projectId),
    brand: '',
    model: '',
    category: 'Robot Lely',
    base_cost: 0,
    markup: 0.15,
    shipping: 0,
    install_fee: 0
  })

  const [categoryOptions, setCategoryOptions] = useState([
    { id: 'Generale', label: 'Generale' }
  ])

  useEffect(() => {
    invoke('get_global_settings').then(res => {
      if (res.categories_cost_center && res.categories_cost_center.length > 0) {
        setCategoryOptions(res.categories_cost_center.map(c => ({ id: c, label: c })))
      }
    }).catch(console.error)
  }, [])

  const handleAddNewCategory = async (newCategoryName) => {
    const trimmed = newCategoryName.trim()
    if (!trimmed) return

    try {
      const currentSettings = await invoke('get_global_settings')
      const categories = currentSettings.categories_cost_center || []

      if (!categories.includes(trimmed)) {
        const updatedCategories = [...categories, trimmed]
        const newSettings = {
          ...currentSettings,
          categories_cost_center: updatedCategories
        }

        await invoke('save_global_settings', { settings: newSettings })
        setCategoryOptions(updatedCategories.map(c => ({ id: c, label: c })))
      }

      setFormData(prev => ({ ...prev, category: trimmed }))
    } catch (err) {
      console.error("Errore nel salvataggio della nuova categoria:", err)
      alert("Impossibile salvare la nuova categoria: " + err)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setErrors({})
      if (cc) {
        setFormData({
          ...cc,
          base_cost: cc.base_cost || 0,
          markup: cc.markup || 0,
          shipping: cc.shipping || 0,
          install_fee: cc.install_fee || 0
        })
      } else {
        setFormData({
          project_id: Number(projectId),
          brand: '',
          model: '',
          category: 'Robot Lely',
          base_cost: 0,
          markup: 0.15,
          shipping: 0,
          install_fee: 0
        })
      }
    }
  }, [isOpen, cc, projectId])

  const validateField = (name, value) => {
    let error = ''
    if (name === 'model' && !value) {
      error = 'Il modello/nome è obbligatorio'
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
    if (!validateField('model', formData.model)) return
    
    const dataToSave = {
      ...formData,
      project_id: Number(formData.project_id || projectId),
      base_cost: parseFloat(formData.base_cost) || 0,
      markup: parseFloat(formData.markup) || 0,
      shipping: parseFloat(formData.shipping) || 0,
      install_fee: parseFloat(formData.install_fee) || 0
    }
    
    onSave(dataToSave)
  }

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title={cc ? 'Modifica Centro di Costo' : 'Nuovo Centro di Costo'}
      subtitle={formData.model || 'Configurazione Entità'}
      icon={<Target size={24} />}
      footer={
        <>
          <button type="button" onClick={onClose} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-slate-200 transition-all">
            Annulla
          </button>
          <button type="button" onClick={handleSaveInternal} className="flex-1 py-4 bg-accent text-white rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-accent/90 transition-all shadow-xl shadow-accent/20 flex items-center justify-center gap-2">
            <Save size={18} /> Salva Centro
          </button>
        </>
      }
    >
      <div className="space-y-10">
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-accent rounded-full"></div>
            <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-800">Dati Identificativi</span>
          </div>

          <div className="space-y-2">
            <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Categoria</label>
            <CategorySelector 
              categories={categoryOptions}
              value={formData.category}
              onChange={(val) => setFormData(p => ({...p, category: val}))}
              onAddNew={handleAddNewCategory}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Marca</label>
              <input name="brand" value={formData.brand} onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 px-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm" placeholder="Es: Lely" />
            </div>
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Modello *</label>
              <input name="model" value={formData.model} onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} className={`w-full bg-white/50 border rounded-2xl py-4 px-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 transition-all shadow-sm ${errors.model ? 'border-rose-300 focus:ring-rose-100' : 'border-white/50 focus:ring-accent/20 focus:bg-white'}`} placeholder="Es: Astronaut A5" />
              {errors.model && <p className="text-[0.6rem] font-bold text-rose-500 ml-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.model}</p>}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-emerald-400 rounded-full"></div>
            <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-800">Configurazione Costi</span>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Costo Base (€)</label>
              <div className="relative">
                <Euro className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="number" name="base_cost" value={formData.base_cost} onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Ricarico (%)</label>
              <input type="number" name="markup" value={formData.markup * 100} onChange={(e) => setFormData(p => ({...p, markup: parseFloat(e.target.value)/100}))} className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 px-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Trasporto (€)</label>
              <div className="relative">
                <Truck className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="number" name="shipping" value={formData.shipping} onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Fee Montaggio (€)</label>
              <div className="relative">
                <Wrench className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="number" name="install_fee" value={formData.install_fee} onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm" />
              </div>
            </div>
          </div>
        </section>
      </div>
    </DrawerShell>
  )
}

export default EditCostCenterDrawer
