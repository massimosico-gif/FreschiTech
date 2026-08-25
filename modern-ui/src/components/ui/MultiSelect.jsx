import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'

const MultiSelect = ({ options, selectedValues, onChange, placeholder, icon: Icon, onAddNew, compact = false }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const toggleOption = (id) => {
    const isSelected = selectedValues.includes(id)
    if (isSelected) {
      onChange(selectedValues.filter(val => val !== id))
    } else {
      onChange([...selectedValues, id])
    }
  }

  const selectedLabels = options
    .filter(opt => selectedValues.includes(opt.id))
    .map(opt => opt.label)

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="relative" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={compact 
          ? `w-full bg-white border border-slate-200 rounded-xl py-2 pl-8 pr-4 text-xs font-bold text-slate-700 cursor-pointer flex items-center justify-between transition-all hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] relative min-h-[36px] ${
              isOpen ? 'ring-4 ring-accent/10 border-accent/50 bg-white' : ''
            }`
          : `w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 cursor-pointer flex items-center justify-between transition-all shadow-sm ${
              isOpen ? 'ring-2 ring-accent/20 bg-white border-white' : ''
            }`
        }
      >
        {Icon && <Icon className={`absolute text-slate-400 ${compact ? 'left-3' : 'left-5'}`} size={compact ? 13 : 18} />}
        
        <div className="flex flex-wrap gap-1.5 items-center overflow-hidden">
          {selectedValues.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
               {selectedLabels.map(label => (
                 <span key={label} className={`bg-accent/10 text-accent px-2 py-0.5 rounded-lg text-[0.72rem] font-black uppercase tracking-tight`}>
                   {label}
                 </span>
               ))}
            </div>
          ) : (
            <span className="text-slate-400">{placeholder || 'Seleziona...'}</span>
          )}
        </div>
        
        <ChevronDown size={compact ? 13 : 18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className={`absolute top-full left-0 right-0 bg-white/90 backdrop-blur-2xl border border-white/50 shadow-2xl z-[100] overflow-hidden animate-premium-in p-2 ${
          compact ? 'rounded-2xl mt-2' : 'rounded-[2.5rem] mt-3'
        }`}>
          <div className="relative p-2" onClick={(e) => e.stopPropagation()}>
            <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${compact ? 'left-5' : 'left-6'}`} size={compact ? 12 : 14} />
            <input
              autoFocus
              type="text"
              placeholder="Cerca o aggiungi operatore..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className={`w-full bg-slate-50 border-none text-slate-700 font-bold focus:ring-0 ${
                compact ? 'rounded-xl py-1.5 pl-8 pr-3 text-[0.75rem]' : 'rounded-2xl py-3 pl-10 pr-4 text-xs'
              }`}
            />
          </div>

          <div className="max-h-60 overflow-y-auto no-scrollbar py-2">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => {
                const isSelected = selectedValues.includes(option.id)
                return (
                  <div 
                    key={option.id}
                    onClick={() => toggleOption(option.id)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-colors ${
                      isSelected ? 'bg-accent/5 text-accent' : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span className="text-xs font-black uppercase tracking-widest">{option.label}</span>
                    {isSelected && <Check size={14} className="text-accent" />}
                  </div>
                )
              })
            ) : (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-3">
                <p className="text-[0.75rem] font-black uppercase tracking-widest text-slate-400">Nessun operatore trovato</p>
                {onAddNew && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddNew(search)
                      setIsOpen(false)
                      setSearch('')
                    }}
                    className="px-4 py-2.5 bg-accent text-white rounded-xl text-[0.72rem] font-black uppercase tracking-widest hover:bg-accent/90 transition-all shadow-md shadow-accent/20 cursor-pointer"
                  >
                    {search ? `+ Aggiungi "${search}"` : '+ Aggiungi Nuovo Operatore'}
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

export default MultiSelect
