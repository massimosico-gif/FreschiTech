import React, { useState, useMemo, useEffect } from 'react'
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
  Edit3,
  Trash2,
  Activity,
  Truck,
  Plane
} from 'lucide-react'
import Select from '../ui/Select'

const LaborTab = ({ labor, costCenters, onAdd, onEdit, onDelete }) => {
  // Sorting
  const [sort, setSort] = useState({ field: 'date', direction: 'desc' })

  // Filters
  const initialFilters = {
    search: '',
    phase: 'all',
    cc: 'all'
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
    let result = labor.filter(l => {
      const matchesSearch = !filters.search || 
        l.operator.toLowerCase().includes(filters.search.toLowerCase()) ||
        (l.description && l.description.toLowerCase().includes(filters.search.toLowerCase())) ||
        (l.vehicle && l.vehicle.toLowerCase().includes(filters.search.toLowerCase()));
      
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

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Registro Manodopera</h2>
          <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {filteredData.length} registrazioni {filteredData.length !== labor.length ? '(filtrate)' : ''}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={onAdd}
            className="bg-accent text-white px-8 py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-accent/90 transition-all shadow-xl shadow-accent/20 flex items-center gap-2"
          >
            <Plus size={18} /> Registra Ore
          </button>
        </div>
      </div>

      {/* Toolbar Filtri Manodopera */}
      <div className="relative z-20 flex flex-col lg:flex-row gap-6 items-end bg-white/50 backdrop-blur-md p-6 rounded-[2rem] border border-white/50 shadow-sm">
        <div className="flex-1 w-full space-y-2">
          <label className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 ml-1">Cerca Operatore / Attività / Mezzo</label>
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-accent transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Nome operatore, mezzo o descrizione..."
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
                <th onClick={() => handleSort('operator')} className="px-8 py-6 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 cursor-pointer group select-none">
                  <div className="flex items-center gap-2">Operatore <SortIcon field="operator" /></div>
                </th>
                <th onClick={() => handleSort('description')} className="px-8 py-6 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 cursor-pointer group select-none">
                  <div className="flex items-center gap-2">Descrizione <SortIcon field="description" /></div>
                </th>
                <th className="px-8 py-6 text-[0.6rem] font-black uppercase tracking-widest text-slate-400">Logistica</th>
                <th onClick={() => handleSort('cost_center')} className="px-8 py-6 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 cursor-pointer group select-none">
                  <div className="flex items-center gap-2">Centro <SortIcon field="cost_center" /></div>
                </th>
                <th onClick={() => handleSort('phase')} className="px-8 py-6 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 cursor-pointer group select-none">
                  <div className="flex items-center gap-2">Ambito <SortIcon field="phase" /></div>
                </th>
                <th onClick={() => handleSort('date')} className="px-8 py-6 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 cursor-pointer group select-none">
                  <div className="flex items-center gap-2">Data <SortIcon field="date" /></div>
                </th>
                <th onClick={() => handleSort('hours')} className="px-8 py-6 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 text-right cursor-pointer group select-none">
                  <div className="flex items-center justify-end gap-2">Ore <SortIcon field="hours" /></div>
                </th>
                <th onClick={() => handleSort('total')} className="px-8 py-6 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 text-right cursor-pointer group select-none">
                  <div className="flex items-center justify-end gap-2">Tot. Vendita <SortIcon field="total" /></div>
                </th>
                <th className="px-8 py-6 text-[0.6rem] font-black uppercase tracking-widest text-slate-400 text-center">Azioni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredData.length > 0 ? filteredData.map(l => (
                <tr key={l.id} className="hover:bg-slate-50/50 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-slate-100 text-slate-400 rounded-lg">
                        <User size={14} />
                      </div>
                      <span className="text-sm font-black text-slate-800">{l.operator}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-slate-600 leading-tight">{l.description || '-'}</span>
                      {l.is_travel && (
                        <div className="flex items-center gap-2 mt-1">
                          <div className="flex items-center gap-1">
                            <Plane size={10} className="text-amber-500" />
                            <span className="text-[0.6rem] font-black text-amber-500 uppercase tracking-widest">Trasferta / Viaggio</span>
                          </div>
                          {l.travel_cost > 0 && (
                            <span className="text-[0.55rem] font-bold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-lg">
                              Veicolo: € {l.travel_cost.toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <Truck size={14} className="text-slate-300" />
                      <span className="text-xs font-bold text-slate-500">{l.vehicle || 'Nessuno'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-lg ${l.cost_center_id ? 'bg-amber-50 text-amber-500' : 'bg-slate-100 text-slate-300'}`}>
                        <Target size={14} />
                      </div>
                      <span className={`text-[0.65rem] font-black uppercase tracking-tight ${l.cost_center_name ? 'text-slate-800' : 'text-slate-400'}`}>
                        {l.cost_center_name || 'Generale'}
                      </span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-100 text-slate-400">
                        <Layers size={14} />
                      </div>
                      <span className="text-[0.65rem] font-black text-slate-800 uppercase tracking-tight">
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
                    <div className="flex items-center justify-end gap-1.5">
                      <Clock size={12} className="text-slate-400" />
                      <span className="text-sm font-bold text-slate-800">{l.hours.toLocaleString('it-IT', { minimumFractionDigits: 1 })} h</span>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="inline-block text-right">
                      <p className="text-sm font-black text-slate-800">
                        € {(((l.hours * l.hourly_cost) + (l.travel_cost || 0.0)) * (1 + l.markup)).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
                      </p>
                      <p className="text-[0.55rem] font-black text-emerald-500 uppercase tracking-widest">
                        Ric. {(l.markup * 100).toFixed(0)}%
                      </p>
                    </div>
                  </td>
                  <td className="px-8 py-6 text-center">
                    <div className="flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => onEdit(l)}
                        className="p-2 text-slate-400 hover:text-accent hover:bg-accent/5 rounded-lg transition-all"
                      >
                        <Edit3 size={16} />
                      </button>
                      <button 
                        onClick={() => onDelete(l.id)}
                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr>
                  <td colSpan="10" className="px-8 py-20 text-center">
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
    </div>
  )
}

export default LaborTab
