import React, { useState, useEffect } from 'react'
import { X, Calendar, FileText, Euro, Target, Layers, Truck, Activity, Users } from 'lucide-react'
import DrawerShell from './ui/DrawerShell'
import Select from './ui/Select'
import MultiSelect from './ui/MultiSelect'
import DatePicker from './ui/DatePicker'
import { invoke } from '@tauri-apps/api/core'

const EditExpenseDrawer = ({ isOpen, onClose, expense, projectId, costCenters, onSave }) => {
  // Brand Configuration (Centralized Color)
  const brandColor = 'accent'; // Lely Red

  const [employees, setEmployees] = useState([])
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([])

  const initialData = {
    project_id: projectId,
    cost_center_id: null,
    phase: 'Generale',
    date: new Date().toISOString().split('T')[0],
    description: '',
    supplier: '',
    amount: 0,
    markup: 0.00
  }

  const [formData, setFormData] = useState(initialData)
  const [isChanged, setIsChanged] = useState(false)

  useEffect(() => {
    const fetchEmployees = async () => {
      try {
        const data = await invoke('get_employees')
        setEmployees(data || [])
      } catch (err) { console.error(err) }
    }
    if (isOpen) fetchEmployees()
  }, [isOpen])

  useEffect(() => {
    if (expense) {
      setFormData({
        ...expense,
        date: expense.date ? expense.date.split('T')[0] : new Date().toISOString().split('T')[0]
      })
      setIsChanged(false)
    } else {
      setFormData(initialData)
      setSelectedEmployeeIds([])
      setIsChanged(false)
    }
  }, [expense, isOpen])

  const handleChange = (field, value) => {
    setFormData(prev => {
      const newData = { ...prev, [field]: value }
      setIsChanged(JSON.stringify(newData) !== JSON.stringify(expense || initialData))
      return newData
    })
  }

  const phaseOptions = [
    { id: 'Generale', label: 'Generale' },
    { id: 'Robotica', label: 'Robotica' },
    { id: 'Impiantistica', label: 'Impiantistica' },
    { id: 'Opere Civili', label: 'Opere Civili' }
  ]

  const ccOptions = [
    { id: null, label: 'Nessuno (Spesa Generale)' },
    ...costCenters.map(cc => ({ id: cc.id, label: cc.model }))
  ]

  const employeeOptions = (employees || []).map(e => ({ id: e.id, label: e.name }))

  const handleSubmit = (e) => {
    e.preventDefault()
    
    // Se ci sono più operatori selezionati, aggiungiamo i loro nomi alla descrizione
    let finalDescription = formData.description
    if (selectedEmployeeIds.length > 0) {
      const names = selectedEmployeeIds.map(id => employees.find(emp => emp.id === id)?.name).filter(Boolean).join(', ')
      finalDescription = `${formData.description} (${names})`
    }

    onSave({
      ...formData,
      description: finalDescription,
      amount: parseFloat(formData.amount),
      markup: parseFloat(formData.markup)
    })
  }

  return (
    <DrawerShell isOpen={isOpen} onClose={onClose} title={expense ? "Modifica Spesa" : "Nuova Spesa"}>
      <form onSubmit={handleSubmit} className="space-y-10 p-1">
        
        {/* SEZIONE 1: SQUADRA E DATA (Identica a Ore) */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className={`w-1.5 h-6 bg-${brandColor} rounded-full`}></div>
            <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-800">Squadra e Data</span>
          </div>
          
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">Operatori coinvolti</label>
              <MultiSelect 
                options={employeeOptions}
                selectedValues={selectedEmployeeIds}
                onChange={setSelectedEmployeeIds}
                placeholder="Seleziona squadra..."
                icon={Users}
              />
            </div>
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">Data Spesa</label>
              <DatePicker 
                value={formData.date} 
                onChange={(val) => handleChange('date', val)} 
              />
            </div>
          </div>
        </section>

        {/* SEZIONE 2: DETTAGLI SPESA */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-amber-400 rounded-full"></div>
            <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-800">Dettagli Spesa</span>
          </div>

          <div className="space-y-2">
            <label className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">Descrizione / Tipo Spesa</label>
            <div className="relative group">
              <FileText className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-${brandColor} transition-colors`} size={18} />
              <input 
                required
                type="text"
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Es: Pranzo, Hotel, Carburante..."
                onFocus={(e) => setTimeout(() => e.target.select(), 0)}
                className={`w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-${brandColor}/20 transition-all`}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">Fornitore / Nota</label>
              <div className="relative group">
                <Truck className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-${brandColor} transition-colors`} size={18} />
                <input 
                  type="text"
                  value={formData.supplier}
                  onChange={(e) => handleChange('supplier', e.target.value)}
                  placeholder="Nome locale o esercente..."
                  onFocus={(e) => setTimeout(() => e.target.select(), 0)}
                  className={`w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-${brandColor}/20 transition-all`}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">Centro di Costo</label>
              <Select 
                options={ccOptions}
                value={formData.cost_center_id}
                onChange={(val) => handleChange('cost_center_id', val)}
                icon={Target}
              />
            </div>
          </div>
        </section>

        {/* SEZIONE 3: IMPORTI E RIASSUNTO */}
        <section className="space-y-6">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-6 bg-emerald-400 rounded-full"></div>
            <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-800">Costi e Ricarico</span>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">Importo Totale (€)</label>
              <div className="relative group">
                <Euro className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-${brandColor} transition-colors`} size={18} />
                <input 
                  required
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleChange('amount', e.target.value)}
                  onFocus={(e) => setTimeout(() => e.target.select(), 0)}
                  className={`w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-${brandColor}/20 transition-all`}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">Ricarico (%)</label>
              <div className="relative group">
                <Activity className={`absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-${brandColor} transition-colors`} size={18} />
                <input 
                  required
                  type="number"
                  step="1"
                  value={formData.markup * 100}
                  onChange={(e) => handleChange('markup', parseFloat(e.target.value) / 100)}
                  onFocus={(e) => setTimeout(() => e.target.select(), 0)}
                  className={`w-full bg-slate-50 border-none rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:ring-2 focus:ring-${brandColor}/20 transition-all`}
                />
              </div>
            </div>
          </div>

          <div className={`p-6 bg-${brandColor} text-white rounded-[2.5rem] border border-white/20 flex justify-between items-center shadow-xl shadow-${brandColor}/20`}>
            <div>
              <p className="text-[0.6rem] font-black uppercase tracking-widest opacity-70">Totale a Carico Cliente</p>
              <p className="text-2xl font-black">
                € {(formData.amount * (1 + formData.markup)).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[0.6rem] font-black uppercase tracking-widest opacity-60">Costo Vivo</p>
              <p className="text-lg font-black opacity-90">
                € {Number(formData.amount).toLocaleString('it-IT', { minimumFractionDigits: 2 })}
              </p>
            </div>
          </div>
        </section>

        <div className="pt-6 border-t border-slate-100 flex gap-4">
          <button 
            type="button"
            onClick={onClose}
            className="flex-1 py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 transition-all"
          >
            Annulla
          </button>
          <button 
            type="submit"
            disabled={(expense && !isChanged) || (!expense && (!formData.description || formData.amount <= 0))}
            className={`flex-[2] py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest shadow-xl transition-all ${
              ((expense && !isChanged) || (!expense && (!formData.description || formData.amount <= 0)))
              ? 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
              : `bg-${brandColor} text-white hover:bg-${brandColor}/90 shadow-${brandColor}/20`
            }`}
          >
            {expense ? 'Salva Modifiche' : 'Registra Spesa'}
          </button>
        </div>
      </form>
    </DrawerShell>
  )
}

export default EditExpenseDrawer
