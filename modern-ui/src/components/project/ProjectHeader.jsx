import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, User, MapPin, Clock, Plus, FileText, FileSpreadsheet, ChevronDown } from 'lucide-react'

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
  /*
    Dentro un centro di costo l'esportazione ha due significati possibili - il
    solo centro aperto, oppure l'intera commessa - e vanno chiesti. Fuori, la
    domanda non esiste: i due pulsanti restano come erano.
  */
  const [menuAperto, setMenuAperto] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuAperto) return undefined

    const alClick = (evento) => {
      if (menuRef.current && !menuRef.current.contains(evento.target)) {
        setMenuAperto(false)
      }
    }
    const alTasto = (evento) => {
      if (evento.key === 'Escape') setMenuAperto(false)
    }

    document.addEventListener('mousedown', alClick)
    document.addEventListener('keydown', alTasto)
    return () => {
      document.removeEventListener('mousedown', alClick)
      document.removeEventListener('keydown', alTasto)
    }
  }, [menuAperto])

  const esporta = (azione, soloCentroDiCosto) => {
    setMenuAperto(false)
    azione(soloCentroDiCosto)
  }

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
                <div className="px-3 py-1 bg-amber-500/10 text-amber-600 rounded-full text-[0.72rem] font-black uppercase tracking-widest font-black">
                  Centro di Costo
                </div>
              ) : (
                <div className="px-3 py-1 bg-accent/10 text-accent rounded-full text-[0.72rem] font-black uppercase tracking-widest font-black">
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
          {onExportClientPdf && onExportInternalPdf && !isCostCenter && (
            <div className="flex gap-2">
              <button
                onClick={() => onExportClientPdf(false)}
                className="flex items-center gap-2 px-4 py-3 bg-white/80 hover:bg-white text-indigo-600 border border-slate-100 hover:border-slate-200 rounded-xl text-[0.75rem] font-black uppercase tracking-widest shadow-sm hover:shadow active:scale-[0.98] transition-all cursor-pointer"
                title="Esporta PDF Cliente (Prezzi finali con rincaro, senza dettagli interni)"
              >
                <FileText size={14} />
                PDF Cliente
              </button>
              <button
                onClick={() => onExportInternalPdf(false)}
                className="flex items-center gap-2 px-4 py-3 bg-[#1e293b] hover:bg-slate-800 text-white rounded-xl text-[0.75rem] font-black uppercase tracking-widest shadow-sm hover:shadow active:scale-[0.98] transition-all cursor-pointer"
                title="Esporta PDF Report Interno (Costi, rincari e margine)"
              >
                <FileSpreadsheet size={14} />
                PDF Interno
              </button>
            </div>
          )}

          {/*
            Dentro un centro di costo: un solo pulsante che apre quattro voci
            esplicite. Due pulsanti con un comportamento implicito erano
            proprio il problema - producevano l'intera commessa mentre
            l'intestazione mostrava il centro di costo.
          */}
          {onExportClientPdf && onExportInternalPdf && isCostCenter && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuAperto(aperto => !aperto)}
                aria-haspopup="menu"
                aria-expanded={menuAperto}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-4 py-3 bg-[#1e293b] hover:bg-slate-800 text-white rounded-xl text-[0.75rem] font-black uppercase tracking-widest shadow-sm hover:shadow active:scale-[0.98] transition-all cursor-pointer"
                title="Esporta in PDF questo centro di costo oppure l'intera commessa"
              >
                <FileText size={14} />
                Esporta PDF
                <ChevronDown size={14} className={`transition-transform ${menuAperto ? 'rotate-180' : ''}`} />
              </button>

              {menuAperto && (
                <div
                  role="menu"
                  className="absolute right-0 z-50 mt-2 w-72 bg-white rounded-2xl border border-slate-100 shadow-2xl overflow-hidden animate-premium-in"
                >
                  <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-100">
                    <span className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-slate-400">
                      Solo questo centro di costo
                    </span>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => esporta(onExportClientPdf, true)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <FileText size={14} className="shrink-0 text-indigo-600" />
                    <span className="text-[0.75rem] font-black text-slate-700 uppercase tracking-wider">PDF Cliente</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => esporta(onExportInternalPdf, true)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet size={14} className="shrink-0 text-slate-700" />
                    <span className="text-[0.75rem] font-black text-slate-700 uppercase tracking-wider">PDF Interno</span>
                  </button>

                  <div className="px-4 py-3 bg-slate-50/80 border-y border-slate-100">
                    <span className="text-[0.62rem] font-black uppercase tracking-[0.2em] text-slate-400">
                      Tutta la commessa
                    </span>
                  </div>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => esporta(onExportClientPdf, false)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <FileText size={14} className="shrink-0 text-indigo-600" />
                    <span className="text-[0.75rem] font-black text-slate-700 uppercase tracking-wider">PDF Cliente</span>
                  </button>
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => esporta(onExportInternalPdf, false)}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <FileSpreadsheet size={14} className="shrink-0 text-slate-700" />
                    <span className="text-[0.75rem] font-black text-slate-700 uppercase tracking-wider">PDF Interno</span>
                  </button>
                </div>
              )}
            </div>
          )}
  
          {/* Tab Navigation */}
          {tabs && tabs.length > 0 && (
            <div className="relative flex gap-1 bg-white/50 backdrop-blur-md p-1.5 rounded-2xl border border-white/50 shadow-sm">
              {tabs.map((tab, index) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  title={`${tab.label} — Alt+${index + 1}`}
                  className={`relative flex items-center gap-2 px-5 py-3 rounded-xl text-[0.72rem] font-black uppercase tracking-widest transition-all z-10 ${
                    activeTab === tab.id ? 'text-white' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <tab.icon size={14} />
                  {tab.label}
                  {/* Il numero della scorciatoia, discreto ma visibile: e' cosi'
                      che si impara che Alt+3 porta ai Materiali. */}
                  <span className={`text-[0.7rem] font-bold tabular-nums ${
                    activeTab === tab.id ? 'text-white/60' : 'text-slate-400'
                  }`}>
                    {index + 1}
                  </span>
                  {activeTab === tab.id && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute inset-0 bg-accent rounded-xl -z-10 shadow-lg shadow-accent/20"
                      transition={{ type: 'spring', bounce: 0.15, duration: 0.25 }}
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
