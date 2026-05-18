import React from 'react'
import { useUpdater } from '../../hooks/useUpdater'
import { relaunch } from '@tauri-apps/plugin-process'
import { RefreshCw, Download, CheckCircle2, Loader2 } from 'lucide-react'

const UpdaterSettings = () => {
  const {
    status: updateStatus,
    newVersion,
    currentVersion,
    downloadProgress,
    errorMessage: updateError,
    checkForUpdates,
    installUpdate
  } = useUpdater()

  return (
    <div className="bg-white/40 backdrop-blur-md border border-white/60 p-10 rounded-[3rem] shadow-xl space-y-10 animate-premium-in">
      <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
        <div className="p-3 bg-emerald-100 text-emerald-600 rounded-2xl"><RefreshCw size={24} /></div>
        <div>
          <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Aggiornamenti Software</h3>
          <p className="text-xs font-bold text-slate-400">Versione attuale: <span className="text-accent">{currentVersion || '...'}</span></p>
        </div>
      </div>

      <div className="flex flex-col items-center justify-center py-12 space-y-8 bg-slate-50/50 rounded-[2.5rem] border border-slate-100">
        <div className="relative">
          <div className={`w-24 h-24 rounded-3xl flex items-center justify-center shadow-2xl ${
             updateStatus === 'available' ? 'bg-accent text-white animate-bounce' :
             updateStatus === 'up-to-date' ? 'bg-emerald-100 text-emerald-600' :
             updateStatus === 'error' ? 'bg-red-100 text-red-600' :
             'bg-white text-slate-300'
          }`}>
            {updateStatus === 'checking' || updateStatus === 'downloading' ? (
              <RefreshCw size={48} className="animate-spin" />
            ) : updateStatus === 'available' ? (
              <Download size={48} />
            ) : updateStatus === 'up-to-date' ? (
              <CheckCircle2 size={48} />
            ) : (
              <RefreshCw size={48} />
            )}
          </div>
        </div>

        <div className="text-center space-y-2">
          <h4 className="text-lg font-black text-slate-800 uppercase">
            {updateStatus === 'idle' && "Controlla disponibilità"}
            {updateStatus === 'checking' && "Verifica in corso..."}
            {updateStatus === 'available' && "Nuova versione pronta!"}
            {updateStatus === 'up-to-date' && "Software aggiornato"}
            {updateStatus === 'downloading' && "Installazione in corso..."}
            {updateStatus === 'error' && "Ops! Qualcosa è andato storto"}
          </h4>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest max-w-xs mx-auto">
            {updateStatus === 'available' ? `È disponibile la versione ${newVersion}. Vuoi procedere?` :
             updateStatus === 'up-to-date' ? "Stai utilizzando l'ultima versione disponibile." :
             updateStatus === 'error' ? updateError :
             "Clicca il pulsante qui sotto per verificare se ci sono aggiornamenti su GitHub."}
          </p>
        </div>

        <div className="w-full max-w-sm px-8">
          {updateStatus === 'downloading' && (
            <div className="w-full bg-white h-3 rounded-full overflow-hidden shadow-inner mb-4">
              <div 
                className="h-full bg-accent transition-all duration-300"
                style={{ width: `${downloadProgress}%` }}
              />
            </div>
          )}

          {updateStatus === 'available' ? (
            <button 
              onClick={installUpdate}
              className="w-full h-14 bg-accent text-white rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-accent/90 transition-all shadow-xl shadow-accent/20 flex items-center justify-center gap-3"
            >
              <Download size={18} />
              Scarica e Installa {newVersion}
            </button>
          ) : updateStatus === 'success' ? (
            <button 
              onClick={() => relaunch()}
              className="w-full h-14 bg-emerald-600 text-white rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-600/20 flex items-center justify-center gap-3"
            >
              <RefreshCw size={18} />
              Riavvia Ora
            </button>
          ) : (
            <button 
              onClick={() => checkForUpdates()}
              disabled={updateStatus === 'checking'}
              className="w-full h-14 bg-[#0f172a] text-white rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl flex items-center justify-center gap-3 disabled:opacity-50"
            >
              {updateStatus === 'checking' ? <Loader2 size={18} className="animate-spin" /> : <RefreshCw size={18} />}
              Verifica Aggiornamenti
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default UpdaterSettings
