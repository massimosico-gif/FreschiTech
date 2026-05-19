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
  Globe,
  WifiOff,
  Loader2,
  Navigation
} from 'lucide-react'
import DrawerShell from './ui/DrawerShell'
import ClientSelector from './ui/ClientSelector'
import DatePicker from './ui/DatePicker'
import Select from './ui/Select'
import EditClientDrawer from './EditClientDrawer'

const EditJobDrawer = ({ isOpen, onClose, job, onSave }) => {
  const [errors, setErrors] = useState({})
  const [initialData, setInitialData] = useState(null)
  const [clients, setClients] = useState([])
  
  const [connectionStatus, setConnectionStatus] = useState('checking') // 'checking', 'online', 'offline'
  const [isDistanceLoading, setIsDistanceLoading] = useState(false)
  const [distanceError, setDistanceError] = useState('')
  const [lastCalculatedAddress, setLastCalculatedAddress] = useState('')

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
    handleCalculateDistance(suggestion.display_name)
  }

  useEffect(() => {
    return () => {
      if (autocompleteTimeoutRef.current) {
        clearTimeout(autocompleteTimeoutRef.current)
      }
    }
  }, [])

  const checkInternet = async () => {
    try {
      if (!navigator.onLine) return false
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 4000)
      
      const response = await fetch('https://router.project-osrm.org/', {
        method: 'HEAD',
        mode: 'no-cors',
        signal: controller.signal
      })
      clearTimeout(timeoutId)
      return true
    } catch (e) {
      return false
    }
  }

  const verifyConnection = async () => {
    setConnectionStatus('checking')
    const online = await checkInternet()
    setConnectionStatus(online ? 'online' : 'offline')
  }

  useEffect(() => {
    if (isOpen) {
      verifyConnection()
      setDistanceError('')
    }
  }, [isOpen])

  const geocodeAddress = async (address) => {
    try {
      const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1&email=freschitechsrl@pec.it`
      const res = await fetch(url, {
        headers: {
          'Accept': 'application/json'
        }
      })
      if (!res.ok) return null
      const data = await res.json()
      if (data && data.length > 0) {
        return {
          lat: parseFloat(data[0].lat),
          lon: parseFloat(data[0].lon)
        }
      }
      return null
    } catch (e) {
      console.error('Geocoding error for address:', address, e)
      return null
    }
  }

  const getOSRMDistance = async (start, end) => {
    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${start.lon},${start.lat};${end.lon},${end.lat}?overview=false`
      const res = await fetch(url)
      if (!res.ok) return null
      const data = await res.json()
      if (data && data.code === 'Ok' && data.routes && data.routes.length > 0) {
        return data.routes[0].distance // meters
      }
      return null
    } catch (e) {
      console.error('OSRM routing error:', e)
      return null
    }
  }

  const handleCalculateDistance = async (customAddress) => {
    const jobAddress = (typeof customAddress === 'string' ? customAddress : formData.address || '').trim()
    if (!jobAddress) {
      setDistanceError("Inserisci prima l'indirizzo della commessa per calcolare la distanza.")
      return
    }

    setDistanceError('')
    setIsDistanceLoading(true)

    try {
      const globalSettings = await invoke('get_global_settings')
      const companyAddress = (globalSettings?.company_address || 'SALITA PERTOLDI 1/1 - 33010 - PAGNACCO (UD)').trim()

      const companyCoords = await geocodeAddress(companyAddress)
      if (!companyCoords) {
        throw new Error("Impossibile geocodificare l'indirizzo dell'azienda.")
      }

      const clientCoords = await geocodeAddress(jobAddress)
      if (!clientCoords) {
        throw new Error("Impossibile geocodificare l'indirizzo del cantiere.")
      }

      const distanceMeters = await getOSRMDistance(companyCoords, clientCoords)
      if (distanceMeters === null) {
        throw new Error("Impossibile calcolare il tragitto stradale.")
      }

      const distanceKm = Math.round((distanceMeters / 1000) * 2)

      setFormData(prev => ({
        ...prev,
        distance: distanceKm,
        address: prev.address === jobAddress ? prev.address : jobAddress
      }))
      setLastCalculatedAddress(jobAddress)

    } catch (err) {
      console.error(err)
      setDistanceError(err.message || 'Errore nel calcolo della distanza.')
    } finally {
      setIsDistanceLoading(false)
    }
  }

  const getConnectionTitle = () => {
    if (connectionStatus === 'checking') return 'Verifica della connessione in corso...'
    if (connectionStatus === 'online') return 'Connesso a Internet. Pronto per il calcolo automatico.'
    return 'Nessuna connessione a internet rilevata o server OSRM non raggiungibile.'
  }

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
      alert("Impossibile salvare il cliente: " + err)
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
    setFormData(prev => ({ 
      ...prev, 
      client_id: clientId,
      address: prev.address ? prev.address : clientAddr
    }))
    validateField('client_id', clientId)
    if (clientAddr) {
      handleCalculateDistance(clientAddr)
    }
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
      alert("Controlla i dati inseriti prima di salvare.")
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
  const needsCalculation = formData.address && formData.address.trim().toLowerCase() !== lastCalculatedAddress.trim().toLowerCase()

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
        setLastCalculatedAddress(job.address || '')
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
        setLastCalculatedAddress('')
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
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Cliente *</label>
              <ClientSelector 
                clients={clients} 
                value={formData.client_id} 
                onChange={handleClientChange} 
                error={errors.client_id}
                onAddNew={handleAddNewClientClick}
              />
              {errors.client_id && <p className="text-[0.6rem] font-bold text-rose-500 ml-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.client_id}</p>}
            </div>
  
            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Nome Commessa / Cantiere *</label>
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
              {errors.name && <p className="text-[0.6rem] font-bold text-rose-500 ml-1 flex items-center gap-1"><AlertCircle size={10} /> {errors.name}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Preventivo Accettato (€)</label>
              <div className="relative">
                 <Euro className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                 <input 
                  type="number"
                  name="budget" 
                  value={formData.budget} 
                  onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} 
                  className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm"
                  placeholder="Es: 15000" 
                />
              </div>
            </div>

            <div className="space-y-2 relative">
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Indirizzo Commessa / Cantiere</label>
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1 flex items-center justify-between">
                  <span>Distanza Sede / Cantiere (km)</span>
                  <div className="flex items-center gap-1.5" title={getConnectionTitle()}>
                    {connectionStatus === 'checking' && (
                      <span className="flex items-center gap-1 text-[0.6rem] font-bold text-slate-400">
                        <Loader2 size={10} className="animate-spin text-slate-400" />
                        Verifica...
                      </span>
                    )}
                    {connectionStatus === 'online' && (
                      <span className="flex items-center gap-1 text-[0.6rem] font-bold text-emerald-500">
                        <Globe size={10} className="animate-pulse" />
                        Online
                      </span>
                    )}
                    {connectionStatus === 'offline' && (
                      <button 
                        type="button" 
                        onClick={verifyConnection}
                        className="flex items-center gap-1 text-[0.6rem] font-bold text-rose-500 hover:underline"
                      >
                        <WifiOff size={10} />
                        Offline (Riprova)
                      </button>
                    )}
                  </div>
                </label>
                <div className="relative flex items-center">
                   <MapPin className="absolute left-5 text-slate-400" size={18} />
                   <input 
                    type="number"
                    name="distance" 
                    value={formData.distance} 
                    onChange={handleChange} 
                    onFocus={(e) => setTimeout(() => e.target.select(), 0)} 
                    className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-28 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm"
                    placeholder="Es: 45" 
                  />
                  <button
                    type="button"
                    onClick={handleCalculateDistance}
                    disabled={isDistanceLoading || !formData.address || connectionStatus !== 'online'}
                    className={`absolute right-2 px-4 py-2 rounded-xl text-[0.65rem] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                      isDistanceLoading
                      ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                      : !formData.address || connectionStatus !== 'online'
                      ? 'bg-slate-100 text-slate-300 cursor-not-allowed'
                      : needsCalculation
                      ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-md animate-pulse active:scale-95'
                      : 'bg-accent/10 hover:bg-accent/20 text-accent active:scale-95'
                    }`}
                  >
                    {isDistanceLoading ? (
                      <>
                        <Loader2 size={12} className="animate-spin text-accent" />
                        Calcolo...
                      </>
                    ) : (
                      <>
                        <Navigation size={12} />
                        Calcola
                      </>
                    )}
                  </button>
                </div>
                {distanceError && (
                  <p className="text-[0.6rem] font-bold text-rose-500 ml-1 flex items-center gap-1">
                    <AlertCircle size={10} /> {distanceError}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Costo al Km (€/km)</label>
                <div className="relative">
                   <Euro className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                   <input 
                    type="number"
                    step="0.01"
                    name="km_cost" 
                    value={formData.km_cost} 
                    onChange={handleChange} onFocus={(e) => setTimeout(() => e.target.select(), 0)} 
                    className="w-full bg-white/50 border border-white/50 rounded-2xl py-4 pl-12 pr-6 text-sm font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-accent/20 focus:bg-white transition-all shadow-sm"
                    placeholder="Es: 0.50" 
                  />
                </div>
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
                <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Data Inizio</label>
                <DatePicker 
                  value={formData.start_date} 
                  onChange={handleDateChange} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Stato</label>
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
              <label className="text-[0.65rem] font-black uppercase tracking-[0.1em] text-slate-400 ml-1">Note Libere</label>
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
