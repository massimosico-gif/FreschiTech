import React, { useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { save as saveFileDialog } from '@tauri-apps/plugin-dialog'
import { 
  Archive, 
  Database, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Loader2
} from 'lucide-react'
import Card from '../ui/Card'

const TELEGRAM_CHAT_ID = import.meta.env.VITE_TELEGRAM_CHAT_ID
const TELEGRAM_BOT_TOKEN = import.meta.env.VITE_TELEGRAM_BOT_TOKEN

const DbBackupSettings = () => {
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })

  const showStatus = (type, message) => {
    setStatus({ type, message })
    setTimeout(() => setStatus({ type: '', message: '' }), 3500)
  }

  const handleExportDatabase = async () => {
    try {
      const filePath = await saveFileDialog({
        filters: [{
          name: 'Database SQLite',
          extensions: ['db']
        }],
        defaultPath: 'freschitech_backup.db'
      })

      if (filePath) {
        setLoading(true)
        await invoke('export_database', { destPath: filePath })
        showStatus('success', 'Database esportato con successo!')
      }
    } catch (err) {
      console.error(err)
      showStatus('error', `Errore esportazione: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  const handleSendLogToTelegram = async () => {
    if (!TELEGRAM_CHAT_ID || !TELEGRAM_BOT_TOKEN) {
      showStatus('error', 'Credenziali Telegram non configurate nel file .env')
      return
    }

    setLoading(true)
    try {
      // 1. Read log content from backend
      const logContent = await invoke('read_app_log')
      
      // 2. Create blob file for upload
      const blob = new Blob([logContent], { type: 'text/plain' })
      const formData = new FormData()
      formData.append('chat_id', TELEGRAM_CHAT_ID)
      formData.append('document', blob, 'freschitech_app.log')
      formData.append('caption', `FreschiTech - Log di diagnostica\nData: ${new Date().toLocaleString()}`)

      // 3. Send file to Telegram using Bot API
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
        method: 'POST',
        body: formData
      })

      const resData = await response.json()
      if (response.ok && resData.ok) {
        showStatus('success', 'Log inviato con successo a Telegram!')
      } else {
        const errorMsg = resData.description || 'Risposta non valida dalle API Telegram'
        showStatus('error', `Invio fallito: ${errorMsg}`)
      }
    } catch (err) {
      console.error(err)
      showStatus('error', `Errore durante l'invio: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-premium-in pb-10">
      {/* Toast Notifications */}
      {status.message && (
        <div className={`fixed bottom-8 right-8 p-4 rounded-2xl flex items-center gap-4 shadow-2xl z-50 animate-premium-in ${
          status.type === 'success' ? 'bg-slate-900 text-white' : 'bg-red-50 text-red-600 border border-red-100'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={20} className="text-green-400" /> : <AlertCircle size={20} />}
          <span className="text-[0.65rem] font-black uppercase tracking-widest">{status.message}</span>
        </div>
      )}

      {/* Section Header */}
      <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
          <Archive size={24} />
        </div>
        <div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Dati & Log Diagnostici</h3>
          <p className="text-[0.65rem] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Esportazione database e telemetria telegram</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* CARD 1: DATABASE EXPORT */}
        <Card hoverEffect={true} className="p-0 overflow-hidden h-full">
          <div className="p-8 space-y-6 flex flex-col justify-between h-full">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-slate-50 rounded-[1.5rem] text-indigo-500 shadow-sm">
                  <Database size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Esportazione Database</h4>
                  <p className="text-[0.6rem] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Backup locale dei dati</p>
                </div>
              </div>

              <p className="text-xs font-bold text-slate-500 leading-relaxed">
                Consente di creare una copia di backup del database SQLite locale (`freschitech.db`) in qualsiasi cartella del tuo computer.
                Puoi usare questo file per trasferire i dati su un altro PC o come punto di ripristino sicuro.
              </p>
            </div>

            <div className="pt-6 border-t border-slate-50">
              <button
                onClick={handleExportDatabase}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-300 text-white py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/10 hover:shadow-indigo-600/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Database size={16} />
                )}
                Esporta File Database (.db)
              </button>
            </div>
          </div>
        </Card>

        {/* CARD 2: SEND LOG TO TELEGRAM */}
        <Card hoverEffect={true} className="p-0 overflow-hidden h-full">
          <div className="p-8 space-y-6 flex flex-col justify-between h-full">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-slate-50 rounded-[1.5rem] text-sky-500 shadow-sm">
                  <Send size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-slate-800 uppercase tracking-tight">Invia Log a Telegram</h4>
                  <p className="text-[0.6rem] font-black text-slate-400 uppercase tracking-[0.3em] mt-1">Supporto e Diagnostica</p>
                </div>
              </div>

              <p className="text-xs font-bold text-slate-500 leading-relaxed">
                Invia i log diagnostici dell'applicazione direttamente allo sviluppatore per analizzare eventuali bug, arresti anomali o comportamenti imprevisti.
                I dati trasmessi includono unicamente le informazioni di telemetria dell'applicazione e del sistema operativo.
              </p>
            </div>

            <div className="pt-6 border-t border-slate-50">
              <button
                onClick={handleSendLogToTelegram}
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-300 text-white py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest shadow-xl shadow-sky-500/10 hover:shadow-sky-500/20 active:scale-[0.98] transition-all cursor-pointer"
              >
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Send size={16} />
                )}
                Invia Log Ora
              </button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default DbBackupSettings
