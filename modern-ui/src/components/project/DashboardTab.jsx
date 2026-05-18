import React from 'react'
import { Euro, Receipt, TrendingUp, BarChart3, AlertCircle } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import Card from '../ui/Card'
import StatCard from '../ui/StatCard'

const DashboardTab = ({ stats, project }) => {
  // Brand Color
  const brandColor = 'accent';

  // Calcolo avanzamento basato sul budget (se presente)
  const progressPercent = stats.preventivoAccettato > 0 
    ? Math.min(Math.round((stats.valoreLavori / stats.preventivoAccettato) * 100), 100) 
    : 0;

  // Dati per il grafico a torta (ciambella)
  const pieData = [
    { name: 'Costo Vivo', value: stats.costoTotale, color: '#f43f5e' },
    { name: 'Utile Previsto', value: Math.max(0, stats.utile), color: '#10b981' }
  ]

  const totalValue = stats.costoTotale + Math.max(0, stats.utile);
  const utilePercent = totalValue > 0 ? Math.round((Math.max(0, stats.utile) / totalValue) * 100) : 0;
  const costoPercent = totalValue > 0 ? Math.round((stats.costoTotale / totalValue) * 100) : 0;

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
        {/* Note di Progetto */}
        <Card className="p-10 hover:bg-white group transition-all duration-500 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-8">
              <div className={`w-1.5 h-6 bg-${brandColor} rounded-full group-hover:scale-y-125 transition-transform`}></div>
              <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-800">Note di Progetto</span>
            </div>
            <p className="text-slate-600 leading-relaxed font-medium transition-colors text-sm">
              {project.description || "Nessuna nota inserita per questa commessa."}
            </p>
          </div>
        </Card>

        {/* Ripartizione Economica (Grafico a Ciambella) */}
        <Card className="p-10 hover:bg-white group transition-all duration-500 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-3 mb-6">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full group-hover:scale-y-125 transition-transform"></div>
              <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-800">Ripartizione Costo / Utile</span>
            </div>

            <div className="h-[200px] w-full relative flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2 })}`}
                    contentStyle={{ 
                      backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                      backdropFilter: 'blur(10px)',
                      border: '1px solid rgba(255, 255, 255, 0.5)', 
                      borderRadius: '1rem', 
                      boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                      padding: '0.75rem',
                      fontSize: '11px',
                      fontWeight: 900
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>

              {/* Centro della ciambella */}
              <div className="absolute text-center">
                <p className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400 mb-0.5">Margine Utile</p>
                <p className="text-xl font-black text-emerald-500">
                  {utilePercent}%
                </p>
              </div>
            </div>

            {/* Legenda Custom */}
            <div className="flex justify-center gap-6 mt-4 text-[0.65rem] font-black uppercase tracking-wider">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#f43f5e' }}></div>
                <span className="text-slate-500">Costo ({costoPercent}%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: '#10b981' }}></div>
                <span className="text-slate-500">Utile ({utilePercent}%)</span>
              </div>
            </div>
          </div>
        </Card>

        {/* Avanzamento Economico */}
        <Card className={`p-10 bg-${brandColor} text-white border-none shadow-2xl shadow-${brandColor}/20 hover:bg-white hover:text-${brandColor} transition-all duration-500 group flex flex-col justify-between`}>
          <div>
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
          </div>
        </Card>
      </div>
    </div>
  )
}

export default DashboardTab
