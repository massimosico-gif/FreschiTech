import React, { useState, useEffect, useRef } from 'react'
import { MapPin, Search, Navigation } from 'lucide-react'
import { useMunicipalitySearch } from '../../hooks/useMunicipalitySearch'

const AddressFormGroup = ({ formData, handleChange, setFormData }) => {
  const [showCityResults, setShowCityResults] = useState(false)
  const { results: cityResults, loading: cityLoading } = useMunicipalitySearch(formData.city)
  const cityRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (cityRef.current && !cityRef.current.contains(event.target)) {
        setShowCityResults(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectCity = (city) => {
    setFormData(prev => ({
      ...prev,
      city: city.nome,
      province: city.sigla, // Usiamo sigla (es. UD)
      zip_code: city.cap[0] || ''
    }))
    setShowCityResults(false)
  }

  return (
    <div className="space-y-6">
      {/* City & Autocomplete */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 space-y-2 relative" ref={cityRef}>
          <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Città</label>
          <div className="relative">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              name="city" 
              value={formData.city} 
              onChange={(e) => {
                handleChange(e)
                setShowCityResults(true)
              }} 
              onFocus={() => setShowCityResults(true)}
              className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm"
              placeholder="Cerca comune..." 
            />
          </div>
          
          {showCityResults && cityResults.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white/90 backdrop-blur-xl border border-white/50 rounded-[2rem] shadow-2xl z-[300] overflow-hidden animate-premium-in p-2">
              {cityResults.map((city, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => selectCity(city)}
                  className="w-full flex items-center justify-between p-4 hover:bg-accent/5 rounded-2xl transition-all group"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-slate-300 group-hover:text-accent transition-colors">
                      <MapPin size={18} />
                    </div>
                    <div className="text-left">
                      <p className="text-sm font-black text-slate-700">{city.nome}</p>
                      <p className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest">{city.sigla}</p>
                    </div>
                  </div>
                  <span className="text-[0.65rem] font-black text-slate-300 group-hover:text-accent tracking-widest">{city.cap[0]}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">CAP</label>
          <input 
            name="zip_code" 
            value={formData.zip_code} 
            onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} 
            className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 px-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm"
            placeholder="33100" 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="space-y-2">
          <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Provincia</label>
          <input 
            name="province" 
            value={formData.province} 
            onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} 
            className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 px-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm"
            placeholder="UD" 
          />
        </div>
        <div className="md:col-span-2 space-y-2">
          <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Indirizzo</label>
          <div className="relative">
            <Navigation className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input 
              name="street" 
              value={formData.street} 
              onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} 
              className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm"
              placeholder="Via Roma, 1" 
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default AddressFormGroup
