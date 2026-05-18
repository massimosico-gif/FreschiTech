import React, { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { AnimatePresence, motion } from 'framer-motion'
import { 
  AlertCircle,
  BarChart3,
  Package,
  HardHat,
  Receipt,
  Target,
  Briefcase
} from 'lucide-react'

// UI Components
import ConfirmModal from './ui/ConfirmModal'

// Project Sub-components
import ProjectHeader from './project/ProjectHeader'
import DashboardTab from './project/DashboardTab'
import CostCentersTab from './project/CostCentersTab'
import MaterialsTab from './project/MaterialsTab'
import LaborTab from './project/LaborTab'
import ExpensesTab from './project/ExpensesTab'

// Drawers
import EditCostCenterDrawer from './EditCostCenterDrawer'
import EditMaterialDrawer from './EditMaterialDrawer'
import EditLaborDrawer from './EditLaborDrawer'
import EditExpenseDrawer from './EditExpenseDrawer'

const ProjectDetails = ({ projectId, onBack }) => {
  const [project, setProject] = useState(null)
  const [client, setClient] = useState(null)
  const [costCenters, setCostCenters] = useState([])
  const [materials, setMaterials] = useState([])
  const [labor, setLabor] = useState([])
  const [expenses, setExpenses] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('dashboard')
  const [errorInfo, setErrorInfo] = useState(null)
  
  // Modals/Drawers States
  const [isCCDrawerOpen, setIsCCDrawerOpen] = useState(false)
  const [selectedCC, setSelectedCC] = useState(null)
  const [isMatDrawerOpen, setIsMatDrawerOpen] = useState(false)
  const [selectedMat, setSelectedMat] = useState(null)
  const [isLaborDrawerOpen, setIsLaborDrawerOpen] = useState(false)
  const [selectedLabor, setSelectedLabor] = useState(null)
  const [isExpenseDrawerOpen, setIsExpenseDrawerOpen] = useState(false)
  const [selectedExpense, setSelectedExpense] = useState(null)
  
  const [confirmConfig, setConfirmConfig] = useState({ isOpen: false, onConfirm: () => {}, title: '', message: '' })

  const fetchData = async () => {
    setLoading(true)
    setErrorInfo(null)
    try {
      const [projects, clients, centers, mats, hours, others] = await Promise.all([
        invoke('get_projects'),
        invoke('get_clients'),
        invoke('get_cost_centers', { projectId: Number(projectId) }),
        invoke('get_materials', { projectId: Number(projectId) }),
        invoke('get_labor', { projectId: Number(projectId) }),
        invoke('get_expenses', { projectId: Number(projectId) })
      ])
      
      const p = projects.find(item => Number(item.id) === Number(projectId))
      if (p) {
        setProject(p)
        const c = clients.find(item => item.id === p.client_id)
        if (c) setClient(c)
        setCostCenters(centers)
        setMaterials(mats)
        setLabor(hours)
        setExpenses(others)
      } else {
        setErrorInfo(`Progetto ID ${projectId} non trovato`)
      }
    } catch (err) {
      console.error("Errore caricamento:", err)
      setErrorInfo(`Errore: ${err}`)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [projectId])

  const handleSaveCC = async (ccData) => {
    try {
      await invoke('save_cost_center', { cc: ccData })
      setIsCCDrawerOpen(false)
      fetchData()
    } catch (err) { alert(err) }
  }

  const handleSaveMat = async (matData) => {
    try {
      await invoke('save_material', { mat: matData })
      setIsMatDrawerOpen(false)
      fetchData()
    } catch (err) { alert(err) }
  }

  const handleSaveLabor = async (laborData) => {
    try {
      if (Array.isArray(laborData)) {
        await Promise.all(laborData.map(l => invoke('save_labor', { labor: l })))
      } else {
        await invoke('save_labor', { labor: laborData })
      }
      setIsLaborDrawerOpen(false)
      fetchData()
    } catch (err) { alert(err) }
  }

  const handleSaveExpense = async (expenseData) => {
    try {
      await invoke('save_expense', { expense: expenseData })
      setIsExpenseDrawerOpen(false)
      fetchData()
    } catch (err) { alert(err) }
  }

  if (loading) return <div className="p-20 text-center font-black uppercase tracking-widest text-slate-400">Caricamento...</div>

  if (!project) return (
    <div className="p-20 text-center">
      <AlertCircle size={48} className="mx-auto text-rose-500 mb-4" />
      <h2 className="text-xl font-black text-slate-800">Commessa non trovata</h2>
      <button onClick={onBack} className="mt-6 text-accent font-black uppercase tracking-widest text-xs">Torna indietro</button>
    </div>
  )

  const matTotalCost = materials.reduce((acc, m) => acc + (m.quantity * m.unit_price), 0)
  const matTotalSale = materials.reduce((acc, m) => acc + (m.quantity * m.unit_price * (1 + m.markup)), 0)
  const ccTotalCost = costCenters.reduce((acc, cc) => acc + cc.base_cost + cc.shipping + cc.install_fee, 0)
  const ccTotalSale = costCenters.reduce((acc, cc) => acc + (cc.base_cost * (1 + cc.markup)) + cc.shipping + cc.install_fee, 0)
  const laborTotalCost = labor.reduce((acc, l) => acc + (l.hours * l.hourly_cost) + (l.travel_cost || 0.0), 0)
  const laborTotalSale = labor.reduce((acc, l) => acc + ((l.hours * l.hourly_cost) + (l.travel_cost || 0.0)) * (1 + l.markup), 0)
  const expenseTotalCost = expenses.reduce((acc, ex) => acc + ex.amount, 0)
  const expenseTotalSale = expenses.reduce((acc, ex) => acc + (ex.amount * (1 + ex.markup)), 0)

  const stats = {
    costoTotale: matTotalCost + ccTotalCost + laborTotalCost + expenseTotalCost,
    valoreLavori: matTotalSale + ccTotalSale + laborTotalSale + expenseTotalSale,
    preventivoAccettato: project.budget || 0,
    utile: (matTotalSale + ccTotalSale + laborTotalSale + expenseTotalSale) - (matTotalCost + ccTotalCost + laborTotalCost + expenseTotalCost)
  }

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'cost_centers', label: 'Centri di Costo', icon: Target },
    { id: 'materials', label: 'Materiali', icon: Package },
    { id: 'labor', label: 'Manodopera', icon: HardHat },
    { id: 'expenses', label: 'Spese', icon: Receipt }
  ]

  return (
    <div className="space-y-10">
      <ProjectHeader 
        project={project} client={client} activeTab={activeTab} 
        setActiveTab={setActiveTab} tabs={tabs} onBack={onBack} 
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4 }}
        >
          {activeTab === 'dashboard' && <DashboardTab stats={stats} project={project} />}
          {activeTab === 'cost_centers' && <CostCentersTab costCenters={costCenters} onAdd={() => { setSelectedCC(null); setIsCCDrawerOpen(true); }} onEdit={(cc) => { setSelectedCC(cc); setIsCCDrawerOpen(true); }} onDelete={async (id) => { await invoke('delete_cost_center', { id }); fetchData(); }} />}
          {activeTab === 'materials' && <MaterialsTab materials={materials} costCenters={costCenters} onAdd={() => { setSelectedMat(null); setIsMatDrawerOpen(true); }} onEdit={(m) => { setSelectedMat(m); setIsMatDrawerOpen(true); }} onDelete={async (id) => { await invoke('delete_material', { id }); fetchData(); }} />}
          {activeTab === 'labor' && <LaborTab labor={labor} costCenters={costCenters} onAdd={() => { setSelectedLabor(null); setIsLaborDrawerOpen(true); }} onEdit={(l) => { setSelectedLabor(l); setIsLaborDrawerOpen(true); }} onDelete={async (id) => { await invoke('delete_labor', { id }); fetchData(); }} />}
          {activeTab === 'expenses' && <ExpensesTab expenses={expenses} costCenters={costCenters} onAdd={() => { setSelectedExpense(null); setIsExpenseDrawerOpen(true); }} onEdit={(ex) => { setSelectedExpense(ex); setIsExpenseDrawerOpen(true); }} onDelete={async (id) => { await invoke('delete_expense', { id }); fetchData(); }} />}
        </motion.div>
      </AnimatePresence>

      <EditCostCenterDrawer isOpen={isCCDrawerOpen} onClose={() => setIsCCDrawerOpen(false)} cc={selectedCC} projectId={projectId} onSave={handleSaveCC} />
      <EditMaterialDrawer isOpen={isMatDrawerOpen} onClose={() => setIsMatDrawerOpen(false)} material={selectedMat} projectId={projectId} costCenters={costCenters} onSave={handleSaveMat} />
      <EditLaborDrawer isOpen={isLaborDrawerOpen} onClose={() => setIsLaborDrawerOpen(false)} labor={selectedLabor} projectId={projectId} project={project} costCenters={costCenters} onSave={handleSaveLabor} />
      <EditExpenseDrawer isOpen={isExpenseDrawerOpen} onClose={() => setIsExpenseDrawerOpen(false)} expense={selectedExpense} projectId={projectId} costCenters={costCenters} onSave={handleSaveExpense} />
      
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={() => setConfirmConfig({ ...confirmConfig, isOpen: false })}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
      />
    </div>
  )
}

export default ProjectDetails
