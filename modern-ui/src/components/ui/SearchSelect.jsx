import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

const SearchSelect = ({ 
  label, 
  icon: Icon, 
  options = [], 
  value, 
  onChange, 
  placeholder = "Seleziona...",
  displayKey = "name",
  valueKey = "id",
  renderOption,
  className = ""
}) => {
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

  const selectedOption = options.find(opt => opt[valueKey] === value)

  return (
    <div className={`space-y-2 relative ${className}`} ref={containerRef}>
      {label && <label className="fh-box-label ml-1">{label}</label>}
      <div className="fh-input-group">
        {Icon && (
          <div className="fh-icon-wrapper">
            <Icon size={18} />
          </div>
        )}
        <button 
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`fh-input ${Icon ? 'fh-input-iconic' : ''} flex items-center justify-between text-left`}
        >
          <span className={!selectedOption ? 'text-slate-400' : 'text-slate-700 font-bold uppercase text-[0.75rem]'}>
            {selectedOption ? selectedOption[displayKey] : placeholder}
          </span>
          <ChevronDown size={16} className={`transition-transform duration-300 ${isOpen ? 'rotate-180 text-[#8bc53f]' : 'text-slate-400'}`} />
        </button>

        {isOpen && (
          <div className="absolute top-[calc(100%+8px)] left-0 right-0 bg-white/95 backdrop-blur-2xl border border-white/40 rounded-2xl shadow-2xl overflow-hidden z-[1000] animate-premium-in py-2 max-h-60 overflow-y-auto no-scrollbar">
            {options.map((option) => (
              <button
                key={option[valueKey]}
                type="button"
                onClick={() => {
                  onChange(option[valueKey])
                  setIsOpen(false)
                }}
                className="w-full px-6 py-4 text-left text-[0.75rem] font-black uppercase tracking-widest hover:bg-[#8bc53f]/10 transition-colors flex items-center justify-between group"
              >
                <span className={value === option[valueKey] ? 'text-[#8bc53f]' : 'text-slate-500 group-hover:text-[#8bc53f]'}>
                  {renderOption ? renderOption(option) : option[displayKey]}
                </span>
                {value === option[valueKey] && <div className="w-1.5 h-1.5 rounded-full bg-[#8bc53f]"></div>}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default SearchSelect
