import React, { useMemo } from 'react'
import { 
  BarChart3, 
  Target, 
  Clock, 
  Box, 
  Euro, 
  TrendingUp, 
  TrendingDown, 
  Activity, 
  AlertCircle
} from 'lucide-react'
import Card from '../ui/Card'

const AnalyticsTab = ({ labor, materials, expenses, costCenters, project }) => {
  // 1. Calculate overall totals for math sanity checks
  const matTotalCost = useMemo(() => materials.reduce((acc, m) => acc + (m.quantity * m.unit_price), 0), [materials])
  const matTotalSale = useMemo(() => materials.reduce((acc, m) => acc + (m.quantity * m.unit_price * (1 + m.markup)), 0), [materials])
  
  const ccTotalCost = useMemo(() => costCenters.reduce((acc, cc) => acc + cc.base_cost + cc.shipping + cc.install_fee, 0), [costCenters])
  const ccTotalSale = useMemo(() => costCenters.reduce((acc, cc) => acc + (cc.base_cost * (1 + cc.markup)) + cc.shipping + cc.install_fee, 0), [costCenters])
  
  const laborTotalCost = useMemo(() => labor.reduce((acc, l) => acc + (l.hours * l.hourly_cost) + (l.travel_cost || 0.0), 0), [labor])
  const laborTotalSale = useMemo(() => labor.reduce((acc, l) => acc + ((l.hours * l.hourly_cost) + (l.travel_cost || 0.0)) * (1 + l.markup), 0), [labor])
  
  const expenseTotalCost = useMemo(() => expenses.reduce((acc, ex) => acc + ex.amount, 0), [expenses])
  const expenseTotalSale = useMemo(() => expenses.reduce((acc, ex) => acc + (ex.amount * (1 + ex.markup)), 0), [expenses])
  
  const projectTravelCost = useMemo(() => (project?.distance || 0) * (project?.km_cost || 0.0), [project])

  const totalProjectCost = matTotalCost + ccTotalCost + laborTotalCost + expenseTotalCost + projectTravelCost
  const totalProjectSale = matTotalSale + ccTotalSale + laborTotalSale + expenseTotalSale + projectTravelCost
  const totalProjectMargin = totalProjectSale - totalProjectCost
  const totalProjectMarginPerc = totalProjectCost > 0 ? (totalProjectMargin / totalProjectCost) * 100 : 0

  // 2. Aggregate data by Phase
  const phaseData = useMemo(() => {
    const phases = {}

    const getOrCreatePhase = (name) => {
      const normalizedName = name ? name.trim() : 'Non Specificato'
      if (!phases[normalizedName]) {
        phases[normalizedName] = {
          name: normalizedName,
          laborCost: 0,
          laborSale: 0,
          materialCost: 0,
          materialSale: 0,
          expenseCost: 0,
          expenseSale: 0,
          totalCost: 0,
          totalSale: 0
        }
      }
      return phases[normalizedName]
    }

    // Add labor
    labor.forEach(l => {
      const phase = getOrCreatePhase(l.phase)
      const cost = (l.hours * l.hourly_cost) + (l.travel_cost || 0)
      const sale = cost * (1 + l.markup)
      phase.laborCost += cost
      phase.laborSale += sale
    })

    // Add materials
    materials.forEach(m => {
      const phase = getOrCreatePhase(m.phase)
      const cost = m.quantity * m.unit_price
      const sale = cost * (1 + m.markup)
      phase.materialCost += cost
      phase.materialSale += sale
    })

    // Add expenses
    expenses.forEach(ex => {
      const phase = getOrCreatePhase(ex.phase)
      const cost = ex.amount
      const sale = cost * (1 + ex.markup)
      phase.expenseCost += cost
      phase.expenseSale += sale
    })

    // Add Machine Costs (Cost Centers own base costs) to a special category
    if (ccTotalCost > 0) {
      const ccPhase = getOrCreatePhase('Costi Macchinari (Base)')
      ccPhase.materialCost += ccTotalCost // classify under materials for layout simplicity
      ccPhase.materialSale += ccTotalSale
    }

    // Add Project Travel Cost (km cost) to unspecified/generics
    if (projectTravelCost > 0) {
      const travelPhase = getOrCreatePhase('Viaggi / Trasporti Commessa')
      travelPhase.expenseCost += projectTravelCost
      travelPhase.expenseSale += projectTravelCost
    }

    // Finalize totals and convert to array
    return Object.values(phases).map(p => {
      p.totalCost = p.laborCost + p.materialCost + p.expenseCost
      p.totalSale = p.laborSale + p.materialSale + p.expenseSale
      p.margin = p.totalSale - p.totalCost
      return p
    }).sort((a, b) => b.totalCost - a.totalCost)
  }, [labor, materials, expenses, ccTotalCost, ccTotalSale, projectTravelCost])

  // 3. Aggregate data by Category
  const categoryData = useMemo(() => {
    const categories = {}

    const getOrCreateCategory = (name) => {
      const normalizedName = name ? name.trim() : 'Non Specificato / Generico'
      if (!categories[normalizedName]) {
        categories[normalizedName] = {
          name: normalizedName,
          ccSelfCost: 0,
          ccSelfSale: 0,
          laborCost: 0,
          laborSale: 0,
          materialCost: 0,
          materialSale: 0,
          expenseCost: 0,
          expenseSale: 0,
          totalCost: 0,
          totalSale: 0,
          count: 0
        }
      }
      return categories[normalizedName]
    }

    // Index cost center categories
    const ccCategoryMap = {} // ccId -> categoryName
    costCenters.forEach(cc => {
      const catName = cc.category || 'Non Specificato'
      ccCategoryMap[cc.id] = catName
      
      const cat = getOrCreateCategory(catName)
      cat.ccSelfCost += cc.base_cost + cc.shipping + cc.install_fee
      cat.ccSelfSale += (cc.base_cost * (1 + cc.markup)) + cc.shipping + cc.install_fee
      cat.count += 1
    })

    // Accumulate labor into categories based on cost center
    labor.forEach(l => {
      const catName = l.cost_center_id ? ccCategoryMap[l.cost_center_id] : 'Non Specificato / Generico'
      const cat = getOrCreateCategory(catName)
      const cost = (l.hours * l.hourly_cost) + (l.travel_cost || 0)
      const sale = cost * (1 + l.markup)
      cat.laborCost += cost
      cat.laborSale += sale
    })

    // Accumulate materials
    materials.forEach(m => {
      const catName = m.cost_center_id ? ccCategoryMap[m.cost_center_id] : 'Non Specificato / Generico'
      const cat = getOrCreateCategory(catName)
      const cost = m.quantity * m.unit_price
      const sale = cost * (1 + m.markup)
      cat.materialCost += cost
      cat.materialSale += sale
    })

    // Accumulate expenses
    expenses.forEach(ex => {
      const catName = ex.cost_center_id ? ccCategoryMap[ex.cost_center_id] : 'Non Specificato / Generico'
      const cat = getOrCreateCategory(catName)
      const cost = ex.amount
      const sale = cost * (1 + ex.markup)
      cat.expenseCost += cost
      cat.expenseSale += sale
    })

    // Add overall project travel cost to Unspecified / Generic
    if (projectTravelCost > 0) {
      const cat = getOrCreateCategory('Non Specificato / Generico')
      cat.expenseCost += projectTravelCost
      cat.expenseSale += projectTravelCost
    }

    // Finalize totals and convert to array
    return Object.values(categories).map(c => {
      c.totalCost = c.ccSelfCost + c.laborCost + c.materialCost + c.expenseCost
      c.totalSale = c.ccSelfSale + c.laborSale + c.materialSale + c.expenseSale
      c.margin = c.totalSale - c.totalCost
      return c
    }).sort((a, b) => b.totalCost - a.totalCost)
  }, [costCenters, labor, materials, expenses, projectTravelCost])

  const formatEuro = (val) => {
    return new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(val)
  }

  return (
    <div className="space-y-12">
      {/* 1. TOP CARDS SUMMARY */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card hoverEffect={false} className="relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800 text-white">
          <div className="p-6 space-y-2">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-slate-400">Costo Totale Commessa</p>
            <h3 className="text-3xl font-black">{formatEuro(totalProjectCost)}</h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-400 pt-2 border-t border-white/10">
              <Activity size={12} className="text-accent" />
              <span>Include macchine, ore, materiali, spese e viaggi</span>
            </div>
          </div>
        </Card>

        <Card hoverEffect={false} className="relative overflow-hidden bg-white border border-slate-100">
          <div className="p-6 space-y-2">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-slate-400">Valore Lavori (Vendita)</p>
            <h3 className="text-3xl font-black text-slate-800">{formatEuro(totalProjectSale)}</h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="font-bold text-emerald-500">Target Prev. Accettato:</span>
              <span className="font-black text-slate-700">{formatEuro(project?.budget || 0)}</span>
            </div>
          </div>
        </Card>

        <Card hoverEffect={false} className="relative overflow-hidden bg-white border border-slate-100">
          <div className="p-6 space-y-2">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-slate-400">Margine Stimato</p>
            <div className="flex items-baseline gap-2">
              <h3 className={`text-3xl font-black ${totalProjectMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatEuro(totalProjectMargin)}
              </h3>
              <span className={`text-xs font-black px-2 py-0.5 rounded-full ${totalProjectMargin >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {totalProjectMarginPerc >= 0 ? '+' : ''}{totalProjectMarginPerc.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500 pt-2 border-t border-slate-100">
              {totalProjectMargin >= 0 ? (
                <>
                  <TrendingUp size={12} className="text-emerald-500 shrink-0" />
                  <span className="font-bold text-slate-600">Margine positivo sulle risorse impiegate</span>
                </>
              ) : (
                <>
                  <TrendingDown size={12} className="text-rose-500 shrink-0" />
                  <span className="font-bold text-slate-600">Attenzione: i costi superano i ricavi</span>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* 2. PHASES ANALYSIS */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
              <Clock className="text-accent" size={24} />
              Analisi dei Costi per Fase di Lavoro
            </h2>
            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
              Raggruppamento delle attività in base al tag Fase assegnato
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Horizontal Progress Bars */}
          <Card hoverEffect={true} className="lg:col-span-1 p-6 space-y-6 h-full flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4">Percentuale Costo su Totale</h4>
              <div className="space-y-5">
                {phaseData.map((item, idx) => {
                  const perc = totalProjectCost > 0 ? (item.totalCost / totalProjectCost) * 100 : 0
                  return (
                    <div key={idx} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold text-slate-700">
                        <span className="truncate max-w-[180px]">{item.name}</span>
                        <span>{perc.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                        <div 
                          className="bg-accent h-full rounded-full transition-all duration-500" 
                          style={{ width: `${perc}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
            {phaseData.length === 0 && (
              <div className="text-center py-12 text-slate-300 font-bold italic text-xs uppercase tracking-widest">
                Nessuna fase registrata
              </div>
            )}
          </Card>

          {/* Details Table */}
          <Card hoverEffect={false} className="lg:col-span-2 p-0 overflow-hidden h-full">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-widest text-slate-400">Riepilogo Finanziario per Fase</h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/50">
                    <th className="py-4 px-6 text-[0.65rem] font-black uppercase tracking-widest text-slate-400">Fase</th>
                    <th className="py-4 px-6 text-[0.65rem] font-black uppercase tracking-widest text-slate-400 text-right">Manodopera</th>
                    <th className="py-4 px-6 text-[0.65rem] font-black uppercase tracking-widest text-slate-400 text-right">Materiali</th>
                    <th className="py-4 px-6 text-[0.65rem] font-black uppercase tracking-widest text-slate-400 text-right">Spese</th>
                    <th className="py-4 px-6 text-[0.65rem] font-black uppercase tracking-widest text-slate-400 text-right">Costo Totale</th>
                    <th className="py-4 px-6 text-[0.65rem] font-black uppercase tracking-widest text-slate-400 text-right">Vendita</th>
                    <th className="py-4 px-6 text-[0.65rem] font-black uppercase tracking-widest text-slate-400 text-right">Margine</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                  {phaseData.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-4 px-6 font-black uppercase text-slate-800">{item.name}</td>
                      <td className="py-4 px-6 text-right text-slate-500">{formatEuro(item.laborCost)}</td>
                      <td className="py-4 px-6 text-right text-slate-500">{formatEuro(item.materialCost)}</td>
                      <td className="py-4 px-6 text-right text-slate-500">{formatEuro(item.expenseCost)}</td>
                      <td className="py-4 px-6 text-right text-slate-900 font-black">{formatEuro(item.totalCost)}</td>
                      <td className="py-4 px-6 text-right text-emerald-600 font-black">{formatEuro(item.totalSale)}</td>
                      <td className={`py-4 px-6 text-right font-black ${item.margin >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {formatEuro(item.margin)}
                      </td>
                    </tr>
                  ))}
                  {phaseData.length === 0 && (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-slate-300 font-bold italic uppercase tracking-widest">
                        Nessun dato presente
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      </div>

      {/* 3. CATEGORIES ANALYSIS */}
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
            <Target className="text-accent" size={24} />
            Analisi per Categoria Centri di Costo
          </h2>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-wider mt-1">
            Aggregazione dei dati in base alla Categoria del Centro di Costo associato
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {categoryData.map((cat, idx) => {
            const marginPerc = cat.totalCost > 0 ? (cat.margin / cat.totalCost) * 100 : 0
            return (
              <Card key={idx} hoverEffect={true} className="p-6 border border-slate-100 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="text-[0.65rem] font-black uppercase tracking-widest px-3 py-1 bg-slate-100 text-slate-600 rounded-full">
                      {cat.name}
                    </span>
                    {cat.count > 0 && (
                      <span className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest">
                        {cat.count} {cat.count === 1 ? 'Centro' : 'Centri'}
                      </span>
                    )}
                  </div>
                  <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight truncate">{cat.name}</h4>
                </div>

                <div className="grid grid-cols-2 gap-4 py-4 border-y border-slate-50">
                  <div className="space-y-0.5">
                    <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400">Costo Totale</span>
                    <p className="text-sm font-black text-slate-700">{formatEuro(cat.totalCost)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400">Vendita</span>
                    <p className="text-sm font-black text-emerald-600">{formatEuro(cat.totalSale)}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[0.6rem] font-black uppercase tracking-widest text-slate-400">Margine Categoria</span>
                    <p className={`text-base font-black ${cat.margin >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {formatEuro(cat.margin)}
                    </p>
                  </div>
                  <span className={`text-[0.65rem] font-black px-2 py-1 rounded-lg ${cat.margin >= 0 ? 'bg-emerald-50 text-emerald-500' : 'bg-rose-50 text-rose-500'}`}>
                    {marginPerc >= 0 ? '+' : ''}{marginPerc.toFixed(1)}%
                  </span>
                </div>
              </Card>
            )
          })}

          {categoryData.length === 0 && (
            <div className="col-span-full text-center py-12 text-slate-300 font-bold italic text-xs uppercase tracking-widest">
              Nessun centro di costo registrato per questa commessa
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AnalyticsTab
