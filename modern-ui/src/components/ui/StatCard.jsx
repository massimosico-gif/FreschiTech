import React from 'react'
import Card from './Card'

const StatCard = ({ label, value, icon: Icon, color = "text-slate-800", trend }) => (
  <Card className="p-5 sm:p-6 hover:bg-accent hover:text-white group transition-all duration-500 overflow-hidden">
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-1.5 min-w-0 flex-1">
        <p className="text-[0.6rem] sm:text-[0.65rem] font-black uppercase tracking-[0.15em] text-slate-400 group-hover:text-white/70 transition-colors leading-relaxed break-words">{label}</p>
        <h3 className={`text-lg sm:text-xl md:text-2xl font-black tracking-tight transition-colors ${color} group-hover:text-white break-all sm:break-normal`}>{value}</h3>
        {trend && (
          <p className={`text-[0.55rem] sm:text-[0.6rem] font-bold ${trend > 0 ? 'text-green-500' : 'text-rose-500'} group-hover:text-white`}>
            {trend > 0 ? '+' : ''}{trend}% rispetto al preventivo
          </p>
        )}
      </div>
      <div className={`p-2.5 sm:p-3.5 rounded-2xl bg-slate-50 transition-all duration-500 group-hover:bg-white group-hover:text-accent flex-shrink-0 ${color}`}>
        <Icon size={20} className="sm:size-6" />
      </div>
    </div>
  </Card>
)

export default StatCard
