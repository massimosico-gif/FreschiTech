import React, { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { invoke } from '@tauri-apps/api/core'
import { 
  Plus, 
  Search, 
  Layers, 
  Target, 
  RotateCcw, 
  Hash, 
  Truck, 
  Calendar as CalendarIcon,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Package,
  Edit3,
  Trash2,
  Check,
  X
} from 'lucide-react'
import Select from '../ui/Select'
import PhaseSelector from '../ui/PhaseSelector'
import DatePicker from '../ui/DatePicker'
import ConfirmModal from '../ui/ConfirmModal'
import { useToast } from '../../hooks/useFeedback'

const MaterialsTab = ({ materials, costCenters, onAdd, onEdit, onDelete, defaultCostCenterId = null, projectId, onSave, onRefresh }) => {
  const toast = useToast()
  // Filters
  const initialFilters = {
    search: '',
    phase: 'all',
    cc: defaultCostCenterId ? String(defaultCostCenterId) : 'all'
  }
  const [filters, setFilters] = useState(initialFilters)

  const [phaseOptions, setPhaseOptions] = useState([
    { id: 'all', label: 'Tutte le Fasi' }
  ])

  useEffect(() => {
    invoke('get_global_settings').then(res => {
      if (res.phases_material && res.phases_material.length > 0) {
        setPhaseOptions([
          { id: 'all', label: 'Tutte le Fasi' },
          ...res.phases_material.map(p => ({ id: p, label: p }))
        ])
      }
    }).catch(console.error)
  }, [])

  const ccOptions = useMemo(() => [
    { id: 'all', label: 'Tutti i Centri' },
    { id: 'none', label: 'Solo Generali' },
    ...costCenters.map(cc => ({ id: cc.id, label: cc.model }))
  ], [costCenters])

  // Sorting
  const [sort, setSort] = useState({ field: 'date', direction: 'desc' })

  // Inline editing states
  const [editingId, setEditingId] = useState(null)
  const [inlineFormData, setInlineFormData] = useState(null)

  // State for delete confirmation
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [materialToDeleteId, setMaterialToDeleteId] = useState(null)
  const [errors, setErrors] = useState({})

  // Persistent addition box state
  const [newMaterialData, setNewMaterialData] = useState({
    code: '',
    description: '',
    supplier: '',
    cost_center_id: defaultCostCenterId ? parseInt(defaultCostCenterId) : null,
    phase: 'Generale',
    date: new Date().toISOString().split('T')[0],
    quantity: 1,
    unit: 'pz',
    unit_price: 0,
    markup: 0.25
  })
  const [newMaterialErrors, setNewMaterialErrors] = useState({})
  const [isBoxOpen, setIsBoxOpen] = useState(() => {
    const val = localStorage.getItem('materials_box_open')
    return val !== 'false'
  })

  useEffect(() => {
    localStorage.setItem('materials_box_open', isBoxOpen)
  }, [isBoxOpen])

  // Selection states & helpers for multi-select move & phase update
  const [selectedIds, setSelectedIds] = useState([])
  const [isMoveOpen, setIsMoveOpen] = useState(false)
  const [isPhaseOpen, setIsPhaseOpen] = useState(false)
  const moveRef = useRef(null)
  const phaseRef = useRef(null)

  useEffect(() => {
    setSelectedIds([])
    setIsMoveOpen(false)
    setIsPhaseOpen(false)
  }, [materials, filters])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (moveRef.current && !moveRef.current.contains(event.target)) {
        setIsMoveOpen(false)
      }
      if (phaseRef.current && !phaseRef.current.contains(event.target)) {
        setIsPhaseOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectRow = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const handleSelectAll = () => {
    const allFilteredIds = filteredData.map(mat => mat.id)
    const allSelected = allFilteredIds.length > 0 && allFilteredIds.every(id => selectedIds.includes(id))
    
    if (allSelected) {
      setSelectedIds(prev => prev.filter(id => !allFilteredIds.includes(id)))
    } else {
      setSelectedIds(prev => {
        const union = new Set([...prev, ...allFilteredIds])
        return Array.from(union)
      })
    }
  }

  const [pendingMove, setPendingMove] = useState(null)
  const [countdown, setCountdown] = useState(5)
  const timerRef = useRef(null)

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const startPendingMove = (targetCCId) => {
    if (!targetCCId) return
    const cc = costCenters.find(c => c.id.toString() === targetCCId)
    const targetCCName = cc ? `${cc.brand ? cc.brand + ' ' : ''}${cc.model}` : 'Generale'
    
    const idsToMove = [...selectedIds]
    
    setPendingMove({
      type: 'move',
      materialIds: idsToMove,
      targetCCId,
      targetCCName
    })
    setCountdown(5)
    
    if (timerRef.current) clearInterval(timerRef.current)
    
    let counter = 5
    timerRef.current = setInterval(() => {
      counter -= 1
      if (counter <= 0) {
        clearInterval(timerRef.current)
        timerRef.current = null
        executePendingMove(targetCCId, idsToMove)
      } else {
        setCountdown(counter)
      }
    }, 1000)
  }

  const startPendingPhaseUpdate = (targetPhase) => {
    if (!targetPhase) return
    const idsToUpdate = [...selectedIds]
    
    setPendingMove({
      type: 'phase',
      materialIds: idsToUpdate,
      targetPhase
    })
    setCountdown(5)
    
    if (timerRef.current) clearInterval(timerRef.current)
    
    let counter = 5
    timerRef.current = setInterval(() => {
      counter -= 1
      if (counter <= 0) {
        clearInterval(timerRef.current)
        timerRef.current = null
        executePendingPhaseUpdate(targetPhase, idsToUpdate)
      } else {
        setCountdown(counter)
      }
    }, 1000)
  }

  const cancelPendingMove = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    setPendingMove(null)
  }

  const executePendingMove = async (targetCCId, idsToMove) => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
    const costCenterId = targetCCId === 'general' ? null : Number(targetCCId)
    const materialsToMove = idsToMove || (pendingMove ? pendingMove.materialIds : [])
    
    setSelectedIds([])
    setPendingMove(null)
    
    try {
      await invoke('move_materials_cost_center', { 
        materialIds: materialsToMove, 
        costCenterId 
      })
      if (onRefresh) {
        onRefresh()
      }
    } catch (err) {
      toast.error("Errore nello spostamento dei materiali: " + err)
    }
  }

  const executePendingPhaseUpdate = async (targetPhase, idsToUpdate) => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }
    
    const materialsToUpdate = idsToUpdate || (pendingMove ? pendingMove.materialIds : [])
    
    setSelectedIds([])
    setPendingMove(null)
    
    try {
      await invoke('update_materials_phase', { 
        materialIds: materialsToUpdate, 
        phase: targetPhase === 'Generale' ? null : targetPhase
      })
      if (onRefresh) {
        onRefresh()
      }
    } catch (err) {
      toast.error("Errore nell'aggiornamento dell'ambito dei materiali: " + err)
    }
  }

  // Autocomplete suggestions states
  const [suggestions, setSuggestions] = useState([])
  const [activeField, setActiveField] = useState(null) // 'box_code' or 'inline_code'
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const handleBoxCodeChange = (e) => {
    const val = e.target.value
    setNewMaterialData(prev => ({ ...prev, code: val }))
    if (newMaterialErrors.code) {
      setNewMaterialErrors(prev => ({ ...prev, code: false }))
    }

    if (val.trim().length >= 2) {
      invoke('search_catalog_materials', { query: val })
        .then((results) => {
          setSuggestions(results)
          setActiveField('box_code')
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
  }

  const handleBoxSupplierChange = (e) => {
    const val = e.target.value
    setNewMaterialData(prev => ({ ...prev, supplier: val }))

    if (val.trim().length >= 1) {
      invoke('search_suppliers', { query: val })
        .then((results) => {
          setSuggestions(results)
          setActiveField('box_supplier')
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

  const handleBoxDescriptionChange = (e) => {
    const val = e.target.value
    setNewMaterialData(prev => ({ ...prev, description: val }))
    if (newMaterialErrors.description) {
      setNewMaterialErrors(prev => ({ ...prev, description: false }))
    }

    if (val.trim().length >= 2) {
      invoke('search_catalog_materials', { query: val })
        .then((results) => {
          setSuggestions(results)
          setActiveField('box_description')
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
  }

  const handleInlineCodeChange = (e) => {
    const val = e.target.value
    setInlineFormData(prev => ({ ...prev, code: val }))
    if (errors.code) {
      setErrors(prev => ({ ...prev, code: false }))
    }

    if (val.trim().length >= 2) {
      invoke('search_catalog_materials', { query: val })
        .then((results) => {
          setSuggestions(results)
          setActiveField('inline_code')
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
  }

  const handleInlineSupplierChange = (e) => {
    const val = e.target.value
    setInlineFormData(prev => ({ ...prev, supplier: val }))

    if (val.trim().length >= 1) {
      invoke('search_suppliers', { query: val })
        .then((results) => {
          setSuggestions(results)
          setActiveField('inline_supplier')
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

  const handleInlineDescriptionChange = (e) => {
    const val = e.target.value
    setInlineFormData(prev => ({ ...prev, description: val }))
    if (errors.description) {
      setErrors(prev => ({ ...prev, description: false }))
    }

    if (val.trim().length >= 2) {
      invoke('search_catalog_materials', { query: val })
        .then((results) => {
          setSuggestions(results)
          setActiveField('inline_description')
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
  }

  const handleSelectSuggestionForBox = (item) => {
    setNewMaterialData(prev => ({
      ...prev,
      code: item.code || prev.code,
      description: item.description || prev.description,
      unit: item.unit || prev.unit,
      unit_price: item.unit_price !== null && item.unit_price !== undefined ? item.unit_price : prev.unit_price,
      supplier: item.supplier || prev.supplier,
      markup: item.markup !== null && item.markup !== undefined && item.markup > 0 ? item.markup : 0.25,
    }))
    setNewMaterialErrors(prev => ({
      ...prev,
      code: false,
      description: false
    }))
    setSuggestions([])
    setActiveField(null)
  }

  const handleSelectSupplierForBox = (supplierName) => {
    setNewMaterialData(prev => ({
      ...prev,
      supplier: supplierName
    }))
    setSuggestions([])
    setActiveField(null)
  }

  const handleSelectSuggestionForInline = (item) => {
    setInlineFormData(prev => ({
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
      code: false,
      description: false
    }))
    setSuggestions([])
    setActiveField(null)
  }

  const handleSelectSupplierForInline = (supplierName) => {
    setInlineFormData(prev => ({
      ...prev,
      supplier: supplierName
    }))
    setSuggestions([])
    setActiveField(null)
  }
  const handleKeyDown = (e, targetType) => {
    if (activeField === targetType && suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex(prev => (prev + 1) % suggestions.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (suggestions[highlightedIndex]) {
          if (targetType === 'box_code' || targetType === 'box_description') {
            handleSelectSuggestionForBox(suggestions[highlightedIndex])
          } else if (targetType === 'inline_code' || targetType === 'inline_description') {
            handleSelectSuggestionForInline(suggestions[highlightedIndex])
          } else if (targetType === 'box_supplier') {
            handleSelectSupplierForBox(suggestions[highlightedIndex])
          } else if (targetType === 'inline_supplier') {
            handleSelectSupplierForInline(suggestions[highlightedIndex])
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

  const renderSuggestions = (fieldName) => {
    if (activeField !== fieldName || suggestions.length === 0) return null;
    
    if (fieldName === 'box_supplier' || fieldName === 'inline_supplier') {
      return (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white/95 backdrop-blur-md border border-slate-100/50 rounded-2xl shadow-2xl max-h-60 overflow-y-auto z-50 p-2 space-y-1">
          {suggestions.map((name, index) => (
            <div
              key={index}
              onMouseDown={(e) => {
                e.preventDefault();
                if (fieldName === 'box_supplier') {
                  handleSelectSupplierForBox(name);
                } else if (fieldName === 'inline_supplier') {
                  handleSelectSupplierForInline(name);
                }
              }}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`flex items-center p-3 rounded-xl cursor-pointer transition-all ${
                index === highlightedIndex
                  ? 'bg-accent/10 text-slate-800 text-left font-bold'
                  : 'hover:bg-slate-50 text-slate-700 text-left font-bold'
              }`}
            >
              <span className="text-xs">
                {name}
              </span>
            </div>
          ))}
        </div>
      );
    }

    return (
      <div className="absolute left-0 right-0 top-full mt-2 bg-white/95 backdrop-blur-md border border-slate-100/50 rounded-2xl shadow-2xl max-h-60 overflow-y-auto z-50 p-2 space-y-1">
        {suggestions.map((item, index) => (
          <div
            key={item.id || index}
            onMouseDown={(e) => {
              e.preventDefault();
              if (fieldName === 'box_code' || fieldName === 'box_description') {
                handleSelectSuggestionForBox(item);
              } else if (fieldName === 'inline_code' || fieldName === 'inline_description') {
                handleSelectSuggestionForInline(item);
              }
            }}
            onMouseEnter={() => setHighlightedIndex(index)}
            className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all ${
              index === highlightedIndex
                ? 'bg-accent/10 text-slate-800'
                : 'hover:bg-slate-50 text-slate-700'
            }`}
          >
            <div className="flex flex-col min-w-0 text-left">
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

  // Sync new material defaults when filters or cost center default change
  useEffect(() => {
    setNewMaterialData(prev => ({
      ...prev,
      cost_center_id: defaultCostCenterId 
        ? parseInt(defaultCostCenterId) 
        : (filters.cc !== 'all' && filters.cc !== 'none' ? parseInt(filters.cc) : prev.cost_center_id),
      phase: filters.phase !== 'all' ? filters.phase : prev.phase
    }))
  }, [defaultCostCenterId, filters.cc, filters.phase])

  const inlinePhaseOptions = useMemo(() => {
    const list = phaseOptions.filter(p => p.id !== 'all')
    if (list.length === 0) {
      return [{ id: 'Generale', label: 'Generale' }]
    }
    return list
  }, [phaseOptions])

  const handleStartEdit = (mat) => {
    setEditingId(mat.id)
    setInlineFormData({
      id: mat.id,
      project_id: mat.project_id,
      cost_center_id: mat.cost_center_id,
      phase: mat.phase || 'Generale',
      date: mat.date || new Date().toISOString().split('T')[0],
      code: mat.code || '',
      description: mat.description || '',
      supplier: mat.supplier || '',
      quantity: mat.quantity || 1,
      unit: mat.unit || 'pz',
      unit_price: mat.unit_price || 0,
      markup: mat.markup || 0.25
    })
    setErrors({})
  }

  const handleCancel = () => {
    setEditingId(null)
    setInlineFormData(null)
    setErrors({})
  }

  const validate = () => {
    const newErrors = {}
    if (!inlineFormData.code || !inlineFormData.code.trim()) {
      newErrors.code = true
    }
    if (!inlineFormData.description || !inlineFormData.description.trim()) {
      newErrors.description = true
    }
    if (!inlineFormData.quantity || inlineFormData.quantity <= 0) {
      newErrors.quantity = true
    }
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSaveInternal = async () => {
    if (!validate()) return
    
    const dataToSave = {
      ...inlineFormData,
      project_id: Number(projectId),
      cost_center_id: inlineFormData.cost_center_id ? parseInt(inlineFormData.cost_center_id) : null,
      quantity: parseFloat(inlineFormData.quantity) || 0,
      unit_price: parseFloat(inlineFormData.unit_price) || 0,
      markup: parseFloat(inlineFormData.markup) || 0
    }
    
    try {
      if (onSave) {
        await onSave(dataToSave)
      }
      setEditingId(null)
      setInlineFormData(null)
      setErrors({})
    } catch (err) {
      console.error(err)
    }
  }

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
        setPhaseOptions([
          { id: 'all', label: 'Tutte le Fasi' },
          ...updatedPhases.map(p => ({ id: p, label: p }))
        ])
      }

      setInlineFormData(prev => ({ ...prev, phase: trimmed }))
    } catch (err) {
      console.error("Errore nel salvataggio della nuova fase:", err)
      toast.error("Impossibile salvare la nuova fase: " + err)
    }
  }

  const handleAddNewPhaseForBox = async (newPhaseName) => {
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
        setPhaseOptions([
          { id: 'all', label: 'Tutte le Fasi' },
          ...updatedPhases.map(p => ({ id: p, label: p }))
        ])
      }

      setNewMaterialData(prev => ({ ...prev, phase: trimmed }))
    } catch (err) {
      console.error("Errore nel salvataggio della nuova fase:", err)
      toast.error("Impossibile salvare la nuova fase: " + err)
    }
  }

  const validateBox = () => {
    const newErrors = {}
    if (!newMaterialData.code || !newMaterialData.code.trim()) {
      newErrors.code = true
    }
    if (!newMaterialData.description || !newMaterialData.description.trim()) {
      newErrors.description = true
    }
    if (!newMaterialData.quantity || newMaterialData.quantity <= 0) {
      newErrors.quantity = true
    }
    setNewMaterialErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleAddNewMaterialFromBox = async () => {
    if (!validateBox()) return
    
    const dataToSave = {
      ...newMaterialData,
      project_id: Number(projectId),
      cost_center_id: newMaterialData.cost_center_id ? parseInt(newMaterialData.cost_center_id) : null,
      quantity: parseFloat(newMaterialData.quantity) || 0,
      unit_price: parseFloat(newMaterialData.unit_price) || 0,
      markup: parseFloat(newMaterialData.markup) || 0
    }
    
    try {
      if (onSave) {
        await onSave(dataToSave)
      }
      setNewMaterialData(prev => ({
        ...prev,
        code: '',
        description: '',
        quantity: 1,
        unit_price: 0
      }))
      setNewMaterialErrors({})
    } catch (err) {
      console.error(err)
    }
  }

  const renderInlineRow = (isEdit = false) => {
    if (!inlineFormData) return null;

    return (
      <tr className="bg-accent/[0.03] hover:bg-accent/[0.05] transition-colors border-y border-slate-100">
        <td className="px-6 py-4 w-12"></td>
        {/* Codice */}
        <td className="px-8 py-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Codice *"
              value={inlineFormData.code}
              onChange={handleInlineCodeChange}
              onKeyDown={(e) => handleKeyDown(e, 'inline_code')}
              onBlur={handleBlur}
              onFocus={(e) => setTimeout(() => e.target.select(), 0)}
              className={`w-full bg-white border rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 transition-all hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] ${
                errors.code ? 'border-rose-300 focus:ring-rose-100 bg-rose-50/20' : 'border-slate-200 focus:border-accent/50 focus:ring-accent/10'
              }`}
              autoFocus={!isEdit}
              autoComplete="off"
            />
            {renderSuggestions('inline_code')}
          </div>
        </td>

        {/* Descrizione */}
        <td className="px-8 py-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Descrizione articolo *"
              value={inlineFormData.description}
              onChange={handleInlineDescriptionChange}
              onKeyDown={(e) => handleKeyDown(e, 'inline_description')}
              onBlur={handleBlur}
              className={`w-full bg-white border rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 transition-all hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] ${
                errors.description ? 'border-rose-300 focus:ring-rose-100 bg-rose-50/20' : 'border-slate-200 focus:border-accent/50 focus:ring-accent/10'
              }`}
              autoComplete="off"
            />
            {renderSuggestions('inline_description')}
          </div>
        </td>

        {/* Fornitore */}
        <td className="px-8 py-4">
          <div className="relative">
            <input 
              type="text" 
              placeholder="Fornitore..."
              value={inlineFormData.supplier}
              onChange={handleInlineSupplierChange}
              onKeyDown={(e) => handleKeyDown(e, 'inline_supplier')}
              onBlur={handleBlur}
              autoComplete="off"
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] transition-all"
            />
            {renderSuggestions('inline_supplier')}
          </div>
        </td>

        {/* Centro di Costo (Conditional) */}
        {!defaultCostCenterId && (
          <td className="px-8 py-4">
            <select
              value={inlineFormData.cost_center_id || ''}
              onChange={(e) => setInlineFormData(p => ({ ...p, cost_center_id: e.target.value ? parseInt(e.target.value) : null }))}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] transition-all"
            >
              <option value="">Generale</option>
              {costCenters.map(cc => (
                <option key={cc.id} value={cc.id}>{cc.model}</option>
              ))}
            </select>
          </td>
        )}

        {/* Ambito (Fase) */}
        <td className="px-8 py-4">
          <PhaseSelector
            phases={inlinePhaseOptions}
            value={inlineFormData.phase}
            onChange={(val) => setInlineFormData(p => ({ ...p, phase: val }))}
            onAddNew={handleAddNewPhase}
            placeholder="Seleziona fase..."
            compact={true}
          />
        </td>

        {/* Data */}
        <td className="px-8 py-4">
          <DatePicker 
            compact={true}
            value={inlineFormData.date}
            onChange={(val) => setInlineFormData(p => ({ ...p, date: val }))}
          />
        </td>

        {/* Q.tà / U.M. */}
        <td className="px-8 py-4">
          <div className="flex gap-1 items-center justify-end">
            <input 
              type="number" 
              step="any"
              placeholder="Q.tà"
              value={inlineFormData.quantity}
              onChange={(e) => setInlineFormData(p => ({ ...p, quantity: parseFloat(e.target.value) || 0 }))}
              onFocus={handleInputSelect}
              onClick={handleInputSelect}
              className={`w-16 bg-white border rounded-xl px-2 py-2 text-xs font-bold text-right text-slate-700 focus:outline-none focus:ring-4 transition-all hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] ${
                errors.quantity ? 'border-rose-300 focus:ring-rose-100 bg-rose-50/20' : 'border-slate-200 focus:border-accent/50 focus:ring-accent/10'
              }`}
            />
            <input 
              type="text" 
              placeholder="U.M."
              value={inlineFormData.unit}
              onChange={(e) => setInlineFormData(p => ({ ...p, unit: e.target.value }))}
              className="w-10 bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] transition-all"
            />
          </div>
        </td>

        {/* Prezzo Cad. */}
        <td className="px-8 py-4">
          <div className="flex items-center gap-1 justify-end">
            <span className="text-xs font-bold text-slate-400">€</span>
            <input 
              type="number" 
              step="0.01"
              placeholder="Prezzo"
              value={inlineFormData.unit_price}
              onChange={(e) => setInlineFormData(p => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))}
              onFocus={handleInputSelect}
              onClick={handleInputSelect}
              className="w-20 bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-right text-slate-700 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] transition-all"
            />
          </div>
        </td>

        {/* Tot. Vendita & Ricarico */}
        <td className="px-8 py-4 text-right">
          <div className="flex flex-col items-end gap-1">
            <p className="text-xs font-black text-slate-800">
              € {((inlineFormData.quantity || 0) * (inlineFormData.unit_price || 0) * (1 + (inlineFormData.markup || 0))).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-1 justify-end">
              <span className="text-[0.55rem] font-black text-emerald-500 uppercase tracking-widest">Ric.%</span>
              <input 
                type="number"
                placeholder="Ricarico"
                value={Math.round((inlineFormData.markup || 0) * 100)}
                onChange={(e) => setInlineFormData(p => ({ ...p, markup: (parseFloat(e.target.value) || 0) / 100 }))}
                onFocus={handleInputSelect}
                onClick={handleInputSelect}
                className="w-12 bg-white border border-slate-200 rounded-xl px-1.5 py-1 text-[0.65rem] font-bold text-right text-emerald-600 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] transition-all"
              />
            </div>
          </div>
        </td>

        {/* Azioni */}
        <td className="px-8 py-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <button 
              onClick={handleSaveInternal}
              className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all"
              title="Salva"
            >
              <Check size={18} />
            </button>
            <button 
              onClick={handleCancel}
              className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
              title="Annulla"
            >
              <X size={18} />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  const filteredData = useMemo(() => {
    let result = materials.filter(m => {
      const matchesSearch = !filters.search || 
        m.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        (m.code && m.code.toLowerCase().includes(filters.search.toLowerCase()));
      
      const matchesPhase = filters.phase === 'all' || m.phase === filters.phase;
      
      const matchesCC = filters.cc === 'all' || 
        (filters.cc === 'none' && !m.cost_center_id) ||
        (m.cost_center_id === parseInt(filters.cc));

      return matchesSearch && matchesPhase && matchesCC;
    })

    // Sorting logic
    result.sort((a, b) => {
      let valA, valB;
      switch(sort.field) {
        case 'code': valA = a.code || ''; valB = b.code || ''; break;
        case 'description': valA = a.description.toLowerCase(); valB = b.description.toLowerCase(); break;
        case 'supplier': valA = a.supplier || ''; valB = b.supplier || ''; break;
        case 'cost_center': valA = a.cost_center_name || ''; valB = b.cost_center_name || ''; break;
        case 'phase': valA = a.phase || ''; valB = b.phase || ''; break;
        case 'date': valA = new Date(a.date); valB = new Date(b.date); break;
        case 'quantity': valA = a.quantity; valB = b.quantity; break;
        case 'price': valA = a.unit_price; valB = b.unit_price; break;
        case 'total': 
          valA = a.quantity * a.unit_price * (1 + a.markup); 
          valB = b.quantity * b.unit_price * (1 + b.markup); 
          break;
        default: valA = a.id; valB = b.id;
      }
      if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    })

    return result
  }, [materials, filters, sort])

  const handleSort = (field) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const SortIcon = ({ field }) => {
    if (sort.field !== field) return <ChevronsUpDown size={12} className="opacity-30 group-hover:opacity-100 transition-opacity" />;
    return sort.direction === 'asc' ? <ChevronUp size={12} className="text-accent" /> : <ChevronDown size={12} className="text-accent" />;
  }

  const hasActiveFilters = filters.search !== '' || filters.phase !== 'all' || filters.cc !== 'all'

  const isAddDisabled = !newMaterialData.code?.trim() || 
                        !newMaterialData.description?.trim() || 
                        !newMaterialData.quantity || 
                        newMaterialData.quantity <= 0 || 
                        !newMaterialData.unit_price || 
                        newMaterialData.unit_price <= 0

  const handleInputSelect = (e) => {
    const target = e.target
    setTimeout(() => {
      if (target) target.select()
    }, 50)
  }

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Registro Materiali</h2>
          <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {filteredData.length} articoli {filteredData.length !== materials.length ? '(filtrati)' : ''}
          </p>
        </div>
        {!onSave ? (
          <button 
            onClick={onAdd}
            className="bg-accent text-white px-8 py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-accent/90 transition-all shadow-xl shadow-accent/20 flex items-center gap-2"
          >
            <Plus size={18} /> Aggiungi Materiale
          </button>
        ) : (
          <button 
            onClick={() => setIsBoxOpen(p => !p)}
            className="bg-accent text-white px-8 py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-accent/90 transition-all shadow-xl shadow-accent/20 flex items-center gap-2"
          >
            {isBoxOpen ? <X size={18} /> : <Plus size={18} />} 
            {isBoxOpen ? 'Nascondi Aggiunta' : 'Aggiungi Materiale'}
          </button>
        )}
      </div>
      {/* Box Aggiunta Materiale Persistente */}
      {onSave && isBoxOpen && (
        <div className="relative z-30 bg-white/40 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/40 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-accent/10 rounded-lg text-accent">
                <Plus size={14} className="stroke-[3]" />
              </div>
              <span className="text-[0.65rem] font-black uppercase tracking-widest text-slate-500">Nuovo Articolo</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <span className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-wider mr-2">Tot. Vendita:</span>
                <span className="text-sm font-black text-slate-800">
                  € {((newMaterialData.quantity || 0) * (newMaterialData.unit_price || 0) * (1 + (newMaterialData.markup || 0))).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </span>
              </div>
              <button 
                onClick={() => setIsBoxOpen(false)}
                className="text-slate-400 hover:text-rose-500 p-1 hover:bg-slate-100 rounded-lg transition-colors"
                title="Chiudi pannello di inserimento"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
            {/* Codice */}
            <div className="lg:col-span-2 space-y-1.5">
              <label className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400 ml-1">Codice *</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Codice..."
                  value={newMaterialData.code}
                  onChange={handleBoxCodeChange}
                  onKeyDown={(e) => handleKeyDown(e, 'box_code')}
                  onBlur={handleBlur}
                  onFocus={(e) => setTimeout(() => e.target.select(), 0)}
                  className={`w-full bg-white border rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 transition-all hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] ${
                    newMaterialErrors.code ? 'border-rose-300 focus:ring-rose-100 bg-rose-50/20' : 'border-slate-200 focus:border-accent/50 focus:ring-accent/10'
                  }`}
                  autoComplete="off"
                />
                {renderSuggestions('box_code')}
              </div>
            </div>

            {/* Descrizione */}
            <div className="lg:col-span-4 space-y-1.5">
              <label className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400 ml-1">Descrizione Articolo *</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Descrizione articolo..."
                  value={newMaterialData.description}
                  onChange={handleBoxDescriptionChange}
                  onKeyDown={(e) => handleKeyDown(e, 'box_description')}
                  onBlur={handleBlur}
                  className={`w-full bg-white border rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 transition-all hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] ${
                    newMaterialErrors.description ? 'border-rose-300 focus:ring-rose-100 bg-rose-50/20' : 'border-slate-200 focus:border-accent/50 focus:ring-accent/10'
                  }`}
                  autoComplete="off"
                />
                {renderSuggestions('box_description')}
              </div>
            </div>

            {/* Fornitore */}
            <div className="lg:col-span-3 space-y-1.5">
              <label className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400 ml-1">Fornitore</label>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Fornitore..."
                  value={newMaterialData.supplier}
                  onChange={handleBoxSupplierChange}
                  onKeyDown={(e) => handleKeyDown(e, 'box_supplier')}
                  onBlur={handleBlur}
                  onFocus={(e) => setTimeout(() => e.target.select(), 0)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] transition-all"
                  autoComplete="off"
                />
                {renderSuggestions('box_supplier')}
              </div>
            </div>

            {/* Centro di Costo */}
            {!defaultCostCenterId && (
              <div className="lg:col-span-3 space-y-1.5">
                <label className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400 ml-1">Centro di Costo</label>
                <select
                  value={newMaterialData.cost_center_id || ''}
                  onChange={(e) => setNewMaterialData(p => ({ ...p, cost_center_id: e.target.value ? parseInt(e.target.value) : null }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] transition-all"
                >
                  <option value="">Generale</option>
                  {costCenters.map(cc => (
                    <option key={cc.id} value={cc.id}>{cc.model}</option>
                  ))}
                </select>
              </div>
            )}

            {/* Ambito (Fase) */}
            <div className="lg:col-span-3 space-y-1.5">
              <label className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400 ml-1">Fase / Ambito</label>
              <PhaseSelector
                phases={inlinePhaseOptions}
                value={newMaterialData.phase}
                onChange={(val) => setNewMaterialData(p => ({ ...p, phase: val }))}
                onAddNew={handleAddNewPhaseForBox}
                placeholder="Seleziona fase..."
                compact={true}
              />
            </div>

            {/* Data */}
            <div className={`${defaultCostCenterId ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-1.5`}>
              <label className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400 ml-1">Data</label>
              <DatePicker 
                compact={true}
                value={newMaterialData.date}
                onChange={(val) => setNewMaterialData(p => ({ ...p, date: val }))}
              />
            </div>

            {/* Q.tà / U.M. */}
            <div className={`${defaultCostCenterId ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-1.5`}>
              <label className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400 ml-1">Q.tà / U.M. *</label>
              <div className="flex gap-1 items-center">
                <input 
                  type="number" 
                  step="any"
                  placeholder="Q.tà"
                  value={newMaterialData.quantity}
                  onChange={(e) => setNewMaterialData(p => ({ ...p, quantity: parseFloat(e.target.value) || 0 }))}
                  onFocus={handleInputSelect}
                  onClick={handleInputSelect}
                  className={`w-2/3 bg-white border rounded-xl px-2 py-2 text-xs font-bold text-right text-slate-700 focus:outline-none focus:ring-4 transition-all hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] ${
                    newMaterialErrors.quantity ? 'border-rose-300 focus:ring-rose-100 bg-rose-50/20' : 'border-slate-200 focus:border-accent/50 focus:ring-accent/10'
                  }`}
                />
                <input 
                  type="text" 
                  placeholder="U.M."
                  value={newMaterialData.unit}
                  onChange={(e) => setNewMaterialData(p => ({ ...p, unit: e.target.value }))}
                  className="w-1/3 bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] transition-all"
                />
              </div>
            </div>

            {/* Prezzo Cad. */}
            <div className={`${defaultCostCenterId ? 'lg:col-span-3' : 'lg:col-span-2'} space-y-1.5`}>
              <label className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400 ml-1">Prezzo Cad.</label>
              <div className="flex items-center gap-1">
                <span className="text-xs font-bold text-slate-400">€</span>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="Prezzo"
                  value={newMaterialData.unit_price}
                  onChange={(e) => setNewMaterialData(p => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))}
                  onFocus={handleInputSelect}
                  onClick={handleInputSelect}
                  className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-right text-slate-700 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] transition-all"
                />
              </div>
            </div>

            {/* Ricarico (%) */}
            <div className="lg:col-span-1 space-y-1.5">
              <label className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400 ml-1">Ric.%</label>
              <input 
                type="number"
                placeholder="Ric.%"
                value={Math.round((newMaterialData.markup || 0) * 100)}
                onChange={(e) => setNewMaterialData(p => ({ ...p, markup: (parseFloat(e.target.value) || 0) / 100 }))}
                onFocus={handleInputSelect}
                onClick={handleInputSelect}
                className="w-full bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-right text-emerald-600 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] transition-all"
              />
            </div>

            {/* Bottone Aggiungi */}
            <div className="lg:col-span-2 flex items-end justify-end w-full">
              <button 
                onClick={handleAddNewMaterialFromBox}
                disabled={isAddDisabled}
                className={`w-full py-2 rounded-xl text-[0.65rem] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 h-[36px] ${
                  isAddDisabled 
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                    : 'bg-accent text-white hover:bg-accent/90 shadow-md shadow-accent/15'
                }`}
              >
                <Plus size={16} /> Aggiungi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toolbar Filtri Materiali */}
      <div className="relative z-20 flex flex-col lg:flex-row gap-6 items-end bg-white/50 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/50 shadow-sm">
        <div className="flex-1 w-full space-y-2">
          <label className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 ml-1">Cerca Articolo</label>
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-accent transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Descrizione o codice..."
              value={filters.search}
              onChange={(e) => setFilters(p => ({...p, search: e.target.value}))}
              className="w-full bg-white/50 border border-white/50 rounded-xl py-4 pl-14 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all"
            />
          </div>
        </div>
        
        <div className="w-full lg:w-64 space-y-2">
          <label className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 ml-1">Filtra Fase</label>
          <Select 
            options={phaseOptions}
            value={filters.phase}
            onChange={(val) => setFilters(p => ({...p, phase: val}))}
            icon={Layers}
            className="bg-white/50"
          />
        </div>

        {!defaultCostCenterId && (
          <div className="w-full lg:w-64 space-y-2">
            <label className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 ml-1">Filtra Centro</label>
            <Select 
              options={ccOptions}
              value={filters.cc}
              onChange={(val) => setFilters(p => ({...p, cc: val}))}
              icon={Target}
              className="bg-white/50"
            />
          </div>
        )}

        <button 
          onClick={() => setFilters(initialFilters)}
          disabled={!hasActiveFilters}
          className={`bg-slate-100 p-4 rounded-xl transition-all shadow-sm flex items-center justify-center group ${
            hasActiveFilters 
            ? 'opacity-100 text-rose-500 hover:bg-rose-50' 
            : 'opacity-0 pointer-events-none'
          }`}
          title="Resetta tutti i filtri"
        >
          <RotateCcw size={20} className="group-hover:rotate-[-45deg] transition-transform" />
        </button>
      </div>

      <div className={`relative ${inlineFormData ? 'z-30' : 'z-10'} glass-panel overflow-hidden rounded-[2.5rem] border border-white/50 shadow-2xl`}>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-6 text-center select-none w-12">
                  <input 
                    type="checkbox" 
                    checked={filteredData.length > 0 && filteredData.every(mat => selectedIds.includes(mat.id))} 
                    onChange={handleSelectAll} 
                    className="rounded border-slate-300 text-accent focus:ring-accent" 
                  />
                </th>
                <th onClick={() => handleSort('code')} className="px-8 py-6 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 cursor-pointer group select-none">
                  <div className="flex items-center gap-2">Codice <SortIcon field="code" /></div>
                </th>
                <th onClick={() => handleSort('description')} className="px-8 py-6 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 cursor-pointer group select-none">
                  <div className="flex items-center gap-2">Descrizione <SortIcon field="description" /></div>
                </th>
                <th onClick={() => handleSort('supplier')} className="px-8 py-6 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 cursor-pointer group select-none">
                  <div className="flex items-center gap-2">Fornitore <SortIcon field="supplier" /></div>
                </th>
                {!defaultCostCenterId && (
                  <th onClick={() => handleSort('cost_center')} className="px-8 py-6 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 cursor-pointer group select-none">
                    <div className="flex items-center gap-2">Centro di Costo <SortIcon field="cost_center" /></div>
                  </th>
                )}
                <th onClick={() => handleSort('phase')} className="px-8 py-6 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 cursor-pointer group select-none">
                  <div className="flex items-center gap-2">Ambito <SortIcon field="phase" /></div>
                </th>
                <th onClick={() => handleSort('date')} className="px-8 py-6 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 cursor-pointer group select-none">
                  <div className="flex items-center gap-2">Data <SortIcon field="date" /></div>
                </th>
                <th onClick={() => handleSort('quantity')} className="px-8 py-6 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 text-right cursor-pointer group select-none">
                  <div className="flex items-center justify-end gap-2">Q.tà <SortIcon field="quantity" /></div>
                </th>
                <th onClick={() => handleSort('price')} className="px-8 py-6 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 text-right cursor-pointer group select-none">
                  <div className="flex items-center justify-end gap-2">Prezzo Cad. <SortIcon field="price" /></div>
                </th>
                <th onClick={() => handleSort('total')} className="px-8 py-6 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 text-right cursor-pointer group select-none">
                  <div className="flex items-center justify-end gap-2">Tot. Vendita <SortIcon field="total" /></div>
                </th>
                <th className="px-8 py-6 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 text-center">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? filteredData.map(mat => (
                editingId === mat.id ? (
                  renderInlineRow(true)
                ) : (
                  <tr key={mat.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-6 text-center select-none w-12">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(mat.id)} 
                        onChange={() => handleSelectRow(mat.id)} 
                        className="rounded border-slate-300 text-accent focus:ring-accent" 
                      />
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <Hash size={14} className="text-accent/40" />
                        <span className="text-[0.65rem] font-black text-accent uppercase tracking-widest">{mat.code || 'N/D'}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <span className="text-sm font-black text-slate-800 leading-tight">{mat.description}</span>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Truck size={14} className="text-slate-400" />
                        <span className="text-xs font-bold">{mat.supplier || '-'}</span>
                      </div>
                    </td>
                    {!defaultCostCenterId && (
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${mat.cost_center_id ? 'bg-amber-50 text-amber-500' : 'bg-slate-100 text-slate-300'}`}>
                            <Target size={14} />
                          </div>
                          <span className={`text-[0.65rem] font-black uppercase tracking-tight ${mat.cost_center_name ? 'text-slate-800' : 'text-slate-400'}`}>
                            {mat.cost_center_name || 'Generale'}
                          </span>
                        </div>
                      </td>
                    )}
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-100 text-slate-400">
                          <Layers size={14} />
                        </div>
                        <span className={`text-[0.65rem] font-black uppercase tracking-tight ${mat.phase ? 'text-slate-800' : 'text-slate-400'}`}>
                          {mat.phase || 'Generale'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-slate-500">
                        <CalendarIcon size={14} />
                        <span className="text-xs font-bold">{new Date(mat.date).toLocaleDateString('it-IT')}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className="text-sm font-bold text-slate-600">{mat.quantity} {mat.unit || 'pz'}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <span className="text-sm font-bold text-slate-600">€ {mat.unit_price.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="inline-block text-right">
                        <p className="text-sm font-black text-slate-800">
                          € {((mat.quantity * mat.unit_price) * (1 + mat.markup)).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[0.55rem] font-black text-emerald-500 uppercase tracking-widest">
                          Ric. {(mat.markup * 100).toFixed(0)}%
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => onSave ? handleStartEdit(mat) : onEdit(mat)}
                          className="p-2 text-slate-400 hover:text-accent hover:bg-accent/5 rounded-lg transition-all"
                          title="Modifica inline"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            setMaterialToDeleteId(mat.id)
                            setIsConfirmDeleteOpen(true)
                          }}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                          title="Elimina"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              )) : (
                <tr>
                  <td colSpan={defaultCostCenterId ? "10" : "11"} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-6 bg-slate-50 rounded-3xl text-slate-200">
                        <Package size={48} />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-slate-800 tracking-tight">
                          {materials.length > 0 ? 'Nessun risultato per i filtri selezionati' : 'Nessun materiale registrato'}
                        </h4>
                        <p className="text-sm font-bold text-slate-400 mt-1">
                          {materials.length > 0 ? 'Prova a modificare i criteri di ricerca.' : 'Inizia ad aggiungere articoli per tracciare i costi della commessa.'}
                        </p>
                      </div>
                      {hasActiveFilters && (
                        <button 
                          onClick={() => setFilters(initialFilters)}
                          className="mt-4 text-accent font-black uppercase tracking-[0.2em] text-[0.6rem] hover:tracking-[0.3em] transition-all"
                        >
                          Resetta Filtri
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => {
          setIsConfirmDeleteOpen(false)
          setMaterialToDeleteId(null)
        }}
        onConfirm={() => {
          if (materialToDeleteId) {
            onDelete(materialToDeleteId)
          }
        }}
        title="Elimina Materiale"
        message="Sei sicuro di voler eliminare questo materiale dalla commessa? Questa azione non può essere annullata."
      />

      {selectedIds.length > 0 && createPortal(
        (() => {
          const selectedMaterials = materials.filter(m => selectedIds.includes(m.id));
          const currentCCIds = new Set(selectedMaterials.map(m => m.cost_center_id ? Number(m.cost_center_id) : null));
          const availableCostCenters = costCenters.filter(cc => !currentCCIds.has(Number(cc.id)));

          if (pendingMove) {
            const isPhase = pendingMove.type === 'phase';
            return (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-6 z-50 backdrop-blur-md border border-white/10 animate-premium-in">
                <span className="text-xs font-black uppercase tracking-widest text-amber-400 animate-pulse flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span> {isPhase ? 'Aggiornamento in corso...' : 'Spostamento in corso...'}
                </span>
                <div className="h-4 w-px bg-white/20"></div>
                <span className="text-xs font-medium text-slate-300">
                  {isPhase ? 'Cambio ambito per ' : 'Sposto '} {pendingMove.materialIds.length} {pendingMove.materialIds.length === 1 ? 'materiale' : 'materiali'} in <strong className="text-white font-black">{isPhase ? pendingMove.targetPhase : pendingMove.targetCCName}</strong> ({countdown}s)
                </span>
                <div className="h-4 w-px bg-white/20"></div>
                <div className="flex items-center gap-4">
                  <button 
                    onClick={cancelPendingMove}
                    className="text-xs font-black uppercase tracking-widest text-rose-400 hover:text-rose-300 transition-colors cursor-pointer"
                  >
                    Annulla
                  </button>
                  <button 
                    onClick={() => {
                      if (isPhase) {
                        executePendingPhaseUpdate(pendingMove.targetPhase, pendingMove.materialIds);
                      } else {
                        executePendingMove(pendingMove.targetCCId, pendingMove.materialIds);
                      }
                    }}
                    className="text-xs font-black uppercase tracking-widest text-emerald-400 hover:text-emerald-300 transition-colors cursor-pointer"
                  >
                    Conferma Ora
                  </button>
                </div>
              </div>
            );
          }

          return (
            <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-6 z-50 backdrop-blur-md border border-white/10 animate-premium-in">
              <span className="text-xs font-black uppercase tracking-widest text-slate-300">
                {selectedIds.length} {selectedIds.length === 1 ? 'Materiale selezionato' : 'Materiali selezionati'}
              </span>
              <div className="h-4 w-px bg-white/20"></div>
              {availableCostCenters.length > 0 ? (
                <div className="flex items-center gap-3" ref={moveRef}>
                  <span className="text-xs font-bold text-slate-400">Sposta in:</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => { setIsMoveOpen(!isMoveOpen); setIsPhaseOpen(false); }}
                      className="bg-white/10 border border-white/20 hover:bg-white/20 rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white flex items-center gap-3 transition-all cursor-pointer min-w-[180px] justify-between focus:outline-none focus:ring-2 focus:ring-accent/40"
                    >
                      <span>Seleziona Centro...</span>
                      <ChevronDown size={14} className={`transition-transform duration-300 ${isMoveOpen ? 'rotate-180' : ''}`} />
                    </button>
                    
                    {isMoveOpen && (
                      <div className="absolute bottom-full left-0 right-0 mb-3 bg-slate-900 border border-white/10 rounded-[2rem] shadow-2xl z-[500] overflow-hidden p-2 min-w-[240px]">
                        <div className="max-h-60 overflow-y-auto py-1 space-y-1">
                          {availableCostCenters.map(cc => (
                            <button
                              key={cc.id}
                              type="button"
                              onClick={() => {
                                startPendingMove(cc.id.toString());
                                setIsMoveOpen(false);
                              }}
                              className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-all text-[0.65rem] font-black uppercase tracking-widest text-left cursor-pointer"
                            >
                              <span>{cc.brand ? `${cc.brand} ` : ''}{cc.model} ({cc.category})</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <span className="text-xs font-bold text-slate-400">Nessun altro centro</span>
              )}
              
              <div className="h-4 w-px bg-white/20"></div>

              {/* Cambia Ambito */}
              <div className="flex items-center gap-3" ref={phaseRef}>
                <span className="text-xs font-bold text-slate-400">Ambito:</span>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setIsPhaseOpen(!isPhaseOpen); setIsMoveOpen(false); }}
                    className="bg-white/10 border border-white/20 hover:bg-white/20 rounded-2xl px-4 py-2.5 text-xs font-black uppercase tracking-widest text-white flex items-center gap-3 transition-all cursor-pointer min-w-[180px] justify-between focus:outline-none focus:ring-2 focus:ring-accent/40"
                  >
                    <span>Seleziona Ambito...</span>
                    <ChevronDown size={14} className={`transition-transform duration-300 ${isPhaseOpen ? 'rotate-180' : ''}`} />
                  </button>
                  
                  {isPhaseOpen && (
                    <div className="absolute bottom-full left-0 right-0 mb-3 bg-slate-900 border border-white/10 rounded-[2rem] shadow-2xl z-[500] overflow-hidden p-2 min-w-[200px]">
                      <div className="max-h-60 overflow-y-auto py-1 space-y-1">
                        <button
                          type="button"
                          onClick={() => {
                            startPendingPhaseUpdate('Generale');
                            setIsPhaseOpen(false);
                          }}
                          className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-all text-[0.65rem] font-black uppercase tracking-widest text-left cursor-pointer"
                        >
                          <span>Generale</span>
                        </button>
                        {phaseOptions.filter(p => p.id !== 'all' && p.id !== 'Generale').map(p => (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => {
                              startPendingPhaseUpdate(p.id);
                              setIsPhaseOpen(false);
                            }}
                            className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-all text-[0.65rem] font-black uppercase tracking-widest text-left cursor-pointer"
                          >
                            <span>{p.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="h-4 w-px bg-white/20"></div>
              <button 
                onClick={() => setSelectedIds([])}
                className="text-xs font-black uppercase tracking-widest text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                Annulla
              </button>
            </div>
          );
        })(),
        document.body
      )}
    </div>
  )
}

export default MaterialsTab
