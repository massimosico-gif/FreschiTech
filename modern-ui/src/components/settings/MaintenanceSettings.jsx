import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open } from '@tauri-apps/plugin-dialog'
import { Database, Download, AlertTriangle, Loader2, Save, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react'
import FormInput from '../ui/FormInput'

const MaintenanceSettings = () => {
  const [dbPath, setDbPath] = useState('')
  const [newDbPath, setNewDbPath] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [backingUp, setBackingUp] = useState(false)
  const [sendingLogs, setSendingLogs] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })

  useEffect(() => {
    invoke('get_current_db_path')
      .then(currentPath => {
        setDbPath(currentPath)
        setNewDbPath(currentPath)
        setLoading(false)
      })
      .catch(err => {
        setStatus({ type: 'error', message: 'Errore caricamento percorso DB: ' + err })
        setLoading(false)
      })
  }, [])

  const handleBackup = async () => {
    setBackingUp(true)
    setStatus({ type: '', message: '' })
    try {
      const path = await invoke('backup_database')
      setStatus({ type: 'success', message: `Backup creato con successo!` })
      alert(`Backup creato in:\n${path}`)
    } catch (err) {
      setStatus({ type: 'error', message: 'Errore backup: ' + err })
    } finally {
      setBackingUp(false)
    }
  }

  const handleSendLogs = async () => {
    setSendingLogs(true)
    setStatus({ type: '', message: '' })
    try {
      await invoke('send_logs_to_developer')
      setStatus({ type: 'success', message: 'Log inviati correttamente!' })
      setTimeout(() => setStatus({ type: '', message: '' }), 3000)
    } catch (err) {
      setStatus({ type: 'error', message: 'Errore invio log: ' + err })
    } finally {
      setSendingLogs(false)
    }
  }

  const handleSelectDb = async () => {
    try {
      const selected = await open({
        multiple: false,
        filters: [{
          name: 'Database SQLite',
          extensions: ['db', 'sqlite', 'sqlite3']
        }]
      })
      if (selected) {
        setNewDbPath(selected)
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Errore selezione file: ' + err })
    }
  }

  const handleSaveDbPath = async () => {
    if (!window.confirm("Cambiando il percorso del database, l'applicazione si collegherà al nuovo file selezionato.\n\nATTENZIONE: Se il file non esiste, verrà creato un nuovo database vuoto. Se vuoi spostare i tuoi dati, devi copiare manualmente il file .db nella nuova posizione prima di applicare il cambiamento.\n\nContinuare?")) return
    
    setSaving(true)
    try {
      await invoke('set_db_path', { path: newDbPath })
      setDbPath(newDbPath)
      setStatus({ type: 'success', message: 'Percorso database aggiornato! Si consiglia di riavviare l\'applicazione.' })
      setTimeout(() => setStatus({ type: '', message: '' }), 5000)
    } catch (err) {
      setStatus({ type: 'error', message: 'Errore salvataggio percorso: ' + err })
    } finally {
      setSaving(false)
    }
  }

  const handleResetDbPath = async () => {
    if (!window.confirm("Ripristinare il percorso predefinito in Documents/TecnoRilievi?")) return
    
    setSaving(true)
    try {
      await invoke('set_db_path', { path: null })
      const currentPath = await invoke('get_current_db_path')
      setDbPath(currentPath)
      setNewDbPath(currentPath)
      setStatus({ type: 'success', message: 'Percorso ripristinato al default.' })
      setTimeout(() => setStatus({ type: '', message: '' }), 3000)
    } catch (err) {
      setStatus({ type: 'error', message: 'Errore ripristino: ' + err })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[#8bc53f]" size={48} />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-premium-in">
      {status.message && (
        <div className={`p-4 rounded-2xl flex items-center gap-4 ${
          status.type === 'success' ? 'bg-[#8bc53f]/10 text-[#8bc53f] border border-[#8bc53f]/20' : 'bg-red-50 text-red-500 border border-red-100'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-bold uppercase tracking-widest">{status.message}</span>
        </div>
      )}

      {/* POSIZIONE DATABASE */}
      <div className="bg-white/40 backdrop-blur-md border border-white/60 p-10 rounded-[3rem] shadow-xl space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-6 mb-6">
          <div className="p-3 bg-purple-100 text-purple-600 rounded-2xl"><Database size={24} /></div>
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Posizione Database</h3>
            <p className="text-xs font-bold text-slate-400">Configura dove viene salvato il file dei dati</p>
          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 flex gap-4">
          <AlertTriangle className="text-amber-500 shrink-0" size={24} />
          <div className="space-y-1">
            <h4 className="text-sm font-black text-amber-800 uppercase tracking-widest">Attenzione</h4>
            <p className="text-xs font-medium text-amber-700">Se decidi di sincronizzare il database con Google Drive o OneDrive, assicurati che la sincronizzazione sia completata prima di aprire l'app su un altro PC. Clicca l'icona della cartella a destra per sfogliare i file.</p>
          </div>
        </div>

        <div className="flex items-end gap-4">
          <div className="flex-1">
            <FormInput 
              label="Percorso File Database (.db)" 
              value={newDbPath} 
              onChange={(e) => setNewDbPath(e.target.value)}
              icon={Database} 
            />
          </div>
          <button onClick={handleSelectDb} className="h-14 px-6 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-2xl font-black uppercase tracking-widest text-[0.7rem] transition-all">Sfoglia...</button>
        </div>

        {newDbPath !== dbPath && (
          <div className="flex gap-4 pt-2 animate-premium-in">
            <button onClick={handleSaveDbPath} disabled={saving} className="flex-1 flex items-center justify-center gap-2 h-14 bg-[#0f172a] text-white rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl disabled:opacity-50">
              {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />} Applica Nuovo Percorso
            </button>
            <button onClick={() => setNewDbPath(dbPath)} disabled={saving} className="px-8 h-14 bg-slate-100 text-slate-500 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-slate-200 transition-all disabled:opacity-50">Annulla</button>
          </div>
        )}

        <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
          <span className="text-[0.75rem] font-bold text-slate-400 uppercase tracking-widest">In caso di problemi puoi ripristinare il percorso originale</span>
          <button onClick={handleResetDbPath} disabled={saving} className="flex items-center gap-2 px-6 py-3 bg-red-50 text-red-500 hover:bg-red-100 rounded-xl text-[0.75rem] font-black uppercase tracking-widest transition-all">
            <RefreshCw size={14} /> Ripristina Default
          </button>
        </div>
      </div>

      {/* AZIONI DI MANUTENZIONE */}
      <div className="bg-white/40 backdrop-blur-md border border-white/60 p-10 rounded-[3rem] shadow-xl space-y-6">
        <div className="flex items-center gap-4 border-b border-slate-100 pb-6 mb-6">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><Download size={24} /></div>
          <div>
            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Strumenti di Manutenzione</h3>
            <p className="text-xs font-bold text-slate-400">Azioni avanzate per la risoluzione dei problemi</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white/50 border border-slate-100 p-6 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[#8bc53f]/10 text-[#8bc53f] rounded-lg"><Database size={18} /></div>
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Backup Locale</h4>
                <p className="text-[0.75rem] font-bold text-slate-400">Crea una copia di sicurezza immediata</p>
              </div>
            </div>
            <button onClick={handleBackup} disabled={backingUp} className="w-full flex items-center justify-center gap-2 h-12 bg-[#8bc53f] text-white rounded-xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-[#7ab236] transition-all disabled:opacity-50">
              {backingUp ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Salva Backup
            </button>
          </div>

          <div className="bg-white/50 border border-slate-100 p-6 rounded-2xl flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-slate-100 text-slate-500 rounded-lg"><AlertTriangle size={18} /></div>
              <div>
                <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Log di Sistema</h4>
                <p className="text-[0.75rem] font-bold text-slate-400">Invia diagnostica allo sviluppatore</p>
              </div>
            </div>
            <button onClick={handleSendLogs} disabled={sendingLogs} className="w-full flex items-center justify-center gap-2 h-12 bg-slate-800 text-white rounded-xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-slate-900 transition-all disabled:opacity-50">
              {sendingLogs ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} Invia Report
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MaintenanceSettings
