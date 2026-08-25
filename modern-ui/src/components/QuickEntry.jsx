import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { invoke } from '@tauri-apps/api/core'
import { ArrowRight, Check, HardHat, Package, Receipt, X } from 'lucide-react'
import Kbd from './ui/Kbd'
import DatePicker from './ui/DatePicker'
import useAutocomplete from '../hooks/useAutocomplete'
import { formatEuro } from '../utils/format'

/**
 * Inserimento rapido, da qualunque schermata (Ctrl+N).
 *
 * Registrare un materiale costava cinque click e due griglie di card da
 * scorrere: barra laterale, Commesse, trova la card, Dettagli, trova il
 * centro di costo, Dettagli, scheda Materiali. Qui commessa e centro di costo
 * si scelgono *dentro* il form, e il pannello resta aperto dopo il
 * salvataggio per la voce successiva.
 */

const TYPES = [
  { id: 'material', label: 'Materiale', icon: Package },
  { id: 'labor', label: 'Manodopera', icon: HardHat },
  { id: 'expense', label: 'Spesa', icon: Receipt },
]

const today = () => new Date().toISOString().split('T')[0]

const emptyForms = () => ({
  material: {
    code: '', description: '', supplier: '',
    quantity: 1, unit: 'pz', unit_price: 0, markup: 0.25,
  },
  labor: {
    operator: '', description: '', hours: 0, hourly_cost: 30, markup: 0.5,
  },
  expense: {
    description: '', supplier: '', amount: 0, markup: 0,
  },
})

const Field = ({ label, children, className = '' }) => (
  <div className={`space-y-1.5 ${className}`}>
    <label className="block text-[0.7rem] font-black uppercase tracking-widest text-slate-500 ml-1">
      {label}
    </label>
    {children}
  </div>
)

const inputClass =
  'w-full bg-white border border-slate-200 rounded-xl px-3 py-2.5 text-[0.85rem] font-semibold text-slate-700 focus:outline-none focus:ring-4 focus:ring-accent/10 focus:border-accent/50 transition-all'

const QuickEntry = ({ onClose, onOpenProject }) => {
  const [type, setType] = useState('material')
  const [projects, setProjects] = useState([])
  const [costCenters, setCostCenters] = useState([])
  const [employees, setEmployees] = useState([])
  const [projectId, setProjectId] = useState('')
  const [costCenterId, setCostCenterId] = useState('')
  const [date, setDate] = useState(today)
  const [forms, setForms] = useState(emptyForms)
  const [saving, setSaving] = useState(false)
  const [lastSaved, setLastSaved] = useState(null)
  const [error, setError] = useState(null)

  const firstFieldRef = useRef(null)
  const form = forms[type]

  const {
    suggestions, activeField, highlightedIndex, setHighlightedIndex,
    requestSuggestions, clear: clearSuggestions, handleKeyDown: autocompleteKeyDown,
  } = useAutocomplete()

  /** Carica i centri di costo della commessa indicata. */
  const loadCostCenters = useCallback((id) => {
    if (!id) return
    invoke('get_cost_centers', { projectId: Number(id) })
      .then(list => setCostCenters(Array.isArray(list) ? list : []))
      .catch(() => setCostCenters([]))
  }, [])

  /**
   * Cambio di commessa.
   *
   * Il centro di costo si azzera qui e non in un effetto: cambiando commessa
   * quello scelto non esiste piu', e registrare una voce sotto il centro di
   * un'altra commessa sarebbe un errore silenzioso.
   */
  const chooseProject = useCallback((id) => {
    setProjectId(id)
    setCostCenterId('')
    setCostCenters([])
    if (id) {
      localStorage.setItem('quick_entry_project', String(id))
      loadCostCenters(id)
    }
  }, [loadCostCenters])

  // ─── Caricamento anagrafiche ──────────────────────────────────────
  // Il pannello viene montato all'apertura, quindi questo gira una volta sola
  // per sessione di inserimento.
  useEffect(() => {
    let cancelled = false
    Promise.all([
      invoke('get_projects').catch(() => []),
      invoke('get_employees').catch(() => []),
    ]).then(([p, e]) => {
      if (cancelled) return
      const list = Array.isArray(p) ? p : []
      setProjects(list)
      setEmployees(Array.isArray(e) ? e : [])
      // L'ultima commessa usata e' quasi sempre quella giusta: la si
      // ritrova gia' selezionata invece di ricercarla ogni volta.
      const remembered = localStorage.getItem('quick_entry_project')
      const stillExists = list.some(x => String(x.id) === remembered)
      const initial = stillExists ? remembered : (list[0] ? String(list[0].id) : '')
      setProjectId(initial)
      if (initial) loadCostCenters(initial)
    })
    return () => { cancelled = true }
  }, [loadCostCenters])

  // Il fuoco va sul primo campo a ogni cambio di tipo di voce.
  useEffect(() => {
    const timer = setTimeout(() => firstFieldRef.current?.focus(), 60)
    return () => clearTimeout(timer)
  }, [type])

  const setField = useCallback((key, value) => {
    setForms(prev => ({ ...prev, [type]: { ...prev[type], [key]: value } }))
  }, [type])

  /** Applica un articolo di listino al form materiale. */
  const applyCatalogItem = (item) => {
    setForms(prev => ({
      ...prev,
      material: {
        ...prev.material,
        code: item.code || prev.material.code,
        description: item.description || prev.material.description,
        unit: item.unit || prev.material.unit,
        unit_price: item.unit_price ?? prev.material.unit_price,
        supplier: item.supplier || prev.material.supplier,
        markup: item.markup > 0 ? item.markup : 0.25,
      },
    }))
    clearSuggestions()
  }

  const isValid = useMemo(() => {
    if (!projectId) return false
    if (type === 'material') {
      return !!form.description.trim() && Number(form.quantity) > 0
    }
    if (type === 'labor') {
      return !!form.operator.trim() && Number(form.hours) > 0
    }
    return !!form.description.trim() && Number(form.amount) > 0
  }, [type, form, projectId])

  const save = async () => {
    if (!isValid || saving) return
    setSaving(true)
    setError(null)

    const common = {
      project_id: Number(projectId),
      cost_center_id: costCenterId ? Number(costCenterId) : null,
      // Le voci inserite al volo restano generali: l'assegnazione alla fase
      // si fa dalla commessa, dove si vede l'elenco completo.
      phase: null,
      date,
    }

    try {
      if (type === 'material') {
        await invoke('save_material', {
          mat: {
            ...common,
            code: form.code,
            description: form.description,
            supplier: form.supplier,
            quantity: Number(form.quantity) || 0,
            unit: form.unit || 'pz',
            unit_price: Number(form.unit_price) || 0,
            markup: Number(form.markup) || 0,
          },
        })
        setLastSaved(`${form.description} — ${formatEuro(Number(form.quantity) * Number(form.unit_price))}`)
      } else if (type === 'labor') {
        const employee = employees.find(e => e.name === form.operator)
        await invoke('save_labor', {
          labor: {
            ...common,
            operator: form.operator,
            description: form.description,
            hours: Number(form.hours) || 0,
            hourly_cost: employee?.default_hourly_cost ?? (Number(form.hourly_cost) || 0),
            markup: Number(form.markup) || 0,
            is_travel: false,
            vehicle: 'Nessuno',
            travel_cost: 0,
          },
        })
        setLastSaved(`${form.operator} — ${form.hours} h`)
      } else {
        await invoke('save_expense', {
          expense: {
            ...common,
            description: form.description,
            supplier: form.supplier,
            amount: Number(form.amount) || 0,
            markup: Number(form.markup) || 0,
          },
        })
        setLastSaved(`${form.description} — ${formatEuro(Number(form.amount))}`)
      }

      // Si azzerano solo i campi che cambiano da una voce all'altra: commessa,
      // centro di costo, fase e data restano, come nel box di inserimento.
      setForms(prev => ({ ...prev, [type]: emptyForms()[type] }))
      firstFieldRef.current?.focus()
    } catch (err) {
      setError(String(err))
    } finally {
      setSaving(false)
    }
  }

  const handlePanelKeyDown = (e) => {
    if (e.defaultPrevented) return
    if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    } else if (e.key === 'Enter' && e.target.tagName === 'INPUT') {
      e.preventDefault()
      save()
    }
  }

  const currentProject = projects.find(p => String(p.id) === String(projectId))

  return createPortal(
    <div
      className="fixed inset-0 z-[450] flex items-start justify-center pt-[8vh] px-6 bg-slate-900/30 backdrop-blur-[2px]"
      onMouseDown={onClose}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        onKeyDown={handlePanelKeyDown}
        className="w-full max-w-3xl bg-white rounded-3xl border border-white/60 shadow-2xl overflow-hidden"
      >
        {/* Testata: tipo di voce e chiusura */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-slate-100">
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-2xl">
            {TYPES.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => setType(t.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[0.78rem] font-bold transition-colors cursor-pointer ${
                  type === t.id ? 'bg-white text-accent shadow-sm' : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <t.icon size={15} />
                {t.label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:flex items-center gap-1.5 text-slate-400">
              <Kbd>Invio</Kbd><span className="text-[0.75rem] font-semibold">salva</span>
              <Kbd className="ml-1">Esc</Kbd><span className="text-[0.75rem] font-semibold">chiudi</span>
            </span>
            <button type="button" onClick={onClose} className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Destinazione: commessa, centro di costo, fase, data */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <Field label="Commessa *" className="md:col-span-2">
              <select
                value={projectId}
                onChange={(e) => chooseProject(e.target.value)}
                className={inputClass}
              >
                <option value="">Scegli una commessa…</option>
                {projects.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.client_name ? ` — ${p.client_name}` : ''}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Centro di costo">
              <select
                value={costCenterId}
                onChange={(e) => setCostCenterId(e.target.value)}
                className={inputClass}
                disabled={!projectId}
              >
                <option value="">Generale</option>
                {costCenters.map(cc => (
                  <option key={cc.id} value={cc.id}>
                    {cc.brand ? `${cc.brand} ` : ''}{cc.model}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Data">
              <DatePicker compact value={date} onChange={setDate} />
            </Field>
          </div>

          {/* Campi della voce */}
          {type === 'material' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <Field label="Codice" className="md:col-span-2">
                <div className="relative">
                  <input
                    ref={firstFieldRef}
                    type="text"
                    value={form.code}
                    autoComplete="off"
                    onChange={(e) => { setField('code', e.target.value); requestSuggestions('qe_code', e.target.value, 'catalog') }}
                    onKeyDown={(e) => autocompleteKeyDown(e, 'qe_code', applyCatalogItem)}
                    onBlur={() => setTimeout(clearSuggestions, 200)}
                    className={inputClass}
                    placeholder="Codice…"
                  />
                  {activeField === 'qe_code' && suggestions.length > 0 && (
                    <Suggestions items={suggestions} highlighted={highlightedIndex} onHover={setHighlightedIndex} onPick={applyCatalogItem} />
                  )}
                </div>
              </Field>

              <Field label="Descrizione *" className="md:col-span-6">
                <div className="relative">
                  <input
                    type="text"
                    value={form.description}
                    autoComplete="off"
                    onChange={(e) => { setField('description', e.target.value); requestSuggestions('qe_desc', e.target.value, 'catalog') }}
                    onKeyDown={(e) => autocompleteKeyDown(e, 'qe_desc', applyCatalogItem)}
                    onBlur={() => setTimeout(clearSuggestions, 200)}
                    className={inputClass}
                    placeholder="Descrizione articolo…"
                  />
                  {activeField === 'qe_desc' && suggestions.length > 0 && (
                    <Suggestions items={suggestions} highlighted={highlightedIndex} onHover={setHighlightedIndex} onPick={applyCatalogItem} />
                  )}
                </div>
              </Field>

              <Field label="Q.tà *" className="md:col-span-1">
                <input type="number" step="any" value={form.quantity}
                  onChange={(e) => setField('quantity', e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className={`${inputClass} text-right`} />
              </Field>

              <Field label="U.M." className="md:col-span-1">
                <input type="text" value={form.unit} onChange={(e) => setField('unit', e.target.value)} className={inputClass} />
              </Field>

              <Field label="Prezzo cad." className="md:col-span-2">
                <input type="number" step="0.01" value={form.unit_price}
                  onChange={(e) => setField('unit_price', e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className={`${inputClass} text-right`} />
              </Field>
            </div>
          )}

          {type === 'labor' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <Field label="Operatore *" className="md:col-span-4">
                <select
                  ref={firstFieldRef}
                  value={form.operator}
                  onChange={(e) => setField('operator', e.target.value)}
                  className={inputClass}
                >
                  <option value="">Scegli…</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.name}>{emp.name}</option>
                  ))}
                </select>
              </Field>

              <Field label="Descrizione" className="md:col-span-5">
                <input type="text" value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  className={inputClass} placeholder="Cosa e' stato fatto…" />
              </Field>

              <Field label="Ore *" className="md:col-span-1">
                <input type="number" step="0.5" value={form.hours}
                  onChange={(e) => setField('hours', e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className={`${inputClass} text-right`} />
              </Field>

              <Field label="Costo orario" className="md:col-span-2">
                <input type="number" step="0.5" value={form.hourly_cost}
                  onChange={(e) => setField('hourly_cost', e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className={`${inputClass} text-right`} />
              </Field>
            </div>
          )}

          {type === 'expense' && (
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <Field label="Descrizione *" className="md:col-span-6">
                <input ref={firstFieldRef} type="text" value={form.description}
                  onChange={(e) => setField('description', e.target.value)}
                  className={inputClass} placeholder="Descrizione della spesa…" />
              </Field>

              <Field label="Fornitore" className="md:col-span-4">
                <input type="text" value={form.supplier}
                  onChange={(e) => setField('supplier', e.target.value)}
                  className={inputClass} placeholder="Fornitore…" />
              </Field>

              <Field label="Importo *" className="md:col-span-2">
                <input type="number" step="0.01" value={form.amount}
                  onChange={(e) => setField('amount', e.target.value)}
                  onFocus={(e) => e.target.select()}
                  className={`${inputClass} text-right`} />
              </Field>
            </div>
          )}

          {error && (
            <p className="text-[0.8rem] font-bold text-rose-600 bg-rose-50 border border-rose-100 rounded-xl px-4 py-3">
              {error}
            </p>
          )}
        </div>

        {/* Piede: esito dell'ultimo salvataggio e azioni */}
        <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-slate-100 bg-slate-50/60">
          <div className="min-w-0">
            {lastSaved ? (
              <p className="flex items-center gap-2 text-[0.8rem] font-bold text-emerald-700 truncate">
                <Check size={15} className="shrink-0" /> Registrato: {lastSaved}
              </p>
            ) : (
              <p className="text-[0.78rem] font-semibold text-slate-500 truncate">
                {currentProject ? `Le voci finiscono in “${currentProject.name}”.` : 'Scegli una commessa per cominciare.'}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {currentProject && (
              <button
                type="button"
                onClick={() => { onOpenProject(currentProject.id); onClose() }}
                className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[0.78rem] font-bold text-slate-500 hover:text-accent hover:bg-white transition-colors cursor-pointer"
              >
                Apri la commessa <ArrowRight size={14} />
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!isValid || saving}
              className={`px-6 py-2.5 rounded-xl text-[0.8rem] font-bold transition-colors ${
                !isValid || saving
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-accent text-white hover:bg-accent/90 shadow-md shadow-accent/20 cursor-pointer'
              }`}
            >
              {saving ? 'Salvataggio…' : 'Registra'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  )
}

/** Tendina dei suggerimenti di listino, condivisa dai due campi. */
const Suggestions = ({ items, highlighted, onHover, onPick }) => (
  <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl max-h-60 overflow-y-auto z-50 p-2 space-y-1">
    {items.map((item, index) => (
      <div
        key={item.id ?? index}
        onMouseDown={(e) => { e.preventDefault(); onPick(item) }}
        onMouseEnter={() => onHover(index)}
        className={`flex items-center justify-between gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
          index === highlighted ? 'bg-accent/10' : 'hover:bg-slate-50'
        }`}
      >
        <span className="min-w-0">
          <span className="block text-[0.8rem] font-bold text-slate-800 truncate">{item.description}</span>
          <span className="block text-[0.72rem] font-semibold text-slate-500 truncate">
            {[item.code, item.supplier].filter(Boolean).join(' · ')}
          </span>
        </span>
        <span className="text-[0.8rem] font-black text-slate-700 tabular-nums shrink-0">
          € {Number(item.unit_price ?? 0).toFixed(2)}
        </span>
      </div>
    ))}
  </div>
)

export default QuickEntry
