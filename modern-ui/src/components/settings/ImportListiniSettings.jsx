import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { open as openFileDialog } from '@tauri-apps/plugin-dialog'
import { motion } from 'framer-motion'
import { 
  FileSpreadsheet, 
  FileText,
  Upload, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Info, 
  Eye,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  List,
  Edit,
  Edit3,
  Check,
  X,
  Briefcase
} from 'lucide-react'
import ConfirmModal from '../ui/ConfirmModal'
import Select from '../ui/Select'

const ImportListiniSettings = () => {
  const [summary, setSummary] = useState({ total_count: 0, suppliers: [] })
  const [loadingSummary, setLoadingSummary] = useState(true)
  const [importing, setImporting] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [selectedFilePath, setSelectedFilePath] = useState('')
  const [clearExisting, setClearExisting] = useState(true)
  const [status, setStatus] = useState({ type: '', message: '' })
  const [isDragging, setIsDragging] = useState(false)
  const [previewItems, setPreviewItems] = useState([])
  const [loadingPreview, setLoadingPreview] = useState(false)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  // PDF import states
  const [selectedPdfPath, setSelectedPdfPath] = useState('')
  const [pdfImporting, setPdfImporting] = useState(false)
  const [pdfPreviewItems, setPdfPreviewItems] = useState([])
  const [loadingPdfPreview, setLoadingPdfPreview] = useState(false)
  const [pdfMappings, setPdfMappings] = useState([])
  const [isXmlFile, setIsXmlFile] = useState(false)
  const [rowSearchResults, setRowSearchResults] = useState({})
  const [rowSearchQueries, setRowSearchQueries] = useState({})

  // Tab selector state
  const [activeSettingsTab, setActiveSettingsTab] = useState('import') // 'import' or 'view'
  
  // States for viewing catalog list
  const [catalogItems, setCatalogItems] = useState([])
  const [loadingCatalog, setLoadingCatalog] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [catalogSearch, setCatalogSearch] = useState('')
  const [catalogSupplier, setCatalogSupplier] = useState('all')
  const [catalogSort, setCatalogSort] = useState({ field: 'code', direction: 'asc' })
  const [catalogPage, setCatalogPage] = useState(1)
  const [catalogLimit, setCatalogLimit] = useState(25)
  const [totalCatalogCount, setTotalCatalogCount] = useState(0)

  // Editing and confirmation states for individual catalog items
  const [editingRowId, setEditingRowId] = useState(null)
  const [editFormData, setEditFormData] = useState({
    id: null,
    code: '',
    description: '',
    unit: '',
    unit_price: 0,
    markup: 0,
    supplier: ''
  })
  const [isRowSaveConfirmOpen, setIsRowSaveConfirmOpen] = useState(false)
  const [rowToSave, setRowToSave] = useState(null)
  const [isRowDeleteConfirmOpen, setIsRowDeleteConfirmOpen] = useState(false)
  const [rowToDeleteId, setRowToDeleteId] = useState(null)
  const [isImportConfirmOpen, setIsImportConfirmOpen] = useState(false)

  const loadSummary = async () => {
    try {
      setLoadingSummary(true)
      const res = await invoke('get_catalog_summary')
      setSummary(res)
    } catch (err) {
      console.error("Errore caricamento riepilogo catalogo:", err)
      setStatus({ type: 'error', message: 'Errore caricamento catalogo: ' + err })
    } finally {
      setLoadingSummary(false)
    }
  }

  useEffect(() => {
    loadSummary()

    let active = true
    let unlistenFn = null

    const listenToDragDrop = async () => {
      try {
        const { getCurrentWindow } = await import('@tauri-apps/api/window')
        const currentWin = getCurrentWindow()

        const unlisten = await currentWin.onDragDropEvent((event) => {
          if (event.payload.type === 'hover') {
            setIsDragging(true)
          } else if (event.payload.type === 'cancel') {
            setIsDragging(false)
          } else if (event.payload.type === 'drop') {
            setIsDragging(false)
            if (event.payload.paths && event.payload.paths.length > 0) {
              const filePath = event.payload.paths[0]
              const ext = filePath.split('.').pop().toLowerCase()
              if (['xlsx', 'xls', 'xlsm', 'xlsb', 'csv'].includes(ext)) {
                setSelectedFilePath(filePath)
                setSelectedPdfPath('')
                setStatus({ type: '', message: '' })
              } else if (ext === 'pdf' || ext === 'xml') {
                setSelectedPdfPath(filePath)
                setSelectedFilePath('')
                setStatus({ type: '', message: '' })
              } else {
                setStatus({ type: 'error', message: 'Tipo di file non supportato. Seleziona un file Excel, CSV, PDF o XML.' })
              }
            }
          }
        })

        if (!active) {
          unlisten()
        } else {
          unlistenFn = unlisten
        }
      } catch (err) {
        console.error("Errore inizializzazione drag-and-drop:", err)
      }
    }

    listenToDragDrop()

    return () => {
      active = false
      if (unlistenFn) {
        unlistenFn()
      }
    }
  }, [])

  useEffect(() => {
    if (selectedFilePath) {
      const fetchPreview = async () => {
        setLoadingPreview(true)
        setPreviewItems([])
        try {
          const items = await invoke('get_catalog_preview', { filePath: selectedFilePath })
          setPreviewItems(items)
        } catch (err) {
          console.error("Errore caricamento anteprima:", err)
          setStatus({ type: 'error', message: 'Impossibile leggere l\'anteprima del file: ' + err })
        } finally {
          setLoadingPreview(false)
        }
      }
      fetchPreview()
    } else {
      setPreviewItems([])
    }
  }, [selectedFilePath])

  useEffect(() => {
    if (selectedPdfPath) {
      const fetchPdfPreview = async () => {
        setLoadingPdfPreview(true)
        setPdfPreviewItems([])
        try {
          const ext = selectedPdfPath.split('.').pop().toLowerCase()
          if (ext === 'xml') {
            setIsXmlFile(true)
            const rows = await invoke('parse_invoice_xml', { filePath: selectedPdfPath })
            const preview = rows.map(r => ({
              description: r.invoice_item.description,
              unit: r.invoice_item.unit,
              unit_price: r.invoice_item.unit_price,
              supplier: 'MARCHIOL S.P.A.'
            }))
            setPdfPreviewItems(preview)
            
            const formattedMappings = rows.map(r => ({
              id: r.id,
              pdfItem: {
                description: r.invoice_item.description,
                unit: r.invoice_item.unit,
                unit_price: r.invoice_item.unit_price,
                supplier: 'MARCHIOL S.P.A.'
              },
              suggestedItem: r.suggested_item,
              matchScore: r.match_score,
              action: r.action,
              selectedCatalogItemId: r.selected_catalog_item_id,
              customCode: r.custom_code,
              invoiceItem: r.invoice_item
            }))
            setPdfMappings(formattedMappings)
          } else {
            setIsXmlFile(false)
            // Simulate loading PDF items (descriptions and prices only, no codes)
            await new Promise(resolve => setTimeout(resolve, 1500))
            setPdfPreviewItems([
              { description: 'Cavo FG16OR16 3G2.5 mm² - Isolamento Butilico', unit: 'm', unit_price: 1.85, supplier: 'Fornitore Generico' },
              { description: 'Scatola derivazione PT6 da incasso con coperchio', unit: 'pz', unit_price: 4.20, supplier: 'Fornitore Generico' },
              { description: 'Interruttore bipolare 16A compatibile serie civile', unit: 'pz', unit_price: 7.90, supplier: 'Fornitore Generico' },
              { description: 'Tubo corrugato RK15 diametro 20 mm autoestinguente', unit: 'm', unit_price: 0.35, supplier: 'Fornitore Generico' },
              { description: 'Plafoniera LED 30W 4000K IP65 tenuta stagna', unit: 'pz', unit_price: 24.50, supplier: 'Fornitore Generico' }
            ])
          }
        } catch (err) {
          console.error("Errore caricamento anteprima:", err)
          setStatus({ type: 'error', message: 'Impossibile leggere il file: ' + err })
        } finally {
          setLoadingPdfPreview(false)
        }
      }
      fetchPdfPreview()
    } else {
      setPdfPreviewItems([])
    }
  }, [selectedPdfPath])

  useEffect(() => {
    if (pdfPreviewItems.length > 0 && !isXmlFile) {
      const defaultMappings = pdfPreviewItems.map((item, idx) => {
        let suggestedItem = null
        let matchScore = 0
        let action = 'ignore'

        if (idx === 0) {
          suggestedItem = { id: 101, code: 'CAV-FG16-3G2.5', description: 'Cavo FG16OR16 3G2.5 mm² - Isolamento Butilico', unit: 'm', unit_price: 1.72 }
          matchScore = 95
          action = 'update'
        } else if (idx === 1) {
          suggestedItem = { id: 102, code: 'SCAT-PT6', description: 'Scatola derivazione PT6 c/cop', unit: 'pz', unit_price: 3.90 }
          matchScore = 88
          action = 'update'
        } else if (idx === 2) {
          suggestedItem = { id: 103, code: 'INT-BIPT16', description: 'Interruttore bipolare 16A', unit: 'pz', unit_price: 7.20 }
          matchScore = 84
          action = 'update'
        } else if (idx === 3) {
          suggestedItem = { id: 104, code: 'TUB-RK15-20', description: 'Tubo corrugato RK15 d20', unit: 'm', unit_price: 0.38 }
          matchScore = 79
          action = 'update'
        } else if (idx === 4) {
          // Low similarity or not found
          suggestedItem = null
          matchScore = 0
          action = 'create'
        }

        return {
          id: idx,
          pdfItem: item,
          suggestedItem,
          matchScore,
          action, // 'update', 'create', 'ignore'
          selectedCatalogItemId: suggestedItem ? suggestedItem.id : null,
          customCode: idx === 4 ? 'PLAF-LED-30W-NEW' : ''
        }
      })
      setPdfMappings(defaultMappings)
    } else if (pdfPreviewItems.length === 0) {
      setPdfMappings([])
    }
  }, [pdfPreviewItems, isXmlFile])

  // Debounce per la ricerca del catalogo
  useEffect(() => {
    const timer = setTimeout(() => {
      setCatalogSearch(searchQuery)
      setCatalogPage(1)
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const loadCatalogMaterials = async () => {
    try {
      setLoadingCatalog(true)
      const offset = (catalogPage - 1) * catalogLimit
      const res = await invoke('get_catalog_materials', {
        search: catalogSearch,
        supplier: catalogSupplier,
        sortBy: catalogSort.field,
        sortDesc: catalogSort.direction === 'desc',
        limit: catalogLimit,
        offset: offset
      })
      setCatalogItems(res.items || [])
      setTotalCatalogCount(res.total_count || 0)
    } catch (err) {
      console.error("Errore caricamento materiali catalogo:", err)
    } finally {
      setLoadingCatalog(false)
    }
  }

  // Ricarica i materiali quando cambiano i filtri o la pagina
  useEffect(() => {
    if (activeSettingsTab === 'view') {
      loadCatalogMaterials()
    }
  }, [activeSettingsTab, catalogSearch, catalogSupplier, catalogSort, catalogPage, catalogLimit])

  const handleCatalogSort = (field) => {
    setCatalogSort(prev => ({
      field,
      direction: prev.field === field && prev.direction === 'asc' ? 'desc' : 'asc'
    }))
    setCatalogPage(1)
  }

  const CatalogSortIcon = ({ field }) => {
    if (catalogSort.field !== field) return <ChevronsUpDown size={12} className="opacity-30 hover:opacity-100 transition-opacity" />;
    return catalogSort.direction === 'asc' ? <ChevronUp size={12} className="text-teal-600" /> : <ChevronDown size={12} className="text-teal-600" />;
  }

  const handleStartEditRow = (item) => {
    setEditingRowId(item.id)
    setEditFormData({
      id: item.id,
      code: item.code || '',
      description: item.description || '',
      unit: item.unit || '',
      unit_price: item.unit_price !== null && item.unit_price !== undefined ? item.unit_price : 0,
      markup: item.markup !== null && item.markup !== undefined ? Math.round(item.markup * 100) : 0,
      supplier: item.supplier || ''
    })
  }

  const handleCancelEditRow = () => {
    setEditingRowId(null)
    setEditFormData({
      id: null,
      code: '',
      description: '',
      unit: '',
      unit_price: 0,
      markup: 0,
      supplier: ''
    })
  }

  const handleStartSaveRow = (formData) => {
    setRowToSave(formData)
    setIsRowSaveConfirmOpen(true)
  }

  const executeSaveRow = async () => {
    if (!rowToSave) return
    try {
      const parsedPrice = rowToSave.unit_price !== '' ? parseFloat(rowToSave.unit_price) : 0.0
      const parsedMarkup = rowToSave.markup !== '' ? parseFloat(rowToSave.markup) / 100.0 : 0.0
      
      const itemToSave = {
        ...rowToSave,
        unit_price: isNaN(parsedPrice) ? 0.0 : parsedPrice,
        markup: isNaN(parsedMarkup) ? 0.0 : parsedMarkup
      }
      await invoke('save_catalog_material', { item: itemToSave })
      setStatus({ type: 'success', message: 'Articolo aggiornato con successo!' })
      setEditingRowId(null)
      setRowToSave(null)
      setIsRowSaveConfirmOpen(false)
      loadCatalogMaterials()
      loadSummary()
    } catch (err) {
      console.error("Errore salvataggio articolo:", err)
      setStatus({ type: 'error', message: 'Errore durante il salvataggio: ' + err })
    }
  }

  const handleStartDeleteRow = (id) => {
    setRowToDeleteId(id)
    setIsRowDeleteConfirmOpen(true)
  }

  const executeDeleteRow = async () => {
    if (!rowToDeleteId) return
    try {
      await invoke('delete_catalog_material', { id: rowToDeleteId })
      setStatus({ type: 'success', message: 'Articolo eliminato con successo!' })
      setRowToDeleteId(null)
      setIsRowDeleteConfirmOpen(false)
      const totalPages = Math.ceil((totalCatalogCount - 1) / catalogLimit)
      if (catalogPage > totalPages && totalPages > 0) {
        setCatalogPage(totalPages)
      } else {
        loadCatalogMaterials()
      }
      loadSummary()
    } catch (err) {
      console.error("Errore eliminazione articolo:", err)
      setStatus({ type: 'error', message: 'Errore durante l\'eliminazione: ' + err })
    }
  }

  const handleSelectFile = async () => {
    try {
      setStatus({ type: '', message: '' })
      const selected = await openFileDialog({
        multiple: false,
        filters: [{
          name: 'File Listino (Excel, CSV)',
          extensions: ['xlsx', 'xls', 'xlsm', 'xlsb', 'csv']
        }]
      })
      if (selected) {
        setSelectedFilePath(selected)
        setSelectedPdfPath('')
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Errore selezione file: ' + err })
    }
  }

  const handleImport = async () => {
    if (!selectedFilePath) return

    setImporting(true)
    setStatus({ type: '', message: '' })
    try {
      const count = await invoke('import_catalog_materials', {
        filePath: selectedFilePath,
        clearExisting: clearExisting
      })
      setStatus({ 
        type: 'success', 
        message: `Importazione completata! Aggiunti/aggiornati ${count} articoli.` 
      })
      setSelectedFilePath('')
      loadSummary()
    } catch (err) {
      setStatus({ type: 'error', message: 'Errore importazione: ' + err })
    } finally {
      setImporting(false)
    }
  }

  const handleSelectPdfFile = async () => {
    try {
      setStatus({ type: '', message: '' })
      const selected = await openFileDialog({
        multiple: false,
        filters: [{
          name: 'Fattura PDF o XML',
          extensions: ['pdf', 'xml']
        }]
      })
      if (selected) {
        setSelectedPdfPath(selected)
        setSelectedFilePath('')
      }
    } catch (err) {
      setStatus({ type: 'error', message: 'Errore selezione file: ' + err })
    }
  }

  const handleImportPdf = () => {
    if (!selectedPdfPath) return
    setIsImportConfirmOpen(true)
  }

  const executeImportPdf = async () => {
    setIsImportConfirmOpen(false)
    setPdfImporting(true)
    setStatus({ type: '', message: '' })
    try {
      const ext = selectedPdfPath.split('.').pop().toLowerCase()
      if (ext === 'xml') {
        const rustMappings = pdfMappings.map(m => ({
          id: m.id,
          invoice_item: m.invoiceItem,
          suggested_item: m.suggestedItem,
          match_score: m.matchScore,
          action: m.action,
          selected_catalog_item_id: m.selectedCatalogItemId,
          custom_code: m.customCode
        }))
        
        await invoke('import_invoice_mappings', {
          mappings: rustMappings,
          supplier: 'MARCHIOL S.P.A.'
        })
        
        const processed = rustMappings.filter(m => m.action !== 'ignore')
        setStatus({ 
          type: 'success', 
          message: `Importazione XML completata con successo! Elaborati ${processed.length} articoli (Aggiornati/Associati: ${rustMappings.filter(m => m.action === 'update').length}, Nuovi Creati: ${rustMappings.filter(m => m.action === 'create').length}).` 
        })
      } else {
        // Simulate database update for PDF
        await new Promise(resolve => setTimeout(resolve, 2000))
        const processed = pdfMappings.filter(m => m.action !== 'ignore')
        setStatus({ 
          type: 'success', 
          message: `Aggiornamento da PDF completato! Elaborati ${processed.length} articoli (Aggiornati/Associati: ${pdfMappings.filter(m => m.action === 'update').length}, Nuovi Creati: ${pdfMappings.filter(m => m.action === 'create').length}).` 
        })
      }
      setSelectedPdfPath('')
      loadSummary()
    } catch (err) {
      console.error("Errore importazione:", err)
      setStatus({ type: 'error', message: 'Errore importazione: ' + err })
    } finally {
      setPdfImporting(false)
    }
  }

  const handleUpdateMappingAction = (rowId, action) => {
    setPdfMappings(prev => prev.map(m => {
      if (m.id === rowId) {
        let suggestedItem = m.suggestedItem
        // Default mock suggestion if switching back to 'update'
        if (action === 'update' && !suggestedItem) {
          suggestedItem = { id: 105, code: 'NEW-MOCK-CODE', description: m.pdfItem.description, unit: m.pdfItem.unit, unit_price: 10.00 }
        }
        return {
          ...m,
          action,
          suggestedItem,
          selectedCatalogItemId: suggestedItem ? suggestedItem.id : null
        }
      }
      return m
    }))
  }

  const handleCustomCodeChange = (rowId, val) => {
    setPdfMappings(prev => prev.map(m => m.id === rowId ? { ...m, customCode: val } : m))
  }

  const handleSearchAlternativeCatalogItem = async (rowId, query) => {
    setRowSearchQueries(prev => ({ ...prev, [rowId]: query }))
    if (query.trim().length < 2) {
      setRowSearchResults(prev => ({ ...prev, [rowId]: [] }))
      return
    }
    try {
      const results = await invoke('search_catalog_materials', { query })
      setRowSearchResults(prev => ({ ...prev, [rowId]: results }))
    } catch (err) {
      console.error("Errore ricerca alternativa catalogo:", err)
    }
  }

  const handleSelectAlternativeItem = (rowId, item) => {
    setPdfMappings(prev => prev.map(m => {
      if (m.id === rowId) {
        return {
          ...m,
          suggestedItem: item,
          selectedCatalogItemId: item.id,
          matchScore: 100
        }
      }
      return m
    }))
    setRowSearchResults(prev => ({ ...prev, [rowId]: [] }))
    setRowSearchQueries(prev => ({ ...prev, [rowId]: '' }))
  }

  const handleClearCatalog = () => {
    setIsConfirmOpen(true)
  }

  const executeClearCatalog = async () => {
    setClearing(true)
    setStatus({ type: '', message: '' })
    try {
      await invoke('clear_catalog_materials')
      setStatus({ type: 'success', message: 'Catalogo svuotato con successo!' })
      setCatalogItems([])
      setTotalCatalogCount(0)
      setCatalogPage(1)
      loadSummary()
    } catch (err) {
      setStatus({ type: 'error', message: 'Errore durante lo svuotamento: ' + err })
    } finally {
      setClearing(false)
    }
  }

  return (
    <div className="space-y-8 animate-premium-in">
      {/* Selettore Tab in alto */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-slate-100 pb-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight">Catalogo Materiali e Listini</h2>
          <p className="text-[0.7rem] font-black uppercase tracking-[0.3em] text-slate-400 mt-1">
            {activeSettingsTab === 'import' ? 'Gestione caricamento e svuotamento catalogo' : 'Naviga, filtra e ordina gli articoli importati'}
          </p>
        </div>
        
        <div className="relative flex gap-1 bg-white/50 backdrop-blur-md p-1 rounded-2xl border border-slate-200/50 shadow-sm shrink-0">
          <button
            onClick={() => setActiveSettingsTab('import')}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-[0.65rem] font-black uppercase tracking-widest transition-all z-10 ${
              activeSettingsTab === 'import' 
                ? 'text-white' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <Upload size={14} />
            Importazione
            {activeSettingsTab === 'import' && (
              <motion.div
                layoutId="activeSettingsTab"
                className="absolute inset-0 bg-teal-600 rounded-xl -z-10 shadow-lg shadow-teal-600/10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
          <button
            onClick={() => setActiveSettingsTab('view')}
            className={`relative flex items-center gap-2 px-5 py-2.5 rounded-xl text-[0.65rem] font-black uppercase tracking-widest transition-all z-10 ${
              activeSettingsTab === 'view' 
                ? 'text-white' 
                : 'text-slate-400 hover:text-slate-600'
            }`}
          >
            <List size={14} />
            Elenco Articoli
            {activeSettingsTab === 'view' && (
              <motion.div
                layoutId="activeSettingsTab"
                className="absolute inset-0 bg-teal-600 rounded-xl -z-10 shadow-lg shadow-teal-600/10"
                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
              />
            )}
          </button>
        </div>
      </div>

      {status.message && (
        <div className={`p-4 rounded-2xl flex items-center gap-4 ${
          status.type === 'success' ? 'bg-teal-50 text-teal-600 border border-teal-100' : 'bg-red-50 text-red-500 border border-red-100'
        }`}>
          {status.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          <span className="text-sm font-bold uppercase tracking-widest">{status.message}</span>
        </div>
      )}

      {activeSettingsTab === 'import' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* CARICAMENTO FILE */}
          <div className="bg-white/40 backdrop-blur-md border border-white/60 p-10 rounded-[3rem] shadow-xl space-y-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-4 border-b border-slate-100 pb-6 mb-6">
                <div className="p-3 bg-teal-100 text-teal-600 rounded-2xl">
                  <FileSpreadsheet size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Importazione Listini</h3>
                  <p className="text-xs font-bold text-slate-400">Importa i cataloghi materiali da fogli Excel (.xlsx) o CSV</p>
                </div>
              </div>

              <div className="space-y-6">
                <div 
                  className={`flex flex-col items-center justify-center py-10 rounded-[2.5rem] border transition-all duration-300 space-y-4 ${
                    isDragging 
                      ? 'bg-teal-50/80 border-dashed border-teal-400 scale-[1.02] shadow-inner' 
                      : 'bg-slate-50/50 border-slate-100'
                  }`}
                >
                  <div className={`p-6 rounded-3xl shadow-lg border border-slate-100/50 transition-all duration-300 ${
                    isDragging ? 'bg-teal-500 text-white border-teal-400' : 'bg-white/80 text-teal-500'
                  }`}>
                    <Upload size={40} className={isDragging ? 'animate-pulse' : 'animate-bounce'} />
                  </div>
                  <div className="text-center max-w-sm space-y-2">
                    <h4 className="text-md font-black text-slate-800 uppercase tracking-tight">
                      {isDragging 
                        ? 'Rilascia il file qui' 
                        : selectedFilePath 
                          ? 'File Selezionato' 
                          : 'Trascina o Seleziona un Listino'}
                    </h4>
                    <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest leading-relaxed px-4 break-all">
                      {isDragging 
                        ? 'Rilascia il file Excel o CSV per caricarlo.' 
                        : selectedFilePath 
                          ? selectedFilePath 
                          : 'Trascina qui il file oppure fai click sotto per cercarlo.'}
                    </p>
                  </div>
                  {!isDragging && (
                    <button
                      onClick={handleSelectFile}
                      disabled={importing}
                      className="px-6 py-3 bg-white text-slate-700 hover:bg-slate-50 rounded-xl font-black uppercase tracking-widest text-[0.65rem] border border-slate-200 transition-all shadow-sm disabled:opacity-50"
                    >
                      Sfoglia file...
                    </button>
                  )}
                </div>

                {selectedFilePath && (
                  <div className="bg-slate-50/80 rounded-[2.5rem] p-6 border border-slate-100 space-y-6 animate-premium-in">
                    {/* Anteprima dei dati */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                        <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                          <Eye size={14} className="text-teal-600 animate-pulse" /> Anteprima Dati (Primi 5 articoli)
                        </span>
                        {loadingPreview ? (
                          <span className="text-[0.65rem] font-bold text-slate-400 animate-pulse">Caricamento anteprima...</span>
                        ) : previewItems.length > 0 ? (
                          <span className="text-[0.65rem] font-black text-teal-600 uppercase tracking-widest bg-teal-50 px-2.5 py-1 rounded-full border border-teal-100 flex items-center gap-1 shadow-sm">
                            <CheckCircle2 size={10} /> Struttura Rilevata
                          </span>
                        ) : null}
                      </div>

                      {loadingPreview ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-3 bg-white/40 backdrop-blur-sm border border-slate-100 rounded-2xl">
                          <Loader2 size={24} className="animate-spin text-teal-600" />
                          <span className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest">Lettura righe in corso...</span>
                        </div>
                      ) : previewItems.length > 0 ? (
                        <div className="overflow-x-auto rounded-2xl border border-slate-200/50 bg-white/80 shadow-sm">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-100/50 border-b border-slate-200/50">
                                <th className="py-2.5 px-4 text-[0.65rem] font-black text-slate-400 uppercase tracking-wider">Codice</th>
                                <th className="py-2.5 px-4 text-[0.65rem] font-black text-slate-400 uppercase tracking-wider">Descrizione</th>
                                <th className="py-2.5 px-4 text-[0.65rem] font-black text-slate-400 uppercase tracking-wider text-center">U.M.</th>
                                <th className="py-2.5 px-4 text-[0.65rem] font-black text-slate-400 uppercase tracking-wider text-right">Prezzo Unit.</th>
                                <th className="py-2.5 px-4 text-[0.65rem] font-black text-slate-400 uppercase tracking-wider text-right">Ricarico</th>
                                <th className="py-2.5 px-4 text-[0.65rem] font-black text-slate-400 uppercase tracking-wider">Fornitore</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {previewItems.map((item, idx) => (
                                <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                                  <td className="py-2.5 px-4 text-[0.7rem] font-bold text-slate-500 font-mono break-all max-w-[120px]">
                                    {item.code || <span className="text-slate-300 italic font-sans">N/D</span>}
                                  </td>
                                  <td className="py-2.5 px-4 text-[0.7rem] font-black text-slate-700 truncate max-w-[200px]" title={item.description}>
                                    {item.description}
                                  </td>
                                  <td className="py-2.5 px-4 text-[0.7rem] font-bold text-slate-500 text-center">
                                    {item.unit || <span className="text-slate-300 italic">pz</span>}
                                  </td>
                                  <td className="py-2.5 px-4 text-[0.7rem] font-black text-slate-700 text-right">
                                    {item.unit_price !== null && item.unit_price !== undefined 
                                      ? `€ ${item.unit_price.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` 
                                      : '€ 0,00'}
                                  </td>
                                  <td className="py-2.5 px-4 text-[0.7rem] font-black text-slate-700 text-right">
                                    {item.markup !== null && item.markup !== undefined
                                      ? `${(item.markup * 100).toFixed(0)}%` 
                                      : '0%'}
                                  </td>
                                  <td className="py-2.5 px-4 text-[0.7rem] font-bold text-slate-500 uppercase tracking-tight truncate max-w-[100px]" title={item.supplier}>
                                    {item.supplier || <span className="text-slate-300 italic">N/D</span>}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="flex items-center gap-3 p-4 bg-amber-50 text-amber-600 border border-amber-100 rounded-2xl">
                          <AlertCircle size={18} className="shrink-0" />
                          <span className="text-[0.65rem] font-bold uppercase tracking-wider leading-relaxed">
                            Nessun articolo valido estratto. Verifica che il file Excel o CSV contenga intestazioni corrette (es. Codice, Descrizione, Prezzo) e dati validi.
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-3 pt-2">
                      <input
                        type="checkbox"
                        id="clearExisting"
                        checked={clearExisting}
                        onChange={(e) => setClearExisting(e.target.checked)}
                        className="w-5 h-5 accent-teal-600 rounded cursor-pointer shrink-0"
                      />
                      <label htmlFor="clearExisting" className="text-[0.65rem] font-black uppercase tracking-wider text-slate-600 cursor-pointer select-none">
                        Cancella catalogo esistente prima dell'importazione
                      </label>
                    </div>

                    <button
                      onClick={handleImport}
                      disabled={importing || loadingPreview}
                      className="w-full flex items-center justify-center gap-2 h-14 bg-teal-600 hover:bg-teal-700 text-white rounded-2xl text-[0.7rem] font-black uppercase tracking-widest transition-all shadow-xl shadow-teal-600/10 disabled:opacity-50"
                    >
                      {importing ? (
                        <>
                          <Loader2 size={18} className="animate-spin" /> Elaborazione ed Importazione...
                        </>
                      ) : (
                        'Avvia Importazione Catalogo'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-start gap-3 mt-6">
              <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
              <span className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest leading-normal">
                Il sistema analizzerà automaticamente le intestazioni delle colonne del file. Si raccomanda di utilizzare nomi standard per le colonne: CODICE, DESCRIZIONE, UM, UNITARIO e FORNITORE.
              </span>
            </div>
          </div>

          {/* CARICAMENTO FILE PDF */}
          <div className="bg-white/40 backdrop-blur-md border border-white/60 p-10 rounded-[3rem] shadow-xl space-y-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-4 border-b border-slate-100 pb-6 mb-6">
                <div className="p-3 bg-indigo-100 text-indigo-600 rounded-2xl">
                  <FileText size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Aggiornamento da PDF / XML</h3>
                  <p className="text-xs font-bold text-slate-400">Aggiorna e modifica il listino esistente caricando un file PDF o XML (Fattura Elettronica)</p>
                </div>
              </div>

              <div className="space-y-6">
                <div 
                  className={`flex flex-col items-center justify-center py-10 rounded-[2.5rem] border transition-all duration-300 space-y-4 ${
                    isDragging 
                      ? 'bg-indigo-50/80 border-dashed border-indigo-400 scale-[1.02] shadow-inner' 
                      : 'bg-slate-50/50 border-slate-100'
                  }`}
                >
                  <div className={`p-6 rounded-3xl shadow-lg border border-slate-100/50 transition-all duration-300 ${
                    isDragging ? 'bg-indigo-500 text-white border-indigo-400' : 'bg-white/80 text-indigo-500'
                  }`}>
                    <Upload size={40} className={isDragging ? 'animate-pulse' : 'animate-bounce'} />
                  </div>
                  <div className="text-center max-w-sm space-y-2">
                    <h4 className="text-md font-black text-slate-800 uppercase tracking-tight">
                      {isDragging 
                        ? 'Rilascia il file qui' 
                        : selectedPdfPath 
                          ? 'Documento Selezionato' 
                          : 'Trascina o Seleziona un file'}
                    </h4>
                    <p className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-widest leading-relaxed px-4 break-all">
                      {isDragging 
                        ? 'Rilascia il file PDF o XML per caricarlo.' 
                        : selectedPdfPath 
                          ? selectedPdfPath 
                          : 'Trascina qui il file PDF/XML oppure fai click sotto per cercarlo.'}
                    </p>
                  </div>
                  {!isDragging && (
                    <button
                      onClick={handleSelectPdfFile}
                      disabled={pdfImporting}
                      className="px-6 py-3 bg-white text-slate-700 hover:bg-slate-50 rounded-xl font-black uppercase tracking-widest text-[0.65rem] border border-slate-200 transition-all shadow-sm disabled:opacity-50"
                    >
                      Sfoglia file...
                    </button>
                  )}
                </div>

                {selectedPdfPath && (
                  <div className="bg-slate-50/80 rounded-[2.5rem] p-6 border border-slate-100 space-y-6 animate-premium-in">
                    {/* Anteprima dei dati */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-200/60 pb-3">
                        <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                          <Eye size={14} className="text-indigo-600 animate-pulse" /> Anteprima Articoli PDF Rilevati
                        </span>
                        {loadingPdfPreview ? (
                          <span className="text-[0.65rem] font-bold text-slate-400 animate-pulse">Analisi del file in corso...</span>
                        ) : pdfPreviewItems.length > 0 ? (
                          <span className="text-[0.65rem] font-black text-indigo-600 uppercase tracking-widest bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100 flex items-center gap-1 shadow-sm">
                            <CheckCircle2 size={10} /> Articoli Estratti
                          </span>
                        ) : null}
                      </div>

                      {loadingPdfPreview ? (
                        <div className="flex flex-col items-center justify-center py-8 space-y-3 bg-white/40 backdrop-blur-sm border border-slate-100 rounded-2xl">
                          <Loader2 size={24} className="animate-spin text-indigo-600" />
                          <span className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest">Estrazione testi e tabelle...</span>
                        </div>
                      ) : pdfPreviewItems.length > 0 ? (
                        <div className="overflow-x-auto rounded-3xl border border-slate-200/50 bg-white/95 shadow-md p-2">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="bg-slate-100/50 border-b border-slate-200/50">
                                <th className="py-3 px-4 text-[0.65rem] font-black text-slate-400 uppercase tracking-wider w-1/3">Articolo Estratto ({isXmlFile ? 'XML' : 'PDF'})</th>
                                <th className="py-3 px-4 text-[0.65rem] font-black text-slate-400 uppercase tracking-wider text-center w-1/4">Azione</th>
                                <th className="py-3 px-4 text-[0.65rem] font-black text-slate-400 uppercase tracking-wider w-5/12">Associazione Catalogo</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {pdfMappings.map((m) => {
                                const isSearching = rowSearchResults[m.id] && rowSearchResults[m.id].length > 0;
                                return (
                                  <tr 
                                    key={m.id} 
                                    className={`hover:bg-slate-50/30 transition-colors ${isSearching ? 'relative z-[30]' : 'relative z-0'}`}
                                  >
                                  {/* Articolo PDF */}
                                  <td className="py-4 px-4 space-y-1">
                                    <div className="text-xs font-black text-slate-800 leading-tight">
                                      {m.pdfItem.description}
                                    </div>
                                    <div className="flex gap-2 text-[0.65rem] font-bold text-slate-400">
                                      <span>UM: {m.pdfItem.unit || 'pz'}</span>
                                      <span>•</span>
                                      <span className="text-indigo-600">Prezzo {isXmlFile ? 'XML' : 'PDF'}: € {m.pdfItem.unit_price.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                    </div>
                                  </td>

                                  {/* Azione Selector */}
                                  <td className="py-4 px-4 text-center">
                                    <div className="flex flex-col sm:flex-row gap-1.5 justify-center items-center">
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateMappingAction(m.id, 'update')}
                                        className={`px-2.5 py-1.5 rounded-xl text-[0.55rem] font-black uppercase tracking-wider transition-all border ${
                                          m.action === 'update'
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500'
                                        }`}
                                      >
                                        Associa
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateMappingAction(m.id, 'create')}
                                        className={`px-2.5 py-1.5 rounded-xl text-[0.55rem] font-black uppercase tracking-wider transition-all border ${
                                          m.action === 'create'
                                            ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-600/20'
                                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500'
                                        }`}
                                      >
                                        Crea
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleUpdateMappingAction(m.id, 'ignore')}
                                        className={`px-2.5 py-1.5 rounded-xl text-[0.55rem] font-black uppercase tracking-wider transition-all border ${
                                          m.action === 'ignore'
                                            ? 'bg-slate-600 border-slate-600 text-white shadow-md shadow-slate-600/20'
                                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-500'
                                        }`}
                                      >
                                        Ignora
                                      </button>
                                    </div>
                                  </td>

                                  {/* Associazione Catalogo */}
                                  <td className="py-4 px-4">
                                    {m.action === 'update' && m.suggestedItem && (
                                      <div className="space-y-2 animate-premium-in">
                                        <div className="space-y-1">
                                          <div className="flex items-center gap-2">
                                            <span className={`px-2 py-0.5 rounded-full text-[0.55rem] font-black border uppercase tracking-wider ${
                                              m.matchScore >= 90
                                                ? 'bg-emerald-50 text-emerald-600 border-emerald-100'
                                                : 'bg-amber-50 text-amber-600 border-amber-100'
                                            }`}>
                                              Match {m.matchScore}%
                                            </span>
                                            <span className="text-[0.65rem] font-mono font-black text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                              {m.suggestedItem.code}
                                            </span>
                                          </div>
                                          <div className="text-[0.7rem] font-semibold text-slate-500 truncate max-w-[220px]" title={m.suggestedItem.description}>
                                            {m.suggestedItem.description}
                                          </div>
                                          <div className="text-[0.65rem] font-black uppercase tracking-wider text-slate-400">
                                            Costo: <span className="line-through text-slate-400">€ {m.suggestedItem.unit_price.toFixed(2)}</span>{' '}
                                            <span className="text-emerald-600">➔ € {m.pdfItem.unit_price.toFixed(2)}</span>
                                          </div>
                                        </div>

                                        {/* Input di ricerca per cambiare associazione */}
                                        <div className="relative">
                                          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-sm focus-within:ring-1 focus-within:ring-indigo-500">
                                            <Search size={12} className="text-slate-400" />
                                            <input
                                              type="text"
                                              value={rowSearchQueries[m.id] || ''}
                                              onChange={(e) => handleSearchAlternativeCatalogItem(m.id, e.target.value)}
                                              placeholder="Cerca altro codice o desc..."
                                              className="w-full bg-transparent text-[0.65rem] font-bold text-slate-700 focus:outline-none placeholder-slate-400"
                                            />
                                            {(rowSearchQueries[m.id] || '') && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setRowSearchQueries(prev => ({ ...prev, [m.id]: '' }))
                                                  setRowSearchResults(prev => ({ ...prev, [m.id]: [] }))
                                                }}
                                                className="text-slate-400 hover:text-slate-600"
                                              >
                                                <X size={12} />
                                              </button>
                                            )}
                                          </div>
                                          {rowSearchResults[m.id] && rowSearchResults[m.id].length > 0 && (
                                            <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                                              {rowSearchResults[m.id].map((res) => (
                                                <button
                                                  key={res.id}
                                                  type="button"
                                                  onClick={() => handleSelectAlternativeItem(m.id, res)}
                                                  className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex flex-col gap-0.5"
                                                >
                                                  <div className="flex justify-between items-center">
                                                    <span className="text-[0.65rem] font-mono font-black text-slate-700 bg-slate-100 px-1 py-0.2 rounded">
                                                      {res.code}
                                                    </span>
                                                    <span className="text-[0.6rem] text-indigo-600 font-bold">
                                                      € {res.unit_price.toFixed(2)}
                                                    </span>
                                                  </div>
                                                  <div className="text-[0.65rem] font-semibold text-slate-500 truncate">
                                                    {res.description}
                                                  </div>
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {m.action === 'update' && !m.suggestedItem && (
                                      <div className="space-y-2 animate-premium-in">
                                        <div className="text-xs font-bold text-rose-500 flex items-center gap-1.5">
                                          <AlertCircle size={14} /> Nessuna corrispondenza automatica.
                                        </div>
                                        <div className="relative">
                                          <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-xl px-2 py-1 shadow-sm focus-within:ring-1 focus-within:ring-indigo-500">
                                            <Search size={12} className="text-slate-400" />
                                            <input
                                              type="text"
                                              value={rowSearchQueries[m.id] || ''}
                                              onChange={(e) => handleSearchAlternativeCatalogItem(m.id, e.target.value)}
                                              placeholder="Cerca nel catalogo per codice o desc..."
                                              className="w-full bg-transparent text-[0.65rem] font-bold text-slate-700 focus:outline-none placeholder-slate-400"
                                            />
                                            {(rowSearchQueries[m.id] || '') && (
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setRowSearchQueries(prev => ({ ...prev, [m.id]: '' }))
                                                  setRowSearchResults(prev => ({ ...prev, [m.id]: [] }))
                                                }}
                                                className="text-slate-400 hover:text-slate-600"
                                              >
                                                <X size={12} />
                                              </button>
                                            )}
                                          </div>
                                          {rowSearchResults[m.id] && rowSearchResults[m.id].length > 0 && (
                                            <div className="absolute z-50 left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                                              {rowSearchResults[m.id].map((res) => (
                                                <button
                                                  key={res.id}
                                                  type="button"
                                                  onClick={() => handleSelectAlternativeItem(m.id, res)}
                                                  className="w-full text-left px-3 py-2 hover:bg-slate-50 transition-colors flex flex-col gap-0.5"
                                                >
                                                  <div className="flex justify-between items-center">
                                                    <span className="text-[0.65rem] font-mono font-black text-slate-700 bg-slate-100 px-1 py-0.2 rounded">
                                                      {res.code}
                                                    </span>
                                                    <span className="text-[0.6rem] text-indigo-600 font-bold">
                                                      € {res.unit_price.toFixed(2)}
                                                    </span>
                                                  </div>
                                                  <div className="text-[0.65rem] font-semibold text-slate-500 truncate">
                                                    {res.description}
                                                  </div>
                                                </button>
                                              ))}
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}

                                    {m.action === 'create' && (
                                      <div className="space-y-1.5 animate-premium-in">
                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 border border-blue-100 rounded-full text-[0.55rem] font-black uppercase tracking-wider">
                                          Nuovo Articolo
                                        </span>
                                        <div className="space-y-1">
                                          <label className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400">Codice Articolo:</label>
                                          <input
                                            type="text"
                                            value={m.customCode}
                                            onChange={(e) => handleCustomCodeChange(m.id, e.target.value)}
                                            placeholder="Inserisci codice..."
                                            className="w-full bg-white border border-slate-200 rounded-xl py-1 px-2.5 text-[0.65rem] font-bold text-slate-700 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                          />
                                        </div>
                                      </div>
                                    )}

                                    {m.action === 'ignore' && (
                                      <div className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest italic">
                                        L'articolo non verrà importato
                                      </div>
                                    )}
                                  </td>
                                </tr>
                              ); })}
                            </tbody>
                          </table>
                        </div>
                      ) : null}
                    </div>

                    <button
                      onClick={handleImportPdf}
                      disabled={pdfImporting || loadingPdfPreview}
                      className="w-full flex items-center justify-center gap-2 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[0.7rem] font-black uppercase tracking-widest transition-all shadow-xl shadow-indigo-600/10 disabled:opacity-50"
                    >
                      {pdfImporting ? (
                        <>
                          <Loader2 size={18} className="animate-spin" /> Elaborazione ed Importazione {isXmlFile ? 'XML' : 'PDF'}...
                        </>
                      ) : (
                        isXmlFile ? 'Avvia Aggiornamento Listino da XML' : 'Avvia Aggiornamento Listino da PDF'
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t border-slate-100 flex items-start gap-3 mt-6">
              <Info size={16} className="text-slate-400 shrink-0 mt-0.5" />
              <span className="text-[0.65rem] font-bold text-slate-400 uppercase tracking-widest leading-normal">
                L'elaborazione PDF estrarrà i dati testuali e le tabelle identificando gli articoli per codice o descrizione, per aggiornare i prezzi esistenti o inserire nuove voci nel catalogo.
              </span>
            </div>
          </div>
        </div>

        {/* STATO CATALOGO */}
        <div className="bg-white/40 backdrop-blur-md border border-white/60 p-10 rounded-[3rem] shadow-xl space-y-6 flex flex-col justify-between">
          <div className="space-y-6">
            <div className="flex items-center gap-4 border-b border-slate-100 pb-6">
              <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                <FileSpreadsheet size={24} />
              </div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">Catalogo Attuale</h3>
                <p className="text-xs font-bold text-slate-400">Riepilogo degli articoli e fornitori importati</p>
              </div>
            </div>

            {loadingSummary ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3">
                <Loader2 size={32} className="animate-spin text-teal-600" />
                <span className="text-[0.65rem] font-black text-slate-400 uppercase tracking-widest">Caricamento riepilogo...</span>
              </div>
            ) : (
              <div className="space-y-6">
                <div className="bg-gradient-to-br from-teal-500 to-emerald-600 text-white rounded-[2rem] p-8 shadow-xl shadow-teal-500/10 space-y-1">
                  <span className="text-[0.65rem] font-black uppercase tracking-widest text-teal-100">Articoli Totali in Database</span>
                  <div className="text-4xl font-black">{summary.total_count.toLocaleString('it-IT')}</div>
                </div>

                <div className="space-y-3">
                  <span className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400 ml-1">Fornitori Rilevati ({summary.suppliers.length})</span>
                  <div className="max-h-60 overflow-y-auto pr-1 space-y-2 no-scrollbar">
                    {summary.suppliers.length === 0 ? (
                      <div className="text-center py-8 text-xs font-bold text-slate-400 uppercase tracking-wider bg-slate-50/50 rounded-2xl border border-slate-100">
                        Nessun articolo importato
                      </div>
                    ) : (
                      summary.suppliers.map((s, idx) => (
                        <div key={idx} className="flex justify-between items-center bg-white/60 p-4 rounded-xl border border-slate-100/50 shadow-sm">
                          <span className="text-xs font-black text-slate-700 uppercase tracking-tight">{s.name}</span>
                          <span className="text-xs font-bold text-slate-400">{s.count} art.</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {summary.total_count > 0 && (
            <button
              onClick={handleClearCatalog}
              disabled={clearing}
              className="w-full flex items-center justify-center gap-2 h-12 bg-red-50 hover:bg-red-100 text-red-500 rounded-2xl text-[0.65rem] font-black uppercase tracking-widest transition-all mt-6"
            >
              {clearing ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />} Svuota Catalogo Listini
            </button>
          )}
      </div>
    </div>
  ) : (
    <div className="bg-white/40 backdrop-blur-md border border-white/60 p-8 rounded-[3rem] shadow-xl space-y-6 animate-premium-in">
      {/* Barra dei filtri */}
      <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="flex-1 w-full relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-hover:text-teal-600 transition-colors" size={18} />
          <input
            type="text"
            placeholder="Cerca per codice o descrizione..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white/50 backdrop-blur-md border border-white/50 rounded-2xl py-3 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:bg-white transition-all w-full shadow-sm"
          />
        </div>
        
        <div className="w-full md:w-72">
          <Select
            searchable={true}
            options={[
              { id: 'all', label: 'TUTTI I FORNITORI' },
              ...summary.suppliers.map(s => {
                const optionValue = s.name === 'Senza Fornitore' ? 'none' : s.name;
                return { id: optionValue, label: `${s.name.toUpperCase()} (${s.count})` };
              })
            ]}
            value={catalogSupplier}
            onChange={(val) => {
              setCatalogSupplier(val);
              setCatalogPage(1);
            }}
            placeholder="Seleziona Fornitore"
            icon={Briefcase}
          />
        </div>
      </div>

      {/* Tabella degli articoli */}
      {loadingCatalog ? (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="animate-spin text-teal-600" size={40} />
          <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-400">Lettura catalogo in corso...</span>
        </div>
      ) : catalogItems.length > 0 ? (
        <div className="space-y-6">
          <div className="overflow-x-auto rounded-[2rem] border border-slate-200/50 bg-white/80 shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/50 border-b border-slate-200/50">
                  <th 
                    onClick={() => handleCatalogSort('code')}
                    className="py-4 px-6 text-[0.65rem] font-black text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-200/30 transition-colors select-none font-sans"
                  >
                    <div className="flex items-center gap-1.5">
                      Codice <CatalogSortIcon field="code" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleCatalogSort('description')}
                    className="py-4 px-6 text-[0.65rem] font-black text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-200/30 transition-colors select-none font-sans"
                  >
                    <div className="flex items-center gap-1.5">
                      Descrizione <CatalogSortIcon field="description" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleCatalogSort('unit')}
                    className="py-4 px-6 text-[0.65rem] font-black text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-200/30 transition-colors select-none text-center font-sans"
                  >
                    <div className="flex items-center justify-center gap-1.5">
                      U.M. <CatalogSortIcon field="unit" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleCatalogSort('unit_price')}
                    className="py-4 px-6 text-[0.65rem] font-black text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-200/30 transition-colors select-none text-right font-sans"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      Prezzo Unit. <CatalogSortIcon field="unit_price" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleCatalogSort('markup')}
                    className="py-4 px-6 text-[0.65rem] font-black text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-200/30 transition-colors select-none text-right font-sans"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      Ricarico <CatalogSortIcon field="markup" />
                    </div>
                  </th>
                  <th 
                    onClick={() => handleCatalogSort('supplier')}
                    className="py-4 px-6 text-[0.65rem] font-black text-slate-500 uppercase tracking-wider cursor-pointer hover:bg-slate-200/30 transition-colors select-none font-sans"
                  >
                    <div className="flex items-center gap-1.5">
                      Fornitore <CatalogSortIcon field="supplier" />
                    </div>
                  </th>
                  <th className="py-4 px-6 text-[0.65rem] font-black text-slate-500 uppercase tracking-wider text-right font-sans">
                    Azioni
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {catalogItems.map((item) => {
                  const isEditing = item.id === editingRowId;
                  return (
                    <tr key={item.id} className={`${isEditing ? 'bg-teal-50/10' : 'hover:bg-slate-50/50'} transition-colors group`}>
                      {isEditing ? (
                        <>
                          <td className="py-2 px-4 text-xs font-bold text-slate-600 font-mono">
                            <input
                              type="text"
                              value={editFormData.code}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, code: e.target.value }))}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all shadow-sm"
                              placeholder="Codice"
                            />
                          </td>
                          <td className="py-2 px-4 text-xs font-black text-slate-800">
                            <input
                              type="text"
                              value={editFormData.description}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, description: e.target.value }))}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all shadow-sm"
                              placeholder="Descrizione"
                              required
                            />
                          </td>
                          <td className="py-2 px-4 text-xs font-bold text-slate-500 text-center">
                            <input
                              type="text"
                              value={editFormData.unit}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, unit: e.target.value }))}
                              className="w-16 bg-white border border-slate-200 rounded-xl px-2 py-2 text-xs font-bold text-slate-700 text-center focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all shadow-sm"
                              placeholder="U.M."
                            />
                          </td>
                          <td className="py-2 px-4 text-xs font-black text-slate-800 text-right">
                            <div className="relative inline-block w-28">
                              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">€</span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                value={editFormData.unit_price}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, unit_price: e.target.value }))}
                                className="w-full bg-white border border-slate-200 rounded-xl pl-7 pr-3 py-2 text-xs font-bold text-slate-700 text-right focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all shadow-sm font-mono"
                              />
                            </div>
                          </td>
                          <td className="py-2 px-4 text-xs font-black text-emerald-600 text-right">
                            <div className="relative inline-block w-20">
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={editFormData.markup}
                                onClick={(e) => e.target.select()}
                                onFocus={(e) => e.target.select()}
                                onChange={(e) => setEditFormData(prev => ({ ...prev, markup: e.target.value }))}
                                className="w-full bg-white border border-slate-200 rounded-xl pr-6 pl-2 py-2 text-xs font-bold text-slate-700 text-right focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all shadow-sm font-mono"
                              />
                              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold">%</span>
                            </div>
                          </td>
                          <td className="py-2 px-4 text-xs font-bold text-slate-500">
                            <input
                              type="text"
                              value={editFormData.supplier}
                              onChange={(e) => setEditFormData(prev => ({ ...prev, supplier: e.target.value }))}
                              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-600/20 focus:border-teal-600 transition-all shadow-sm"
                              placeholder="Fornitore"
                            />
                          </td>
                          <td className="py-2 px-4 text-xs font-bold text-slate-500 text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                onClick={() => handleStartSaveRow(editFormData)}
                                className="p-2 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-xl transition-all shadow-sm"
                                title="Salva"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={handleCancelEditRow}
                                className="p-2 bg-rose-50 text-rose-500 hover:bg-rose-100 rounded-xl transition-all shadow-sm"
                                title="Annulla"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </td>
                        </>
                      ) : (
                        <>
                          <td className="py-4 px-6 text-xs font-bold text-slate-600 font-mono break-all max-w-[150px]">
                            {item.code || <span className="text-slate-300 italic font-sans">N/D</span>}
                          </td>
                          <td className="py-4 px-6 text-xs font-black text-slate-800 max-w-[300px] truncate" title={item.description}>
                            {item.description}
                          </td>
                          <td className="py-4 px-6 text-xs font-bold text-slate-500 text-center">
                            {item.unit || <span className="text-slate-300 italic">pz</span>}
                          </td>
                          <td className="py-4 px-6 text-xs font-black text-slate-800 text-right">
                            € {item.unit_price !== null && item.unit_price !== undefined
                              ? item.unit_price.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                              : '0,00'}
                          </td>
                          <td className="py-4 px-6 text-xs font-black text-emerald-600 text-right font-mono">
                            {item.markup !== null && item.markup !== undefined
                              ? `${Math.round(item.markup * 100)}%`
                              : '0%'}
                          </td>
                          <td className="py-4 px-6 text-xs font-bold text-slate-500 uppercase tracking-tight max-w-[150px] truncate" title={item.supplier}>
                            {item.supplier || <span className="text-slate-300 italic">N/D</span>}
                          </td>
                          <td className="py-4 px-6 text-xs font-bold text-slate-500 text-right">
                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => handleStartEditRow(item)}
                                className="p-1.5 text-slate-400 hover:text-teal-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Modifica"
                              >
                                <Edit3 size={16} />
                              </button>
                              <button
                                onClick={() => handleStartDeleteRow(item.id)}
                                className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-slate-100 rounded-lg transition-colors"
                                title="Elimina"
                              >
                                <Trash2 size={16} />
                              </button>
                            </div>
                          </td>
                        </>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
            <div className="flex items-center gap-3">
              <span className="text-[0.65rem] font-black uppercase tracking-widest text-slate-400">Righe per pagina:</span>
              <select
                value={catalogLimit}
                onChange={(e) => {
                  setCatalogLimit(Number(e.target.value));
                  setCatalogPage(1);
                }}
                className="bg-white border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-bold text-slate-600 focus:outline-none shadow-sm cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span className="text-[0.65rem] font-bold text-slate-400">
                Mostrati {Math.min(totalCatalogCount, (catalogPage - 1) * catalogLimit + 1)}-{Math.min(totalCatalogCount, catalogPage * catalogLimit)} di {totalCatalogCount}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCatalogPage(p => Math.max(1, p - 1))}
                disabled={catalogPage === 1}
                className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="text-xs font-black text-slate-700 px-3 uppercase tracking-wider">
                Pagina {catalogPage} di {Math.ceil(totalCatalogCount / catalogLimit) || 1}
              </span>
              <button
                onClick={() => setCatalogPage(p => Math.min(Math.ceil(totalCatalogCount / catalogLimit), p + 1))}
                disabled={catalogPage >= Math.ceil(totalCatalogCount / catalogLimit)}
                className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-500 hover:text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200 text-center">
          <div className="p-6 bg-slate-100 rounded-3xl text-slate-300 mb-4">
            <FileSpreadsheet size={48} />
          </div>
          <h4 className="text-md font-black text-slate-700 uppercase tracking-tight">Nessun articolo trovato</h4>
          <p className="text-sm font-bold text-slate-400 max-w-sm mt-1">
            {catalogSearch || catalogSupplier !== 'all' 
              ? 'Prova a modificare i tuoi filtri o la query di ricerca.' 
              : 'Importa il tuo primo listino nella scheda "Importazione" per iniziare.'}
          </p>
        </div>
      )}
    </div>
  )}

  <ConfirmModal
    isOpen={isConfirmOpen}
    onClose={() => setIsConfirmOpen(false)}
    onConfirm={executeClearCatalog}
    title="Svuota Catalogo Listini"
    message="Sei sicuro di voler svuotare completamente il catalogo dei listini? Questa azione è irreversibile e cancellerà tutti gli articoli caricati."
    confirmText="Sì, svuota"
    cancelText="Annulla"
    type="danger"
  />

  <ConfirmModal
    isOpen={isImportConfirmOpen}
    onClose={() => setIsImportConfirmOpen(false)}
    onConfirm={executeImportPdf}
    title={isXmlFile ? "Conferma Aggiornamento Listino da XML" : "Conferma Aggiornamento Listino da PDF"}
    message={isXmlFile ? "Confermi l'importazione delle associazioni e la creazione dei nuovi articoli estratti dal file XML della fattura?" : "Confermi l'importazione delle associazioni e la creazione dei nuovi articoli estratti dal file PDF?"}
    confirmText="Sì, procedi"
    cancelText="Annulla"
    type="warning"
  />

  <ConfirmModal
    isOpen={isRowSaveConfirmOpen}
    onClose={() => {
      setIsRowSaveConfirmOpen(false)
      setRowToSave(null)
    }}
    onConfirm={executeSaveRow}
    title="Salva Modifica Articolo"
    message="Confermi la modifica di questo articolo? Le modifiche verranno salvate nel catalogo."
    confirmText="Sì, salva"
    cancelText="Annulla"
    type="warning"
  />

  <ConfirmModal
    isOpen={isRowDeleteConfirmOpen}
    onClose={() => {
      setIsRowDeleteConfirmOpen(false)
      setRowToDeleteId(null)
    }}
    onConfirm={executeDeleteRow}
    title="Elimina Articolo"
    message="Sei sicuro di voler eliminare questo articolo dal catalogo? Questa azione è irreversibile."
    confirmText="Sì, elimina"
    cancelText="Annulla"
    type="danger"
  />
</div>
)
}

export default ImportListiniSettings
