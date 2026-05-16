import React from 'react'
import { Tag, ShieldCheck, Mail, AlertCircle } from 'lucide-react'

const Hash = ({ size, className }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="4" y1="9" x2="20" y2="9"></line>
    <line x1="4" y1="15" x2="20" y2="15"></line>
    <line x1="10" y1="3" x2="8" y2="21"></line>
    <line x1="16" y1="3" x2="14" y2="21"></line>
  </svg>
)

const FiscalFormGroup = ({ formData, handleChange, errors }) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="fh-box-label ml-1">Partita IVA</label>
          <div className="relative">
             <Tag className={`absolute left-5 top-1/2 -translate-y-1/2 ${errors?.vat_id ? 'text-rose-500' : 'text-slate-400'}`} size={18} />
             <input 
              name="vat_id" 
              value={formData.vat_id || ''} 
              onChange={handleChange} 
              className={`fh-input fh-input-iconic ${errors?.vat_id ? 'border-rose-300 ring-4 ring-rose-500/10' : ''}`} 
              placeholder="11 cifre" 
             />
          </div>
          {errors?.vat_id && (
            <div className="flex items-center gap-1.5 px-2 text-[0.6rem] font-bold text-rose-500 animate-premium-in">
              <AlertCircle size={12} /> {errors.vat_id}
            </div>
          )}
        </div>
        <div className="space-y-2">
          <label className="fh-box-label ml-1">Codice Fiscale</label>
          <div className="relative">
             <ShieldCheck className={`absolute left-5 top-1/2 -translate-y-1/2 ${errors?.tax_code ? 'text-rose-500' : 'text-slate-400'}`} size={18} />
             <input 
              name="tax_code" 
              value={formData.tax_code || ''} 
              onChange={handleChange} 
              className={`fh-input fh-input-iconic ${errors?.tax_code ? 'border-rose-300 ring-4 ring-rose-500/10' : ''}`} 
              placeholder="Codice Fiscale" 
             />
          </div>
          {errors?.tax_code && (
            <div className="flex items-center gap-1.5 px-2 text-[0.6rem] font-bold text-rose-500 animate-premium-in">
              <AlertCircle size={12} /> {errors.tax_code}
            </div>
          )}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="fh-box-label ml-1">Codice SDI</label>
          <div className="relative">
             <Hash size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" />
             <input name="sdi_code" value={formData.sdi_code || ''} onChange={handleChange} className="fh-input fh-input-iconic text-center tracking-[0.3em]" placeholder="XXXXXXX" maxLength={7} />
          </div>
        </div>
        <div className="space-y-2">
          <label className="fh-box-label ml-1">Indirizzo PEC</label>
          <div className="relative">
             <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
             <input name="pec" value={formData.pec || ''} onChange={handleChange} className="fh-input fh-input-iconic" placeholder="esempio@pec.it" />
          </div>
        </div>
      </div>
    </div>
  )
}

export default FiscalFormGroup
