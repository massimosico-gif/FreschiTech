import React, { useState, useEffect, useMemo } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Plus, Search, User, Loader2, Euro, Trash2, Edit3, HardHat } from 'lucide-react'
import EntityCard from './ui/EntityCard'
import ConfirmModal from './ui/ConfirmModal'
import DrawerShell from './ui/DrawerShell'

const Team = () => {
  const [search, setSearch] = useState('')
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)
  const [employeeToDelete, setEmployeeToDelete] = useState(null)
  
  // Controlled form states
  const [name, setName] = useState('')
  const [cost, setCost] = useState(30.00)

  useEffect(() => {
    if (isDrawerOpen) {
      setName(selectedEmployee?.name || '')
      setCost(selectedEmployee?.default_hourly_cost !== undefined ? selectedEmployee.default_hourly_cost : 30.00)
    }
  }, [isDrawerOpen, selectedEmployee])

  const isSaveDisabled = useMemo(() => {
    const parsedCost = parseFloat(cost)
    const isValid = name.trim() !== '' && !isNaN(parsedCost) && parsedCost >= 0
    if (!isValid) return true
    if (selectedEmployee) {
      return name === selectedEmployee.name && parsedCost === selectedEmployee.default_hourly_cost
    }
    return false
  }, [name, cost, selectedEmployee])

  const loadEmployees = async () => {
    setLoading(true)
    try {
      const data = await invoke('get_employees')
      setEmployees(data)
    } catch (err) {
      console.error("Errore caricamento dipendenti:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadEmployees()
  }, [])

  const filteredEmployees = employees.filter(e => 
    e.name.toLowerCase().includes(search.toLowerCase())
  )

  const handleSave = async (e) => {
    e.preventDefault()
    if (isSaveDisabled) return
    const employee = {
      id: selectedEmployee?.id || null,
      name: name.trim(),
      default_hourly_cost: parseFloat(cost)
    }

    try {
      await invoke('save_employee', { employee })
      setIsDrawerOpen(false)
      loadEmployees()
    } catch (err) {
      alert("Errore salvataggio: " + err)
    }
  }

  const handleDelete = async () => {
    if (employeeToDelete) {
      try {
        await invoke('delete_employee', { id: employeeToDelete })
        setIsConfirmOpen(false)
        loadEmployees()
      } catch (err) {
        alert("Errore eliminazione: " + err)
      }
    }
  }

  return (
    <div className="space-y-8 animate-premium-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-800 tracking-tight">Squadra</h1>
          <p className="text-[0.7rem] font-black uppercase tracking-[0.3em] text-slate-400 mt-1">Anagrafica operatori e costi</p>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-accent transition-colors" size={18} />
            <input 
              type="text" 
              placeholder="Cerca operatore..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-white/50 backdrop-blur-md border border-white/50 rounded-2xl py-3 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all w-64 shadow-sm"
            />
          </div>
          
          <button 
            onClick={() => { setSelectedEmployee(null); setIsDrawerOpen(true); }}
            className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-accent/30 transition-all hover:-translate-y-1"
          >
            <Plus size={18} />
            Aggiungi Operatore
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 text-slate-400 gap-4">
          <Loader2 size={40} className="animate-spin" />
          <span className="text-[0.7rem] font-black uppercase tracking-widest">Caricamento squadra...</span>
        </div>
      ) : filteredEmployees.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredEmployees.map(emp => (
            <EntityCard 
              key={emp.id}
              icon={<User size={24} />}
              title={emp.name}
              subtitle={`Costo Orario Default: € ${emp.default_hourly_cost.toFixed(2)}`}
              onEdit={() => { setSelectedEmployee(emp); setIsDrawerOpen(true); }}
              onDelete={() => { setEmployeeToDelete(emp.id); setIsConfirmOpen(true); }}
              onClick={() => { setSelectedEmployee(emp); setIsDrawerOpen(true); }}
              footerItems={[
                { icon: <Euro size={12} />, label: `${emp.default_hourly_cost.toFixed(2)} / h` }
              ]}
            />
          ))}
        </div>
      ) : (
        <div className="glass-panel p-20 text-center rounded-[3.5rem] border-2 border-dashed border-slate-200">
          <div className="w-16 h-16 bg-slate-100 rounded-3xl flex items-center justify-center mx-auto mb-6 text-slate-300">
            <HardHat size={32} />
          </div>
          <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Nessun operatore in squadra</h3>
          <p className="text-slate-400 text-sm mt-2">Aggiungi i tuoi dipendenti o collaboratori per iniziare.</p>
        </div>
      )}

      <DrawerShell 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        title={selectedEmployee ? "Modifica Operatore" : "Nuovo Operatore"}
      >
        <form onSubmit={handleSave} className="space-y-6">
          <div className="space-y-2">
            <label className="text-[0.75rem] font-black uppercase tracking-widest text-slate-400 ml-1">Nome e Cognome</label>
            <input 
              required
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onFocus={(e) => setTimeout(() => e.target.select(), 0)}
              className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-accent/20 transition-all"
            />
          </div>
          <div className="space-y-2">
            <label className="text-[0.75rem] font-black uppercase tracking-widest text-slate-400 ml-1">Costo Orario Standard (€)</label>
            <input 
              required
              type="number"
              step="0.01"
              name="cost"
              value={cost}
              onChange={(e) => setCost(e.target.value === '' ? '' : parseFloat(e.target.value))}
              onFocus={(e) => setTimeout(() => e.target.select(), 0)}
              className="w-full bg-slate-50 border-none rounded-2xl py-4 px-6 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-accent/20 transition-all"
            />
          </div>
          <button 
            type="submit"
            disabled={isSaveDisabled}
            className={`w-full py-4 rounded-2xl font-black text-xs uppercase tracking-widest transition-all mt-4 ${
              isSaveDisabled 
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none' 
                : 'bg-accent text-white hover:bg-accent/90 shadow-xl shadow-accent/20'
            }`}
          >
            {selectedEmployee ? 'Salva Modifiche' : 'Aggiungi alla Squadra'}
          </button>
        </form>
      </DrawerShell>

      <ConfirmModal 
        isOpen={isConfirmOpen}
        onClose={() => setIsConfirmOpen(false)}
        onConfirm={handleDelete}
        title="Rimuovi Operatore"
        message="Sei sicuro di voler rimuovere questo operatore dalla squadra?"
      />
    </div>
  )
}

export default Team
