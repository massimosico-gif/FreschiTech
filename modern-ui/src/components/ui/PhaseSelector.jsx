import React, { useState, useEffect, useRef } from 'react'
import { Check, ChevronDown, Search, Layers } from 'lucide-react'

const PhaseSelector = ({ phases, value, onChange, onAddNew, placeholder = "Seleziona fase...", compact = false }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const containerRef = useRef(null)
  const triggerRef = useRef(null)

  const selectedPhase = phases.find(p => p.id === value)
  const filteredPhases = phases.filter(p =>
    p.label.toLowerCase().includes(search.toLowerCase())
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

  // Ogni ricerca riparte dalla prima voce: altrimenti l'evidenziazione
  // resterebbe su un indice che non esiste piu' nell'elenco filtrato.
  useEffect(() => { setHighlighted(0) }, [search])

  const pick = (phaseId) => {
    onChange(phaseId)
    setIsOpen(false)
    setSearch('')
    triggerRef.current?.focus()
  }

  /**
   * Tastiera della tendina.
   *
   * Ferma la risalita degli eventi: il box di inserimento che contiene questo
   * selettore usa Invio per salvare la riga, e qui Invio significa invece
   * "scegli la fase evidenziata".
   */
  const handleSearchKeyDown = (e) => {
    e.stopPropagation()

    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(prev => (prev + 1) % Math.max(filteredPhases.length, 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(prev => (prev - 1 + filteredPhases.length) % Math.max(filteredPhases.length, 1))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      const phase = filteredPhases[highlighted]
      if (phase) {
        pick(phase.id)
      } else if (onAddNew && search.trim()) {
        // Nessuna corrispondenza ma qualcosa di scritto: Invio crea la fase.
        onAddNew(search.trim())
        setIsOpen(false)
        setSearch('')
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      setIsOpen(false)
      setSearch('')
      triggerRef.current?.focus()
    }
  }

  /** Freccia giu' sul pulsante chiuso apre la tendina, come in una select. */
  const handleTriggerKeyDown = (e) => {
    if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault()
      setIsOpen(true)
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={handleTriggerKeyDown}
        className={compact
          ? `w-full bg-white border border-slate-200 rounded-xl py-2 pl-8 pr-4 text-xs font-bold text-slate-700 flex items-center justify-between transition-all relative hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] ${
              isOpen ? 'ring-4 ring-accent/10 border-accent/50 bg-white' : ''
            }`
          : `w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 flex items-center justify-between transition-all shadow-sm hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] ${
              isOpen ? 'ring-4 ring-accent/10 border-accent/50 bg-white' : ''
            }`
        }
      >
        <Layers className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${compact ? 'left-3' : 'left-5'}`} size={compact ? 13 : 18} />
        <span className={selectedPhase ? 'text-slate-700' : 'text-slate-400'}>
          {selectedPhase ? selectedPhase.label : placeholder}
        </span>
        <ChevronDown className={`transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} size={compact ? 13 : 18} />
      </button>

      {isOpen && (
        <div className={`absolute top-full left-0 right-0 mt-2 bg-white/95 backdrop-blur-2xl border border-white/60 shadow-2xl z-[400] overflow-hidden animate-premium-in p-2 ${
          compact ? 'rounded-2xl max-w-[280px]' : 'rounded-[2.5rem]'
        }`}>
          <div className="relative p-2">
            <Search className={`absolute top-1/2 -translate-y-1/2 text-slate-400 ${compact ? 'left-5' : 'left-6'}`} size={compact ? 12 : 14} />
            <input
              autoFocus
              type="text"
              placeholder="Cerca o crea fase..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className={`w-full bg-slate-50 border-none text-slate-700 font-bold focus:ring-0 ${
                compact ? 'rounded-xl py-1.5 pl-8 pr-3 text-[0.72rem]' : 'rounded-2xl py-3 pl-10 pr-4 text-xs'
              }`}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          
          <div className="max-h-60 overflow-y-auto no-scrollbar py-1">
            {filteredPhases.length > 0 ? (
              filteredPhases.map((phase, idx) => (
                <button
                  key={phase.id}
                  type="button"
                  onClick={() => pick(phase.id)}
                  onMouseEnter={() => setHighlighted(idx)}
                  className={`w-full flex items-center justify-between transition-all group ${
                    compact ? 'p-2 px-3 rounded-xl' : 'p-4 rounded-2xl'
                  } ${
                    value === phase.id
                      ? 'bg-accent/5 text-accent'
                      : idx === highlighted ? 'bg-slate-100 text-slate-700' : 'text-slate-600'
                  }`}
                >
                  <span className="text-xs font-black uppercase tracking-widest">{phase.label}</span>
                  {value === phase.id && <Check size={14} />}
                </button>
              ))
            ) : (
              <div className="p-4 text-center text-slate-400 flex flex-col items-center gap-2">
                <p className="text-[0.75rem] font-black uppercase tracking-widest text-slate-400">Nessuna fase trovata</p>
                {onAddNew && (
                  <button
                    type="button"
                    onClick={() => {
                      onAddNew(search)
                      setIsOpen(false)
                    }}
                    className="px-3 py-1.5 bg-accent text-white rounded-xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-accent/90 transition-all shadow-md shadow-accent/20 cursor-pointer"
                  >
                    {search ? `+ "${search}"` : '+ Aggiungi Nuova Fase'}
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

export default PhaseSelector
