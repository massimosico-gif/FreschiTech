import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { invoke } from '@tauri-apps/api/core'
import { 
  FileText, 
  Plus, 
  Trash2, 
  Edit, 
  Edit3,
  Search, 
  Euro, 
  Percent, 
  AlertTriangle, 
  Check, 
  X, 
  ArrowLeft,
  Info,
  User,
  Clock,
  Save,
  MessageSquare
} from 'lucide-react'
import Card from './ui/Card'
import ConfirmModal from './ui/ConfirmModal'
import DrawerShell from './ui/DrawerShell'
import ClientSelector from './ui/ClientSelector'
import DatePicker from './ui/DatePicker'
import Select from './ui/Select'
import EditClientDrawer from './EditClientDrawer'

const Quotes = () => {
  const [quotes, setQuotes] = useState([])
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  
  // Navigation viewMode: 'list' or 'detail'
  const [viewMode, setViewMode] = useState('list')
  const [selectedQuoteId, setSelectedQuoteId] = useState(null)
  
  // Modals/Drawers states
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isAddClientOpen, setIsAddClientOpen] = useState(false)
  const [pendingClientName, setPendingClientName] = useState('')

  // Form state
  const [quoteMeta, setQuoteMeta] = useState({
    id: null,
    client_id: '',
    title: '',
    description: '',
    status: 'draft',
    created_at: ''
  })
  const [initialQuoteMeta, setInitialQuoteMeta] = useState(null)
  const [quoteItems, setQuoteItems] = useState([])

  // Search/Autocomplete catalog state
  const [catalogSuggestions, setCatalogSuggestions] = useState([])
  const [showCatalogDropdown, setShowCatalogDropdown] = useState(false)
  const [activeField, setActiveField] = useState(null) // 'code' or 'description'
  const dropdownRef = useRef(null)

  // Nuovo Articolo panel form state
  const [newRowData, setNewRowData] = useState({
    code: '',
    description: '',
    unit: 'pz',
    unit_price: 0,
    quantity: 1,
    markup: 0.25
  })

  // Confirm delete state
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, quoteId: null })

  // Inline editing for quote items
  const [editingItemIndex, setEditingItemIndex] = useState(null)
  const [inlineItemFormData, setInlineItemFormData] = useState(null)
  const [deleteItemModal, setDeleteItemModal] = useState({ isOpen: false, itemIndex: null })
  const [duplicateModal, setDuplicateModal] = useState({
    isOpen: false,
    newItem: null,
    existingIndex: null,
    existingItem: null
  })

  // Status configuration for the select dropdown
  const statusOptions = [
    { id: 'draft', label: 'Bozza', color: 'bg-amber-500' },
    { id: 'accepted', label: 'Accettato', color: 'bg-green-500' },
    { id: 'rejected', label: 'Rifiutato', color: 'bg-rose-500' }
  ]

  // Automatically select text inside any text/number input on focus or click
  const handleInputSelect = (e) => {
    const target = e.target
    setTimeout(() => {
      if (target) target.select()
    }, 50)
  }

  // Load quotes and clients
  const loadData = async () => {
    setLoading(true)
    try {
      const qs = await invoke('get_quotes')
      setQuotes(qs)
      const cl = await invoke('get_clients')
      setClients(cl)
    } catch (err) {
      console.error("Errore nel caricamento dei preventivi/clienti:", err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowCatalogDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Autocomplete code change handler
  const handleCodeChange = async (val) => {
    setNewRowData(prev => ({ ...prev, code: val }))
    if (val.trim().length >= 2) {
      try {
        const matches = await invoke('search_catalog_materials', { query: val })
        setCatalogSuggestions(matches)
        setActiveField('code')
        setShowCatalogDropdown(true)
      } catch (err) {
        console.error("Errore ricerca codice:", err)
      }
    } else {
      setCatalogSuggestions([])
      setShowCatalogDropdown(false)
      setActiveField(null)
    }
  }

  // Autocomplete description change handler
  const handleDescriptionChange = async (val) => {
    setNewRowData(prev => ({ ...prev, description: val }))
    if (val.trim().length >= 2) {
      try {
        const matches = await invoke('search_catalog_materials', { query: val })
        setCatalogSuggestions(matches)
        setActiveField('description')
        setShowCatalogDropdown(true)
      } catch (err) {
        console.error("Errore ricerca descrizione:", err)
      }
    } else {
      setCatalogSuggestions([])
      setShowCatalogDropdown(false)
      setActiveField(null)
    }
  }

  // Select catalog item suggestion
  const handleSelectCatalogSuggestion = (material) => {
    setNewRowData(prev => ({
      ...prev,
      code: material.code || '',
      description: material.description,
      unit: material.unit || 'pz',
      unit_price: material.unit_price || 0,
      markup: material.markup !== undefined ? material.markup : 0.25
    }))
    setCatalogSuggestions([])
    setShowCatalogDropdown(false)
    setActiveField(null)
  }

  const saveQuoteSilently = async (meta, items) => {
    if (!meta.id || !meta.client_id || !meta.title.trim() || !meta.created_at) return
    try {
      const quoteData = {
        id: meta.id,
        client_id: parseInt(meta.client_id),
        title: meta.title.trim(),
        description: meta.description.trim() || null,
        status: meta.status,
        created_at: meta.created_at
      }
      await invoke('save_quote', { quote: quoteData, items })
      await loadData()
    } catch (err) {
      console.error("Errore nel salvataggio automatico del preventivo:", err)
    }
  }

  const proceedAddRow = async (newItem) => {
    const updatedItems = [...quoteItems, newItem]
    setQuoteItems(updatedItems)
    
    // Reset addition data
    setNewRowData({
      code: '',
      description: '',
      unit: 'pz',
      unit_price: 0,
      quantity: 1,
      markup: 0.25
    })
    setActiveField(null)
    setCatalogSuggestions([])
    setShowCatalogDropdown(false)

    await saveQuoteSilently(quoteMeta, updatedItems)
  }

  const handleDuplicateAdd = async () => {
    const { newItem, existingIndex, existingItem } = duplicateModal
    if (existingIndex === null || !existingItem || !newItem) return

    const updatedItems = quoteItems.map((item, i) => {
      if (i === existingIndex) {
        return {
          ...item,
          quantity: item.quantity + newItem.quantity
        }
      }
      return item
    })
    setQuoteItems(updatedItems)
    setDuplicateModal({ isOpen: false, newItem: null, existingIndex: null, existingItem: null })
    
    // Reset addition data
    setNewRowData({
      code: '',
      description: '',
      unit: 'pz',
      unit_price: 0,
      quantity: 1,
      markup: 0.25
    })
    setActiveField(null)
    setCatalogSuggestions([])
    setShowCatalogDropdown(false)

    await saveQuoteSilently(quoteMeta, updatedItems)
  }

  const handleDuplicateOverwrite = async () => {
    const { newItem, existingIndex, existingItem } = duplicateModal
    if (existingIndex === null || !existingItem || !newItem) return

    const updatedItems = quoteItems.map((item, i) => {
      if (i === existingIndex) {
        return {
          ...item,
          quantity: newItem.quantity,
          unit_price: newItem.unit_price,
          markup: newItem.markup
        }
      }
      return item
    })
    setQuoteItems(updatedItems)
    setDuplicateModal({ isOpen: false, newItem: null, existingIndex: null, existingItem: null })
    
    // Reset addition data
    setNewRowData({
      code: '',
      description: '',
      unit: 'pz',
      unit_price: 0,
      quantity: 1,
      markup: 0.25
    })
    setActiveField(null)
    setCatalogSuggestions([])
    setShowCatalogDropdown(false)

    await saveQuoteSilently(quoteMeta, updatedItems)
  }

  const handleDuplicateCreateNew = async () => {
    const { newItem } = duplicateModal
    if (!newItem) return

    await proceedAddRow(newItem)
    setDuplicateModal({ isOpen: false, newItem: null, existingIndex: null, existingItem: null })
  }

  // Push newRowData as a row item inside quoteItems
  const handleAddRowToQuote = async () => {
    if (!newRowData.description.trim()) return
    const newItem = {
      id: null,
      code: newRowData.code || '',
      description: newRowData.description.trim(),
      unit: newRowData.unit || 'pz',
      unit_price: newRowData.unit_price,
      quantity: newRowData.quantity,
      markup: newRowData.markup
    }

    // Check for duplicate by code (if code is not empty) or description
    const existingIndex = quoteItems.findIndex(item => {
      if (newItem.code && item.code) {
        return item.code.toLowerCase().trim() === newItem.code.toLowerCase().trim()
      }
      return item.description.toLowerCase().trim() === newItem.description.toLowerCase().trim()
    })

    if (existingIndex !== -1) {
      setDuplicateModal({
        isOpen: true,
        newItem,
        existingIndex,
        existingItem: quoteItems[existingIndex]
      })
      return
    }

    await proceedAddRow(newItem)
  }

  // Remove row item
  const handleRemoveItem = (index) => {
    setQuoteItems(prev => prev.filter((_, i) => i !== index))
  }

  // Update item field
  const handleItemFieldChange = (index, field, value) => {
    setQuoteItems(prev => prev.map((item, i) => {
      if (i === index) {
        let val = value
        if (field === 'quantity' || field === 'unit_price') {
          val = parseFloat(value) || 0
        } else if (field === 'markup') {
          val = (parseFloat(value) || 0) / 100
        }
        return { ...item, [field]: val }
      }
      return item
    }))
  }

  // Inline editing for quote items
  const handleStartEditItem = (index) => {
    setEditingItemIndex(index)
    setInlineItemFormData({ ...quoteItems[index] })
  }

  const handleCancelEditItem = () => {
    setEditingItemIndex(null)
    setInlineItemFormData(null)
  }

  const handleSaveEditItem = async () => {
    if (!inlineItemFormData || !inlineItemFormData.description.trim()) return
    const updatedItems = quoteItems.map((item, i) => i === editingItemIndex ? inlineItemFormData : item)
    setQuoteItems(updatedItems)
    setEditingItemIndex(null)
    setInlineItemFormData(null)

    await saveQuoteSilently(quoteMeta, updatedItems)
  }

  const handleInlineItemFieldChange = (field, value) => {
    setInlineItemFormData(prev => {
      let val = value
      if (field === 'quantity' || field === 'unit_price') {
        val = parseFloat(value) || 0
      } else if (field === 'markup') {
        val = (parseFloat(value) || 0) / 100
      }
      return { ...prev, [field]: val }
    })
  }

  const handleConfirmRemoveItem = async () => {
    if (deleteItemModal.itemIndex !== null) {
      const updatedItems = quoteItems.filter((_, i) => i !== deleteItemModal.itemIndex)
      setQuoteItems(updatedItems)
      await saveQuoteSilently(quoteMeta, updatedItems)
    }
    setDeleteItemModal({ isOpen: false, itemIndex: null })
  }


  // Save/Update Quote Metadata
  const handleSaveQuoteMeta = async () => {
    if (isSaveDisabled) return

    try {
      const quoteData = {
        id: quoteMeta.id,
        client_id: parseInt(quoteMeta.client_id),
        title: quoteMeta.title.trim(),
        description: quoteMeta.description.trim() || null,
        status: quoteMeta.status,
        created_at: quoteMeta.created_at
      }
      
      // If we are editing, preserve current items. If new, items start empty.
      const itemsToSave = quoteMeta.id ? quoteItems : []
      
      const savedId = await invoke('save_quote', { quote: quoteData, items: itemsToSave })
      
      setIsEditorOpen(false)
      await loadData()
      
      // If creating a new quote, go directly to detail page to edit items
      if (!quoteMeta.id) {
        handleOpenQuoteDetail(savedId)
      } else {
        // Just reload details to keep synced
        const details = await invoke('get_quote_details', { quoteId: savedId })
        const q = details.quote
        const updatedMeta = {
          id: q.id,
          client_id: String(q.client_id),
          title: q.title,
          description: q.description || '',
          status: q.status,
          created_at: q.created_at
        }
        setQuoteMeta(updatedMeta)
        setInitialQuoteMeta(updatedMeta)
        setQuoteItems(details.items || [])
      }
    } catch (err) {
      console.error("Errore salvataggio intestazione preventivo:", err)
      alert("Impossibile salvare l'intestazione: " + err)
    }
  }

  // Save current quote items (triggered from detail view)
  const handleSaveItems = async () => {
    if (!quoteMeta.client_id || !quoteMeta.title.trim() || !quoteMeta.created_at) {
      alert("Campi obbligatori mancanti nell'intestazione.")
      return
    }

    try {
      const quoteData = {
        id: quoteMeta.id,
        client_id: parseInt(quoteMeta.client_id),
        title: quoteMeta.title.trim(),
        description: quoteMeta.description.trim() || null,
        status: quoteMeta.status,
        created_at: quoteMeta.created_at
      }
      
      await invoke('save_quote', { quote: quoteData, items: quoteItems })
      await loadData()
      
      // Refresh current details
      const details = await invoke('get_quote_details', { quoteId: quoteMeta.id })
      setQuoteItems(details.items || [])
      
      alert("Preventivo salvato con successo!")
    } catch (err) {
      console.error("Errore salvataggio preventivo:", err)
      alert("Errore nel salvataggio del preventivo: " + err)
    }
  }

  // Open editor drawer for new quote
  const handleNewQuote = () => {
    setQuoteMeta({
      id: null,
      client_id: '',
      title: '',
      description: '',
      status: 'draft',
      created_at: new Date().toISOString().split('T')[0]
    })
    setInitialQuoteMeta(null)
    setQuoteItems([])
    setIsEditorOpen(true)
  }

  // Open metadata editor drawer for existing quote
  const handleEditQuoteMetaDirect = async (quoteId) => {
    try {
      const details = await invoke('get_quote_details', { quoteId })
      const q = details.quote
      const meta = {
        id: q.id,
        client_id: String(q.client_id),
        title: q.title,
        description: q.description || '',
        status: q.status,
        created_at: q.created_at
      }
      setQuoteMeta(meta)
      setInitialQuoteMeta(meta)
      setQuoteItems(details.items || [])
      setIsEditorOpen(true)
    } catch (err) {
      console.error("Errore caricamento dettagli preventivo:", err)
      alert("Impossibile caricare i dettagli: " + err)
    }
  }

  // Transition view to detail mode for a quote
  const handleOpenQuoteDetail = async (quoteId) => {
    try {
      const details = await invoke('get_quote_details', { quoteId })
      const q = details.quote
      const meta = {
        id: q.id,
        client_id: String(q.client_id),
        title: q.title,
        description: q.description || '',
        status: q.status,
        created_at: q.created_at
      }
      setQuoteMeta(meta)
      setInitialQuoteMeta(meta)
      setQuoteItems(details.items || [])
      setSelectedQuoteId(quoteId)
      setViewMode('detail')
    } catch (err) {
      console.error("Errore caricamento preventivo per dettaglio:", err)
      alert("Impossibile caricare il dettaglio: " + err)
    }
  }

  // Confirm delete quote
  const handleDeleteQuote = async () => {
    if (!deleteModal.quoteId) return
    try {
      await invoke('delete_quote', { id: deleteModal.quoteId })
      
      // If we deleted the quote we were viewing, go back to list
      if (selectedQuoteId === deleteModal.quoteId) {
        setViewMode('list')
        setSelectedQuoteId(null)
      }
      
      setDeleteModal({ isOpen: false, quoteId: null })
      loadData()
    } catch (err) {
      console.error("Errore eliminazione preventivo:", err)
      alert("Impossibile eliminare il preventivo: " + err)
    }
  }

  // Autocomplete client creation logic
  const handleAddNewClientClick = (searchName) => {
    setPendingClientName(searchName)
    setIsAddClientOpen(true)
  }

  const handleSaveNewClient = async (clientData) => {
    try {
      await invoke('save_client', { client: clientData })
      const updatedClients = await invoke('get_clients')
      setClients(updatedClients)
      
      const newClient = updatedClients.find(c => c.name.toLowerCase() === clientData.name.toLowerCase())
      if (newClient) {
        setQuoteMeta(prev => ({ ...prev, client_id: newClient.id.toString() }))
      }
      setIsAddClientOpen(false)
    } catch (err) {
      console.error("Errore salvataggio cliente:", err)
      alert("Impossibile salvare il cliente: " + err)
    }
  }

  // Helpers for formatting
  const formatEuro = (val) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)
  }

  // Totals calculations
  const calculateTotals = () => {
    let cost = 0
    let sale = 0
    quoteItems.forEach(item => {
      const itemCost = item.quantity * item.unit_price
      const itemSale = itemCost * (1 + item.markup)
      cost += itemCost
      sale += itemSale
    })
    const margin = sale - cost
    const marginPercent = sale > 0 ? (margin / sale) * 100 : 0
    return { cost, sale, margin, marginPercent }
  }

  const totals = calculateTotals()

  const getStatusBadge = (status) => {
    switch (status) {
      case 'accepted':
        return <span className="inline-flex items-center gap-1 text-[0.6rem] font-black uppercase px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full border border-emerald-100 font-bold">Accettato</span>
      case 'rejected':
        return <span className="inline-flex items-center gap-1 text-[0.6rem] font-black uppercase px-2.5 py-1 bg-rose-50 text-rose-600 rounded-full border border-rose-100 font-bold">Rifiutato</span>
      default:
        return <span className="inline-flex items-center gap-1 text-[0.6rem] font-black uppercase px-2.5 py-1 bg-amber-50 text-amber-600 rounded-full border border-amber-100 font-bold">Bozza</span>
    }
  }

  // Save metadata button disabled check
  const isDirty = !initialQuoteMeta || 
    quoteMeta.client_id !== initialQuoteMeta.client_id ||
    quoteMeta.created_at !== initialQuoteMeta.created_at ||
    quoteMeta.title.trim() !== initialQuoteMeta.title.trim() ||
    quoteMeta.status !== initialQuoteMeta.status ||
    (quoteMeta.description || '').trim() !== (initialQuoteMeta.description || '').trim();

  const isSaveDisabled = !quoteMeta.client_id || !quoteMeta.created_at || !quoteMeta.title.trim() || (quoteMeta.id && !isDirty);

  // RENDERING DETAIL VIEW
  if (viewMode === 'detail') {
    const clientName = clients.find(c => c.id.toString() === quoteMeta.client_id.toString())?.name || 'Cliente Sconosciuto'

    return (
      <div className="space-y-8">
        {/* Back and actions header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div className="space-y-4">
            <button 
              onClick={() => {
                setViewMode('list')
                setSelectedQuoteId(null)
              }} 
              className="flex items-center gap-2 text-slate-400 hover:text-accent transition-colors group cursor-pointer"
            >
              <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
              <span className="text-[0.7rem] font-black uppercase tracking-widest">Torna ai preventivi</span>
            </button>
            
            <div>
              <div className="flex items-center gap-3 mb-2">
                {getStatusBadge(quoteMeta.status)}
                <span className="text-[0.7rem] font-bold text-slate-300">ID: #{quoteMeta.id}</span>
              </div>
              <h1 className="text-3xl font-black text-slate-800 tracking-tighter leading-none">{quoteMeta.title}</h1>
              
              <div className="flex flex-wrap items-center gap-6 mt-4">
                <div className="flex items-center gap-2 text-slate-500">
                  <User size={16} className="text-accent" />
                  <span className="text-sm font-bold">{clientName}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-500">
                  <Clock size={16} className="text-accent" />
                  <span className="text-sm font-bold">Data: {quoteMeta.created_at}</span>
                </div>
                {quoteMeta.description && (
                  <div className="flex items-center gap-2 text-slate-400 italic">
                    <Info size={14} className="text-slate-300" />
                    <span className="text-xs font-semibold">{quoteMeta.description}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setInitialQuoteMeta(quoteMeta)
                setIsEditorOpen(true)
              }}
              className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-600 border border-slate-200 rounded-xl text-[0.65rem] font-black uppercase tracking-widest shadow-sm hover:shadow active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5 font-bold"
            >
              <Edit size={14} />
              Modifica Intestazione
            </button>
            <button
              onClick={() => setDeleteModal({ isOpen: true, quoteId: quoteMeta.id })}
              className="px-5 py-3 bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-100 rounded-xl text-[0.65rem] font-black uppercase tracking-widest shadow-sm active:scale-[0.98] transition-all cursor-pointer flex items-center gap-1.5 font-bold"
              title="Elimina Preventivo"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {/* Totals Summary Card (Moved above Nuovo Articolo Card) */}
        {quoteItems.length > 0 && (
          <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-[2.5rem] p-8 shadow-xl">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 divide-y md:divide-y-0 md:divide-x divide-white/10 text-center">
              <div className="space-y-2">
                <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400">Costo Totale Materiali</span>
                <p className="text-2xl font-black">{formatEuro(totals.cost)}</p>
              </div>
              <div className="space-y-2 pt-4 md:pt-0">
                <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400">Valore Vendita (Preventivo)</span>
                <p className="text-2xl font-black text-emerald-400">{formatEuro(totals.sale)}</p>
              </div>
              <div className="space-y-2 pt-4 md:pt-0">
                <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400">Margine Stimato</span>
                <div className="flex items-center justify-center gap-2">
                  <p className="text-2xl font-black text-emerald-400">{formatEuro(totals.margin)}</p>
                  <span className="text-[0.65rem] font-black px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full">
                    +{totals.marginPercent.toFixed(1)}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Nuovo Articolo Card */}
        <Card hoverEffect={false} className="p-6 bg-white/40 backdrop-blur-md border border-white/50 shadow-xl rounded-[2.5rem] relative z-40 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-accent/10 rounded-lg text-accent">
                <Plus size={14} className="stroke-[3]" />
              </div>
              <span className="text-[0.65rem] font-black uppercase tracking-widest text-slate-500">Nuovo Articolo</span>
            </div>
            <div className="text-right">
              <span className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-wider mr-2">Tot. Riga (Vendita):</span>
              <span className="text-sm font-black text-slate-800">
                {formatEuro((newRowData.quantity || 0) * (newRowData.unit_price || 0) * (1 + (newRowData.markup || 0)))}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end" ref={dropdownRef}>
            {/* Codice */}
            <div className="md:col-span-2 space-y-1.5 relative">
              <label className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400 ml-1">Codice</label>
              <input 
                type="text" 
                placeholder="Codice..."
                value={newRowData.code}
                onChange={(e) => handleCodeChange(e.target.value)}
                onFocus={handleInputSelect}
                onClick={handleInputSelect}
                onBlur={() => setTimeout(() => setShowCatalogDropdown(false), 200)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 transition-all"
                autoComplete="off"
              />
              {showCatalogDropdown && activeField === 'code' && catalogSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl p-2 z-50 max-h-60 overflow-y-auto">
                  {catalogSuggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectCatalogSuggestion(item);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 flex justify-between items-center transition-all group cursor-pointer"
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-800">{item.code || 'N/A'}</span>
                        <span className="text-[0.65rem] text-slate-400 block truncate max-w-[120px]">{item.description}</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 font-bold">{formatEuro(item.unit_price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Descrizione */}
            <div className="md:col-span-4 space-y-1.5 relative">
              <label className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400 ml-1">Descrizione Articolo *</label>
              <input 
                type="text" 
                placeholder="Descrizione articolo..."
                value={newRowData.description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                onFocus={handleInputSelect}
                onClick={handleInputSelect}
                onBlur={() => setTimeout(() => setShowCatalogDropdown(false), 200)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 transition-all"
                autoComplete="off"
              />
              {showCatalogDropdown && activeField === 'description' && catalogSuggestions.length > 0 && (
                <div className="absolute left-0 right-0 top-full mt-2 bg-white border border-slate-100 rounded-2xl shadow-2xl p-2 z-50 max-h-60 overflow-y-auto">
                  {catalogSuggestions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        handleSelectCatalogSuggestion(item);
                      }}
                      className="w-full text-left px-3 py-2.5 rounded-xl hover:bg-slate-50 flex justify-between items-center transition-all group cursor-pointer"
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-800 truncate block max-w-[200px]">{item.description}</span>
                        <span className="text-[0.65rem] text-slate-400 block">{item.code || 'Senza Codice'}</span>
                      </div>
                      <span className="text-xs font-bold text-emerald-600 font-bold">{formatEuro(item.unit_price)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* U.M. */}
            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400 ml-1">U.M.</label>
              <input 
                type="text" 
                placeholder="pz"
                value={newRowData.unit}
                onChange={(e) => setNewRowData(p => ({ ...p, unit: e.target.value }))}
                onFocus={handleInputSelect}
                onClick={handleInputSelect}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-center text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 transition-all"
              />
            </div>

            {/* Quantità */}
            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400 ml-1">Q.tà *</label>
              <input 
                type="number" 
                value={newRowData.quantity}
                onChange={(e) => setNewRowData(p => ({ ...p, quantity: parseFloat(e.target.value) || 0 }))}
                onFocus={handleInputSelect}
                onClick={handleInputSelect}
                min="0"
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-center text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 transition-all"
              />
            </div>

            {/* Costo Cad. */}
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400 ml-1">Costo Cad. (€) *</label>
              <div className="relative">
                <Euro className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={10} />
                <input 
                  type="number" 
                  value={newRowData.unit_price}
                  onChange={(e) => setNewRowData(p => ({ ...p, unit_price: parseFloat(e.target.value) || 0 }))}
                  onFocus={handleInputSelect}
                  onClick={handleInputSelect}
                  min="0"
                  step="0.01"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-6 pr-3 py-2 text-right text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 transition-all"
                />
              </div>
            </div>

            {/* Rincaro (%) */}
            <div className="md:col-span-1 space-y-1.5">
              <label className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400 ml-1">Rinc. (%)</label>
              <div className="relative">
                <Percent className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={10} />
                <input 
                  type="number" 
                  value={newRowData.markup * 100}
                  onChange={(e) => setNewRowData(p => ({ ...p, markup: (parseFloat(e.target.value) || 0) / 100 }))}
                  onFocus={handleInputSelect}
                  onClick={handleInputSelect}
                  min="0"
                  className="w-full bg-white border border-slate-200 rounded-xl pl-3 pr-6 py-2 text-center text-xs font-bold text-slate-700 focus:outline-none focus:ring-4 focus:border-accent/50 focus:ring-accent/10 transition-all"
                />
              </div>
            </div>

            {/* Aggiungi Button */}
            <div className="md:col-span-1">
              <button
                type="button"
                onClick={handleAddRowToQuote}
                disabled={!newRowData.description.trim()}
                className={`w-full py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all cursor-pointer ${
                  newRowData.description.trim()
                  ? 'bg-accent text-white hover:bg-accent/90 shadow-md shadow-accent/20 font-bold'
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none font-bold'
                }`}
              >
                Aggiungi
              </button>
            </div>
          </div>
        </Card>

        {/* Quote Items Grid */}
        <Card hoverEffect={false} className="p-0 overflow-hidden bg-white/40 backdrop-blur-md border border-white/50 shadow-xl rounded-[2.5rem]">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-800">Righe Preventivo ({quoteItems.length})</span>
          </div>
          
          {quoteItems.length === 0 ? (
            <div className="text-center py-20 text-slate-400 font-bold italic text-xs uppercase tracking-widest bg-white/10">
              Nessun articolo aggiunto. Utilizza la barra sopra per cercare o inserire elementi.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="py-4 px-4 text-[0.55rem] font-black uppercase tracking-widest text-slate-400 w-24">Codice</th>
                    <th className="py-4 px-4 text-[0.55rem] font-black uppercase tracking-widest text-slate-400">Descrizione</th>
                    <th className="py-4 px-3 text-[0.55rem] font-black uppercase tracking-widest text-slate-400 text-center w-16">U.M.</th>
                    <th className="py-4 px-3 text-[0.55rem] font-black uppercase tracking-widest text-slate-400 text-center w-20">Q.tà</th>
                    <th className="py-4 px-4 text-[0.55rem] font-black uppercase tracking-widest text-slate-400 text-right w-28">Costo Cad.</th>
                    <th className="py-4 px-4 text-[0.55rem] font-black uppercase tracking-widest text-slate-400 text-center w-24">Rinc. (%)</th>
                    <th className="py-4 px-4 text-[0.55rem] font-black uppercase tracking-widest text-slate-400 text-right w-28">Vend. Cad.</th>
                    <th className="py-4 px-4 text-[0.55rem] font-black uppercase tracking-widest text-slate-400 text-right w-32">Vend. Totale</th>
                    <th className="py-4 px-4 text-[0.55rem] font-black uppercase tracking-widest text-slate-400 text-right w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700 bg-white/10">
                  {quoteItems.map((item, idx) => {
                    const rowCost = item.quantity * item.unit_price
                    const rowSale = rowCost * (1 + item.markup)
                    const unitSale = item.unit_price * (1 + item.markup)

                    return editingItemIndex === idx ? (
                      <tr key={idx} className="bg-accent/[0.03] hover:bg-accent/[0.05] transition-colors border-y border-slate-100">
                        {/* Codice */}
                        <td className="py-3 px-4">
                          <input 
                            type="text" 
                            value={inlineItemFormData.code || ''} 
                            onChange={(e) => handleInlineItemFieldChange('code', e.target.value)}
                            onFocus={handleInputSelect}
                            onClick={handleInputSelect}
                            className="w-full bg-white border border-slate-200 rounded-xl px-2.5 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </td>
                        {/* Descrizione */}
                        <td className="py-3 px-4">
                          <input 
                            type="text" 
                            value={inlineItemFormData.description} 
                            onChange={(e) => handleInlineItemFieldChange('description', e.target.value)}
                            onFocus={handleInputSelect}
                            onClick={handleInputSelect}
                            className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-accent"
                            placeholder="Fornitura o accessorio..."
                          />
                        </td>
                        {/* U.M. */}
                        <td className="py-3 px-3 text-center">
                          <input 
                            type="text" 
                            value={inlineItemFormData.unit || ''} 
                            onChange={(e) => handleInlineItemFieldChange('unit', e.target.value)}
                            onFocus={handleInputSelect}
                            onClick={handleInputSelect}
                            className="w-full bg-white border border-slate-200 rounded-xl py-2 text-center text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-accent"
                          />
                        </td>
                        {/* Q.tà */}
                        <td className="py-3 px-3 text-center">
                          <input 
                            type="number" 
                            value={inlineItemFormData.quantity} 
                            onChange={(e) => handleInlineItemFieldChange('quantity', e.target.value)}
                            onFocus={handleInputSelect}
                            onClick={handleInputSelect}
                            className="w-full bg-white border border-slate-200 rounded-xl py-2 text-center text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-accent"
                            min="0"
                          />
                        </td>
                        {/* Costo Cad. */}
                        <td className="py-3 px-4 text-right">
                          <div className="relative">
                            <Euro className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={10} />
                            <input 
                              type="number" 
                              value={inlineItemFormData.unit_price} 
                              onChange={(e) => handleInlineItemFieldChange('unit_price', e.target.value)}
                              onFocus={handleInputSelect}
                              onClick={handleInputSelect}
                              className="w-full bg-white border border-slate-200 rounded-xl pl-6 pr-2 py-2 text-right text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-accent"
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </td>
                        {/* Rinc. (%) */}
                        <td className="py-3 px-4 text-center">
                          <div className="relative">
                            <Percent className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400" size={10} />
                            <input 
                              type="number" 
                              value={Math.round(inlineItemFormData.markup * 100)} 
                              onChange={(e) => handleInlineItemFieldChange('markup', e.target.value)}
                              onFocus={handleInputSelect}
                              onClick={handleInputSelect}
                              className="w-full bg-white border border-slate-200 rounded-xl pl-2 pr-6 py-2 text-center text-xs font-bold text-slate-700 focus:outline-none focus:ring-1 focus:ring-accent"
                              min="0"
                            />
                          </div>
                        </td>
                        {/* Vend. Cad. */}
                        <td className="py-3 px-4 text-right text-slate-500">
                          {formatEuro(inlineItemFormData.unit_price * (1 + inlineItemFormData.markup))}
                        </td>
                        {/* Vend. Totale */}
                        <td className="py-3 px-4 text-right text-slate-900 font-black">
                          {formatEuro(inlineItemFormData.quantity * inlineItemFormData.unit_price * (1 + inlineItemFormData.markup))}
                        </td>
                        {/* Azioni */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              type="button"
                              onClick={handleSaveEditItem}
                              className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                              title="Salva"
                            >
                              <Check size={16} />
                            </button>
                            <button 
                              type="button"
                              onClick={handleCancelEditItem}
                              className="p-1.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              title="Annulla"
                            >
                              <X size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      <tr key={idx} className="hover:bg-slate-50/20 transition-colors group">
                        {/* Codice */}
                        <td className="py-3 px-4">
                          <span className="text-[0.65rem] font-black text-slate-500 uppercase tracking-widest">{item.code || '-'}</span>
                        </td>
                        {/* Descrizione */}
                        <td className="py-3 px-4">
                          <span className="text-xs font-bold text-slate-800 leading-tight">{item.description}</span>
                        </td>
                        {/* U.M. */}
                        <td className="py-3 px-3 text-center">
                          <span className="text-xs text-slate-500">{item.unit || 'pz'}</span>
                        </td>
                        {/* Q.tà */}
                        <td className="py-3 px-3 text-center">
                          <span className="text-xs font-bold text-slate-600">{item.quantity}</span>
                        </td>
                        {/* Costo Cad. */}
                        <td className="py-3 px-4 text-right">
                          <span className="text-xs text-slate-600">{formatEuro(item.unit_price)}</span>
                        </td>
                        {/* Rinc. (%) */}
                        <td className="py-3 px-4 text-center text-emerald-600 font-bold">
                          {(item.markup * 100).toFixed(0)}%
                        </td>
                        {/* Vend. Cad. */}
                        <td className="py-3 px-4 text-right text-slate-500">
                          {formatEuro(unitSale)}
                        </td>
                        {/* Vend. Totale */}
                        <td className="py-3 px-4 text-right text-slate-900 font-black">
                          {formatEuro(rowSale)}
                        </td>
                        {/* Azioni */}
                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                              type="button"
                              onClick={() => handleStartEditItem(idx)}
                              className="p-1.5 text-slate-400 hover:text-accent hover:bg-accent/5 rounded-lg transition-all cursor-pointer"
                              title="Modifica"
                            >
                              <Edit3 size={14} />
                            </button>
                            <button 
                              type="button"
                              onClick={() => setDeleteItemModal({ isOpen: true, itemIndex: idx })}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                              title="Elimina"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>



        {/* Metadata Editor Drawer (Only header fields) */}
        <DrawerShell
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          title="Modifica Intestazione"
          subtitle={quoteMeta.title || 'Scheda Preventivo'}
          icon={<FileText size={24} />}
          footer={
            <>
              <button 
                type="button" 
                onClick={() => setIsEditorOpen(false)} 
                className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2 font-bold"
              >
                Annulla
              </button>
              <button 
                type="button" 
                onClick={handleSaveQuoteMeta}
                disabled={isSaveDisabled}
                className={`flex-1 py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl font-bold ${
                  !isSaveDisabled
                  ? 'bg-accent text-white hover:bg-accent/90 shadow-accent/20' 
                  : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
                }`}
              >
                <Save size={18} /> Aggiorna Intestazione
              </button>
            </>
          }
        >
          <div className="space-y-10">
            <section className="space-y-6">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-accent rounded-full"></div>
                <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-800">Dati Intestazione</span>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Cliente *</label>
                  <ClientSelector 
                    clients={clients}
                    value={quoteMeta.client_id}
                    onChange={(val) => setQuoteMeta(p => ({ ...p, client_id: val }))}
                    onAddNew={handleAddNewClientClick}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Data Preventivo *</label>
                  <DatePicker 
                    value={quoteMeta.created_at} 
                    onChange={(val) => setQuoteMeta(p => ({ ...p, created_at: val }))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Titolo Preventivo *</label>
                  <div className="relative">
                    <FileText className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text" 
                      value={quoteMeta.title} 
                      onChange={(e) => setQuoteMeta(p => ({ ...p, title: e.target.value }))}
                      onFocus={handleInputSelect}
                      onClick={handleInputSelect}
                      placeholder="Es: Ristrutturazione stalla e fornitura accessori"
                      className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Stato Preventivo *</label>
                  <Select
                    options={statusOptions}
                    value={quoteMeta.status}
                    onChange={(val) => setQuoteMeta(p => ({ ...p, status: val }))}
                    placeholder="Seleziona stato..."
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Descrizione / Note</label>
                  <div className="relative">
                    <MessageSquare className="absolute left-5 top-5 text-slate-400" size={18} />
                    <textarea 
                      value={quoteMeta.description} 
                      onChange={(e) => setQuoteMeta(p => ({ ...p, description: e.target.value }))}
                      onFocus={handleInputSelect}
                      onClick={handleInputSelect}
                      placeholder="Note aggiuntive per l'offerta commerciale..."
                      rows={4}
                      className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm min-h-[100px] resize-none"
                    />
                  </div>
                </div>
              </div>
            </section>
          </div>
        </DrawerShell>

        {/* Client Creation Modal (on top of drawer) */}
        <EditClientDrawer 
          isOpen={isAddClientOpen}
          onClose={() => setIsAddClientOpen(false)}
          client={pendingClientName ? { name: pendingClientName } : null}
          onSave={handleSaveNewClient}
        />

        {/* Delete Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, quoteId: null })}
          onConfirm={handleDeleteQuote}
          title="Elimina Preventivo"
          message="Sei sicuro di voler eliminare definitivamente questo preventivo? L'azione è irreversibile e rimuoverà anche tutte le righe ad esso associate."
          confirmText="Elimina"
          cancelText="Annulla"
          type="danger"
        />

        {/* Delete Item Confirmation Modal */}
        <ConfirmModal
          isOpen={deleteItemModal.isOpen}
          onClose={() => setDeleteItemModal({ isOpen: false, itemIndex: null })}
          onConfirm={handleConfirmRemoveItem}
          title="Rimuovi Articolo"
          message="Sei sicuro di voler rimuovere questo articolo dal preventivo? Questa azione salverà le modifiche al database immediatamente."
          confirmText="Rimuovi"
          cancelText="Annulla"
          type="danger"
        />
      </div>
    );
  }

  // RENDERING LIST VIEW (default)
  return (
    <div className="space-y-8">
      {/* Test Banner Notice */}
      <div className="bg-amber-50 border border-amber-200 rounded-3xl p-6 flex items-start gap-4 text-amber-800">
        <AlertTriangle size={22} className="text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h4 className="text-xs font-black uppercase tracking-widest text-amber-700">Area di Test - Preventivi</h4>
          <p className="text-xs font-semibold leading-relaxed">
            Questa sezione è in fase di sviluppo sperimentale. Consente di preparare preventivi e ricercare articoli direttamente dal listino materiali del database. Le funzioni per esportare il preventivo e convertirlo in una commessa attiva verranno introdotte nelle próximas fasi.
          </p>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2 animate-fade-in">
            <FileText className="text-accent" size={24} />
            Gestione Preventivi
          </h2>
          <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest mt-1">
            Crea ed elabora i preventivi da presentare ai clienti
          </p>
        </div>

        <button 
          onClick={handleNewQuote}
          className="bg-accent text-white hover:bg-accent/90 transition-all rounded-2xl py-3.5 px-6 text-[0.7rem] font-black uppercase tracking-widest shadow-xl shadow-accent/20 flex items-center gap-2 cursor-pointer font-bold"
        >
          <Plus size={16} /> Nuovo Preventivo
        </button>
      </div>

      {loading ? (
        <div className="text-center py-24 text-slate-400 font-bold uppercase tracking-widest">
          Caricamento preventivi...
        </div>
      ) : quotes.length === 0 ? (
        <Card hoverEffect={false} className="p-12 text-center text-slate-400 italic font-bold uppercase tracking-widest bg-white/40 backdrop-blur-md border border-white/50">
          Nessun preventivo registrato
        </Card>
      ) : (
        <Card hoverEffect={false} className="p-0 overflow-hidden bg-white/40 backdrop-blur-md border border-white/50 shadow-xl rounded-[2.5rem]">
          <div className="overflow-x-auto animate-fade-in">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="py-4 px-8 text-[0.65rem] font-black uppercase tracking-widest text-slate-400">Cliente</th>
                  <th className="py-4 px-6 text-[0.65rem] font-black uppercase tracking-widest text-slate-400">Titolo Preventivo</th>
                  <th className="py-4 px-6 text-[0.65rem] font-black uppercase tracking-widest text-slate-400 text-center">Data</th>
                  <th className="py-4 px-6 text-[0.65rem] font-black uppercase tracking-widest text-slate-400 text-center">Dettagli</th>
                  <th className="py-4 px-6 text-[0.65rem] font-black uppercase tracking-widest text-slate-400 text-center">Stato</th>
                  <th className="py-4 px-8 text-[0.65rem] font-black uppercase tracking-widest text-slate-400 text-right">Azioni</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                {quotes.map((q) => {
                  return (
                    <tr key={q.id} className="hover:bg-white/50 transition-colors">
                      <td className="py-4 px-8 font-black uppercase text-slate-800 cursor-pointer" onClick={() => handleOpenQuoteDetail(q.id)}>{q.client_name}</td>
                      <td className="py-4 px-6 text-slate-600 cursor-pointer" onClick={() => handleOpenQuoteDetail(q.id)}>{q.title}</td>
                      <td className="py-4 px-6 text-center text-slate-500 font-semibold">{q.created_at}</td>
                      <td className="py-4 px-6 text-center">
                        <button 
                          onClick={() => handleOpenQuoteDetail(q.id)}
                          className="text-accent hover:underline font-black cursor-pointer"
                        >
                          Vedi Dettagli
                        </button>
                      </td>
                      <td className="py-4 px-6 text-center">{getStatusBadge(q.status)}</td>
                      <td className="py-4 px-8 text-right flex items-center justify-end gap-2.5">
                        <button 
                          onClick={() => handleEditQuoteMetaDirect(q.id)}
                          className="p-2.5 text-slate-400 hover:text-accent hover:bg-slate-50 rounded-xl transition-all cursor-pointer"
                          title="Modifica Intestazione"
                        >
                          <Edit size={16} />
                        </button>
                        <button 
                          onClick={() => setDeleteModal({ isOpen: true, quoteId: q.id })}
                          className="p-2.5 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-xl transition-all cursor-pointer"
                          title="Elimina Preventivo"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Metadata Editor Drawer (Header fields only) */}
      <DrawerShell
        isOpen={isEditorOpen}
        onClose={() => setIsEditorOpen(false)}
        title={quoteMeta.id ? 'Modifica Intestazione' : 'Nuovo Preventivo'}
        subtitle={quoteMeta.title || 'Scheda Preventivo'}
        icon={<FileText size={24} />}
        footer={
          <>
            <button 
              type="button" 
              onClick={() => setIsEditorOpen(false)} 
              className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2 font-bold"
            >
              Annulla
            </button>
            <button 
              type="button" 
              onClick={handleSaveQuoteMeta}
              disabled={isSaveDisabled}
              className={`flex-1 py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl font-bold ${
                !isSaveDisabled
                ? 'bg-accent text-white hover:bg-accent/90 shadow-accent/20' 
                : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
              }`}
            >
              <Save size={18} /> {quoteMeta.id ? 'Aggiorna Intestazione' : 'Crea Preventivo'}
            </button>
          </>
        }
      >
        <div className="space-y-10">
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-accent rounded-full"></div>
              <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-800">Dati Intestazione</span>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Cliente *</label>
                <ClientSelector 
                  clients={clients}
                  value={quoteMeta.client_id}
                  onChange={(val) => setQuoteMeta(p => ({ ...p, client_id: val }))}
                  onAddNew={handleAddNewClientClick}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Data Preventivo *</label>
                <DatePicker 
                  value={quoteMeta.created_at} 
                  onChange={(val) => setQuoteMeta(p => ({ ...p, created_at: val }))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Titolo Preventivo *</label>
                <div className="relative">
                  <FileText className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" 
                    value={quoteMeta.title} 
                    onChange={(e) => setQuoteMeta(p => ({ ...p, title: e.target.value }))}
                    onFocus={handleInputSelect}
                    onClick={handleInputSelect}
                    placeholder="Es: Ristrutturazione stalla e fornitura accessori"
                    className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Stato Preventivo *</label>
                <Select
                  options={statusOptions}
                  value={quoteMeta.status}
                  onChange={(val) => setQuoteMeta(p => ({ ...p, status: val }))}
                  placeholder="Seleziona stato..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Descrizione / Note</label>
                <div className="relative">
                  <MessageSquare className="absolute left-5 top-5 text-slate-400" size={18} />
                  <textarea 
                    value={quoteMeta.description} 
                    onChange={(e) => setQuoteMeta(p => ({ ...p, description: e.target.value }))}
                    onFocus={handleInputSelect}
                    onClick={handleInputSelect}
                    placeholder="Note aggiuntive per l'offerta commerciale..."
                    rows={4}
                    className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm min-h-[100px] resize-none"
                  />
                </div>
              </div>
            </div>
          </section>
        </div>
      </DrawerShell>

      {/* Client Creation Modal (on top of drawer) */}
      <EditClientDrawer 
        isOpen={isAddClientOpen}
        onClose={() => setIsAddClientOpen(false)}
        client={pendingClientName ? { name: pendingClientName } : null}
        onSave={handleSaveNewClient}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, quoteId: null })}
        onConfirm={handleDeleteQuote}
        title="Elimina Preventivo"
        message="Sei sicuro di voler eliminare definitivamente questo preventivo? L'azione è irreversibile e rimuoverà anche tutte le righe ad esso associate."
        confirmText="Elimina"
        cancelText="Annulla"
        type="danger"
      />

      {/* Duplicate Item Warning Portal */}
      {duplicateModal.isOpen && duplicateModal.existingItem && duplicateModal.newItem && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6">
          <div 
            onClick={() => setDuplicateModal({ isOpen: false, newItem: null, existingIndex: null, existingItem: null })}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          />
          
          <div className="relative w-full max-w-lg bg-white/95 backdrop-blur-xl rounded-[2.5rem] border border-white/50 shadow-2xl overflow-hidden p-8 space-y-6">
            <div className="flex justify-between items-start">
              <div className="p-4 rounded-2xl bg-amber-50 text-amber-500">
                <AlertTriangle size={24} />
              </div>
              <button 
                onClick={() => setDuplicateModal({ isOpen: false, newItem: null, existingIndex: null, existingItem: null })} 
                className="p-2 text-slate-300 hover:text-slate-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="text-xl font-black text-slate-800 tracking-tight">Articolo già presente</h3>
              <p className="text-sm font-semibold text-slate-500 leading-relaxed">
                L'articolo con codice <strong className="text-slate-700">"{duplicateModal.newItem.code || 'N/A'}"</strong> e descrizione <strong className="text-slate-700">"{duplicateModal.newItem.description}"</strong> è già presente in questo preventivo.
              </p>
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100/80 space-y-1.5 text-xs">
                <p className="text-slate-400 font-bold uppercase tracking-wider text-[0.6rem]">Stato nel preventivo:</p>
                <p className="font-bold text-slate-700">Quantità esistente: {duplicateModal.existingItem.quantity} {duplicateModal.existingItem.unit}</p>
                <p className="font-bold text-accent">Nuova quantità da inserire: {duplicateModal.newItem.quantity} {duplicateModal.newItem.unit}</p>
              </div>
            </div>

            <div className="flex flex-col gap-3">
              <button
                onClick={handleDuplicateAdd}
                className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl text-[0.7rem] font-black uppercase tracking-widest transition-all shadow-xl shadow-emerald-500/20 cursor-pointer"
              >
                Somma quantità (+{duplicateModal.newItem.quantity} {duplicateModal.existingItem.unit} = {duplicateModal.existingItem.quantity + duplicateModal.newItem.quantity})
              </button>
              <button
                onClick={handleDuplicateOverwrite}
                className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-white rounded-2xl text-[0.7rem] font-black uppercase tracking-widest transition-all shadow-xl shadow-amber-500/20 cursor-pointer"
              >
                Sovrascrivi quantità (diventa {duplicateModal.newItem.quantity} {duplicateModal.newItem.unit})
              </button>
              <button
                onClick={handleDuplicateCreateNew}
                className="w-full py-4 bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                Aggiungi come riga separata
              </button>
              <button
                onClick={() => setDuplicateModal({ isOpen: false, newItem: null, existingIndex: null, existingItem: null })}
                className="w-full py-4 bg-slate-100 text-slate-500 hover:bg-slate-200 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest transition-all cursor-pointer"
              >
                Annulla inserimento
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}

export default Quotes
