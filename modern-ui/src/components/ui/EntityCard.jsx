import React from 'react'
import { ChevronRight, Trash2, Edit2 } from 'lucide-react'
import Card from './Card'

const EntityCard = ({ 
  icon: Icon, 
  title, 
  subtitle, 
  subtitleIcon: SubtitleIcon,
  badge,
  badgeColor = 'bg-slate-50 text-slate-400',
  footerItems = [], 
  stats = [],
  onClick, 
  onDelete,
  onEdit
}) => {
  return (
    <div className="h-full relative group" onClick={() => {
      console.log("EntityCard: CLICK SUL WRAPPER ESTERNO di", title);
      if (onClick) onClick();
    }}>
      <Card 
        hoverEffect={true} 
        className="cursor-pointer transition-all duration-500 hover:bg-accent hover:shadow-2xl hover:shadow-accent/40 group overflow-hidden"
      >
        <div className="p-8 space-y-6 flex flex-col h-full relative z-10 transition-colors duration-500">
          {/* Header: Icon & Badge/Actions */}
          <div className="flex items-start justify-between">
            <div className="p-4 bg-slate-50 rounded-[1.5rem] text-accent group-hover:bg-white group-hover:text-accent transition-all duration-500 shadow-sm">
              {Icon}
            </div>
            <div className="flex items-center gap-1">
              {badge && (
                <div className={`px-4 py-1.5 rounded-full text-[0.6rem] font-black uppercase tracking-widest transition-all duration-500 ${badgeColor} group-hover:bg-white/20 group-hover:text-white`}>
                  {badge}
                </div>
              )}
              {onEdit && (
                <button 
                  onClick={(e) => { 
                    console.log("EntityCard: CLICK MATITA");
                    e.stopPropagation(); 
                    onEdit(); 
                  }}
                  className="p-2 text-slate-300 group-hover:text-white/70 hover:group-hover:text-white transition-colors"
                  title="Modifica"
                >
                  <Edit2 size={16} />
                </button>
              )}
              {onDelete && (
                <button 
                  onClick={(e) => { 
                    console.log("EntityCard: CLICK CESTINO");
                    e.stopPropagation(); 
                    onDelete(); 
                  }}
                  className="p-2 text-slate-300 group-hover:text-white/70 hover:group-hover:text-white transition-colors"
                  title="Elimina"
                >
                  <Trash2 size={16} />
                </button>
              )}
            </div>
          </div>

          {/* Content: Title & Subtitle */}
          <div className="flex-1 space-y-4">
            <div>
              <h3 className="text-xl font-black text-slate-800 tracking-tight leading-tight group-hover:text-white transition-colors duration-500">
                {title}
              </h3>
              <div className="flex items-center gap-2 mt-2 text-slate-400 group-hover:text-white/60 transition-colors duration-500">
                {SubtitleIcon && <SubtitleIcon size={14} />}
                <span className="text-[0.7rem] font-bold uppercase tracking-wider">
                  {subtitle || 'N/D'}
                </span>
              </div>
            </div>

            {/* Rich stats panel */}
            {stats && stats.length > 0 && (
              <div className="grid grid-cols-3 gap-4 pt-4 pb-2 border-t border-slate-50 group-hover:border-white/10 transition-colors duration-500">
                {stats.map((stat, idx) => (
                  <div key={idx} className="space-y-1">
                    <p className="text-[0.55rem] font-black uppercase tracking-[0.05em] text-slate-400 group-hover:text-white/60 transition-colors duration-500">
                      {stat.label}
                    </p>
                    <p className={`text-xs font-extrabold transition-colors duration-500 ${
                      stat.highlight 
                        ? (stat.value && stat.value.includes('-') 
                           ? 'text-rose-500 group-hover:text-rose-200' 
                           : 'text-emerald-500 group-hover:text-white') 
                        : 'text-slate-700 group-hover:text-white'
                    }`}>
                      {stat.value}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer: Stats & Action */}
          <div className="pt-6 border-t border-slate-100 group-hover:border-white/10 flex items-center justify-between transition-colors duration-500">
            <div className="flex items-center gap-4">
              {footerItems.map((item, idx) => (
                <div key={idx} className="flex items-center gap-1.5 text-slate-400 group-hover:text-white/60 transition-colors duration-500">
                  {item.icon}
                  <span className="text-[0.65rem] font-bold">{item.label}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center gap-1 text-accent group-hover:text-white font-black text-[0.7rem] opacity-0 group-hover:opacity-100 transition-all -translate-x-2 group-hover:translate-x-0 duration-500">
              DETTAGLI <ChevronRight size={14} />
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

export default EntityCard
