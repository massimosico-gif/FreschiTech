import React from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, User, MapPin, Clock, Plus } from 'lucide-react'

const ProjectHeader = ({ project, client, activeTab, setActiveTab, tabs, onBack }) => {
  return (
    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
      <div className="space-y-6">
        <button onClick={onBack} className="flex items-center gap-2 text-slate-400 hover:text-accent transition-colors group">
          <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
          <span className="text-[0.7rem] font-black uppercase tracking-widest">Torna alle commesse</span>
        </button>
        
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="px-3 py-1 bg-accent/10 text-accent rounded-full text-[0.6rem] font-black uppercase tracking-widest">
              {project.status === 'active' ? 'Commessa Attiva' : 'Completata'}
            </div>
            <span className="text-[0.7rem] font-bold text-slate-300">ID: #{project.id}</span>
          </div>
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter leading-none">{project.name}</h1>
          
          <div className="flex items-center gap-6 mt-4">
            <div className="flex items-center gap-2 text-slate-500">
              <User size={16} className="text-accent" />
              <span className="text-sm font-bold">{client?.name}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <MapPin size={16} className="text-accent" />
              <span className="text-sm font-bold">{client?.city}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <Clock size={16} className="text-accent" />
              <span className="text-sm font-bold">Distanza: {client?.distance || 0} km</span>
            </div>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="relative flex gap-1 bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-white/50 shadow-sm">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative flex items-center gap-2 px-5 py-3 rounded-xl text-[0.65rem] font-black uppercase tracking-widest transition-all z-10 ${
              activeTab === tab.id ? 'text-white' : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <tab.icon size={14} />
            {tab.label}
            {activeTab === tab.id && (
              <motion.div
                layoutId="activeTab"
                className="absolute inset-0 bg-accent rounded-xl -z-10 shadow-lg shadow-accent/20"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        ))}
      </div>
    </div>
  )
}

export default ProjectHeader
