import React, { useState, useEffect, useRef } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'

const DatePicker = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentDate, setCurrentDate] = useState(value ? new Date(value) : new Date())
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
    const firstDay = (firstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth()) + 6) % 7 // Start from Monday
    const days = []

    // Empty spaces for previous month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="h-10 w-10"></div>)
    }

    // Days of current month
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
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-white/50 border rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 flex items-center justify-between transition-all shadow-sm ${
          isOpen ? 'ring-2 ring-accent/20 bg-white border-white' : 'border-white/50'
        }`}
      >
        <CalendarIcon className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
        <span>{value ? new Date(value).toLocaleDateString('it-IT') : 'Seleziona data...'}</span>
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-3 bg-white/90 backdrop-blur-2xl border border-white/50 rounded-[2.5rem] shadow-2xl z-[400] overflow-hidden animate-premium-in p-6 w-80">
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
