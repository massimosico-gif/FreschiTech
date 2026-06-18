import React, { useState, useEffect, useRef } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'

const DatePicker = ({ value, onChange, label, compact = false }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentDate, setCurrentDate] = useState(value ? new Date(value) : new Date())
  const [inputValue, setInputValue] = useState('')
  const [dropdownStyle, setDropdownStyle] = useState({})
  const containerRef = useRef(null)

  // Formatta la data in YYYY-MM-DD senza problemi di timezone
  const formatDate = (date) => {
    const y = date.getFullYear()
    const m = String(date.getMonth() + 1).padStart(2, '0')
    const d = String(date.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }

  const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate()
  const firstDayOfMonth = (year, month) => new Date(year, month, 1).getDay()

  const months = [
    "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
    "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre"
  ]

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  const handleDateSelect = (day) => {
    const selectedDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
    onChange(formatDate(selectedDate))
    setIsOpen(false)
  }

  // Sincronizza lo stato interno dell'input testuale quando il valore esterno cambia
  useEffect(() => {
    if (value) {
      const parts = value.split('-') // ci si aspetta YYYY-MM-DD
      if (parts.length === 3) {
        setInputValue(`${parts[2]}/${parts[1]}/${parts[0]}`)
      } else {
        const d = new Date(value)
        if (!isNaN(d.getTime())) {
          const dd = String(d.getDate()).padStart(2, '0')
          const mm = String(d.getMonth() + 1).padStart(2, '0')
          const yyyy = d.getFullYear()
          setInputValue(`${dd}/${mm}/${yyyy}`)
        } else {
          setInputValue(value)
        }
      }
      
      const d = new Date(value)
      if (!isNaN(d.getTime())) {
        setCurrentDate(d)
      }
    } else {
      setInputValue('')
    }
  }, [value])

  // Click / Focus dell'input: imposta a oggi se vuoto e seleziona tutto il testo
  const handleFocus = (e) => {
    setIsOpen(false)
    if (!value) {
      const todayStr = formatDate(new Date())
      onChange(todayStr)
    }
    const target = e.target
    setTimeout(() => {
      if (target) {
        target.select()
      }
    }, 50)
  }

  const handleInputClick = (e) => {
    setIsOpen(false)
    if (e.target) {
      e.target.select()
    }
  }


  // Modifica manuale del testo
  const handleInputChange = (e) => {
    const text = e.target.value
    setInputValue(text)

    // Regex per validare GG/MM/AAAA o G/M/AAAA
    const match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    if (match) {
      const day = parseInt(match[1], 10)
      const month = parseInt(match[2], 10) - 1
      const year = parseInt(match[3], 10)
      const parsedDate = new Date(year, month, day)

      if (
        !isNaN(parsedDate.getTime()) &&
        parsedDate.getDate() === day &&
        parsedDate.getMonth() === month &&
        parsedDate.getFullYear() === year
      ) {
        onChange(formatDate(parsedDate))
      }
    }
  }

  // Uscita dal campo di testo: ripristina all'ultimo valore valido se errato
  const handleBlur = () => {
    const match = inputValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
    let valid = false
    if (match) {
      const day = parseInt(match[1], 10)
      const month = parseInt(match[2], 10) - 1
      const year = parseInt(match[3], 10)
      const parsedDate = new Date(year, month, day)

      if (
        !isNaN(parsedDate.getTime()) &&
        parsedDate.getDate() === day &&
        parsedDate.getMonth() === month &&
        parsedDate.getFullYear() === year
      ) {
        onChange(formatDate(parsedDate))
        valid = true
      }
    }

    if (!valid) {
      if (value) {
        const parts = value.split('-')
        if (parts.length === 3) {
          setInputValue(`${parts[2]}/${parts[1]}/${parts[0]}`)
        }
      } else {
        setInputValue('')
      }
    }
  }

  useEffect(() => {
    const updatePosition = () => {
      if (isOpen && containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect()
        const viewportWidth = window.innerWidth
        const viewportHeight = window.innerHeight

        const W = 320
        const H = 380

        // Determine left offset relative to parent container
        let targetLeft = 0 // default left-0
        
        // If left-0 would overflow the right edge of viewport:
        if (rect.left + W > viewportWidth) {
          // Try aligning to right-0 of parent container (so left = container width - W)
          targetLeft = rect.width - W
        }

        // Now check if this targetLeft would overflow the viewport boundaries
        const absoluteLeft = rect.left + targetLeft
        if (absoluteLeft < 10) {
          // Too far left, align to viewport left = 10px
          targetLeft = 10 - rect.left
        } else if (absoluteLeft + W > viewportWidth - 10) {
          // Too far right, align to viewport right = viewportWidth - 10px
          targetLeft = (viewportWidth - W - 10) - rect.left
        }

        // Determine top offset relative to parent container
        let targetTop = rect.height + 12 // default top-full with mt-3 (12px)

        // Check if opening downward overflows the bottom of viewport
        if (rect.bottom + H > viewportHeight) {
          // Try opening upward: top = -H - 12
          const spaceAbove = rect.top
          const spaceBelow = viewportHeight - rect.bottom
          if (spaceAbove > spaceBelow) {
            targetTop = -H - 12
          }
        }

        // Now check if this targetTop would overflow the viewport boundaries
        const absoluteTop = rect.top + targetTop
        if (absoluteTop < 10) {
          // Too far up, align to viewport top = 10px
          targetTop = 10 - rect.top
        } else if (absoluteTop + H > viewportHeight - 10) {
          // Too far down, align to viewport bottom = viewportHeight - 10px
          targetTop = (viewportHeight - H - 10) - rect.top
        }

        setDropdownStyle({
          position: 'absolute',
          left: `${targetLeft}px`,
          top: `${targetTop}px`,
          width: `${W}px`
        })
      }
    }

    updatePosition()
    window.addEventListener('resize', updatePosition)
    window.addEventListener('scroll', updatePosition, true)
    return () => {
      window.removeEventListener('resize', updatePosition)
      window.removeEventListener('scroll', updatePosition, true)
    }
  }, [isOpen])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const renderDays = () => {
    const totalDays = daysInMonth(currentDate.getFullYear(), currentDate.getMonth())
    const firstDay = (firstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()) + 6) % 7 // Inizia da Lunedì
    const days = []

    // Spazi vuoti per il mese precedente
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>)
    }

    // Giorni del mese corrente
    for (let day = 1; day <= totalDays; day++) {
      const dayDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), day)
      const isSelected = value === formatDate(dayDate)
      
      days.push(
        <button
          key={day}
          type="button"
          onClick={() => handleDateSelect(day)}
          className={`h-10 w-10 rounded-xl text-[0.7rem] font-black transition-all flex items-center justify-center ${
            isSelected 
            ? 'bg-accent text-white shadow-lg shadow-accent/20' 
            : 'text-slate-600 hover:bg-slate-100 hover:text-accent'
          }`}
        >
          {day}
        </button>
      )
    }
    return days
  }

  return (
    <div className={`relative w-full ${isOpen ? 'z-[100]' : ''}`} ref={containerRef}>
      {label && <label className="fh-box-label ml-1">{label}</label>}
      <div 
        className={
          compact
          ? `w-full bg-white border border-slate-200 rounded-xl flex items-center justify-between transition-all hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] focus-within:ring-4 focus-within:ring-accent/10 focus-within:border-accent/50`
          : `w-full bg-white/50 border border-white/50 rounded-2xl flex items-center justify-between transition-all shadow-sm hover:border-accent/40 hover:shadow-[0_12px_24px_rgba(227,6,19,0.15)] focus-within:ring-4 focus-within:ring-accent/10 focus-within:border-accent/50`
        }
      >
        {/* Pulsante calendario a sinistra */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`text-slate-400 hover:text-accent transition-all flex items-center justify-center shrink-0 ${
            compact ? 'pl-3 pr-2' : 'pl-5 pr-3'
          }`}
          title="Apri calendario"
        >
          <CalendarIcon size={compact ? 13 : 18} />
        </button>

        {/* Input di testo per inserimento manuale */}
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleFocus}
          onClick={handleInputClick}
          onBlur={handleBlur}
          placeholder="GG/MM/AAAA"
          className={`w-full bg-transparent border-none text-slate-700 font-bold focus:ring-0 focus:outline-none placeholder-slate-300 ${
            compact ? 'py-2 pr-4 text-xs' : 'py-4 pr-6 text-sm'
          }`}
        />
      </div>

      {isOpen && (
        <div 
          style={dropdownStyle}
          className="bg-white/90 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] shadow-2xl z-[400] overflow-hidden animate-premium-in p-6">
          <div className="flex items-center justify-between mb-6">
            <button onClick={handlePrevMonth} type="button" className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-accent transition-all">
              <ChevronLeft size={18} />
            </button>
            <div className="text-center">
              <p className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400">{currentDate.getFullYear()}</p>
              <p className="text-xs font-black text-slate-800">{months[currentDate.getMonth()]}</p>
            </div>
            <button onClick={handleNextMonth} type="button" className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 hover:text-accent transition-all">
              <ChevronRight size={18} />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 mb-2">
            {['L', 'M', 'M', 'G', 'V', 'S', 'D'].map(day => (
              <div key={day} className="h-10 w-10 flex items-center justify-center text-[0.55rem] font-black text-slate-300">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {renderDays()}
          </div>
        </div>
      )}
    </div>
  )
}

export default DatePicker
