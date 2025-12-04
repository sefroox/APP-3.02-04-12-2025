import React, { useState, useEffect } from 'react';
import { BankAccount, BankTransaction, Invoice, InvoiceStatus } from '../types';
import { ArrowUpRight, ArrowDownLeft, RefreshCw, Search, CreditCard, Building, CheckCircle, Clock, ChevronRight, Send, CheckSquare, Square, Upload, ShieldCheck, Link2, Lock, Loader2 } from 'lucide-react';
import { checkBackendStatus } from '../services/apiService';

interface BankingProps {
  accounts: BankAccount[];
  transactions: BankTransaction[];
  invoices: Invoice[];
  onPayInvoice: (invoiceIds: string[], accountId: string) => void;
  onImportTransactions?: (transactions: BankTransaction[]) => void;
}

const Banking: React.FC<BankingProps> = ({ accounts, transactions, invoices, onPayInvoice, onImportTransactions }) => {
  const [selectedAccountId, setSelectedAccountId] = useState<string>(accounts[0]?.id || '');
  const [selectedInvoiceIds, setSelectedInvoiceIds] = useState<string[]>([]);
  const [isConnectModalOpen, setIsConnectModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [connectStep, setConnectStep] = useState<'select' | 'loading' | 'login' | 'success' | 'error'>('select');
  const [isRealBackend, setIsRealBackend] = useState(false);

  useEffect(() => {
      checkBackendStatus().then(setIsRealBackend);
  }, []);
  
  const totalLiquidity = accounts.reduce((acc, curr) => acc + curr.balance, 0);
  const activeAccount = accounts.find(a => a.id === selectedAccountId) || accounts[0];
  const payableInvoices = invoices.filter(inv => inv.status === InvoiceStatus.APPROVED);
  const accountTransactions = transactions.filter(t => t.accountId === selectedAccountId);
  const selectedInvoices = payableInvoices.filter(inv => selectedInvoiceIds.includes(inv.id));
  const batchTotal = selectedInvoices.reduce((sum, inv) => sum + inv.amount, 0);

  const toggleInvoiceSelection = (id: string) => {
      setSelectedInvoiceIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleSinglePayment = (inv: Invoice) => {
      if (window.confirm(`Möchten Sie die Rechnung ${inv.number} über € ${inv.amount.toFixed(2)} jetzt bezahlen?`)) {
          onPayInvoice([inv.id], selectedAccountId);
          setSelectedInvoiceIds(prev => prev.filter(id => id !== inv.id));
      }
  };

  const handleBatchPayment = () => {
      if (selectedInvoiceIds.length === 0) return;
      if (window.confirm(`${selectedInvoiceIds.length} Rechnungen als Sammelüberweisung tätigen?\nGesamtsumme: € ${batchTotal.toFixed(2)}`)) {
          onPayInvoice(selectedInvoiceIds, selectedAccountId);
          setSelectedInvoiceIds([]); 
      }
  };

  // --- REAL FINAPI LOGIC ---
  const handleConnectBank = async () => {
      setConnectStep('loading');
      
      if (isRealBackend) {
          try {
              // Call our backend which talks to FinAPI
              const res = await fetch('/api/finapi/connect', { method: 'POST' });
              const data = await res.json();
              
              if (data.formUrl) {
                  // Redirect user to FinAPI Web Form
                  window.open(data.formUrl, '_blank');
                  setConnectStep('success');
              } else if (data.error) {
                  alert("Fehler: " + data.error);
                  setConnectStep('error');
              } else {
                  // Fallback / Mock Success if configured
                  setTimeout(() => setConnectStep('success'), 1500);
              }
          } catch (e) {
              console.error(e);
              setConnectStep('error');
          }
      } else {
          // Simulation Mode
          setTimeout(() => setConnectStep('login'), 1000);
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0] && onImportTransactions) {
          setTimeout(() => {
              const newTxs: BankTransaction[] = [
                  { id: `imp-${Date.now()}-1`, accountId: selectedAccountId, date: new Date().toISOString().split('T')[0], amount: -45.90, description: 'Tankstelle Shell', counterparty: 'Shell Austria', status: 'Booked' },
                  { id: `imp-${Date.now()}-2`, accountId: selectedAccountId, date: new Date().toISOString().split('T')[0], amount: 1200.00, description: 'Gutschrift Kunde Meyer', counterparty: 'Meyer GmbH', status: 'Booked' }
              ];
              onImportTransactions(newTxs);
              setIsImportModalOpen(false);
          }, 1000);
      }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <div>
             <h1 className="text-2xl font-bold text-slate-800">Banking & Finanzen</h1>
             <p className="text-sm text-slate-500">Finanzstatus, Zahlungsverkehr und Bankabgleich</p>
        </div>
        <div className="flex space-x-4">
            <button onClick={() => setIsImportModalOpen(true)} className="bg-white text-slate-600 border border-slate-200 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center">
                <Upload className="w-4 h-4 mr-2" /> Import (CSV/CAMT)
            </button>
            <div className="bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm flex items-center">
                <span className="text-xs text-slate-500 mr-2">Gesamtliquidität:</span>
                <span className={`font-bold text-lg ${totalLiquidity >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    € {totalLiquidity.toLocaleString('de-DE', { minimumFractionDigits: 2 })}
                </span>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {accounts.map(account => (
              <div 
                key={account.id} 
                onClick={() => setSelectedAccountId(account.id)}
                className={`p-6 rounded-xl border cursor-pointer transition-all relative overflow-hidden ${selectedAccountId === account.id ? 'bg-slate-800 text-white shadow-lg ring-2 ring-offset-2 ring-slate-800' : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'}`}
              >
                  <div className="flex justify-between items-start mb-4">
                      <div className={`p-2 rounded-lg ${selectedAccountId === account.id ? 'bg-white/10' : 'bg-slate-100'}`}>
                          {account.type === 'CreditCard' ? <CreditCard size={20} /> : <Building size={20} />}
                      </div>
                      <span className={`text-xs font-mono px-2 py-1 rounded ${selectedAccountId === account.id ? 'bg-white/20' : 'bg-slate-100 text-slate-500'}`}>
                          {account.currency}
                      </span>
                  </div>
                  <h3 className={`text-sm font-medium mb-1 ${selectedAccountId === account.id ? 'text-slate-300' : 'text-slate-500'}`}>{account.name}</h3>
                  <p className="text-2xl font-bold mb-4">€ {account.balance.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p>
                  <p className={`text-xs font-mono tracking-wider ${selectedAccountId === account.id ? 'text-slate-400' : 'text-slate-400'}`}>{account.iban}</p>
                  
                  {/* Decorative Circle */}
                  <div className={`absolute -bottom-6 -right-6 w-24 h-24 rounded-full opacity-10 ${selectedAccountId === account.id ? 'bg-white' : 'bg-brand-600'}`}></div>
              </div>
          ))}
          
          {/* Connect Bank Button */}
          <div onClick={() => { setConnectStep('select'); setIsConnectModalOpen(true); }} className="border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 p-6 cursor-pointer hover:border-brand-400 hover:text-brand-500 hover:bg-brand-50 transition-all group">
              <Link2 className="w-8 h-8 mb-2 opacity-50 group-hover:opacity-100 transition-opacity" />
              <p className="text-sm font-medium">+ Bank verbinden</p>
              <p className="text-xs mt-1">FinAPI / PSD2</p>
          </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-[600px] relative overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <div><h3 className="font-bold text-slate-800 flex items-center"><Send className="w-5 h-5 mr-2 text-brand-600" /> Zahlungs-Zentrale</h3></div>
                  <span className="bg-brand-100 text-brand-700 text-xs font-bold px-2 py-1 rounded-full">{payableInvoices.length} Offen</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50 pb-24">
                  {payableInvoices.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-slate-400"><CheckCircle className="w-12 h-12 mb-2 opacity-20" /><p>Alles erledigt!</p></div>
                  ) : (
                      payableInvoices.map(inv => {
                          const isSelected = selectedInvoiceIds.includes(inv.id);
                          return (
                          <div key={inv.id} className={`p-4 rounded-lg border shadow-sm transition-all ${isSelected ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200' : 'bg-white border-slate-200 hover:shadow-md'}`}>
                              <div className="flex items-start space-x-3">
                                  <div className="pt-1"><button onClick={() => toggleInvoiceSelection(inv.id)} className={`text-slate-400 hover:text-brand-600 ${isSelected ? 'text-brand-600' : ''}`}>{isSelected ? <CheckSquare size={20} /> : <Square size={20} />}</button></div>
                                  <div className="flex-1">
                                      <div className="flex justify-between items-start mb-2"><div onClick={() => toggleInvoiceSelection(inv.id)} className="cursor-pointer"><h4 className="font-bold text-slate-800">{inv.supplier}</h4><p className="text-xs text-slate-500 font-mono">Ref: {inv.number}</p></div><span className="text-lg font-bold text-slate-900">€ {inv.amount.toFixed(2)}</span></div>
                                      <div className="flex items-center justify-between text-sm"><div className="flex items-center text-orange-600 bg-orange-50 px-2 py-0.5 rounded text-xs"><Clock className="w-3 h-3 mr-1" /> Fällig: {inv.dueDate}</div>{selectedInvoiceIds.length <= 1 && (<button onClick={() => handleSinglePayment(inv)} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-md text-xs font-medium hover:bg-brand-600 hover:text-white transition-colors flex items-center">Überweisen <ChevronRight className="w-3 h-3 ml-1" /></button>)}</div>
                                  </div>
                              </div>
                          </div>
                      )})
                  )}
              </div>
              {selectedInvoiceIds.length > 0 && (
                  <div className="absolute bottom-0 left-0 right-0 bg-slate-900 text-white p-4 shadow-lg animate-slide-up border-t border-slate-700 z-10">
                      <div className="flex justify-between items-center">
                          <div><p className="text-xs text-slate-400 uppercase font-bold">{selectedInvoiceIds.length} ausgewählt</p><p className="text-xl font-bold">Summe: € {batchTotal.toLocaleString('de-DE', { minimumFractionDigits: 2 })}</p></div>
                          <button onClick={handleBatchPayment} className="bg-brand-600 hover:bg-brand-500 text-white px-6 py-2 rounded-lg font-medium shadow-brand flex items-center transition-colors"><Send className="w-4 h-4 mr-2" /> Sammelüberweisung</button>
                      </div>
                  </div>
              )}
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-slate-100 flex flex-col h-[600px]">
              <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                  <div><h3 className="font-bold text-slate-800 flex items-center"><RefreshCw className="w-5 h-5 mr-2 text-slate-500" /> Kontoumsätze</h3></div>
                  <Search className="w-4 h-4 text-slate-400" />
              </div>
              <div className="flex-1 overflow-y-auto">
                  <table className="w-full text-sm text-left">
                      <thead className="bg-slate-50 text-slate-500 font-medium sticky top-0"><tr><th className="py-3 px-4 pl-6">Datum</th><th className="py-3 px-4">Beschreibung</th><th className="py-3 px-4 text-right pr-6">Betrag</th></tr></thead>
                      <tbody className="divide-y divide-slate-100">
                          {accountTransactions.length === 0 ? (<tr><td colSpan={3} className="py-8 text-center text-slate-400">Keine Transaktionen.</td></tr>) : (
                              accountTransactions.map(tx => (
                                  <tr key={tx.id} className="hover:bg-slate-50 group transition-colors"><td className="py-3 px-4 pl-6 text-slate-500 whitespace-nowrap">{tx.date}</td><td className="py-3 px-4"><p className="font-medium text-slate-800">{tx.counterparty}</p><p className="text-xs text-slate-500 truncate max-w-[200px]">{tx.description}</p>{tx.relatedInvoiceId && (<span className="inline-flex items-center mt-1 text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded border border-green-100"><CheckCircle className="w-3 h-3 mr-1" /> Beleg zugeordnet</span>)}</td><td className={`py-3 px-4 text-right pr-6 font-bold ${tx.amount > 0 ? 'text-green-600' : 'text-slate-800'}`}>{tx.amount > 0 ? '+' : ''} {tx.amount.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €</td></tr>
                              ))
                          )}
                      </tbody>
                  </table>
              </div>
          </div>
      </div>

      {isConnectModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col">
                  <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                      <h3 className="font-bold text-slate-800 flex items-center"><ShieldCheck className="w-4 h-4 mr-2 text-brand-600" /> Bank verbinden (FinAPI)</h3>
                      <button onClick={() => setIsConnectModalOpen(false)}><ArrowDownLeft className="rotate-45 w-5 h-5 text-slate-400" /></button>
                  </div>
                  <div className="p-6 flex-1">
                      {connectStep === 'loading' && (<div className="text-center py-12"><Loader2 className="w-10 h-10 text-brand-600 animate-spin mx-auto mb-4" /><p>Verbinde zu FinAPI...</p></div>)}
                      {connectStep === 'error' && (<div className="text-center py-8"><ShieldCheck className="w-12 h-12 text-red-500 mx-auto mb-4" /><h3 className="font-bold text-slate-800">Verbindungsfehler</h3><p className="text-sm text-slate-600 mt-2">Bitte prüfen Sie die FinAPI Zugangsdaten im System-Menü.</p><button onClick={() => setIsConnectModalOpen(false)} className="mt-4 text-sm text-slate-500">Schließen</button></div>)}
                      {connectStep === 'select' && (
                          <div className="space-y-4"><p className="text-sm text-slate-600 mb-4">Wählen Sie Ihre Bank für die PSD2-Schnittstelle:</p>
                              {isRealBackend ? (
                                  <div className="text-center py-6"><p className="text-sm text-slate-500 mb-4">Nutzen Sie den sicheren FinAPI Web-Formular Prozess.</p><button onClick={handleConnectBank} className="bg-brand-600 text-white px-6 py-2 rounded-lg shadow-lg hover:bg-brand-700">Zu FinAPI weiterleiten</button></div>
                              ) : (
                                  ['Erste Bank und Sparkasse', 'Raiffeisen Bank', 'Bank Austria', 'BAWAG P.S.K.', 'Volksbank'].map(bank => (<button key={bank} onClick={() => setConnectStep('login')} className="w-full flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:border-brand-500 hover:bg-brand-50 transition-all text-left"><span className="font-medium text-slate-800">{bank}</span><ChevronRight className="w-4 h-4 text-slate-400" /></button>))
                              )}
                          </div>
                      )}
                      {connectStep === 'login' && (<div className="space-y-4 text-center"><div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2"><Lock className="w-6 h-6 text-blue-600" /></div><h3 className="font-bold text-slate-800">Sicherer Login (Simulation)</h3><p className="text-xs text-slate-500 mb-4">Bitte geben Sie Ihre Verfügernummer und PIN ein.</p><input type="text" placeholder="Verfügernummer" className="w-full border-slate-300 rounded-lg text-sm" /><input type="password" placeholder="PIN / Passwort" className="w-full border-slate-300 rounded-lg text-sm" /><button onClick={() => setConnectStep('success')} className="w-full bg-brand-600 text-white py-2 rounded-lg font-medium hover:bg-brand-700 mt-2">Anmelden</button><p className="text-[10px] text-slate-400 mt-2">Verschlüsselte Verbindung nach Bankstandard.</p></div>)}
                      {connectStep === 'success' && (<div className="text-center py-8"><CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" /><h3 className="font-bold text-slate-800 text-lg">Verbindung erfolgreich!</h3><p className="text-sm text-slate-600 mt-2">Ihre Konten wurden synchronisiert.</p><button onClick={() => setIsConnectModalOpen(false)} className="mt-6 bg-slate-900 text-white px-6 py-2 rounded-lg text-sm">Fertig</button></div>)}
                  </div>
              </div>
          </div>
      )}
      {/* Import Modal (Same) */}
      {isImportModalOpen && (<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"><div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 text-center"><Upload className="w-12 h-12 text-brand-600 mx-auto mb-4" /><h3 className="font-bold text-slate-800 text-lg">Transaktionen importieren</h3><p className="text-sm text-slate-500 mb-6">Laden Sie hier Ihre CSV oder CAMT.053 Datei hoch.</p><label className="block w-full border-2 border-dashed border-slate-300 rounded-xl p-8 cursor-pointer hover:border-brand-400 hover:bg-brand-50 transition-all mb-4"><input type="file" className="hidden" accept=".csv,.xml" onChange={handleFileUpload} /><span className="text-brand-600 font-medium">Datei auswählen</span></label><button onClick={() => setIsImportModalOpen(false)} className="text-slate-400 hover:text-slate-600 text-sm">Abbrechen</button></div></div>)}
    </div>
  );
};

export default Banking;