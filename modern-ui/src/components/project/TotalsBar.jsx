import React from 'react'
import { TrendingDown, TrendingUp } from 'lucide-react'
import { formatEuro } from '@tecno/ui'

/**
 * Barra dei totali, fissa in fondo alla commessa.
 *
 * Mentre si inseriscono materiali il margine non era visibile: bisognava
 * cambiare scheda per saperlo, cioe' scoprire di aver sforato quando non
 * c'era piu' niente da fare. I numeri arrivano gia' pronti da
 * `computeProjectTotals`, qui c'e' solo da mostrarli.
 */

const Figure = ({ label, value, tone = 'neutral', hint }) => {
  const toneClass = {
    neutral: 'text-slate-800',
    good: 'text-emerald-600',
    bad: 'text-rose-600',
  }[tone]

  return (
    <div className="flex flex-col gap-0.5 min-w-0">
      <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-500">
        {label}
      </span>
      <span className={`text-[0.95rem] font-black tabular-nums leading-tight ${toneClass}`}>
        {value}
      </span>
      {hint && (
        <span className="text-[0.7rem] font-semibold text-slate-500 tabular-nums leading-tight">
          {hint}
        </span>
      )}
    </div>
  )
}

const TotalsBar = ({ stats, isCostCenter }) => {
  if (!stats) return null

  const { costoTotale, valoreLavori, preventivoAccettato, utile, utileListino } = stats

  // Con un preventivo accettato il margine che conta e' quello reale; senza,
  // l'unico riferimento disponibile e' il margine a listino.
  const hasBudget = preventivoAccettato > 0
  const margine = hasBudget ? utile : utileListino
  const base = hasBudget ? preventivoAccettato : valoreLavori
  const marginePct = base > 0 ? (margine / base) * 100 : 0

  const tone = margine < 0 ? 'bad' : 'good'
  const TrendIcon = margine < 0 ? TrendingDown : TrendingUp

  return (
    <div className="sticky bottom-4 z-30 mt-8">
      <div className="flex flex-wrap items-center gap-x-10 gap-y-4 bg-white/85 backdrop-blur-md border border-white/60 rounded-2xl px-6 py-3.5 shadow-[0_8px_24px_rgba(15,23,42,0.10)]">
        <div className="flex items-center gap-2 pr-2 border-r border-slate-200">
          <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-500">
            {isCostCenter ? 'Centro di costo' : 'Commessa'}
          </span>
        </div>

        <Figure label="Costo" value={formatEuro(costoTotale)} />
        <Figure label="Valore a listino" value={formatEuro(valoreLavori)} />
        {hasBudget && (
          <Figure label="Preventivo accettato" value={formatEuro(preventivoAccettato)} />
        )}

        <div className="flex items-center gap-2.5 ml-auto">
          <div className={`p-2 rounded-xl ${margine < 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
            <TrendIcon size={18} />
          </div>
          <Figure
            label={hasBudget ? 'Margine' : 'Margine a listino'}
            value={formatEuro(margine)}
            tone={tone}
            hint={`${marginePct.toFixed(1).replace('.', ',')}%`}
          />
        </div>
      </div>
    </div>
  )
}

export default TotalsBar
