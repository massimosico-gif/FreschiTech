import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Building2, Hash, MapPin, Mail, Globe, CreditCard, Save, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import FormInput from '../ui/FormInput'

const CompanySettings = () => {
  const [globalSettings, setGlobalSettings] = useState({
    company_name: '', company_address: '', company_vat: '', company_email: '',
    company_pec: '', company_phone: '', company_website: '', company_iban: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })

  useEffect(() => {
    invoke('get_global_settings')
      .then(global => {
        setGlobalSettings({
          company_name: (global && global.company_name !== undefined && global.company_name !== '') ? global.company_name : 'FRESCHI TECH S.R.L.',
          company_vat: (global && global.company_vat !== undefined && global.company_vat !== '') ? global.company_vat : '02700640309',
          company_address: (global && global.company_address !== undefined && global.company_address !== '') ? global.company_address : 'SALITA PERTOLDI 1/1 - 33010 - PAGNACCO (UD)',
          company_email: (global && global.company_email !== undefined) ? global.company_email : '',
          company_pec: (global && global.company_pec !== undefined && global.company_pec !== '') ? global.company_pec : 'freschitechsrl@pec.it',
          company_phone: (global && global.company_phone !== undefined) ? global.company_phone : '',
          company_website: (global && global.company_website !== undefined) ? global.company_website : '',
          company_iban: (global && global.company_iban !== undefined && global.company_iban !== '') ? global.company_iban : 'IT00 X 00000 00000 000000000000'
        })
        setLoading(false)
      })
      .catch(err => {
        console.error("Errore caricamento Dati Azienda:", err)
        setStatus({ type: 'error', message: 'Errore caricamento Dati Azienda: ' + err })
        setLoading(false)
      })
  }, [])

  const handleChange = (e) => {
    const { name, value } = e.target
    setGlobalSettings(prev => ({ ...prev, [name]: value }))
    setIsDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setStatus({ type: '', message: '' })
    try {
      await invoke('save_global_settings', { settings: globalSettings })
      setStatus({ type: 'success', message: 'Dati Azienda salvati!' })
      setIsDirty(false)
      setTimeout(() => setStatus({ type: '', message: '' }), 3000)
    } catch (err) {
      setStatus({ type: 'error', message: 'Errore: ' + err })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-accent" size={48} />
      </div>
    )
  }

  return (
    <div className="bg-white/40 backdrop-blur-md border border-white/60 p-10 rounded-[3rem] shadow-xl space-y-8 animate-premium-in">
      {status.message && (
        <div className={`p-4 rounded-2xl flex items-center gap-4 animate-premium-in ${
          status.type === 'success' ? 'bg-emerald-50 text-emerald-500 border border-emerald-100' : 'bg-red-50 text-red-500 border border-red-100'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-bold uppercase tracking-widest">{status.message}</span>
        </div>
      )}
      <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
        <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><Building2 size={24} /></div>
        <div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Dati Aziendali</h3>
          <p className="text-xs font-bold text-slate-400">Questi dati appariranno nell'intestazione delle fatture</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <FormInput label="Ragione Sociale" name="company_name" value={globalSettings.company_name} onChange={handleChange} icon={Building2} placeholder="FRESCHI TECH S.R.L." />
        <FormInput label="Partita IVA" name="company_vat" value={globalSettings.company_vat} onChange={handleChange} icon={Hash} placeholder="02700640309" />
        <div className="md:col-span-2">
          <FormInput label="Indirizzo Sede Legale" name="company_address" value={globalSettings.company_address} onChange={handleChange} icon={MapPin} placeholder="SALITA PERTOLDI 1/1 - 33010 - PAGNACCO (UD)" />
        </div>
        <FormInput label="Email Ufficiale" name="company_email" value={globalSettings.company_email} onChange={handleChange} icon={Mail} placeholder="es: info@freschitech.it" />
        <FormInput label="PEC" name="company_pec" value={globalSettings.company_pec} onChange={handleChange} icon={Mail} placeholder="freschitechsrl@pec.it" />
        <FormInput label="Telefono" name="company_phone" value={globalSettings.company_phone} onChange={handleChange} icon={Globe} placeholder="Telefono..." />
        <FormInput label="Sito Web" name="company_website" value={globalSettings.company_website} onChange={handleChange} icon={Globe} placeholder="Sito Web..." />
        <div className="md:col-span-2">
          <FormInput label="IBAN Predefinito" name="company_iban" value={globalSettings.company_iban} onChange={handleChange} icon={CreditCard} placeholder="IT00 X 00000 00000 000000000000" />
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button 
          onClick={handleSave}
          disabled={saving || !isDirty}
          className={`flex items-center gap-3 px-10 h-14 rounded-2xl text-[0.75rem] font-black uppercase tracking-widest transition-all shadow-xl disabled:opacity-30 disabled:grayscale ${
            isDirty ? 'bg-accent text-white shadow-accent/20 hover:bg-accent/90' : 'bg-slate-200 text-slate-400 shadow-none'
          }`}
        >
          {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          Salva Dati Azienda
        </button>
      </div>
    </div>
  )
}
export default CompanySettings
