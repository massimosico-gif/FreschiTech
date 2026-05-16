import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Send, User, Tag, MessageSquare, Paperclip, Loader2, CheckCircle2, AlertCircle } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import FormInput from './FormInput'

const EmailPreviewModal = ({ isOpen, onClose, invoice }) => {
  const [emailData, setEmailData] = useState({
    to: '',
    subject: '',
    body: ''
  })
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState({ type: '', message: '' })

  const [templates, setTemplates] = useState({
    standard: { subject: '', body: '' },
    remind1: { subject: '', body: '' },
    remind2: { subject: '', body: '' }
  })
  const [activeTemplate, setActiveTemplate] = useState('standard')

  useEffect(() => {
    if (isOpen && invoice) {
      loadAllTemplates()
    }
  }, [isOpen, invoice])

  const replaceTags = (text, inv) => {
    if (!text) return ''
    const today = new Date().toLocaleDateString('it-IT')
    return text
      .replace(/\[numero\]/g, inv.number || '')
      .replace(/\[data\]/g, inv.date || '')
      .replace(/\[data_invio\]/g, today)
      .replace(/\[scadenza\]/g, inv.due_date || '-')
      .replace(/\[cliente\]/g, inv.client_name || inv.client || '-')
      .replace(/\[totale\]/g, inv.total ? `€ ${inv.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : '€ 0,00')
      .replace(/\[netto\]/g, inv.total ? `€ ${inv.total.toLocaleString('it-IT', { minimumFractionDigits: 2 })}` : '€ 0,00')
  }

  const loadAllTemplates = async () => {
    try {
      const [smtp, global] = await Promise.all([
        invoke('get_smtp_config'),
        invoke('get_global_settings')
      ])

      const standardSubject = smtp.subject_template || 'Invio Fattura Proforma [numero]'
      const standardBody = smtp.body_template || 'Gentile Cliente,\nin allegato la fattura proforma in oggetto.\n\nCordiali saluti,\nTecnoRilievi-FVG'

      const temps = {
        standard: {
          subject: standardSubject,
          body: standardBody
        },
        remind1: {
          subject: global.mail_remind_1_subject || standardSubject,
          body: global.mail_remind_1_body || standardBody
        },
        remind2: {
          subject: global.mail_remind_2_subject || standardSubject,
          body: global.mail_remind_2_body || standardBody
        }
      }

      setTemplates(temps)
      
      // Imposta il default in base allo stato o standard
      let initial = 'standard'
      if (invoice.reminder_count === 1) initial = 'remind1'
      else if (invoice.reminder_count >= 2) initial = 'remind2'
      
      setActiveTemplate(initial)
      applyTemplate(initial, temps)
      setStatus({ type: '', message: '' })
    } catch (err) {
      console.error("Errore caricamento template:", err)
    }
  }

  const applyTemplate = (templateKey, allTemplates = templates) => {
    const temp = allTemplates[templateKey]
    setEmailData({
      to: invoice.email || '',
      subject: replaceTags(temp.subject, invoice),
      body: replaceTags(temp.body, invoice)
    })
  }

  const handleTemplateChange = (key) => {
    setActiveTemplate(key)
    applyTemplate(key)
  }

  const handleSend = async () => {
    setSending(true)
    setStatus({ type: '', message: '' })
    
    try {
      // 1. Recupero e normalizzazione articoli (fondamentale per Typst)
      const items = typeof invoice.items_json === 'string' ? JSON.parse(invoice.items_json) : (invoice.items || [])
      
      let netto = 0
      let iva_total = 0
      
      const processedItems = items.map(item => {
        const qty = parseFloat(String(item.quantity || item.qty || 0).replace(',', '.'))
        const prc = parseFloat(String(item.price || 0).replace(',', '.'))
        const tax = parseFloat(String(item.iva || item.vat || 22).replace(',', '.'))
        
        const lineNetto = qty * prc
        const lineIva = lineNetto * (tax / 100)
        
        netto += lineNetto
        iva_total += lineIva
        
        return {
          description: item.description || item.desc || '',
          quantity: qty,
          price: prc,
          iva: tax,
          total: lineNetto
        }
      })

      // 2. Prepariamo l'oggetto completo che Typst si aspetta
      const dataToGenerate = { 
        ...invoice, 
        items: processedItems,
        netto: netto.toFixed(2),
        iva_total: iva_total.toFixed(2),
        lordo: (netto + iva_total).toFixed(2),
        withholding_tax_amount: invoice.withholding_tax_rate_id ? (netto * 0.04).toFixed(2) : "0.00",
        netto_a_pagare: invoice.withholding_tax_rate_id ? (netto + iva_total - (netto * 0.04)).toFixed(2) : (netto + iva_total).toFixed(2)
      }

      const pdfBytes = await invoke('generate_pdf_preview', { data: dataToGenerate })
      
      await invoke('send_invoice_email_custom', { 
        to: emailData.to,
        subject: emailData.subject,
        body: emailData.body,
        pdfContent: Array.from(new Uint8Array(pdfBytes)),
        filename: `Fattura_n_${invoice.number.replace(/\//g, '_')}.pdf`
      })

      setStatus({ type: 'success', message: 'Email inviata con successo!' })
      setTimeout(() => {
        onClose()
      }, 2000)
    } catch (err) {
      setStatus({ type: 'error', message: 'Errore invio: ' + err })
    } finally {
      setSending(false)
    }
  }

  if (!isOpen) return null

  const modalContent = (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-premium-in"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative w-full max-w-2xl bg-white rounded-[3rem] shadow-2xl overflow-hidden animate-premium-in border border-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-10 py-8 border-b border-slate-100 bg-slate-50">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-sky-100 text-sky-600 rounded-2xl">
              <Send size={24} />
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Anteprima Email</h3>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Rivedi e modifica prima dell'invio</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-3 hover:bg-white text-slate-400 hover:text-slate-900 rounded-2xl transition-all"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-10 space-y-6 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {status.message && (
            <div className={`p-4 rounded-2xl flex items-center gap-4 animate-premium-in ${
              status.type === 'success' ? 'bg-[#8bc53f]/10 text-[#8bc53f] border border-[#8bc53f]/20' : 'bg-red-50 text-red-500 border border-red-100'
            }`}>
              {status.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
              <span className="text-[0.65rem] font-black uppercase tracking-widest">{status.message}</span>
            </div>
          )}

          {/* Template Selector */}
          <div className="space-y-3">
            <label className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <Tag size={12} /> Seleziona Modello
            </label>
            <div className="flex p-1 bg-slate-100 rounded-2xl w-full relative overflow-hidden h-[46px]">
              {/* Sliding Indicator */}
              <div 
                className="absolute top-1 bottom-1 bg-white rounded-xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-sm z-0"
                style={{
                  width: 'calc(33.33% - 4px)',
                  left: activeTemplate === 'standard' ? '4px' : 
                        activeTemplate === 'remind1' ? '33.33%' : 
                        'calc(66.66% - 1px)'
                }}
              />

              {[
                { id: 'standard', label: 'Standard' },
                { id: 'remind1', label: '1° Sollecito' },
                { id: 'remind2', label: '2° Sollecito' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTemplateChange(t.id)}
                  className={`relative z-10 flex-1 flex items-center justify-center text-[0.6rem] font-black uppercase tracking-widest transition-colors duration-500 ${
                    activeTemplate === t.id ? 'text-[#0f172a]' : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <FormInput 
            label="Destinatario"
            value={emailData.to}
            onChange={(e) => setEmailData({...emailData, to: e.target.value})}
            icon={User}
            placeholder="email@cliente.it"
          />

          <FormInput 
            label="Oggetto"
            value={emailData.subject}
            onChange={(e) => setEmailData({...emailData, subject: e.target.value})}
            icon={Tag}
          />

          <div className="space-y-2">
            <label className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
              <MessageSquare size={12} /> Testo della Mail
            </label>
            <textarea 
              value={emailData.body}
              onChange={(e) => setEmailData({...emailData, body: e.target.value})}
              rows={8}
              className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 text-sm font-medium focus:ring-2 focus:ring-[#8bc53f]/20 focus:border-[#8bc53f] transition-all outline-none resize-none"
            />
          </div>

          {/* Attachment Badge */}
          <div className="flex items-center gap-3 p-4 bg-[#8bc53f]/5 border border-[#8bc53f]/20 rounded-2xl">
            <div className="p-2 bg-[#8bc53f] text-white rounded-lg">
              <Paperclip size={16} />
            </div>
            <div className="flex-1">
              <div className="text-[0.65rem] font-black text-[#8bc53f] uppercase tracking-widest">Allegato Automatico</div>
              <div className="text-xs font-bold text-slate-600">Fattura_n_{invoice?.number || '---'}.pdf</div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-10 py-8 border-t border-slate-100 flex justify-end gap-4 bg-slate-50">
          <button 
            onClick={onClose}
            className="px-8 h-12 rounded-xl text-[0.7rem] font-black uppercase tracking-widest text-slate-400 hover:text-slate-900 transition-all"
          >
            Annulla
          </button>
          <button 
            onClick={handleSend}
            disabled={sending || !emailData.to}
            className="flex items-center gap-3 px-10 h-14 bg-[#0f172a] text-white rounded-2xl text-[0.75rem] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-xl disabled:opacity-30"
          >
            {sending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
            Invia Ora
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}

export default EmailPreviewModal
