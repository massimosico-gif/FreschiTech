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

/*
  PERCHE' IL TOKEN TELEGRAM NON STA PIU' QUI
  ---------------------------------------------------------------------------
  Prima questo file leggeva `import.meta.env.VITE_TELEGRAM_BOT_TOKEN` e
  chiamava le API di Telegram direttamente dal browser. Vite sostituisce quelle
  variabili a build time: il token finiva in chiaro dentro il bundle
  JavaScript, leggibile da chiunque aprisse l'applicazione.

  Ora l'invio passa dal comando `send_logs_to_developer` di tecno-core, che
  tiene le credenziali nel backend (variabile d'ambiente di build oppure
  ~/.freschitech/diagnostics.json) e allega SOLO il file di log — mai il
  database.
*/

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
    setLoading(true)
    try {
      // Il backend sceglie il file di log corrente (il .log piu' recente nella
      // cartella di log dell'applicazione: il nome dipende dal productName e
      // non va scritto a mano) e lo allega con le informazioni di ambiente.
      // Se le credenziali non sono configurate restituisce un errore con le
      // istruzioni, che mostriamo cosi' com'e'.
      await invoke('send_logs_to_developer')
      showStatus('success', "Segnalazione inviata all'assistenza.")
    } catch (err) {
      showStatus('error', String(err))
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
