import React, { useState, useEffect, useRef } from 'react'
import { 
  Building2, 
  Save, 
  MessageSquare,
  Mail,
  User,
  Hash,
  AlertCircle,
  MapPin
} from 'lucide-react'
import { validateVAT, validateTaxCode } from '@tecno/ui'
import DrawerShell from './ui/DrawerShell'
import { useToast } from '@tecno/ui/feedback'

const EditClientDrawer = ({ isOpen, onClose, client, onSave }) => {
  const toast = useToast()
  const [errors, setErrors] = useState({})
  const [initialData, setInitialData] = useState(null)
  const [formData, setFormData] = useState({
    type: 'company',
    name: '',
    street: '',
    city: '',
    zip_code: '',
    province: '',
    vat_id: '',
    tax_code: '',
    email: '',
    pec: '',
    phone: '',
    notes: '',
    distance: 0
  })

  const validateField = (name, value) => {
    let error = ''
    if (name === 'vat_id' && value) {
      if (!validateVAT(value)) error = 'Partita IVA non valida'
    } else if (name === 'tax_code' && value) {
      if (!validateTaxCode(value)) error = 'Codice Fiscale non valido'
    } else if (name === 'name' && !value) {
      error = 'Il nome è obbligatorio'
    }
    setErrors(prev => ({ ...prev, [name]: error }))
    return !error
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    validateField(name, value)
  }

  const handleSaveInternal = () => {
    const isNameValid = validateField('name', formData.name)
    const isVatValid = validateField('vat_id', formData.vat_id)
    const isCfValid = validateField('tax_code', formData.tax_code)
    
    if (!isNameValid || !isVatValid || !isCfValid) {
      toast.error("Controlla i dati inseriti. Alcuni campi non sono validi.")
      return
    }
    
    onSave({
      ...formData,
      distance: parseInt(formData.distance) || 0
    })
  }

  const isDirty = initialData && JSON.stringify(formData) !== JSON.stringify(initialData)

  const [addressQuery, setAddressQuery] = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)
  const autocompleteTimeoutRef = useRef(null)

  useEffect(() => {
    return () => {
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current)
      }
    }
  }, [])

  const fetchSuggestions = async (query) => {
    if (!query || query.trim().length < 3) {
      setSuggestions([])
      return
    }
    setIsLoadingSuggestions(true)
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1&countrycodes=it&email=freschitechsrl@pec.it`
      const res = await fetch(url, { headers: { 'Accept': 'application/json' } })
      if (res.ok) {
        const data = await res.json()
        setSuggestions(data)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  const handleAddressChange = (e) => {
    const val = e.target.value
    setAddressQuery(val)
    setShowSuggestions(true)
    
    setFormData(prev => ({
      ...prev,
      street: val,
      city: '',
      zip_code: '',
      province: ''
    }))

    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current)
    }
    autocompleteTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(val)
    }, 450)
  }

  const selectSuggestion = (item) => {
    const addr = item.address || {}
    const streetVal = `${addr.road || ''} ${addr.house_number || ''}`.trim()
    const cityVal = addr.city || addr.town || addr.village || addr.municipality || ''
    const zipVal = addr.postcode || ''
    
    let provVal = ''
    const provinceKey = Object.keys(addr).find(k => k.startsWith('ISO3166-2-lvl'))
    if (provinceKey && addr[provinceKey].includes('-')) {
      provVal = addr[provinceKey].split('-')[1].toUpperCase()
    } else if (addr.county) {
      provVal = addr.county.replace(/provincia di/i, '').trim().substring(0, 2).toUpperCase()
    }

    setFormData(prev => ({
      ...prev,
      street: streetVal,
      city: cityVal,
      zip_code: zipVal,
      province: provVal
    }))

    setAddressQuery(item.display_name)
    setSuggestions([])
    setShowSuggestions(false)
  }

  useEffect(() => {
    if (isOpen) {
      setErrors({})
      if (client) {
        const data = {
          id: client.id,
          type: client.type || 'company',
          name: client.name || '',
          street: client.street || '',
          city: client.city || '',
          zip_code: client.zip_code || '',
          province: client.province || '',
          vat_id: client.vat_id || '',
          tax_code: client.tax_code || '',
          email: client.email || '',
          pec: client.pec || '',
          phone: client.phone || '',
          notes: client.notes || '',
          distance: client.distance || 0
        }
        setFormData(data)
        setInitialData(data)

        const addrString = `${client.street || ''}${client.city ? `, ${client.city}` : ''}${client.zip_code ? ` ${client.zip_code}` : ''}${client.province ? ` (${client.province})` : ''}`.trim().replace(/^,\s*/, '').replace(/,\s*$/, '')
        setAddressQuery(addrString)
      } else {
        const newData = {
          type: 'company',
          name: '',
          street: '',
          city: '',
          zip_code: '',
          province: '',
          vat_id: '',
          tax_code: '',
          email: '',
          pec: '',
          phone: '',
          notes: '',
          distance: 0
        }
        setFormData(newData)
        setInitialData(newData)
        setAddressQuery('')
      }
      setSuggestions([])
      setShowSuggestions(false)
    }
  }, [isOpen, client])

  const isNameInvalid = !formData.name || !formData.name.trim();
  const hasValidationErrors = Object.values(errors).some(err => !!err);
  const isNotDirty = client && client.id && !isDirty;
  const isSaveDisabled = isNameInvalid || hasValidationErrors || isNotDirty;

  return (
    <DrawerShell
      isOpen={isOpen}
      onClose={onClose}
      title={client && client.id ? 'Modifica Cliente' : 'Nuovo Cliente'}
      subtitle={formData.name || 'Scheda Anagrafica'}
      icon={formData.type === 'company' ? <Building2 size={24} /> : <User size={24} />}
      footer={
        <>
          <button 
            type="button" 
            onClick={onClose} 
            className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
          >
            Annulla
          </button>
          <button 
            type="button" 
            onClick={handleSaveInternal} 
            disabled={isSaveDisabled}
            className={`flex-1 py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl ${
              !isSaveDisabled
              ? 'bg-accent text-white hover:bg-accent/90 shadow-accent/20' 
              : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
            }`}
          >
            <Save size={18} /> Salva Cliente
          </button>
        </>
      }
    >
      <div className="space-y-10">
        {/* SEZIONE 1: DENOMINAZIONE */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-accent rounded-full"></div>
            <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-800">Denominazione</span>
          </div>

          <div className="space-y-2">
            <label className="text-[0.75rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Ragione Sociale / Nome Completo *</label>
            <div className="relative">
               <Building2 className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${errors.name ? 'text-rose-500' : 'text-slate-400'}`} size={18} />
               <input 
                name="name" 
                value={formData.name} 
                onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} 
                className={`w-full bg-white/50 border rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 transition-all shadow-sm ${errors.name ? 'border-rose-300 focus:ring-rose-100' : 'border-white/50 focus:ring-accent/20 focus:bg-white'}`}
                placeholder="Es: Lely Italia S.r.l." 
              />
            </div>
            {errors.name && <p className="text-[0.72rem] font-bold text-rose-500 ml-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.name}</p>}
          </div>
        </section>

        {/* SEZIONE 2: DATI FISCALI E CONTATTI */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-sky-400 rounded-full"></div>
            <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-800">Dati Fiscali & Contatti</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[0.75rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Partita IVA</label>
              <div className="relative">
                 <Hash className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${errors.vat_id ? 'text-rose-500' : 'text-slate-400'}`} size={18} />
                 <input 
                  name="vat_id" 
                  value={formData.vat_id} 
                  onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} 
                  className={`w-full bg-white/50 border rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 transition-all shadow-sm ${errors.vat_id ? 'border-rose-300 focus:ring-rose-100' : 'border-white/50 focus:ring-accent/20 focus:bg-white'}`}
                  placeholder="11 cifre" 
                />
              </div>
              {errors.vat_id && <p className="text-[0.72rem] font-bold text-rose-500 ml-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.vat_id}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-[0.75rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Codice Fiscale</label>
              <div className="relative">
                 <Hash className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${errors.tax_code ? 'text-rose-500' : 'text-slate-400'}`} size={18} />
                 <input 
                  name="tax_code" 
                  value={formData.tax_code} 
                  onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} 
                  className={`w-full bg-white/50 border rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 transition-all shadow-sm ${errors.tax_code ? 'border-rose-300 focus:ring-rose-100' : 'border-white/50 focus:ring-accent/20 focus:bg-white'}`}
                  placeholder="Codice Fiscale" 
                />
              </div>
              {errors.tax_code && <p className="text-[0.72rem] font-bold text-rose-500 ml-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.tax_code}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[0.75rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Email</label>
              <div className="relative">
                 <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input 
                  name="email" 
                  value={formData.email} 
                  onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} 
                  className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm"
                  placeholder="esempio@lely.com" 
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[0.75rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">PEC</label>
              <div className="relative">
                 <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input 
                  name="pec" 
                  value={formData.pec || ''} 
                  onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} 
                  className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm"
                  placeholder="esempio@pec.it" 
                />
              </div>
            </div>
          </div>
        </section>

        {/* SEZIONE 3: INDIRIZZO */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-rose-400 rounded-full"></div>
            <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-800">Indirizzo Sede</span>
          </div>
          
          <div className="space-y-2 relative">
            <label className="text-[0.75rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Indirizzo Completo</label>
            <div className="relative">
              <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="text"
                value={addressQuery} 
                onChange={handleAddressChange}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                onFocus={() => { if (addressQuery.length >= 3) setShowSuggestions(true) }}
                className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-12 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm"
                placeholder="Scrivi via, comune... es: Salita Pertoldi Pagnacco" 
                autoComplete="off"
              />
              {isLoadingSuggestions && (
                <div className="absolute right-4 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-300 border-t-accent" />
                </div>
              )}
            </div>
            
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden divide-y divide-slate-100 animate-premium-in">
                {suggestions.map((item, idx) => (
                  <li 
                    key={idx} 
                    onClick={() => selectSuggestion(item)}
                    className="px-5 py-3 hover:bg-accent/10 cursor-pointer text-xs font-bold text-slate-700 transition-colors flex items-start gap-2.5"
                  >
                    <MapPin size={14} className="text-accent mt-0.5 shrink-0" />
                    <span className="text-left leading-normal">{item.display_name}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-[0.75rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Distanza Sede / Cantiere (km)</label>
            <div className="relative">
              <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="number"
                name="distance"
                value={formData.distance}
                onChange={handleChange}
                onFocus={(e) => setTimeout(() => e.target.select(), 0)}
                className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm"
                placeholder="Es: 45"
              />
            </div>
          </div>
        </section>

        {/* SEZIONE 4: NOTE */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-slate-400 rounded-full"></div>
            <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-800">Note</span>
          </div>
          <div className="space-y-2">
            <label className="text-[0.75rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Note Interne</label>
            <div className="relative">
              <MessageSquare className="absolute left-5 top-5 text-slate-400" size={18} />
              <textarea 
                name="notes"
                value={formData.notes}
                onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)}
                className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm min-h-[100px] resize-none"
                placeholder="Inserisci qui eventuali note..."
              />
            </div>
          </div>
        </section>
      </div>
    </DrawerShell>
  )
}

export default EditClientDrawer
