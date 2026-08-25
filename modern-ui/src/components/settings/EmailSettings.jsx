import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Mail, Tag, Server, Hash, User, Lock, Send, Loader2, Save, FileText, Clock, MessageSquare, CheckCircle2, AlertCircle } from 'lucide-react'
import FormInput from '../ui/FormInput'
import AutocompleteInput from '../ui/AutocompleteInput'
import AutocompleteTextarea from '../ui/AutocompleteTextarea'

const availableTags = [
  { tag: '[numero]', label: 'Numero Fattura' },
  { tag: '[data]', label: 'Data Emissione' },
  { tag: '[data_invio]', label: 'Data Odierna' },
  { tag: '[scadenza]', label: 'Data Scadenza' },
  { tag: '[cliente]', label: 'Nome Cliente' },
  { tag: '[totale]', label: 'Totale Lordo' },
  { tag: '[netto]', label: 'Netto a Pagare' }
]

const EmailSettings = () => {
  const [smtpConfig, setSmtpConfig] = useState({
    server: '', port: 587, user: '', password: '', from_name: '', subject_template: '', body_template: ''
  })
  const [globalSettings, setGlobalSettings] = useState({
    mail_remind_1_subject: '', mail_remind_1_body: '', mail_remind_2_subject: '', mail_remind_2_body: ''
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [testing, setTesting] = useState(false)
  const [isDirty, setIsDirty] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })

  useEffect(() => {
    Promise.all([invoke('get_smtp_config'), invoke('get_global_settings')])
      .then(([smtp, global]) => {
        setSmtpConfig({
          ...smtp,
          subject_template: smtp.subject_template || 'Invio Fattura Proforma [numero]',
          body_template: smtp.body_template || 'Gentile Cliente,\nin allegato la fattura proforma in oggetto.\n\nCordiali saluti,\nTecnoRilievi-FVG'
        })
        setGlobalSettings(global)
        setLoading(false)
      })
      .catch(err => {
        console.error("Errore EmailSettings:", err)
        setStatus({ type: 'error', message: 'Errore caricamento: ' + err })
        setLoading(false)
      })
  }, [])

  const handleSmtpChange = (e) => {
    const { name, value } = e.target
    setSmtpConfig(prev => ({ ...prev, [name]: name === 'port' ? parseInt(value) || 0 : value }))
    setIsDirty(true)
  }

  const handleGlobalChange = (e) => {
    const { name, value } = e.target
    setGlobalSettings(prev => ({ ...prev, [name]: value }))
    setIsDirty(true)
  }

  const handleSave = async () => {
    setSaving(true)
    setStatus({ type: '', message: '' })
    try {
      await Promise.all([
        invoke('save_smtp_config', { config: smtpConfig }),
        invoke('save_global_settings', { settings: globalSettings })
      ])
      setStatus({ type: 'success', message: 'Configurazioni Email salvate!' })
      setIsDirty(false)
      setTimeout(() => setStatus({ type: '', message: '' }), 3000)
    } catch (err) {
      setStatus({ type: 'error', message: 'Errore: ' + err })
    } finally {
      setSaving(false)
    }
  }

  const handleTestConnection = async () => {
    setTesting(true)
    setStatus({ type: '', message: '' })
    try {
      await invoke('test_smtp_connection', { config: smtpConfig })
      setStatus({ type: 'success', message: 'Connessione SMTP riuscita!' })
    } catch (err) {
      setStatus({ type: 'error', message: 'Test fallito: ' + err })
    } finally {
      setTesting(false)
    }
  }

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      setStatus({ type: 'success', message: `Tag ${text} copiato!` })
      setTimeout(() => setStatus({ type: '', message: '' }), 2000)
    })
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[#8bc53f]" size={48} />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-premium-in">
      {status.message && (
        <div className={`md:col-span-2 p-4 rounded-2xl flex items-center gap-4 animate-premium-in ${
          status.type === 'success' ? 'bg-[#8bc53f]/10 text-[#8bc53f] border border-[#8bc53f]/20' : 'bg-red-50 text-red-500 border border-red-100'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-bold uppercase tracking-widest">{status.message}</span>
        </div>
      )}

      {/* GUIDA AI TAG */}
      <div className="bg-white/40 backdrop-blur-md border border-white/60 p-10 rounded-[3rem] shadow-xl space-y-6 md:col-span-2">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><Tag size={22} /></div>
          <div>
            <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Guida ai Segnaposto Email</h3>
            <p className="text-[0.75rem] font-bold text-slate-400 uppercase tracking-widest">Clicca su un codice per copiarlo e usarlo nei testi</p>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {availableTags.map(item => (
            <div 
              key={item.tag} 
              onClick={() => copyToClipboard(item.tag)}
              className="flex flex-col gap-1 p-4 bg-white/50 rounded-2xl border border-slate-100 hover:border-[#8bc53f] hover:bg-[#8bc53f]/5 cursor-pointer transition-all group"
            >
              <code className="text-sm font-black text-[#8bc53f] group-hover:scale-105 transition-transform">{item.tag}</code>
              <span className="text-[0.72rem] font-bold text-slate-400 uppercase tracking-tight">{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* SMTP CONFIG */}
      <div className="bg-white/40 backdrop-blur-md border border-white/60 p-10 rounded-[3rem] shadow-xl space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-sky-100 text-sky-600 rounded-2xl"><Mail size={22} /></div>
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Server SMTP</h3>
        </div>

        <FormInput label="Server SMTP" name="server" value={smtpConfig.server} onChange={handleSmtpChange} icon={Server} placeholder="es. smtp.gmail.com" />
        <FormInput label="Porta" name="port" type="number" value={smtpConfig.port} onChange={handleSmtpChange} icon={Hash} />
        <FormInput label="Email / Utente" name="user" value={smtpConfig.user} onChange={handleSmtpChange} icon={User} placeholder="tua@email.it" />
        <FormInput label="Password / App Password" name="password" type="password" value={smtpConfig.password} onChange={handleSmtpChange} icon={Lock} />
        
        <div className="flex gap-4 pt-4">
          <button 
            onClick={handleTestConnection}
            disabled={testing}
            className="flex-1 flex items-center justify-center gap-2 h-12 bg-sky-50 text-sky-600 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-sky-100 transition-all border border-sky-100 disabled:opacity-50"
          >
            {testing ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
            Test Connessione
          </button>
        </div>
      </div>

      {/* EMAIL TEMPLATES */}
      <div className="bg-white/40 backdrop-blur-md border border-white/60 p-10 rounded-[3rem] shadow-xl space-y-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl"><FileText size={22} /></div>
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Modello Standard</h3>
        </div>

        <FormInput label="Nome Mittente" name="from_name" value={smtpConfig.from_name} onChange={handleSmtpChange} icon={User} placeholder="TecnoRilievi-FVG" />

        <AutocompleteInput 
          label="Oggetto Predefinito" 
          name="subject_template" 
          value={smtpConfig.subject_template} 
          onChange={handleSmtpChange} 
          icon={Tag} 
          tags={availableTags}
        />

        <div className="space-y-2">
          <label className="text-[0.72rem] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
            <MessageSquare size={12} /> Corpo del Messaggio
          </label>
          <AutocompleteTextarea 
            name="body_template"
            value={smtpConfig.body_template}
            onChange={handleSmtpChange}
            rows={6}
            tags={availableTags}
          />
        </div>
      </div>

      {/* MODELLI SOLLECITO */}
      <div className="bg-white/40 backdrop-blur-md border border-white/60 p-10 rounded-[3rem] shadow-xl space-y-6 md:col-span-2">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl"><Clock size={22} /></div>
          <h3 className="text-lg font-black text-slate-800 uppercase tracking-tight">Modelli di Sollecito</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-4">
            <h4 className="text-[0.75rem] font-black uppercase tracking-widest text-[#8bc53f]">1° Sollecito</h4>
            <AutocompleteInput label="Oggetto" name="mail_remind_1_subject" value={globalSettings.mail_remind_1_subject} onChange={handleGlobalChange} icon={Tag} tags={availableTags} />
            <AutocompleteTextarea name="mail_remind_1_body" value={globalSettings.mail_remind_1_body} onChange={handleGlobalChange} rows={4} placeholder="Corpo del 1° sollecito..." tags={availableTags} />
          </div>
          <div className="space-y-4">
            <h4 className="text-[0.75rem] font-black uppercase tracking-widest text-orange-500">2° Sollecito</h4>
            <AutocompleteInput label="Oggetto" name="mail_remind_2_subject" value={globalSettings.mail_remind_2_subject} onChange={handleGlobalChange} icon={Tag} tags={availableTags} />
            <AutocompleteTextarea name="mail_remind_2_body" value={globalSettings.mail_remind_2_body} onChange={handleGlobalChange} rows={4} placeholder="Corpo del 2° sollecito..." tags={availableTags} />
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 md:col-span-2">
        <button 
          onClick={handleSave}
          disabled={saving || !isDirty}
          className={`flex items-center gap-3 px-10 h-14 rounded-2xl text-[0.75rem] font-black uppercase tracking-widest transition-all shadow-xl disabled:opacity-30 disabled:grayscale ${
            isDirty ? 'bg-[#0f172a] text-white shadow-black/20 hover:bg-slate-800' : 'bg-slate-200 text-slate-400 shadow-none'
          }`}
        >
          {saving ? <Loader2 size={20} className="animate-spin" /> : <Save size={20} />}
          Salva Configurazioni Email
        </button>
      </div>
    </div>
  )
}

export default EmailSettings
