import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { 
  Target, 
  Save, 
  AlertCircle,
  Euro
} from 'lucide-react'
import DrawerShell from './ui/DrawerShell'
import CategorySelector from './ui/CategorySelector'
import { CostCenter } from '../types'
import { useToast } from '../hooks/useFeedback'

interface EditCostCenterDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  cc: CostCenter | null;
  projectId: number | string;
  onSave: (data: Partial<CostCenter>) => void;
}

const EditCostCenterDrawer: React.FC<EditCostCenterDrawerProps> = ({ 
  isOpen, 
  onClose, 
  cc, 
  projectId, 
  onSave 
}) => {
  const toast = useToast()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [feePercent, setFeePercent] = useState<number>(0.06)
  const [formData, setFormData] = useState<Partial<CostCenter>>({
    project_id: Number(projectId),
    brand: '',
    model: '',
    category: 'Robot Lely',
    accepted_budget: 0,
    base_cost: 0,
    markup: 0.15,
    shipping: 0,
    install_fee: 0,
    install_fee_percent: 0.06
  })

  const [categoryOptions, setCategoryOptions] = useState<Array<{ id: string; label: string }>>([
    { id: 'Generale', label: 'Generale' }
  ])

  useEffect(() => {
    invoke<any>('get_global_settings').then(res => {
      if (res.categories_cost_center && res.categories_cost_center.length > 0) {
        setCategoryOptions(res.categories_cost_center.map((c: string) => ({ id: c, label: c })))
      }
      if (res.default_install_fee_percent !== undefined) {
        setFeePercent(parseFloat(res.default_install_fee_percent) || 0)
      }
    }).catch(console.error)
  }, [])

  const handleAddNewCategory = async (newCategoryName: string) => {
    const trimmed = newCategoryName.trim()
    if (!trimmed) return

    try {
      const currentSettings = await invoke<any>('get_global_settings')
      const categories = currentSettings.categories_cost_center || []

      if (!categories.includes(trimmed)) {
        const updatedCategories = [...categories, trimmed]
        const newSettings = {
          ...currentSettings,
          categories_cost_center: updatedCategories
        }

        await invoke('save_global_settings', { settings: newSettings })
        setCategoryOptions(updatedCategories.map((c: string) => ({ id: c, label: c })))
      }

      setFormData(prev => ({ ...prev, category: trimmed }))
    } catch (err) {
      console.error("Errore nel salvataggio della nuova categoria:", err)
      toast.error("Impossibile salvare la nuova categoria: " + err)
    }
  }

  useEffect(() => {
    if (isOpen) {
      setErrors({})
      if (cc) {
        setFormData({
          ...cc,
          accepted_budget: cc.accepted_budget || 0,
          base_cost: cc.base_cost || 0,
          markup: cc.markup || 0,
          shipping: cc.shipping || 0,
          install_fee: cc.install_fee || 0,
          install_fee_percent: cc.install_fee_percent !== undefined && cc.install_fee_percent !== null ? cc.install_fee_percent : feePercent
        })
      } else {
        setFormData({
          project_id: Number(projectId),
          brand: '',
          model: '',
          category: 'Robot Lely',
          accepted_budget: 0,
          base_cost: 0,
          markup: 0.15,
          shipping: 0,
          install_fee: 0,
          install_fee_percent: feePercent
        })
      }
    }
  }, [isOpen, cc, projectId, feePercent])

  const validateField = (name: string, value: any) => {
    let error = ''
    if (name === 'model' && !value) {
      error = 'Il modello/nome è obbligatorio'
    }
    setErrors(prev => ({ ...prev, [name]: error }))
    return !error
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    validateField(name, value)
  }

  const handleSaveInternal = () => {
    if (!validateField('model', formData.model)) return
    
    const acceptedBudgetVal = parseFloat(String(formData.accepted_budget)) || 0
    
    const dataToSave = {
      ...formData,
      project_id: Number(formData.project_id || projectId),
      accepted_budget: acceptedBudgetVal,
      base_cost: cc ? parseFloat(String(formData.base_cost)) || 0 : 0,
      markup: cc && formData.markup !== undefined ? parseFloat(String(formData.markup)) : 0.15,
      shipping: cc ? parseFloat(String(formData.shipping)) || 0 : 0,
      install_fee: cc ? parseFloat(String(formData.install_fee)) || 0 : 0,
      install_fee_percent: cc ? (formData.install_fee_percent !== undefined && formData.install_fee_percent !== null ? parseFloat(String(formData.install_fee_percent)) : feePercent) : feePercent
    }
    
    onSave(dataToSave)
  }
  const isModelMissing = !formData.model || !formData.model.trim()
  const isCategoryMissing = !formData.category || !formData.category.trim()
  const isSaveDisabled = isModelMissing || isCategoryMissing

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
          <button 
            type="button" 
            onClick={handleSaveInternal} 
            disabled={isSaveDisabled}
            className={`flex-1 py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl ${
              !isSaveDisabled
              ? 'bg-accent text-white hover:bg-accent/90 shadow-accent/20' 
              : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
            }`}
          >
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
              value={formData.category || 'Robot Lely'}
              onChange={(val: string) => setFormData(p => ({...p, category: val}))}
              onAddNew={handleAddNewCategory}
            />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Marca</label>
              <input name="brand" value={formData.brand || ''} onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 px-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm" placeholder="Es: Lely" />
            </div>
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Modello *</label>
              <input name="model" value={formData.model || ''} onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} className={`w-full bg-white/50 border rounded-2xl py-4 px-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 transition-all shadow-sm ${errors.model ? 'border-rose-300 focus:ring-rose-100' : 'border-white/50 focus:ring-accent/20 focus:bg-white'}`} placeholder="Es: Astronaut A5" />
              {errors.model && <p className="text-[0.6rem] font-bold text-rose-500 ml-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.model}</p>}
            </div>
          </div>
        </section>

        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-emerald-400 rounded-full"></div>
            <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-800">Dati Economici</span>
          </div>

          <div className="space-y-2">
            <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Preventivo Accettato (€)</label>
            <div className="relative">
              <Euro className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input type="number" name="accepted_budget" value={formData.accepted_budget || 0} onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm" />
            </div>
          </div>
        </section>
      </div>
    </DrawerShell>
  )
}

export default EditCostCenterDrawer
