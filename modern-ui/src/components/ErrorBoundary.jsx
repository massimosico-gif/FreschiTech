import React from 'react'
import { invoke } from '@tauri-apps/api/core'
import { AlertTriangle, RefreshCw } from 'lucide-react'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo })
    // Invia lo stack trace dell'errore frontend al backend Rust
    invoke('log_frontend_error', {
      message: error.toString(),
      stack: errorInfo.componentStack || ''
    }).catch(err => console.error("Errore invio log a Rust:", err))
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-900/40 backdrop-blur-xl font-sans">
          {/* Sfondo con effetto sfocato */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-rose-500/10 blur-[120px]" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 rounded-full bg-accent/10 blur-[120px]" />
          </div>

          <div className="relative w-full max-w-xl bg-white/80 border border-white/60 backdrop-blur-2xl rounded-3xl p-10 shadow-2xl flex flex-col items-center text-center space-y-8 animate-fade-in">
            {/* Icona di Alert animata */}
            <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-lg shadow-rose-500/20 animate-pulse">
              <AlertTriangle size={36} />
            </div>

            <div className="space-y-3">
              <h2 className="text-2xl font-black text-slate-800 tracking-tight">Si è verificato un errore imprevisto</h2>
              <p className="text-sm font-bold text-slate-500 max-w-md mx-auto">
                L'interfaccia dell'applicazione ha riscontrato un problema temporaneo. L'errore è stato registrato ed inviato automaticamente nei canali di diagnostica.
              </p>
            </div>

            {/* Dettagli dell'errore */}
            <div className="w-full bg-slate-950/5 border border-slate-950/5 rounded-2xl p-5 text-left font-mono text-[10px] text-rose-600 max-h-40 overflow-y-auto select-all leading-relaxed">
              <p className="font-black text-rose-700">{this.state.error && this.state.error.toString()}</p>
              {this.state.errorInfo && (
                <pre className="mt-3 text-slate-500 whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
              )}
            </div>

            {/* Pulsanti di Azione */}
            <div className="w-full">
              <button
                onClick={this.handleReload}
                className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-accent to-accent/90 hover:from-accent/95 hover:to-accent text-white font-black uppercase tracking-widest text-xs py-4 px-6 rounded-2xl shadow-xl shadow-accent/15 hover:shadow-accent/25 transition-all duration-300 transform active:scale-95 cursor-pointer"
              >
                <RefreshCw size={14} className="animate-spin-slow" />
                Riavvia Applicazione
              </button>
            </div>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
