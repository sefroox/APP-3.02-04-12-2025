



import React, { useState, useEffect } from 'react';
import { Loan, LoanScheduleItem, CompanySettings, Contact, LoanTransaction } from '../types';
import { Plus, X, Calculator, Printer, TrendingUp, TrendingDown, Calendar, Percent, Banknote, ChevronDown, CheckCircle, FileText, ToggleLeft, ToggleRight, Info, Hash } from 'lucide-react';
import { generateLoanContractPDF, generateLoanListPDF, generateLoanSchedulePDF } from '../services/pdfService';

interface LoansProps {
    loans: Loan[];
    contacts: Contact[];
    companySettings: CompanySettings;
    onAddLoan: (loan: Loan) => void;
    onUpdateLoan: (loan: Loan) => void;
}

const Loans: React.FC<LoansProps> = ({ loans, contacts, companySettings, onAddLoan, onUpdateLoan }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isCalcOpen, setIsCalcOpen] = useState(false);
    const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
    const [successMsg, setSuccessMsg] = useState<string | null>(null);
    
    // UI Helpers for creation
    const [repaymentMode, setRepaymentMode] = useState<'with_repayment' | 'interest_only'>('with_repayment');

    const [newLoan, setNewLoan] = useState<Partial<Loan>>({ 
        type: 'taken', 
        interestType: 'p.a.', 
        status: 'Active',
        amortizationType: 'annuity',
        paymentFrequency: 1,
        transactions: [],
        autoPayment: true
    });

    const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
    const [calculatedSchedule, setCalculatedSchedule] = useState<LoanScheduleItem[]>([]);
    
    // Print Filter State
    const [printFrom, setPrintFrom] = useState('');
    const [printTo, setPrintTo] = useState('');
    
    const [newPayment, setNewPayment] = useState<{date: string, amount: number}>({
        date: new Date().toISOString().split('T')[0],
        amount: 0
    });

    // Update internal amortizationType based on simplified UI toggle
    useEffect(() => {
        if (repaymentMode === 'interest_only') {
            setNewLoan(prev => ({ ...prev, amortizationType: 'balloon' }));
        } else {
            // Default to annuity when switching back
            if (newLoan.amortizationType === 'balloon') {
                setNewLoan(prev => ({ ...prev, amortizationType: 'annuity' }));
            }
        }
    }, [repaymentMode]);

    // --- ADVANCED CALCULATION LOGIC ---
    const calculateDynamicSchedule = (loan: Partial<Loan>): LoanScheduleItem[] => {
        if (!loan.amount || loan.interestRate === undefined || !loan.startDate || !loan.endDate) return [];
        
        const start = new Date(loan.startDate);
        const end = new Date(loan.endDate);
        const totalMonths = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
        
        if (totalMonths <= 0) return [];

        const freq = loan.paymentFrequency || 1; // 1=Monthly, 3=Quarterly, 12=Yearly
        const periods = Math.ceil(totalMonths / freq);
        
        // --- CALCULATION PREP ---
        let ratePerPeriod = 0;
        let fixedInterestPerPeriod = 0;

        if (loan.interestType === 'fixed') {
             // Pauschalzins: Gesamtbetrag durch Anzahl der Perioden
             fixedInterestPerPeriod = loan.interestRate / periods;
        } else {
             // Prozentual: Rate pro Periode
             ratePerPeriod = (loan.interestRate / 100) * (freq / 12);
        }
        
        let balance = loan.amount;
        
        // Determine standard periodic payment based on ORIGINAL amount
        let standardAnnuity = 0;
        let standardPrincipal = 0;

        if (loan.interestType === 'fixed') {
            // Bei Fixbetrag ist Annuity und Linear rechnerisch ähnlich für die Rate: (Principal + Interest) / Periods
            standardPrincipal = loan.amount / periods;
        } else {
            // Prozentuale Berechnung
            if (loan.amortizationType === 'annuity') {
                 // PMT Formula: P * (r(1+r)^n) / ((1+r)^n - 1)
                 standardAnnuity = (loan.amount * ratePerPeriod) / (1 - Math.pow(1 + ratePerPeriod, -periods));
            } else if (loan.amortizationType === 'linear') {
                 standardPrincipal = loan.amount / periods;
            }
        }

        const schedule: LoanScheduleItem[] = [];
        let currentDate = new Date(start);
        
        // Sort transactions by date
        const txs = [...(loan.transactions || [])].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        for (let i = 1; i <= periods; i++) {
            // Advance date by frequency
            currentDate.setMonth(currentDate.getMonth() + freq);
            const dateStr = currentDate.toISOString().split('T')[0];

            // Apply any special payments that happened BEFORE this period's due date
            // but AFTER the last period
            const prevDate = new Date(currentDate);
            prevDate.setMonth(prevDate.getMonth() - freq);
            
            const periodTransactions = txs.filter(t => {
                const tDate = new Date(t.date);
                return tDate > prevDate && tDate <= currentDate && t.type === 'repayment';
            });

            // Process Special Repayments
            periodTransactions.forEach(tx => {
                balance -= tx.amount;
                schedule.push({
                    period: i,
                    date: tx.date,
                    type: 'Sondertilgung',
                    payment: tx.amount,
                    interest: 0,
                    principal: tx.amount,
                    remainingBalance: Math.max(0, balance)
                });
            });
            
            if (balance <= 0.01) break;

            // Calculate Regular Payment for this period
            let interest = 0;
            let principal = 0;
            let payment = 0;

            if (loan.interestType === 'fixed') {
                interest = fixedInterestPerPeriod;
                
                if (loan.amortizationType === 'balloon') {
                     principal = (i === periods) ? balance : 0;
                } else {
                     principal = standardPrincipal; 
                     if (balance - principal < 0) principal = balance;
                }
                payment = principal + interest;
                
            } else {
                // Prozentuale Berechnung
                interest = balance * ratePerPeriod;

                if (loan.amortizationType === 'annuity') {
                    payment = standardAnnuity;
                    principal = payment - interest;
                } else if (loan.amortizationType === 'linear') {
                    principal = standardPrincipal;
                    payment = principal + interest;
                } else {
                    // Balloon / Endfällig (Nur Zinsen)
                    principal = (i === periods) ? balance : 0;
                    payment = interest + principal;
                }
            }

            // Safety check for negative principal/balance due to special payments overtaking schedule
            if (balance - principal < 0) {
                principal = balance;
                payment = principal + interest;
            }

            balance -= principal;

            schedule.push({
                period: i,
                date: dateStr,
                type: 'Plan',
                payment: payment,
                interest: interest,
                principal: principal,
                remainingBalance: Math.max(0, balance)
            });
        }
        return schedule;
    };

    const handleSaveLoan = () => {
        if (!newLoan.amount || !newLoan.counterpartyName) return alert("Bitte Pflichtfelder ausfüllen.");
        
        const loan: Loan = {
            id: newLoan.id || `loan-${Date.now()}`,
            type: newLoan.type || 'taken',
            counterpartyName: newLoan.counterpartyName,
            contractInfo: newLoan.contractInfo,
            amount: Number(newLoan.amount),
            interestRate: Number(newLoan.interestRate),
            interestType: newLoan.interestType || 'p.a.',
            amortizationType: newLoan.amortizationType || 'annuity',
            paymentFrequency: newLoan.paymentFrequency || 1,
            startDate: newLoan.startDate!,
            endDate: newLoan.endDate!,
            collateral: newLoan.collateral || 'Keine',
            status: newLoan.status || 'Active',
            autoPayment: newLoan.autoPayment,
            transactions: newLoan.transactions || [],
            schedule: [] // Calculated below
        };

        // Calculate Schedule immediately for storage
        loan.schedule = calculateDynamicSchedule(loan);

        if (newLoan.id) onUpdateLoan(loan);
        else onAddLoan(loan);
        
        setIsModalOpen(false);
        setNewLoan({ type: 'taken', interestType: 'p.a.', status: 'Active', amortizationType: 'annuity', paymentFrequency: 1, transactions: [], autoPayment: true });
    };

    const handleAddPayment = () => {
        if (!selectedLoan || newPayment.amount <= 0) return;
        
        const updatedLoan = { ...selectedLoan };
        const newTx: LoanTransaction = {
            id: `tx-${Date.now()}`,
            date: newPayment.date,
            amount: Number(newPayment.amount),
            type: 'repayment',
            note: 'Sondertilgung'
        };
        
        updatedLoan.transactions = [...(updatedLoan.transactions || []), newTx];
        // Recalculate schedule based on new payment
        updatedLoan.schedule = calculateDynamicSchedule(updatedLoan);
        
        onUpdateLoan(updatedLoan);
        setIsPaymentModalOpen(false);
        setNewPayment({ date: new Date().toISOString().split('T')[0], amount: 0 });
        
        // Success Feedback
        setSuccessMsg("Sondertilgung erfolgreich erfasst");
        setTimeout(() => setSuccessMsg(null), 3000);
    };

    const openContract = (loan: Loan) => {
        generateLoanContractPDF(loan, companySettings);
    };
    
    // Updated to accept an override schedule for live previews and filter dates
    const handlePrintSchedule = () => {
        if (!selectedLoan) return;
        
        // Filter schedule based on user selection
        const filteredSchedule = calculatedSchedule.filter(item => {
            if (printFrom && item.date < printFrom) return false;
            if (printTo && item.date > printTo) return false;
            return true;
        });

        generateLoanSchedulePDF(selectedLoan, companySettings, filteredSchedule, printFrom, printTo);
    };

    const showSchedule = (loan: Loan) => {
        setSelectedLoan(loan);
        setCalculatedSchedule(calculateDynamicSchedule(loan));
        setPrintFrom(loan.startDate);
        setPrintTo(loan.endDate);
        setIsCalcOpen(true);
    };

    const handleExportList = () => {
        generateLoanListPDF(loans, companySettings);
    };
    
    const openNewModal = () => {
        setNewLoan({ type: 'taken', interestType: 'p.a.', status: 'Active', amortizationType: 'annuity', paymentFrequency: 1, transactions: [], autoPayment: true });
        setRepaymentMode('with_repayment');
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-fade-in relative">
            {/* SUCCESS TOAST */}
            {successMsg && (
                <div className="fixed top-20 right-8 bg-green-100 border border-green-200 text-green-800 px-6 py-4 rounded-xl shadow-lg flex items-center z-50 animate-slide-up">
                    <CheckCircle className="w-6 h-6 mr-3 text-green-600" />
                    <div>
                        <h4 className="font-bold">Erfolgreich</h4>
                        <p className="text-sm">{successMsg}</p>
                    </div>
                </div>
            )}

            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">Darlehen & Kredite</h1>
                <div className="flex space-x-3">
                    <button onClick={handleExportList} className="bg-white border border-slate-200 text-slate-700 px-4 py-2 rounded-lg flex items-center shadow-sm hover:bg-slate-50">
                        <FileText className="w-4 h-4 mr-2"/> Gesamtliste (PDF)
                    </button>
                    <button onClick={openNewModal} className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center shadow-sm hover:bg-brand-700">
                        <Plus className="w-4 h-4 mr-2"/> Neuer Vertrag
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {loans.map(loan => {
                     // Calculate current balance based on autoPayment setting
                     let currentBalance = loan.amount;
                     
                     if (loan.autoPayment) {
                         // Standard: Calculate what should have been paid by now + manual txs
                         const today = new Date().toISOString().split('T')[0];
                         // Sum principal from schedule until today
                         const scheduledPrincipalPaid = loan.schedule?.filter(s => s.date <= today && s.type === 'Plan').reduce((acc, s) => acc + s.principal, 0) || 0;
                         // Sum manual repayments
                         const manualPaid = loan.transactions?.filter(t => t.type === 'repayment').reduce((acc, t) => acc + t.amount, 0) || 0;
                         
                         currentBalance = Math.max(0, loan.amount - scheduledPrincipalPaid - manualPaid);
                     } else {
                         // Manual: Only transactions count
                         const repaid = loan.transactions?.reduce((sum, t) => sum + (t.type === 'repayment' ? t.amount : 0), 0) || 0;
                         currentBalance = Math.max(0, loan.amount - repaid);
                     }
                     
                     // Progress starts at 0% when currentBalance == amount
                     const progress = Math.max(0, 100 - ((currentBalance / loan.amount) * 100));

                     return (
                    <div key={loan.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-4">
                            <div className="flex items-center">
                                <div className={`p-2 rounded-lg mr-3 ${loan.type === 'taken' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}`}>
                                    {loan.type === 'taken' ? <TrendingDown size={20}/> : <TrendingUp size={20}/>}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800 line-clamp-1">{loan.counterpartyName}</h3>
                                    <div className="flex flex-col text-xs text-slate-500">
                                        <div className="flex items-center space-x-2">
                                            <span>{loan.type === 'taken' ? 'Verbindlichkeit' : 'Forderung'}</span>
                                            <span>•</span>
                                            <span className="capitalize">{loan.amortizationType === 'balloon' ? 'Nur Zinsen' : 'Mit Tilgung'}</span>
                                        </div>
                                        {loan.contractInfo && <span className="font-mono mt-0.5 text-slate-400"># {loan.contractInfo}</span>}
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="font-bold text-lg block text-slate-900">€ {currentBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                                <span className="text-[10px] text-slate-400 uppercase">Aktuell Offen</span>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-sm mb-4">
                            <div className="flex flex-col">
                                <span className="text-[10px] text-slate-400">Ursprungsbetrag</span>
                                <span className="font-medium">€ {loan.amount.toLocaleString(undefined, {minimumFractionDigits: 2})}</span>
                            </div>
                            <div className="flex flex-col text-right">
                                <span className="text-[10px] text-slate-400">{loan.interestType === 'fixed' ? 'Pauschalzins' : 'Zinssatz'}</span>
                                <span className="font-medium">
                                    {loan.interestType === 'fixed' ? `€ ${loan.interestRate.toLocaleString()}` : `${loan.interestRate}% p.a.`}
                                </span>
                            </div>
                            <div className="flex items-center text-slate-600 col-span-2 pt-2 border-t border-slate-50 mt-1" title="Laufzeit">
                                <Calendar className="w-3 h-3 mr-2 text-slate-400"/> 
                                <span className="text-xs">{loan.startDate} bis {loan.endDate}</span>
                            </div>
                        </div>
                        
                        <div className="mb-4">
                            <div className="flex justify-between text-xs text-slate-500 mb-1">
                                <span>Getilgt</span>
                                <span>{Math.round(progress)}%</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className="bg-brand-500 h-full transition-all duration-500" style={{width: `${progress}%`}}></div>
                            </div>
                        </div>

                        <div className="flex space-x-2 border-t pt-4">
                            <button onClick={() => openContract(loan)} className="flex-1 text-xs border border-slate-200 py-2 rounded hover:bg-slate-50 flex justify-center items-center text-slate-600"><Printer className="w-3 h-3 mr-1"/> Vertrag</button>
                            <button onClick={() => showSchedule(loan)} className="flex-1 bg-slate-900 text-white py-2 rounded text-xs hover:bg-slate-800 flex justify-center items-center shadow-sm"><Calculator className="w-3 h-3 mr-1"/> Zinsplan</button>
                            <button onClick={() => { setSelectedLoan(loan); setIsPaymentModalOpen(true); }} className="px-3 bg-green-50 text-green-700 border border-green-200 rounded hover:bg-green-100" title="Sondertilgung"><Plus className="w-4 h-4"/></button>
                        </div>
                    </div>
                )})}
            </div>

            {/* CREATE MODAL */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-slate-50 p-4 border-b flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">Neuer Darlehensvertrag</h3>
                            <button onClick={() => setIsModalOpen(false)}><X className="text-slate-400 hover:text-slate-600"/></button>
                        </div>
                        <div className="p-6 overflow-y-auto space-y-5">
                            {/* Type Toggle */}
                            <div className="flex bg-slate-100 p-1 rounded-lg">
                                <button className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${newLoan.type === 'taken' ? 'bg-white shadow text-brand-600' : 'text-slate-500'}`} onClick={() => setNewLoan({...newLoan, type: 'taken'})}>Darlehensnehmer (Ich erhalte Geld)</button>
                                <button className={`flex-1 py-2 rounded-md text-sm font-medium transition-all ${newLoan.type === 'given' ? 'bg-white shadow text-brand-600' : 'text-slate-500'}`} onClick={() => setNewLoan({...newLoan, type: 'given'})}>Darlehensgeber (Ich verleihe Geld)</button>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Vertragspartner</label>
                                    <input type="text" className="w-full border p-2 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none" value={newLoan.counterpartyName} onChange={e => setNewLoan({...newLoan, counterpartyName: e.target.value})} placeholder="Name / Firma" list="contacts"/>
                                    <datalist id="contacts">{contacts.map(c => <option key={c.id} value={c.companyName || `${c.firstName} ${c.lastName}`}/>)}</datalist>
                                </div>
                                
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Darlehensbetrag (€)</label>
                                    <input type="number" className="w-full border p-2 rounded-lg font-bold" value={newLoan.amount} onChange={e => setNewLoan({...newLoan, amount: parseFloat(e.target.value)})}/>
                                </div>
                                
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Automatische Verbuchung</label>
                                    <div className="flex items-center space-x-2 mt-1">
                                        <button 
                                            onClick={() => setNewLoan({...newLoan, autoPayment: !newLoan.autoPayment})}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${newLoan.autoPayment ? 'bg-green-500' : 'bg-slate-300'}`}
                                        >
                                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${newLoan.autoPayment ? 'translate-x-6' : 'translate-x-1'}`} />
                                        </button>
                                        <span className="text-xs text-slate-600">{newLoan.autoPayment ? 'Aktiv (Auto)' : 'Inaktiv (Manuell)'}</span>
                                    </div>
                                    <p className="text-[9px] text-slate-400 mt-1">Soll die Rate monatlich automatisch vom Saldo abgezogen werden?</p>
                                </div>

                                {/* INTEREST TYPE SELECTOR */}
                                <div className="col-span-2 border-t pt-4 mt-2">
                                    <h4 className="text-sm font-bold text-slate-800 mb-2">Konditionen</h4>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Zinsmodell</label>
                                    <div className="flex space-x-2">
                                        <button 
                                            onClick={() => setNewLoan({...newLoan, interestType: 'p.a.'})}
                                            className={`flex-1 py-1.5 text-xs rounded border transition-colors ${newLoan.interestType === 'p.a.' ? 'bg-brand-50 border-brand-200 text-brand-700 font-bold' : 'bg-white border-slate-200 text-slate-500'}`}
                                        >
                                            <Percent className="w-3 h-3 inline mr-1"/> % p.a.
                                        </button>
                                        <button 
                                            onClick={() => setNewLoan({...newLoan, interestType: 'fixed'})}
                                            className={`flex-1 py-1.5 text-xs rounded border transition-colors ${newLoan.interestType === 'fixed' ? 'bg-brand-50 border-brand-200 text-brand-700 font-bold' : 'bg-white border-slate-200 text-slate-500'}`}
                                        >
                                            <Banknote className="w-3 h-3 inline mr-1"/> € Fixbetrag
                                        </button>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-700 mb-1">
                                        {newLoan.interestType === 'fixed' ? 'Pauschalzins (Gesamt €)' : 'Zinssatz (% p.a.)'}
                                    </label>
                                    <input 
                                        type="number" 
                                        className="w-full border p-2 rounded-lg bg-white font-bold" 
                                        value={newLoan.interestRate} 
                                        onChange={e => setNewLoan({...newLoan, interestRate: parseFloat(e.target.value)})}
                                        placeholder={newLoan.interestType === 'fixed' ? 'z.B. 10000' : 'z.B. 3.5'}
                                    />
                                </div>

                                {/* REPAYMENT MODE */}
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Rückzahlungsart</label>
                                    <div className="flex space-x-2">
                                        <button 
                                            onClick={() => setRepaymentMode('with_repayment')}
                                            className={`flex-1 py-2 text-xs rounded border transition-colors ${repaymentMode === 'with_repayment' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-500'}`}
                                        >
                                            Mit Tilgung (Ratenzahlung)
                                        </button>
                                        <button 
                                            onClick={() => setRepaymentMode('interest_only')}
                                            className={`flex-1 py-2 text-xs rounded border transition-colors ${repaymentMode === 'interest_only' ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-200 text-slate-500'}`}
                                        >
                                            Nur Zinsen (Endfällig)
                                        </button>
                                    </div>
                                </div>

                                {repaymentMode === 'with_repayment' && (
                                    <div className="col-span-2 bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs text-slate-600 flex items-start">
                                        <Info className="w-4 h-4 mr-2 mt-0.5 text-brand-500"/>
                                        Standardmäßig wird eine Annuität berechnet (gleichbleibende Rate aus Zins & Tilgung).
                                    </div>
                                )}

                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Zahlungsintervall</label>
                                    <select className="w-full border p-2 rounded-lg bg-white" value={newLoan.paymentFrequency} onChange={e => setNewLoan({...newLoan, paymentFrequency: parseInt(e.target.value) as any})}>
                                        <option value={1}>Monatlich</option>
                                        <option value={3}>Quartalsweise</option>
                                        <option value={12}>Jährlich</option>
                                    </select>
                                </div>

                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Startdatum</label>
                                    <input type="date" className="w-full border p-2 rounded-lg" value={newLoan.startDate} onChange={e => setNewLoan({...newLoan, startDate: e.target.value})}/>
                                </div>
                                <div className="col-span-2 md:col-span-1">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Enddatum</label>
                                    <input type="date" className="w-full border p-2 rounded-lg" value={newLoan.endDate} onChange={e => setNewLoan({...newLoan, endDate: e.target.value})}/>
                                </div>
                                
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Vertragsnummer / Konto-Info</label>
                                    <div className="relative">
                                        <input type="text" className="w-full border p-2 pl-8 rounded-lg" value={newLoan.contractInfo || ''} onChange={e => setNewLoan({...newLoan, contractInfo: e.target.value})} placeholder="z.B. KN-2024-001"/>
                                        <Hash className="w-4 h-4 absolute left-2.5 top-2.5 text-slate-400"/>
                                    </div>
                                </div>

                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Sicherheiten</label>
                                    <textarea className="w-full border p-2 rounded-lg h-20" value={newLoan.collateral} onChange={e => setNewLoan({...newLoan, collateral: e.target.value})} placeholder="z.B. Bürgschaft, Grundschuld, KFZ-Brief..."></textarea>
                                </div>
                            </div>
                        </div>
                        <div className="p-4 border-t bg-slate-50">
                             <button onClick={handleSaveLoan} className="w-full bg-slate-900 text-white py-3 rounded-lg font-bold shadow-lg hover:bg-slate-800 transform active:scale-95 transition-all">Vertrag erstellen & Speichern</button>
                        </div>
                    </div>
                </div>
            )}

            {/* SCHEDULE MODAL */}
            {isCalcOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">Tilgungsplan</h3>
                                <p className="text-xs text-slate-500">Live-Berechnung inkl. Sondertilgungen</p>
                            </div>
                            <div className="flex items-center space-x-2">
                                <div className="flex items-center space-x-2 mr-2 bg-white px-2 py-1 rounded border border-slate-200">
                                    <span className="text-xs text-slate-500">Drucken Von:</span>
                                    <input type="date" className="text-xs border-none focus:ring-0 p-0" value={printFrom} onChange={e => setPrintFrom(e.target.value)} />
                                    <span className="text-xs text-slate-500">Bis:</span>
                                    <input type="date" className="text-xs border-none focus:ring-0 p-0" value={printTo} onChange={e => setPrintTo(e.target.value)} />
                                </div>
                                {selectedLoan && (
                                    <button onClick={handlePrintSchedule} className="flex items-center text-xs bg-white border border-slate-300 px-3 py-1.5 rounded hover:bg-slate-100 shadow-sm">
                                        <Printer className="w-3 h-3 mr-1"/> Drucken
                                    </button>
                                )}
                                <button onClick={() => setIsCalcOpen(false)} className="p-1 hover:bg-slate-200 rounded-full"><X/></button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto p-0">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-100 text-slate-600 font-semibold sticky top-0 shadow-sm">
                                    <tr>
                                        <th className="p-3 text-center w-16">Nr.</th>
                                        <th className="p-3">Datum</th>
                                        <th className="p-3">Art</th>
                                        <th className="p-3 text-right">Zahlung</th>
                                        <th className="p-3 text-right">Zinsanteil</th>
                                        <th className="p-3 text-right">Tilgung</th>
                                        <th className="p-3 text-right pr-6">Restschuld</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {calculatedSchedule.map(item => (
                                        <tr key={item.period + item.date} className={item.type === 'Sondertilgung' ? 'bg-green-50' : 'hover:bg-slate-50'}>
                                            <td className="p-3 text-center text-slate-400">{item.type === 'Sondertilgung' ? '-' : item.period}</td>
                                            <td className="p-3 font-mono text-slate-600">{item.date}</td>
                                            <td className="p-3">
                                                {item.type === 'Sondertilgung' ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">Sondertilgung</span>
                                                ) : (
                                                    <span className="text-slate-500">Regulär</span>
                                                )}
                                            </td>
                                            <td className="p-3 text-right font-medium">€ {item.payment.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                            <td className="p-3 text-right text-red-500">€ {item.interest.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                            <td className="p-3 text-right text-green-600">€ {item.principal.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                            <td className="p-3 text-right pr-6 font-bold text-slate-800">€ {item.remainingBalance.toLocaleString(undefined, {minimumFractionDigits: 2})}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
            
            {/* PAYMENT MODAL */}
            {isPaymentModalOpen && (
                 <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
                        <h3 className="font-bold text-lg mb-4 text-slate-800">Sondertilgung erfassen</h3>
                        <p className="text-xs text-slate-500 mb-4">Diese Zahlung reduziert die Restschuld sofort und passt den Zinsplan an.</p>
                        
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Datum der Zahlung</label>
                                <input type="date" className="w-full border p-2 rounded" value={newPayment.date} onChange={e => setNewPayment({...newPayment, date: e.target.value})}/>
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-slate-500 mb-1">Betrag (€)</label>
                                <input type="number" className="w-full border p-2 rounded font-bold text-lg" value={newPayment.amount} onChange={e => setNewPayment({...newPayment, amount: parseFloat(e.target.value)})}/>
                            </div>
                        </div>
                        
                        <div className="flex justify-end mt-6 space-x-2">
                            <button onClick={() => setIsPaymentModalOpen(false)} className="px-4 py-2 rounded text-slate-600 hover:bg-slate-100">Abbrechen</button>
                            <button onClick={handleAddPayment} className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 shadow-lg flex items-center"><CheckCircle className="w-4 h-4 mr-2"/> Zahlung buchen</button>
                        </div>
                    </div>
                 </div>
            )}
        </div>
    );
};

export default Loans;
