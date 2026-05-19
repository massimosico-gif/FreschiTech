import React, { useState, useEffect, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { X, Calendar, User, Clock, Euro, Target, Layers, FileText, Activity, Truck, Plane, Users } from 'lucide-react'
import DrawerShell from './ui/DrawerShell'
import Select from './ui/Select'
import MultiSelect from './ui/MultiSelect'
import DatePicker from './ui/DatePicker'
import PhaseSelector from './ui/PhaseSelector'
import VehicleSelector from './ui/VehicleSelector'

const EditLaborDrawer = ({ isOpen, onClose, labor, projectId, project, costCenters, onSave, defaultCostCenterId = null }) => {
  const [employees, setEmployees] = useState([])
  const [vehiclesData, setVehiclesData] = useState([])
  
  const initialData = useMemo(() => ({
    project_id: Number(projectId),
    cost_center_id: defaultCostCenterId,
    phase: 'Generale',
    date: new Date().toISOString().split('T')[0],
    operator: '', // Fallback for single edit
    description: '',
    hours: 0,
    hourly_cost: 30.00,
    markup: 0.50,
    is_travel: false,
    vehicle: 'Nessuno',
    travel_cost: 0.0,
    km: 0,
    km_cost: 0.50
  }), [projectId, defaultCostCenterId])

  const [formData, setFormData] = useState(initialData)
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([])
  const [isChanged, setIsChanged] = useState(false)

  const isOperatorMissing = labor 
    ? (!formData.operator || !formData.operator.trim())
    : selectedEmployeeIds.length === 0;

  const isSaveDisabled = isOperatorMissing || (labor && !isChanged);

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await invoke('get_employees')
        setEmployees(data)
      } catch (err) {
        console.error("Errore caricamento dipendenti:", err)
      }
    }
    if (isOpen) fetchEmployees()
  }, [isOpen])

  useEffect(() => {
    if (labor) {
      const isVeh = labor.vehicle && labor.vehicle !== 'Nessuno';
      const laborKmCost = project?.km_cost || 0.50;
      const laborKm = isVeh && labor.travel_cost > 0 
        ? labor.travel_cost / laborKmCost 
        : (project?.distance || 0);

      setFormData({
        ...labor,
        project_id: Number(labor.project_id || projectId),
        cost_center_id: labor.cost_center_id ? Number(labor.cost_center_id) : null,
        date: labor.date ? labor.date.split('T')[0] : new Date().toISOString().split('T')[0],
        is_travel: !!labor.is_travel,
        travel_cost: labor.travel_cost || 0.0,
        km: labor.km || laborKm,
        km_cost: labor.km_cost || laborKmCost
      })
      setSelectedEmployeeIds([]) // In edit mode we don't use multi-select for now
      setIsChanged(false)
    } else {
      setFormData({
        ...initialData,
        project_id: Number(projectId)
      })
      setSelectedEmployeeIds([])
      setIsChanged(false)
    }
  }, [labor, isOpen, project, defaultCostCenterId, initialData])

  const toggleTravel = () => {
    const newIsTravel = !formData.is_travel
    const travelCostValue = newIsTravel && project ? (project.distance || 0) * (project.km_cost || 0.50) : 0.0
    setFormData(prev => {
      const newData = { 
        ...prev, 
        is_travel: newIsTravel,
        travel_cost: travelCostValue
      }
      setIsChanged(JSON.stringify(newData) !== JSON.stringify(labor || initialData))
      return newData
    })
  }

  const handleChange = (field, value) => {
    setFormData(prev => {
      let newData = { ...prev, [field]: value }
      
      if (field === 'vehicle') {
        if (value && value !== 'Nessuno') {
          const matchedVeh = vehiclesData.find(v => v.name === value)
          const kmCostVal = matchedVeh ? matchedVeh.km_cost : (project?.km_cost || 0.50)
          const kmVal = prev.km || (project?.distance || 0)
          newData = {
            ...newData,
            km: kmVal,
            km_cost: kmCostVal,
            travel_cost: kmVal * kmCostVal
          }
        } else {
          // Se Mezzo è "Nessuno", azzera la trasferta (a meno che non sia attivato manualmente is_travel)
          newData = {
            ...newData,
            km: 0,
            km_cost: 0.0,
            travel_cost: prev.is_travel ? (prev.travel_cost || 0) : 0.0
          }
        }
      }
      
      setIsChanged(JSON.stringify(newData) !== JSON.stringify(labor || initialData))
      return newData
    })
  }

  const handleVehicleCostChange = (field, value) => {
    setFormData(prev => {
      const updated = { ...prev, [field]: value }
      const km = field === 'km' ? value : (updated.km || 0)
      const km_cost = field === 'km_cost' ? value : (updated.km_cost || 0)
      
      const newData = {
        ...updated,
        travel_cost: km * km_cost
      }
      setIsChanged(JSON.stringify(newData) !== JSON.stringify(labor || initialData))
      return newData
    })
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

  const [phaseOptions, setPhaseOptions] = useState([{ id: 'Generale', label: 'Generale' }])
  const [vehicleOptions, setVehicleOptions] = useState([{ id: 'Nessuno', label: 'Nessun Mezzo' }])

  useEffect(() => {
    invoke('get_global_settings').then(res => {
      if (res.phases_labor && res.phases_labor.length > 0) {
        setPhaseOptions(res.phases_labor.map(p => ({ id: p, label: p })))
      }
      if (res.vehicles && res.vehicles.length > 0) {
        const mapped = res.vehicles.map(v => 
          typeof v === 'string' ? { name: v, km_cost: 0.50 } : v
        )
        setVehiclesData(mapped)
        setVehicleOptions([
          { id: 'Nessuno', label: 'Nessun Mezzo' },
          ...mapped.map(v => ({ id: v.name, label: v.name }))
        ])
      }
    }).catch(console.error)
  }, [])

  const handleAddNewVehicle = async (newVehicleName) => {
    const trimmed = newVehicleName.trim()
    if (!trimmed) return

    try {
      const currentSettings = await invoke('get_global_settings')
      const vehicles = currentSettings.vehicles || []

      const exists = vehicles.some(v => 
        (typeof v === 'string' ? v.toLowerCase() : v.name.toLowerCase()) === trimmed.toLowerCase()
      )
      if (!exists) {
        const newVeh = { name: trimmed, km_cost: 0.50 }
        const updatedVehicles = [...vehicles, newVeh]
        const newSettings = {
          ...currentSettings,
          vehicles: updatedVehicles
        }

        await invoke('save_global_settings', { settings: newSettings })
        
        const mapped = updatedVehicles.map(v => 
          typeof v === 'string' ? { name: v, km_cost: 0.50 } : v
        )
        setVehiclesData(mapped)
        setVehicleOptions([
          { id: 'Nessuno', label: 'Nessun Mezzo' },
          ...mapped.map(v => ({ id: v.name, label: v.name }))
        ])
      }

      handleChange('vehicle', trimmed)
    } catch (err) {
      console.error("Errore nel salvataggio del nuovo mezzo:", err)
      alert("Impossibile salvare il nuovo mezzo: " + err)
    }
  }

  const handleAddNewPhase = async (newPhaseName) => {
    const trimmed = newPhaseName.trim()
    if (!trimmed) return

    try {
      const currentSettings = await invoke('get_global_settings')
      const phases = currentSettings.phases_labor || []

      if (!phases.includes(trimmed)) {
        const updatedPhases = [...phases, trimmed]
        const newSettings = {
          ...currentSettings,
          phases_labor: updatedPhases
        }

        await invoke('save_global_settings', { settings: newSettings })
        setPhaseOptions(updatedPhases.map(p => ({ id: p, label: p })))
      }

      handleChange('phase', trimmed)
    } catch (err) {
      console.error("Errore nel salvataggio della nuova fase:", err)
      alert("Impossibile salvare la nuova fase: " + err)
    }
  }

  const ccOptions = [
    { id: null, label: 'Nessuno (Costo Generale)' },
    ...costCenters.map(cc => ({ id: cc.id, label: cc.model }))
  ]

  const employeeOptions = employees.map(e => ({ id: e.id, label: e.name, cost: e.default_hourly_cost }))

  const handleSubmit = (e) => {
    e.preventDefault()
    
    if (!labor && selectedEmployeeIds.length > 0) {
      // Creating multiple entries
      const entries = selectedEmployeeIds.map(id => {
        const emp = employees.find(e => e.id === id)
        return {
          ...formData,
          project_id: Number(projectId),
          cost_center_id: formData.cost_center_id ? Number(formData.cost_center_id) : null,
          operator: emp.name,
          hourly_cost: emp.default_hourly_cost,
          hours: parseFloat(formData.hours) || 0,
          markup: parseFloat(formData.markup) || 0,
          travel_cost: parseFloat(formData.travel_cost) || 0.0
        }
      })
      onSave(entries)
    } else {
      // Single entry save (edit or fallback)
      onSave({
        ...formData,
        project_id: Number(formData.project_id || projectId),
        cost_center_id: formData.cost_center_id ? Number(formData.cost_center_id) : null,
        hours: parseFloat(formData.hours) || 0,
        hourly_cost: parseFloat(formData.hourly_cost) || 0,
        markup: parseFloat(formData.markup) || 0,
        travel_cost: parseFloat(formData.travel_cost) || 0.0
      })
    }
  }

  return (
    <DrawerShell isOpen={isOpen} onClose={onClose} title={labor ? "Modifica Ore" : "Registra Ore"}>
      <form onSubmit={handleSubmit} className="space-y-8 p-1">
        
        {/* Operatori e Data */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">
              {labor ? 'Operatore *' : 'Operatori coinvolti *'}
            </label>
            {labor ? (
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-accent transition-colors" size={18} />
                <input 
                  required
                  type="text"
                  value={formData.operator}
                  onChange={(e) => handleChange('operator', e.target.value)}
                onFocus={(e) => setTimeout(() => e.target.select(), 0)}
                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-accent/20 transition-all"
                />
              </div>
            ) : (
              <MultiSelect 
                options={employeeOptions}
                selectedValues={selectedEmployeeIds}
                onChange={setSelectedEmployeeIds}
                placeholder="Scegli persone..."
                icon={Users}
                onAddNew={handleAddNewEmployee}
              />
            )}
          </div>
          <div className="space-y-2">
            <label className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">Data Lavoro</label>
            <DatePicker 
              value={formData.date} 
              onChange={(val) => handleChange('date', val)} 
            />
          </div>
        </div>

        {/* Logistica: Furgone e Tipologia Viaggio */}
        <div className="grid grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">Mezzo Utilizzato</label>
            <VehicleSelector 
              vehicles={vehicleOptions}
              value={formData.vehicle}
              onChange={(val) => handleChange('vehicle', val)}
              onAddNew={handleAddNewVehicle}
            />
          </div>
          <div className="space-y-2">
            <label className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">Tipo Registrazione</label>
            <div 
              onClick={toggleTravel}
              className={`flex items-center justify-between p-4 rounded-2xl cursor-pointer transition-all border-2 ${
                formData.is_travel 
                ? 'bg-amber-50 border-amber-200 text-amber-700' 
                : 'bg-slate-50 border-transparent text-slate-500'
              }`}
            >
              <div className="flex items-center gap-3">
                {formData.is_travel ? <Plane size={18} /> : <Activity size={18} />}
                <span className="text-xs font-black uppercase tracking-widest">
                  {formData.is_travel ? 'Viaggio / Trasferta' : 'Lavoro in Cantiere'}
                </span>
              </div>
              <div className={`w-10 h-5 rounded-full relative transition-colors ${formData.is_travel ? 'bg-amber-500' : 'bg-slate-200'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full transition-all ${formData.is_travel ? 'left-6' : 'left-1'}`} />
              </div>
            </div>
          </div>
        </div>

        {/* Se è selezionato un mezzo (non Nessuno), mostriamo Chilometri e Costo al Km */}
        {formData.vehicle && formData.vehicle !== 'Nessuno' && (
          <div className="grid grid-cols-2 gap-6 p-5 bg-amber-50/20 border border-amber-100 rounded-2xl animate-premium-in">
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-widest text-amber-700 ml-1">Chilometri Percorsi (km)</label>
              <div className="relative group">
                <Truck className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" size={18} />
                <input 
                  type="number"
                  min="0"
                  step="1"
                  value={formData.km || 0}
                  onChange={(e) => handleVehicleCostChange('km', parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-amber-200/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-widest text-amber-700 ml-1">Costo Chilometrico (€/km)</label>
              <div className="relative group">
                <Euro className="absolute left-4 top-1/2 -translate-y-1/2 text-amber-500" size={18} />
                <input 
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.km_cost || 0}
                  onChange={(e) => handleVehicleCostChange('km_cost', parseFloat(e.target.value) || 0)}
                  className="w-full bg-white border border-amber-200/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-amber-500/20 focus:border-amber-400 transition-all"
                />
              </div>
            </div>
          </div>
        )}

        {/* Descrizione Lavoro */}
        <div className="space-y-2">
          <label className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">Note Attività</label>
          <div className="relative group">
            <FileText className="absolute left-4 top-4 text-slate-400 group-focus-within:text-accent transition-colors" size={18} />
            <textarea 
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              placeholder="Descrizione dell'intervento o dettagli trasferta..."
              rows={2}
              className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-accent/20 transition-all resize-none"
            />
          </div>
        </div>

        {/* Analitica: Centro di Costo e Ambito */}
        <div className="grid grid-cols-2 gap-6">
          {!defaultCostCenterId ? (
            <>
              <div className="space-y-2">
                <label className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">Centro di Costo</label>
                <Select 
                  options={ccOptions}
                  value={formData.cost_center_id}
                  onChange={(val) => handleChange('cost_center_id', val)}
                  icon={Target}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">Ambito / Fase</label>
                <PhaseSelector 
                  phases={phaseOptions}
                  value={formData.phase}
                  onChange={(val) => handleChange('phase', val)}
                  onAddNew={handleAddNewPhase}
                />
              </div>
            </>
          ) : (
            <div className="col-span-2 space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">Ambito / Fase</label>
              <PhaseSelector 
                phases={phaseOptions}
                value={formData.phase}
                onChange={(val) => handleChange('phase', val)}
                onAddNew={handleAddNewPhase}
              />
            </div>
          )}
        </div>

        {/* Quantità e Costi */}
        <div className={`grid gap-6 ${labor ? 'grid-cols-3' : 'grid-cols-2'}`}>
          <div className="space-y-2">
            <label className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">Ore (per pers.)</label>
            <div className="relative group">
              <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-accent transition-colors" size={18} />
              <input 
                required
                type="number"
                step="0.25"
                value={formData.hours}
                onChange={(e) => handleChange('hours', e.target.value)}
                onFocus={(e) => setTimeout(() => e.target.select(), 0)}
                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-accent/20 transition-all"
              />
            </div>
          </div>
          {labor && (
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">Costo Orario (€)</label>
              <div className="relative group">
                <Euro className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-accent transition-colors" size={18} />
                <input 
                  required
                  type="number"
                  step="0.01"
                  value={formData.hourly_cost}
                  onChange={(e) => handleChange('hourly_cost', e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-accent/20 transition-all"
                />
              </div>
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">Ricarico (%)</label>
            <div className="relative group">
              <Activity className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-accent transition-colors" size={18} />
              <input 
                required
                type="number"
                step="1"
                value={formData.markup * 100}
                onChange={(e) => handleChange('markup', parseFloat(e.target.value) / 100)}
                onFocus={(e) => setTimeout(() => e.target.select(), 0)}
                className="w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-accent/20 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Riepilogo Economico */}
        {(() => {
          let laborCost = 0;
          if (labor) {
            laborCost = formData.hours * formData.hourly_cost;
          } else {
            if (selectedEmployeeIds.length > 0) {
              selectedEmployeeIds.forEach(id => {
                const emp = employees.find(e => e.id === id);
                const rate = emp ? emp.default_hourly_cost : formData.hourly_cost;
                laborCost += formData.hours * rate;
              });
            } else {
              laborCost = formData.hours * formData.hourly_cost;
            }
          }
          const travelCost = formData.travel_cost || 0.0;
          const totalCost = laborCost + travelCost;
          const totalSale = totalCost * (1 + formData.markup);
          const isVehicleActive = formData.vehicle && formData.vehicle !== 'Nessuno';
          
          return (
            <div className={`p-6 rounded-[2rem] border flex justify-between items-center transition-colors ${
              (formData.is_travel || isVehicleActive) ? 'bg-amber-500 text-white border-amber-400' : 'bg-accent text-white border-accent'
            }`}>
              <div>
                <p className="text-[0.6rem] font-black uppercase tracking-widest opacity-70">
                  Totale Vendita {(formData.is_travel || isVehicleActive) ? 'Trasferta' : 'Lavoro'} {!labor && selectedEmployeeIds.length > 1 ? `(${selectedEmployeeIds.length} pers.)` : ''}
                </p>
                <p className="text-2xl font-black">
                  € {totalSale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </p>
                {!labor && selectedEmployeeIds.length > 1 && (
                  <p className="text-[0.55rem] font-bold opacity-80 mt-1">
                    Tariffe orarie: {selectedEmployeeIds.map(id => {
                      const emp = employees.find(e => e.id === id);
                      return emp ? `${emp.name} (${emp.default_hourly_cost}€/h)` : '';
                    }).filter(Boolean).join(', ')}
                  </p>
                )}
                {isVehicleActive && (
                  <p className="text-[0.55rem] font-bold opacity-80 mt-1">
                    (Mezzo: {formData.vehicle} | {formData.km || 0} km × {formData.km_cost || 0.50} €/km = € {travelCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })})
                  </p>
                )}
                {!isVehicleActive && formData.is_travel && (
                  <p className="text-[0.55rem] font-bold opacity-80 mt-1">
                    (Trasferta fissa commessa: {project?.distance || 0} km × {project?.km_cost || 0.50} €/km = € {travelCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })})
                  </p>
                )}
              </div>
              <div className="text-right">
                <p className="text-[0.6rem] font-black uppercase tracking-widest opacity-60">Costo Aziendale Tot.</p>
                <p className="text-lg font-black opacity-90">
                  € {totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                </p>
              </div>
            </div>
          )
        })()}

        <div className="pt-6 border-t border-slate-100 flex gap-4">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
          >
            Annulla
          </button>
          <button 
            type="submit"
            disabled={isSaveDisabled}
            className={`flex-[2] py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest shadow-xl transition-all ${
              isSaveDisabled
              ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
              : formData.is_travel 
                ? 'bg-amber-500 text-white hover:bg-amber-600 shadow-amber-200' 
                : 'bg-accent text-white hover:bg-accent/90 shadow-accent/20'
            }`}
          >
            {labor ? 'Salva Modifiche' : `Registra Ore ${selectedEmployeeIds.length > 1 ? `(${selectedEmployeeIds.length})` : ''}`}
          </button>
        </div>
      </form>
    </DrawerShell>
  )
}

export default EditLaborDrawer
