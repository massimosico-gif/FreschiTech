import React, { useState } from 'react'
import { Database, RefreshCw, Briefcase, Building2, HardHat, Archive, FileSpreadsheet } from 'lucide-react'

import CompanySettings from './settings/CompanySettings'
import CategoriesSettings from './settings/CategoriesSettings'
import ResourcesSettings from './settings/ResourcesSettings'
import UpdaterSettings from './settings/UpdaterSettings'
import Team from './Team'
import DbBackupSettings from './settings/DbBackupSettings'
import ImportListiniSettings from './settings/ImportListiniSettings'

const Settings = () => {
  const [activeTab, setActiveTab] = useState('azienda')

  const groups = [
    {
      title: 'Azienda & Risorse',
      items: [
        { id: 'azienda', label: 'Azienda', icon: <Building2 size={16} /> },
        { id: 'squadra', label: 'Squadra', icon: <HardHat size={16} /> },
        { id: 'mezzi', label: 'Mezzi & Risorse', icon: <Briefcase size={16} /> }
      ]
    },
    {
      title: 'Dati Tecnici',
      items: [
        { id: 'categorie', label: 'Categorie & Fasi', icon: <Database size={16} /> },
        { id: 'import_listini', label: 'Importa Listini', icon: <FileSpreadsheet size={16} /> }
      ]
    },
    {
      title: 'Sistema & Manutenzione',
      items: [
        { id: 'dati_log', label: 'Dati & Log', icon: <Archive size={16} /> },
        { id: 'updates', label: 'Aggiornamenti', icon: <RefreshCw size={16} /> }
      ]
    }
  ]

  return (
    <div className="space-y-8 animate-premium-in pb-20">
      <div>
        <h1 className="text-3xl font-black text-slate-800 tracking-tight">Impostazioni Sistema</h1>
        <p className="text-[0.7rem] font-black uppercase tracking-[0.3em] text-slate-400 mt-1">Gestione dati aziendali e parametri tecnici</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* SIDEBAR */}
        <aside className="w-full lg:w-72 bg-white/40 backdrop-blur-md border border-white/60 rounded-[2.5rem] p-6 shadow-xl space-y-6 shrink-0">
          {groups.map((group, gIdx) => (
            <div key={gIdx} className="space-y-2">
              <h4 className="text-[0.6rem] font-black text-slate-400 uppercase tracking-[0.2em] px-3">{group.title}</h4>
              <div className="space-y-1">
                {group.items.map(item => {
                  const isActive = activeTab === item.id
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-[0.68rem] font-black uppercase tracking-wider transition-all duration-300 ${
                        isActive 
                        ? 'bg-slate-900 text-white shadow-lg shadow-black/10' 
                        : 'text-slate-500 hover:bg-white/60 hover:text-slate-800'
                      }`}
                    >
                      <span className={`${isActive ? 'text-white' : 'text-slate-400'}`}>
                        {item.icon}
                      </span>
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </aside>

        {/* CONTENT */}
        <main className="flex-1 w-full min-w-0">
          {activeTab === 'azienda' && <CompanySettings />}
          {activeTab === 'squadra' && <Team />}
          {activeTab === 'mezzi' && <ResourcesSettings />}
          {activeTab === 'categorie' && <CategoriesSettings />}
          {activeTab === 'dati_log' && <DbBackupSettings />}
          {activeTab === 'import_listini' && <ImportListiniSettings />}
          {activeTab === 'updates' && <UpdaterSettings />}
        </main>
      </div>
    </div>
  )
}

export default Settings
