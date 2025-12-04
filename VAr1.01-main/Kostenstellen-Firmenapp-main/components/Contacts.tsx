
import React, { useState } from 'react';
import { Contact } from '../types';
import { Users, Plus, Search, Edit2, Trash2, Phone, Mail, MapPin, Briefcase, X, Save } from 'lucide-react';

interface ContactsProps {
    contacts: Contact[];
    onAddContact: (contact: Contact) => void;
    onUpdateContact: (contact: Contact) => void;
    onDeleteContact: (id: string) => void;
}

const Contacts: React.FC<ContactsProps> = ({ contacts, onAddContact, onUpdateContact, onDeleteContact }) => {
    const [search, setSearch] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'customer' | 'supplier'>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingContact, setEditingContact] = useState<Partial<Contact>>({ type: 'customer', country: 'Österreich' });

    const filteredContacts = contacts.filter(c => {
        const matchSearch = c.companyName?.toLowerCase().includes(search.toLowerCase()) || 
                            c.lastName?.toLowerCase().includes(search.toLowerCase()) ||
                            c.customerNumber?.toLowerCase().includes(search.toLowerCase());
        const matchType = filterType === 'all' || c.type === filterType;
        return matchSearch && matchType;
    });

    const handleSave = () => {
        if ((!editingContact.companyName && !editingContact.lastName) || !editingContact.address) {
            return alert("Bitte mindestens Name/Firma und Adresse angeben.");
        }

        const contact: Contact = {
            id: editingContact.id || `c-${Date.now()}`,
            type: editingContact.type || 'customer',
            companyName: editingContact.companyName || '',
            firstName: editingContact.firstName || '',
            lastName: editingContact.lastName || '',
            customerNumber: editingContact.customerNumber || (editingContact.type === 'customer' ? `KD-${Date.now().toString().substr(-4)}` : `LF-${Date.now().toString().substr(-4)}`),
            address: editingContact.address || '',
            zip: editingContact.zip || '',
            city: editingContact.city || '',
            country: editingContact.country || 'Österreich',
            uid: editingContact.uid || '',
            email: editingContact.email || '',
            phone: editingContact.phone || '',
            iban: editingContact.iban || '',
            bic: editingContact.bic || '',
            notes: editingContact.notes || ''
        };

        if (editingContact.id) {
            onUpdateContact(contact);
        } else {
            onAddContact(contact);
        }
        setIsModalOpen(false);
        setEditingContact({ type: 'customer', country: 'Österreich' });
    };

    const openEdit = (c: Contact) => {
        setEditingContact(c);
        setIsModalOpen(true);
    };

    const openNew = () => {
        setEditingContact({ type: 'customer', country: 'Österreich' });
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-slate-800">Kontakte</h1>
                <button onClick={openNew} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 shadow-sm flex items-center">
                    <Plus className="w-4 h-4 mr-2" /> Neuer Kontakt
                </button>
            </div>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-2.5 text-slate-400 w-4 h-4" />
                    <input 
                        type="text" 
                        placeholder="Suchen nach Name, Firma, Nummer..." 
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:ring-brand-500 focus:border-brand-500"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button onClick={() => setFilterType('all')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filterType === 'all' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Alle</button>
                    <button onClick={() => setFilterType('customer')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filterType === 'customer' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Kunden</button>
                    <button onClick={() => setFilterType('supplier')} className={`px-4 py-1.5 text-sm font-medium rounded-md transition-all ${filterType === 'supplier' ? 'bg-white shadow-sm text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}>Lieferanten</button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredContacts.map(contact => (
                    <div key={contact.id} className="bg-white rounded-xl border border-slate-200 p-5 hover:shadow-md transition-shadow group">
                        <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center">
                                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold mr-3 ${contact.type === 'customer' ? 'bg-blue-500' : 'bg-orange-500'}`}>
                                    {contact.companyName ? contact.companyName.substring(0,1) : contact.lastName?.substring(0,1)}
                                </div>
                                <div>
                                    <h3 className="font-bold text-slate-800">{contact.companyName || `${contact.firstName} ${contact.lastName}`}</h3>
                                    <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded">{contact.customerNumber}</span>
                                </div>
                            </div>
                            <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={() => openEdit(contact)} className="p-2 hover:bg-slate-100 rounded text-slate-500 hover:text-brand-600"><Edit2 className="w-4 h-4" /></button>
                                <button onClick={() => onDeleteContact(contact.id)} className="p-2 hover:bg-slate-100 rounded text-slate-500 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                            </div>
                        </div>
                        
                        <div className="space-y-2 text-sm text-slate-600 mt-4">
                            <div className="flex items-start">
                                <MapPin className="w-4 h-4 mr-2 mt-0.5 text-slate-400" />
                                <span>{contact.address}, {contact.zip} {contact.city}</span>
                            </div>
                            {contact.email && (
                                <div className="flex items-center">
                                    <Mail className="w-4 h-4 mr-2 text-slate-400" />
                                    <a href={`mailto:${contact.email}`} className="hover:text-brand-600">{contact.email}</a>
                                </div>
                            )}
                            {contact.phone && (
                                <div className="flex items-center">
                                    <Phone className="w-4 h-4 mr-2 text-slate-400" />
                                    <span>{contact.phone}</span>
                                </div>
                            )}
                            {contact.uid && (
                                <div className="flex items-center">
                                    <Briefcase className="w-4 h-4 mr-2 text-slate-400" />
                                    <span>UID: {contact.uid}</span>
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Edit/Create Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">{editingContact.id ? 'Kontakt bearbeiten' : 'Neuer Kontakt'}</h3>
                            <button onClick={() => setIsModalOpen(false)}><X className="w-5 h-5 text-slate-400" /></button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Typ</label>
                                    <div className="flex space-x-4">
                                        <label className="flex items-center"><input type="radio" name="type" checked={editingContact.type === 'customer'} onChange={() => setEditingContact({...editingContact, type: 'customer'})} className="mr-2" /> Kunde</label>
                                        <label className="flex items-center"><input type="radio" name="type" checked={editingContact.type === 'supplier'} onChange={() => setEditingContact({...editingContact, type: 'supplier'})} className="mr-2" /> Lieferant</label>
                                    </div>
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Firma</label>
                                    <input type="text" className="w-full rounded-lg border-slate-300" value={editingContact.companyName || ''} onChange={e => setEditingContact({...editingContact, companyName: e.target.value})} placeholder="Firmenname" />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Vorname</label>
                                    <input type="text" className="w-full rounded-lg border-slate-300" value={editingContact.firstName || ''} onChange={e => setEditingContact({...editingContact, firstName: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Nachname</label>
                                    <input type="text" className="w-full rounded-lg border-slate-300" value={editingContact.lastName || ''} onChange={e => setEditingContact({...editingContact, lastName: e.target.value})} />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Kundennummer / ID</label>
                                    <input type="text" className="w-full rounded-lg border-slate-300" value={editingContact.customerNumber || ''} onChange={e => setEditingContact({...editingContact, customerNumber: e.target.value})} placeholder="Wird autom. generiert wenn leer" />
                                </div>
                                <div className="col-span-2">
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Straße & Hausnr.</label>
                                    <input type="text" className="w-full rounded-lg border-slate-300" value={editingContact.address || ''} onChange={e => setEditingContact({...editingContact, address: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">PLZ</label>
                                    <input type="text" className="w-full rounded-lg border-slate-300" value={editingContact.zip || ''} onChange={e => setEditingContact({...editingContact, zip: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Ort</label>
                                    <input type="text" className="w-full rounded-lg border-slate-300" value={editingContact.city || ''} onChange={e => setEditingContact({...editingContact, city: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">E-Mail</label>
                                    <input type="email" className="w-full rounded-lg border-slate-300" value={editingContact.email || ''} onChange={e => setEditingContact({...editingContact, email: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">Telefon</label>
                                    <input type="text" className="w-full rounded-lg border-slate-300" value={editingContact.phone || ''} onChange={e => setEditingContact({...editingContact, phone: e.target.value})} />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">UID-Nummer</label>
                                    <input type="text" className="w-full rounded-lg border-slate-300" value={editingContact.uid || ''} onChange={e => setEditingContact({...editingContact, uid: e.target.value})} placeholder="ATU..." />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-slate-500 mb-1">IBAN (für Lieferanten)</label>
                                    <input type="text" className="w-full rounded-lg border-slate-300" value={editingContact.iban || ''} onChange={e => setEditingContact({...editingContact, iban: e.target.value})} />
                                </div>
                            </div>
                        </div>
                        <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end space-x-3">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm">Abbrechen</button>
                            <button onClick={handleSave} className="px-6 py-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-sm font-medium flex items-center">
                                <Save className="w-4 h-4 mr-2" /> Speichern
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Contacts;
