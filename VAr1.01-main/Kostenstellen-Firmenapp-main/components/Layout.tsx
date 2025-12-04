
import React, { useState, useEffect } from 'react';
import { NAV_ITEMS, MOCK_PROJECTS } from '../constants';
import { Invoice, UserRole, User, CompanySettings, Company } from '../types';
import { Search, Bell, Menu, X, Command, UserCircle, ChevronDown, ChevronUp, LogOut, Building2, Plus, Check } from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activePage: string;
  onNavigate: (page: string) => void;
  invoices: Invoice[];
  userRole?: UserRole;
  onLogout?: () => void;
  currentUser?: User | null;
  companySettings?: CompanySettings;
  // Multi-tenancy props
  companies?: Company[];
  currentCompany?: Company;
  onChangeCompany?: (id: string) => void;
  onCreateCompany?: (name: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ 
    children, activePage, onNavigate, invoices, userRole = 'admin', onLogout, currentUser, companySettings,
    companies = [], currentCompany, onChangeCompany, onCreateCompany
}) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const [isCompanyMenuOpen, setIsCompanyMenuOpen] = useState(false);
  
  // New Company Modal State
  const [isNewCompanyModalOpen, setIsNewCompanyModalOpen] = useState(false);
  const [newCompanyName, setNewCompanyName] = useState('');

  useEffect(() => {
    if (searchQuery.length > 1) {
      const lowerQ = searchQuery.toLowerCase();
      const invs = invoices.filter(i => i.number.toLowerCase().includes(lowerQ) || i.supplier?.toLowerCase().includes(lowerQ)).map(i => ({ ...i, type: 'Rechnung' }));
      const projs = MOCK_PROJECTS.filter(p => p.name.toLowerCase().includes(lowerQ)).map(p => ({ ...p, type: 'Projekt' }));
      setSearchResults([...invs, ...projs]);
    } else {
      setSearchResults([]);
    }
  }, [searchQuery, invoices]);

  const handleCreateCompanySubmit = () => {
      if (!newCompanyName.trim()) return;
      if (onCreateCompany) onCreateCompany(newCompanyName);
      setIsNewCompanyModalOpen(false);
      setNewCompanyName('');
      setIsCompanyMenuOpen(false);
  };

  // --- PERMISSION FILTER ---
  // Zeigt nur Module an, die dem User zugewiesen sind
  const visibleNavItems = NAV_ITEMS.filter(item => {
      if (userRole === 'admin') return true;
      // Fallback für User ohne explizite Rechte (Legacy) -> Alle anzeigen, oder sicherheitshalber Dashboard
      if (!currentUser?.allowedModules || currentUser.allowedModules.length === 0) {
          return true; 
      }
      return currentUser.allowedModules.includes(item.id);
  });

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 md:hidden" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      <aside className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 transform transition-transform duration-200 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 flex flex-col`}>
        <div className="p-6 border-b border-slate-100 flex items-center justify-between h-20">
          {companySettings?.logoUrl ? (
              <img 
                src={companySettings.logoUrl} 
                alt="Logo" 
                className="h-10 w-auto max-w-[180px] object-contain" 
                title={companySettings.name}
              />
          ) : (
              <div className="flex items-center space-x-2 overflow-hidden">
                <div className="w-8 h-8 bg-brand-600 rounded-lg flex items-center justify-center text-white font-bold shadow-brand flex-shrink-0">
                    {companySettings?.name ? companySettings.name.substring(0,1).toUpperCase() : 'N'}
                </div>
                <span className="text-lg font-bold text-slate-900 tracking-tight truncate" title={companySettings?.name}>
                    {companySettings?.name || 'NexGen ERP'}
                </span>
              </div>
          )}
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden text-slate-500"><X size={20} /></button>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => (
            <button
              key={item.id}
              onClick={() => { onNavigate(item.id); setIsSidebarOpen(false); }}
              className={`w-full flex items-center px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${activePage === item.id ? 'bg-brand-50 text-brand-700 shadow-sm' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'}`}
            >
              <item.icon size={18} className={`mr-3 ${activePage === item.id ? 'text-brand-600' : 'text-slate-400'}`} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-100">
          <div 
            className={`flex items-center p-2 rounded-lg border transition-all cursor-pointer select-none relative ${isUserMenuOpen ? 'bg-slate-100 border-slate-300' : 'bg-slate-50 border-slate-100 hover:bg-slate-100'}`}
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
          >
            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-500"><UserCircle /></div>
            <div className="ml-3 overflow-hidden flex-1">
              <p className="text-sm font-medium text-slate-900 truncate">{currentUser?.name || 'User'}</p>
              <p className="text-xs text-slate-500 truncate capitalize">{userRole === 'admin' ? 'Administrator' : 'Mitarbeiter'}</p>
            </div>
            {isUserMenuOpen && (
              <div className="absolute bottom-full left-0 w-full mb-2 bg-white border border-slate-200 rounded-lg shadow-xl p-2 z-50 animate-fade-in" onClick={(e) => e.stopPropagation()}>
                 <button onClick={(e) => { e.stopPropagation(); onLogout && onLogout(); }} className="w-full text-left px-2 py-2 text-sm rounded flex items-center text-red-600 hover:bg-red-50 transition-colors"><LogOut className="w-4 h-4 mr-2" /> Abmelden</button>
              </div>
            )}
            {isUserMenuOpen ? <ChevronUp size={14} className="text-slate-500 ml-1" /> : <ChevronDown size={14} className="text-slate-400 ml-1" />}
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 z-30">
          <div className="flex items-center flex-1">
              <button onClick={() => setIsSidebarOpen(true)} className="md:hidden text-slate-500 mr-4"><Menu size={24} /></button>
              
              {/* COMPANY SELECTOR */}
              <div className="relative mr-8">
                  <button 
                    onClick={() => setIsCompanyMenuOpen(!isCompanyMenuOpen)}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg transition-colors text-slate-700"
                  >
                      <Building2 className="w-4 h-4 text-slate-500" />
                      <span className="font-bold text-sm">{currentCompany?.name || 'Firma wählen'}</span>
                      <ChevronDown className="w-3 h-3 text-slate-400" />
                  </button>
                  
                  {isCompanyMenuOpen && (
                      <div className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-200 z-50 overflow-hidden animate-slide-up">
                          <div className="p-3 border-b border-slate-100 bg-slate-50">
                              <p className="text-xs font-bold text-slate-500 uppercase">Mandant wechseln</p>
                          </div>
                          <div className="max-h-64 overflow-y-auto">
                              {companies.map(comp => (
                                  <button 
                                    key={comp.id}
                                    onClick={() => { if(onChangeCompany) onChangeCompany(comp.id); setIsCompanyMenuOpen(false); }}
                                    className="w-full text-left px-4 py-3 hover:bg-slate-50 flex items-center justify-between border-b border-slate-50 last:border-0 transition-colors"
                                  >
                                      <span className={`text-sm font-medium ${currentCompany?.id === comp.id ? 'text-brand-600' : 'text-slate-700'}`}>
                                          {comp.name}
                                      </span>
                                      {currentCompany?.id === comp.id && <Check className="w-4 h-4 text-brand-600" />}
                                  </button>
                              ))}
                          </div>
                          {userRole === 'admin' && (
                              <div className="p-2 border-t border-slate-100 bg-slate-50">
                                  <button 
                                    onClick={() => { setIsNewCompanyModalOpen(true); setIsCompanyMenuOpen(false); }}
                                    className="w-full flex items-center justify-center px-4 py-2 bg-slate-900 text-white text-xs font-bold rounded-lg hover:bg-slate-800 transition-colors"
                                  >
                                      <Plus className="w-3 h-3 mr-1" /> Neue Firma anlegen
                                  </button>
                              </div>
                          )}
                      </div>
                  )}
              </div>

              <div className="relative hidden md:block w-96">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search className="h-4 w-4 text-slate-400" /></div>
                <input
                  type="text"
                  className="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-slate-50 text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:ring-1 focus:ring-brand-500 focus:border-brand-500 sm:text-sm transition-all"
                  placeholder="Globalsuche (Rechnung, Projekt, Name...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchResults.length > 0 && (
                   <div className="absolute top-full left-0 w-full mt-2 bg-white rounded-lg shadow-xl border border-slate-200 overflow-hidden z-50">
                     {searchResults.map((res, idx) => (
                       <div key={idx} className="px-4 py-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0">
                          <div className="flex justify-between"><span className="font-medium text-slate-800">{res.name || res.number}</span><span className="text-xs text-slate-400 border border-slate-200 px-1.5 rounded">{res.type}</span></div>
                       </div>
                     ))}
                   </div>
                )}
              </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className={`px-3 py-1 rounded-full text-xs font-bold border transition-colors ${userRole === 'admin' ? 'bg-purple-100 text-purple-700 border-purple-200' : 'bg-blue-100 text-blue-700 border-blue-200'}`}>{userRole === 'admin' ? 'Administrator' : 'Mitarbeiter'}</div>
            <button className="relative p-2 text-slate-400 hover:text-slate-600 transition-colors"><Bell size={20} /><span className="absolute top-1.5 right-1.5 block h-2 w-2 rounded-full bg-red-500 ring-2 ring-white"></span></button>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 md:p-8 relative">{children}</main>
      </div>

      {/* NEW COMPANY MODAL */}
      {isNewCompanyModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800">Neuen Mandanten anlegen</h3>
                      <button onClick={() => setIsNewCompanyModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
                  </div>
                  <div className="p-6">
                      <div className="mb-4">
                          <label className="block text-xs font-medium text-slate-500 mb-1">Firmenname</label>
                          <input 
                            type="text" 
                            autoFocus
                            className="w-full rounded-lg border-slate-300" 
                            placeholder="z.B. Tochterfirma GmbH"
                            value={newCompanyName}
                            onChange={(e) => setNewCompanyName(e.target.value)}
                          />
                          <p className="text-[10px] text-slate-400 mt-2">
                              Es wird ein komplett isolierter Arbeitsbereich für diese Firma erstellt.
                          </p>
                      </div>
                      <div className="flex justify-end space-x-2">
                          <button onClick={() => setIsNewCompanyModalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-slate-100 rounded-lg text-sm">Abbrechen</button>
                          <button onClick={handleCreateCompanySubmit} className="px-4 py-2 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700">Erstellen</button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default Layout;
