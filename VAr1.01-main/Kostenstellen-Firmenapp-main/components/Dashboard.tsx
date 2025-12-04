import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MOCK_NOTIFICATIONS, MOCK_TASKS } from '../constants';
import { AlertTriangle, TrendingUp, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Invoice, Project } from '../types';

interface DashboardProps {
  invoices: Invoice[];
  projects: Project[];
}

const data = [
  { name: 'Jan', kosten: 4000 },
  { name: 'Feb', kosten: 3000 },
  { name: 'Mär', kosten: 2000 },
  { name: 'Apr', kosten: 2780 },
  { name: 'Mai', kosten: 1890 },
  { name: 'Jun', kosten: 2390 },
];

const PIE_COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042'];

const Dashboard: React.FC<DashboardProps> = ({ invoices, projects }) => {
  const overdueInvoices = invoices.filter(i => i.status === 'Überfällig').length;
  const openTasks = MOCK_TASKS.filter(t => !t.completed).length;
  const criticalProjects = projects.filter(p => p.budgetUsed / p.budgetTotal > 0.9).length;

  const projectData = projects.map(p => ({ name: p.name.substring(0, 10) + '...', value: p.budgetUsed }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Dashboard & Übersicht</h1>
        <span className="text-sm text-slate-500">Letztes Update: Gerade eben</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-red-100 rounded-full text-red-600">
            <AlertCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Überfällige Rechnungen</p>
            <p className="text-2xl font-bold text-slate-900">{overdueInvoices}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-blue-100 rounded-full text-blue-600">
            <CheckCircle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Offene Aufgaben</p>
            <p className="text-2xl font-bold text-slate-900">{openTasks}</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-orange-100 rounded-full text-orange-600">
            <AlertTriangle size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Kritische Budgets</p>
            <p className="text-2xl font-bold text-slate-900">{criticalProjects}</p>
          </div>
        </div>

         <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4 hover:shadow-md transition-shadow">
          <div className="p-3 bg-green-100 rounded-full text-green-600">
            <TrendingUp size={24} />
          </div>
          <div>
            <p className="text-sm text-slate-500 font-medium">Cashflow Forecast</p>
            <p className="text-2xl font-bold text-slate-900">+12%</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Charts Column */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold mb-4 text-slate-800">Kostenentwicklung (H1 2024)</h3>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} tickFormatter={(value) => `€${value}`} />
                  <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}} />
                  <Bar dataKey="kosten" fill="#0ea5e9" radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold mb-4 text-slate-800">Budgetverteilung</h3>
                 <div className="h-48 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={projectData}
                        cx="50%"
                        cy="50%"
                        innerRadius={40}
                        outerRadius={70}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {projectData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                 </div>
             </div>
             <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
                <h3 className="text-lg font-semibold mb-4 text-slate-800">Meine Aufgaben</h3>
                <div className="space-y-3">
                  {MOCK_TASKS.slice(0,3).map(task => (
                    <div key={task.id} className="flex items-start space-x-3 p-2 hover:bg-slate-50 rounded cursor-pointer">
                      <div className={`w-2 h-2 mt-2 rounded-full flex-shrink-0 ${task.priority === 'High' ? 'bg-red-500' : 'bg-blue-500'}`}></div>
                      <div>
                        <p className="text-sm font-medium text-slate-900">{task.title}</p>
                        <p className="text-xs text-slate-500">Fällig: {task.dueDate}</p>
                      </div>
                    </div>
                  ))}
                </div>
             </div>
          </div>
        </div>

        {/* Sidebar / Notifications Column */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-semibold mb-4 text-slate-800 flex items-center">
              <Clock className="w-5 h-5 mr-2 text-slate-500" />
              Mitteilungen
            </h3>
            <div className="space-y-4">
              {MOCK_NOTIFICATIONS.map(notif => (
                <div key={notif.id} className="border-l-4 border-l-transparent pl-4 py-1 relative overflow-hidden" style={{ borderColor: notif.type === 'warning' ? '#f97316' : notif.type === 'info' ? '#3b82f6' : '#ef4444' }}>
                   <div className="flex justify-between">
                     <h4 className="text-sm font-semibold text-slate-800">{notif.title}</h4>
                     <span className="text-xs text-slate-400">{notif.timestamp}</span>
                   </div>
                   <p className="text-xs text-slate-600 mt-1">{notif.message}</p>
                </div>
              ))}
            </div>
            <button className="w-full mt-6 text-sm text-brand-600 font-medium hover:text-brand-800">Alle anzeigen</button>
          </div>

          <div className="bg-gradient-to-br from-brand-900 to-brand-700 p-6 rounded-xl text-white shadow-lg">
             <h3 className="font-bold text-lg mb-2">KI-Assistent</h3>
             <p className="text-brand-100 text-sm mb-4">
               "Es sind 3 neue Rechnungen im Posteingang. Budget Langobardenstraße nähert sich dem Limit."
             </p>
             <button className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-lg text-sm font-medium backdrop-blur-sm w-full transition-colors border border-white/20">
               Posteingang öffnen
             </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Dashboard;