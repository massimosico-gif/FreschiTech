import React, { useState, useEffect, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { 
  Briefcase, 
  Save, 
  MessageSquare,
  AlertCircle,
  Activity,
  Euro,
  MapPin,
  Loader2
} from 'lucide-react'
import DrawerShell from './ui/DrawerShell'
import ClientSelector from './ui/ClientSelector'
import DatePicker from './ui/DatePicker'
import Select from './ui/Select'
import EditClientDrawer from './EditClientDrawer'
import { useToast } from '@tecno/ui/feedback'

const EditJobDrawer = ({ isOpen, onClose, job, onSave }) => {
  const toast = useToast()
  const [errors, setErrors] = useState({})
  const [initialData, setInitialData] = useState(null)
  const [clients, setClients] = useState([])
  
  const autocompleteTimeoutRef = useRef(null)
  const [suggestions, setSuggestions] = useState([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false)

  const fetchSuggestions = async (query) => {
    if (!query || query.trim().length < 3) {
      setSuggestions([])
      return
    }
    setIsLoadingSuggestions(true)
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&countrycodes=it&email=freschitechsrl@pec.it`
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      })
      if (res.ok) {
        const data = await res.json()
        const formatted = data.map(item => ({
          display_name: item.display_name,
          lat: item.lat,
          lon: item.lon
        }))
        setSuggestions(formatted)
      }
    } catch (e) {
      console.error('Error fetching suggestions:', e)
    } finally {
      setIsLoadingSuggestions(false)
    }
  }

  const handleAddressChange = (e) => {
    const val = e.target.value
    setFormData(prev => ({ ...prev, address: val }))
    setShowSuggestions(true)

    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current)
    }

    autocompleteTimeoutRef.current = setTimeout(() => {
      fetchSuggestions(val)
    }, 450)
  }

  const selectSuggestion = (suggestion) => {
    setFormData(prev => ({
      ...prev,
      address: suggestion.display_name
    }))
    setSuggestions([])
    setShowSuggestions(false)
  }

  useEffect(() => {
    return () => {
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current)
      }
    }
  }, [])

  const [formData, setFormData] = useState({
    client_id: '',
    name: '',
    description: '',
    status: 'active',
    start_date: new Date().toISOString().split('T')[0],
    end_date: '',
    budget: 0,
    distance: 0,
    km_cost: 0.50,
    address: ''
  })

  const statusOptions = [
    { id: 'active', label: 'Attiva / In corso', color: 'bg-green-500' },
    { id: 'completed', label: 'Completata', color: 'bg-slate-400' },
    { id: 'on_hold', label: 'Sospesa', color: 'bg-amber-500' }
  ]

  const [isAddClientOpen, setIsAddClientOpen] = useState(false)
  const [pendingClientName, setPendingClientName] = useState('')

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
        setFormData(prev => ({ ...prev, client_id: newClient.id.toString() }))
        setErrors(prev => ({ ...prev, client_id: '' }))
      }
      setIsAddClientOpen(false)
    } catch (err) {
      console.error("Errore salvataggio cliente:", err)
      toast.error("Impossibile salvare il cliente: " + err)
    }
  }

  useEffect(() => {
    if (isOpen) {
      invoke('get_clients')
        .then(setClients)
        .catch(err => console.error("Errore caricamento clienti:", err))
    }
  }, [isOpen])

  const validateField = (name, value) => {
    let error = ''
    if (name === 'name' && !value) {
      error = 'Il nome della commessa è obbligatorio'
    } else if (name === 'client_id' && !value) {
      error = 'Devi selezionare un cliente'
    }
    setErrors(prev => ({ ...prev, [name]: error }))
    return !error
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    validateField(name, value)
  }

  const handleClientChange = (clientId) => {
    const selectedClient = clients.find(c => c.id.toString() === clientId)
    const clientAddr = selectedClient 
      ? `${selectedClient.street || ''}, ${selectedClient.city || ''} ${selectedClient.province ? `(${selectedClient.province})` : ''}`.trim().replace(/^,\s*/, '').replace(/,\s*$/, '')
      : ''
    const clientDistance = selectedClient ? selectedClient.distance : 0
    setFormData(prev => ({ 
      ...prev, 
      client_id: clientId,
      address: prev.address ? prev.address : clientAddr,
      distance: clientDistance || 0
    }))
    validateField('client_id', clientId)
  }

  const handleStatusChange = (status) => {
    setFormData(prev => ({ ...prev, status: status }))
  }

  const handleDateChange = (date) => {
    setFormData(prev => ({ ...prev, start_date: date }))
  }

  const handleSaveInternal = () => {
    const isNameValid = validateField('name', formData.name)
    const isClientValid = validateField('client_id', formData.client_id)
    
    if (!isNameValid || !isClientValid) {
      toast.error("Controlla i dati inseriti prima di salvare.")
      return
    }
    
    const dataToSave = {
      ...formData,
      client_id: parseInt(formData.client_id),
      budget: parseFloat(formData.budget) || 0,
      distance: parseInt(formData.distance) || 0,
      km_cost: parseFloat(formData.km_cost) || 0.50
    }
    
    onSave(dataToSave)
  }

  const isDirty = initialData && JSON.stringify(formData) !== JSON.stringify(initialData)
  const isNameMissing = !formData.name || !formData.name.trim()
  const isClientMissing = !formData.client_id
  const isNotDirtyEdit = job && !isDirty
  const isSaveDisabled = isNameMissing || isClientMissing || isNotDirtyEdit

  useEffect(() => {
    if (isOpen) {
      setErrors({})
      if (job) {
        const data = {
          id: job.id,
          client_id: job.client_id.toString(),
          name: job.name || '',
          description: job.description || '',
          status: job.status || 'active',
          start_date: job.start_date || '',
          end_date: job.end_date || '',
          budget: job.budget || 0,
          distance: job.distance || 0,
          km_cost: job.km_cost !== undefined && job.km_cost !== null ? job.km_cost : 0.50,
          address: job.address || ''
        }
        setFormData(data)
        setInitialData(data)
      } else {
        const newData = {
          client_id: '',
          name: '',
          description: '',
          status: 'active',
          start_date: new Date().toISOString().split('T')[0],
          end_date: '',
          budget: 0,
          distance: 0,
          km_cost: 0.50,
          address: ''
        }
        setFormData(newData)
        setInitialData(newData)
      }
    }
  }, [isOpen, job])

  return (
    <>
      <DrawerShell
        isOpen={isOpen}
        onClose={onClose}
        title={job ? 'Modifica Commessa' : 'Nuova Commessa'}
        subtitle={formData.name || 'Dettagli Cantiere'}
        icon={<Briefcase size={24} />}
        footer={
          <>
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest hover:bg-slate-200 transition-all flex items-center justify-center gap-2"
            >
              Annulla
            </button>
            <button 
              type="button" 
              onClick={handleSaveInternal} 
              disabled={isSaveDisabled}
              className={`flex-1 py-4 rounded-2xl text-[0.7rem] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-xl ${
                !isSaveDisabled
                ? 'bg-accent text-white hover:bg-accent/90 shadow-accent/20' 
                : 'bg-slate-100 text-slate-300 cursor-not-allowed shadow-none'
              }`}
            >
              <Save size={18} /> Salva Commessa
            </button>
          </>
        }
      >
        <div className="space-y-10">
          {/* SEZIONE 1: CLIENTE E TITOLO */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-accent rounded-full"></div>
              <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-800">Informazioni Principali</span>
            </div>
            
            <div className="space-y-2">
              <label className="text-[0.75rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Cliente *</label>
              <ClientSelector 
                clients={clients} 
                value={formData.client_id} 
                onChange={handleClientChange} 
                error={errors.client_id}
                onAddNew={handleAddNewClientClick}
              />
              {errors.client_id && <p className="text-[0.72rem] font-bold text-rose-500 ml-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.client_id}</p>}
            </div>
  
            <div className="space-y-2">
              <label className="text-[0.75rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Nome Commessa / Cantiere *</label>
              <div className="relative">
                 <Briefcase className={`absolute left-5 top-1/2 -translate-y-1/2 transition-colors ${errors.name ? 'text-rose-500' : 'text-slate-400'}`} size={18} />
                 <input 
                  name="name" 
                  value={formData.name} 
                  onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} 
                  className={`w-full bg-white/50 border rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 transition-all shadow-sm ${errors.name ? 'border-rose-300 focus:ring-rose-100' : 'border-white/50 focus:ring-accent/20 focus:bg-white'}`}
                  placeholder="Es: Installazione Robot Mungitura Stalla Rossi" 
                />
              </div>
              {errors.name && <p className="text-[0.72rem] font-bold text-rose-500 ml-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.name}</p>}
            </div>

            <div className="space-y-2 relative">
              <label className="text-[0.75rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Indirizzo Commessa / Cantiere</label>
              <div className="relative">
                 <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input 
                  name="address" 
                  value={formData.address || ''} 
                  onChange={handleAddressChange} 
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  onFocus={() => { if (formData.address && formData.address.length >= 3) setShowSuggestions(true) }}
                  className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-12 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm"
                  placeholder="Es: Via Udine 12, Pagnacco" 
                  autoComplete="off"
                />
                {isLoadingSuggestions && (
                  <Loader2 size={16} className="animate-spin text-slate-400 absolute right-4 top-1/2 -translate-y-1/2" />
                )}
              </div>
              
              {showSuggestions && suggestions.length > 0 && (
                <ul className="absolute z-50 left-0 right-0 top-full mt-1 bg-white/95 backdrop-blur-md border border-slate-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto overflow-x-hidden divide-y divide-slate-100">
                  {suggestions.map((item, idx) => (
                    <li 
                      key={idx} 
                      onClick={() => selectSuggestion(item)}
                      className="px-5 py-3 hover:bg-accent/10 cursor-pointer text-xs font-bold text-slate-700 transition-colors flex items-start gap-2.5"
                    >
                      <MapPin size={14} className="text-accent mt-0.5 shrink-0" />
                      <span>{item.display_name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-[0.75rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Distanza Sede / Cantiere (km)</label>
              <div className="relative">
                 <MapPin className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input 
                  type="number"
                  name="distance" 
                  value={formData.distance} 
                  onChange={handleChange} 
                  onFocus={(e) => setTimeout(() => e.target.select(), 0)} 
                  className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm"
                  placeholder="Es: 45" 
                />
              </div>
            </div>
          </section>
  
          {/* SEZIONE 2: DATE E STATUS */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-sky-400 rounded-full"></div>
              <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-800">Pianificazione</span>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[0.75rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Data Inizio</label>
                <DatePicker 
                  value={formData.start_date} 
                  onChange={handleDateChange} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[0.75rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Stato</label>
                <Select 
                  options={statusOptions}
                  value={formData.status}
                  onChange={handleStatusChange}
                  placeholder="Seleziona stato..."
                  icon={Activity}
                />
              </div>
            </div>
          </section>
  
          {/* SEZIONE 3: NOTE */}
          <section className="space-y-6">
            <div className="flex items-center gap-3">
              <div className="w-1.5 h-6 bg-slate-400 rounded-full"></div>
              <span className="text-[0.7rem] font-black uppercase tracking-widest text-slate-800">Note</span>
            </div>
            
            <div className="space-y-2">
              <label className="text-[0.75rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Note Libere</label>
              <div className="relative">
                <MessageSquare className="absolute left-5 top-5 text-slate-400" size={18} />
                <textarea 
                  name="description"
                  value={formData.description}
                  onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)}
                  className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm min-h-[120px] resize-none"
                  placeholder="Inserisci qui eventuali note o dettagli sulla commessa..."
                />
              </div>
            </div>
          </section>
        </div>
      </DrawerShell>
      <EditClientDrawer 
        isOpen={isAddClientOpen}
        onClose={() => setIsAddClientOpen(false)}
        client={pendingClientName ? { name: pendingClientName } : null}
        onSave={handleSaveNewClient}
      />
    </>
  )
}

export default EditJobDrawer
