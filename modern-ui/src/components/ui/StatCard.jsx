import React from 'react'
import Card from './Card'

const StatCard = ({ label, value, icon: Icon, color = "text-slate-800", trend }) => (
  <Card className="p-8 hover:bg-accent hover:text-white group transition-all duration-500">
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-white/70 transition-colors">{label}</p>
        <h3 className={`text-2xl font-black tracking-tight transition-colors ${color} group-hover:text-white`}>{value}</h3>
        {trend && (
          <p className={`text-[0.6rem] font-bold ${trend > 0 ? 'text-green-500' : 'text-rose-500'} group-hover:text-white`}>
            {trend > 0 ? '+' : ''}{trend}% rispetto al preventivo
          </p>
        )}
      </div>
      <div className={`p-4 rounded-2xl bg-slate-50 transition-all duration-500 group-hover:bg-white group-hover:text-accent ${color}`}>
        <Icon size={24} />
      </div>
    </div>
  </Card>
)

export default StatCard
