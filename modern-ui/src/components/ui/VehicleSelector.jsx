import React, { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown, Search, Truck } from 'lucide-react'

const VehicleSelector = ({ vehicles, value, onChange, onAddNew, placeholder = "Seleziona mezzo...", compact = false }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)

  const selectedVehicle = vehicles.find(v => v.id === value)
  const filteredVehicles = vehicles.filter(v => 
    v.label.toLowerCase().includes(search.toLowerCase())
  )

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={compact 
          ? `w-full bg-white border border-slate-200 rounded-xl py-2 pl-8 pr-4 text-xs font-bold text-slate-700 flex items-center justify-between transition-all relative hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] ${
              isOpen ? 'ring-4 ring-accent/10 border-accent/50 bg-white' : ''
            }`
          : `w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 flex items-center justify-between transition-all shadow-sm hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] ${
              isOpen ? 'ring-4 ring-accent/10 border-accent/50 bg-white' : ''
            }`
        }
      >
        <Truck className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${compact ? 'left-3' : 'left-5'}`} size={compact ? 13 : 18} />
        <span className={selectedVehicle ? 'text-slate-700' : 'text-slate-400'}>
          {selectedVehicle ? selectedVehicle.label : placeholder}
        </span>
        <ChevronDown className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} size={compact ? 13 : 18} />
      </button>

      {isOpen && (
        <div className={`absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-2xl border border-white/60 shadow-2xl z-[400] overflow-hidden animate-premium-in p-2 ${
          compact ? 'rounded-2xl max-w-[280px]' : 'rounded-[2.5rem]'
        }`}>
          <div className="relative p-2" onClick={(e) => e.stopPropagation()}>
            <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${compact ? 'left-5' : 'left-6'}`} size={compact ? 12 : 14} />
            <input
              autoFocus
              type="text"
              placeholder="Cerca o aggiungi mezzo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full bg-slate-50 border-none text-slate-700 font-bold focus:ring-0 ${
                compact ? 'rounded-xl py-1.5 pl-8 pr-3 text-[0.65rem]' : 'rounded-2xl py-3 pl-10 pr-4 text-xs'
              }`}
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto no-scrollbar py-1">
            {filteredVehicles.length > 0 ? (
              filteredVehicles.map(vehicle => (
                <button
                  key={vehicle.id}
                  type="button"
                  onClick={() => {
                    onChange(vehicle.id)
                    setIsOpen(false)
                    setSearch('')
                  }}
                  className={`w-full flex items-center justify-between transition-all group ${
                    compact ? 'p-2 px-3 rounded-xl' : 'p-4 rounded-2xl'
                  } ${
                    value === vehicle.id ? 'bg-accent/5 text-accent' : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="text-xs font-black uppercase tracking-widest">{vehicle.label}</span>
                  {value === vehicle.id && <Check size={14} />}
                </button>
              ))
            ) : (
              <div className={`p-4 text-center text-slate-400 flex flex-col items-center ${compact ? 'gap-2' : 'gap-3'}`}>
                <p className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400">Nessun mezzo trovato</p>
                {onAddNew && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddNew(search)
                      setIsOpen(false)
                    }}
                    className={`bg-accent text-white rounded-xl font-black uppercase tracking-widest hover:bg-accent/90 transition-all shadow-md shadow-accent/20 cursor-pointer ${
                      compact ? 'px-3 py-1.5 text-[0.55rem]' : 'px-4 py-2.5 text-[0.6rem]'
                    }`}
                  >
                    {search ? `+ "${search}"` : '+ Aggiungi Nuovo'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default VehicleSelector
