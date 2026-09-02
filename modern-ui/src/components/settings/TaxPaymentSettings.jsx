import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { Percent, CreditCard, Briefcase, Plus, Save, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import FormInput from '../ui/FormInput'
import { useConfirm } from '../../hooks/useFeedback'

const TaxPaymentSettings = () => {
  const confirm = useConfirm()
  const [taxRates, setTaxRates] = useState([])
  const [paymentConditions, setPaymentConditions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })

  useEffect(() => {
    Promise.all([invoke('get_tax_rates'), invoke('get_payment_conditions')])
      .then(([rates, conditions]) => {
        setTaxRates(Array.isArray(rates) ? rates : [])
        setPaymentConditions(Array.isArray(conditions) ? conditions : [])
        setLoading(false)
      })
      .catch(err => {
        setStatus({ type: 'error', message: 'Errore caricamento: ' + err })
        setLoading(false)
      })
  }, [])

  const handleAddTaxRate = () => setTaxRates(prev => [{ id: null, name: 'Nuova Aliquota', rate: 0 }, ...prev])
  const handleUpdateTaxRate = (index, field, value) => {
    const newRates = [...taxRates]
    newRates[index][field] = field === 'rate' ? parseFloat(value) || 0 : value
    setTaxRates(newRates)
  }
  const handleSaveTaxRate = async (index) => {
    setSaving(true)
    try {
      const id = await invoke('save_tax_rate', { rate: taxRates[index] })
      const newRates = [...taxRates]
      newRates[index].id = id
      setTaxRates(newRates)
      setStatus({ type: 'success', message: 'Aliquota salvata!' })
      setTimeout(() => setStatus({ type: '', message: '' }), 3000)
    } catch (err) {
      setStatus({ type: 'error', message: 'Errore: ' + err })
    } finally {
      setSaving(false)
    }
  }
  const handleDeleteTaxRate = async (index) => {
    if (!taxRates[index].id) {
      setTaxRates(taxRates.filter((_, i) => i !== index))
      return
    }
    if (!(await confirm({
      title: 'Eliminare l\'aliquota?',
      message: 'L\'aliquota verra\' rimossa definitivamente.',
    }))) return
    try {
      await invoke('delete_tax_rate', { id: taxRates[index].id })
      setTaxRates(taxRates.filter((_, i) => i !== index))
      setStatus({ type: 'success', message: 'Aliquota eliminata!' })
    } catch (err) {
      setStatus({ type: 'error', message: 'Errore: ' + err })
    }
  }

  const handleAddPaymentCondition = () => setPaymentConditions(prev => [{ id: null, name: 'Nuova Condizione', days_delay: 0 }, ...prev])
  const handleUpdatePaymentCondition = (index, field, value) => {
    const updated = [...paymentConditions]
    updated[index][field] = field === 'days_delay' ? (parseInt(value) || 0) : value
    setPaymentConditions(updated)
  }
  const handleSavePaymentCondition = async (index) => {
    setSaving(true)
    try {
      const id = await invoke('save_payment_condition', { condition: paymentConditions[index] })
      const newConditions = [...paymentConditions]
      newConditions[index].id = id
      setPaymentConditions(newConditions)
      setStatus({ type: 'success', message: 'Condizione salvata!' })
      setTimeout(() => setStatus({ type: '', message: '' }), 3000)
    } catch (err) {
      setStatus({ type: 'error', message: 'Errore: ' + err })
    } finally {
      setSaving(false)
    }
  }
  const handleDeletePaymentCondition = async (index) => {
    if (!paymentConditions[index].id) {
      setPaymentConditions(paymentConditions.filter((_, i) => i !== index))
      return
    }
    if (!(await confirm({
      title: 'Eliminare la condizione di pagamento?',
      message: 'La condizione verra\' rimossa definitivamente.',
    }))) return
    try {
      await invoke('delete_payment_condition', { id: paymentConditions[index].id })
      setPaymentConditions(paymentConditions.filter((_, i) => i !== index))
      setStatus({ type: 'success', message: 'Condizione eliminata!' })
    } catch (err) {
      setStatus({ type: 'error', message: 'Errore: ' + err })
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-[#8bc53f]" size={48} />
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-premium-in">
      {status.message && (
        <div className={`p-4 rounded-2xl flex items-center gap-4 ${
          status.type === 'success' ? 'bg-[#8bc53f]/10 text-[#8bc53f] border border-[#8bc53f]/20' : 'bg-red-50 text-red-500 border border-red-100'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-bold uppercase tracking-widest">{status.message}</span>
        </div>
      )}

      {/* FISCALITÀ */}
      <div className="bg-white/40 backdrop-blur-md border border-white/60 p-10 rounded-[3rem] shadow-xl space-y-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-orange-100 text-orange-600 rounded-2xl"><Percent size={24} /></div>
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Fiscalità & Ritenuta</h3>
              <p className="text-xs font-bold text-slate-400">Gestisci le aliquote per la ritenuta d'acconto</p>
            </div>
          </div>
          <button onClick={handleAddTaxRate} className="flex items-center gap-2 px-6 h-11 bg-orange-500 text-white rounded-xl text-[0.65rem] font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg shadow-orange-500/20">
            <Plus size={16} /> Aggiungi Aliquota
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {taxRates.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
              <Percent size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-sm font-bold text-slate-400">Nessuna aliquota configurata.</p>
            </div>
          ) : (
            taxRates.map((rate, index) => (
              <div key={index} className="flex items-end gap-6 p-6 bg-white/50 rounded-[2rem] border border-white/80 hover:shadow-lg transition-all group">
                <div className="flex-1">
                  <FormInput label="Descrizione Aliquota" value={rate.name} onChange={(e) => handleUpdateTaxRate(index, 'name', e.target.value)} onFocus={(e) => setTimeout(() => e.target.select(), 50)} icon={Briefcase} />
                </div>
                <div className="w-48">
                  <FormInput label="Percentuale (%)" type="number" value={rate.rate} onChange={(e) => handleUpdateTaxRate(index, 'rate', e.target.value)} onFocus={(e) => setTimeout(() => e.target.select(), 50)} icon={Percent} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleSaveTaxRate(index)} disabled={saving} className="p-4 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all"><Save size={20} /></button>
                  <button onClick={() => handleDeleteTaxRate(index)} disabled={saving} className="p-4 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"><Trash2 size={20} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* PAGAMENTI */}
      <div className="bg-white/40 backdrop-blur-md border border-white/60 p-10 rounded-[3rem] shadow-xl space-y-8">
        <div className="flex items-center justify-between border-b border-slate-100 pb-6">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl"><CreditCard size={24} /></div>
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Condizioni di Pagamento</h3>
              <p className="text-xs font-bold text-slate-400">Gestisci i termini di pagamento e le scadenze predefinite</p>
            </div>
          </div>
          <button onClick={handleAddPaymentCondition} className="flex items-center gap-2 px-6 h-11 bg-blue-600 text-white rounded-xl text-[0.65rem] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-lg shadow-blue-500/20">
            <Plus size={16} /> Nuova Condizione
          </button>
        </div>
        <div className="grid grid-cols-1 gap-4">
          {paymentConditions.length === 0 ? (
            <div className="text-center py-12 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200">
              <CreditCard size={48} className="mx-auto text-slate-200 mb-4" />
              <p className="text-sm font-bold text-slate-400">Nessuna condizione configurata.</p>
            </div>
          ) : (
            paymentConditions.map((cond, index) => (
              <div key={index} className="flex items-end gap-6 p-6 bg-white/50 rounded-[2rem] border border-white/80 hover:shadow-lg transition-all group">
                <div className="flex-1">
                  <FormInput label="Nome (es: Bonifico 30gg)" value={cond.name} onChange={(e) => handleUpdatePaymentCondition(index, 'name', e.target.value)} onFocus={(e) => setTimeout(() => e.target.select(), 50)} icon={Briefcase} />
                </div>
                <div className="w-48">
                  <FormInput label="Giorni per Scadenza" type="number" value={cond.days_delay} onChange={(e) => handleUpdatePaymentCondition(index, 'days_delay', e.target.value)} onFocus={(e) => setTimeout(() => e.target.select(), 50)} icon={CreditCard} />
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleSavePaymentCondition(index)} disabled={saving} className="p-4 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all"><Save size={20} /></button>
                  <button onClick={() => handleDeletePaymentCondition(index)} disabled={saving} className="p-4 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all"><Trash2 size={20} /></button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

export default TaxPaymentSettings
