import React, { useState, useEffect, useRef } from 'react'
import { ChevronDown, Check, Search } from 'lucide-react'

const Select = ({ options, value, onChange, placeholder, icon: Icon, searchable = false }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
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

  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('')
    }
  }, [isOpen])

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

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
        <div className="absolute top-full left-0 right-0 mt-3 bg-white/95 backdrop-blur-2xl border border-white/50 rounded-[2rem] shadow-2xl z-[400] overflow-hidden animate-premium-in p-2 flex flex-col max-h-80">
          {searchable && (
            <div className="p-2 border-b border-slate-100/50 sticky top-0 bg-white/95 z-10 flex items-center gap-2">
              <Search size={14} className="text-slate-400" />
              <input
                type="text"
                placeholder="Cerca..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 px-3 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all placeholder-slate-400"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
          <div className="py-2 overflow-y-auto flex-1 max-h-60">
            {filteredOptions.length > 0 ? (
              filteredOptions.map(option => (
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
              ))
            ) : (
              <div className="p-4 text-xs font-bold text-slate-400 text-center uppercase tracking-widest">
                Nessun risultato
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default Select
