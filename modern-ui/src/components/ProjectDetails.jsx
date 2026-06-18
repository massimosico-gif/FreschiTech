import React, { useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { save as saveFileDialog } from '@tauri-apps/plugin-dialog'
import { AnimatePresence, motion } from 'framer-motion'
import { 
  AlertCircle,
  BarChart3,
  Package,
  HardHat,
  Receipt,
  Target,
  Briefcase,
  Settings
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
import AnalyticsTab from './project/AnalyticsTab'
import CcConfigTab from './project/CcConfigTab'

// Drawers
import EditCostCenterDrawer from './EditCostCenterDrawer'
import EditMaterialDrawer from './EditMaterialDrawer'

// PDF Generator Utilities
import { generateClientPdf, generateInternalPdf } from '../utils/pdfGenerator'

// Zustand Store
import useProjectStore, { 
  useProjectStats, 
  useFilteredMaterials, 
  useFilteredLabor, 
  useFilteredExpenses, 
  useActiveCC 
} from '../hooks/useProjectStore'


const ProjectDetails = ({ projectId, onBack }) => {
  // ─── Store: stato e azioni ────────────────────────────────────────
  const project = useProjectStore(s => s.project)
  const client = useProjectStore(s => s.client)
  const costCenters = useProjectStore(s => s.costCenters)
  const materials = useProjectStore(s => s.materials)
  const labor = useProjectStore(s => s.labor)
  const expenses = useProjectStore(s => s.expenses)
  const loading = useProjectStore(s => s.loading)
  const activeTab = useProjectStore(s => s.activeTab)
  const selectedCostCenterId = useProjectStore(s => s.selectedCostCenterId)
  const errorInfo = useProjectStore(s => s.errorInfo)

  // Drawer states
  const isCCDrawerOpen = useProjectStore(s => s.isCCDrawerOpen)
  const selectedCC = useProjectStore(s => s.selectedCC)
  const isMatDrawerOpen = useProjectStore(s => s.isMatDrawerOpen)
  const selectedMat = useProjectStore(s => s.selectedMat)
  const confirmConfig = useProjectStore(s => s.confirmConfig)

  // Actions
  const initProject = useProjectStore(s => s.initProject)
  const setActiveTab = useProjectStore(s => s.setActiveTab)
  const selectCostCenter = useProjectStore(s => s.selectCostCenter)
  const deselectCostCenter = useProjectStore(s => s.deselectCostCenter)
  const openCCDrawer = useProjectStore(s => s.openCCDrawer)
  const closeCCDrawer = useProjectStore(s => s.closeCCDrawer)
  const openMatDrawer = useProjectStore(s => s.openMatDrawer)
  const closeMatDrawer = useProjectStore(s => s.closeMatDrawer)
  const showConfirm = useProjectStore(s => s.showConfirm)
  const hideConfirm = useProjectStore(s => s.hideConfirm)
  const saveCostCenter = useProjectStore(s => s.saveCostCenter)
  const deleteCostCenter = useProjectStore(s => s.deleteCostCenter)
  const saveMaterial = useProjectStore(s => s.saveMaterial)
  const deleteMaterial = useProjectStore(s => s.deleteMaterial)
  const saveLabor = useProjectStore(s => s.saveLabor)
  const deleteLabor = useProjectStore(s => s.deleteLabor)
  const saveExpense = useProjectStore(s => s.saveExpense)
  const deleteExpense = useProjectStore(s => s.deleteExpense)
  const fetchData = useProjectStore(s => s.fetchData)

  // Selettori derivati
  const stats = useProjectStats()
  const filteredMaterials = useFilteredMaterials()
  const filteredLabor = useFilteredLabor()
  const filteredExpenses = useFilteredExpenses()
  const activeCC = useActiveCC()

  // ─── Effetti ──────────────────────────────────────────────────────
  useEffect(() => {
    initProject(projectId)
  }, [projectId])

  // ─── Render Guards ────────────────────────────────────────────────
  if (loading) return <div className="p-20 text-center font-black uppercase tracking-widest text-slate-400">Caricamento...</div>

  if (!project) return (
    <div className="p-20 text-center">
      <AlertCircle size={48} className="mx-auto text-rose-500 mb-4" />
      <h2 className="text-xl font-black text-slate-800">Commessa non trovata</h2>
      <button onClick={onBack} className="mt-6 text-accent font-black uppercase tracking-widest text-xs">Torna indietro</button>
    </div>
  )

  // ─── Computed per il rendering ────────────────────────────────────

  const activeProjectForDashboard = selectedCostCenterId && activeCC
    ? {
        ...project,
        description: `Centro di Costo: ${activeCC.brand ? activeCC.brand + ' ' : ''}${activeCC.model} (${activeCC.category})`
      }
    : project

  const ccTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
    { id: 'config', label: 'Configurazione Costi', icon: Settings },
    { id: 'materials', label: 'Materiali', icon: Package },
    { id: 'labor', label: 'Manodopera', icon: HardHat },
    { id: 'expenses', label: 'Spese', icon: Receipt }
  ]

  const projectTabs = [
    { id: 'cost_centers', label: 'Centri di Costo', icon: Target },
    { id: 'analytics', label: 'Analisi Fasi & Categorie', icon: BarChart3 }
  ]

  const tabs = selectedCostCenterId ? ccTabs : projectTabs

  const headerProject = selectedCostCenterId && activeCC
    ? {
        ...project,
        name: `${activeCC.brand ? activeCC.brand + ' ' : ''}${activeCC.model}`,
        status: project.status
      }
    : project

  const handleBack = selectedCostCenterId
    ? (goToAllProjects = false) => {
        if (goToAllProjects) {
          deselectCostCenter()
          onBack()
        } else {
          deselectCostCenter()
        }
      }
    : onBack

  // ─── PDF Export Handlers ──────────────────────────────────────────

  const handleExportClientPdf = async () => {
    if (!project) return
    try {
      const doc = generateClientPdf(project, client, costCenters, materials, labor, expenses)
      const filePath = await saveFileDialog({
        filters: [{
          name: 'Documento PDF',
          extensions: ['pdf']
        }],
        defaultPath: `Commessa_${project.name.replace(/\s+/g, '_')}_Cliente.pdf`
      })
      if (filePath) {
        const pdfArrayBuffer = doc.output('arraybuffer')
        const pdfBytes = new Uint8Array(pdfArrayBuffer)
        await invoke('save_pdf_file', { destPath: filePath, content: Array.from(pdfBytes) })
      }
    } catch (err) {
      console.error(err)
      alert(`Errore durante il salvataggio del PDF: ${err}`)
    }
  }

  const handleExportInternalPdf = async () => {
    if (!project) return
    try {
      const doc = generateInternalPdf(project, client, costCenters, materials, labor, expenses)
      const filePath = await saveFileDialog({
        filters: [{
          name: 'Documento PDF',
          extensions: ['pdf']
        }],
        defaultPath: `Commessa_${project.name.replace(/\s+/g, '_')}_ReportInterno.pdf`
      })
      if (filePath) {
        const pdfArrayBuffer = doc.output('arraybuffer')
        const pdfBytes = new Uint8Array(pdfArrayBuffer)
        await invoke('save_pdf_file', { destPath: filePath, content: Array.from(pdfBytes) })
      }
    } catch (err) {
      console.error(err)
      alert(`Errore durante il salvataggio del PDF: ${err}`)
    }
  }

  // ─── Render ───────────────────────────────────────────────────────
  return (
    <div className="space-y-10">
      <ProjectHeader 
        project={headerProject} 
        client={client} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        tabs={tabs} 
        onBack={handleBack}
        onExportClientPdf={handleExportClientPdf}
        onExportInternalPdf={handleExportInternalPdf}
        isCostCenter={!!selectedCostCenterId}
        parentProjectName={project?.name}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.4 }}
        >
          {activeTab === 'dashboard' && <DashboardTab stats={stats} project={activeProjectForDashboard} labor={filteredLabor} materials={filteredMaterials} expenses={filteredExpenses} isCostCenter={!!selectedCostCenterId} />}
           {activeTab === 'cost_centers' && <CostCentersTab costCenters={costCenters} onAdd={() => openCCDrawer(null)} onEdit={(cc) => openCCDrawer(cc)} onDelete={deleteCostCenter} onClickCard={(ccId) => selectCostCenter(ccId)} />}
          {activeTab === 'analytics' && <AnalyticsTab labor={labor} materials={materials} expenses={expenses} costCenters={costCenters} project={project} />}
          {activeTab === 'materials' && <MaterialsTab materials={filteredMaterials} costCenters={costCenters} onAdd={() => openMatDrawer(null)} onEdit={(m) => openMatDrawer(m)} onDelete={deleteMaterial} defaultCostCenterId={selectedCostCenterId} projectId={projectId} onSave={saveMaterial} onRefresh={() => fetchData(true)} />}
          {activeTab === 'labor' && <LaborTab labor={filteredLabor} costCenters={costCenters} onDelete={deleteLabor} defaultCostCenterId={selectedCostCenterId} projectId={projectId} project={project} onSave={saveLabor} onRefresh={() => fetchData(true)} />}
          {activeTab === 'expenses' && <ExpensesTab expenses={filteredExpenses} costCenters={costCenters} onDelete={deleteExpense} defaultCostCenterId={selectedCostCenterId} projectId={projectId} onSave={saveExpense} />}
          {activeTab === 'config' && <CcConfigTab costCenter={activeCC} onSave={saveCostCenter} />}
        </motion.div>
      </AnimatePresence>

      <EditCostCenterDrawer isOpen={isCCDrawerOpen} onClose={closeCCDrawer} cc={selectedCC} projectId={projectId} onSave={saveCostCenter} />
      <EditMaterialDrawer isOpen={isMatDrawerOpen} onClose={closeMatDrawer} material={selectedMat} projectId={projectId} costCenters={costCenters} onSave={saveMaterial} defaultCostCenterId={selectedCostCenterId} />

      
      <ConfirmModal 
        isOpen={confirmConfig.isOpen}
        onClose={hideConfirm}
        onConfirm={confirmConfig.onConfirm}
        title={confirmConfig.title}
        message={confirmConfig.message}
      />
    </div>
  )
}

export default ProjectDetails
