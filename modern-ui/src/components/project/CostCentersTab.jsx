import React, { useState, useMemo, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Plus, Target, Search, Layers, RotateCcw, Briefcase, Euro, Activity } from 'lucide-react'
import EntityCard from '../ui/EntityCard'
import Select from '../ui/Select'
import { ConfirmModal } from '@tecno/ui/feedback'

const CostCentersTab = ({ costCenters, onAdd, onEdit, onDelete, onClickCard }) => {
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false)
  const [ccToDeleteId, setCcToDeleteId] = useState(null)

  const initialFilters = {
    search: '',
    category: 'all'
  }
  const [filters, setFilters] = useState(initialFilters)

  const [categoryOptions, setCategoryOptions] = useState([
    { id: 'all', label: 'Tutte le Categorie' }
  ])

  useEffect(() => {
    invoke('get_global_settings').then(res => {
      if (res.categories_cost_center && res.categories_cost_center.length > 0) {
        setCategoryOptions([
          { id: 'all', label: 'Tutte le Categorie' },
          ...res.categories_cost_center.map(c => ({ id: c, label: c }))
        ])
      }
    }).catch(console.error)
  }, [])

  const filteredData = useMemo(() => {
    return costCenters.filter(cc => {
      const matchesSearch = !filters.search || 
        cc.model.toLowerCase().includes(filters.search.toLowerCase()) ||
        (cc.brand && cc.brand.toLowerCase().includes(filters.search.toLowerCase()));
      
      const matchesCategory = filters.category === 'all' || cc.category === filters.category;

      return matchesSearch && matchesCategory;
    })
  }, [costCenters, filters])

  const hasActiveFilters = filters.search !== '' || filters.category !== 'all'

  return (
    <div className="space-y-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Centri di Costo</h2>
          <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest mt-1">
            {filteredData.length} entità {filteredData.length !== costCenters.length ? '(filtrate)' : ''}
          </p>
        </div>
        <button 
          onClick={onAdd}
          className="bg-accent text-white px-8 py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-accent/90 transition-all shadow-xl shadow-accent/20 flex items-center gap-2"
        >
          <Plus size={18} /> Nuovo Centro
        </button>
      </div>

      {/* Toolbar Filtri CC */}
      <div className="relative z-20 flex flex-col lg:flex-row gap-6 items-end bg-white/50 backdrop-blur-md p-6 rounded-[2rem] border border-white/50 shadow-sm">
        <div className="flex-1 w-full space-y-2">
          <label className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 ml-1">Cerca Robot / Area</label>
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-accent transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Modello, marca o nome..."
              value={filters.search}
              onChange={(e) => setFilters(p => ({...p, search: e.target.value}))}
              className="w-full bg-white/50 border border-white/50 rounded-xl py-4 pl-14 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all"
            />
          </div>
        </div>
        
        <div className="w-full lg:w-64 space-y-2">
          <label className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 ml-1">Filtra Categoria</label>
          <Select 
            options={categoryOptions}
            value={filters.category}
            onChange={(val) => setFilters(p => ({...p, category: val}))}
            icon={Layers}
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

      {filteredData.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
          {filteredData.map(cc => (
            <EntityCard 
              key={cc.id}
              icon={<Target size={24} />}
              title={cc.model}
              subtitle={cc.brand || 'Marca non specificata'}
              subtitleIcon={Briefcase}
              badge={cc.category}
              badgeColor="bg-sky-50 text-sky-500"
              footerItems={[
                { icon: <Euro size={14} />, label: `Prev: € ${(cc.accepted_budget || 0).toLocaleString('it-IT')}` },
                { icon: <Activity size={14} />, label: `Costo: € ${(cc.base_cost || 0).toLocaleString('it-IT')}` }
              ]}
              onEdit={() => onEdit(cc)}
              onDelete={() => {
                setCcToDeleteId(cc.id)
                setIsConfirmDeleteOpen(true)
              }}
              onClick={() => onClickCard && onClickCard(cc.id)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white/40 backdrop-blur-md border border-white/50 rounded-[3rem] p-32 text-center">
          <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 text-slate-200">
            <Target size={48} />
          </div>
          <h3 className="text-xl font-black text-slate-800 tracking-tight">
            {costCenters.length > 0 ? 'Nessun centro corrisponde ai filtri' : 'Nessun Centro di Costo'}
          </h3>
          <p className="text-slate-400 font-bold mt-2 max-w-sm mx-auto">
            {costCenters.length > 0 ? 'Prova a cambiare i parametri di ricerca.' : 'Aggiungi robot o aree di progetto per monitorare i costi in modo dettagliato.'}
          </p>
          {costCenters.length > 0 ? (
             <button 
              onClick={() => setFilters(initialFilters)}
              className="mt-8 text-accent font-black uppercase tracking-widest text-xs hover:tracking-[0.2em] transition-all"
            >
              Resetta Filtri
            </button>
          ) : (
            <button 
              onClick={onAdd}
              className="mt-8 text-accent font-black uppercase tracking-widest text-xs hover:tracking-[0.2em] transition-all"
            >
              + Crea il primo centro
            </button>
          )}
        </div>
      )}

      <ConfirmModal
        isOpen={isConfirmDeleteOpen}
        onClose={() => {
          setIsConfirmDeleteOpen(false)
          setCcToDeleteId(null)
        }}
        onConfirm={async () => {
          if (ccToDeleteId) {
            await onDelete(ccToDeleteId)
          }
          setIsConfirmDeleteOpen(false)
          setCcToDeleteId(null)
        }}
        title="Elimina Centro di Costo"
        message="Sei sicuro di voler eliminare definitivamente questo centro di costo? Tutti i materiali, la manodopera e le spese associate a questo centro perderanno questo riferimento."
        confirmLabel="Elimina"
        cancelLabel="Annulla"
        type="danger"
      />
    </div>
  )
}

export default CostCentersTab
