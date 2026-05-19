import React, { useState } from 'react'
import { Mail, Percent, Database, RefreshCw, Briefcase, CreditCard, Building2, HardHat } from 'lucide-react'


import CompanySettings from './settings/CompanySettings'
import CategoriesSettings from './settings/CategoriesSettings'
import ResourcesSettings from './settings/ResourcesSettings'
import UpdaterSettings from './settings/UpdaterSettings'
import Team from './Team'

const Settings = () => {
  const [activeTab, setActiveTab] = useState('azienda')

  const tabs = [
    { id: 'azienda', label: 'Azienda', icon: <Building2 size={16} /> },
    { id: 'squadra', label: 'Squadra', icon: <HardHat size={16} /> },
    { id: 'mezzi', label: 'Mezzi & Risorse', icon: <Briefcase size={16} /> },
    { id: 'categorie', label: 'Categorie & Fasi', icon: <Database size={16} /> },
    { id: 'updates', label: 'Aggiornamenti', icon: <RefreshCw size={16} /> }
  ]

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-premium-in pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Impostazioni Sistema</h1>
          <p className="text-[0.7rem] font-black uppercase tracking-[0.3em] text-slate-400 mt-1">Gestione dati aziendali e parametri tecnici</p>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex p-1.5 bg-white/40 backdrop-blur-md border border-white/60 rounded-[2rem] shadow-xl w-full relative overflow-hidden h-[58px]">
        {/* Sliding Indicator */}
        <div 
          className="absolute top-1.5 bottom-1.5 bg-slate-900 rounded-[1.5rem] transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-lg shadow-black/20 z-0"
          style={{
            width: `calc(${100 / tabs.length}% - 8px)`,
            left: `calc(${tabs.findIndex(t => t.id === activeTab) * (100 / tabs.length)}% + 4px)`
          }}
        />

        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`relative z-10 flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-[1.5rem] text-[0.65rem] font-black uppercase tracking-widest transition-colors duration-500 ${
              activeTab === tab.id 
              ? 'text-white' 
              : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <span className={activeTab === tab.id ? 'text-white' : ''}>
              {tab.icon}
            </span>
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
        {activeTab === 'azienda' && <CompanySettings />}
        {activeTab === 'squadra' && <Team />}
        {activeTab === 'mezzi' && <ResourcesSettings />}
        {activeTab === 'categorie' && <CategoriesSettings />}
        {activeTab === 'updates' && <UpdaterSettings />}
      </div>
    </div>
  )
}

export default Settings
