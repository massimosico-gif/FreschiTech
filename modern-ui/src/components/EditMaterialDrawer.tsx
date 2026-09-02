import React, { useState, useEffect, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { 
  Package, 
  Save, 
  AlertCircle,
  Euro,
  Hash,
  Truck,
  Box,
  Target
} from 'lucide-react'
import DrawerShell from './ui/DrawerShell'
import Select from './ui/Select'
import DatePicker from './ui/DatePicker'
import PhaseSelector from './ui/PhaseSelector'
import { Material, CostCenter, CatalogMaterial } from '../types'
import { useToast } from '@tecno/ui/feedback'

interface EditMaterialDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  material: Material | null;
  projectId: number | string;
  costCenters: CostCenter[];
  onSave: (data: Partial<Material>) => void;
  defaultCostCenterId?: number | string | null;
}

const EditMaterialDrawer: React.FC<EditMaterialDrawerProps> = ({ 
  isOpen, 
  onClose, 
  material, 
  projectId, 
  costCenters, 
  onSave, 
  defaultCostCenterId = null 
}) => {
  const toast = useToast()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formData, setFormData] = useState<Partial<Material>>({
    project_id: Number(projectId),
    cost_center_id: defaultCostCenterId ? Number(defaultCostCenterId) : null,
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
  
  const [initialData, setInitialData] = useState<string>('')

  // Autocomplete suggestions state
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [activeField, setActiveField] = useState<string | null>(null)
  const [highlightedIndex, setHighlightedIndex] = useState<number>(0)

  const [phaseOptions, setPhaseOptions] = useState<Array<{ id: string; label: string }>>([
    { id: 'Generale', label: 'Generale' }
  ])

  useEffect(() => {
    invoke<any>('get_global_settings').then(res => {
      if (res.phases_material && res.phases_material.length > 0) {
        setPhaseOptions(res.phases_material.map((p: string) => ({ id: p, label: p })))
      }
    }).catch(console.error)
  }, [])

  const handleAddNewPhase = async (newPhaseName: string) => {
    const trimmed = newPhaseName.trim()
    if (!trimmed) return

    try {
      const currentSettings = await invoke<any>('get_global_settings')
      const phases = currentSettings.phases_material || []

      if (!phases.includes(trimmed)) {
        const updatedPhases = [...phases, trimmed]
        const newSettings = {
          ...currentSettings,
          phases_material: updatedPhases
        }

        await invoke('save_global_settings', { settings: newSettings })
        setPhaseOptions(updatedPhases.map((p: string) => ({ id: p, label: p })))
      }

      setFormData(prev => ({ ...prev, phase: trimmed }))
    } catch (err) {
      console.error("Errore nel salvataggio della nuova fase:", err)
      toast.error("Impossibile salvare la nuova fase: " + err)
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
      setSuggestions([])
      setActiveField(null)
      setHighlightedIndex(0)
      let data: Partial<Material>;
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
          cost_center_id: defaultCostCenterId ? Number(defaultCostCenterId) : null,
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

  const isSaveDisabled = useMemo(() => {
    const isPhaseMissing = !formData.phase || !formData.phase.trim()
    const isCodeMissing = !formData.code || !formData.code.trim()
    const isDescriptionMissing = !formData.description || !formData.description.trim()
    const isNotDirtyEdit = material && !isDirty
    return !!(isPhaseMissing || isCodeMissing || isDescriptionMissing || isNotDirtyEdit)
  }, [formData.phase, formData.code, formData.description, material, isDirty])

  const validateField = (name: string, value: any) => {
    let error = ''
    if (name === 'description' && !value) {
      error = 'La descrizione è obbligatoria'
    }
    if (name === 'code' && !value) {
      error = 'Il codice è obbligatorio'
    }
    if (name === 'quantity' && value <= 0) {
      error = 'La quantità deve essere maggiore di 0'
    }
    setErrors(prev => ({ ...prev, [name]: error }))
    return !error
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    validateField(name, value)

    if (name === 'code' || name === 'description') {
      if (value.trim().length >= 2) {
        invoke<CatalogMaterial[]>('search_catalog_materials', { query: value })
          .then((results) => {
            setSuggestions(results)
            setActiveField(name)
            setHighlightedIndex(0)
          })
          .catch((err) => {
            console.error('Errore ricerca catalogo:', err)
            setSuggestions([])
            setActiveField(null)
          })
      } else {
        setSuggestions([])
        setActiveField(null)
      }
    } else if (name === 'supplier') {
      if (value.trim().length >= 1) {
        invoke<string[]>('search_suppliers', { query: value })
          .then((results) => {
            setSuggestions(results)
            setActiveField(name)
            setHighlightedIndex(0)
          })
          .catch((err) => {
            console.error('Errore ricerca fornitori:', err)
            setSuggestions([])
            setActiveField(null)
          })
      } else {
        setSuggestions([])
        setActiveField(null)
      }
    }
  }

  const handleSelectSuggestion = (item: CatalogMaterial) => {
    setFormData(prev => ({
      ...prev,
      code: item.code || prev.code,
      description: item.description || prev.description,
      unit: item.unit || prev.unit,
      unit_price: item.unit_price !== null && item.unit_price !== undefined ? item.unit_price : prev.unit_price,
      supplier: item.supplier || prev.supplier,
      markup: item.markup !== null && item.markup !== undefined && item.markup > 0 ? item.markup : 0.25,
    }))
    setErrors(prev => ({
      ...prev,
      code: '',
      description: ''
    }))
    setSuggestions([])
    setActiveField(null)
  }

  const handleSelectSupplierSuggestion = (supplierName: string) => {
    setFormData(prev => ({
      ...prev,
      supplier: supplierName
    }))
    setSuggestions([])
    setActiveField(null)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (activeField && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex(prev => (prev + 1) % suggestions.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (suggestions[highlightedIndex]) {
          if (activeField === 'supplier') {
            handleSelectSupplierSuggestion(suggestions[highlightedIndex])
          } else {
            handleSelectSuggestion(suggestions[highlightedIndex])
          }
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setSuggestions([])
        setActiveField(null)
      }
    }
  }

  const handleBlur = () => {
    setTimeout(() => {
      setSuggestions([])
      setActiveField(null)
    }, 200)
  }

  const renderSuggestions = (fieldName: string) => {
    if (activeField !== fieldName || suggestions.length === 0) return null;
    if (fieldName === 'supplier') {
      return (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white/95 backdrop-blur-md border border-slate-100/50 rounded-2xl shadow-2xl max-h-60 overflow-y-auto z-50 p-2 space-y-1">
          {suggestions.map((name, index) => (
            <div
              key={index}
              onMouseDown={(e) => {
                e.preventDefault();
                handleSelectSupplierSuggestion(name);
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`flex items-center p-3 rounded-xl cursor-pointer transition-all ${
                index === highlightedIndex
                  ? 'bg-accent/10 text-slate-800'
                  : 'hover:bg-slate-50 text-slate-700'
              }`}
            >
              <span className="text-xs font-bold truncate">
                {name}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return (
      <div className="absolute left-0 right-0 top-full mt-2 bg-white/95 backdrop-blur-md border border-slate-100/50 rounded-2xl shadow-2xl max-h-60 overflow-y-auto z-50 p-2 space-y-1">
        {suggestions.map((item: CatalogMaterial, index) => (
          <div
            key={item.id || index}
            onMouseDown={(e) => {
              e.preventDefault();
              handleSelectSuggestion(item);
            }}
            onMouseEnter={() => setHighlightedIndex(index)}
            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
              index === highlightedIndex
                ? 'bg-accent/10 text-slate-800'
                : 'hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-[0.65rem] font-bold text-accent px-1.5 py-0.5 bg-accent/10 rounded">
                  {item.code || 'N/A'}
                </span>
                <span className="text-xs font-bold truncate max-w-[200px]">
                  {item.description}
                </span>
              </div>
              {item.supplier && (
                <span className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest mt-1">
                  {item.supplier}
                </span>
              )}
            </div>
            <div className="text-right flex flex-col justify-center">
              <span className="text-xs font-black text-slate-800">
                € {item.unit_price !== null && item.unit_price !== undefined ? item.unit_price.toFixed(2) : '0.00'}
              </span>
              <span className="text-[0.6rem] font-bold text-slate-400">
                /{item.unit || 'pz'}
              </span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  const handleSaveInternal = () => {
    const isDescValid = validateField('description', formData.description)
    const isCodeValid = validateField('code', formData.code)
    const isQtyValid = validateField('quantity', formData.quantity)
    
    if (!isDescValid || !isCodeValid || !isQtyValid) return
    
    const dataToSave = {
      ...formData,
      project_id: Number(formData.project_id || projectId),
      cost_center_id: formData.cost_center_id ? Number(formData.cost_center_id) : null,
      quantity: parseFloat(String(formData.quantity)) || 0,
      unit_price: parseFloat(String(formData.unit_price)) || 0,
      markup: parseFloat(String(formData.markup)) || 0
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
            disabled={isSaveDisabled}
            className={`flex-1 py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest transition-all shadow-xl flex items-center justify-center gap-2 ${
              !isSaveDisabled 
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
                onChange={(val: any) => setFormData(p => ({...p, cost_center_id: val}))}
                icon={Target}
              />
            </div>
          )}

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Fase / Ambito</label>
              <PhaseSelector 
                phases={phaseOptions}
                value={formData.phase || 'Generale'}
                onChange={(val: string) => setFormData(p => ({...p, phase: val}))}
                onAddNew={handleAddNewPhase}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Data Inserimento</label>
              <DatePicker 
                value={formData.date || ''} 
                onChange={(val: string) => setFormData(p => ({...p, date: val}))} 
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
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Codice *</label>
              <div className="relative">
                <Hash className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${errors.code ? 'text-rose-500' : 'text-slate-400'}`} size={16} />
                <input 
                  name="code" 
                  value={formData.code || ''} 
                  onChange={handleChange} 
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                  onFocus={(e) => setTimeout(() => e.target.select(), 0)} 
                  className={`w-full bg-white/50 border rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 transition-all shadow-sm ${errors.code ? 'border-rose-300 focus:ring-rose-100' : 'border-white/50 focus:ring-accent/20 focus:bg-white'}`} 
                  placeholder="Es: MAT-01" 
                  autoComplete="off"
                />
                {renderSuggestions('code')}
              </div>
              {errors.code && <p className="text-[0.6rem] font-bold text-rose-500 ml-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.code}</p>}
            </div>
            <div className="col-span-2 space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Descrizione *</label>
              <div className="relative">
                <input 
                  name="description" 
                  value={formData.description || ''} 
                  onChange={handleChange} 
                  onKeyDown={handleKeyDown}
                  onBlur={handleBlur}
                  onFocus={(e) => setTimeout(() => e.target.select(), 0)} 
                  className={`w-full bg-white/50 border rounded-2xl py-4 px-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 transition-all shadow-sm ${errors.description ? 'border-rose-300 focus:ring-rose-100' : 'border-white/50 focus:ring-accent/20 focus:bg-white'}`} 
                  placeholder="Es: Tubo PVC 50mm" 
                  autoComplete="off"
                />
                {renderSuggestions('description')}
              </div>
              {errors.description && <p className="text-[0.6rem] font-bold text-rose-500 ml-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.description}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Fornitore</label>
            <div className="relative">
              <Truck className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                name="supplier" 
                value={formData.supplier || ''} 
                onChange={handleChange} 
                onKeyDown={handleKeyDown}
                onBlur={handleBlur}
                onFocus={(e) => setTimeout(() => e.target.select(), 0)} 
                className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm" 
                placeholder="Es: Idraulica S.r.l." 
                autoComplete="off"
              />
              {renderSuggestions('supplier')}
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
                <input type="number" name="quantity" value={formData.quantity || 1} onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} className={`w-full bg-white/50 border rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 transition-all shadow-sm ${errors.quantity ? 'border-rose-300 focus:ring-rose-100' : 'border-white/50 focus:ring-accent/20 focus:bg-white'}`} step="0.01" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Unità di Misura</label>
              <input name="unit" value={formData.unit || 'pz'} onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 px-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm" placeholder="Es: pz, m, kg" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Prezzo Unitario (€)</label>
              <div className="relative">
                <Euro className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                <input type="number" name="unit_price" value={formData.unit_price || 0} onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm" step="0.01" />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Ricarico (%)</label>
              <input type="number" name="markup" value={((formData.markup || 0) * 100)} onChange={(e) => setFormData(p => ({...p, markup: parseFloat(e.target.value)/100}))} onFocus={(e) => setTimeout(() => e.target.select(), 0)} className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 px-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm" />
            </div>
          </div>
          
          <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex justify-between items-center">
            <div>
              <p className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 mb-1">Totale Vendita Previsto</p>
              <p className="text-xl font-black text-slate-800">
                € {(((formData.quantity || 0) * (formData.unit_price || 0)) * (1 + (formData.markup || 0))).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 mb-1">Margine</p>
              <p className="text-sm font-bold text-emerald-500">
                +€ {(((formData.quantity || 0) * (formData.unit_price || 0)) * (formData.markup || 0)).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </section>
      </div>
    </DrawerShell>
  )
}

export default EditMaterialDrawer
