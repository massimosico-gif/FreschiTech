import React, { useState, useEffect } from 'react'
import { Euro, Truck, Wrench, Percent, Save, Check } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import Card from '../ui/Card'
import { useToast } from '@tecno/ui/feedback'

const CcConfigTab = ({ costCenter, onSave }) => {
  const toast = useToast()
  const [formData, setFormData] = useState({
    base_cost: 0,
    markup: 0.15,
    shipping: 0,
    install_fee: 0,
    install_fee_percent: 0.06
  })
  const [feePercent, setFeePercent] = useState(0.06)
  const [saving, setSaving] = useState(false)
  const [success, setSuccess] = useState(false)
  const [autoFee, setAutoFee] = useState(true)

  useEffect(() => {
    invoke('get_global_settings').then(res => {
      if (res.default_install_fee_percent !== undefined) {
        setFeePercent(parseFloat(res.default_install_fee_percent) || 0)
      }
    }).catch(console.error)
  }, [])

  useEffect(() => {
    if (costCenter && feePercent !== undefined) {
      const currentPercent = costCenter.install_fee_percent !== undefined && costCenter.install_fee_percent !== null
        ? costCenter.install_fee_percent
        : feePercent
      
      const calculatedFee = parseFloat((costCenter.base_cost * currentPercent).toFixed(2))
      const currentFee = costCenter.install_fee || 0
      const matches = Math.abs(currentFee - calculatedFee) < 0.02
      setAutoFee(matches)
      setFormData({
        base_cost: costCenter.base_cost || 0,
        markup: costCenter.markup !== undefined ? costCenter.markup : 0.15,
        shipping: costCenter.shipping || 0,
        install_fee: currentFee,
        install_fee_percent: currentPercent
      })
    }
  }, [costCenter, feePercent])

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: parseFloat(value) || 0 }))
  }

  const handleBaseCostChange = (e) => {
    const val = parseFloat(e.target.value) || 0
    setFormData(prev => ({
      ...prev,
      base_cost: val,
      install_fee: autoFee ? parseFloat((val * prev.install_fee_percent).toFixed(2)) : prev.install_fee
    }))
  }

  const handleFeePercentChange = (e) => {
    const percentVal = (parseFloat(e.target.value) || 0) / 100
    setFormData(prev => ({
      ...prev,
      install_fee_percent: percentVal,
      install_fee: autoFee ? parseFloat((prev.base_cost * percentVal).toFixed(2)) : prev.install_fee
    }))
  }

  const handleAutoFeeToggle = (e) => {
    const checked = e.target.checked
    setAutoFee(checked)
    if (checked) {
      setFormData(prev => ({
        ...prev,
        install_fee: parseFloat((prev.base_cost * prev.install_fee_percent).toFixed(2))
      }))
    }
  }

  const handleSave = async () => {
    if (!costCenter) return
    setSaving(true)
    setSuccess(false)
    try {
      const updatedCC = {
        ...costCenter,
        base_cost: formData.base_cost,
        markup: formData.markup,
        shipping: formData.shipping,
        install_fee: formData.install_fee,
        install_fee_percent: formData.install_fee_percent
      }
      await onSave(updatedCC)
      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      console.error(err)
      toast.error("Errore durante il salvataggio: " + err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <div>
        <h2 className="text-2xl font-black text-slate-800 tracking-tight">Configurazione Costi</h2>
        <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest mt-1">
          Gestisci i parametri economici di questo centro di costo
        </p>
      </div>

      <Card className="p-10 bg-white/50 backdrop-blur-md border border-white/50 shadow-xl rounded-[2.5rem] space-y-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-2">
            <label className="text-[0.75rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Costo Base (€)</label>
            <div className="relative">
              <Euro className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="number" 
                name="base_cost" 
                value={formData.base_cost} 
                onChange={handleBaseCostChange} 
                onFocus={(e) => setTimeout(() => e.target.select(), 0)} 
                className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[0.75rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Ricarico (%)</label>
            <div className="relative">
              <Percent className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="number" 
                name="markup" 
                value={formData.markup * 100} 
                onChange={(e) => setFormData(p => ({...p, markup: (parseFloat(e.target.value) || 0) / 100}))} 
                onFocus={(e) => setTimeout(() => e.target.select(), 0)} 
                className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[0.75rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Trasporto (€)</label>
            <div className="relative">
              <Truck className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="number" 
                name="shipping" 
                value={formData.shipping} 
                onChange={handleChange} 
                onFocus={(e) => setTimeout(() => e.target.select(), 0)} 
                className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[0.75rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Fee Montaggio (%)</label>
            <div className="relative">
              <Percent className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="number" 
                name="install_fee_percent" 
                value={formData.install_fee_percent * 100} 
                onChange={handleFeePercentChange} 
                onFocus={(e) => setTimeout(() => e.target.select(), 0)} 
                className="w-full bg-white border border-slate-100 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm" 
              />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[0.75rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Fee Montaggio (€)</label>
            <div className="relative">
              <Wrench className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="number" 
                name="install_fee" 
                value={formData.install_fee} 
                onChange={handleChange} 
                disabled={autoFee}
                onFocus={(e) => setTimeout(() => e.target.select(), 0)} 
                className={`w-full border border-slate-100 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold transition-all shadow-sm ${
                  autoFee 
                  ? 'bg-slate-50/70 text-slate-400 cursor-not-allowed border-slate-100' 
                  : 'bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white'
                }`}
              />
            </div>
            <div className="flex items-center gap-2 mt-2 ml-1">
              <input 
                type="checkbox" 
                id="autoFee" 
                checked={autoFee} 
                onChange={handleAutoFeeToggle}
                className="rounded border-slate-300 text-accent focus:ring-accent/20 h-4 w-4 cursor-pointer"
              />
              <label htmlFor="autoFee" className="text-[0.72rem] font-black uppercase tracking-widest text-slate-400 cursor-pointer select-none">
                Calcola in automatico (usa % a sinistra)
              </label>
            </div>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          {(() => {
            const isDirty = costCenter ? (
              formData.base_cost !== (costCenter.base_cost || 0) ||
              formData.markup !== (costCenter.markup !== undefined ? costCenter.markup : 0.15) ||
              formData.shipping !== (costCenter.shipping || 0) ||
              formData.install_fee !== (costCenter.install_fee || 0) ||
              formData.install_fee_percent !== (costCenter.install_fee_percent !== undefined ? costCenter.install_fee_percent : feePercent)
            ) : false;
            
            const isSaveDisabled = !isDirty || saving;

            return (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaveDisabled}
                className={`w-full md:w-auto px-8 py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl ${
                  success
                  ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                  : !isSaveDisabled
                    ? 'bg-accent text-white hover:bg-accent/90 shadow-accent/20 shadow-md'
                    : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                }`}
              >
                {success ? (
                  <>
                    <Check size={18} /> Salvato!
                  </>
                ) : (
                  <>
                    <Save size={18} /> {saving ? 'Salvataggio...' : 'Salva Configurazione'}
                  </>
                )}
              </button>
            );
          })()}
        </div>
      </Card>
    </div>
  )
}

export default CcConfigTab
