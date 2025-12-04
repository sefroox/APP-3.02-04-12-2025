import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import Invoices from './components/Invoices';
import OutgoingInvoices from './components/OutgoingInvoices';
import Accounting from './components/Accounting';
import Projects from './components/Projects';
import Tasks from './components/Tasks';
import Contacts from './components/Contacts';
import Loans from './components/Loans';
import Banking from './components/Banking';
import System from './components/System';
import AIInbox from './components/AIInbox';
import Login from './components/Login';
import WhatsAppWidget from './components/WhatsAppWidget';
import { 
  MOCK_INVOICES, MOCK_PROJECTS, MOCK_COST_CENTERS, MOCK_TASKS, 
  MOCK_CONTACTS, MOCK_LOANS, MOCK_BANK_ACCOUNTS, MOCK_TRANSACTIONS, 
  INITIAL_CATEGORIES, INITIAL_COMPANY_SETTINGS, MOCK_USERS 
} from './constants';
import { 
  Invoice, Project, CostCenter, Task, Contact, Loan, BankAccount, 
  BankTransaction, CompanySettings, User, InvoiceStatus, UserRole, 
  ApprovalData, Company, AgentMessage 
} from './types';
import { processNaturalLanguageCommand } from './services/geminiService';
import { loadDataFromServer, saveDataToServer, checkBackendStatus } from './services/apiService';

const App: React.FC = () => {
  // Auth State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  
  // Navigation State
  const [activePage, setActivePage] = useState('dashboard');

  // Data State
  const [invoices, setInvoices] = useState<Invoice[]>(MOCK_INVOICES);
  const [projects, setProjects] = useState<Project[]>(MOCK_PROJECTS);
  const [costCenters, setCostCenters] = useState<CostCenter[]>(MOCK_COST_CENTERS);
  const [categories, setCategories] = useState<string[]>(INITIAL_CATEGORIES);
  const [tasks, setTasks] = useState<Task[]>(MOCK_TASKS);
  const [contacts, setContacts] = useState<Contact[]>(MOCK_CONTACTS);
  const [loans, setLoans] = useState<Loan[]>(MOCK_LOANS);
  const [accounts, setAccounts] = useState<BankAccount[]>(MOCK_BANK_ACCOUNTS);
  const [transactions, setTransactions] = useState<BankTransaction[]>(MOCK_TRANSACTIONS);
  const [companySettings, setCompanySettings] = useState<CompanySettings>(INITIAL_COMPANY_SETTINGS);
  const [users, setUsers] = useState<User[]>(MOCK_USERS);
  
  // Multi-tenancy (Mock)
  const [companies, setCompanies] = useState<Company[]>([{ id: '1', name: 'NexGen Bau', dbPrefix: 'nexgen', created: '2024-01-01' }]);
  const [currentCompany, setCurrentCompany] = useState<Company>(companies[0]);

  // Chat State
  const [chatMessages, setChatMessages] = useState<AgentMessage[]>([{ id: '1', sender: 'agent', text: 'Hallo! Wie kann ich helfen?', timestamp: new Date() }]);
  const [isTyping, setIsTyping] = useState(false);

  // Persistence State
  const [isDataLoaded, setIsDataLoaded] = useState(false);
  const isFirstRun = useRef(true);

  // --- INITIAL LOAD FROM SERVER ---
  useEffect(() => {
      const initLoad = async () => {
          const isConnected = await checkBackendStatus();
          if (isConnected) {
              const serverData = await loadDataFromServer();
              if (serverData) {
                  // Merge or overwrite with server data
                  if (serverData.invoices) setInvoices(serverData.invoices);
                  if (serverData.projects) setProjects(serverData.projects);
                  if (serverData.costCenters) setCostCenters(serverData.costCenters);
                  if (serverData.categories) setCategories(serverData.categories);
                  if (serverData.tasks) setTasks(serverData.tasks);
                  if (serverData.contacts) setContacts(serverData.contacts);
                  if (serverData.loans) setLoans(serverData.loans);
                  if (serverData.accounts) setAccounts(serverData.accounts);
                  if (serverData.transactions) setTransactions(serverData.transactions);
                  if (serverData.companySettings) setCompanySettings(serverData.companySettings);
                  if (serverData.users) setUsers(serverData.users);
              }
          }
          setIsDataLoaded(true);
      };
      initLoad();
  }, []);

  // --- AUTO SAVE TO SERVER ---
  useEffect(() => {
      // Don't save on initial render or before data is loaded
      if (isFirstRun.current || !isDataLoaded) {
          isFirstRun.current = false;
          return;
      }

      const saveData = setTimeout(() => {
          const fullState = {
              invoices, projects, costCenters, categories, tasks, contacts, 
              loans, accounts, transactions, companySettings, users
          };
          saveDataToServer(fullState);
      }, 2000); // Debounce 2s

      return () => clearTimeout(saveData);
  }, [invoices, projects, costCenters, categories, tasks, contacts, loans, accounts, transactions, companySettings, users, isDataLoaded]);


  // --- Handlers ---

  const handleLogin = (user: User) => {
      setCurrentUser(user);
      setActivePage('dashboard');
  };

  const handleLogout = () => {
      setCurrentUser(null);
  };

  // Invoices
  const addInvoice = (inv: Invoice) => setInvoices([inv, ...invoices]);
  const updateInvoice = (inv: Invoice) => setInvoices(invoices.map(i => i.id === inv.id ? inv : i));
  const deleteInvoice = (id: string) => setInvoices(invoices.filter(i => i.id !== id));
  const updateInvoiceStatus = (id: string, status: InvoiceStatus) => {
      setInvoices(invoices.map(i => i.id === id ? { ...i, status } : i));
  };
  const handleApproveInvoice = (id: string, approvalData: ApprovalData) => {
      setInvoices(invoices.map(i => i.id === id ? { ...i, status: InvoiceStatus.APPROVED, approvalData } : i));
  };
  const updateInvoicePayment = (id: string, date: string, amount: number) => {
      const inv = invoices.find(i => i.id === id);
      if (inv) {
          const newPaid = (inv.paidAmount || 0) + amount;
          const status = newPaid >= inv.amount ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
          setInvoices(invoices.map(i => i.id === id ? { ...i, paidAmount: newPaid, paidDate: date, status } : i));
      }
  };
  const handleAddInvoiceComment = (id: string, text: string) => {
      const inv = invoices.find(i => i.id === id);
      if(inv) {
          const newComment = { id: `c-${Date.now()}`, text, author: currentUser?.name || 'User', date: new Date().toISOString().split('T')[0] };
          setInvoices(invoices.map(i => i.id === id ? { ...i, comments: [...(inv.comments||[]), newComment] } : i));
      }
  };

  // Cost Centers
  const handleAddCostCenter = (cc: CostCenter) => setCostCenters([...costCenters, cc]);
  const handleDeleteCostCenter = (id: string) => setCostCenters(costCenters.filter(c => c.id !== id));
  const handleApproveCostCenter = (id: string) => { console.log("Approved CC", id); }; 

  // Projects
  const handleAddProject = (p: Project) => setProjects([...projects, p]);
  const handleUpdateProject = (p: Project) => setProjects(projects.map(prj => prj.id === p.id ? p : prj));

  // Tasks
  const handleAddTask = (t: Task) => setTasks([...tasks, t]);
  const handleToggleTask = (id: string) => setTasks(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t));

  // Contacts
  const handleAddContact = (c: Contact) => setContacts([...contacts, c]);
  const handleUpdateContact = (c: Contact) => setContacts(contacts.map(con => con.id === c.id ? c : con));
  const handleDeleteContact = (id: string) => setContacts(contacts.filter(c => c.id !== id));

  // Loans
  const handleAddLoan = (l: Loan) => setLoans([...loans, l]);
  const handleUpdateLoan = (l: Loan) => setLoans(loans.map(loan => loan.id === l.id ? l : loan));

  // Banking
  const handlePayInvoice = (ids: string[], accId: string) => {
     const acc = accounts.find(a => a.id === accId);
     if (!acc) return;
     
     let totalPaid = 0;
     const newTxs: BankTransaction[] = [];
     
     const updatedInvoices = invoices.map(inv => {
         if (ids.includes(inv.id)) {
             const amountToPay = inv.amount - (inv.paidAmount || 0);
             totalPaid += amountToPay;
             newTxs.push({
                 id: `tx-${Date.now()}-${inv.id}`,
                 accountId: accId,
                 date: new Date().toISOString().split('T')[0],
                 amount: -amountToPay,
                 description: `Zahlung Rechnung ${inv.number}`,
                 counterparty: inv.supplier || '',
                 status: 'Booked',
                 relatedInvoiceId: inv.id
             });
             return { ...inv, status: InvoiceStatus.PAID, paidAmount: inv.amount, paidDate: new Date().toISOString().split('T')[0] };
         }
         return inv;
     });
     
     setInvoices(updatedInvoices);
     setTransactions([...transactions, ...newTxs]);
     setAccounts(accounts.map(a => a.id === accId ? { ...a, balance: a.balance - totalPaid } : a));
  };
  
  const handleImportTransactions = (txs: BankTransaction[]) => {
      setTransactions([...transactions, ...txs]);
  };

  // System
  const handleAddUser = (u: User) => setUsers([...users, u]);
  const handleEditUser = (u: User) => setUsers(users.map(user => user.id === u.id ? u : user));
  const handleDeleteUser = (id: string) => setUsers(users.filter(u => u.id !== id));
  const handleUpdateUserRole = (id: string, role: UserRole) => setUsers(users.map(u => u.id === id ? { ...u, role } : u));
  const handleUpdateSettings = (s: CompanySettings) => setCompanySettings(s);
  const handleFactoryReset = () => {
      if(window.confirm("Alles zurücksetzen? ACHTUNG: Löscht lokale Daten.")) {
          setInvoices(MOCK_INVOICES);
          setProjects(MOCK_PROJECTS);
          // Also clear backend if needed via apiService but let's keep it safe here
          alert("Reset auf Standardwerte durchgeführt.");
      }
  };

  // Chat / AI
  const handleChatMessage = async (text: string) => {
      const userMsg: AgentMessage = { id: `m-${Date.now()}`, sender: 'user', text, timestamp: new Date() };
      setChatMessages(prev => [...prev, userMsg]);
      setIsTyping(true);

      try {
          const intent = await processNaturalLanguageCommand(companySettings, [...chatMessages, userMsg]);
          
          let responseText = "Das habe ich nicht verstanden.";
          
          switch(intent.type) {
              case 'CHAT': responseText = (intent.data as any).message; break;
              case 'CREATE_INVOICE_INCOMING': 
                  responseText = "Ich habe einen Entwurf für die Eingangsrechnung erstellt."; 
                  break;
              default: responseText = "Befehl erkannt: " + intent.type;
          }

          const agentMsg: AgentMessage = { id: `m-${Date.now()+1}`, sender: 'agent', text: responseText, timestamp: new Date() };
          setChatMessages(prev => [...prev, agentMsg]);
      } catch (e) {
          const errorMsg: AgentMessage = { id: `m-${Date.now()+1}`, sender: 'agent', text: "Fehler bei der KI Verarbeitung.", timestamp: new Date() };
          setChatMessages(prev => [...prev, errorMsg]);
      } finally {
          setIsTyping(false);
      }
  };

  if (!currentUser) {
      return (
          <Login 
            users={users} 
            onLogin={handleLogin} 
            companyName={companySettings.name} 
            logoUrl={companySettings.logoUrl} 
          />
      );
  }

  return (
    <Layout 
        activePage={activePage} 
        onNavigate={setActivePage} 
        invoices={invoices} 
        userRole={currentUser.role} 
        onLogout={handleLogout} 
        currentUser={currentUser}
        companySettings={companySettings}
        companies={companies}
        currentCompany={currentCompany}
        onChangeCompany={(id) => { const c = companies.find(comp => comp.id === id); if(c) setCurrentCompany(c); }}
        onCreateCompany={(name) => setCompanies([...companies, { id: `c-${Date.now()}`, name, dbPrefix: name.toLowerCase().replace(/\s/g, ''), created: new Date().toISOString().split('T')[0] }])}
    >
      {activePage === 'dashboard' && <Dashboard invoices={invoices} projects={projects} />}
      
      {activePage === 'invoices' && (
          <Invoices 
              invoices={invoices.filter(i => i.type === 'incoming')} 
              onAddInvoice={addInvoice} 
              onDeleteInvoice={deleteInvoice} 
              onUpdateStatus={updateInvoiceStatus} 
              onApproveInvoice={handleApproveInvoice} 
              onUpdatePayment={updateInvoicePayment} 
              onUpdateInvoice={updateInvoice} 
              onAddComment={handleAddInvoiceComment} 
              costCenters={costCenters} 
              categories={categories} 
              projects={projects} 
              contacts={contacts} 
              userRole={currentUser.role} 
              currentUser={currentUser} 
              companySettings={companySettings} 
          />
      )}
      
      {activePage === 'outgoing' && (
          <OutgoingInvoices 
              invoices={invoices.filter(i => i.type === 'outgoing')} 
              projects={projects} 
              contacts={contacts} 
              onAddInvoice={addInvoice} 
              onUpdateInvoice={updateInvoice} 
              onDeleteInvoice={deleteInvoice} 
              companySettings={companySettings} 
          />
      )}
      
      {activePage === 'accounting' && (
          <Accounting 
              invoices={invoices} 
              costCenters={costCenters} 
              projects={projects} 
              onAddCostCenter={handleAddCostCenter} 
              onDeleteCostCenter={handleDeleteCostCenter} 
              onApproveCostCenter={handleApproveCostCenter} 
              categories={categories} 
              onAddCategory={(c) => setCategories([...categories, c])} 
              currentUser={currentUser} 
          />
      )}

      {activePage === 'projects' && (
          <Projects 
              invoices={invoices} 
              projects={projects} 
              onAddProject={handleAddProject} 
              onUpdateProject={handleUpdateProject}
              tasks={tasks}
              onAddTask={handleAddTask}
              onToggleTask={handleToggleTask}
              companySettings={companySettings}
          />
      )}

      {activePage === 'tasks' && (
          <Tasks 
              tasks={tasks} 
              onAddTask={handleAddTask} 
              onToggleTask={handleToggleTask} 
          />
      )}

      {activePage === 'contacts' && (
          <Contacts 
              contacts={contacts} 
              onAddContact={handleAddContact} 
              onUpdateContact={handleUpdateContact} 
              onDeleteContact={handleDeleteContact} 
          />
      )}

      {activePage === 'loans' && (
          <Loans 
              loans={loans} 
              contacts={contacts}
              companySettings={companySettings}
              onAddLoan={handleAddLoan} 
              onUpdateLoan={handleUpdateLoan} 
          />
      )}

      {activePage === 'banking' && (
          <Banking 
              accounts={accounts} 
              transactions={transactions} 
              invoices={invoices} 
              onPayInvoice={handlePayInvoice} 
              onImportTransactions={handleImportTransactions} 
          />
      )}

      {activePage === 'inbox' && (
          <AIInbox 
              onInvoiceCreated={addInvoice} 
              companySettings={companySettings} 
          />
      )}

      {activePage === 'system' && (
          <System 
              users={users}
              onAddUser={handleAddUser}
              onEditUser={handleEditUser}
              onDeleteUser={handleDeleteUser}
              onUpdateUserRole={handleUpdateUserRole}
              userRole={currentUser.role}
              companySettings={companySettings}
              onUpdateCompanySettings={handleUpdateSettings}
              onFactoryReset={handleFactoryReset}
          />
      )}

      <WhatsAppWidget 
          messages={chatMessages} 
          onSendMessage={handleChatMessage} 
          isTyping={isTyping} 
          isConnected={companySettings.whatsappConnected}
      />
    </Layout>
  );
};

export default App;
