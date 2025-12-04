
import React, { useState } from 'react';
import { FileDown, Database, Building2, Filter, HardHat, Building, Plus, X, Split, Trash2, Tag, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';
import { INITIAL_COMPANY_SETTINGS } from '../constants';
import { Invoice, CostCenter, User, Project } from '../types';
import { ResponsiveContainer, Pie, Cell, Tooltip, PieChart } from 'recharts';
import { generateJournalPDF } from '../services/pdfService';

interface AccountingProps {
  invoices: Invoice[];
  costCenters: CostCenter[];
  projects: Project[]; // Added: Receive live projects
  onAddCostCenter: (cc: CostCenter) => void;
  onDeleteCostCenter?: (id: string) => void;
  onApproveCostCenter?: (id: string, approverName: string) => void;
  categories: string[];
  onAddCategory: (cat: string) => void;
  currentUser?: User | null;
}

const Accounting: React.FC<AccountingProps> = ({ invoices, costCenters, projects, onAddCostCenter, onDeleteCostCenter, onApproveCostCenter, categories, onAddCategory, currentUser }) => {
  const [activeTab, setActiveTab] = useState<'cost-centers' | 'journal' | 'categories'>('journal');
  
  // Filter States
  const [selectedCostCenter, setSelectedCostCenter] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modals
  const [isKstModalOpen, setIsKstModalOpen] = useState(false);
  const [newKst, setNewKst] = useState<Partial<CostCenter>>({ budget: 0, used: 0 });
  
  const [isCatModalOpen, setIsCatModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  const isAdmin = currentUser?.role === 'admin';

  // UNIFY LISTS: Combine standard Cost Centers and LIVE Projects into one list
  const allCostCenters = [
      ...costCenters.map(c => ({ ...c, type: 'standard' })),
      ...projects.map(p => ({
          id: p.id,
          code: p.costCenterCode, // Projects must utilize costCenterCode
          name: p.name,
          budget: p.budgetTotal,
          used: p.budgetUsed,
          manager: p.manager,
          createdBy: 'System', 
          createdAt: p.startDate,
          approvedBy: 'System',
          type: 'project'
      }))
  ].sort((a, b) => a.code.localeCompare(b.code));

  // Calculations for Charts
  const totalBudget = allCostCenters.reduce((acc, c) => acc + c.budget, 0);
  const totalUsed = allCostCenters.reduce((acc, c) => acc + c.used, 0);
  
  const categoryDataRaw = invoices.reduce((acc: any, inv) => {
     const cat = inv.category || 'Sonstiges';
     acc[cat] = (acc[cat] || 0) + inv.amount;
     return acc;
  }, {});
  
  const categoryData = Object.keys(categoryDataRaw).map(k => ({ name: k, value: categoryDataRaw[k] }));

  // Logic for Journal Filtering
  const filteredJournal = invoices.filter(inv => {
      if (selectedCostCenter !== 'all') {
          if (inv.allocations && inv.allocations.length > 0) {
              const hasMatch = inv.allocations.some(a => a.entityId === selectedCostCenter);
              if (!hasMatch) return false;
          } else {
              if (inv.costCenterId !== selectedCostCenter && inv.projectId !== selectedCostCenter) return false;
          }
      }
      if (selectedCategory !== 'all' && inv.category !== selectedCategory) return false;
      return true;
  });

  const handleSaveKst = () => {
      if (!newKst.name || !newKst.code) return alert("Bitte Name und Nummer angeben");
      
      // Enforce KST- Prefix
      let formattedCode = newKst.code.trim().toUpperCase();
      if (!formattedCode.startsWith('KST-')) {
          formattedCode = `KST-${formattedCode}`;
      }

      const creatorName = currentUser?.name || 'Unbekannt';
      
      onAddCostCenter({
          id: `kst-${Date.now()}`,
          name: newKst.name,
          code: formattedCode,
          budget: newKst.budget || 0,
          used: 0,
          manager: newKst.manager || 'Admin',
          createdBy: creatorName,
          createdAt: new Date().toISOString().split('T')[0],
          approvedBy: isAdmin ? creatorName : undefined 
      });
      setIsKstModalOpen(false);
      setNewKst({ budget: 0, used: 0 });
  };

  const handleSaveCat = () => {
      if (!newCatName.trim()) return;
      onAddCategory(newCatName.trim());
      setIsCatModalOpen(false);
      setNewCatName('');
  };

  // NEW: EXPORT LOGIC TIED TO FILTERED JOURNAL
  const handleExportCSV = () => {
      const headers = ["Datum", "Beleg Nr.", "Lieferant/Kunde", "Typ", "Kostenstelle", "Kategorie", "Netto", "Brutto", "Status"];
      const csvContent = [
          headers.join(';'),
          ...filteredJournal.map(inv => {
              // Determine entity name
              const entityId = inv.projectId || inv.costCenterId;
              const entity = allCostCenters.find(c => c.id === entityId);
              const entityName = entity ? entity.code : (inv.allocations ? 'Split' : '-');
              const net = (Number(inv.netAmount) || Number(inv.amount)/1.2).toFixed(2).replace('.', ',');
              const gross = Number(inv.amount).toFixed(2).replace('.', ',');
              
              return [
                  inv.date,
                  inv.number,
                  (inv.supplier || inv.customer || '').replace(/;/g, ','),
                  inv.type === 'incoming' ? 'Eingang' : 'Ausgang',
                  entityName,
                  inv.category,
                  net,
                  gross,
                  inv.status
              ].join(';');
          })
      ].join('\n');

      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Journal_Export_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleExportPDF = () => {
      let title = "Buchungsjournal Gesamt";
      if (selectedCostCenter !== 'all') {
          const kst = allCostCenters.find(c => c.id === selectedCostCenter);
          title = `Journal: ${kst?.code} - ${kst?.name}`;
      }
      generateJournalPDF(filteredJournal, INITIAL_COMPANY_SETTINGS, title, allCostCenters);
  };

  const handleSpecialExport = (format: 'bmd' | 'datev') => {
      alert(`${format.toUpperCase()} Export für ${filteredJournal.length} Buchungen wird generiert...\n(Simulation: Datei würde hier heruntergeladen)`);
  };

  const switchToInvoices = (kstId: string) => {
      setSelectedCostCenter(kstId);
      setActiveTab('journal');
  };

  const getTopCategoriesForKst = (id: string) => {
      const relevantInvoices = invoices.filter(inv => 
          inv.costCenterId === id || inv.projectId === id || 
          (inv.allocations && inv.allocations.some(a => a.entityId === id))
      );
      const catCounts: Record<string, number> = {};
      relevantInvoices.forEach(inv => {
          const c = inv.category || 'Sonstiges';
          catCounts[c] = (catCounts[c] || 0) + 1;
      });
      return Object.entries(catCounts)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 2)
          .map(e => e[0])
          .join(', ');
  };

  return (
    <div className="animate-fade-in space-y-6 relative">
       <div className="flex flex-col md:flex-row justify-between items-start md:items-center">
        <div>
            <h1 className="text-2xl font-bold text-slate-800">Buchhaltung & Kostenstellen</h1>
            <p className="text-sm text-slate-500">Gesamtübersicht aller Kostenstellen</p>
        </div>
        <div className="flex bg-white p-1 rounded-lg border border-slate-200 mt-4 md:mt-0 overflow-x-auto">
           <button onClick={() => setActiveTab('journal')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'journal' ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:text-slate-900'}`}>
             Buchungsjournal
           </button>
           <button onClick={() => setActiveTab('cost-centers')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'cost-centers' ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:text-slate-900'}`}>
             Alle Kostenstellen
           </button>
           <button onClick={() => setActiveTab('categories')} className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors whitespace-nowrap ${activeTab === 'categories' ? 'bg-brand-100 text-brand-700' : 'text-slate-500 hover:text-slate-900'}`}>
             Kostenarten
           </button>
        </div>
      </div>

      {/* TAB: BUCHUNGSJOURNAL */}
      {activeTab === 'journal' && (
          <div className="space-y-6 animate-slide-up">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex flex-col lg:flex-row justify-between items-end lg:items-center mb-6 gap-4">
                      {/* Filters */}
                      <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
                          <h3 className="font-bold text-slate-800 flex items-center min-w-[120px]">
                              <Filter className="w-5 h-5 mr-2 text-brand-600" />
                              Journal-Filter
                          </h3>
                          <div className="w-full md:w-64">
                              <label className="block text-xs font-medium text-slate-500 mb-1">Kostenstelle</label>
                              <select 
                                className="w-full text-sm border-slate-200 rounded-lg focus:ring-brand-500 focus:border-brand-500"
                                value={selectedCostCenter}
                                onChange={(e) => setSelectedCostCenter(e.target.value)}
                              >
                                  <option value="all">Alle Kostenstellen anzeigen</option>
                                  {allCostCenters.map(cc => (
                                      <option key={cc.id} value={cc.id}>
                                          {cc.code} - {cc.name}
                                      </option>
                                  ))}
                              </select>
                          </div>
                          <div className="w-full md:w-48">
                              <label className="block text-xs font-medium text-slate-500 mb-1">Kostenart</label>
                              <select 
                                className="w-full text-sm border-slate-200 rounded-lg focus:ring-brand-500 focus:border-brand-500"
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                              >
                                  <option value="all">Alle Kostenarten</option>
                                  {categories.map(cat => (
                                      <option key={cat} value={cat}>{cat}</option>
                                  ))}
                              </select>
                          </div>
                      </div>

                      {/* Export Buttons */}
                      <div className="flex space-x-2 w-full lg:w-auto justify-end border-l pl-4 border-slate-200">
                          <button onClick={handleExportCSV} className="flex items-center px-3 py-2 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-sm font-medium border border-green-200 transition-colors">
                              <FileSpreadsheet className="w-4 h-4 mr-2" /> Excel (CSV)
                          </button>
                          <button onClick={handleExportPDF} className="flex items-center px-3 py-2 bg-red-50 text-red-700 hover:bg-red-100 rounded-lg text-sm font-medium border border-red-200 transition-colors">
                              <FileText className="w-4 h-4 mr-2" /> PDF Liste
                          </button>
                          <div className="relative group">
                              <button className="flex items-center px-3 py-2 bg-slate-100 text-slate-700 hover:bg-slate-200 rounded-lg text-sm font-medium border border-slate-200 transition-colors">
                                  Export <ChevronDown className="w-3 h-3 ml-1" />
                              </button>
                              <div className="absolute right-0 top-full mt-2 w-40 bg-white rounded-lg shadow-xl border border-slate-200 hidden group-hover:block z-10">
                                  <button onClick={() => handleSpecialExport('bmd')} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700">BMD Format</button>
                                  <button onClick={() => handleSpecialExport('datev')} className="block w-full text-left px-4 py-2 text-sm hover:bg-slate-50 text-slate-700">DATEV Format</button>
                              </div>
                          </div>
                      </div>
                  </div>

                  {/* Results Table */}
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                      <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                              <tr>
                                  <th className="py-3 px-4">Belegdatum</th>
                                  <th className="py-3 px-4">Beleg Nr.</th>
                                  <th className="py-3 px-4">Lieferant</th>
                                  <th className="py-3 px-4">Kostenstelle</th>
                                  <th className="py-3 px-4">Kostenart</th>
                                  <th className="py-3 px-4 text-right">Betrag</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {filteredJournal.length === 0 ? (
                                  <tr>
                                      <td colSpan={6} className="py-8 text-center text-slate-400">
                                          Keine Buchungen für diesen Filter gefunden.
                                      </td>
                                  </tr>
                              ) : (
                                  filteredJournal.map(inv => {
                                      const entityId = inv.projectId || inv.costCenterId;
                                      const entity = allCostCenters.find(c => c.id === entityId);
                                      const isSplit = inv.allocations && inv.allocations.length > 0;
                                      
                                      return (
                                          <tr key={inv.id} className="hover:bg-slate-50">
                                              <td className="py-3 px-4 text-slate-600">{inv.date}</td>
                                              <td className="py-3 px-4 font-mono text-xs text-slate-500">{inv.number}</td>
                                              <td className="py-3 px-4 font-medium text-slate-900">{inv.supplier}</td>
                                              <td className="py-3 px-4">
                                                  {isSplit ? (
                                                       <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-50 text-purple-700 border border-purple-100">
                                                          <Split className="w-3 h-3 mr-1" /> Mischbuchung ({inv.allocations!.length})
                                                       </span>
                                                  ) : (
                                                      <>
                                                          {entity ? (
                                                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                                                  {entity.type === 'project' ? <HardHat className="w-3 h-3 mr-1" /> : <Building className="w-3 h-3 mr-1" />}
                                                                  {entity.code}
                                                              </span>
                                                          ) : <span className="text-slate-400">-</span>}
                                                      </>
                                                  )}
                                              </td>
                                              <td className="py-3 px-4 text-slate-600">{inv.category}</td>
                                              <td className="py-3 px-4 text-right font-bold text-slate-800">€ {Number(inv.amount).toFixed(2)}</td>
                                          </tr>
                                      );
                                  })
                              )}
                          </tbody>
                          {filteredJournal.length > 0 && (
                              <tfoot className="bg-slate-50 font-bold text-slate-800">
                                  <tr>
                                      <td colSpan={5} className="py-3 px-4 text-right">Summe Auswahl:</td>
                                      <td className="py-3 px-4 text-right">
                                          € {filteredJournal.reduce((sum, inv) => sum + Number(inv.amount), 0).toFixed(2)}
                                      </td>
                                  </tr>
                              </tfoot>
                          )}
                      </table>
                  </div>
              </div>
          </div>
      )}

      {/* TAB: KOSTENSTELLEN LISTE */}
      {activeTab === 'cost-centers' && (
          <div className="space-y-6 animate-fade-in">
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                 <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col justify-between">
                    <div>
                        <p className="text-slate-500 text-sm font-medium mb-1">Gesamtkosten (Alle KSt)</p>
                        <h3 className="text-2xl font-bold text-slate-900">€ {totalUsed.toLocaleString()}</h3>
                    </div>
                    <div className="mt-4 h-2 bg-slate-100 rounded-full overflow-hidden">
                       <div className="bg-blue-500 h-full" style={{ width: `${Math.min((totalUsed / totalBudget) * 100, 100)}%` }}></div>
                    </div>
                    <div className="mt-2 flex justify-between text-xs text-slate-500">
                       <span>Budget gesamt: € {totalBudget.toLocaleString()}</span>
                       <span>{Math.round((totalUsed / totalBudget) * 100)}%</span>
                    </div>
                 </div>

                 <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                     <div className="flex justify-between items-center mb-4">
                        <h4 className="font-semibold text-slate-800">Schnellzugriff</h4>
                     </div>
                     <div className="space-y-2">
                        <div className="text-sm text-slate-600 flex justify-between p-2 bg-slate-50 rounded">
                            <span>Aktive Kostenstellen:</span>
                            <span className="font-bold">{allCostCenters.length}</span>
                        </div>
                        <div className="text-sm text-slate-600 flex justify-between p-2 bg-slate-50 rounded">
                            <span>Davon Kritisch (&gt;90%):</span>
                            <span className="font-bold text-red-600">{allCostCenters.filter(c => (c.used/c.budget) > 0.9).length}</span>
                        </div>
                     </div>
                 </div>

                 <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 flex flex-col items-center justify-center text-center">
                     <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center text-brand-600 mb-3">
                        <Tag size={24} />
                     </div>
                     <h4 className="font-bold text-slate-800">Stammdaten</h4>
                     <p className="text-xs text-slate-500 mt-1 mb-4 max-w-[200px]">
                        Neue Kostenstelle anlegen
                     </p>
                     <button 
                        onClick={() => setIsKstModalOpen(true)}
                        className="text-sm bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 flex items-center"
                    >
                        <Plus className="w-3 h-3 mr-1" /> Neue Kostenstelle
                     </button>
                 </div>
             </div>

             {/* Unified List */}
             <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                   <h3 className="font-semibold text-slate-800">Alle Kostenstellen</h3>
                </div>
                <table className="w-full text-sm text-left">
                   <thead className="bg-white text-slate-500 font-medium border-b border-slate-200">
                      <tr>
                         <th className="py-4 px-6 w-32">Nummer</th>
                         <th className="py-4 px-6">Bezeichnung</th>
                         <th className="py-4 px-6">Kostenarten (Top)</th>
                         <th className="py-4 px-6 text-right">Budget</th>
                         <th className="py-4 px-6 text-right">Ist</th>
                         <th className="py-4 px-6 w-32">Status</th>
                         <th className="py-4 px-6 text-right">Aktionen</th>
                      </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                      {allCostCenters.map(kst => (
                         <tr key={kst.id} className="hover:bg-slate-50 transition-colors">
                            <td className="py-4 px-6 font-mono text-slate-600 font-medium">
                                <div className="flex items-center">
                                    {kst.type === 'project' ? <HardHat className="w-4 h-4 mr-2 text-slate-400" /> : <Building className="w-4 h-4 mr-2 text-slate-400" />}
                                    {kst.code}
                                </div>
                            </td>
                            <td className="py-4 px-6 font-medium text-slate-900">{kst.name}</td>
                            <td className="py-4 px-6 text-xs text-slate-500">
                                <div className="flex flex-wrap gap-1">
                                    {getTopCategoriesForKst(kst.id) || '-'}
                                </div>
                            </td>
                            <td className="py-4 px-6 text-right text-slate-500">€ {kst.budget.toLocaleString()}</td>
                            <td className="py-4 px-6 text-right font-bold text-slate-800">€ {kst.used.toLocaleString()}</td>
                            <td className="py-4 px-6">
                               <div className="flex flex-col space-y-1">
                                   <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                      <div 
                                        className={`h-full ${kst.used/kst.budget > 0.9 ? 'bg-red-500' : 'bg-green-500'}`} 
                                        style={{ width: `${Math.min((kst.used/kst.budget)*100, 100)}%` }}
                                      ></div>
                                   </div>
                               </div>
                            </td>
                            <td className="py-4 px-6 text-right flex justify-end space-x-2">
                                <button onClick={() => switchToInvoices(kst.id)} className="p-1.5 text-xs border border-slate-200 rounded hover:bg-slate-100 text-slate-600 font-medium">Belege</button>
                                {isAdmin && kst.type !== 'project' && (
                                    <button 
                                        onClick={() => onDeleteCostCenter && onDeleteCostCenter(kst.id)}
                                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </td>
                         </tr>
                      ))}
                   </tbody>
                </table>
             </div>
          </div>
      )}

      {/* TAB: KOSTENARTEN */}
      {activeTab === 'categories' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-fade-in">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <h3 className="font-semibold text-slate-800 mb-6">Verteilung nach Kostenart</h3>
                  <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                              <Pie
                                  data={categoryData}
                                  cx="50%"
                                  cy="50%"
                                  innerRadius={60}
                                  outerRadius={80}
                                  paddingAngle={5}
                                  dataKey="value"
                              >
                                  {categoryData.map((entry, index) => (
                                      <Cell key={`cell-${index}`} fill={['#0ea5e9', '#f59e0b', '#10b981', '#8b5cf6'][index % 4]} />
                                  ))}
                              </Pie>
                              <Tooltip formatter={(value: number) => `€ ${value.toLocaleString()}`} />
                          </PieChart>
                      </ResponsiveContainer>
                  </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="font-semibold text-slate-800">Verwaltete Kostenarten</h3>
                    <button 
                        onClick={() => setIsCatModalOpen(true)}
                        className="text-xs bg-brand-100 text-brand-700 px-3 py-1 rounded hover:bg-brand-200 flex items-center"
                    >
                        <Plus className="w-3 h-3 mr-1" /> Neu
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                      {categories.map(cat => (
                          <span key={cat} className="px-3 py-1 bg-slate-100 text-slate-700 rounded-full text-sm border border-slate-200">
                              {cat}
                          </span>
                      ))}
                  </div>
              </div>
          </div>
      )}

      {/* MODAL: Neue Kostenstelle */}
      {isKstModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800">Neue Kostenstelle anlegen</h3>
                 <button onClick={() => setIsKstModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="p-6 space-y-4">
                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Bezeichnung *</label>
                    <input type="text" className="w-full rounded-lg border-slate-300" placeholder="z.B. Marketing" value={newKst.name || ''} onChange={e => setNewKst({...newKst, name: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">KSt-Nummer *</label>
                        <div className="relative">
                            <input type="text" className="w-full rounded-lg border-slate-300 pl-3" placeholder="KST-4000" value={newKst.code || ''} onChange={e => setNewKst({...newKst, code: e.target.value})} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">Prefix 'KST-' wird automatisch ergänzt</p>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Budget (Jahr)</label>
                        <input type="number" className="w-full rounded-lg border-slate-300" placeholder="0" value={newKst.budget || 0} onChange={e => setNewKst({...newKst, budget: parseFloat(e.target.value)})} />
                    </div>
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Verantwortlich</label>
                    <input type="text" className="w-full rounded-lg border-slate-300" placeholder="Name des Managers" value={newKst.manager || ''} onChange={e => setNewKst({...newKst, manager: e.target.value})} />
                 </div>
                 <button onClick={handleSaveKst} className="w-full bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700 mt-2">Speichern</button>
              </div>
           </div>
        </div>
      )}

      {/* MODAL: Neue Kostenart */}
      {isCatModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800">Neue Kostenart</h3>
                 <button onClick={() => setIsCatModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="p-6 space-y-4">
                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Name der Kostenart</label>
                    <input type="text" className="w-full rounded-lg border-slate-300" placeholder="z.B. Reisekosten" value={newCatName} onChange={e => setNewCatName(e.target.value)} />
                 </div>
                 <button onClick={handleSaveCat} className="w-full bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700">Hinzufügen</button>
              </div>
           </div>
        </div>
      )}

    </div>
  );
}

export default Accounting;
