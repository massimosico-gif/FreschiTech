import React, { useState, useMemo, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { 
  Plus, 
  Search, 
  Layers, 
  Target, 
  RotateCcw, 
  Calendar as CalendarIcon,
  Euro,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Trash2,
  Receipt,
  Truck,
  Users,
  FileText,
  Activity,
  X
} from 'lucide-react'
import Select from '../ui/Select'
import MultiSelect from '../ui/MultiSelect'
import DatePicker from '../ui/DatePicker'
import PhaseSelector from '../ui/PhaseSelector'
import { ConfirmModal } from '@tecno/ui/feedback'
import Kbd from '../ui/Kbd'

const ExpensesTab = ({ expenses, costCenters, onDelete, defaultCostCenterId = null, projectId = null, onSave = null }) => {
  // Brand Configuration (Centralized Color)
  const brandColor = 'accent'; // Lely Red
  
  // Sorting
  const [sort, setSort] = useState({ field: 'date', direction: 'desc' })

  // Delete confirmation state
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [expenseToDeleteId, setExpenseToDeleteId] = useState(null)

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
  const [inlinePhaseOptions, setInlinePhaseOptions] = useState([{ id: 'Generale', label: 'Generale' }])
  const [employees, setEmployees] = useState([])
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([])

  const initialExpenseData = useMemo(() => ({
    project_id: projectId ? Number(projectId) : null,
    cost_center_id: defaultCostCenterId ? parseInt(defaultCostCenterId) : null,
    phase: 'Generale',
    date: new Date().toISOString().split('T')[0],
    description: '',
    supplier: '',
    amount: 0,
    markup: 0.00
  }), [projectId, defaultCostCenterId])

  const [newExpenseData, setNewExpenseData] = useState(initialExpenseData)

  // Primo campo del box: il fuoco ci torna dopo ogni salvataggio.
  const boxFirstFieldRef = useRef(null)
  const [isBoxOpen, setIsBoxOpen] = useState(() => {
    const val = localStorage.getItem('expenses_box_open')
    return val !== 'false'
  })

  useEffect(() => {
    localStorage.setItem('expenses_box_open', isBoxOpen)
  }, [isBoxOpen])

  // Sincronizza i valori del nuovo box di inserimento in base ai filtri correnti o al defaultCostCenterId
  useEffect(() => {
    setNewExpenseData(prev => ({
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
        setEmployees(empData || [])
      } catch (err) {
        console.error("Errore caricamento dipendenti:", err)
      }

      try {
        const res = await invoke('get_global_settings')
        if (res.phases_labor && res.phases_labor.length > 0) {
          setPhaseOptions([
            { id: 'all', label: 'Tutte le Fasi' },
            ...res.phases_labor.map(p => ({ id: p, label: p }))
          ])
          setInlinePhaseOptions(res.phases_labor.map(p => ({ id: p, label: p })))
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
      setEmployees(updatedEmployees || [])
      const created = updatedEmployees.find(e => e.name.toLowerCase() === trimmed.toLowerCase())
      if (created) {
        setSelectedEmployeeIds(prev => [...prev, created.id])
      }
    } catch (err) {
      console.error("Errore nel salvataggio del nuovo operatore:", err)
      alert("Impossibile salvare il nuovo operatore: " + err)
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
        setPhaseOptions([
          { id: 'all', label: 'Tutte le Fasi' },
          ...updatedPhases.map(p => ({ id: p, label: p }))
        ])
        setInlinePhaseOptions(updatedPhases.map(p => ({ id: p, label: p })))
      }

      setNewExpenseData(prev => ({ ...prev, phase: trimmed }))
    } catch (err) {
      console.error("Errore nel salvataggio della nuova fase:", err)
      alert("Impossibile salvare la nuova fase: " + err)
    }
  }

  const handleAddNewExpenseFromBox = async () => {
    if (isAddDisabled) return

    let finalDescription = newExpenseData.description
    if (selectedEmployeeIds.length > 0) {
      const names = selectedEmployeeIds
        .map(id => employees.find(emp => emp.id === id)?.name)
        .filter(Boolean)
        .join(', ')
      finalDescription = `${newExpenseData.description} (${names})`
    }

    const entry = {
      ...newExpenseData,
      project_id: Number(projectId),
      cost_center_id: newExpenseData.cost_center_id ? parseInt(newExpenseData.cost_center_id) : null,
      description: finalDescription,
      amount: parseFloat(newExpenseData.amount) || 0,
      markup: parseFloat(newExpenseData.markup) || 0.00
    }

    try {
      if (onSave) {
        await onSave(entry)
      }
      setSelectedEmployeeIds([])
      setNewExpenseData(prev => ({
        ...prev,
        description: '',
        supplier: '',
        amount: 0,
        markup: 0.00
      }))
      // Centro di costo, fase e data restano: il fuoco torna sulla
      // descrizione, pronto per lo scontrino successivo.
      boxFirstFieldRef.current?.focus()
    } catch (err) {
      console.error(err)
    }
  }

  /** Tastiera del box: Invio salva, Esc svuota i campi variabili. */
  const handleBoxKeyDown = (e) => {
    if (e.defaultPrevented) return

    if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      e.preventDefault()
      if (!isAddDisabled) handleAddNewExpenseFromBox()
      return
    }

    if (e.key === 'Escape') {
      e.preventDefault()
      setNewExpenseData(prev => ({ ...prev, description: '', supplier: '', amount: 0 }))
      boxFirstFieldRef.current?.focus()
    }
  }

  const employeeOptions = useMemo(() => employees.map(e => ({ 
    id: e.id, 
    label: e.name 
  })), [employees])

  const isAddDisabled = !newExpenseData.description.trim() || !newExpenseData.amount || parseFloat(newExpenseData.amount) <= 0

  const ccOptions = useMemo(() => [
    { id: 'all', label: 'Tutti i Centri' },
    { id: 'none', label: 'Solo Generali' },
    ...costCenters.map(cc => ({ id: cc.id, label: cc.model }))
  ], [costCenters])

  const filteredData = useMemo(() => {
    let result = expenses.filter(ex => {
      const matchesSearch = !filters.search || 
        ex.description.toLowerCase().includes(filters.search.toLowerCase()) ||
        (ex.supplier && ex.supplier.toLowerCase().includes(filters.search.toLowerCase()));
      
      const matchesPhase = filters.phase === 'all' || ex.phase === filters.phase;
      
      const matchesCC = filters.cc === 'all' || 
        (filters.cc === 'none' && !ex.cost_center_id) ||
        (ex.cost_center_id === parseInt(filters.cc));

      return matchesSearch && matchesPhase && matchesCC;
    })

    // Sorting logic
    result.sort((a, b) => {
      let valA, valB;
      switch(sort.field) {
        case 'description': valA = a.description.toLowerCase(); valB = b.description.toLowerCase(); break;
        case 'supplier': valA = (a.supplier || '').toLowerCase(); valB = (b.supplier || '').toLowerCase(); break;
        case 'cost_center': valA = a.cost_center_name || ''; valB = b.cost_center_name || ''; break;
        case 'phase': valA = a.phase || ''; valB = b.phase || ''; break;
        case 'date': valA = new Date(a.date); valB = new Date(b.date); break;
        case 'amount': valA = a.amount; valB = b.amount; break;
        case 'total': 
          valA = a.amount * (1 + a.markup); 
          valB = b.amount * (1 + b.markup); 
          break;
        default: valA = a.id; valB = b.id;
      }
      if (valA < valB) return sort.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sort.direction === 'asc' ? 1 : -1;
      return 0;
    })

    return result
  }, [expenses, filters, sort])

  const handleSort = (field) => {
    setSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
  }

  const SortIcon = ({ field }) => {
    if (sort.field !== field) return <ChevronsUpDown size={12} className="opacity-30 group-hover:opacity-100 transition-opacity" />;
    return sort.direction === 'asc' ? <ChevronUp size={12} className={`text-${brandColor}`} /> : <ChevronDown size={12} className={`text-${brandColor}`} />;
  }

  const hasActiveFilters = filters.search !== '' || filters.phase !== 'all' || filters.cc !== 'all'

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Registro Spese</h2>
          <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {filteredData.length} voci registrate {filteredData.length !== expenses.length ? '(filtrate)' : ''}
          </p>
        </div>
        {onSave && (
          <button 
            onClick={() => setIsBoxOpen(p => !p)}
            className="bg-accent text-white px-8 py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-accent/90 transition-all shadow-xl shadow-accent/20 flex items-center gap-2"
          >
            {isBoxOpen ? <X size={18} /> : <Plus size={18} />} 
            {isBoxOpen ? 'Nascondi Aggiunta' : 'Aggiungi Spesa'}
          </button>
        )}
      </div>

      {/* Box Aggiunta Spesa Persistente */}
      {onSave && isBoxOpen && (
        <div onKeyDown={handleBoxKeyDown} className="relative z-30 bg-white/40 backdrop-blur-md p-6 rounded-[2.5rem] border border-white/40 shadow-lg space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-accent/10 rounded-lg text-accent">
                <Plus size={14} className="stroke-[3]" />
              </div>
              <span className="text-[0.75rem] font-black uppercase tracking-widest text-slate-500">Nuova Registrazione Spesa</span>
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
                const amount = parseFloat(newExpenseData.amount) || 0;
                const markup = parseFloat(newExpenseData.markup) || 0;
                const totalSale = amount * (1 + markup);
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
            {/* Operatori coinvolti */}
            <div className="lg:col-span-3 space-y-1.5">
              <label className="text-[0.7rem] font-black uppercase tracking-widest text-slate-400 ml-1">Operatori coinvolti</label>
              <MultiSelect 
                options={employeeOptions}
                selectedValues={selectedEmployeeIds}
                onChange={setSelectedEmployeeIds}
                placeholder="Seleziona squadra..."
                icon={Users}
                onAddNew={handleAddNewEmployee}
                compact={true}
              />
            </div>

            {/* Descrizione / Tipo Spesa * */}
            <div className="lg:col-span-3 space-y-1.5">
              <label className="text-[0.7rem] font-black uppercase tracking-widest text-slate-400 ml-1">Descrizione / Tipo Spesa *</label>
              <input 
                type="text" 
                ref={boxFirstFieldRef}
                placeholder="Es: Pranzo, Hotel, Carburante..."
                value={newExpenseData.description}
                onChange={(e) => setNewExpenseData(p => ({ ...p, description: e.target.value }))}
                onFocus={handleInputSelect}
                onClick={handleInputSelect}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] transition-all"
              />
            </div>

            {/* Fornitore / Nota */}
            <div className="lg:col-span-4 space-y-1.5">
              <label className="text-[0.7rem] font-black uppercase tracking-widest text-slate-400 ml-1">Fornitore / Nota</label>
              <input 
                type="text" 
                placeholder="Nome locale o esercente..."
                value={newExpenseData.supplier}
                onChange={(e) => setNewExpenseData(p => ({ ...p, supplier: e.target.value }))}
                onFocus={handleInputSelect}
                onClick={handleInputSelect}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] transition-all"
              />
            </div>

            {/* Data */}
            <div className="lg:col-span-2 space-y-1.5">
              <label className="text-[0.7rem] font-black uppercase tracking-widest text-slate-400 ml-1">Data Spesa</label>
              <DatePicker 
                compact={true}
                value={newExpenseData.date}
                onChange={(val) => setNewExpenseData(p => ({ ...p, date: val }))}
              />
            </div>
          </div>

          <div className="relative z-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4 items-end pt-2">
            {/* Centro di Costo (se non è predefinito) */}
            {!defaultCostCenterId ? (
              <div className="lg:col-span-4 space-y-1.5">
                <label className="text-[0.7rem] font-black uppercase tracking-widest text-slate-400 ml-1">Centro di Costo</label>
                <select
                  value={newExpenseData.cost_center_id || ''}
                  onChange={(e) => setNewExpenseData(p => ({ ...p, cost_center_id: e.target.value ? parseInt(e.target.value) : null }))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] transition-all"
                >
                  <option value="">Nessuno (Spesa Generale)</option>
                  {costCenters.map(cc => (
                    <option key={cc.id} value={cc.id}>{cc.model}</option>
                  ))}
                </select>
              </div>
            ) : null}

            {/* Ambito (Fase) */}
            <div className={`${!defaultCostCenterId ? 'lg:col-span-4' : 'lg:col-span-6'} space-y-1.5`}>
              <label className="text-[0.7rem] font-black uppercase tracking-widest text-slate-400 ml-1">Ambito / Fase</label>
              <PhaseSelector
                phases={inlinePhaseOptions}
                value={newExpenseData.phase}
                onChange={(val) => setNewExpenseData(p => ({ ...p, phase: val }))}
                onAddNew={handleAddNewPhase}
                placeholder="Seleziona fase..."
                compact={true}
              />
            </div>

            {/* Importo (€) */}
            <div className="lg:col-span-2 space-y-1.5">
              <label className="text-[0.7rem] font-black uppercase tracking-widest text-slate-400 ml-1">Importo *</label>
              <input 
                type="number" 
                step="0.01"
                min="0"
                placeholder="Importo"
                value={newExpenseData.amount}
                onChange={(e) => setNewExpenseData(p => ({ ...p, amount: parseFloat(e.target.value) || 0 }))}
                onFocus={handleInputSelect}
                onClick={handleInputSelect}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-right text-slate-700 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] transition-all"
              />
            </div>

            {/* Ricarico (%) */}
            <div className="lg:col-span-2 space-y-1.5">
              <label className="text-[0.7rem] font-black uppercase tracking-widest text-slate-400 ml-1">Ric. %</label>
              <input 
                type="number"
                step="1"
                placeholder="Ric. %"
                value={Math.round((newExpenseData.markup || 0) * 100)}
                onChange={(e) => setNewExpenseData(p => ({ ...p, markup: (parseFloat(e.target.value) || 0) / 100 }))}
                onFocus={handleInputSelect}
                onClick={handleInputSelect}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-right text-emerald-600 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] transition-all"
              />
            </div>

            {/* Bottone Registra */}
            <div className="lg:col-span-2 flex items-end justify-end w-full">
              <button 
                onClick={handleAddNewExpenseFromBox}
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

      {/* Toolbar Filtri Spese */}
      <div className="relative z-20 flex flex-col lg:flex-row gap-6 items-end bg-white/50 backdrop-blur-md p-6 rounded-[2rem] border border-white/50 shadow-sm">
        <div className="flex-1 w-full space-y-2">
          <label className="text-[0.72rem] font-black uppercase tracking-widest text-slate-400 ml-1">Cerca Spesa / Fornitore</label>
          <div className="relative group">
            <Search className={`absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-${brandColor} transition-colors`} size={18} />
            <input 
              type="text" 
              placeholder="Cosa hai acquistato o da chi..."
              value={filters.search}
              onChange={(e) => setFilters(p => ({...p, search: e.target.value}))}
              className={`w-full bg-white/50 border border-white/50 rounded-xl py-4 pl-14 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-${brandColor}/20 focus:bg-white transition-all`}
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
            ? `opacity-100 text-${brandColor} hover:bg-${brandColor}/10` 
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
                <th onClick={() => handleSort('description')} className="px-8 py-6 text-[0.72rem] font-black uppercase tracking-widest text-slate-400 cursor-pointer group select-none">
                  <div className="flex items-center gap-2">Descrizione <SortIcon field="description" /></div>
                </th>
                <th onClick={() => handleSort('supplier')} className="px-8 py-6 text-[0.72rem] font-black uppercase tracking-widest text-slate-400 cursor-pointer group select-none">
                  <div className="flex items-center gap-2">Fornitore <SortIcon field="supplier" /></div>
                </th>
                {!defaultCostCenterId && (
                  <th onClick={() => handleSort('cost_center')} className="px-8 py-6 text-[0.72rem] font-black uppercase tracking-widest text-slate-400 cursor-pointer group select-none">
                    <div className="flex items-center gap-2">Centro di Costo <SortIcon field="cost_center" /></div>
                  </th>
                )}
                <th onClick={() => handleSort('phase')} className="px-8 py-6 text-[0.72rem] font-black uppercase tracking-widest text-slate-400 cursor-pointer group select-none">
                  <div className="flex items-center gap-2">Ambito <SortIcon field="phase" /></div>
                </th>
                <th onClick={() => handleSort('date')} className="px-8 py-6 text-[0.72rem] font-black uppercase tracking-widest text-slate-400 cursor-pointer group select-none">
                  <div className="flex items-center gap-2">Data <SortIcon field="date" /></div>
                </th>
                <th onClick={() => handleSort('amount')} className="px-8 py-6 text-[0.72rem] font-black uppercase tracking-widest text-slate-400 text-right cursor-pointer group select-none">
                  <div className="flex items-center justify-end gap-2">Importo <SortIcon field="amount" /></div>
                </th>
                <th onClick={() => handleSort('total')} className="px-8 py-6 text-[0.72rem] font-black uppercase tracking-widest text-slate-400 text-right cursor-pointer group select-none">
                  <div className="flex items-center justify-end gap-2">Tot. Vendita <SortIcon field="total" /></div>
                </th>
                <th className="px-8 py-6 text-[0.72rem] font-black uppercase tracking-widest text-slate-400 text-center">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? filteredData.map(ex => (
                <tr key={ex.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className={`p-2 bg-${brandColor}/10 text-${brandColor} rounded-lg`}>
                        <Receipt size={14} />
                      </div>
                      <span className="text-sm font-black text-slate-800">{ex.description}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Truck size={14} className="text-slate-400" />
                      <span className="text-xs font-bold">{ex.supplier || '-'}</span>
                    </div>
                  </td>
                  {!defaultCostCenterId && (
                    <td className="px-8 py-6">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${ex.cost_center_id ? 'bg-amber-50 text-amber-500' : 'bg-slate-100 text-slate-300'}`}>
                          <Target size={14} />
                        </div>
                        <span className={`text-[0.75rem] font-black uppercase tracking-tight ${ex.cost_center_name ? 'text-slate-800' : 'text-slate-400'}`}>
                          {ex.cost_center_name || 'Generale'}
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
                        {ex.phase || 'Generale'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2 text-slate-500">
                      <CalendarIcon size={14} />
                      <span className="text-xs font-bold">{new Date(ex.date).toLocaleDateString('it-IT')}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <span className="text-sm font-bold text-slate-800">€ {ex.amount.toLocaleString('it-IT', { minimumFractionDigits: 2 })}</span>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="inline-block text-right">
                      <p className="text-sm font-black text-slate-800">
                        € {(ex.amount * (1 + ex.markup)).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </p>
                      {ex.markup > 0 && (
                        <p className="text-[0.7rem] font-black text-emerald-500 uppercase tracking-widest">
                          Ric. {(ex.markup * 100).toFixed(0)}%
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">

                      <button 
                        onClick={() => {
                          setExpenseToDeleteId(ex.id)
                          setIsConfirmDeleteOpen(true)
                        }}
                        className={`p-2 text-slate-400 hover:text-${brandColor} hover:bg-${brandColor}/10 rounded-lg transition-all`}
                        title="Elimina Spesa"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan={defaultCostCenterId ? "7" : "8"} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="p-6 bg-slate-50 rounded-3xl text-slate-200">
                        <Receipt size={48} />
                      </div>
                      <div>
                        <h4 className="text-lg font-black text-slate-800 tracking-tight">
                          {expenses.length > 0 ? 'Nessun risultato per i filtri selezionati' : 'Nessuna spesa registrata'}
                        </h4>
                        <p className="text-sm font-bold text-slate-400 mt-1">
                          {expenses.length > 0 ? 'Prova a modificare i criteri di ricerca.' : 'Inizia a registrare vitto, noleggi o altre spese di commessa.'}
                        </p>
                      </div>
                      {hasActiveFilters && (
                        <button 
                          onClick={() => setFilters(initialFilters)}
                          className={`mt-4 text-${brandColor} font-black uppercase tracking-[0.2em] text-[0.72rem] hover:tracking-[0.3em] transition-all`}
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
          setExpenseToDeleteId(null)
        }}
        onConfirm={async () => {
          if (expenseToDeleteId) {
            await onDelete(expenseToDeleteId)
          }
          setIsConfirmDeleteOpen(false)
          setExpenseToDeleteId(null)
        }}
        title="Elimina Spesa"
        message="Sei sicuro di voler eliminare definitivamente questa spesa? L'azione è irreversibile."
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        type="danger"
      />
    </div>
  )
}

export default ExpensesTab
