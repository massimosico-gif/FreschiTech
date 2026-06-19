import React from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, User, MapPin, Clock, Plus, FileText, FileSpreadsheet } from 'lucide-react'

const ProjectHeader = ({ 
  project, 
  client, 
  activeTab, 
  setActiveTab, 
  tabs, 
  onBack,
  onExportClientPdf,
  onExportInternalPdf,
  isCostCenter,
  parentProjectName
}) => {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-[0.7rem] font-black uppercase tracking-widest text-slate-400 font-sans">
            <ArrowLeft size={16} className="text-slate-400 mr-1" />
            <button 
              onClick={() => isCostCenter ? onBack(true) : onBack()} 
              className="hover:text-accent transition-colors cursor-pointer"
            >
              Commesse
            </button>
            <span className="text-slate-300">/</span>
            {isCostCenter ? (
              <>
                <button 
                  onClick={() => onBack(false)} 
                  className="hover:text-accent transition-colors text-slate-600 cursor-pointer"
                >
                  {parentProjectName}
                </button>
                <span className="text-slate-300">/</span>
                <span className="text-accent">{project.name}</span>
              </>
            ) : (
              <span className="text-slate-600">{project.name}</span>
            )}
          </div>
          
          <div>
            <div className="flex items-center gap-3 mb-2">
              {isCostCenter ? (
                <div className="px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full text-[0.6rem] font-black uppercase tracking-widest font-black">
                  Centro di Costo
                </div>
              ) : (
                <div className="px-3 py-1 bg-accent/10 text-accent rounded-full text-[0.6rem] font-black uppercase tracking-widest font-black">
                  {project.status === 'active' ? 'Commessa Attiva' : 'Completata'}
                </div>
              )}
              {!isCostCenter && <span className="text-[0.7rem] font-bold text-slate-300">ID: #{project.id}</span>}
              {isCostCenter && (
                <span className="text-[0.7rem] font-bold text-slate-400">
                  Commessa: <strong className="text-slate-600">{parentProjectName}</strong>
                </span>
              )}
            </div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tighter leading-none">{project.name}</h1>
          </div>
        </div>
  
        {/* Tab Navigation & Actions */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
          {/* PDF Buttons */}
          {onExportClientPdf && onExportInternalPdf && (
            <div className="flex gap-2">
              <button
                onClick={onExportClientPdf}
                className="flex items-center gap-2 px-4 py-3 bg-white/80 hover:bg-white text-indigo-600 border border-slate-100 hover:border-slate-200 rounded-xl text-[0.65rem] font-black uppercase tracking-widest shadow-sm hover:shadow active:scale-[0.98] transition-all cursor-pointer"
                title="Esporta PDF Cliente (Prezzi finali con rincaro, senza dettagli interni)"
              >
                <FileText size={14} />
                PDF Cliente
              </button>
              <button
                onClick={onExportInternalPdf}
                className="flex items-center gap-2 px-4 py-3 bg-[#1e293b] hover:bg-slate-800 text-white rounded-xl text-[0.65rem] font-black uppercase tracking-widest shadow-sm hover:shadow active:scale-[0.98] transition-all cursor-pointer"
                title="Esporta PDF Report Interno (Costi, rincari e margine)"
              >
                <FileSpreadsheet size={14} />
                PDF Interno
              </button>
            </div>
          )}
  
          {/* Tab Navigation */}
          {tabs && tabs.length > 0 && (
            <div className="relative flex gap-1 bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-white/50 shadow-sm overflow-x-auto max-w-full whitespace-nowrap">
              {tabs.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative flex items-center gap-2 px-5 py-3 rounded-xl text-[0.65rem] font-black uppercase tracking-widest transition-all z-10 shrink-0 ${
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
          )}
        </div>
      </div>

      {/* Metadata for projects (rendered below) */}
      {!isCostCenter && (
        <div className="flex flex-wrap items-center gap-6 pt-4 border-t border-slate-100/80">
          <div className="flex items-center gap-2 text-slate-500">
            <User size={16} className="text-accent" />
            <span className="text-sm font-bold">{client?.name}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <MapPin size={16} className="text-accent" />
            <span className="text-sm font-bold">{project?.address || 'Nessun indirizzo'}</span>
          </div>
          <div className="flex items-center gap-2 text-slate-500">
            <Clock size={16} className="text-accent" />
            <span className="text-sm font-bold">Distanza: {project?.distance || 0} km</span>
          </div>
        </div>
      )}
    </div>
  )
}

export default ProjectHeader
