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
  const parseNum = (val) => {
    if (val === null || val === undefined) return 0;
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  // 1. Calculate overall totals for math sanity checks
  const matTotalCost = useMemo(() => materials.reduce((acc, m) => acc + (parseNum(m.quantity) * parseNum(m.unit_price)), 0), [materials])
  const matTotalSale = useMemo(() => materials.reduce((acc, m) => acc + (parseNum(m.quantity) * parseNum(m.unit_price) * (1 + parseNum(m.markup))), 0), [materials])
  
  const ccTotalCost = useMemo(() => costCenters.reduce((acc, cc) => acc + parseNum(cc.base_cost) + parseNum(cc.shipping) + parseNum(cc.install_fee), 0), [costCenters])
  const ccTotalSale = useMemo(() => costCenters.reduce((acc, cc) => acc + parseNum(cc.base_cost) * (1 + parseNum(cc.markup)) + parseNum(cc.shipping) + parseNum(cc.install_fee), 0), [costCenters])
  
  const laborTotalCost = useMemo(() => labor.reduce((acc, l) => acc + (parseNum(l.hours) * parseNum(l.hourly_cost)) + parseNum(l.travel_cost), 0), [labor])
  const laborTotalSale = useMemo(() => labor.reduce((acc, l) => acc + ((parseNum(l.hours) * parseNum(l.hourly_cost)) + parseNum(l.travel_cost)) * (1 + parseNum(l.markup)), 0), [labor])
  
  const expenseTotalCost = useMemo(() => expenses.reduce((acc, ex) => acc + parseNum(ex.amount), 0), [expenses])
  const expenseTotalSale = useMemo(() => expenses.reduce((acc, ex) => acc + (parseNum(ex.amount) * (1 + parseNum(ex.markup))), 0), [expenses])
  
  const totalProjectCost = matTotalCost + ccTotalCost + laborTotalCost + expenseTotalCost
  const totalProjectSale = matTotalSale + ccTotalSale + laborTotalSale + expenseTotalSale
  const totalProjectMargin = totalProjectSale - totalProjectCost
  const totalProjectMarginPerc = totalProjectSale > 0 ? (totalProjectMargin / totalProjectSale) * 100 : 0
  const realProjectMargin = (project?.budget || 0) - totalProjectCost
  const realProjectMarginPerc = (project?.budget || 0) > 0 ? (realProjectMargin / project.budget) * 100 : 0

  // 2. Aggregate data by Phase
  const phaseData = useMemo(() => {
    const phases = {}

    const getOrCreatePhase = (name) => {
      const normalizedName = name ? name.trim() : 'Non Specificato'
      const key = Object.keys(phases).find(k => k.toLowerCase() === normalizedName.toLowerCase())
      if (key) {
        return phases[key]
      }
      phases[normalizedName] = {
        name: normalizedName,
        laborCost: 0,
        laborSale: 0,
        materialCost: 0,
        materialSale: 0,
        expenseCost: 0,
        expenseSale: 0,
        totalCost: 0,
        totalSale: 0,
        realSale: 0
      }
      return phases[normalizedName]
    }

    // Add labor
    labor.forEach(l => {
      const phase = getOrCreatePhase(l.phase)
      const cost = (parseNum(l.hours) * parseNum(l.hourly_cost)) + parseNum(l.travel_cost)
      const sale = cost * (1 + parseNum(l.markup))
      phase.laborCost += cost
      phase.laborSale += sale
    })

    // Add materials
    materials.forEach(m => {
      const phase = getOrCreatePhase(m.phase)
      const cost = parseNum(m.quantity) * parseNum(m.unit_price)
      const sale = cost * (1 + parseNum(m.markup))
      phase.materialCost += cost
      phase.materialSale += sale
    })

    // Add expenses
    expenses.forEach(ex => {
      const phase = getOrCreatePhase(ex.phase)
      const cost = parseNum(ex.amount)
      const sale = cost * (1 + parseNum(ex.markup))
      phase.expenseCost += cost
      phase.expenseSale += sale
    })

    // Add Machine Costs (Cost Centers)
    costCenters.forEach(cc => {
      const baseCost = parseNum(cc.base_cost)
      const shipping = parseNum(cc.shipping)
      const installFee = parseNum(cc.install_fee)
      const markup = parseNum(cc.markup)
      const acceptedBudget = parseNum(cc.accepted_budget)
      
      const machineCost = baseCost
      // Pure machinery sale is base_cost * (1 + markup)
      const baseSale = baseCost * (1 + markup)
      
      // Calculate split of accepted budget if it is set
      let ccShippingBudget = 0
      let ccMachineBudget = 0
      
      if (acceptedBudget > 0) {
        // Allocate shipping at cost, and assign the remainder (including install fee budget) to the machinery
        ccShippingBudget = shipping
        ccMachineBudget = Math.max(0, acceptedBudget - shipping)
      }
      
      // 1. Pure machinery cost, sale, and install fee go to 'Costi Macchinari'
      if (baseCost > 0 || installFee > 0 || acceptedBudget > 0) {
        const ccPhase = getOrCreatePhase('Costi Macchinari')
        ccPhase.materialCost += machineCost
        ccPhase.materialSale += baseSale
        ccPhase.expenseCost += installFee
        ccPhase.expenseSale += installFee
        ccPhase.realSale += ccMachineBudget
      }
      
      // 2. Shipping goes to 'TRASPORTO' phase (both cost and sale)
      if (shipping > 0) {
        const transportPhase = getOrCreatePhase('TRASPORTO')
        transportPhase.expenseCost += shipping
        transportPhase.expenseSale += shipping
        transportPhase.realSale += ccShippingBudget
      }
    })

    // Finalize totals and convert to array
    return Object.values(phases).map(p => {
      p.totalCost = p.laborCost + p.materialCost + p.expenseCost
      p.totalSale = p.laborSale + p.materialSale + p.expenseSale
      p.realSale = p.realSale || 0
      p.margin = p.totalSale - p.totalCost
      p.realMargin = p.realSale - p.totalCost
      return p
    }).sort((a, b) => b.totalCost - a.totalCost)
  }, [labor, materials, expenses, costCenters])

  const phaseTotals = useMemo(() => {
    return phaseData.reduce((acc, item) => ({
      laborCost: acc.laborCost + item.laborCost,
      materialCost: acc.materialCost + item.materialCost,
      expenseCost: acc.expenseCost + item.expenseCost,
      totalCost: acc.totalCost + item.totalCost,
      totalSale: acc.totalSale + item.totalSale,
      realSale: acc.realSale + item.realSale,
      margin: acc.margin + item.margin,
      realMargin: acc.realMargin + item.realMargin,
    }), {
      laborCost: 0,
      materialCost: 0,
      expenseCost: 0,
      totalCost: 0,
      totalSale: 0,
      realSale: 0,
      margin: 0,
      realMargin: 0
    })
  }, [phaseData])

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
          ccSelfAccepted: 0,
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
      const ccSelfCost = parseNum(cc.base_cost) + parseNum(cc.shipping) + parseNum(cc.install_fee)
      const ccSelfSale = parseNum(cc.base_cost) * (1 + parseNum(cc.markup)) + parseNum(cc.shipping) + parseNum(cc.install_fee)
      const ccSelfAccepted = parseNum(cc.accepted_budget)
      
      cat.ccSelfCost += ccSelfCost
      cat.ccSelfSale += ccSelfSale
      cat.ccSelfAccepted += ccSelfAccepted
      cat.count += 1
    })

    // Accumulate labor into categories based on cost center
    labor.forEach(l => {
      const catName = l.cost_center_id ? ccCategoryMap[l.cost_center_id] : 'Non Specificato / Generico'
      const cat = getOrCreateCategory(catName)
      const cost = (parseNum(l.hours) * parseNum(l.hourly_cost)) + parseNum(l.travel_cost)
      const sale = cost * (1 + parseNum(l.markup))
      cat.laborCost += cost
      cat.laborSale += sale
    })

    // Accumulate materials
    materials.forEach(m => {
      const catName = m.cost_center_id ? ccCategoryMap[m.cost_center_id] : 'Non Specificato / Generico'
      const cat = getOrCreateCategory(catName)
      const cost = parseNum(m.quantity) * parseNum(m.unit_price)
      const sale = cost * (1 + parseNum(m.markup))
      cat.materialCost += cost
      cat.materialSale += sale
    })

    // Accumulate expenses
    expenses.forEach(ex => {
      const catName = ex.cost_center_id ? ccCategoryMap[ex.cost_center_id] : 'Non Specificato / Generico'
      const cat = getOrCreateCategory(catName)
      const cost = parseNum(ex.amount)
      const sale = cost * (1 + parseNum(ex.markup))
      cat.expenseCost += cost
      cat.expenseSale += sale
    })

    // Finalize totals and convert to array
    return Object.values(categories).map(c => {
      c.totalCost = c.ccSelfCost + c.laborCost + c.materialCost + c.expenseCost
      c.totalSale = c.ccSelfSale + c.laborSale + c.materialSale + c.expenseSale
      c.realSale = c.ccSelfAccepted
      c.margin = c.totalSale - c.totalCost
      c.realMargin = c.realSale - c.totalCost
      return c
    }).sort((a, b) => b.totalCost - a.totalCost)
  }, [costCenters, labor, materials, expenses])

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
            <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-slate-400">Preventivo Accettato</p>
            <h3 className="text-3xl font-black text-slate-800">{formatEuro(project?.budget || 0)}</h3>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="font-bold text-slate-500">Valore Teorico (Listino):</span>
              <span className="font-black text-slate-700">{formatEuro(totalProjectSale)}</span>
            </div>
          </div>
        </Card>

        <Card hoverEffect={false} className="relative overflow-hidden bg-white border border-slate-100">
          <div className="p-6 space-y-2">
            <p className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-slate-400">Margine su Preventivo</p>
            <div className="flex items-baseline gap-2">
              <h3 className={`text-3xl font-black ${realProjectMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatEuro(realProjectMargin)}
              </h3>
              <span className={`text-xs font-black px-2 py-0.5 rounded-full ${realProjectMargin >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                {realProjectMarginPerc >= 0 ? '+' : ''}{realProjectMarginPerc.toFixed(1)}%
              </span>
            </div>
            <div className="flex items-center gap-1 text-xs text-slate-500 pt-2 border-t border-slate-100">
              <span className="font-bold text-slate-500 flex items-center gap-1">
                {realProjectMargin >= 0 ? <TrendingUp size={12} className="text-emerald-500 shrink-0" /> : <TrendingDown size={12} className="text-rose-500 shrink-0" />}
                Margine Teorico (Listino): {formatEuro(totalProjectMargin)} ({totalProjectMarginPerc >= 0 ? '+' : ''}{totalProjectMarginPerc.toFixed(1)}%)
              </span>
            </div>
          </div>
        </Card>
      </div>

      {/* Warning Banner for Over-Budget Project */}
      {totalProjectCost > (project?.budget || 0) && (
        <div className="bg-rose-50 border border-rose-100 rounded-3xl p-6 flex items-start gap-4 text-rose-800 animate-pulse">
          <AlertCircle size={22} className="text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="text-xs font-black uppercase tracking-widest text-rose-700">Allerta Budget Commessa</h4>
            <p className="text-xs font-semibold leading-relaxed">
              I costi totali della commessa ({formatEuro(totalProjectCost)}) hanno superato il preventivo accettato ({formatEuro(project?.budget || 0)}) di <strong>{(((totalProjectCost - project.budget) / project.budget) * 100).toFixed(1)}%</strong>. Il margine reale di commessa è attualmente in perdita.
            </p>
          </div>
        </div>
      )}

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
                    <th className="py-4 px-6 text-[0.65rem] font-black uppercase tracking-widest text-slate-400 text-right relative group cursor-help">
                      <span className="border-b border-dashed border-slate-200 pb-0.5">Manodopera</span>
                      <div className="absolute top-full right-6 mt-1 hidden group-hover:block w-56 bg-slate-950/95 backdrop-blur-md text-white text-[10px] font-bold normal-case p-3.5 rounded-2xl shadow-xl z-50 text-left border border-white/10 leading-normal">
                        Include: ore di lavoro inserite e relativi costi trasferta dipendenti.
                      </div>
                    </th>
                    <th className="py-4 px-6 text-[0.65rem] font-black uppercase tracking-widest text-slate-400 text-right relative group cursor-help">
                      <span className="border-b border-dashed border-slate-200 pb-0.5">Materiali</span>
                      <div className="absolute top-full right-6 mt-1 hidden group-hover:block w-56 bg-slate-950/95 backdrop-blur-md text-white text-[10px] font-bold normal-case p-3.5 rounded-2xl shadow-xl z-50 text-left border border-white/10 leading-normal">
                        Include: articoli da listino inseriti e costo base dei macchinari.
                      </div>
                    </th>
                    <th className="py-4 px-6 text-[0.65rem] font-black uppercase tracking-widest text-slate-400 text-right relative group cursor-help">
                      <span className="border-b border-dashed border-slate-200 pb-0.5">Spese</span>
                      <div className="absolute top-full right-6 mt-1 hidden group-hover:block w-56 bg-slate-950/95 backdrop-blur-md text-white text-[10px] font-bold normal-case p-3.5 rounded-2xl shadow-xl z-50 text-left border border-white/10 leading-normal">
                        Include: spese vive di commessa, rimborso viaggi (km), trasporto macchinari e fee di montaggio.
                      </div>
                    </th>
                    <th className="py-4 px-4 text-[0.65rem] font-black uppercase tracking-widest text-slate-400 text-right">Costo Tot.</th>
                    <th className="py-4 px-4 text-[0.65rem] font-black uppercase tracking-widest text-slate-400 text-right">Vend. Listino</th>
                    <th className="py-4 px-4 text-[0.65rem] font-black uppercase tracking-widest text-slate-400 text-right">Vend. Prev.</th>
                    <th className="py-4 px-4 text-[0.65rem] font-black uppercase tracking-widest text-slate-400 text-right">Marg. Listino</th>
                    <th className="py-4 px-4 text-[0.65rem] font-black uppercase tracking-widest text-slate-400 text-right">Marg. Prev.</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs font-bold text-slate-700">
                  {phaseData.map((item, idx) => {
                    // Check phase status/allerte
                    let alertBadge = null;
                    if (item.name === 'Costi Macchinari' && item.realMargin < 0) {
                      const over = item.realSale > 0 ? ((item.totalCost - item.realSale) / item.realSale * 100) : 0;
                      alertBadge = (
                        <span className="inline-flex items-center gap-0.5 text-[0.55rem] font-black uppercase px-1.5 py-0.5 bg-rose-50 text-rose-600 rounded-lg border border-rose-100">
                          Fuori Budget {over > 0 ? `(+${over.toFixed(0)}%)` : ''}
                        </span>
                      );
                    } else if (item.name !== 'Costi Macchinari' && item.margin < 0) {
                      alertBadge = (
                        <span className="inline-flex items-center gap-0.5 text-[0.55rem] font-black uppercase px-1.5 py-0.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100">
                          Esubero Risorse
                        </span>
                      );
                    }

                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-black uppercase text-slate-800 flex items-center flex-wrap gap-2">
                          <span>{item.name}</span>
                          {alertBadge}
                        </td>
                        <td className="py-4 px-6 text-right text-slate-500">{formatEuro(item.laborCost)}</td>
                        <td className="py-4 px-6 text-right text-slate-500">{formatEuro(item.materialCost)}</td>
                        <td className="py-4 px-6 text-right text-slate-500">{formatEuro(item.expenseCost)}</td>
                        <td className="py-4 px-4 text-right text-slate-900 font-black">{formatEuro(item.totalCost)}</td>
                        <td className="py-4 px-4 text-right text-slate-500">{formatEuro(item.totalSale)}</td>
                        <td className="py-4 px-4 text-right text-emerald-600 font-black">{formatEuro(item.realSale)}</td>
                        <td className={`py-4 px-4 text-right font-black ${item.margin >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {formatEuro(item.margin)}
                        </td>
                        <td className={`py-4 px-4 text-right font-black ${item.realMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                          {formatEuro(item.realMargin)}
                        </td>
                      </tr>
                    );
                  })}
                  {phaseData.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-slate-300 font-bold italic uppercase tracking-widest">
                        Nessun dato presente
                      </td>
                    </tr>
                  )}
                </tbody>
                {phaseData.length > 0 && (
                  <tfoot className="border-t-2 border-slate-200 bg-slate-50/70 text-xs font-black text-slate-800">
                    <tr>
                      <td className="py-4 px-6 uppercase text-slate-800 font-black">Totale</td>
                      <td className="py-4 px-6 text-right text-slate-800">{formatEuro(phaseTotals.laborCost)}</td>
                      <td className="py-4 px-6 text-right text-slate-800">{formatEuro(phaseTotals.materialCost)}</td>
                      <td className="py-4 px-6 text-right text-slate-800">{formatEuro(phaseTotals.expenseCost)}</td>
                      <td className="py-4 px-4 text-right text-slate-900 font-black">{formatEuro(phaseTotals.totalCost)}</td>
                      <td className="py-4 px-4 text-right text-slate-800">{formatEuro(phaseTotals.totalSale)}</td>
                      <td className="py-4 px-4 text-right text-emerald-600 font-black">{formatEuro(phaseTotals.realSale)}</td>
                      <td className={`py-4 px-4 text-right font-black ${phaseTotals.margin >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {formatEuro(phaseTotals.margin)}
                      </td>
                      <td className={`py-4 px-4 text-right font-black ${phaseTotals.realMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatEuro(phaseTotals.realMargin)}
                      </td>
                    </tr>
                  </tfoot>
                )}
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

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">          {categoryData.map((cat, idx) => {
            const marginPerc = cat.totalCost > 0 ? (cat.margin / cat.totalCost) * 100 : 0
            const realMarginPerc = cat.totalCost > 0 ? (cat.realMargin / cat.totalCost) * 100 : 0
            return (
              <Card key={idx} hoverEffect={true} className="p-6 border border-slate-100 flex flex-col justify-between space-y-6">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <span className="text-[0.65rem] font-black uppercase tracking-widest px-3 py-1 bg-slate-100 text-slate-600 rounded-full">
                      {cat.name}
                    </span>
                    {cat.realSale > 0 && cat.totalCost > cat.realSale ? (
                      <span className="text-[0.55rem] font-black uppercase px-2 py-0.5 bg-rose-50 text-rose-600 rounded-full border border-rose-100">
                        ⚠️ FUORI BUDGET (+{(((cat.totalCost - cat.realSale)/cat.realSale)*100).toFixed(0)}%)
                      </span>
                    ) : cat.realSale === 0 && cat.totalCost > 0 ? (
                      <span className="text-[0.55rem] font-black uppercase px-2 py-0.5 bg-amber-50 text-amber-600 rounded-full border border-amber-100">
                        ⚠️ COSTI EXTRA (NO PREV.)
                      </span>
                    ) : cat.count > 0 ? (
                      <span className="text-[0.6rem] font-bold text-slate-400 uppercase tracking-widest">
                        {cat.count} {cat.count === 1 ? 'Centro' : 'Centri'}
                      </span>
                    ) : null}
                  </div>
                  <h4 className="text-xl font-black text-slate-800 uppercase tracking-tight truncate">{cat.name}</h4>
                </div>

                <div className="grid grid-cols-3 gap-2 py-4 border-y border-slate-50">
                  <div className="space-y-0.5">
                    <span className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400">Costo Totale</span>
                    <p className="text-xs font-black text-slate-700">{formatEuro(cat.totalCost)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400">Vend. Listino</span>
                    <p className="text-xs font-black text-slate-500">{formatEuro(cat.totalSale)}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400">Vend. Prev.</span>
                    <p className="text-xs font-black text-emerald-600">{formatEuro(cat.realSale)}</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <span className="text-[0.55rem] font-black uppercase tracking-widest text-slate-400">Marg. Prev.</span>
                      <p className={`text-sm font-black ${cat.realMargin >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {formatEuro(cat.realMargin)}
                      </p>
                    </div>
                    <span className={`text-[0.6rem] font-black px-1.5 py-0.5 rounded-lg ${cat.realMargin >= 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {realMarginPerc >= 0 ? '+' : ''}{realMarginPerc.toFixed(1)}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between border-t border-slate-50 pt-2 text-[0.6rem]">
                    <span className="font-bold text-slate-400">MARG. LISTINO:</span>
                    <span className={`font-black ${cat.margin >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {formatEuro(cat.margin)} ({marginPerc >= 0 ? '+' : ''}{marginPerc.toFixed(1)}%)
                    </span>
                  </div>
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
