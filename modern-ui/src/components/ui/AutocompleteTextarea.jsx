import React, { useState, useRef, useEffect } from 'react'
import { Tag, Hash } from 'lucide-react'

const AutocompleteTextarea = ({ value, onChange, name, placeholder, rows = 6, tags = [] }) => {
  const [suggestions, setSuggestions] = useState([])
  const [showPopup, setShowPopup] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [searchQuery, setSearchQuery] = useState('')
  const textareaRef = useRef(null)

  const handleTextChange = (e) => {
    const { value: newValue, selectionStart } = e.target
    onChange(e)

    // Logica Autocomplete
    const lastBracketIndex = newValue.lastIndexOf('[', selectionStart - 1)
    if (lastBracketIndex !== -1) {
      const textAfterBracket = newValue.substring(lastBracketIndex + 1, selectionStart)
      // Se c'è uno spazio o un a capo tra [ e il cursore, chiudiamo
      if (textAfterBracket.includes(' ') || textAfterBracket.includes('\n')) {
        setShowPopup(false)
        return
      }

      const filtered = tags.filter(t => 
        t.tag.toLowerCase().includes('[' + textAfterBracket.toLowerCase())
      )

      if (filtered.length > 0) {
        setSuggestions(filtered)
        setSearchQuery(textAfterBracket)
        setShowPopup(true)
        setSelectedIndex(0)
      } else {
        setShowPopup(false)
      }
    } else {
      setShowPopup(false)
    }
  }

  const handleKeyDown = (e) => {
    if (showPopup) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % suggestions.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + suggestions.length) % suggestions.length)
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        applySuggestion(suggestions[selectedIndex])
      } else if (e.key === 'Escape') {
        setShowPopup(false)
      }
    }
  }

  const applySuggestion = (suggestion) => {
    const textarea = textareaRef.current
    const start = textarea.selectionStart
    const before = value.substring(0, value.lastIndexOf('[', start - 1))
    const after = value.substring(start)
    
    const newValue = before + suggestion.tag + after
    
    // Simula evento change per il genitore
    const event = {
      target: {
        name,
        value: newValue
      }
    }
    onChange(event)
    setShowPopup(false)
    
    // Rimetti il focus dopo il tag inserito
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = before.length + suggestion.tag.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 10)
  }

  return (
    <div className="relative group">
      <textarea 
        ref={textareaRef}
        name={name}
        value={value}
        onChange={handleTextChange}
        onKeyDown={handleKeyDown}
        onBlur={() => setTimeout(() => setShowPopup(false), 200)}
        rows={rows}
        placeholder={placeholder}
        className="w-full bg-white/50 border border-slate-100 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-[#8bc53f]/20 focus:border-[#8bc53f] transition-all outline-none resize-none"
      />

      {showPopup && (
        <div className="absolute left-4 bottom-full mb-2 w-64 bg-white/90 backdrop-blur-xl border border-white/60 rounded-2xl shadow-2xl p-2 z-50 animate-premium-in overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-100 mb-1">
            <Tag size={12} className="text-[#8bc53f]" />
            <span className="text-[0.72rem] font-black uppercase tracking-widest text-slate-400">Suggerimenti Tag</span>
          </div>
          <div className="max-h-48 overflow-y-auto no-scrollbar">
            {suggestions.map((s, idx) => (
              <button
                key={s.tag}
                onClick={() => applySuggestion(s)}
                onMouseEnter={() => setSelectedIndex(idx)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                  idx === selectedIndex ? 'bg-[#8bc53f] text-white' : 'hover:bg-slate-50 text-slate-600'
                }`}
              >
                <div className="flex flex-col items-start">
                  <code className={`text-[0.75rem] font-black ${idx === selectedIndex ? 'text-white' : 'text-[#8bc53f]'}`}>
                    {s.tag}
                  </code>
                  <span className={`text-[0.7rem] font-bold uppercase tracking-tight ${idx === selectedIndex ? 'text-white/80' : 'text-slate-400'}`}>
                    {s.label}
                  </span>
                </div>
                <Hash size={14} className={idx === selectedIndex ? 'text-white/40' : 'text-slate-100'} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default AutocompleteTextarea
