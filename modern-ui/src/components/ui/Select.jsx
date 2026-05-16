import React, { useState, useEffect, useRef } from 'react'
import { ChevronDown, Check } from 'lucide-react'

const Select = ({ options, value, onChange, placeholder, icon: Icon }) => {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef(null)

  const selectedOption = options.find(opt => opt.id === value)

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
        className={`w-full bg-white/50 border rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 flex items-center justify-between transition-all shadow-sm ${
          isOpen ? 'ring-2 ring-accent/20 bg-white border-white' : 'border-white/50'
        }`}
      >
        {Icon && <Icon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />}
        <span className={selectedOption ? 'text-slate-700' : 'text-slate-400'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} size={18} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white/90 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] shadow-2xl z-[400] overflow-hidden animate-premium-in p-2">
          <div className="py-2">
            {options.map(option => (
              <button
                key={option.id}
                type="button"
                onClick={() => {
                  onChange(option.id)
                  setIsOpen(false)
                }}
                className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${
                  value === option.id ? 'bg-accent/5 text-accent' : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex items-center gap-3">
                  {option.color && (
                    <div className={`w-2 h-2 rounded-full ${option.color}`}></div>
                  )}
                  <span className="text-xs font-black uppercase tracking-widest">{option.label}</span>
                </div>
                {value === option.id && <Check size={14} />}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default Select
