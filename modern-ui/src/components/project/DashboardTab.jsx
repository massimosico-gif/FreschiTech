import React from 'react'
import { Euro, Receipt, TrendingUp, BarChart3, AlertCircle } from 'lucide-react'
import Card from '../ui/Card'
import StatCard from '../ui/StatCard'

const DashboardTab = ({ stats, project }) => {
  // Brand Color
  const brandColor = 'accent';

  // Calcolo avanzamento basato sul budget (se presente)
  const progressPercent = stats.preventivoAccettato > 0 
    ? Math.min(Math.round((stats.valoreLavori / stats.preventivoAccettato) * 100), 100) 
    : 0;

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 md:flex-row lg:grid-cols-4 gap-8">
        <StatCard 
          label="Costo Totale" 
          value={`€ ${stats.costoTotale.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} 
          icon={Euro} 
          color="text-slate-600" 
        />
        <StatCard 
          label="Preventivo Accettato" 
          value={`€ ${stats.preventivoAccettato.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} 
          icon={Receipt} 
          color="text-sky-600" 
        />
        <StatCard 
          label="Valore Lavori" 
          value={`€ ${stats.valoreLavori.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} 
          icon={TrendingUp} 
          color={`text-${brandColor}`} 
        />
        <StatCard 
          label="Utile Previsto" 
          value={`€ ${stats.utile.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`} 
          icon={BarChart3} 
          color="text-emerald-600" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 p-10 hover:bg-white group transition-all duration-500">
           <div className="flex items-center gap-3 mb-8">
            <div className={`w-1.5 h-6 bg-${brandColor} rounded-full group-hover:scale-y-125 transition-transform`}></div>
            <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-800">Note di Progetto</span>
          </div>
          <p className="text-slate-600 leading-relaxed font-medium transition-colors">
            {project.description || "Nessuna nota inserita per questa commessa."}
          </p>
        </Card>

        <Card className={`p-10 bg-${brandColor} text-white border-none shadow-2xl shadow-${brandColor}/20 hover:bg-white hover:text-${brandColor} transition-all duration-500 group`}>
          <div className="flex items-center gap-3 mb-8">
            <div className="w-1.5 h-6 bg-white/30 group-hover:bg-current/30 rounded-full transition-colors"></div>
            <span className="text-[0.7rem] font-black uppercase tracking-widest text-white/70 group-hover:text-current/70 transition-colors">Avanzamento Economico</span>
          </div>
          <div className="space-y-6">
            <div>
              <div className="flex justify-between text-[0.65rem] font-black uppercase tracking-widest mb-2">
                <span className="group-hover:text-current transition-colors">Copertura Budget</span>
                <span>{progressPercent}%</span>
              </div>
              <div className="h-3 bg-white/20 group-hover:bg-current/10 rounded-full overflow-hidden transition-colors">
                <div 
                  className="h-full bg-white group-hover:bg-current transition-all duration-1000"
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>
            <div className="pt-4 border-t border-white/10 group-hover:border-current/10 space-y-4 transition-colors">
              <div className="flex items-center gap-3">
                <AlertCircle size={18} className="text-white/60 group-hover:text-current/60 transition-colors" />
                <p className="text-xs font-bold leading-snug">
                  {progressPercent >= 100 
                    ? "Budget raggiunto o superato. Monitora l'utile."
                    : "L'avanzamento riflette il valore dei lavori rispetto al preventivo."}
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

export default DashboardTab
