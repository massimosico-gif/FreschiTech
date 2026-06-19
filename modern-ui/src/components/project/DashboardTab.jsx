import React, { useMemo } from 'react'
import { Euro, Receipt, TrendingUp, BarChart3, AlertCircle, Percent } from 'lucide-react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import Card from '../ui/Card'
import StatCard from '../ui/StatCard'

const DashboardTab = ({ stats, project, labor = [], materials = [], expenses = [], isCostCenter = false }) => {
  // Brand Color
  const brandColor = 'accent';

  // Calcolo avanzamento basato sul budget (se presente)
  const progressPercent = stats.preventivoAccettato > 0 
    ? Math.round((stats.costoTotale / stats.preventivoAccettato) * 100) 
    : 0;

  // Calcolo scostamento rispetto al listino
  const scostamentoPercent = stats.valoreLavori > 0
    ? ((stats.preventivoAccettato - stats.valoreLavori) / stats.valoreLavori) * 100
    : 0;

  // Dati per il grafico a torta (ciambella)
  const pieData = [
    { name: 'Costo Vivo', value: stats.costoTotale, color: '#f43f5e' },
    { name: 'Utile Previsto', value: Math.max(0, stats.utile), color: '#10b981' }
  ]

  const totalValue = stats.costoTotale + Math.max(0, stats.utile);
  const utilePercent = totalValue > 0 ? Math.round((Math.max(0, stats.utile) / totalValue) * 100) : 0;
  const costoPercent = totalValue > 0 ? Math.round((stats.costoTotale / totalValue) * 100) : 0;

  const phaseData = useMemo(() => {
    if (!isCostCenter) return []
    const phases = {}

    const getOrCreatePhase = (name) => {
      const normalizedName = name ? name.trim() : 'Non Specificato'
      if (!phases[normalizedName]) {
        phases[normalizedName] = {
          name: normalizedName,
          laborCost: 0,
          materialCost: 0,
          expenseCost: 0,
          totalCost: 0
        }
      }
      return phases[normalizedName]
    }

    labor.forEach(l => {
      const phase = getOrCreatePhase(l.phase)
      phase.laborCost += (l.hours * l.hourly_cost) + (l.travel_cost || 0)
    })

    materials.forEach(m => {
      const phase = getOrCreatePhase(m.phase)
      phase.materialCost += m.quantity * m.unit_price
    })

    expenses.forEach(ex => {
      const phase = getOrCreatePhase(ex.phase)
      phase.expenseCost += ex.amount
    })

    return Object.values(phases).map(p => {
      p.totalCost = p.laborCost + p.materialCost + p.expenseCost
      return p
    }).sort((a, b) => b.totalCost - a.totalCost)
  }, [isCostCenter, labor, materials, expenses])

  return (
    <div className="space-y-10">
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-4">
        <StatCard 
          label="Costo Totale (Costi Vivi)" 
          value={`€ ${stats.costoTotale.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          icon={Euro} 
          color="text-slate-600" 
        />
        <StatCard 
          label="Valore Lavori (Listino)" 
          value={`€ ${stats.valoreLavori.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          icon={TrendingUp} 
          color="text-indigo-600" 
        />
        <StatCard 
          label="Preventivo Accettato" 
          value={`€ ${stats.preventivoAccettato.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          icon={Receipt} 
          color="text-sky-600" 
        />
        <StatCard 
          label="Utile su Preventivo" 
          value={`€ ${stats.utile.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          icon={BarChart3} 
          color={stats.utile < 0 ? "text-rose-600" : "text-emerald-600"} 
        />
        <StatCard 
          label="Utile a Listino (Teorico)" 
          value={`€ ${(stats.utileListino || 0).toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} 
          icon={BarChart3} 
          color={(stats.utileListino || 0) < 0 ? "text-rose-600" : "text-teal-600"} 
        />
        <StatCard 
          label="Scostamento da Listino" 
          value={scostamentoPercent === 0 ? "Allineato" : `${scostamentoPercent > 0 ? '+' : ''}${scostamentoPercent.toLocaleString('it-IT', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`} 
          icon={Percent} 
          color={scostamentoPercent === 0 ? "text-slate-500" : scostamentoPercent < 0 ? "text-amber-500" : "text-emerald-500"} 
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
                    formatter={(value) => `€ ${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
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
                    style={{ width: `${Math.min(progressPercent, 100)}%` }}
                  ></div>
                </div>
              </div>
              <div className="pt-4 border-t border-white/10 group-hover:border-current/10 space-y-4 transition-colors">
                <div className="flex items-center gap-3">
                  <AlertCircle size={18} className="text-white/60 group-hover:text-current/60 transition-colors" />
                  <p className="text-xs font-bold leading-snug">
                    {progressPercent >= 100 
                      ? "Budget raggiunto o superato. Monitora l'utile."
                      : "L'avanzamento riflette la percentuale di budget consumata dai costi."}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>

      {isCostCenter && (
        <Card className="p-8 hover:bg-white group transition-all duration-500">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-1.5 h-6 bg-accent rounded-full group-hover:scale-y-125 transition-transform"></div>
            <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-800">Distribuzione Costi per Fase</span>
          </div>
          
          {phaseData.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1 space-y-4">
                <h4 className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 mb-4">Percentuale su Costo Totale</h4>
                {phaseData.map((item, idx) => {
                  const perc = stats.costoTotale > 0 ? (item.totalCost / stats.costoTotale) * 100 : 0
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span className="truncate max-w-[150px] uppercase text-[0.65rem]">{item.name}</span>
                        <span>{perc.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div 
                          className="bg-accent h-full rounded-full transition-all duration-500" 
                          style={{ width: `${perc}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
              
              <div className="lg:col-span-2 overflow-x-auto border border-slate-100 rounded-2xl">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50">
                      <th className="py-3 px-4 font-black uppercase tracking-widest text-slate-400">Fase</th>
                      <th className="py-3 px-4 font-black uppercase tracking-widest text-slate-400 text-right">Manodopera</th>
                      <th className="py-3 px-4 font-black uppercase tracking-widest text-slate-400 text-right">Materiali</th>
                      <th className="py-3 px-4 font-black uppercase tracking-widest text-slate-400 text-right">Spese</th>
                      <th className="py-3 px-4 font-black uppercase tracking-widest text-slate-400 text-right">Costo Totale</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                    {phaseData.map((item, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50">
                        <td className="py-3 px-4 font-black uppercase text-slate-800">{item.name}</td>
                        <td className="py-3 px-4 text-right text-slate-500">€ {item.laborCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-3 px-4 text-right text-slate-500">€ {item.materialCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-3 px-4 text-right text-slate-500">€ {item.expenseCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="py-3 px-4 text-right text-slate-900 font-black">€ {item.totalCost.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 text-[0.65rem] font-black uppercase tracking-widest">
              Nessuna attività (ore, materiali, spese) registrata per questo centro di costo.
            </div>
          )}
        </Card>
      )}
    </div>
  )
}

export default DashboardTab
