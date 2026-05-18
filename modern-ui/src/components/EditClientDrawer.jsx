import React, { useState, useEffect } from 'react'
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
import { validateVAT, validateTaxCode } from '../utils/validation'
import AddressFormGroup from './ui/AddressFormGroup'
import DrawerShell from './ui/DrawerShell'

const EditClientDrawer = ({ isOpen, onClose, client, onSave }) => {
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
      alert("Controlla i dati inseriti. Alcuni campi non sono validi.")
      return
    }
    
    onSave(formData)
  }

  const isDirty = initialData && JSON.stringify(formData) !== JSON.stringify(initialData)

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
          phone: client.phone || '',
          notes: client.notes || '',
          distance: client.distance || 0
        }
        setFormData(data)
        setInitialData(data)
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
          phone: '',
          notes: '',
          distance: 0
        }
        setFormData(newData)
        setInitialData(newData)
      }
    }
  }, [isOpen, client])

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
            disabled={!isDirty && client && client.id}
            className={`flex-1 py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl ${
              (!client || !client.id || isDirty) 
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
        {/* SEZIONE 1: TIPOLOGIA E NOME */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-accent rounded-full"></div>
            <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-800">Tipologia e Denominazione</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            {[
              { id: 'company', label: 'Azienda', icon: <Building2 size={14} /> },
              { id: 'private', label: 'Privato', icon: <User size={14} /> }
            ].map((t) => (
              <button 
                key={t.id} 
                type="button" 
                onClick={() => setFormData(prev => ({ ...prev, type: t.id }))}
                className={`py-4 rounded-2xl text-[0.6rem] font-black uppercase border transition-all flex flex-col items-center gap-2 ${formData.type === t.id ? 'bg-accent text-white border-accent' : 'bg-white text-slate-400 border-white hover:border-slate-200'}`}
              >
                {t.icon}
                {t.label}
              </button>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Ragione Sociale / Nome Completo *</label>
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
            {errors.name && <p className="text-[0.6rem] font-bold text-rose-500 ml-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.name}</p>}
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
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Partita IVA</label>
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
              {errors.vat_id && <p className="text-[0.6rem] font-bold text-rose-500 ml-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.vat_id}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Codice Fiscale</label>
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
              {errors.tax_code && <p className="text-[0.6rem] font-bold text-rose-500 ml-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.tax_code}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Email</label>
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
        </section>

        {/* SEZIONE 3: INDIRIZZO & DISTANZA */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-rose-400 rounded-full"></div>
            <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-800">Indirizzo Sede & Distanza</span>
          </div>
          <AddressFormGroup formData={formData} handleChange={handleChange} setFormData={setFormData} />
          
          <div className="space-y-2">
            <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Distanza dalla Sede (km)</label>
            <div className="relative">
              <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input 
                type="number"
                name="distance" 
                value={formData.distance} 
                onChange={(e) => {
                  const val = parseInt(e.target.value, 10) || 0;
                  setFormData(prev => ({ ...prev, distance: val }));
                }}
                onFocus={(e) => setTimeout(() => e.target.select(), 0)} 
                className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm"
                placeholder="Distanza in km" 
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
            <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Note Interne</label>
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
