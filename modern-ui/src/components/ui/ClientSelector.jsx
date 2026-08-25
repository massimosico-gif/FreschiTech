import React, { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown, Search, User } from 'lucide-react'

const ClientSelector = ({ clients, value, onChange, error, onAddNew }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef(null)

  const selectedClient = clients.find(c => c.id.toString() === value.toString())
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase())
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
        className={`w-full bg-white/50 border rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 flex items-center justify-between transition-all shadow-sm ${
          isOpen ? 'ring-2 ring-accent/20 bg-white border-white' : 
          error ? 'border-rose-300' : 'border-white/50'
        }`}
      >
        <User className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${error ? 'text-rose-500' : 'text-slate-400'}`} size={18} />
        <span className={selectedClient ? 'text-slate-700' : 'text-slate-400'}>
          {selectedClient ? selectedClient.name : 'Seleziona un cliente...'}
        </span>
        <ChevronDown className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} size={18} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-3 bg-white/90 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] shadow-2xl z-[400] overflow-hidden animate-premium-in p-2">
          <div className="relative p-2">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
            <input
              autoFocus
              type="text"
              placeholder="Cerca cliente..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border-none rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-slate-700 focus:ring-0"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto no-scrollbar py-2">
            {filteredClients.length > 0 ? (
              filteredClients.map(client => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => {
                    onChange(client.id.toString())
                    setIsOpen(false)
                    setSearch('')
                  }}
                  className={`w-full flex items-center justify-between p-4 rounded-2xl transition-all group ${
                    value.toString() === client.id.toString() ? 'bg-accent/5 text-accent' : 'hover:bg-slate-50 text-slate-600'
                  }`}
                >
                  <span className="text-xs font-black uppercase tracking-widest">{client.name}</span>
                  {value.toString() === client.id.toString() && <Check size={14} />}
                </button>
              ))
            ) : (
              <div className="p-8 text-center text-slate-400 flex flex-col items-center gap-3">
                <p className="text-[0.75rem] font-black uppercase tracking-widest text-slate-400">Nessun cliente trovato</p>
                {onAddNew && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddNew(search)
                      setIsOpen(false)
                    }}
                    className="px-4 py-2.5 bg-accent text-white rounded-xl text-[0.72rem] font-black uppercase tracking-widest hover:bg-accent/90 transition-all shadow-md shadow-accent/20 cursor-pointer"
                  >
                    {search ? `+ Aggiungi "${search}"` : '+ Aggiungi Nuovo Cliente'}
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

export default ClientSelector
