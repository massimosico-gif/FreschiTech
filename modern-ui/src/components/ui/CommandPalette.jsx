import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { invoke } from '@tauri-apps/api/core'
import {
  Briefcase,
  LayoutDashboard,
  Package,
  Search,
  Settings as SettingsIcon,
  Target,
  Users,
  FileText,
} from 'lucide-react'
import Kbd from './Kbd'

/**
 * Ricerca globale, aperta con Ctrl+K.
 *
 * Ritrovare una commessa significava tornare all'elenco e cercare la card a
 * vista. Qui si scrivono tre lettere e si preme Invio: commesse, clienti,
 * centri di costo e articoli di listino sono tutti nello stesso elenco.
 *
 * Commesse e clienti stanno in memoria (sono poche centinaia di righe, il
 * filtro e' istantaneo); i centri di costo si caricano per la commessa
 * corrispondente e il listino passa dal backend, che ha l'indice giusto.
 */

const MAX_PER_GROUP = 5

const NAV_ACTIONS = [
  { id: 'nav-dashboard', view: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'nav-clients', view: 'clients', label: 'Clienti', icon: Users },
  { id: 'nav-projects', view: 'projects', label: 'Commesse', icon: Briefcase },
  { id: 'nav-quotes', view: 'quotes', label: 'Preventivi', icon: FileText },
  { id: 'nav-settings', view: 'settings', label: 'Impostazioni', icon: SettingsIcon },
]

const matches = (haystack, needle) =>
  String(haystack ?? '').toLowerCase().includes(needle)

const CommandPalette = ({ onClose, onOpenProject, onOpenCostCenter, onNavigate }) => {
  const [query, setQuery] = useState('')
  const [projects, setProjects] = useState([])
  const [clients, setClients] = useState([])
  const [costCenters, setCostCenters] = useState([])
  const [catalog, setCatalog] = useState([])
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef(null)
  const listRef = useRef(null)

  // Anagrafiche ricaricate a ogni apertura: sono due query e garantiscono
  // che una commessa appena creata sia subito trovabile.
  useEffect(() => {
    let cancelled = false
    Promise.all([
      invoke('get_projects').catch(() => []),
      invoke('get_clients').catch(() => []),
    ]).then(([p, c]) => {
      if (cancelled) return
      setProjects(Array.isArray(p) ? p : [])
      setClients(Array.isArray(c) ? c : [])
    })
    return () => { cancelled = true }
  }, [])

  const trimmed = query.trim().toLowerCase()

  // Centri di costo: caricati una sola volta per apertura, non a ogni tasto.
  // Il backend li espone per commessa, quindi serve una query per commessa:
  // farlo mentre si digita significherebbe rifarle tutte a ogni carattere.
  useEffect(() => {
    if (projects.length === 0) return
    let cancelled = false

    Promise.all(
      projects.slice(0, 60).map(p =>
        invoke('get_cost_centers', { projectId: Number(p.id) })
          .then(list => (Array.isArray(list) ? list : []).map(cc => ({ ...cc, projectName: p.name })))
          .catch(() => [])
      )
    ).then(lists => {
      if (!cancelled) setCostCenters(lists.flat())
    })

    return () => { cancelled = true }
  }, [projects])

  // Listino: la ricerca vive nel backend, con debounce per non interrogare
  // il catalogo a ogni tasto. Sotto i due caratteri non si interroga affatto,
  // e i risultati vecchi vengono semplicemente ignorati in lettura invece che
  // azzerati con un setState dentro l'effetto.
  useEffect(() => {
    if (trimmed.length < 2) return
    let cancelled = false
    const timer = setTimeout(() => {
      invoke('search_catalog_materials', { query: trimmed })
        .then(res => { if (!cancelled) setCatalog(Array.isArray(res) ? res.slice(0, MAX_PER_GROUP) : []) })
        .catch(() => { if (!cancelled) setCatalog([]) })
    }, 250)
    return () => { cancelled = true; clearTimeout(timer) }
  }, [trimmed])

  const results = useMemo(() => {
    if (!trimmed) {
      return NAV_ACTIONS.map(a => ({
        key: a.id,
        group: 'Vai a',
        icon: a.icon,
        title: a.label,
        run: () => onNavigate(a.view),
      }))
    }

    const projectHits = projects
      .filter(p => matches(p.name, trimmed) || matches(p.client_name, trimmed) || matches(p.address, trimmed))
      .slice(0, MAX_PER_GROUP)
      .map(p => ({
        key: `project-${p.id}`,
        group: 'Commesse',
        icon: Briefcase,
        title: p.name,
        subtitle: p.client_name || '',
        run: () => onOpenProject(p.id),
      }))

    const ccHits = costCenters
      .filter(cc => matches(cc.model, trimmed) || matches(cc.brand, trimmed))
      .slice(0, MAX_PER_GROUP)
      .map(cc => ({
        key: `cc-${cc.project_id}-${cc.id}`,
        group: 'Centri di costo',
        icon: Target,
        title: `${cc.brand ? cc.brand + ' ' : ''}${cc.model}`,
        subtitle: cc.projectName,
        run: () => onOpenCostCenter(cc.project_id, cc.id),
      }))

    const clientHits = clients
      .filter(c => matches(c.name, trimmed) || matches(c.city, trimmed) || matches(c.vat_id, trimmed))
      .slice(0, MAX_PER_GROUP)
      .map(c => ({
        key: `client-${c.id}`,
        group: 'Clienti',
        icon: Users,
        title: c.name,
        subtitle: [c.city, c.phone].filter(Boolean).join(' · '),
        run: () => onNavigate('clients'),
      }))

    // Sotto i due caratteri i risultati di listino rimasti in memoria non
    // valgono piu': si ignorano qui, senza azzerare lo stato.
    const listino = (trimmed.length >= 2 ? catalog : []).map(item => ({
      key: `catalog-${item.id}`,
      group: 'Listino',
      icon: Package,
      title: item.description,
      subtitle: [item.code, item.supplier].filter(Boolean).join(' · '),
      // Il listino qui e' solo consultazione: mostra il prezzo senza spostarsi.
      run: null,
      trailing: item.unit_price != null
        ? `€ ${Number(item.unit_price).toFixed(2)}`
        : null,
    }))

    const navHits = NAV_ACTIONS
      .filter(a => matches(a.label, trimmed))
      .map(a => ({
        key: a.id,
        group: 'Vai a',
        icon: a.icon,
        title: a.label,
        run: () => onNavigate(a.view),
      }))

    return [...projectHits, ...ccHits, ...clientHits, ...listino, ...navHits]
  }, [trimmed, projects, clients, costCenters, catalog, onOpenProject, onOpenCostCenter, onNavigate])

  // Mantiene visibile la voce evidenziata quando ci si muove con le frecce.
  useEffect(() => {
    listRef.current
      ?.querySelector(`[data-index="${highlighted}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [highlighted])

  const choose = useCallback((result) => {
    if (!result?.run) return
    result.run()
    onClose()
  }, [onClose])

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlighted(prev => (results.length ? (prev + 1) % results.length : 0))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlighted(prev => (results.length ? (prev - 1 + results.length) % results.length : 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(results[highlighted])
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  let lastGroup = null

  return (
    <div
      className="fixed inset-0 z-[500] flex items-start justify-center pt-[12vh] px-6 bg-slate-900/25 backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-3xl border border-white/60 shadow-2xl overflow-hidden"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
          <Search size={18} className="text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            autoFocus
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setHighlighted(0) }}
            onKeyDown={handleKeyDown}
            placeholder="Cerca commesse, clienti, centri di costo, articoli…"
            className="flex-1 bg-transparent border-none outline-none text-[0.95rem] font-semibold text-slate-800 placeholder:text-slate-400"
          />
          <Kbd>Esc</Kbd>
        </div>

        <div ref={listRef} className="max-h-[52vh] overflow-y-auto p-2">
          {results.length === 0 ? (
            <p className="px-4 py-10 text-center text-[0.85rem] font-semibold text-slate-400">
              Nessun risultato per “{query}”.
            </p>
          ) : (
            results.map((result, index) => {
              const showGroup = result.group !== lastGroup
              lastGroup = result.group
              const Icon = result.icon
              return (
                <React.Fragment key={result.key}>
                  {showGroup && (
                    <p className="px-3 pt-3 pb-1.5 text-[0.7rem] font-black uppercase tracking-widest text-slate-400">
                      {result.group}
                    </p>
                  )}
                  <button
                    type="button"
                    data-index={index}
                    onMouseEnter={() => setHighlighted(index)}
                    onClick={() => choose(result)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-colors ${
                      index === highlighted ? 'bg-accent/10' : 'hover:bg-slate-50'
                    } ${result.run ? 'cursor-pointer' : 'cursor-default'}`}
                  >
                    <Icon size={16} className={index === highlighted ? 'text-accent' : 'text-slate-400'} />
                    <span className="flex-1 min-w-0">
                      <span className="block text-[0.85rem] font-bold text-slate-800 truncate">{result.title}</span>
                      {result.subtitle && (
                        <span className="block text-[0.75rem] font-semibold text-slate-500 truncate">{result.subtitle}</span>
                      )}
                    </span>
                    {result.trailing && (
                      <span className="text-[0.8rem] font-black text-slate-700 tabular-nums shrink-0">{result.trailing}</span>
                    )}
                  </button>
                </React.Fragment>
              )
            })
          )}
        </div>

        <div className="flex items-center gap-2 px-5 py-3 border-t border-slate-100 bg-slate-50/60 text-slate-500">
          <Kbd>↑</Kbd><Kbd>↓</Kbd>
          <span className="text-[0.75rem] font-semibold mr-3">scorri</span>
          <Kbd>Invio</Kbd>
          <span className="text-[0.75rem] font-semibold mr-3">apri</span>
          <Kbd>Ctrl N</Kbd>
          <span className="text-[0.75rem] font-semibold">inserimento rapido</span>
        </div>
      </div>
    </div>
  )
}

export default CommandPalette
