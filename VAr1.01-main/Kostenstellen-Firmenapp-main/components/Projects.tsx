


import React, { useState } from 'react';
import { Project, Invoice, Task, Status, ConstructionDiaryEntry, CompanySettings } from '../types';
import { MapPin, DollarSign, FileText, Users, Briefcase, ArrowRight, Plus, CheckSquare, Calendar, Download, HardHat, X, Edit, AlertCircle, Save, Printer, Camera, Sun, CloudRain, Wind, Tag } from 'lucide-react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';
import { generateProjectFilePDF } from '../services/pdfService';
import { INITIAL_COMPANY_SETTINGS } from '../constants';

interface ProjectsProps {
    invoices: Invoice[];
    projects: Project[];
    onAddProject: (project: Project) => void;
    onUpdateProject?: (project: Project) => void;
    tasks: Task[];
    onAddTask: (task: Task) => void;
    onToggleTask: (taskId: string) => void;
    companySettings?: CompanySettings;
}

interface ProjectDetailProps {
  project: Project;
  projectInvoices: Invoice[];
  projectTasks: Task[];
  onBack: () => void;
  onAddTask: (task: Task) => void;
  onToggleTask: (taskId: string) => void;
  onUpdateProject?: (project: Project) => void;
  companySettings?: CompanySettings;
}

const ProjectDetail: React.FC<ProjectDetailProps> = ({ project, projectInvoices, projectTasks, onBack, onAddTask, onToggleTask, onUpdateProject, companySettings }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'invoices' | 'budget' | 'files' | 'tasks' | 'diary'>('overview');
  const usagePercent = Math.round((project.budgetUsed / project.budgetTotal) * 100);
  
  // Tasks
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');

  // Budget Editing
  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [newBudgetTotal, setNewBudgetTotal] = useState(project.budgetTotal);

  // Diary
  const [isDiaryModalOpen, setIsDiaryModalOpen] = useState(false);
  const [newDiaryEntry, setNewDiaryEntry] = useState<Partial<ConstructionDiaryEntry>>({
      date: new Date().toISOString().split('T')[0],
      weather: 'Sonnig',
      temperature: '20°C',
      staffCount: 0,
      content: '',
      images: []
  });
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState(false);

  // -- Handlers --

  const handleDownloadProjectFile = () => {
      const settings = companySettings || INITIAL_COMPANY_SETTINGS;
      generateProjectFilePDF(project, projectInvoices, projectTasks, settings);
  };

  const handleSaveTask = () => {
      if(!newTaskTitle) return;
      onAddTask({
          id: `t-${Date.now()}`,
          title: newTaskTitle,
          assignedTo: project.manager,
          dueDate: new Date(Date.now() + 7*86400000).toISOString().split('T')[0],
          priority: 'Medium',
          completed: false,
          relatedEntityId: project.id
      });
      setNewTaskTitle('');
      setIsTaskModalOpen(false);
  };

  const handleUpdateBudget = () => {
      if (newBudgetTotal !== project.budgetTotal) {
          if (window.confirm(`Möchten Sie das Gesamtbudget wirklich von € ${project.budgetTotal.toLocaleString()} auf € ${newBudgetTotal.toLocaleString()} ändern?`)) {
              if (onUpdateProject) {
                  onUpdateProject({ ...project, budgetTotal: newBudgetTotal });
                  setIsEditingBudget(false);
              }
          }
      } else {
          setIsEditingBudget(false);
      }
  };

  const handleAddDiaryEntry = () => {
      if (!newDiaryEntry.content) return alert("Bitte Berichtstext eingeben.");
      
      const entry: ConstructionDiaryEntry = {
          id: `d-${Date.now()}`,
          date: newDiaryEntry.date || new Date().toISOString().split('T')[0],
          weather: newDiaryEntry.weather || 'Sonnig',
          temperature: newDiaryEntry.temperature || '',
          staffCount: newDiaryEntry.staffCount || 0,
          content: newDiaryEntry.content || '',
          images: newDiaryEntry.images || [],
          author: project.manager || 'Admin'
      };

      const updatedEntries = [entry, ...(project.diaryEntries || [])];
      if (onUpdateProject) {
          onUpdateProject({ ...project, diaryEntries: updatedEntries });
      }
      setIsDiaryModalOpen(false);
      setNewDiaryEntry({ date: new Date().toISOString().split('T')[0], weather: 'Sonnig', temperature: '20°C', staffCount: 0, content: '', images: [] });
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const url = URL.createObjectURL(e.target.files[0]);
          setNewDiaryEntry(prev => ({ ...prev, images: [...(prev.images || []), url] }));
      }
  };

  // -- Chart Data Preparation --
  const costByCategory = projectInvoices.reduce((acc: any, inv) => {
      const cat = inv.category || 'Sonstiges';
      acc[cat] = (acc[cat] || 0) + inv.amount;
      return acc;
  }, {});
  const chartData = Object.keys(costByCategory).map(k => ({ name: k, value: costByCategory[k] }));
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-100 min-h-[600px] flex flex-col animate-fade-in relative">
      {/* Header */}
      <div className="p-6 border-b border-slate-100 flex justify-between items-start">
        <div>
          <button onClick={onBack} className="text-sm text-slate-500 hover:text-brand-600 mb-2 flex items-center">
            &larr; Zurück zur Übersicht
          </button>
          <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">{project.name}</h2>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded border border-slate-200 font-mono">
                  {project.costCenterCode}
              </span>
          </div>
          <div className="flex items-center text-slate-500 mt-1 space-x-4">
            <span className="flex items-center text-sm"><MapPin className="w-4 h-4 mr-1" /> {project.address}</span>
            <span className="flex items-center text-sm"><Users className="w-4 h-4 mr-1" /> {project.manager}</span>
          </div>
        </div>
        <div className="text-right flex flex-col items-end space-y-2">
           <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${usagePercent > 90 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
             {usagePercent > 100 ? 'Budget überschritten' : project.status}
           </span>
           <div className="flex space-x-2">
                <button onClick={() => setIsPrintPreviewOpen(true)} className="text-xs text-slate-600 flex items-center hover:text-brand-600 border border-slate-200 px-3 py-1.5 rounded bg-slate-50">
                    <Printer className="w-3 h-3 mr-1" /> Tagebuch drucken
                </button>
                <button onClick={handleDownloadProjectFile} className="text-xs text-slate-500 flex items-center hover:text-slate-800 border border-slate-200 px-2 py-1 rounded">
                    <Download className="w-3 h-3 mr-1" /> Projekt-Akte
                </button>
           </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 px-6 overflow-x-auto">
         {['overview', 'invoices', 'budget', 'diary', 'tasks', 'files'].map((tab) => (
           <button
             key={tab}
             onClick={() => setActiveTab(tab as any)}
             className={`mr-8 py-4 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${activeTab === tab ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
           >
             {tab === 'overview' ? 'Übersicht' : 
              tab === 'invoices' ? 'Rechnungen' : 
              tab === 'budget' ? 'Budget & Kosten' : 
              tab === 'diary' ? 'Bautagebuch' :
              tab === 'tasks' ? 'Aufgaben' : 'Dokumente'}
           </button>
         ))}
      </div>

      {/* Content */}
      <div className="p-6 flex-1 overflow-y-auto">
        {activeTab === 'overview' && (
          <div className="space-y-8 animate-fade-in">
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                   <p className="text-sm text-slate-500">Budget Gesamt</p>
                   <p className="text-xl font-bold text-slate-900">€ {project.budgetTotal.toLocaleString('de-DE')}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                   <p className="text-sm text-slate-500">Bereits verwendet</p>
                   <p className={`text-xl font-bold ${usagePercent > 90 ? 'text-red-600' : 'text-slate-900'}`}>€ {project.budgetUsed.toLocaleString('de-DE')}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                   <p className="text-sm text-slate-500">Auslastung</p>
                   <div className="flex items-center mt-1">
                     <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden mr-2">
                       <div className={`h-full ${usagePercent > 90 ? 'bg-red-500' : 'bg-blue-500'}`} style={{ width: `${Math.min(usagePercent, 100)}%` }}></div>
                     </div>
                     <span className="text-sm font-bold">{usagePercent}%</span>
                   </div>
                </div>
             </div>

             <div>
                <h3 className="text-lg font-semibold mb-4">Timeline / Verlauf</h3>
                <div className="border-l-2 border-slate-200 pl-4 space-y-6 ml-2">
                   <div className="relative">
                     <div className="absolute -left-[21px] top-1 w-3 h-3 bg-blue-500 rounded-full ring-4 ring-white"></div>
                     <p className="text-sm text-slate-500">Heute</p>
                     <p className="text-slate-800 font-medium">Projektstatus: {project.status}</p>
                   </div>
                   {projectInvoices.slice(0, 3).map(inv => (
                     <div key={inv.id} className="relative">
                        <div className="absolute -left-[21px] top-1 w-3 h-3 bg-slate-300 rounded-full ring-4 ring-white"></div>
                        <p className="text-sm text-slate-500">{inv.date}</p>
                        <p className="text-slate-800 font-medium">Rechnung {inv.supplier} (€ {inv.amount}) erfasst</p>
                     </div>
                   ))}
                   <div className="relative">
                     <div className="absolute -left-[21px] top-1 w-3 h-3 bg-slate-300 rounded-full ring-4 ring-white"></div>
                     <p className="text-sm text-slate-500">{project.startDate || '2024-01-01'}</p>
                     <p className="text-slate-800 font-medium">Projektstart</p>
                   </div>
                </div>
             </div>
          </div>
        )}

        {activeTab === 'tasks' && (
            <div className="animate-fade-in">
                <div className="flex justify-between mb-4">
                    <h3 className="text-lg font-semibold">Aufgaben für {project.name}</h3>
                    <button onClick={() => setIsTaskModalOpen(true)} className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700 flex items-center">
                        <Plus className="w-4 h-4 mr-1" /> Neue Aufgabe
                    </button>
                </div>
                {projectTasks.length === 0 ? (
                    <p className="text-slate-400 text-center py-8">Keine Aufgaben für dieses Projekt gefunden.</p>
                ) : (
                    <div className="space-y-3">
                        {projectTasks.map(task => (
                            <div key={task.id} className={`flex items-center p-4 rounded-lg border transition-all ${task.completed ? 'bg-slate-50 border-slate-100 opacity-75' : 'bg-white border-slate-200 shadow-sm'}`}>
                                <div className={`w-1 h-10 rounded-full mr-4 flex-shrink-0 ${task.priority === 'High' ? 'bg-red-500' : task.priority === 'Medium' ? 'bg-orange-500' : 'bg-blue-500'}`}></div>
                                <div className="flex-1">
                                    <h4 className={`font-semibold ${task.completed ? 'text-slate-500 line-through' : 'text-slate-900'}`}>{task.title}</h4>
                                    <div className="flex text-xs text-slate-500 mt-1 space-x-3">
                                        <span className="flex items-center"><Users className="w-3 h-3 mr-1"/> {task.assignedTo}</span>
                                        <span className="flex items-center"><Calendar className="w-3 h-3 mr-1"/> {task.dueDate}</span>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => onToggleTask(task.id)}
                                    className={`p-2 transition-colors rounded-full ${task.completed ? 'text-green-600 bg-green-50' : 'text-slate-300 hover:text-green-600 hover:bg-slate-50'}`}
                                >
                                    <CheckSquare className="w-6 h-6" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        )}

        {activeTab === 'invoices' && (
          <div className="animate-fade-in">
             <div className="flex justify-between mb-4">
               <h3 className="text-lg font-semibold">Zugeordnete Rechnungen</h3>
             </div>
             <table className="w-full text-sm text-left">
                <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                   <tr>
                     <th className="py-3 px-4">Nr.</th>
                     <th className="py-3 px-4">Lieferant</th>
                     <th className="py-3 px-4">Betrag</th>
                     <th className="py-3 px-4">Status</th>
                     <th className="py-3 px-4">Datum</th>
                   </tr>
                </thead>
                <tbody>
                   {projectInvoices.length === 0 ? (
                     <tr><td colSpan={5} className="py-8 text-center text-slate-400">Keine Rechnungen gefunden.</td></tr>
                   ) : (
                     projectInvoices.map(inv => (
                       <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50">
                         <td className="py-3 px-4 font-mono text-slate-600">{inv.number}</td>
                         <td className="py-3 px-4">{inv.supplier}</td>
                         <td className="py-3 px-4 font-medium">€ {inv.amount.toFixed(2)}</td>
                         <td className="py-3 px-4">
                            <span className={`px-2 py-1 rounded-full text-xs ${inv.status === 'Überfällig' ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                              {inv.status}
                            </span>
                         </td>
                         <td className="py-3 px-4 text-slate-500">{inv.date}</td>
                       </tr>
                     ))
                   )}
                </tbody>
             </table>
          </div>
        )}
        
        {activeTab === 'files' && (
             <div className="animate-fade-in flex flex-col items-center justify-center h-64 text-slate-400 bg-slate-50 border-2 border-dashed border-slate-200 rounded-lg">
                <FileText className="w-10 h-10 mb-2 opacity-50" />
                <p>Keine Dokumente vorhanden</p>
                <button className="mt-4 text-sm text-brand-600 font-medium hover:underline">Dokument hochladen</button>
             </div>
        )}
        
        {/* BUDGET & CHARTS */}
        {activeTab === 'budget' && (
             <div className="animate-fade-in space-y-6">
                 {/* Budget Control */}
                 <div className="p-6 bg-slate-50 rounded-lg border border-slate-200">
                    <div className="flex justify-between items-center mb-4">
                        <p className="text-slate-600 font-medium">Gesamtbudget Verwaltung</p>
                        {!isEditingBudget ? (
                             <button onClick={() => setIsEditingBudget(true)} className="text-brand-600 hover:bg-brand-50 p-2 rounded-full transition-colors">
                                 <Edit className="w-4 h-4" />
                             </button>
                        ) : (
                             <div className="flex space-x-2">
                                 <button onClick={() => setIsEditingBudget(false)} className="p-2 text-slate-500 hover:bg-slate-200 rounded"><X className="w-4 h-4" /></button>
                                 <button onClick={handleUpdateBudget} className="p-2 text-green-600 hover:bg-green-100 rounded"><Save className="w-4 h-4" /></button>
                             </div>
                        )}
                    </div>
                    
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-3 gap-4 text-left">
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                            <span className="text-xs text-slate-500 block mb-1">Geplant (Soll)</span>
                            {isEditingBudget ? (
                                <input 
                                    type="number" 
                                    className="w-full font-bold border-slate-300 rounded focus:ring-brand-500" 
                                    value={newBudgetTotal}
                                    onChange={e => setNewBudgetTotal(parseFloat(e.target.value))}
                                />
                            ) : (
                                <p className="font-bold text-2xl">€ {project.budgetTotal.toLocaleString()}</p>
                            )}
                        </div>
                        <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                            <span className="text-xs text-slate-500 block mb-1">Verbraucht (Ist)</span>
                            <p className="font-bold text-2xl text-brand-600">€ {project.budgetUsed.toLocaleString()}</p>
                        </div>
                         <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                            <span className="text-xs text-slate-500 block mb-1">Verfügbar</span>
                            <p className={`font-bold text-2xl ${(project.budgetTotal - project.budgetUsed) < 0 ? 'text-red-600' : 'text-green-600'}`}>
                                € {(project.budgetTotal - project.budgetUsed).toLocaleString()}
                            </p>
                        </div>
                    </div>
                 </div>

                 {/* Charts */}
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-80">
                         <h3 className="text-sm font-bold text-slate-700 mb-4">Kostenverteilung nach Art</h3>
                         <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={chartData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(value: number) => `€ ${value.toLocaleString()}`} />
                            </PieChart>
                         </ResponsiveContainer>
                     </div>
                     
                     <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm h-80">
                        <h3 className="text-sm font-bold text-slate-700 mb-4">Ausgaben pro Kategorie</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={chartData} layout="vertical" margin={{top: 5, right: 30, left: 40, bottom: 5}}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" hide />
                                <YAxis type="category" dataKey="name" width={100} tick={{fontSize: 12}} />
                                <Tooltip cursor={{fill: 'transparent'}} formatter={(value: number) => `€ ${value.toLocaleString()}`} />
                                <Bar dataKey="value" fill="#0ea5e9" radius={[0, 4, 4, 0]} barSize={20} />
                            </BarChart>
                        </ResponsiveContainer>
                     </div>
                 </div>
             </div>
        )}

        {/* BAUTAGEBUCH TAB */}
        {activeTab === 'diary' && (
            <div className="animate-fade-in">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-lg font-semibold">Bautagebuch</h3>
                        <p className="text-xs text-slate-500">Tägliche Dokumentation des Baufortschritts</p>
                    </div>
                    <button onClick={() => setIsDiaryModalOpen(true)} className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 shadow-sm flex items-center">
                        <Plus className="w-4 h-4 mr-2" /> Eintrag erstellen
                    </button>
                </div>

                <div className="space-y-4">
                    {(!project.diaryEntries || project.diaryEntries.length === 0) ? (
                        <div className="text-center py-12 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400">
                            <FileText className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            Keine Tagebucheinträge vorhanden.
                        </div>
                    ) : (
                        project.diaryEntries.map(entry => (
                            <div key={entry.id} className="bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-shadow">
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex items-center space-x-4">
                                        <div className="bg-slate-100 px-3 py-1 rounded-lg text-center min-w-[80px]">
                                            <span className="block text-xs text-slate-500 uppercase">Datum</span>
                                            <span className="font-bold text-slate-900">{entry.date}</span>
                                        </div>
                                        <div className="flex space-x-4 text-sm text-slate-600">
                                            <span className="flex items-center" title="Wetter"><Sun className="w-4 h-4 mr-1 text-orange-400" /> {entry.weather}</span>
                                            <span className="flex items-center" title="Temperatur"><CloudRain className="w-4 h-4 mr-1 text-blue-400" /> {entry.temperature}</span>
                                            <span className="flex items-center" title="Personal"><Users className="w-4 h-4 mr-1 text-slate-400" /> {entry.staffCount} Pers.</span>
                                        </div>
                                    </div>
                                    <span className="text-xs text-slate-400">Autor: {entry.author}</span>
                                </div>
                                <div className="mb-4">
                                    <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-line">{entry.content}</p>
                                </div>
                                {entry.images && entry.images.length > 0 && (
                                    <div className="flex space-x-2 overflow-x-auto pb-2">
                                        {entry.images.map((img, idx) => (
                                            <img key={idx} src={img} alt="Dokumentation" className="h-20 w-20 object-cover rounded-lg border border-slate-100" />
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>
        )}
      </div>

      {/* Simple Task Modal */}
      {isTaskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm rounded-xl">
             <div className="bg-white p-6 rounded-lg shadow-xl w-96">
                 <h3 className="font-bold mb-4">Neue Aufgabe für {project.name}</h3>
                 <input 
                    autoFocus
                    type="text" 
                    placeholder="Was ist zu tun?" 
                    className="w-full border border-slate-300 rounded p-2 mb-4"
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                 />
                 <div className="flex justify-end space-x-2">
                     <button onClick={() => setIsTaskModalOpen(false)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded">Abbrechen</button>
                     <button onClick={handleSaveTask} className="px-4 py-2 text-sm bg-brand-600 text-white rounded hover:bg-brand-700">Speichern</button>
                 </div>
             </div>
        </div>
      )}

      {/* DIARY MODAL */}
      {isDiaryModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800">Neuer Bautagebuch-Eintrag</h3>
                 <button onClick={() => setIsDiaryModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="p-6 space-y-4">
                 <div className="grid grid-cols-3 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Datum</label>
                        <input type="date" className="w-full rounded-lg border-slate-300" value={newDiaryEntry.date} onChange={e => setNewDiaryEntry({...newDiaryEntry, date: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Wetter</label>
                        <select className="w-full rounded-lg border-slate-300" value={newDiaryEntry.weather} onChange={e => setNewDiaryEntry({...newDiaryEntry, weather: e.target.value})}>
                            <option>Sonnig</option>
                            <option>Bewölkt</option>
                            <option>Regen</option>
                            <option>Schnee</option>
                            <option>Sturm</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Temperatur</label>
                        <input type="text" className="w-full rounded-lg border-slate-300" placeholder="20°C" value={newDiaryEntry.temperature} onChange={e => setNewDiaryEntry({...newDiaryEntry, temperature: e.target.value})} />
                    </div>
                 </div>
                 
                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Personalstärke (Anzahl)</label>
                    <input type="number" className="w-full rounded-lg border-slate-300" value={newDiaryEntry.staffCount} onChange={e => setNewDiaryEntry({...newDiaryEntry, staffCount: parseInt(e.target.value)})} />
                 </div>

                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Tagesbericht / Vorkommnisse</label>
                    <textarea 
                        className="w-full rounded-lg border-slate-300 h-32" 
                        placeholder="Was wurde heute erledigt? Gab es Probleme?"
                        value={newDiaryEntry.content}
                        onChange={e => setNewDiaryEntry({...newDiaryEntry, content: e.target.value})}
                    ></textarea>
                 </div>

                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Fotos hinzufügen</label>
                    <div className="flex items-center space-x-2">
                        <label className="cursor-pointer bg-slate-100 border border-slate-200 px-3 py-2 rounded-lg text-sm text-slate-600 hover:bg-slate-200 flex items-center">
                            <Camera className="w-4 h-4 mr-2" /> Foto hochladen
                            <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                        </label>
                        <span className="text-xs text-slate-400">{newDiaryEntry.images?.length || 0} Bilder ausgewählt</span>
                    </div>
                 </div>

                 <div className="flex justify-end pt-4 border-t">
                     <button onClick={handleAddDiaryEntry} className="bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">Eintrag Speichern</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* PRINT PREVIEW MODAL */}
      {isPrintPreviewOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
              <div className="relative w-full max-w-[210mm] bg-white shadow-2xl min-h-[297mm] flex flex-col p-12 text-slate-900 font-sans print:shadow-none">
                  <button onClick={() => setIsPrintPreviewOpen(false)} className="absolute top-4 right-4 bg-slate-900 text-white p-2 rounded-full hover:bg-slate-700 print:hidden shadow-lg">
                      <X className="w-6 h-6" />
                  </button>

                  <div className="border-b-2 border-slate-800 pb-4 mb-8 flex justify-between items-end">
                      <div>
                          <h1 className="text-3xl font-bold uppercase tracking-wider">Bautagebuch</h1>
                          <p className="text-lg font-medium mt-2">{project.name}</p>
                          <p className="text-sm text-slate-500">{project.address}</p>
                      </div>
                      <div className="text-right text-sm">
                          <p>Projekt-ID: {project.id}</p>
                          <p>Leiter: {project.manager}</p>
                          <p>Druckdatum: {new Date().toLocaleDateString()}</p>
                      </div>
                  </div>

                  <div className="space-y-8">
                      {(!project.diaryEntries || project.diaryEntries.length === 0) ? (
                          <p className="text-center text-slate-400 italic">Keine Einträge vorhanden.</p>
                      ) : (
                          project.diaryEntries.map(entry => (
                              <div key={entry.id} className="border border-slate-200 rounded p-4 break-inside-avoid">
                                  <div className="flex justify-between items-center mb-2 bg-slate-50 p-2 rounded border-b border-slate-100">
                                      <span className="font-bold">{entry.date}</span>
                                      <div className="text-sm space-x-4">
                                          <span>{entry.weather} / {entry.temperature}</span>
                                          <span>Personal: {entry.staffCount}</span>
                                      </div>
                                  </div>
                                  <p className="text-sm whitespace-pre-wrap mb-4 font-serif leading-relaxed">{entry.content}</p>
                                  {entry.images && entry.images.length > 0 && (
                                      <div className="grid grid-cols-4 gap-2 mt-2">
                                          {entry.images.map((img, i) => (
                                              <img key={i} src={img} className="w-full h-24 object-cover border border-slate-300 rounded" alt="Doku" />
                                          ))}
                                      </div>
                                  )}
                              </div>
                          ))
                      )}
                  </div>

                  <div className="mt-auto pt-8 border-t border-slate-200 text-center text-xs text-slate-400">
                      <p>Dokument maschinell erstellt. NexGen ERP.</p>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
}

const Projects: React.FC<ProjectsProps> = ({ invoices, projects, onAddProject, onUpdateProject, tasks, onAddTask, onToggleTask, companySettings }) => {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  
  // Form State for New Project
  const [newProj, setNewProj] = useState<Partial<Project>>({ status: Status.ACTIVE, budgetUsed: 0 });

  const handleCreate = () => {
      if (!newProj.name || !newProj.budgetTotal || !newProj.costCenterCode) return alert("Bitte Name, Budget und KSt-Nummer angeben.");
      
      // Enforce KST- Prefix for Projects too
      let formattedCode = newProj.costCenterCode.trim().toUpperCase();
      if (!formattedCode.startsWith('KST-')) {
          formattedCode = `KST-${formattedCode}`;
      }

      onAddProject({
          id: `p-${Date.now()}`,
          costCenterCode: formattedCode,
          name: newProj.name,
          address: newProj.address || '',
          budgetTotal: Number(newProj.budgetTotal),
          budgetUsed: 0,
          status: Status.ACTIVE,
          manager: newProj.manager || 'Admin',
          thumbnail: `https://picsum.photos/200/200?random=${Date.now()}`,
          startDate: new Date().toISOString().split('T')[0],
          diaryEntries: []
      });
      setIsCreateModalOpen(false);
      setNewProj({ status: Status.ACTIVE, budgetUsed: 0 });
  };

  if (selectedProject) {
    const projInvoices = invoices.filter(i => i.projectId === selectedProject.id);
    const projTasks = tasks.filter(t => t.relatedEntityId === selectedProject.id);
    
    // We pass the latest version of the project from the props list to ensure updates are reflected
    const liveProject = projects.find(p => p.id === selectedProject.id) || selectedProject;

    return (
        <ProjectDetail 
            project={liveProject} 
            projectInvoices={projInvoices} 
            projectTasks={projTasks}
            onBack={() => setSelectedProject(null)} 
            onAddTask={onAddTask}
            onToggleTask={onToggleTask}
            onUpdateProject={onUpdateProject}
            companySettings={companySettings}
        />
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Projekte & Bauakte</h1>
        <button onClick={() => setIsCreateModalOpen(true)} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 shadow-sm flex items-center">
          <Plus className="w-4 h-4 mr-2" /> Neues Projekt
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {projects.map(project => (
           <div key={project.id} onClick={() => setSelectedProject(project)} className="bg-white group rounded-xl shadow-sm border border-slate-200 overflow-hidden cursor-pointer hover:shadow-md transition-all">
              <div className="h-32 w-full bg-slate-100 relative overflow-hidden">
                 <img src={project.thumbnail} alt={project.name} className="w-full h-full object-cover opacity-90 group-hover:scale-105 transition-transform duration-500" />
                 <div className="absolute top-3 right-3">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold bg-white/90 backdrop-blur-sm shadow-sm ${project.status === 'Warnung' ? 'text-orange-600' : 'text-green-600'}`}>
                      {project.status}
                    </span>
                 </div>
                 <div className="absolute bottom-3 left-3">
                    <span className="px-2 py-1 rounded-md text-xs font-bold bg-slate-900/80 text-white backdrop-blur-sm shadow-sm font-mono flex items-center">
                      <Tag className="w-3 h-3 mr-1" /> {project.costCenterCode}
                    </span>
                 </div>
              </div>
              <div className="p-5">
                 <h3 className="text-lg font-bold text-slate-900 mb-1">{project.name}</h3>
                 <p className="text-sm text-slate-500 mb-4 flex items-center">
                   <MapPin className="w-3 h-3 mr-1" /> {project.address}
                 </p>
                 
                 <div className="mb-4">
                    <div className="flex justify-between text-xs font-medium mb-1">
                       <span className="text-slate-600">Budget verbraucht</span>
                       <span className={project.budgetUsed/project.budgetTotal > 0.9 ? 'text-red-600' : 'text-slate-900'}>
                         {Math.round((project.budgetUsed/project.budgetTotal)*100)}%
                       </span>
                    </div>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                       <div className={`h-full rounded-full ${project.budgetUsed/project.budgetTotal > 0.9 ? 'bg-red-500' : 'bg-brand-500'}`} style={{ width: `${Math.min((project.budgetUsed/project.budgetTotal)*100, 100)}%`}}></div>
                    </div>
                 </div>

                 <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-100">
                    <div className="flex items-center text-xs text-slate-500">
                      <Briefcase className="w-3 h-3 mr-1" /> {project.manager}
                    </div>
                    <span className="text-brand-600 text-sm font-medium flex items-center group-hover:translate-x-1 transition-transform">
                      Öffnen <ArrowRight className="w-3 h-3 ml-1" />
                    </span>
                 </div>
              </div>
           </div>
        ))}
      </div>

      {/* Create Project Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
              <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800">Neues Projekt anlegen</h3>
                 <button onClick={() => setIsCreateModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
              </div>
              <div className="p-6 space-y-4">
                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Projektname *</label>
                    <input type="text" className="w-full rounded-lg border-slate-300" placeholder="z.B. Neubau City" value={newProj.name || ''} onChange={e => setNewProj({...newProj, name: e.target.value})} />
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Kostenstellen-Nr. (KSt) *</label>
                    <div className="relative">
                        <input type="text" className="w-full rounded-lg border-slate-300 pl-3" placeholder="KST-P-101" value={newProj.costCenterCode || ''} onChange={e => setNewProj({...newProj, costCenterCode: e.target.value})} />
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1">Prefix 'KST-' wird automatisch ergänzt</p>
                 </div>
                 <div>
                    <label className="block text-xs font-medium text-slate-500 mb-1">Adresse</label>
                    <input type="text" className="w-full rounded-lg border-slate-300" placeholder="Straße, PLZ, Ort" value={newProj.address || ''} onChange={e => setNewProj({...newProj, address: e.target.value})} />
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Budget Gesamt (€) *</label>
                        <input type="number" className="w-full rounded-lg border-slate-300" placeholder="0.00" value={newProj.budgetTotal || ''} onChange={e => setNewProj({...newProj, budgetTotal: parseFloat(e.target.value)})} />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-slate-500 mb-1">Projektleiter</label>
                        <input type="text" className="w-full rounded-lg border-slate-300" placeholder="Name" value={newProj.manager || ''} onChange={e => setNewProj({...newProj, manager: e.target.value})} />
                    </div>
                 </div>
                 <button onClick={handleCreate} className="w-full bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700 mt-2">Projekt erstellen</button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default Projects;
