import React from 'react'

const SectionHeader = ({ icon: Icon, title, subtitle, color = '#8bc53f' }) => {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div 
        className="p-2.5 rounded-xl shadow-sm" 
        style={{ backgroundColor: `${color}15`, color: color }}
      >
        <Icon size={20} />
      </div>
      <div className="flex flex-col">
        <h3 className="text-sm font-black uppercase tracking-wider text-slate-700">{title}</h3>
        {subtitle && <p className="text-[0.6rem] font-black uppercase tracking-[0.2em] text-slate-400">{subtitle}</p>}
      </div>
    </div>
  )
}

export default SectionHeader
