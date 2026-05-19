import React, { useState, useMemo, useEffect } from 'react'
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
  Edit3,
  Trash2,
  Receipt,
  Truck
} from 'lucide-react'
import Select from '../ui/Select'

const ExpensesTab = ({ expenses, costCenters, onAdd, onEdit, onDelete, defaultCostCenterId = null }) => {
  // Brand Configuration (Centralized Color)
  const brandColor = 'accent'; // Lely Red
  
  // Sorting
  const [sort, setSort] = useState({ field: 'date', direction: 'desc' })

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
      if (res.phases_labor && res.phases_labor.length > 0) {
        setPhaseOptions([
          { id: 'all', label: 'Tutte le Fasi' },
          ...res.phases_labor.map(p => ({ id: p, label: p }))
        ])
      }
    }).catch(console.error)
  }, [])

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
        <div className="flex items-center gap-3">
          <button 
            onClick={onAdd}
            className={`bg-${brandColor} text-white px-8 py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-${brandColor}/90 transition-all shadow-xl shadow-${brandColor}/20 flex items-center gap-2`}
          >
            <Plus size={18} /> Nuova Spesa
          </button>
        </div>
      </div>

      {/* Toolbar Filtri Spese */}
      <div className="relative z-20 flex flex-col lg:flex-row gap-6 items-end bg-white/50 backdrop-blur-md p-6 rounded-[2rem] border border-white/50 shadow-sm">
        <div className="flex-1 w-full space-y-2">
          <label className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 ml-1">Cerca Spesa / Fornitore</label>
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
                <th onClick={() => handleSort('amount')} className="px-8 py-6 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 text-right cursor-pointer group select-none">
                  <div className="flex items-center justify-end gap-2">Importo <SortIcon field="amount" /></div>
                </th>
                <th onClick={() => handleSort('total')} className="px-8 py-6 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 text-right cursor-pointer group select-none">
                  <div className="flex items-center justify-end gap-2">Tot. Vendita <SortIcon field="total" /></div>
                </th>
                <th className="px-8 py-6 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 text-center">Azioni</th>
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
                        <span className={`text-[0.65rem] font-black uppercase tracking-tight ${ex.cost_center_name ? 'text-slate-800' : 'text-slate-400'}`}>
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
                      <span className="text-[0.65rem] font-black text-slate-800 uppercase tracking-tight">
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
                        <p className="text-[0.55rem] font-black text-emerald-500 uppercase tracking-widest">
                          Ric. {(ex.markup * 100).toFixed(0)}%
                        </p>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onEdit(ex)}
                        className={`p-2 text-slate-400 hover:text-${brandColor} hover:bg-${brandColor}/10 rounded-lg transition-all`}
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => onDelete(ex.id)}
                        className={`p-2 text-slate-400 hover:text-${brandColor} hover:bg-${brandColor}/10 rounded-lg transition-all`}
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
                          className={`mt-4 text-${brandColor} font-black uppercase tracking-[0.2em] text-[0.6rem] hover:tracking-[0.3em] transition-all`}
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
    </div>
  )
}

export default ExpensesTab
