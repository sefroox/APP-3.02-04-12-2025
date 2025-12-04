
import React, { useState, useEffect } from 'react';
import { Invoice, InvoiceStatus, Project, CompanySettings, InvoiceItem, Contact, InvoiceComment } from '../types';
import { Send, FileText, Plus, Check, Printer, X, Trash2, Edit2, Eye, EyeOff, User, MapPin, MessageSquare, ChevronDown, ChevronUp, CalendarClock, FileSpreadsheet, Save, CheckCircle, MessageCircle } from 'lucide-react';
import { generateJournalPDF } from '../services/pdfService';

interface OutgoingInvoicesProps {
  invoices: Invoice[];
  projects: Project[];
  contacts?: Contact[]; 
  onAddInvoice: (invoice: Invoice) => void;
  onUpdateInvoice: (invoice: Invoice) => void;
  onDeleteInvoice?: (id: string) => void;
  companySettings?: CompanySettings;
}

const OutgoingInvoices: React.FC<OutgoingInvoicesProps> = ({ invoices, projects, contacts = [], onAddInvoice, onUpdateInvoice, onDeleteInvoice, companySettings }) => {
  const [filter, setFilter] = useState<string>('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Comment Modal State
  const [isCommentModalOpen, setIsCommentModalOpen] = useState(false);
  const [commentText, setCommentText] = useState('');
  const [commentInvoiceId, setCommentInvoiceId] = useState<string | null>(null);

  // Generator Form State
  const [customer, setCustomer] = useState('');
  const [selectedContactId, setSelectedContactId] = useState<string>('');
  const [customerNumber, setCustomerNumber] = useState('');
  const [showCustomerNumber, setShowCustomerNumber] = useState(true);
  const [customerAddress, setCustomerAddress] = useState('');
  const [customerUID, setCustomerUID] = useState('');
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [locationAddress, setLocationAddress] = useState('');
  const [currentStatus, setCurrentStatus] = useState<InvoiceStatus>(InvoiceStatus.DRAFT);
  const [currentNumber, setCurrentNumber] = useState('');
  
  // Items State
  const [items, setItems] = useState<InvoiceItem[]>([
      { id: '1', description: '', quantity: 1, unitType: 'piece', unitPriceNet: 0, taxRate: 20, totalNet: 0, totalGross: 0 }
  ]);

  // Calculated Totals
  const netTotal = items.reduce((sum, item) => sum + item.totalNet, 0);
  const taxTotal = items.reduce((sum, item) => sum + (item.totalGross - item.totalNet), 0);
  const grossTotal = netTotal + taxTotal;

  const filteredInvoices = invoices.filter(inv => {
    if (filter === 'all') return true;
    if (filter === 'draft') return inv.status === InvoiceStatus.DRAFT;
    if (filter === 'sent') return inv.status === InvoiceStatus.SENT || inv.status === InvoiceStatus.CAPTURED;
    if (filter === 'paid') return inv.status === InvoiceStatus.PAID || inv.status === InvoiceStatus.PARTIALLY_PAID;
    return true;
  });

  // Auto-fill address when Project is selected
  useEffect(() => {
      if (selectedProjectId) {
          const proj = projects.find(p => p.id === selectedProjectId);
          if (proj) setLocationAddress(proj.address);
      } else {
          setLocationAddress('');
      }
  }, [selectedProjectId, projects]);

  // Auto-fill customer data when Contact is selected
  useEffect(() => {
      if (selectedContactId) {
          const contact = contacts.find(c => c.id === selectedContactId);
          if (contact) {
              setCustomer(contact.companyName || `${contact.firstName} ${contact.lastName}`);
              setCustomerAddress(`${contact.address}, ${contact.zip} ${contact.city}`);
              setCustomerNumber(contact.customerNumber || '');
              setCustomerUID(contact.uid || '');
          }
      }
  }, [selectedContactId, contacts]);

  const handleAddItem = () => {
      setItems([...items, { id: Date.now().toString(), description: '', quantity: 1, unitType: 'piece', unitPriceNet: 0, taxRate: 20, totalNet: 0, totalGross: 0 }]);
  };

  const handleRemoveItem = (id: string) => {
      if (items.length > 1) {
          setItems(items.filter(i => i.id !== id));
      }
  };

  const calculateDaysBetween = (start: string, end: string): number => {
      if (!start || !end) return 0;
      const d1 = new Date(start);
      const d2 = new Date(end);
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
      return diffDays + 1; // Inclusive start date
  };

  const handleUpdateItem = (id: string, field: keyof InvoiceItem, value: any) => {
      setItems(items.map(item => {
          if (item.id === id) {
              let updatedItem = { ...item, [field]: value };
              
              // Auto-calculate quantity if unitType is 'days' and dates change
              if (updatedItem.unitType === 'days' && (field === 'dateFrom' || field === 'dateTo')) {
                  if (updatedItem.dateFrom && updatedItem.dateTo) {
                      const days = calculateDaysBetween(updatedItem.dateFrom, updatedItem.dateTo);
                      updatedItem.quantity = days > 0 ? days : 1;
                  }
              }

              // Recalculate totals for this item
              updatedItem.totalNet = updatedItem.quantity * updatedItem.unitPriceNet;
              updatedItem.totalGross = updatedItem.totalNet * (1 + updatedItem.taxRate / 100);
              return updatedItem;
          }
          return item;
      }));
  };
  
  const handleSave = () => {
      if (!customer || items.some(i => !i.description || i.totalNet <= 0)) {
          return alert("Bitte Kunden und gültige Positionen angeben.");
      }

      // Logic: If editing a SENT invoice, revert to CAPTURED so it can be re-sent or just stored as updated.
      let newStatus = currentStatus;
      if (editingId && currentStatus === InvoiceStatus.SENT) {
          newStatus = InvoiceStatus.CAPTURED;
      }

      const invoiceData: Invoice = {
          id: editingId || `ar-${Date.now()}`,
          type: 'outgoing',
          number: editingId ? currentNumber : `AR-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
          customer: customer,
          contactId: selectedContactId,
          customerNumber: customerNumber,
          showCustomerNumber: showCustomerNumber,
          customerAddress: customerAddress,
          customerUID: customerUID,
          amount: grossTotal,
          netAmount: netTotal,
          taxAmount: taxTotal,
          items: items,
          date: date,
          dueDate: dueDate,
          status: newStatus,
          projectId: selectedProjectId,
          locationAddress: locationAddress,
          category: 'Leistung',
          createdBy: editingId ? undefined : 'System'
      };

      if (editingId) {
          onUpdateInvoice(invoiceData);
      } else {
          onAddInvoice(invoiceData);
      }

      setIsModalOpen(false);
      resetForm();
  };

  const resetForm = () => {
      setEditingId(null);
      setCustomer('');
      setSelectedContactId('');
      setCustomerAddress('');
      setCustomerNumber('');
      setCustomerUID('');
      setShowCustomerNumber(true);
      setCurrentStatus(InvoiceStatus.DRAFT);
      setCurrentNumber('');
      setDate(new Date().toISOString().split('T')[0]);
      setDueDate(new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0]);
      setSelectedProjectId('');
      setLocationAddress('');
      setItems([{ id: '1', description: '', quantity: 1, unitType: 'piece', unitPriceNet: 0, taxRate: 20, totalNet: 0, totalGross: 0 }]);
  };

  const openCreateModal = () => {
      resetForm();
      setIsModalOpen(true);
  };

  const openEditModal = (inv: Invoice) => {
      setEditingId(inv.id);
      setCustomer(inv.customer || '');
      setSelectedContactId(inv.contactId || '');
      setCustomerNumber(inv.customerNumber || '');
      setShowCustomerNumber(inv.showCustomerNumber !== false);
      setCustomerAddress(inv.customerAddress || '');
      setCustomerUID(inv.customerUID || '');
      setDate(inv.date);
      setDueDate(inv.dueDate);
      setSelectedProjectId(inv.projectId || '');
      setLocationAddress(inv.locationAddress || '');
      setCurrentStatus(inv.status);
      setCurrentNumber(inv.number);
      
      if (inv.items && inv.items.length > 0) {
          setItems(inv.items);
      } else {
          setItems([{ 
              id: '1', 
              description: inv.category || 'Leistung', 
              quantity: 1, 
              unitType: 'piece',
              unitPriceNet: inv.netAmount || (inv.amount / 1.2), 
              taxRate: 20, 
              totalNet: inv.netAmount || (inv.amount / 1.2), 
              totalGross: inv.amount 
          }]);
      }
      setIsModalOpen(true);
  };

  const handleDelete = (inv: Invoice) => {
      if (confirm(`Rechnung ${inv.number} wirklich löschen?`)) {
          if (onDeleteInvoice) onDeleteInvoice(inv.id);
      }
  };

  const handleSend = (invoice: Invoice) => {
      const sender = companySettings?.emailConfig?.outgoingUser || 'buchhaltung@nexgen-erp.at';
      if (window.confirm(`Rechnung ${invoice.number} jetzt per E-Mail versenden?`)) {
          alert(`Rechnung ${invoice.id} wurde per E-Mail (von: ${sender}) an den Kunden versendet.`);
          onUpdateInvoice({ ...invoice, status: InvoiceStatus.SENT });
      }
  };

  const handleCapture = (invoice: Invoice) => {
      if (window.confirm(`Rechnung ${invoice.number} jetzt erfassen (Status: Erfasst)?`)) {
          onUpdateInvoice({ ...invoice, status: InvoiceStatus.CAPTURED });
      }
  };

  const openCommentModal = (inv: Invoice) => {
      setCommentInvoiceId(inv.id);
      setCommentText('');
      setIsCommentModalOpen(true);
  };

  const handleSaveComment = () => {
      if (!commentInvoiceId || !commentText.trim()) return;
      const inv = invoices.find(i => i.id === commentInvoiceId);
      if (inv) {
          const newComment: InvoiceComment = {
              id: `c-${Date.now()}`,
              text: commentText,
              author: 'User', // In a real app this would be currentUser.name
              date: new Date().toISOString().split('T')[0]
          };
          const updatedInv = { ...inv, comments: [...(inv.comments || []), newComment] };
          onUpdateInvoice(updatedInv);
      }
      setIsCommentModalOpen(false);
      setCommentText('');
      setCommentInvoiceId(null);
  };

  const getUnitLabel = (type?: string) => {
      switch(type) {
          case 'days': return 'Tage';
          case 'hours': return 'Std.';
          case 'flat': return 'Psch.';
          default: return 'Stk.';
      }
  };

  // --- EXPORT HANDLERS ---
  const handleExportCSV = () => {
      const headers = ["Datum", "Beleg Nr.", "Kunde", "Projekt", "Netto", "Brutto", "Status", "Fällig"];
      const csvContent = [
          headers.join(';'),
          ...filteredInvoices.map(inv => {
              const project = projects.find(p => p.id === inv.projectId);
              const net = (Number(inv.netAmount) || Number(inv.amount)/1.2).toFixed(2).replace('.', ',');
              const gross = Number(inv.amount).toFixed(2).replace('.', ',');
              
              return [
                  inv.date,
                  inv.number,
                  (inv.customer || '').replace(/;/g, ','),
                  project ? project.costCenterCode : '-',
                  net,
                  gross,
                  inv.status,
                  inv.dueDate
              ].join(';');
          })
      ].join('\n');

      const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Ausgangsrechnungen_${filter}_${new Date().toISOString().slice(0,10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleExportPDF = () => {
      const title = `Ausgangsrechnungen (${filter === 'all' ? 'Gesamt' : filter})`;
      if (companySettings) {
          // Map projects to EntityLookup format for the PDF generator
          const entities = projects.map(p => ({
              id: p.id,
              code: p.costCenterCode,
              name: p.name
          }));
          generateJournalPDF(filteredInvoices, companySettings, title, entities);
      } else {
          alert("Firmendaten fehlen für PDF Export.");
      }
  };

  // LIVE PREVIEW COMPONENT
  const LiveInvoicePreview = () => (
      <div className="bg-white shadow-lg w-full h-full overflow-y-auto p-8 text-slate-900 text-[10px] md:text-xs font-sans relative">
          <div className="absolute top-2 right-2 bg-orange-100 text-orange-700 px-2 py-1 text-[10px] font-bold rounded">LIVE VORSCHAU</div>
          
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4 mb-6">
              <div>
                  {companySettings?.logoUrl ? (
                      <img src={companySettings.logoUrl} alt="Logo" className="h-12 object-contain mb-2" />
                  ) : (
                      <h1 className="text-xl font-bold uppercase">{companySettings?.name || 'Firma'}</h1>
                  )}
              </div>
              <div className="text-right text-[10px] text-slate-500">
                  <p className="font-bold text-slate-900">{companySettings?.name}</p>
                  <p>{companySettings?.address}</p>
                  <p>{companySettings?.zip} {companySettings?.city}</p>
                  <p>UID: {companySettings?.uid}</p>
              </div>
          </div>

          {/* Addresses */}
          <div className="flex justify-between mb-8">
              <div className="w-1/2">
                  <p className="text-[9px] text-slate-400 underline mb-2">{companySettings?.name} • {companySettings?.address} • {companySettings?.zip} {companySettings?.city}</p>
                  <p className="font-bold text-base">{customer || 'Musterkunde'}</p>
                  <p className="whitespace-pre-line">{customerAddress || 'Musterstraße 1, 1234 Ort'}</p>
                  {customerUID && <p className="mt-1">UID: {customerUID}</p>}
              </div>
              <div className="text-right">
                  <h2 className="text-2xl font-light text-slate-800 mb-2">RECHNUNG</h2>
                  <table className="ml-auto text-right">
                      <tbody>
                          <tr><td className="text-slate-500 pr-2">Nr:</td><td className="font-mono font-bold">{editingId ? currentNumber : 'ENTWURF'}</td></tr>
                          <tr><td className="text-slate-500 pr-2">Datum:</td><td>{date}</td></tr>
                          {showCustomerNumber && customerNumber && <tr><td className="text-slate-500 pr-2">Kunden-Nr:</td><td>{customerNumber}</td></tr>}
                          <tr><td className="text-slate-500 pr-2">Fällig:</td><td>{dueDate}</td></tr>
                      </tbody>
                  </table>
              </div>
          </div>

          {/* Project / Location Info */}
          {locationAddress && (
              <div className="mb-6 bg-slate-50 p-2 rounded border border-slate-100">
                  <p className="font-bold text-slate-700 flex items-center"><MapPin className="w-3 h-3 mr-1" /> Leistungsort / Kostenstelle:</p>
                  <p className="text-slate-600">{locationAddress}</p>
              </div>
          )}

          {/* Items */}
          <table className="w-full mb-6">
              <thead className="border-b border-slate-300 text-slate-900">
                  <tr>
                      <th className="py-2 text-left w-1/2">Pos. / Bezeichnung</th>
                      <th className="py-2 text-center">Menge / Zeit</th>
                      <th className="py-2 text-right">Einzel</th>
                      <th className="py-2 text-center">USt</th>
                      <th className="py-2 text-right">Gesamt</th>
                  </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => (
                      <tr key={item.id}>
                          <td className="py-2">
                              <p className="font-medium">{item.description || `Position ${idx+1}`}</p>
                              {item.unitType === 'days' && item.dateFrom && item.dateTo && (
                                  <p className="text-[9px] text-slate-500 mt-0.5">
                                      Leistungszeitraum: {new Date(item.dateFrom).toLocaleDateString()} - {new Date(item.dateTo).toLocaleDateString()}
                                  </p>
                              )}
                              {item.notes && <p className="text-slate-500 text-[9px] italic whitespace-pre-line mt-0.5">{item.notes}</p>}
                          </td>
                          <td className="py-2 text-center">
                              {item.quantity} {getUnitLabel(item.unitType)}
                          </td>
                          <td className="py-2 text-right">€ {item.unitPriceNet.toFixed(2)}</td>
                          <td className="py-2 text-center">{item.taxRate}%</td>
                          <td className="py-2 text-right font-bold">€ {item.totalNet.toFixed(2)}</td>
                      </tr>
                  ))}
              </tbody>
          </table>

          {/* Totals */}
          <div className="flex justify-end mb-8">
              <div className="w-48 text-right space-y-1">
                  <div className="flex justify-between"><span className="text-slate-500">Netto:</span><span>€ {netTotal.toFixed(2)}</span></div>
                  <div className="flex justify-between border-b border-slate-200 pb-1"><span className="text-slate-500">MwSt:</span><span>€ {taxTotal.toFixed(2)}</span></div>
                  <div className="flex justify-between text-base font-bold text-slate-900 pt-1"><span>Gesamt:</span><span>€ {grossTotal.toFixed(2)}</span></div>
              </div>
          </div>

          {/* Footer */}
          <div className="mt-auto border-t border-slate-200 pt-4 text-[9px] text-slate-500 flex justify-between items-end">
              <div>
                  <p className="font-bold">{companySettings?.bankName}</p>
                  <p>IBAN: {companySettings?.iban}</p>
                  <p>BIC: {companySettings?.bic}</p>
              </div>
              <div className="text-center">
                  <div className="w-12 h-12 bg-white border border-slate-200 mx-auto mb-1"></div>
                  <span>Zahlcode</span>
              </div>
          </div>
      </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
       <div className="flex justify-between items-center">
         <div>
            <h1 className="text-2xl font-bold text-slate-800">Ausgangsrechnungen</h1>
            <p className="text-sm text-slate-500">Rechnungen an Kunden erstellen und verwalten</p>
         </div>
         <div className="flex space-x-3">
             {/* EXPORT BUTTONS */}
             <div className="flex bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
               <button onClick={handleExportCSV} className="flex items-center px-3 py-1.5 text-green-700 hover:bg-green-50 rounded text-sm font-medium transition-colors" title="Als Excel/CSV">
                   <FileSpreadsheet className="w-4 h-4 mr-2" /> CSV
               </button>
               <div className="w-px bg-slate-200 mx-1"></div>
               <button onClick={handleExportPDF} className="flex items-center px-3 py-1.5 text-red-700 hover:bg-red-50 rounded text-sm font-medium transition-colors" title="Als PDF Liste">
                   <FileText className="w-4 h-4 mr-2" /> PDF
               </button>
             </div>

             <button 
                onClick={openCreateModal}
                className="bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800 shadow-sm flex items-center"
             >
                <Plus className="w-4 h-4 mr-2" /> Rechnung erstellen
             </button>
         </div>
       </div>

       {/* Filters */}
       <div className="flex space-x-4 overflow-x-auto pb-2">
         <button onClick={() => setFilter('all')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
           Alle
         </button>
         <button onClick={() => setFilter('draft')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors flex items-center ${filter === 'draft' ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
           <Save className="w-3 h-3 mr-1" /> Entwürfe
         </button>
         <button onClick={() => setFilter('sent')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'sent' ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
           Versendet / Erfasst
         </button>
         <button onClick={() => setFilter('paid')} className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${filter === 'paid' ? 'bg-green-600 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}>
           Bezahlt
         </button>
       </div>

       <div className="bg-white rounded-xl shadow-sm border border-slate-100 overflow-hidden">
          <table className="w-full text-sm text-left">
             <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                <tr>
                   <th className="py-4 px-6">Nr.</th>
                   <th className="py-4 px-6">Kunde</th>
                   <th className="py-4 px-6">Kostenstelle / Projekt</th>
                   <th className="py-4 px-6 text-right">Netto</th>
                   <th className="py-4 px-6 text-right">Brutto</th>
                   <th className="py-4 px-6">Status</th>
                   <th className="py-4 px-6">Datum</th>
                   <th className="py-4 px-6 text-right">Aktionen</th>
                </tr>
             </thead>
             <tbody>
                {filteredInvoices.length === 0 ? (
                   <tr><td colSpan={8} className="py-12 text-center text-slate-400">Keine Ausgangsrechnungen für diesen Filter gefunden.</td></tr>
                ) : (
                   filteredInvoices.map(inv => {
                      const project = projects.find(p => p.id === inv.projectId);
                      const hasComments = inv.comments && inv.comments.length > 0;
                      return (
                       <tr key={inv.id} className="border-b border-slate-100 hover:bg-slate-50">
                          <td className="py-4 px-6 font-mono text-slate-600 flex items-center relative">
                              <FileText className="w-4 h-4 mr-2 text-slate-400" /> {inv.number}
                              {hasComments && (
                                  <div className="absolute top-2 left-2 bg-red-500 rounded-full p-0.5 border border-white" title="Kommentare vorhanden">
                                      <MessageSquare size={8} className="text-white fill-white" />
                                  </div>
                              )}
                          </td>
                          <td className="py-4 px-6 font-medium text-slate-900">{inv.customer}</td>
                          <td className="py-4 px-6 text-slate-500">
                              {project ? project.costCenterCode : '-'}
                          </td>
                          <td className="py-4 px-6 text-right text-slate-500">€ {(Number(inv.netAmount) || Number(inv.amount) * 0.8333).toFixed(2)}</td>
                          <td className="py-4 px-6 text-right font-bold text-slate-800">€ {Number(inv.amount).toFixed(2)}</td>
                          <td className="py-4 px-6">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                  inv.status === 'Versendet' ? 'bg-blue-100 text-blue-700' :
                                  inv.status === 'Erfasst' ? 'bg-green-50 text-green-700' :
                                  inv.status === 'Bezahlt' ? 'bg-green-100 text-green-700' :
                                  'bg-slate-100 text-slate-600'
                              }`}>
                                  {inv.status}
                              </span>
                          </td>
                          <td className="py-4 px-6 text-slate-500">{inv.date}</td>
                          <td className="py-4 px-6 text-right">
                              <div className="flex justify-end space-x-2">
                                  <button onClick={() => openCommentModal(inv)} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded" title="Kommentieren">
                                      <MessageCircle className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => openEditModal(inv)} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded" title="Bearbeiten">
                                      <Edit2 className="w-4 h-4" />
                                  </button>
                                  <button onClick={() => handleDelete(inv)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded" title="Löschen">
                                      <Trash2 className="w-4 h-4" />
                                  </button>
                                  
                                  {/* Actions for Draft OR Captured/Sent (allowing re-send) */}
                                  {(inv.status === InvoiceStatus.DRAFT || inv.status === InvoiceStatus.CAPTURED) && (
                                      <button onClick={() => handleSend(inv)} className="p-2 text-brand-600 hover:bg-brand-50 rounded" title="Per E-Mail Senden & Erfassen">
                                          <Send className="w-4 h-4" />
                                      </button>
                                  )}
                                  
                                  {inv.status === InvoiceStatus.DRAFT && (
                                      <button onClick={() => handleCapture(inv)} className="p-2 text-green-600 hover:bg-green-50 rounded" title="Erfassen (ohne Senden)">
                                          <CheckCircle className="w-4 h-4" />
                                      </button>
                                  )}
                              </div>
                          </td>
                       </tr>
                      );
                   })
                )}
             </tbody>
          </table>
       </div>

       {/* COMMENT MODAL */}
       {isCommentModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
               <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6">
                   <h3 className="font-bold text-lg mb-4 text-slate-800">Kommentar hinzufügen</h3>
                   <div className="mb-4">
                       <div className="space-y-2 max-h-40 overflow-y-auto mb-4 bg-slate-50 p-2 rounded">
                           {invoices.find(i => i.id === commentInvoiceId)?.comments?.map(c => (
                               <div key={c.id} className="text-xs border-b border-slate-200 last:border-0 pb-2 mb-2">
                                   <div className="font-bold text-slate-700 flex justify-between">
                                       <span>{c.author}</span>
                                       <span className="text-slate-400 font-normal">{c.date}</span>
                                   </div>
                                   <p className="text-slate-600">{c.text}</p>
                               </div>
                           )) || <p className="text-xs text-slate-400">Keine Kommentare bisher.</p>}
                       </div>
                       <textarea 
                           className="w-full border border-slate-300 rounded-lg p-2 text-sm h-24" 
                           placeholder="Ihr Kommentar..."
                           value={commentText}
                           onChange={e => setCommentText(e.target.value)}
                           autoFocus
                       ></textarea>
                   </div>
                   <div className="flex justify-end space-x-2">
                       <button onClick={() => setIsCommentModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Abbrechen</button>
                       <button onClick={handleSaveComment} className="px-4 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-sm font-medium">Speichern</button>
                   </div>
               </div>
           </div>
       )}

       {/* SPLIT VIEW CREATOR MODAL (Same as before) */}
       {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-2 bg-slate-900/80 backdrop-blur-sm animate-fade-in">
           <div className="bg-white rounded-xl shadow-2xl w-full h-[95vh] max-w-[95vw] overflow-hidden flex flex-col">
              {/* Header */}
              <div className="bg-slate-900 px-6 py-4 border-b border-slate-800 flex justify-between items-center flex-shrink-0 text-white">
                 <h3 className="font-bold flex items-center"><Edit2 className="w-5 h-5 mr-2 text-brand-400" /> {editingId ? `Rechnung ${currentNumber} bearbeiten` : 'Neue Rechnung erstellen'}</h3>
                 <button onClick={() => setIsModalOpen(false)}><X className="w-6 h-6 text-slate-400 hover:text-white" /></button>
              </div>
              
              <div className="flex flex-1 overflow-hidden">
                  {/* LEFT: LIVE PREVIEW */}
                  <div className="w-1/2 bg-slate-200 p-8 flex justify-center overflow-y-auto shadow-inner">
                      <div className="w-[210mm] min-h-[297mm] transform scale-75 origin-top shadow-2xl">
                          <LiveInvoicePreview />
                      </div>
                  </div>

                  {/* RIGHT: FORM */}
                  <div className="w-1/2 bg-white flex flex-col border-l border-slate-200">
                      <div className="flex-1 overflow-y-auto p-8 space-y-8">
                          
                          {/* 1. EMPFÄNGER */}
                          <div className="space-y-4">
                              <h4 className="text-sm font-bold text-slate-800 border-b pb-2 uppercase tracking-wider">Empfänger & Daten</h4>
                              <div className="grid grid-cols-2 gap-4">
                                  <div className="col-span-2">
                                      <label className="block text-xs font-medium text-slate-500 mb-1">Kunde wählen (aus Kontakten)</label>
                                      <select 
                                        className="w-full rounded-lg border-slate-300"
                                        value={selectedContactId}
                                        onChange={e => setSelectedContactId(e.target.value)}
                                      >
                                          <option value="">-- Manueller Eintrag --</option>
                                          {contacts.filter(c => c.type === 'customer').map(c => (
                                              <option key={c.id} value={c.id}>{c.companyName || `${c.firstName} ${c.lastName}`}</option>
                                          ))}
                                      </select>
                                  </div>
                                  
                                  <div>
                                      <label className="block text-xs font-medium text-slate-500 mb-1">Kunde / Firma Name *</label>
                                      <input type="text" className="w-full rounded-lg border-slate-300" value={customer} onChange={e => setCustomer(e.target.value)} />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-medium text-slate-500 mb-1">Anschrift</label>
                                      <input type="text" className="w-full rounded-lg border-slate-300" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} placeholder="Straße, PLZ, Ort" />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-medium text-slate-500 mb-1">Kundennummer</label>
                                      <div className="flex items-center space-x-2">
                                          <input type="text" className="w-full rounded-lg border-slate-300" value={customerNumber} onChange={e => setCustomerNumber(e.target.value)} />
                                          <button onClick={() => setShowCustomerNumber(!showCustomerNumber)} title={showCustomerNumber ? "Verstecken" : "Anzeigen"} className="text-slate-400 hover:text-slate-600">
                                              {showCustomerNumber ? <Eye size={20} /> : <EyeOff size={20} />}
                                          </button>
                                      </div>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-medium text-slate-500 mb-1">UID-Nummer (E-Rechnung)</label>
                                      <input type="text" className="w-full rounded-lg border-slate-300" value={customerUID} onChange={e => setCustomerUID(e.target.value)} placeholder="ATU..." />
                                  </div>
                              </div>
                          </div>

                          {/* 2. PROJEKT & ORT */}
                          <div className="space-y-4">
                              <h4 className="text-sm font-bold text-slate-800 border-b pb-2 uppercase tracking-wider">Projektbezug</h4>
                              <div className="grid grid-cols-2 gap-4">
                                  <div>
                                      <label className="block text-xs font-medium text-slate-500 mb-1">Kostenstelle / Projekt</label>
                                      <select className="w-full rounded-lg border-slate-300" value={selectedProjectId} onChange={e => setSelectedProjectId(e.target.value)}>
                                          <option value="">Kein Projekt</option>
                                          {projects.map(p => <option key={p.id} value={p.id}>{p.costCenterCode} - {p.name}</option>)}
                                      </select>
                                  </div>
                                  <div>
                                      <label className="block text-xs font-medium text-slate-500 mb-1">Leistungsort (Adresse)</label>
                                      <input type="text" className="w-full rounded-lg border-slate-300" value={locationAddress} onChange={e => setLocationAddress(e.target.value)} />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-medium text-slate-500 mb-1">Rechnungsdatum</label>
                                      <input type="date" className="w-full rounded-lg border-slate-300" value={date} onChange={e => setDate(e.target.value)} />
                                  </div>
                                  <div>
                                      <label className="block text-xs font-medium text-slate-500 mb-1">Fällig am</label>
                                      <input type="date" className="w-full rounded-lg border-slate-300" value={dueDate} onChange={e => setDueDate(e.target.value)} />
                                  </div>
                              </div>
                          </div>

                          {/* 3. POSITIONEN */}
                          <div className="space-y-4">
                              <div className="flex justify-between items-center border-b pb-2">
                                  <h4 className="text-sm font-bold text-slate-800 uppercase tracking-wider">Positionen</h4>
                                  <span className="text-xs font-bold">Summe: € {grossTotal.toFixed(2)}</span>
                              </div>
                              
                              {/* HEADER ROW FOR INPUTS */}
                              <div className="grid grid-cols-12 gap-2 px-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                  <div className="col-span-5">Beschreibung / Leistung</div>
                                  <div className="col-span-2 text-center">Menge / Zeit</div>
                                  <div className="col-span-2 text-right">Einzelpreis</div>
                                  <div className="col-span-2 text-center">Steuer</div>
                                  <div className="col-span-1 text-center"></div>
                              </div>

                              <div className="space-y-3">
                                  {items.map((item, idx) => (
                                      <div key={item.id} className="bg-slate-50 p-3 rounded border border-slate-200 hover:border-slate-300 transition-colors">
                                          <div className="grid grid-cols-12 gap-2 items-start">
                                              <div className="col-span-5">
                                                  <input 
                                                    type="text" 
                                                    className="w-full border-slate-200 rounded text-sm font-medium" 
                                                    placeholder="Titel / Leistung" 
                                                    value={item.description} 
                                                    onChange={e => handleUpdateItem(item.id, 'description', e.target.value)} 
                                                  />
                                              </div>
                                              <div className="col-span-2 flex space-x-1">
                                                  <input 
                                                    type="number" 
                                                    className="w-1/2 border-slate-200 rounded text-sm text-center" 
                                                    placeholder="0" 
                                                    value={item.quantity} 
                                                    onChange={e => handleUpdateItem(item.id, 'quantity', parseFloat(e.target.value))} 
                                                  />
                                                  <select 
                                                    className="w-1/2 border-slate-200 rounded text-[10px] px-0 text-center bg-white"
                                                    value={item.unitType || 'piece'}
                                                    onChange={e => handleUpdateItem(item.id, 'unitType', e.target.value)}
                                                  >
                                                      <option value="piece">Stk</option>
                                                      <option value="days">Tage</option>
                                                      <option value="hours">Std</option>
                                                      <option value="flat">Psch</option>
                                                  </select>
                                              </div>
                                              <div className="col-span-2">
                                                  <input type="number" className="w-full border-slate-200 rounded text-sm text-right" placeholder="€" value={item.unitPriceNet} onChange={e => handleUpdateItem(item.id, 'unitPriceNet', parseFloat(e.target.value))} />
                                              </div>
                                              <div className="col-span-2">
                                                  <select className="w-full border-slate-200 rounded text-sm" value={item.taxRate} onChange={e => handleUpdateItem(item.id, 'taxRate', parseFloat(e.target.value))}>
                                                      <option value={20}>20%</option>
                                                      <option value={10}>10%</option>
                                                  </select>
                                              </div>
                                              <div className="col-span-1 text-center flex flex-col justify-between h-full">
                                                  <button onClick={() => handleRemoveItem(item.id)} className="text-slate-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                                              </div>
                                          </div>
                                          
                                          {/* DATE RANGE SELECTOR FOR DAYS */}
                                          {item.unitType === 'days' && (
                                              <div className="mt-2 flex items-center space-x-4 bg-white p-2 rounded border border-slate-100">
                                                  <div className="text-[10px] font-bold text-slate-500 flex items-center"><CalendarClock className="w-3 h-3 mr-1" /> Zeitraum (Autocalc):</div>
                                                  <div className="flex items-center space-x-2">
                                                      <label className="text-[10px] text-slate-400">Von</label>
                                                      <input type="date" className="text-xs border border-slate-200 rounded px-2 py-1" value={item.dateFrom || ''} onChange={e => handleUpdateItem(item.id, 'dateFrom', e.target.value)} />
                                                  </div>
                                                  <div className="flex items-center space-x-2">
                                                      <label className="text-[10px] text-slate-400">Bis</label>
                                                      <input type="date" className="text-xs border border-slate-200 rounded px-2 py-1" value={item.dateTo || ''} onChange={e => handleUpdateItem(item.id, 'dateTo', e.target.value)} />
                                                  </div>
                                              </div>
                                          )}

                                          {/* Additional Options Row */}
                                          <div className="mt-2 pt-2 border-t border-slate-200/50 flex items-start space-x-4">
                                               <div className="flex-1">
                                                   {/* Toggle Notes */}
                                                   <details className="group">
                                                       <summary className="list-none cursor-pointer text-[10px] font-bold text-brand-600 flex items-center hover:underline mb-1">
                                                           <MessageSquare className="w-3 h-3 mr-1" /> {item.notes ? 'Anmerkung bearbeiten' : 'Anmerkung hinzufügen'}
                                                       </summary>
                                                       <textarea 
                                                            className="w-full text-xs border-slate-200 rounded bg-white h-16"
                                                            placeholder="Detaillierte Beschreibung (erscheint kursiv unter der Position)..."
                                                            value={item.notes || ''}
                                                            onChange={e => handleUpdateItem(item.id, 'notes', e.target.value)}
                                                       ></textarea>
                                                   </details>
                                               </div>
                                               <div className="text-right text-xs">
                                                   <span className="text-slate-400 mr-2">Gesamt Netto:</span>
                                                   <span className="font-bold text-slate-700">€ {item.totalNet.toFixed(2)}</span>
                                               </div>
                                          </div>
                                      </div>
                                  ))}
                                  <button onClick={handleAddItem} className="text-xs text-brand-600 font-bold flex items-center hover:underline mt-2"><Plus className="w-3 h-3 mr-1" /> Position hinzufügen</button>
                              </div>
                          </div>

                      </div>

                      <div className="p-6 border-t border-slate-200 bg-slate-50 flex justify-between items-center">
                          <div className="text-xs text-slate-500">
                              Netto: € {netTotal.toFixed(2)} | Steuer: € {taxTotal.toFixed(2)}
                          </div>
                          <div className="flex space-x-3">
                              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-white rounded-lg text-sm border border-transparent hover:border-slate-300">Abbrechen</button>
                              <button onClick={handleSave} className="px-6 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-sm font-medium flex items-center shadow-lg">
                                  <Check className="w-4 h-4 mr-2" /> {editingId ? 'Änderungen Speichern' : 'Rechnung Erstellen'}
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default OutgoingInvoices;
