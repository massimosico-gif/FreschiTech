import React, { useEffect, useMemo, useState } from 'react'
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
  AlertTriangle,
  ArrowRight,
  Clock,
  FileQuestion,
  TrendingDown,
  TrendingUp,
  Users,
  FileText,
  CreditCard,
  BarChart3,
  Euro
} from 'lucide-react'
import { formatEuro, formatAmount } from '@tecno/ui'
import { getRecentProjects } from '../utils/recentProjects'

const LELY_RED = '#E30613'

/** Sotto questa percentuale la commessa e' da guardare, anche se non in perdita. */
const MARGINE_SOTTILE = 10

/**
 * Elenco di cose su cui agire.
 *
 * Ogni riga porta dove serve: e' la differenza fra una schermata che mostra
 * numeri e una da cui si comincia la giornata.
 */
const ActionList = ({ title, icon: Icon, tone, items, emptyText, onOpenProject }) => {
  const toneClasses = {
    bad: 'text-rose-600 bg-rose-50',
    warn: 'text-amber-600 bg-amber-50',
    info: 'text-sky-600 bg-sky-50',
    neutral: 'text-slate-500 bg-slate-100',
  }[tone]

  return (
    <div className="glass-panel rounded-[2rem] p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <div className={`p-2.5 rounded-xl ${toneClasses}`}>
          <Icon size={18} />
        </div>
        <h3 className="text-[0.95rem] font-black text-slate-800 tracking-tight flex-1">{title}</h3>
        <span className="text-[0.8rem] font-black text-slate-500 tabular-nums">{items.length}</span>
      </div>

      {items.length === 0 ? (
        <p className="text-[0.8rem] font-semibold text-slate-500 py-2">{emptyText}</p>
      ) : (
        <ul className="flex flex-col -mx-2">
          {items.map(item => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onOpenProject(item.id)}
                className="w-full flex items-center gap-3 px-2 py-2.5 rounded-xl text-left hover:bg-white/70 transition-colors cursor-pointer group focus:outline-none focus-visible:ring-4 focus-visible:ring-accent/20"
              >
                <span className="flex-1 min-w-0">
                  <span className="block text-[0.85rem] font-bold text-slate-800 truncate">{item.name}</span>
                  <span className="block text-[0.75rem] font-semibold text-slate-500 truncate">
                    {item.client_name || 'Cliente non indicato'}
                  </span>
                </span>
                {item.detail && (
                  <span className={`text-[0.8rem] font-black tabular-nums shrink-0 ${item.detailTone || 'text-slate-600'}`}>
                    {item.detail}
                  </span>
                )}
                <ArrowRight size={14} className="text-slate-300 group-hover:text-accent transition-colors shrink-0" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

const Dashboard = ({ onOpenProject, onNavigate }) => {
  const [chartData, setChartData] = useState([])
  const [stats, setStats] = useState(null)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      invoke('get_stats').catch(() => null),
      invoke('get_projects').catch(() => []),
    ]).then(([statsData, projectList]) => {
      if (statsData) {
        setChartData(statsData.chart_data || [])
        setStats(statsData)
      }
      setProjects(Array.isArray(projectList) ? projectList : [])
      setLoading(false)
    })
  }, [])

  // ─── Le cose su cui agire ─────────────────────────────────────────
  const { inPerdita, margineSottile, senzaPreventivo, recenti } = useMemo(() => {
    const attive = projects.filter(p => p.status !== 'completed')

    const conPreventivo = attive.filter(p => (p.budget || 0) > 0)

    const inPerdita = conPreventivo
      .filter(p => (p.utile_previsto || 0) < 0)
      .sort((a, b) => (a.utile_previsto || 0) - (b.utile_previsto || 0))
      .map(p => ({
        ...p,
        detail: formatEuro(p.utile_previsto || 0),
        detailTone: 'text-rose-600',
      }))

    const margineSottile = conPreventivo
      .filter(p => {
        const utile = p.utile_previsto || 0
        if (utile < 0) return false
        const pct = (utile / p.budget) * 100
        return pct < MARGINE_SOTTILE
      })
      .map(p => ({
        ...p,
        detail: `${((p.utile_previsto || 0) / p.budget * 100).toFixed(1).replace('.', ',')}%`,
        detailTone: 'text-amber-600',
      }))

    // Costi registrati ma nessun preventivo accettato: si sta lavorando
    // senza sapere a quanto e' stato venduto.
    const senzaPreventivo = attive
      .filter(p => (p.budget || 0) === 0 && (p.costo_totale || 0) > 0)
      .map(p => ({
        ...p,
        detail: formatEuro(p.costo_totale || 0),
        detailTone: 'text-slate-600',
      }))

    const byId = new Map(projects.map(p => [String(p.id), p]))
    const recenti = getRecentProjects()
      .map(id => byId.get(String(id)))
      .filter(Boolean)
      .map(p => ({
        ...p,
        detail: (p.budget || 0) > 0 ? formatEuro(p.utile_previsto || 0) : null,
        detailTone: (p.utile_previsto || 0) < 0 ? 'text-rose-600' : 'text-emerald-600',
      }))

    return { inPerdita, margineSottile, senzaPreventivo, recenti }
  }, [projects])

  const tiles = useMemo(() => {
    if (!stats) return []
    return [
      { label: 'Totale preventivato', value: `€ ${formatAmount(stats.total_revenue)}`, icon: <TrendingUp size={20} />, color: LELY_RED },
      { label: 'Commesse attive', value: String(stats.invoices_count ?? 0), icon: <FileText size={20} />, color: '#3b82f6' },
      { label: 'Clienti', value: String(stats.clients_count ?? 0), icon: <Users size={20} />, color: '#8b5cf6' },
      { label: 'Costi cantieri', value: `€ ${formatAmount(stats.total_pending)}`, icon: <CreditCard size={20} />, color: '#f43f5e' },
      { label: 'Utile previsto', value: `€ ${formatAmount(stats.utile_previsto)}`, icon: <BarChart3 size={20} />, color: '#10b981' },
      { label: 'Utile sul budget', value: `€ ${formatAmount(stats.utile_effettivo)}`, icon: <Euro size={20} />, color: '#06b6d4' },
    ]
  }, [stats])

  if (loading) {
    return <div className="p-20 text-center text-[0.9rem] font-bold text-slate-500">Caricamento dati…</div>
  }

  const nienteDaFare =
    inPerdita.length === 0 && margineSottile.length === 0 && senzaPreventivo.length === 0

  return (
    <div className="space-y-8">
      {/* ─── Da guardare oggi ──────────────────────────────────────── */}
      <section className="space-y-4">
        <div className="flex items-baseline justify-between gap-4">
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Da guardare oggi</h2>
          <button
            type="button"
            onClick={() => onNavigate('projects')}
            className="text-[0.78rem] font-bold text-slate-500 hover:text-accent transition-colors cursor-pointer"
          >
            Tutte le commesse →
          </button>
        </div>

        {nienteDaFare && recenti.length === 0 ? (
          <div className="glass-panel rounded-[2rem] p-10 text-center">
            <p className="text-[0.95rem] font-bold text-slate-700">Nessuna commessa richiede attenzione.</p>
            <p className="text-[0.82rem] font-semibold text-slate-500 mt-1">
              Tutte le commesse attive hanno un preventivo accettato e un margine positivo.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <ActionList
              title="Commesse in perdita"
              icon={TrendingDown}
              tone="bad"
              items={inPerdita}
              emptyText="Nessuna commessa sta sforando il preventivo accettato."
              onOpenProject={onOpenProject}
            />
            <ActionList
              title={`Margine sotto il ${MARGINE_SOTTILE}%`}
              icon={AlertTriangle}
              tone="warn"
              items={margineSottile}
              emptyText="Nessuna commessa con margine risicato."
              onOpenProject={onOpenProject}
            />
            <ActionList
              title="Senza preventivo accettato"
              icon={FileQuestion}
              tone="info"
              items={senzaPreventivo}
              emptyText="Ogni commessa con costi ha un preventivo accettato."
              onOpenProject={onOpenProject}
            />
            <ActionList
              title="Riprendi da dove eri"
              icon={Clock}
              tone="neutral"
              items={recenti}
              emptyText="Le commesse aperte di recente compariranno qui."
              onOpenProject={onOpenProject}
            />
          </div>
        )}
      </section>

      {/* ─── I numeri, sotto le cose da fare ───────────────────────── */}
      <section className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {tiles.map((tile, idx) => (
          <div key={idx} className="glass-panel p-4 rounded-2xl flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl shrink-0"
              style={{ backgroundColor: `${tile.color}15`, color: tile.color }}
            >
              {tile.icon}
            </div>
            <div className="min-w-0">
              <p className="text-[0.7rem] font-black uppercase tracking-widest text-slate-500 truncate">{tile.label}</p>
              <p className="text-[1.05rem] font-black text-[#0f172a] tabular-nums truncate">{tile.value}</p>
            </div>
          </div>
        ))}
      </section>

      {/* ─── Il grafico, che resta ma non comanda ──────────────────── */}
      <section className="glass-panel p-8 rounded-[2.5rem]">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-lg font-black text-[#0f172a] tracking-tight">Andamento costi mensili</h2>
            <p className="text-[0.75rem] font-semibold text-slate-500 mt-0.5">
              Costi totali registrati nell'anno corrente
            </p>
          </div>
          <div className="px-4 py-1.5 bg-accent/10 text-accent rounded-full text-[0.75rem] font-black tabular-nums border border-accent/20">
            {new Date().getFullYear()}
          </div>
        </div>

        <div className="h-[300px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(15, 23, 42, 0.05)" />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                dy={10}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#475569', fontSize: 12, fontWeight: 600 }}
                tickFormatter={(value) => `€${value}`}
              />
              <Tooltip
                cursor={{ fill: 'rgba(227, 6, 19, 0.05)', radius: 10 }}
                contentStyle={{
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  border: '1px solid rgba(226, 232, 240, 0.8)',
                  borderRadius: '1rem',
                  boxShadow: '0 10px 30px rgba(0,0,0,0.08)',
                  padding: '0.75rem'
                }}
                itemStyle={{ color: LELY_RED, fontWeight: 800 }}
                labelStyle={{ color: '#0f172a', fontWeight: 800, marginBottom: '0.35rem' }}
              />
              <Bar dataKey="total" radius={[8, 8, 8, 8]} barSize={24}>
                {chartData.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={entry.total > 4000 ? LELY_RED : 'rgba(227, 6, 19, 0.4)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  )
}

export default Dashboard
