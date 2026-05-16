import React, { useState, useEffect, useRef } from 'react'
import { 
  LayoutDashboard, Users, FileText, Settings, Plus, Search, Bell, ChevronRight, TrendingUp, Clock, Menu, X, Loader2, Mail, Phone, MapPin, Building2, User, MoreVertical, CheckCircle2, AlertCircle, ArrowRight, ArrowLeft, Trash2, ExternalLink, Printer, Download, Send, FileSearch, ChevronDown, Calendar, Filter, ArrowUpRight, History, AlertTriangle, HelpCircle, Save, Database, ShieldCheck, Percent, CreditCard, Share2
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

// --- CONSTANTS ---
const API_BASE = 'http://127.0.0.1:5050/api'

// --- COMPONENTS ---

const BackgroundAurora = () => (
  <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
    <motion.div animate={{ x: ['-20vw', '20vw', '-10vw', '-20vw'], y: ['-10vh', '30vh', '10vh', '-10vh'], scale: [1, 1.5, 1.2, 1] }} transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[20%] left-[30%] w-[60vw] h-[60vw] bg-accent/20 rounded-full blur-[150px]" />
    <motion.div animate={{ x: ['10vw', '-20vw', '10vw'], y: ['20vh', '-10vh', '20vh'], scale: [1.2, 1, 1.4, 1.2] }} transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }} className="absolute bottom-[20%] right-[20%] w-[50vw] h-[50vw] bg-blue-600/15 rounded-full blur-[130px]" />
    <motion.div animate={{ x: ['-30vw', '30vw', '-30vw'], y: ['10vh', '10vh', '10vh'] }} transition={{ duration: 40, repeat: Infinity, ease: "easeInOut" }} className="absolute top-[40%] left-[50%] w-[40vw] h-[40vw] bg-emerald-400/10 rounded-full blur-[160px]" />
  </div>
)

const Toast = ({ message, type = 'success', onClose }) => (
  <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} className={`fixed bottom-8 right-8 z-[200] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-4 border ${type === 'success' ? 'bg-emerald-500 text-white border-emerald-400' : 'bg-red-500 text-white border-red-400'}`}>
    {type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
    <span className="font-bold text-sm">{message}</span>
    <button onClick={onClose} className="p-1 hover:bg-white/20 rounded-lg transition-all"><X size={16} /></button>
  </motion.div>
)

const SidebarItem = ({ icon: Icon, label, active, collapsed, onClick, children, badge }) => {
  const [isOpen, setIsOpen] = useState(active)
  const hasSubmenu = React.Children.count(children) > 0
  const handleClick = () => { if (hasSubmenu && !collapsed) setIsOpen(!isOpen); onClick && onClick(); }
  return (
    <div className="flex flex-col gap-1">
      <motion.div whileHover={{ x: 5 }} onClick={handleClick} className={`flex items-center gap-4 px-4 py-3 rounded-2xl cursor-pointer transition-all relative z-10 ${active && !hasSubmenu ? 'bg-accent text-white shadow-lg shadow-accent-glow' : 'text-slate-500 hover:text-accent hover:bg-slate-50/50'}`}><div className="min-w-[24px] flex justify-center"><Icon size={22} /></div><AnimatePresence mode="wait">{!collapsed && (<motion.span initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -10 }} className="text-sm font-bold whitespace-nowrap flex-1">{label}</motion.span>)}</AnimatePresence>{!collapsed && badge && (<span className="px-2 py-0.5 bg-red-500 text-white text-[10px] font-black rounded-full shadow-sm animate-pulse">{badge}</span>)}{!collapsed && hasSubmenu && (<motion.div animate={{ rotate: isOpen ? 180 : 0 }}><ChevronDown size={16} /></motion.div>)}</motion.div>
      <AnimatePresence>{!collapsed && isOpen && hasSubmenu && (<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden flex flex-col ml-11 border-l-2 border-slate-100 pl-4 space-y-1">{children}</motion.div>)}</AnimatePresence>
    </div>
  )
}

const SubmenuItem = ({ label, active, onClick, badge }) => (
  <motion.div whileHover={{ x: 5 }} onClick={onClick} className={`py-2 text-[13px] font-bold cursor-pointer transition-all flex justify-between items-center ${active ? 'text-accent' : 'text-slate-400 hover:text-accent'}`}><span>{label}</span>{badge && <span className="w-1.5 h-1.5 bg-red-500 rounded-full"></span>}</motion.div>
)

const SettingsPage = ({ onToast }) => {
  const [activeTab, setActiveTab] = useState('azienda')
  const [settings, setSettings] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`${API_BASE}/settings/global`).then(res => res.json()).then(data => { setSettings(data); setLoading(false); })
  }, [])

  const handleSave = async () => {
    const res = await fetch(`${API_BASE}/settings/global`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings)
    })
    if (res.ok) onToast('Impostazioni salvate con successo!')
  }

  const handleBackup = async () => {
    const res = await fetch(`${API_BASE}/settings/db/backup`, { method: 'POST' })
    const data = await res.json()
    if (res.ok) onToast(`Backup creato: ${data.path.split('\\').pop()}`)
  }

  if (loading) return <div className="flex items-center justify-center h-64"><Loader2 className="animate-spin text-accent" /></div>

  return (
    <div className="space-y-8 max-w-4xl">
      <div className="flex gap-4 p-1 bg-white/50 backdrop-blur-xl rounded-2xl border border-white/20 w-fit">
        {['azienda', 'fiscalità', 'database'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)} className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-400 hover:text-slate-600'}`}>{t}</button>
        ))}
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass p-10 rounded-[3rem] border border-white/20 space-y-8">
        {activeTab === 'azienda' && (
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ragione Sociale</p><input className="w-full bg-slate-50/50 border-none rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-accent" value={settings.company_name || ''} onChange={e => setSettings({...settings, company_name: e.target.value})} /></div>
            <div className="space-y-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Indirizzo</p><input className="w-full bg-slate-50/50 border-none rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-accent" value={settings.company_address || ''} onChange={e => setSettings({...settings, company_address: e.target.value})} /></div>
            <div className="space-y-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Ufficiale</p><input className="w-full bg-slate-50/50 border-none rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-accent" value={settings.company_email || ''} onChange={e => setSettings({...settings, company_email: e.target.value})} /></div>
            <div className="space-y-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Partita IVA</p><input className="w-full bg-slate-50/50 border-none rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-accent" value={settings.company_vat || ''} onChange={e => setSettings({...settings, company_vat: e.target.value})} /></div>
          </div>
        )}

        {activeTab === 'fiscalità' && (
          <div className="space-y-8">
             <div className="flex items-center gap-4 p-6 bg-blue-50/50 rounded-[2rem] border border-blue-100"><Percent className="text-blue-500" /><p className="text-sm font-bold text-blue-900">Le aliquote fiscali sono preconfigurate per il regime ordinario. Modifica solo se necessario.</p></div>
             <div className="grid grid-cols-2 gap-8">
                <div className="space-y-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">IVA Standard (%)</p><input type="number" className="w-full bg-slate-50/50 border-none rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-accent" value={22} readOnly /></div>
                <div className="space-y-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ritenuta d'Acconto (%)</p><input type="number" className="w-full bg-slate-50/50 border-none rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-accent" value={20} readOnly /></div>
             </div>
          </div>
        )}

        {activeTab === 'database' && (
          <div className="space-y-8">
             <div className="flex items-center justify-between p-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100"><div><h3 className="text-lg font-black flex items-center gap-2"><Database size={20} className="text-accent" /> Manutenzione Archivio</h3><p className="text-xs text-slate-400 font-bold mt-1">Crea una copia di sicurezza di tutte le fatture e i clienti.</p></div><button onClick={handleBackup} className="px-6 py-3 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl">Esegui Backup</button></div>
          </div>
        )}

        <div className="pt-8 border-t border-slate-100 flex justify-end"><button onClick={handleSave} className="px-8 py-4 bg-accent text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-accent-glow flex items-center gap-2 hover:scale-105 transition-all"><Save size={18} /> Salva Modifiche</button></div>
      </motion.div>
    </div>
  )
}

const ClientDrawer = ({ client, onClose, onSave, onToast }) => {
  const [formData, setFormData] = useState(client || { name: '', type: 'private', city: '', street: '', email: '', phone: '', vat_id: '', tax_code: '', sdi_code: '' })
  
  const handleSave = async () => {
    if (!formData.name) return onToast('Il nome è obbligatorio', 'error')
    const method = formData.id ? 'PUT' : 'POST'
    const url = formData.id ? `${API_BASE}/clients/${formData.id}` : `${API_BASE}/clients`
    
    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })
    
    if (res.ok) {
      onSave()
      onToast(formData.id ? 'Cliente aggiornato!' : 'Nuovo cliente creato!')
      onClose()
    }
  }

  return (
    <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="fixed top-0 right-0 h-full w-[500px] glass z-[150] shadow-[-20px_0_50px_rgba(0,0,0,0.1)] border-l border-white/20 flex flex-col">
      <div className="p-8 flex justify-between items-center border-b border-slate-100 bg-white/50"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-accent/10 text-accent rounded-2xl flex items-center justify-center">{formData.type === 'condominium' ? <Building2 size={24} /> : <User size={24} />}</div><div><h2 className="text-xl font-black tracking-tight">{formData.id ? 'Modifica Anagrafica' : 'Nuovo Cliente'}</h2><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">TecnoRilievi Pro</p></div></div><button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-xl transition-all"><X size={20} /></button></div>
      <div className="flex-1 overflow-y-auto p-8 space-y-6 custom-scrollbar">
        <div className="space-y-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ragione Sociale / Nome</p><input className="w-full bg-slate-50/50 border-none rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-accent" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} /></div>
        <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo</p><select className="w-full bg-slate-50/50 border-none rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-accent" value={formData.type} onChange={e => setFormData({...formData, type: e.target.value})}><option value="private">Privato</option><option value="company">Azienda</option><option value="condominium">Condominio</option></select></div><div className="space-y-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Città</p><input className="w-full bg-slate-50/50 border-none rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-accent" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} /></div></div>
        <div className="space-y-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Indirizzo</p><input className="w-full bg-slate-50/50 border-none rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-accent" value={formData.street} onChange={e => setFormData({...formData, street: e.target.value})} /></div>
        <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email</p><input className="w-full bg-slate-50/50 border-none rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-accent" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} /></div><div className="space-y-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Telefono</p><input className="w-full bg-slate-50/50 border-none rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-accent" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} /></div></div>
        <div className="grid grid-cols-2 gap-4"><div className="space-y-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">P.IVA / CF</p><input className="w-full bg-slate-50/50 border-none rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-accent" value={formData.vat_id || formData.tax_code} onChange={e => setFormData({...formData, vat_id: e.target.value, tax_code: e.target.value})} /></div><div className="space-y-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Codice SDI</p><input className="w-full bg-slate-50/50 border-none rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-accent" value={formData.sdi_code} onChange={e => setFormData({...formData, sdi_code: e.target.value})} /></div></div>
      </div>
      <div className="p-8 border-t border-slate-100 flex gap-4 bg-white/50"><button onClick={onClose} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest">Annulla</button><button onClick={handleSave} className="flex-[2] py-4 bg-accent text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl shadow-accent-glow flex items-center justify-center gap-2"><Save size={16} /> Salva Cliente</button></div>
    </motion.div>
  )
}

const InvoiceGenerator = ({ clients, onClose, onToast }) => {
  const [step, setStep] = useState(1)
  const [selectedClient, setSelectedClient] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [items, setItems] = useState([{ description: '', amount: 0 }])
  const [pdfUrl, setPdfUrl] = useState(null)
  const [isPdfLoading, setIsPdfLoading] = useState(false)
  const debounceTimer = useRef(null)

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()))
  const handleSelectClient = (client) => { setSelectedClient(client); setStep(2); setTimeout(() => generatePreview(client), 100); }
  const addItem = () => setItems([...items, { description: '', amount: 0 }])
  
  const generatePreview = async (clientOverride = null) => {
    const clientToUse = clientOverride || selectedClient
    if (!clientToUse) return
    setIsPdfLoading(true)
    try {
      const response = await fetch(`${API_BASE}/invoices/preview-pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client: clientToUse, items: items, number: 'PROVA-2024' })
      })
      if (!response.ok) throw new Error('Errore server PDF')
      const blob = await response.blob()
      if (pdfUrl) URL.revokeObjectURL(pdfUrl)
      setPdfUrl(URL.createObjectURL(blob))
    } catch (error) { console.error(error); } finally { setIsPdfLoading(false); }
  }

  const handleFinalize = async () => {
    onToast('Fattura emessa con successo!')
    onClose()
  }

  useEffect(() => {
    if (step === 2 && selectedClient) {
      if (debounceTimer.current) clearTimeout(debounceTimer.current)
      debounceTimer.current = setTimeout(() => { generatePreview() }, 1000)
    }
    return () => clearTimeout(debounceTimer.current)
  }, [items, selectedClient, step])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-xl" onClick={onClose} />
      <div className="relative w-full max-w-7xl bg-white/90 backdrop-blur-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col h-[92vh] border border-white/20">
        <div className="p-8 border-b border-slate-100 flex justify-between items-center z-10"><div className="flex items-center gap-8"><div className="flex items-center gap-4"><div className="flex items-center justify-center w-10 h-10 bg-accent text-white rounded-xl font-black">{step}</div><div><h2 className="text-xl font-black tracking-tight">{step === 1 ? 'Seleziona Cliente' : 'Compila Proforma'}</h2></div></div>{selectedClient && (<div className="px-6 py-2 bg-slate-50 border border-slate-100 rounded-full flex items-center gap-2"><div className="w-2 h-2 bg-accent rounded-full"></div><span className="text-xs font-black text-slate-900">{selectedClient.name}</span></div>)}</div><div className="flex items-center gap-4">{isPdfLoading && (<div className="flex items-center gap-2 text-accent"><Loader2 size={16} className="animate-spin" /><span className="text-[10px] font-black uppercase tracking-widest">Sincronizzazione...</span></div>)}<button onClick={onClose} className="p-3 hover:bg-slate-50 rounded-2xl transition-all"><X size={24} /></button></div></div>
        <div className="flex-1 flex overflow-hidden">
          <div className="w-[450px] flex flex-col border-r border-slate-100 bg-white/50 overflow-hidden shadow-xl z-10">
             <AnimatePresence mode="wait">
                {step === 1 ? (
                   <motion.div key="step1" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-8 flex-1 flex flex-col"><div className="relative mb-8"><Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={24} /><input autoFocus type="text" placeholder="Cerca cliente..." className="w-full bg-slate-50/50 border-none rounded-3xl py-6 pl-16 pr-8 text-lg font-bold outline-none focus:ring-4 focus:ring-accent/20 transition-all" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div><div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar">{filteredClients.map((c, i) => (<motion.div key={i} whileHover={{ scale: 1.02 }} onClick={() => handleSelectClient(c)} className="p-6 bg-white/80 hover:bg-white border-2 border-transparent hover:border-accent rounded-[2rem] cursor-pointer transition-all flex justify-between items-center group shadow-sm hover:shadow-xl"><div className="flex items-center gap-4"><div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-accent transition-all shadow-sm">{c.type === 'condominium' ? <Building2 size={24} /> : <User size={24} />}</div><div><p className="font-black text-slate-900">{c.name}</p><p className="text-xs font-bold text-slate-400 uppercase">{c.city}</p></div></div><ArrowRight className="text-slate-200 group-hover:text-accent group-hover:translate-x-2 transition-all" size={24} /></motion.div>))}</div></motion.div>
                ) : (
                   <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} className="p-8 flex-1 flex flex-col overflow-hidden"><div className="flex-1 overflow-y-auto space-y-6 pr-4 custom-scrollbar">{items.map((item, index) => (<div key={index} className="space-y-3 p-6 bg-white/80 rounded-3xl relative group"><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Descrizione</p><textarea placeholder="es. Rilievo Tecnico..." rows="3" className="w-full bg-slate-50/50 border-none rounded-2xl py-4 px-6 font-bold outline-none focus:ring-2 focus:ring-accent transition-all resize-none" value={item.description} onChange={(e) => { const newItems = [...items]; newItems[index].description = e.target.value; setItems(newItems); }} /></div><div className="flex gap-4 items-end"><div className="flex-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Importo (€)</p><input type="number" placeholder="0.00" className="w-full bg-slate-50/50 border-none rounded-2xl py-4 px-6 font-black outline-none focus:ring-2 focus:ring-accent transition-all" value={item.amount} onChange={(e) => { const newItems = [...items]; newItems[index].amount = e.target.value; setItems(newItems); }} /></div><button onClick={() => setItems(items.filter((_, i) => i !== index))} className="p-4 text-red-300 hover:text-red-500 hover:bg-red-50 rounded-2xl transition-all"><Trash2 size={20} /></button></div></div>))}<button onClick={addItem} className="w-full py-6 border-2 border-dashed border-slate-200 rounded-[2.5rem] text-slate-400 font-bold hover:border-accent hover:text-accent transition-all flex items-center justify-center gap-2"><Plus size={20} /> Aggiungi Riga</button></div><div className="mt-8 pt-8 border-t border-slate-100 space-y-4"><div className="flex gap-4"><button onClick={() => setStep(1)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] tracking-widest hover:bg-slate-200 transition-all">Indietro</button><button onClick={handleFinalize} className="flex-[2] py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"><Send size={14} /> EMETTI FATTURA</button></div></div></motion.div>
                )}
             </AnimatePresence>
          </div>
          <div className="flex-1 bg-slate-200/30 flex flex-col relative overflow-hidden">{pdfUrl ? (<iframe src={`${pdfUrl}#toolbar=0&view=FitH`} className="w-full h-full border-none" title="PDF Preview" />) : (<div className="flex-1 flex flex-col items-center justify-center text-slate-400 gap-4"><div className="p-8 bg-white/50 rounded-[3rem] animate-pulse"><FileSearch size={64} /></div><p className="font-bold text-sm">Seleziona un cliente per l'anteprima ufficiale</p></div>)}</div>
        </div>
      </div>
    </motion.div>
  )
}

const InvoiceList = ({ invoices, type, onNew, onToast, onRefresh }) => {
  const filtered = invoices.filter(inv => {
    if (type === 'scadute') return inv.status !== 'paid';
    if (type === 'proforma') return inv.status === 'draft';
    return true;
  });

  const handleMarkPaid = async (id) => {
    const res = await fetch(`${API_BASE}/invoices/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'paid' })
    })
    if (res.ok) { onRefresh(); onToast('Fattura segnata come pagata!'); }
  }

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
      <div className="flex justify-between items-end"><div><p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">Documenti</p><h2 className="text-2xl font-black tracking-tight text-slate-900 capitalize">{type}</h2></div>{type === 'proforma' && (<button onClick={onNew} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:scale-105 transition-all flex items-center gap-2"><Plus size={16} /> Nuovo Proforma</button>)}</div>
      <div className="grid grid-cols-1 gap-3">{filtered.map((inv, i) => (
          <motion.div key={i} whileHover={{ y: -2 }} className="bg-white/60 hover:bg-white backdrop-blur-sm p-5 rounded-2xl border border-white/40 flex items-center gap-6 group transition-all shadow-sm hover:shadow-md">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${type === 'scadute' ? 'bg-red-50 text-red-500' : 'bg-slate-50 text-slate-400'} group-hover:bg-accent/10 group-hover:text-accent transition-all`}>{type === 'scadute' ? <AlertTriangle size={24} /> : <FileText size={24} />}</div>
            <div className="flex-1"><div className="flex items-center gap-2 mb-0.5"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">#{inv.number}</span><span className={`px-1.5 py-0.5 rounded-md text-[9px] font-black uppercase ${inv.status === 'paid' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>{inv.status}</span></div><h3 className="text-md font-black text-slate-900">{inv.client_name}</h3></div>
            <div className="text-right"><p className="text-lg font-black text-slate-900">€ {inv.total_amount?.toLocaleString() || '0'}</p><p className="text-[10px] font-bold text-slate-400 uppercase">{inv.date}</p></div>
            <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
               {inv.status !== 'paid' && <button onClick={() => handleMarkPaid(inv.id)} className="p-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-all" title="Segna come Pagata"><CheckCircle2 size={14} /></button>}
               <button className="p-2 bg-slate-900 text-white rounded-lg hover:bg-accent transition-all"><Printer size={14} /></button>
            </div>
          </motion.div>
        ))}</div>
    </motion.div>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState('overview')
  const [activeSubTab, setActiveSubTab] = useState('')
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false)
  const [isGeneratorOpen, setIsGeneratorOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [stats, setStats] = useState(null)
  const [clients, setClients] = useState([])
  const [invoices, setInvoices] = useState([])
  const [selectedClient, setSelectedClient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState(null)

  const fetchData = async () => {
    try {
      const [statsRes, clientsRes, invoicesRes] = await Promise.all([
        fetch(`${API_BASE}/stats`), fetch(`${API_BASE}/clients`), fetch(`${API_BASE}/invoices`)
      ]);
      setStats(await statsRes.json()); setClients(await clientsRes.json()); setInvoices(await invoicesRes.json());
      setLoading(false);
    } catch (error) { console.error(error); setLoading(false); }
  }

  useEffect(() => { fetchData() }, [])

  const showToast = (message, type = 'success') => { setToast({ message, type }); setTimeout(() => setToast(null), 3000); }

  const filteredInvoices = invoices.filter(inv => 
    inv.client_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    inv.number?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const filteredClients = clients.filter(c => 
    c.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.vat_id?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) return <div className="h-screen w-screen flex items-center justify-center bg-slate-50"><motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: "linear" }} className="text-accent"><Loader2 size={48} /></motion.div></div>

  const isUIBlurred = isSidebarExpanded || selectedClient || isGeneratorOpen

  return (
    <div className="flex h-screen bg-[#fcfdfe] text-slate-900 overflow-hidden font-['Plus_Jakarta_Sans'] relative">
      <BackgroundAurora />
      <motion.aside initial={false} animate={{ width: isSidebarExpanded ? 280 : 96 }} onMouseEnter={() => setIsSidebarExpanded(true)} onMouseLeave={() => setIsSidebarExpanded(false)} className="glass border-r border-white/20 flex flex-col p-6 z-30 relative shadow-2xl">
        <div className="flex items-center gap-4 mb-12 px-2 overflow-hidden h-12"><div className="min-w-[48px] h-12 flex items-center justify-center"><img src="http://127.0.0.1:5050/static/img/logo.png" alt="Logo" className="h-10 w-auto object-contain" /></div><AnimatePresence>{isSidebarExpanded && (<motion.span initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="text-xl font-black tracking-tighter whitespace-nowrap text-slate-900">TecnoRilievi</motion.span>)}</AnimatePresence></div>
        <nav className="flex flex-col gap-3">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active={activeTab === 'overview'} collapsed={!isSidebarExpanded} onClick={() => { setActiveTab('overview'); setActiveSubTab(''); }} />
          <SidebarItem icon={Users} label="Clienti" active={activeTab === 'clients'} collapsed={!isSidebarExpanded} onClick={() => { setActiveTab('clients'); setActiveSubTab(''); }} />
          <SidebarItem icon={FileText} label="Fatture" active={activeTab === 'invoices'} collapsed={!isSidebarExpanded} badge={invoices.filter(i => i.status !== 'paid').length}>
             <SubmenuItem label="Proforma" active={activeSubTab === 'proforma'} onClick={() => { setActiveTab('invoices'); setActiveSubTab('proforma'); }} />
             <SubmenuItem label="Scadute" active={activeSubTab === 'scadute'} onClick={() => { setActiveTab('invoices'); setActiveSubTab('scadute'); }} badge />
             <SubmenuItem label="Storico" active={activeSubTab === 'storico'} onClick={() => { setActiveTab('invoices'); setActiveSubTab('storico'); }} />
          </SidebarItem>
          <SidebarItem icon={Settings} label="Impostazioni" active={activeTab === 'settings'} collapsed={!isSidebarExpanded} onClick={() => { setActiveTab('settings'); setActiveSubTab(''); }} />
        </nav>
      </motion.aside>

      <motion.div animate={{ scale: isUIBlurred ? 0.98 : 1, filter: isUIBlurred ? 'blur(20px)' : 'blur(0px)', opacity: isUIBlurred ? 0.6 : 1, borderRadius: isUIBlurred ? '60px' : '0px' }} transition={{ type: 'spring', damping: 25, stiffness: 200 }} className="flex-1 flex flex-col overflow-hidden bg-white/40 backdrop-blur-md relative z-10">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.02] pointer-events-none z-0"><img src="http://127.0.0.1:5050/static/img/logo.png" alt="Watermark" className="w-[600px] grayscale" /></div>
        <header className="h-16 flex items-center justify-between px-10 border-b border-white/20 relative z-20">
          <div className="flex items-center gap-2"><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{activeTab}</span>{activeSubTab && (<><ChevronRight size={12} className="text-slate-300" /><span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{activeSubTab}</span></>)}</div>
          <div className="flex items-center gap-6">
            <div className="relative group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300 group-hover:text-slate-500 group-focus-within:text-accent transition-colors" size={14} />
              <input 
                type="text" 
                placeholder="Cerca..." 
                className="bg-slate-100/50 border-none rounded-xl py-2 pl-9 pr-4 w-56 hover:bg-slate-100/80 hover:ring-1 hover:ring-slate-200 focus:bg-white focus:ring-1 focus:ring-accent outline-none text-xs font-bold transition-all" 
                value={searchQuery} 
                onChange={(e) => setSearchQuery(e.target.value)} 
              />
            </div>
            <div className="flex items-center gap-3 pl-6 border-l border-slate-100"><button className="p-2 text-slate-400 hover:text-accent transition-all relative"><Bell size={20} /><span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span></button><button className="p-2 text-slate-400 hover:text-accent transition-all"><HelpCircle size={20} /></button><div className="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-[10px] font-black text-white ml-2 shadow-lg">M</div></div>
          </div>
        </header>
        <div className="flex-1 overflow-y-auto p-10 custom-scrollbar relative z-10"><AnimatePresence mode="wait">
            {activeTab === 'overview' && stats && (
              <motion.div key="overview" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="space-y-10">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6"><StatCard title="Fatturato" value={`€ ${stats.total_revenue.toLocaleString()}`} icon={TrendingUp} trend={12} /><StatCard title="In Sospeso" value={`€ ${stats.total_pending.toLocaleString()}`} icon={Clock} trend={-5} /><StatCard title="Clienti" value={stats.clients_count} icon={Users} trend={8} /></div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="glass p-6 rounded-[2.5rem] border border-white/20"><h2 className="text-sm font-black mb-6 uppercase tracking-widest text-slate-400">Andamento Mensile</h2><div className="h-[250px] w-full"><ResponsiveContainer width="100%" height="100%"><AreaChart data={stats.chart_data}><defs><linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#8bc53f" stopOpacity={0.3}/><stop offset="95%" stopColor="#8bc53f" stopOpacity={0}/></linearGradient></defs><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" /><XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700, fill: '#94a3b8'}} dy={10} /><YAxis hide /><Tooltip contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 10px 30px rgba(0,0,0,0.1)', fontWeight: 800, fontSize: '10px'}} /><Area type="monotone" dataKey="total" stroke="#8bc53f" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" /></AreaChart></ResponsiveContainer></div></div>
                  <div className="glass p-6 rounded-[2.5rem] border border-white/20"><h2 className="text-sm font-black mb-6 uppercase tracking-widest text-slate-400">Ultimi Documenti</h2><div className="space-y-2">{filteredInvoices.slice(0, 8).map((inv, i) => (<div key={i} className="flex items-center gap-3 p-3 hover:bg-white/50 rounded-2xl transition-all cursor-pointer group"><div className="w-10 h-10 bg-white/50 rounded-xl flex items-center justify-center text-slate-400 group-hover:text-accent transition-all"><FileText size={18} /></div><div className="flex-1"><p className="font-bold text-xs">#{inv.number}</p><p className="text-[10px] text-slate-400 truncate w-32">{inv.client_name}</p></div><div className="text-right"><p className="font-black text-xs text-slate-900">€ {inv.total?.toLocaleString() || '0'}</p><p className="text-[9px] font-bold text-slate-300 uppercase">{inv.date}</p></div></div>))}</div></div>
                </div>
              </motion.div>
            )}
            {activeTab === 'invoices' && <InvoiceList invoices={filteredInvoices} type={activeSubTab || 'storico'} onNew={() => setIsGeneratorOpen(true)} onToast={showToast} onRefresh={fetchData} />}
            {activeTab === 'clients' && (
              <motion.div key="clients" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="space-y-6">
                <div className="flex justify-between items-end"><h2 className="text-2xl font-black tracking-tight">Anagrafica Clienti</h2><button onClick={() => setSelectedClient({})} className="px-5 py-2.5 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl flex items-center gap-2"><Plus size={16} /> Nuovo Cliente</button></div>
                <div className="bg-white/60 backdrop-blur-xl rounded-[2rem] overflow-hidden border border-white/40 shadow-sm"><table className="w-full text-left border-collapse"><thead><tr className="bg-white/30 text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]"><th className="px-8 py-5">Tipo</th><th className="px-8 py-5">Nome</th><th className="px-8 py-5">Città</th><th className="px-8 py-5"></th></tr></thead><tbody className="text-xs font-bold">{filteredClients.map((c, i) => (<tr key={i} onClick={() => setSelectedClient(c)} className="border-b border-white/10 hover:bg-white/40 transition-all cursor-pointer group"><td className="px-8 py-5"><span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase ${c.type === 'condominium' ? 'bg-blue-50/50 text-blue-600' : 'bg-orange-50/50 text-orange-600'}`}>{c.type}</span></td><td className="px-8 py-5 text-slate-900">{c.name}</td><td className="px-8 py-5 text-slate-500">{c.city}</td><td className="px-8 py-5 text-right"><ChevronRight size={16} className="ml-auto text-slate-200 group-hover:text-accent transition-all" /></td></tr>))}</tbody></table></div>
              </motion.div>
            )}
            {activeTab === 'settings' && <SettingsPage onToast={showToast} />}
          </AnimatePresence></div>
      </motion.div>
      <AnimatePresence>{selectedClient && <><motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSelectedClient(null)} className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-[140]" /><ClientDrawer client={Object.keys(selectedClient).length ? selectedClient : null} onClose={() => setSelectedClient(null)} onSave={fetchData} onToast={showToast} /></>}{isGeneratorOpen && <InvoiceGenerator clients={clients} onClose={() => setIsGeneratorOpen(false)} onToast={showToast} />}{toast && <Toast {...toast} onClose={() => setToast(null)} />}</AnimatePresence>
    </div>
  )
}

const StatCard = ({ title, value, icon: Icon, trend }) => (
  <motion.div whileHover={{ y: -3 }} className="bg-white/60 backdrop-blur-md p-5 rounded-[2rem] shadow-sm hover:shadow-lg transition-all border border-white/40 relative z-10"><div className="flex justify-between items-start mb-3"><div className="p-2.5 bg-accent/10 rounded-xl text-accent"><Icon size={20} /></div><span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${trend >= 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-red-500/10 text-red-600'}`}>{trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%</span></div><h3 className="text-slate-400 text-[10px] font-bold uppercase tracking-widest">{title}</h3><p className="text-2xl font-black text-slate-900 tracking-tight">{value}</p></motion.div>
)

export default App
