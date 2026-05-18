import React, { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown, Search, Truck } from 'lucide-react'

const VehicleSelector = ({ vehicles, value, onChange, onAddNew, placeholder = "Seleziona mezzo..." }) => {
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
        className={`w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 flex items-center justify-between transition-all shadow-sm ${
          isOpen ? 'ring-2 ring-accent/20 bg-white border-white' : ''
        }`}
      >
        <Truck className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <span className={selectedVehicle ? 'text-slate-700' : 'text-slate-400'}>
          {selectedVehicle ? selectedVehicle.label : placeholder}
        </span>
        <ChevronDown className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} size={18} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white/90 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] shadow-2xl z-[400] overflow-hidden animate-premium-in p-2">
          <div className="relative p-2" onClick={(e) => e.stopPropagation()}>
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              autoFocus
              type="text"
              placeholder="Cerca o aggiungi mezzo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-slate-700 focus:ring-0"
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto no-scrollbar py-2">
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
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${
                    value === vehicle.id ? 'bg-accent/5 text-accent' : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="text-xs font-black uppercase tracking-widest">{vehicle.label}</span>
                  {value === vehicle.id && <Check size={14} />}
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-3">
                <p className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400">Nessun mezzo trovato</p>
                {onAddNew && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddNew(search)
                      setIsOpen(false)
                    }}
                    className="px-4 py-2.5 bg-accent text-white rounded-xl text-[0.6rem] font-black uppercase tracking-widest hover:bg-accent/90 transition-all shadow-md shadow-accent/20 cursor-pointer"
                  >
                    {search ? `+ Aggiungi "${search}"` : '+ Aggiungi Nuovo Mezzo'}
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
