import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, X, Check } from 'lucide-react'

const MultiSelect = ({ options, selectedValues, onChange, placeholder, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false)
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

  return (
    <div className="relative" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 cursor-pointer flex items-center justify-between transition-all ${
          isOpen ? 'ring-2 ring-accent/20' : ''
        }`}
      >
        {Icon && <Icon className="absolute left-4 text-slate-400" size={18} />}
        
        <div className="flex flex-wrap gap-1 items-center overflow-hidden">
          {selectedValues.length > 0 ? (
            <div className="flex flex-wrap gap-1">
               {selectedLabels.map(label => (
                 <span key={label} className="bg-accent/10 text-accent px-2 py-0.5 rounded-lg text-[0.65rem] font-black uppercase tracking-tight">
                   {label}
                 </span>
               ))}
            </div>
          ) : (
            <span className="text-slate-400">{placeholder || 'Seleziona...'}</span>
          )}
        </div>
        
        <ChevronDown size={18} className={`text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] max-h-64 overflow-y-auto animate-premium-in">
          <div className="p-2 space-y-1">
            {options.map(option => {
              const isSelected = selectedValues.includes(option.id)
              return (
                <div 
                  key={option.id}
                  onClick={() => toggleOption(option.id)}
                  className={`flex items-center justify-between px-4 py-3 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? 'bg-accent/5 text-accent' : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="text-sm font-bold">{option.label}</span>
                  {isSelected && <Check size={16} className="text-accent" />}
                </div>
              )
            })}
            {options.length === 0 && (
              <div className="p-4 text-center text-slate-400 text-xs font-bold uppercase tracking-widest">
                Nessuna opzione disponibile
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default MultiSelect
