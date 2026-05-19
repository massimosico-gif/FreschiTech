import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts'
import { 
  TrendingUp, 
  Users, 
  FileText, 
  CreditCard,
  BarChart3,
  Euro
} from 'lucide-react'
import { formatNumber } from '../utils/format'

const Dashboard = () => {
  const [data, setData] = useState([])
  const [stats, setStats] = useState([])
  const [loading, setLoading] = useState(true)

  const LELY_RED = '#E30613'

  useEffect(() => {
    invoke('get_stats')
      .then(resData => {
        setData(resData.chart_data || [])
        
        setStats([
          { label: 'Totale Preventivato', value: `€ ${formatNumber(resData.total_revenue)}`, icon: <TrendingUp size={24} />, color: LELY_RED },
          { label: 'Progetti Attivi', value: resData.invoices_count.toString(), icon: <FileText size={24} />, color: '#3b82f6' },
          { label: 'Clienti Lely', value: resData.clients_count.toString(), icon: <Users size={24} />, color: '#8b5cf6' },
          { label: 'Costi Totali Cantieri', value: `€ ${formatNumber(resData.total_pending)}`, icon: <CreditCard size={24} />, color: '#f43f5e' },
          { label: 'Utile Previsto', value: `€ ${formatNumber(resData.utile_previsto)}`, icon: <BarChart3 size={24} />, color: '#10b981' },
          { label: 'Utile Effettivo (Rispetto al budget)', value: `€ ${formatNumber(resData.utile_effettivo)}`, icon: <Euro size={24} />, color: '#06b6d4' },
        ])
        setLoading(false)
      })
      .catch(err => {
        console.error("Errore caricamento statistiche:", err)
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="p-20 text-center font-black uppercase tracking-widest text-slate-400">Caricamento dati...</div>

  return (
    <div className="space-y-8 animate-premium-in">
      {/* Griglia Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat, idx) => (
          <div 
            key={idx} 
            className="glass-panel p-6 rounded-[2.5rem] shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-500 group"
          >
            <div className="flex items-center gap-4">
              <div 
                className="p-4 rounded-2xl shadow-sm transition-all duration-500" 
                style={{ backgroundColor: `${stat.color}15`, color: stat.color }}
              >
                {stat.icon}
              </div>
              <div>
                <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">{stat.label}</p>
                <h3 className="text-xl font-black text-[#0f172a]">{stat.value}</h3>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Grafico Performance */}
        <div className="glass-panel p-10 rounded-[3.5rem] shadow-sm hover:shadow-xl hover:-translate-y-2 transition-all duration-500">
          <div className="flex items-center justify-between mb-10">
            <div>
              <h2 className="text-xl font-black text-[#0f172a] tracking-tight">Andamento Costi Mensili</h2>
              <p className="text-[0.6rem] font-black uppercase tracking-[0.3em] text-slate-400 mt-1">Costi totali registrati nell'anno corrente</p>
            </div>
            <div className={`px-4 py-1.5 bg-accent/10 text-accent rounded-full text-[0.6rem] font-black uppercase tracking-widest border border-accent/20`}>
              {new Date().getFullYear()}
            </div>
          </div>

          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15, 23, 42, 0.05)" />
                <XAxis 
                  dataKey="name" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                  dy={10}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 10, fontWeight: 700 }}
                  tickFormatter={(value) => `€${value}`}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(227, 6, 19, 0.05)', radius: 10 }}
                  contentStyle={{ 
                    backgroundColor: 'rgba(255, 255, 255, 0.9)', 
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.5)', 
                    borderRadius: '1.5rem', 
                    boxShadow: '0 10px 30px rgba(0,0,0,0.05)',
                    padding: '1rem'
                  }}
                  itemStyle={{ color: LELY_RED, fontWeight: 900 }}
                  labelStyle={{ color: '#0f172a', fontWeight: 900, marginBottom: '0.5rem' }}
                />
                <Bar 
                  dataKey="total" 
                  radius={[8, 8, 8, 8]} 
                  barSize={24}
                >
                  {data.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.total > 4000 ? LELY_RED : 'rgba(227, 6, 19, 0.4)'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Dashboard
