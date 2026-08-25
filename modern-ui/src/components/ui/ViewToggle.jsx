import React from 'react'
import { LayoutGrid, List } from 'lucide-react'

/**
 * Interruttore fra griglia di card ed elenco compatto.
 *
 * Le card vanno bene quando le voci sono poche e si sfogliano; oltre una certa
 * soglia costringono a scorrere per confrontare numeri che si dovrebbero
 * vedere insieme. La forma giusta dipende da quante cose ci sono, quindi la
 * si sceglie invece di imporla.
 */
const ViewToggle = ({ mode, onChange }) => {
  const options = [
    { id: 'cards', label: 'Card', icon: LayoutGrid },
    { id: 'list', label: 'Elenco', icon: List },
  ]

  return (
    <div className="flex items-center gap-1 bg-white/60 border border-white/60 p-1 rounded-xl shadow-sm">
      {options.map(option => (
        <button
          key={option.id}
          type="button"
          onClick={() => onChange(option.id)}
          title={`Vista ${option.label.toLowerCase()}`}
          aria-pressed={mode === option.id}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-[0.75rem] font-bold transition-colors cursor-pointer ${
            mode === option.id
              ? 'bg-white text-accent shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          <option.icon size={15} />
          <span className="hidden sm:inline">{option.label}</span>
        </button>
      ))}
    </div>
  )
}

export default ViewToggle
