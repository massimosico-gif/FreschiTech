import React, { useState, useMemo, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { invoke } from '@tauri-apps/api/core'
import { 
  Plus, 
  Search, 
  Layers, 
  Target, 
  RotateCcw, 
  User, 
  Calendar as CalendarIcon,
  Clock,
  Euro,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  HardHat,
  Trash2,
  Users,
  Truck,
  X,
  Edit3,
  Check
} from 'lucide-react'
import Select from '../ui/Select'
import MultiSelect from '../ui/MultiSelect'
import DatePicker from '../ui/DatePicker'
import PhaseSelector from '../ui/PhaseSelector'
import VehicleSelector from '../ui/VehicleSelector'
import ConfirmModal from '../ui/ConfirmModal'
import Kbd from '../ui/Kbd'
import usePendingBulkAction from '../../hooks/usePendingBulkAction'
import usePhaseOptions from '../../hooks/usePhaseOptions'

const LaborTab = ({ labor, costCenters, onDelete, defaultCostCenterId = null, projectId = null, project = null, onSave = null, onRefresh = null }) => {
  // Sorting
  const [sort, setSort] = useState({ field: 'date', direction: 'desc' })

  // Selection states & helpers for multi-select move & phase update
  const [selectedIds, setSelectedIds] = useState([])
  const [isMoveOpen, setIsMoveOpen] = useState(false)
  const [isPhaseOpen, setIsPhaseOpen] = useState(false)
  const moveRef = useRef(null)
  const phaseRef = useRef(null)

  // Inline editing state
  const [editingId, setEditingId] = useState(null)
  const [inlineFormData, setInlineFormData] = useState(null)
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [laborToDeleteId, setLaborToDeleteId] = useState(null)

  // Filters
  const initialFilters = {
    search: '',
    phase: 'all',
    cc: defaultCostCenterId ? String(defaultCostCenterId) : 'all'
  }
  const [filters, setFilters] = useState(initialFilters)

  useEffect(() => {
    setSelectedIds([])
    setIsMoveOpen(false)
    setIsPhaseOpen(false)
  }, [labor, filters])

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

  const getGroupedRowIds = (row, allRows) => {
    return allRows
      .filter(r => 
        r.project_id === row.project_id &&
        r.date === row.date &&
        (r.phase || '') === (row.phase || '') &&
        (r.description || '') === (row.description || '') &&
        (r.vehicle || '') === (row.vehicle || '') &&
        r.cost_center_id === row.cost_center_id
      )
      .map(r => r.id);
  }

  const handleSelectRow = (row) => {
    const groupIds = getGroupedRowIds(row, labor)
    setSelectedIds(prev => {
      const isAlreadySelected = groupIds.every(id => prev.includes(id))
      if (isAlreadySelected) {
        return prev.filter(id => !groupIds.includes(id))
      } else {
        const union = new Set([...prev, ...groupIds])
        return Array.from(union)
      }
    })
  }

  const handleSelectAll = () => {
    const allFilteredIds = filteredData.map(l => l.id)
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

  // ── Azioni massive differite ────────────────────────────────────────
  // Countdown annullabile: timer, cleanup ed esecuzione vivono nell'hook,
  // condiviso con MaterialsTab.
  const runBulkAction = async ({ type, ids, payload }) => {
    setSelectedIds([])
    try {
      if (type === 'move') {
        await invoke('move_labor_cost_center', {
          laborIds: ids,
          costCenterId: payload.costCenterId,
        })
      } else {
        await invoke('update_labor_phase', {
          laborIds: ids,
          phase: payload.phase,
        })
      }
      if (onRefresh) onRefresh()
    } catch (err) {
      const azione = type === 'move' ? 'nello spostamento' : "nell'aggiornamento dell'ambito"
      alert(`Errore ${azione} della manodopera: ` + err)
    }
  }

  const {
    pending: pendingMove,
    countdown,
    schedule: schedulePendingAction,
    cancel: cancelPendingMove,
    runNow: runPendingNow,
  } = usePendingBulkAction(runBulkAction)

  const startPendingMove = (targetCCId) => {
    if (!targetCCId) return
    const cc = costCenters.find(c => c.id.toString() === targetCCId)
    const targetCCName = cc ? `${cc.brand ? cc.brand + ' ' : ''}${cc.model}` : 'Generale'

    schedulePendingAction('move', selectedIds, {
      costCenterId: targetCCId === 'general' ? null : Number(targetCCId),
      targetCCName,
    })
  }

  const startPendingPhaseUpdate = (targetPhase) => {
    if (!targetPhase) return
    schedulePendingAction('phase', selectedIds, {
      // "Generale" non e' una fase reale: a database corrisponde a NULL.
      phase: targetPhase === 'Generale' ? null : targetPhase,
      targetPhase,
    })
  }

  const {
    filterOptions: phaseOptions,
    inputOptions: inlinePhaseOptions,
    addPhase,
  } = usePhaseOptions('phases_labor')
  const [employees, setEmployees] = useState([])
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([])

  const [rawVehicles, setRawVehicles] = useState([])
  const [newLaborData, setNewLaborData] = useState({
    project_id: projectId ? Number(projectId) : null,
    cost_center_id: defaultCostCenterId ? parseInt(defaultCostCenterId) : null,
    phase: 'Generale',
    date: new Date().toISOString().split('T')[0],
    operator: '',
    description: '',
    hours: 0,
    km: 0,
    hourly_cost: 30.00,
    markup: 0.50,
    vehicle: 'Nessuno'
  })
  // Primo campo del box: il fuoco ci torna dopo ogni salvataggio.
  const boxFirstFieldRef = useRef(null)

  const [vehicleOptions, setVehicleOptions] = useState([
    { id: 'Nessuno', label: 'Nessun Mezzo' }
  ])
  const [isBoxOpen, setIsBoxOpen] = useState(() => {
    const val = localStorage.getItem('labor_box_open')
    return val !== 'false'
  })

  useEffect(() => {
    localStorage.setItem('labor_box_open', isBoxOpen)
  }, [isBoxOpen])

  // Sincronizza i valori del nuovo box di inserimento in base ai filtri correnti o al defaultCostCenterId
  useEffect(() => {
    setNewLaborData(prev => ({
      ...prev,
      cost_center_id: defaultCostCenterId 
        ? parseInt(defaultCostCenterId) 
        : (filters.cc !== 'all' && filters.cc !== 'none' ? parseInt(filters.cc) : prev.cost_center_id),
      phase: filters.phase !== 'all' ? filters.phase : prev.phase
    }))
  }, [defaultCostCenterId, filters.cc, filters.phase])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const empData = await invoke('get_employees')
        setEmployees(empData)
      } catch (err) {
        console.error("Errore caricamento dipendenti:", err)
      }

      try {
        // Le fasi sono gestite da usePhaseOptions: qui servono solo i mezzi.
        const res = await invoke('get_global_settings')
        if (res.vehicles && res.vehicles.length > 0) {
          setRawVehicles(res.vehicles)
          const mappedVehicles = res.vehicles.map(v => {
            const name = typeof v === 'string' ? v : v.name;
            return { id: name, label: name };
          })
          setVehicleOptions([
            { id: 'Nessuno', label: 'Nessun Mezzo' },
            ...mappedVehicles
          ])
        }
      } catch (err) {
        console.error("Errore caricamento settings:", err)
      }
    }
    fetchData()
  }, [])

  const handleInputSelect = (e) => {
    const target = e.target
    setTimeout(() => {
      if (target) target.select()
    }, 50)
  }

  const handleAddNewEmployee = async (newEmployeeName) => {
    const trimmed = newEmployeeName.trim()
    if (!trimmed) return

    try {
      const newEmp = {
        name: trimmed,
        default_hourly_cost: 30.0
      }
      await invoke('save_employee', { employee: newEmp })
      const updatedEmployees = await invoke('get_employees')
      setEmployees(updatedEmployees)
      const created = updatedEmployees.find(e => e.name.toLowerCase() === trimmed.toLowerCase())
      if (created) {
        setSelectedEmployeeIds(prev => [...prev, created.id])
      }
    } catch (err) {
      console.error("Errore nel salvataggio del nuovo operatore:", err)
      alert("Impossibile salvare il nuovo operatore: " + err)
    }
  }

  const handleAddNewVehicle = async (newVehicleName) => {
    const trimmed = newVehicleName.trim()
    if (!trimmed) return

    try {
      const currentSettings = await invoke('get_global_settings')
      const vehicles = currentSettings.vehicles || []
      
      const exists = vehicles.some(v => {
        const name = typeof v === 'string' ? v : v.name;
        return name.toLowerCase() === trimmed.toLowerCase();
      })

      if (!exists) {
        const newVehicle = { name: trimmed, km_cost: 0.50 }
        const updatedVehicles = [...vehicles, newVehicle]
        const newSettings = {
          ...currentSettings,
          vehicles: updatedVehicles
        }

        await invoke('save_global_settings', { settings: newSettings })
        
        setRawVehicles(updatedVehicles)
        const mappedVehicles = updatedVehicles.map(v => {
          const name = typeof v === 'string' ? v : v.name;
          return { id: name, label: name };
        })
        setVehicleOptions([
          { id: 'Nessuno', label: 'Nessun Mezzo' },
          ...mappedVehicles
        ])
      }

      setNewLaborData(prev => ({ 
        ...prev, 
        vehicle: trimmed,
        km: project?.distance || 0
      }))
    } catch (err) {
      console.error("Errore nel salvataggio del nuovo mezzo:", err)
      alert("Impossibile salvare il nuovo mezzo: " + err)
    }
  }

  const handleAddNewPhase = async (newPhaseName) => {
    const created = await addPhase(newPhaseName)
    if (created) setNewLaborData(prev => ({ ...prev, phase: created }))
  }

  const handleAddNewLaborFromBox = async () => {
    if (isAddDisabled) return
    
    let travelCost = 0.0;
    let isTravel = false;
    if (newLaborData.vehicle && newLaborData.vehicle !== 'Nessuno') {
      const vehName = newLaborData.vehicle;
      const veh = rawVehicles.find(v => (typeof v === 'string' ? v : v.name) === vehName);
      const costPerKm = veh && typeof veh === 'object' ? (veh.km_cost ?? 0.50) : 0.50;
      travelCost = (parseFloat(newLaborData.km) || 0) * costPerKm;
      isTravel = true;
    }

    // Un dipendente selezionato puo' essere stato eliminato dalle Impostazioni
    // mentre il box di inserimento era aperto: senza questo filtro `emp` sarebbe
    // undefined e l'accesso a `emp.name` farebbe crollare l'intera interfaccia.
    const selectedEmployees = selectedEmployeeIds
      .map(id => employees.find(e => e.id === id))
      .filter(Boolean)

    if (selectedEmployees.length === 0) {
      alert("Nessuno dei dipendenti selezionati è più disponibile. Aggiorna la pagina e riprova.")
      setSelectedEmployeeIds([])
      return
    }

    if (selectedEmployees.length < selectedEmployeeIds.length) {
      alert("Alcuni dipendenti selezionati non sono più disponibili e verranno ignorati.")
    }

    const entries = selectedEmployees.map((emp, index) => ({
      ...newLaborData,
      project_id: Number(projectId),
      cost_center_id: newLaborData.cost_center_id ? parseInt(newLaborData.cost_center_id) : null,
      operator: emp.name,
      hourly_cost: emp.default_hourly_cost,
      hours: parseFloat(newLaborData.hours) || 0,
      markup: parseFloat(newLaborData.markup) || 0,
      is_travel: isTravel,
      vehicle: newLaborData.vehicle || "Nessuno",
      // Il costo di trasferta e' del viaggio, non della persona: va addebitato
      // una sola volta anche se l'inserimento riguarda piu' operatori.
      travel_cost: index === 0 ? travelCost : 0.0
    }))

    try {
      if (onSave) {
        await onSave(entries)
      }
      setSelectedEmployeeIds([])
      setNewLaborData(prev => ({
        ...prev,
        hours: 0,
        km: 0,
        description: ''
      }))
      // Il box conserva centro di costo, fase, data e mezzo: riportare il
      // fuoco sulla descrizione consente di registrare subito la voce dopo.
      boxFirstFieldRef.current?.focus()
    } catch (err) {
      console.error(err)
    }
  }

  /**
   * Tastiera del box di inserimento: Invio salva, Esc svuota i campi che
   * cambiano da una registrazione all'altra. Gli eventi gia' consumati da un
   * menu a tendina arrivano con `defaultPrevented` e vengono lasciati stare.
   */
  const handleBoxKeyDown = (e) => {
    if (e.defaultPrevented) return

    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      e.preventDefault()
      if (!isAddDisabled) handleAddNewLaborFromBox()
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      setNewLaborData(prev => ({ ...prev, hours: 0, km: 0, description: '' }))
      boxFirstFieldRef.current?.focus()
    }
  }

  const employeeOptions = useMemo(() => employees.map(e => ({ 
    id: e.id, 
    label: e.name, 
    cost: e.default_hourly_cost 
  })), [employees])

  const isAddDisabled = useMemo(() => {
    if (selectedEmployeeIds.length === 0) return true;
    if (newLaborData.vehicle && newLaborData.vehicle !== 'Nessuno') {
      return (parseFloat(newLaborData.km) || 0) <= 0 && (parseFloat(newLaborData.hours) || 0) <= 0;
    }
    return !newLaborData.hours || parseFloat(newLaborData.hours) <= 0;
  }, [selectedEmployeeIds, newLaborData.vehicle, newLaborData.km, newLaborData.hours])

  const getKmFromTravelCost = (l) => {
    if (!l.vehicle || l.vehicle === 'Nessuno' || !l.travel_cost) return null;
    const veh = rawVehicles.find(v => (typeof v === 'string' ? v : v.name) === l.vehicle);
    const costPerKm = veh && typeof veh === 'object' ? (veh.km_cost ?? 0.50) : 0.50;
    if (costPerKm <= 0) return 0;
    return Math.round(l.travel_cost / costPerKm);
  }

  const handleStartEdit = (item) => {
    setEditingId(item.id)
    setInlineFormData({
      ...item,
      km: getKmFromTravelCost(item) || 0
    })
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setInlineFormData(null)
  }

  const handleSaveEdit = async () => {
    if (!inlineFormData.operator.trim()) return
    try {
      if (onSave) {
        await onSave(inlineFormData)
      }
      setEditingId(null)
      setInlineFormData(null)
    } catch (err) {
      console.error(err)
    }
  }

  const handleInlineOperatorChange = (operatorName) => {
    const emp = employees.find(e => e.name === operatorName)
    const hourlyCost = emp ? emp.default_hourly_cost : 30.0
    setInlineFormData(prev => ({
      ...prev,
      operator: operatorName,
      hourly_cost: hourlyCost
    }))
  }

  const handleInlineVehicleChange = (val) => {
    setInlineFormData(prev => {
      const veh = rawVehicles.find(v => (typeof v === 'string' ? v : v.name) === val)
      const costPerKm = veh && typeof veh === 'object' ? (veh.km_cost ?? 0.50) : 0.50
      const km = prev.km !== undefined ? prev.km : getKmFromTravelCost(prev) || 0
      return {
        ...prev,
        vehicle: val,
        travel_cost: val === 'Nessuno' ? 0.0 : km * costPerKm,
        is_travel: val !== 'Nessuno'
      }
    })
  }

  const handleInlineKmChange = (val) => {
    setInlineFormData(prev => {
      const vehName = prev.vehicle
      const veh = rawVehicles.find(v => (typeof v === 'string' ? v : v.name) === vehName)
      const costPerKm = veh && typeof veh === 'object' ? (veh.km_cost ?? 0.50) : 0.50
      const parsedKm = parseFloat(val) || 0
      return {
        ...prev,
        km: parsedKm,
        travel_cost: vehName === 'Nessuno' ? 0.0 : parsedKm * costPerKm
      }
    })
  }

  const renderInlineRow = () => {
    if (!inlineFormData) return null;

    const inlineCcOptions = [
      { id: 'none', label: 'Generale' },
      ...costCenters.map(cc => ({ id: String(cc.id), label: cc.model }))
    ]

    const inlineEmployeeOptions = employees.map(e => ({
      id: e.name,
      label: e.name
    }))

    const isVehicleSelected = inlineFormData.vehicle && inlineFormData.vehicle !== 'Nessuno';

    return (
      <tr className="bg-accent/[0.03] hover:bg-accent/[0.05] transition-colors border-y border-slate-100">
        <td className="px-6 py-4 select-none w-12"></td>
        {/* Operatore & Veicolo */}
        <td className="px-8 py-4">
          <div className="flex flex-col gap-2 min-w-[200px]">
            <Select 
              options={inlineEmployeeOptions}
              value={inlineFormData.operator}
              onChange={handleInlineOperatorChange}
              className="bg-white"
            />
            <Select 
              options={vehicleOptions}
              value={inlineFormData.vehicle}
              onChange={handleInlineVehicleChange}
              className="bg-white"
            />
          </div>
        </td>
        
        {/* Descrizione */}
        <td className="px-8 py-4">
          <input 
            type="text"
            placeholder="Descrizione lavoro..."
            value={inlineFormData.description || ''}
            onChange={(e) => setInlineFormData(p => ({ ...p, description: e.target.value }))}
            onFocus={handleInputSelect}
            onClick={handleInputSelect}
            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] transition-all"
          />
        </td>

        {/* Centro Costo */}
        {!defaultCostCenterId && (
          <td className="px-8 py-4">
            <Select 
              options={inlineCcOptions}
              value={inlineFormData.cost_center_id ? String(inlineFormData.cost_center_id) : 'none'}
              onChange={(val) => setInlineFormData(p => ({ ...p, cost_center_id: val === 'none' ? null : parseInt(val) }))}
              className="bg-white min-w-[150px]"
            />
          </td>
        )}

        {/* Ambito/Fase */}
        <td className="px-8 py-4">
          <Select 
            options={inlinePhaseOptions}
            value={inlineFormData.phase || 'Generale'}
            onChange={(val) => setInlineFormData(p => ({ ...p, phase: val }))}
            className="bg-white min-w-[130px]"
          />
        </td>

        {/* Data */}
        <td className="px-8 py-4">
          <div className="min-w-[150px]">
            <DatePicker 
              value={inlineFormData.date}
              onChange={(val) => setInlineFormData(p => ({ ...p, date: val }))}
              compact={true}
            />
          </div>
        </td>

        {/* Ore / Km */}
        <td className="px-8 py-4">
          <div className="flex flex-col gap-2 items-end">
            <div className="flex gap-1 items-center justify-end">
              <span className="text-[0.75rem] font-black text-slate-400">Ore</span>
              <input 
                type="number" 
                step="any"
                value={inlineFormData.hours}
                onChange={(e) => setInlineFormData(p => ({ ...p, hours: parseFloat(e.target.value) || 0 }))}
                onFocus={handleInputSelect}
                onClick={handleInputSelect}
                className="w-16 bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-right text-slate-700 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] transition-all"
              />
            </div>
            {isVehicleSelected && (
              <div className="flex gap-1 items-center justify-end">
                <span className="text-[0.75rem] font-black text-slate-400">Km</span>
                <input 
                  type="number" 
                  step="any"
                  value={inlineFormData.km}
                  onChange={(e) => handleInlineKmChange(e.target.value)}
                  onFocus={handleInputSelect}
                  onClick={handleInputSelect}
                  className="w-16 bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-right text-slate-700 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] transition-all"
                />
              </div>
            )}
          </div>
        </td>

        {/* Tot. Vendita & Ricarico */}
        <td className="px-8 py-4 text-right">
          <div className="flex flex-col items-end gap-1">
            <p className="text-xs font-black text-slate-800">
              € {(((inlineFormData.hours * inlineFormData.hourly_cost) + (inlineFormData.travel_cost || 0.0)) * (1 + (inlineFormData.markup || 0.0))).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
            </p>
            <div className="flex items-center gap-1 justify-end">
              <span className="text-[0.7rem] font-black text-emerald-500 uppercase tracking-widest">Ric.%</span>
              <input 
                type="number"
                placeholder="Ricarico"
                value={Math.round((inlineFormData.markup || 0) * 100)}
                onChange={(e) => setInlineFormData(p => ({ ...p, markup: (parseFloat(e.target.value) || 0) / 100 }))}
                onFocus={handleInputSelect}
                onClick={handleInputSelect}
                className="w-12 bg-white border border-slate-200 rounded-xl px-1.5 py-1 text-[0.75rem] font-bold text-right text-emerald-600 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] transition-all"
              />
            </div>
          </div>
        </td>

        {/* Azioni */}
        <td className="px-8 py-4 text-center">
          <div className="flex items-center justify-center gap-2">
            <button 
              type="button"
              onClick={handleSaveEdit}
              className="p-2 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
              title="Salva"
            >
              <Check size={18} />
            </button>
            <button 
              type="button"
              onClick={handleCancelEdit}
              className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
              title="Annulla"
            >
              <X size={18} />
            </button>
          </div>
        </td>
      </tr>
    )
  }

  const ccOptions = useMemo(() => [
    { id: 'all', label: 'Tutti i Centri' },
    { id: 'none', label: 'Solo Generali' },
    ...costCenters.map(cc => ({ id: cc.id, label: cc.model }))
  ], [costCenters])

  const filteredData = useMemo(() => {
    let result = labor.filter(l => {
      const matchesSearch = !filters.search || 
        l.operator.toLowerCase().includes(filters.search.toLowerCase()) ||
        (l.description && l.description.toLowerCase().includes(filters.search.toLowerCase()));
      
      const matchesPhase = filters.phase === 'all' || l.phase === filters.phase;
      
      const matchesCC = filters.cc === 'all' || 
        (filters.cc === 'none' && !l.cost_center_id) ||
        (l.cost_center_id === parseInt(filters.cc));

      return matchesSearch && matchesPhase && matchesCC;
    })

    // Sorting logic
    result.sort((a, b) => {
      let valA, valB;
      switch(sort.field) {
        case 'operator': valA = a.operator.toLowerCase(); valB = b.operator.toLowerCase(); break;
        case 'description': valA = (a.description || '').toLowerCase(); valB = (b.description || '').toLowerCase(); break;
        case 'cost_center': valA = a.cost_center_name || ''; valB = b.cost_center_name || ''; break;
        case 'phase': valA = a.phase || ''; valB = b.phase || ''; break;
        case 'date': valA = new Date(a.date); valB = new Date(b.date); break;
        case 'hours': valA = a.hours; valB = b.hours; break;
        case 'cost': valA = a.hourly_cost; valB = b.hourly_cost; break;
        case 'total': 
          valA = ((a.hours * a.hourly_cost) + (a.travel_cost || 0.0)) * (1 + a.markup); 
          valB = ((b.hours * b.hourly_cost) + (b.travel_cost || 0.0)) * (1 + b.markup); 
          break;
        default: valA = a.id; valB = b.id;
      }
      if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    })

    return result
  }, [labor, filters, sort])

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
  const vehicleSelected = newLaborData.vehicle && newLaborData.vehicle !== 'Nessuno';

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Registro Manodopera</h2>
          <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {filteredData.length} registrazioni {filteredData.length !== labor.length ? '(filtrate)' : ''}
          </p>
        </div>
        {onSave && (
          <button 
            onClick={() => setIsBoxOpen(p => !p)}
            className="bg-accent text-white px-8 py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-accent/90 transition-all shadow-xl shadow-accent/20 flex items-center gap-2"
          >
            {isBoxOpen ? <X size={18} /> : <Plus size={18} />} 
            {isBoxOpen ? 'Nascondi Aggiunta' : 'Aggiungi Manodopera'}
          </button>
        )}
      </div>

      {/* Box Aggiunta Manodopera Persistente */}
      {onSave && isBoxOpen && (
        <div onKeyDown={handleBoxKeyDown} className="relative z-30 bg-white/40 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/40 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-accent/10 rounded-lg text-accent">
                <Plus size={14} className="stroke-[3]" />
              </div>
              <span className="text-[0.75rem] font-black uppercase tracking-widest text-slate-500">Nuova Registrazione Ore</span>
              <span className="hidden lg:flex items-center gap-1.5 ml-3 text-slate-400">
                <Kbd>Invio</Kbd>
                <span className="text-[0.7rem] font-semibold">salva</span>
                <Kbd>Esc</Kbd>
                <span className="text-[0.7rem] font-semibold">svuota</span>
              </span>
            </div>
            <div className="flex items-center gap-4">
              {/* Riepilogo economico dell'aggiunta */}
              {(() => {
                let travelCost = 0.0;
                if (newLaborData.vehicle && newLaborData.vehicle !== 'Nessuno') {
                  const vehName = newLaborData.vehicle;
                  const veh = rawVehicles.find(v => (typeof v === 'string' ? v : v.name) === vehName);
                  const costPerKm = veh && typeof veh === 'object' ? (veh.km_cost ?? 0.50) : 0.50;
                  travelCost = (parseFloat(newLaborData.km) || 0) * costPerKm;
                }

                let laborCost = 0.0;
                if (selectedEmployeeIds.length > 0) {
                  selectedEmployeeIds.forEach(id => {
                    const emp = employees.find(e => e.id === id);
                    const rate = emp ? emp.default_hourly_cost : newLaborData.hourly_cost;
                    laborCost += (parseFloat(newLaborData.hours) || 0) * rate;
                  });
                } else {
                  laborCost = (parseFloat(newLaborData.hours) || 0) * newLaborData.hourly_cost;
                }

                const totalCost = travelCost + laborCost;
                const totalSale = totalCost * (1 + newLaborData.markup);
                return (
                  <div className="text-right">
                    <span className="text-[0.72rem] font-bold text-slate-400 uppercase tracking-wider mr-2">Tot. Vendita:</span>
                    <span className="text-sm font-black text-slate-800">
                      € {totalSale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                )
              })()}
              <button 
                onClick={() => setIsBoxOpen(false)}
                className="text-slate-400 hover:text-rose-500 p-1 hover:bg-slate-100 rounded-lg transition-colors"
                title="Chiudi pannello di inserimento"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          <div className="relative z-20 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end">
            {/* Operatori */}
            <div className="lg:col-span-4 space-y-1.5">
              <label className="text-[0.7rem] font-black uppercase tracking-widest text-slate-400 ml-1">Operatori *</label>
              <MultiSelect 
                options={employeeOptions}
                selectedValues={selectedEmployeeIds}
                onChange={setSelectedEmployeeIds}
                placeholder="Scegli persone..."
                icon={Users}
                onAddNew={handleAddNewEmployee}
                compact={true}
              />
            </div>

            {/* Note Attività */}
            <div className="lg:col-span-4 space-y-1.5">
              <label className="text-[0.7rem] font-black uppercase tracking-widest text-slate-400 ml-1">Note Attività / Descrizione</label>
              <input 
                type="text" 
                ref={boxFirstFieldRef}
                placeholder="Descrizione dell'attività..."
                value={newLaborData.description}
                onChange={(e) => setNewLaborData(p => ({ ...p, description: e.target.value }))}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] transition-all"
              />
            </div>

            {/* Mezzo Utilizzato */}
            <div className="lg:col-span-2 space-y-1.5">
              <label className="text-[0.7rem] font-black uppercase tracking-widest text-slate-400 ml-1">Mezzo Utilizzato</label>
              <VehicleSelector 
                vehicles={vehicleOptions}
                value={newLaborData.vehicle}
                onChange={(val) => {
                  setNewLaborData(p => {
                    const isVehicle = val && val !== 'Nessuno';
                    return {
                      ...p,
                      vehicle: val,
                      km: isVehicle ? (project?.distance || 0) : 0
                    };
                  });
                }}
                onAddNew={handleAddNewVehicle}
                placeholder="Seleziona mezzo..."
                compact={true}
              />
            </div>

            {/* Data */}
            <div className="lg:col-span-2 space-y-1.5">
              <label className="text-[0.7rem] font-black uppercase tracking-widest text-slate-400 ml-1">Data</label>
              <DatePicker 
                compact={true}
                value={newLaborData.date}
                onChange={(val) => setNewLaborData(p => ({ ...p, date: val }))}
              />
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end pt-2">
            {/* Centro di Costo (se non è predefinito) */}
            {!defaultCostCenterId ? (
              <div className={`${vehicleSelected ? 'lg:col-span-2' : 'lg:col-span-3'} space-y-1.5`}>
                <label className="text-[0.7rem] font-black uppercase tracking-widest text-slate-400 ml-1">Centro di Costo</label>
                <select
                  value={newLaborData.cost_center_id || ''}
                  onChange={(e) => setNewLaborData(p => ({ ...p, cost_center_id: e.target.value ? parseInt(e.target.value) : null }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] transition-all"
                >
                  <option value="">Generale</option>
                  {costCenters.map(cc => (
                    <option key={cc.id} value={cc.id}>{cc.model}</option>
                  ))}
                </select>
              </div>
            ) : null}

            {/* Ambito (Fase) */}
            <div className={`${
              defaultCostCenterId 
                ? (vehicleSelected ? 'lg:col-span-4' : 'lg:col-span-6') 
                : (vehicleSelected ? 'lg:col-span-2' : 'lg:col-span-3')
            } space-y-1.5`}>
              <label className="text-[0.7rem] font-black uppercase tracking-widest text-slate-400 ml-1">Ambito / Fase</label>
              <PhaseSelector
                phases={inlinePhaseOptions}
                value={newLaborData.phase}
                onChange={(val) => setNewLaborData(p => ({ ...p, phase: val }))}
                onAddNew={handleAddNewPhase}
                placeholder="Seleziona fase..."
                compact={true}
              />
            </div>

            {/* Ore */}
            <div className="lg:col-span-2 space-y-1.5">
              <label className="text-[0.7rem] font-black uppercase tracking-widest text-slate-400 ml-1">Ore *</label>
              <input 
                type="number" 
                step="0.25"
                min="0"
                placeholder="Ore"
                value={newLaborData.hours}
                onChange={(e) => setNewLaborData(p => ({ ...p, hours: parseFloat(e.target.value) || 0 }))}
                onFocus={handleInputSelect}
                onClick={handleInputSelect}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-right text-slate-700 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] transition-all"
              />
            </div>

            {/* Km (mostrato solo se selezionato un mezzo) */}
            {vehicleSelected && (
              <div className="lg:col-span-2 space-y-1.5">
                <label className="text-[0.7rem] font-black uppercase tracking-widest text-slate-400 ml-1">Km *</label>
                <input 
                  type="number" 
                  step="1"
                  min="0"
                  placeholder="Km"
                  value={newLaborData.km ?? 0}
                  onChange={(e) => setNewLaborData(p => ({ ...p, km: parseFloat(e.target.value) || 0 }))}
                  onFocus={handleInputSelect}
                  onClick={handleInputSelect}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-right text-slate-700 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] transition-all"
                />
              </div>
            )}

            {/* Ricarico (%) */}
            <div className="lg:col-span-2 space-y-1.5">
              <label className="text-[0.7rem] font-black uppercase tracking-widest text-slate-400 ml-1">Ric. %</label>
              <input 
                type="number"
                step="1"
                placeholder="Ric. %"
                value={Math.round((newLaborData.markup || 0) * 100)}
                onChange={(e) => setNewLaborData(p => ({ ...p, markup: (parseFloat(e.target.value) || 0) / 100 }))}
                onFocus={handleInputSelect}
                onClick={handleInputSelect}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-right text-emerald-600 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] transition-all"
              />
            </div>

            {/* Bottone Registra */}
            <div className="lg:col-span-2 flex items-end justify-end w-full">
              <button 
                onClick={handleAddNewLaborFromBox}
                disabled={isAddDisabled}
                className={`w-full py-2 rounded-xl text-[0.75rem] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 h-[36px] ${
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

      {/* Toolbar Filtri Manodopera */}
      <div className="relative z-20 flex flex-col lg:flex-row gap-6 items-end bg-white/50 backdrop-blur-md p-6 rounded-[2rem] border border-white/50 shadow-sm">
        <div className="flex-1 w-full space-y-2">
          <label className="text-[0.72rem] font-black uppercase tracking-widest text-slate-400 ml-1">Cerca Operatore / Attività</label>
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-accent transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Nome operatore o descrizione..."
              value={filters.search}
              onChange={(e) => setFilters(p => ({...p, search: e.target.value}))}
              className="w-full bg-white/50 border border-white/50 rounded-xl py-4 pl-14 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all"
            />
          </div>
        </div>
        
        <div className="w-full lg:w-64 space-y-2">
          <label className="text-[0.72rem] font-black uppercase tracking-widest text-slate-400 ml-1">Filtra Fase</label>
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
            <label className="text-[0.72rem] font-black uppercase tracking-widest text-slate-400 ml-1">Filtra Centro</label>
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

      <div className="relative z-10 glass-panel overflow-hidden rounded-[2.5rem] border border-white/50 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-6 py-6 text-center select-none w-12">
                  <input 
                    type="checkbox" 
                    checked={filteredData.length > 0 && filteredData.every(l => selectedIds.includes(l.id))} 
                    onChange={handleSelectAll} 
                    className="rounded border-slate-300 text-accent focus:ring-accent" 
                  />
                </th>
                <th onClick={() => handleSort('operator')} className="px-8 py-6 text-[0.72rem] font-black uppercase tracking-widest text-slate-400 cursor-pointer group select-none">
                  <div className="flex items-center gap-2">Operatore <SortIcon field="operator" /></div>
                </th>
                <th onClick={() => handleSort('description')} className="px-8 py-6 text-[0.72rem] font-black uppercase tracking-widest text-slate-400 cursor-pointer group select-none">
                  <div className="flex items-center gap-2">Descrizione <SortIcon field="description" /></div>
                </th>
                {!defaultCostCenterId && (
                  <th onClick={() => handleSort('cost_center')} className="px-8 py-6 text-[0.72rem] font-black uppercase tracking-widest text-slate-400 cursor-pointer group select-none">
                    <div className="flex items-center gap-2">Centro <SortIcon field="cost_center" /></div>
                  </th>
                )}
                <th onClick={() => handleSort('phase')} className="px-8 py-6 text-[0.72rem] font-black uppercase tracking-widest text-slate-400 cursor-pointer group select-none">
                  <div className="flex items-center gap-2">Ambito <SortIcon field="phase" /></div>
                </th>
                <th onClick={() => handleSort('date')} className="px-8 py-6 text-[0.72rem] font-black uppercase tracking-widest text-slate-400 cursor-pointer group select-none">
                  <div className="flex items-center gap-2">Data <SortIcon field="date" /></div>
                </th>
                <th onClick={() => handleSort('hours')} className="px-8 py-6 text-[0.72rem] font-black uppercase tracking-widest text-slate-400 text-right cursor-pointer group select-none">
                  <div className="flex items-center justify-end gap-2">Ore <SortIcon field="hours" /></div>
                </th>
                <th onClick={() => handleSort('total')} className="px-8 py-6 text-[0.72rem] font-black uppercase tracking-widest text-slate-400 text-right cursor-pointer group select-none">
                  <div className="flex items-center justify-end gap-2">Tot. Vendita <SortIcon field="total" /></div>
                </th>
                <th className="px-8 py-6 text-[0.72rem] font-black uppercase tracking-widest text-slate-400 text-center">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? filteredData.map(l => {
                if (editingId === l.id) return renderInlineRow();
                return (
                  <tr key={l.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-6 text-center select-none w-12">
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(l.id)} 
                        onChange={() => handleSelectRow(l)} 
                        className="rounded border-slate-300 text-accent focus:ring-accent" 
                      />
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-slate-100 text-slate-400 rounded-lg">
                          <User size={14} />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm font-black text-slate-800">{l.operator}</span>
                          {l.vehicle && l.vehicle !== 'Nessuno' && (
                            <div className="flex items-center gap-1 mt-0.5 opacity-80">
                              <Truck size={10} className="text-slate-400" />
                              <span className="text-[0.72rem] font-bold text-slate-400 uppercase tracking-wider">{l.vehicle}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex flex-col">
                        <span className="text-sm font-medium text-slate-600 leading-tight">{l.description || '-'}</span>
                      </div>
                    </td>
                    {!defaultCostCenterId && (
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-lg ${l.cost_center_id ? 'bg-amber-50 text-amber-500' : 'bg-slate-100 text-slate-300'}`}>
                            <Target size={14} />
                          </div>
                          <span className={`text-[0.75rem] font-black uppercase tracking-tight ${l.cost_center_name ? 'text-slate-800' : 'text-slate-400'}`}>
                            {l.cost_center_name || 'Generale'}
                          </span>
                        </div>
                      </td>
                    )}
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-slate-100 text-slate-400">
                          <Layers size={14} />
                        </div>
                        <span className="text-[0.75rem] font-black text-slate-800 uppercase tracking-tight">
                          {l.phase || 'Generale'}
                        </span>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-2 text-slate-500">
                        <CalendarIcon size={14} />
                        <span className="text-xs font-bold">{new Date(l.date).toLocaleDateString('it-IT')}</span>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="flex flex-col items-end gap-1">
                        {l.hours > 0 && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Clock size={12} className="text-slate-400" />
                            <span className="text-sm font-bold text-slate-800">
                              {l.hours.toLocaleString('it-IT', { minimumFractionDigits: 1 })} h
                            </span>
                          </div>
                        )}
                        {(() => {
                          const km = getKmFromTravelCost(l);
                          if (km && km > 0) {
                            return (
                              <div className="flex items-center justify-end gap-1.5 text-slate-500">
                                <Truck size={12} className="text-slate-400" />
                                <span className="text-xs font-semibold">
                                  {km} km
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                        {l.hours <= 0 && !getKmFromTravelCost(l) && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Clock size={12} className="text-slate-400" />
                            <span className="text-sm font-bold text-slate-800">0,0 h</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                      <div className="inline-block text-right">
                        <p className="text-sm font-black text-slate-800">
                          € {(((l.hours * l.hourly_cost) + (l.travel_cost || 0.0)) * (1 + l.markup)).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-[0.7rem] font-black text-emerald-500 uppercase tracking-widest">
                          Ric. {(l.markup * 100).toFixed(0)}%
                        </p>
                      </div>
                    </td>
                    <td className="px-8 py-6 text-center">
                      <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => handleStartEdit(l)}
                          className="p-2 text-slate-400 hover:text-accent hover:bg-accent/5 rounded-lg transition-all"
                          title="Modifica inline"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button 
                          onClick={() => {
                            setLaborToDeleteId(l.id)
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
                );
              }) : (
                <tr>
                  <td colSpan={defaultCostCenterId ? "8" : "9"} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-6 bg-slate-50 rounded-3xl text-slate-200">
                        <HardHat size={48} />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-slate-800 tracking-tight">
                          {labor.length > 0 ? 'Nessun risultato per i filtri selezionati' : 'Nessuna ora registrata'}
                        </h4>
                        <p className="text-sm font-bold text-slate-400 mt-1">
                          {labor.length > 0 ? 'Prova a modificare i criteri di ricerca.' : 'Inizia a registrare le ore lavorate per questa commessa.'}
                        </p>
                      </div>
                      {hasActiveFilters && (
                        <button 
                          onClick={() => setFilters(initialFilters)}
                          className="mt-4 text-accent font-black uppercase tracking-[0.2em] text-[0.72rem] hover:tracking-[0.3em] transition-all"
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
          setLaborToDeleteId(null)
        }}
        onConfirm={async () => {
          if (laborToDeleteId) {
            await onDelete(laborToDeleteId)
          }
          setIsConfirmDeleteOpen(false)
          setLaborToDeleteId(null)
        }}
        title="Elimina Ore Manodopera"
        message="Sei sicuro di voler eliminare definitivamente questa registrazione di manodopera? L'azione è irreversibile."
        confirmText="Elimina"
        cancelText="Annulla"
        type="danger"
      />

      {selectedIds.length > 0 && createPortal(
        (() => {
          const selectedLabor = labor.filter(l => selectedIds.includes(l.id));
          const currentCCIds = new Set(selectedLabor.map(l => l.cost_center_id ? Number(l.cost_center_id) : null));
          const availableCostCenters = costCenters.filter(cc => !currentCCIds.has(Number(cc.id)));
          const showGeneralOption = currentCCIds.has(null) ? currentCCIds.size > 1 : true;

          if (pendingMove) {
            const isPhase = pendingMove.type === 'phase';
            return (
              <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-slate-900/95 text-white px-6 py-4 rounded-3xl shadow-2xl flex items-center gap-6 z-50 backdrop-blur-md border border-white/10 animate-premium-in">
                <span className="text-xs font-black uppercase tracking-widest text-amber-400 animate-pulse flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span> {isPhase ? 'Aggiornamento in corso...' : 'Spostamento in corso...'}
                </span>
                <div className="h-4 w-px bg-white/20"></div>
                <span className="text-xs font-medium text-slate-300">
                  {isPhase ? 'Cambio ambito per ' : 'Sposto '} {pendingMove.ids.length} {pendingMove.ids.length === 1 ? 'registrazione' : 'registrazioni'} in <strong className="text-white font-black">{isPhase ? pendingMove.payload.targetPhase : pendingMove.payload.targetCCName}</strong> ({countdown}s)
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
                    onClick={runPendingNow}
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
                {selectedIds.length} {selectedIds.length === 1 ? 'Manodopera selezionata' : 'Manodopera selezionate'}
              </span>
              <div className="h-4 w-px bg-white/20"></div>
              
              {/* Sposta in Centro di Costo */}
              {(availableCostCenters.length > 0 || showGeneralOption) ? (
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
                          {showGeneralOption && (
                            <button
                              key="general"
                              type="button"
                              onClick={() => {
                                startPendingMove('general');
                                setIsMoveOpen(false);
                              }}
                              className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-all text-[0.75rem] font-black uppercase tracking-widest text-left cursor-pointer"
                            >
                              <span>Generale</span>
                            </button>
                          )}
                          {availableCostCenters.map(cc => (
                            <button
                              key={cc.id}
                              type="button"
                              onClick={() => {
                                startPendingMove(cc.id.toString());
                                setIsMoveOpen(false);
                              }}
                              className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-all text-[0.75rem] font-black uppercase tracking-widest text-left cursor-pointer"
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
                          className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-all text-[0.75rem] font-black uppercase tracking-widest text-left cursor-pointer"
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
                            className="w-full flex items-center justify-between p-3.5 rounded-xl hover:bg-white/10 text-slate-300 hover:text-white transition-all text-[0.75rem] font-black uppercase tracking-widest text-left cursor-pointer"
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

export default LaborTab
