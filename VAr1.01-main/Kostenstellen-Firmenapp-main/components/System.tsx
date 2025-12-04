
import React, { useState, useEffect } from 'react';
import { Save, RefreshCw, Database, Server, Users, UserPlus, Trash2, CheckCircle, X, Building2, Upload, AlertTriangle, Bot, BrainCircuit, Smartphone, QrCode, Cloud, Download, FileJson, FileCode, FileType, LayoutTemplate, Mail, Edit2, FolderArchive, Package, ListChecks, Send, Activity, Landmark, Keyboard, ShieldCheck, Globe, Phone, Briefcase } from 'lucide-react';
import { User, UserRole, CompanySettings } from '../types';
import { testAIConnection } from '../services/geminiService';
import { checkBackendStatus, getWhatsAppQR, getWhatsAppStatus, initWhatsAppSession, resetWhatsAppSession, requestPairingCode } from '../services/apiService';
import { getServerJsContent } from '../utils/serverTemplate';
import { NAV_ITEMS } from '../constants';

interface SystemProps {
  users?: User[];
  onAddUser?: (user: User) => void;
  onEditUser?: (user: User) => void;
  onDeleteUser?: (id: string) => void;
  onUpdateUserRole?: (id: string, role: UserRole) => void;
  userRole?: UserRole;
  companySettings?: CompanySettings;
  onUpdateCompanySettings?: (settings: CompanySettings) => void;
  onFactoryReset?: () => void;
}

const System: React.FC<SystemProps> = ({ users = [], onAddUser, onDeleteUser, onEditUser, onUpdateUserRole, userRole = 'admin', companySettings, onUpdateCompanySettings, onFactoryReset }) => {
  const [activeTab, setActiveTab] = useState<'backup' | 'users' | 'company' | 'ai' | 'whatsapp' | 'server' | 'mail' | 'finapi'>('company');
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  // User Form State
  const [userData, setUserData] = useState<Partial<User>>({ role: 'user', allowedModules: NAV_ITEMS.map(i => i.id), canApprove: false });
  
  const [testStatus, setTestStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [isRealBackend, setIsRealBackend] = useState(false);
  const [waStatus, setWaStatus] = useState<'disconnected' | 'scanning' | 'connected'>('disconnected');
  const [realQR, setRealQR] = useState<string | null>(null);
  const [settingsForm, setSettingsForm] = useState<CompanySettings>(companySettings || {
      name: '', address: '', zip: '', city: '', email: '', phone: '', website: '', uid: '', fn: '', court: '', bankName: '', iban: '', bic: '', owner: '', aiApiKey: '', aiProvider: 'google', aiModel: 'gemini-2.5-flash', whatsappConnected: false,
      emailConfig: { incomingHost: '', incomingPort: '', incomingUser: '', incomingPass: '', incomingSecure: true, outgoingHost: '', outgoingPort: '', outgoingUser: '', outgoingPass: '', outgoingSecure: true, senderName: '' },
      finApiConfig: { clientId: '', clientSecret: '', sandbox: true }
  });

  // PAIRING CODE STATE
  const [pairingNumber, setPairingNumber] = useState('');
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [isPairing, setIsPairing] = useState(false);

  useEffect(() => {
      checkBackendStatus().then(connected => {
          setIsRealBackend(connected);
          if (connected) {
              getWhatsAppStatus().then(status => { if (status.connected) setWaStatus('connected'); });
          }
      });
  }, []);

  useEffect(() => { if (companySettings) setSettingsForm(companySettings); }, [companySettings]);

  useEffect(() => {
      if (isRealBackend && waStatus === 'scanning' && !pairingCode) {
          const poll = setInterval(async () => {
              const qr = await getWhatsAppQR();
              if (qr) setRealQR(qr);
              const status = await getWhatsAppStatus();
              if (status.connected) { setWaStatus('connected'); setRealQR(null); clearInterval(poll); }
          }, 3000);
          return () => clearInterval(poll);
      }
  }, [isRealBackend, waStatus, pairingCode]);

  const openAddUserModal = () => { 
      setIsEditMode(false); 
      setUserData({ 
          role: 'user', 
          allowedModules: NAV_ITEMS.map(i => i.id), // Default all
          canApprove: false,
          password: ''
      }); 
      setIsUserModalOpen(true); 
  };
  
  const openEditUserModal = (user: User) => { 
      setIsEditMode(true); 
      setUserData({ ...user, password: '' }); 
      setIsUserModalOpen(true); 
  };
  
  const handleSaveUser = () => {
      if (!userData.name || !userData.email) return alert("Bitte Name und Email angeben.");
      
      const finalUser: User = {
          id: userData.id || `u-${Date.now()}`,
          name: userData.name!,
          email: userData.email!,
          role: userData.role || 'user',
          lastLogin: userData.lastLogin || 'Noch nie',
          password: userData.password || '123456', // In real app, handle logic to keep old pw if empty
          allowedModules: userData.allowedModules || [],
          canApprove: userData.canApprove || false
      };

      // Keep existing password if not changed in edit mode
      if (isEditMode && !userData.password) {
          const existingUser = users.find(u => u.id === userData.id);
          if (existingUser) finalUser.password = existingUser.password;
      }

      if (isEditMode && onEditUser) {
          onEditUser(finalUser);
          setSuccessMsg(`Benutzer '${finalUser.name}' erfolgreich aktualisiert.`);
      } else if (onAddUser) {
          onAddUser(finalUser);
          setSuccessMsg("Benutzer erfolgreich angelegt.");
      }
      
      setIsUserModalOpen(false);
      // Clear toast after 3s
      setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDeleteUserWrapper = (id: string) => {
      if (onDeleteUser && confirm("Diesen Benutzer wirklich löschen?")) {
          onDeleteUser(id);
          setSuccessMsg("Benutzer wurde gelöscht.");
          setTimeout(() => setSuccessMsg(null), 3000);
      }
  };

  const toggleModule = (moduleId: string) => {
      const current = userData.allowedModules || [];
      if (current.includes(moduleId)) {
          setUserData({ ...userData, allowedModules: current.filter(id => id !== moduleId) });
      } else {
          setUserData({ ...userData, allowedModules: [...current, moduleId] });
      }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => { if (e.target.files && e.target.files[0]) { const url = URL.createObjectURL(e.target.files[0]); setSettingsForm(prev => ({ ...prev, logoUrl: url })); } };
  const handleSaveSettings = () => { if (onUpdateCompanySettings) { onUpdateCompanySettings(settingsForm); setSuccessMsg("Einstellungen gespeichert."); setTimeout(() => setSuccessMsg(null), 2000); } };
  const startWhatsAppSession = () => { setWaStatus('scanning'); if (isRealBackend) initWhatsAppSession(); };
  const handleResetSession = async () => { 
      if (confirm("Reset?")) { 
          setWaStatus('disconnected'); 
          setRealQR(null); 
          setPairingCode(null);
          await resetWhatsAppSession(); 
      } 
  };

  const handleRequestPairing = async () => {
      if (!pairingNumber) return alert("Bitte Telefonnummer eingeben (z.B. 43664...)");
      setIsPairing(true);
      await initWhatsAppSession();
      setTimeout(async () => {
          const code = await requestPairingCode(pairingNumber);
          if (code) {
              setPairingCode(code);
          } else {
              alert("Fehler: Konnte Code nicht abrufen. Ist WhatsApp Web am Server gestartet?");
          }
          setIsPairing(false);
      }, 3000);
  };

  const handleDownloadServer = () => {
      const element = document.createElement("a");
      const file = new Blob([getServerJsContent()], {type: 'text/javascript'});
      element.href = URL.createObjectURL(file);
      element.download = "server.js";
      document.body.appendChild(element);
      element.click();
  };

  return (
    <div className="space-y-6 animate-fade-in relative">
        {/* SUCCESS TOAST */}
        {successMsg && (
            <div className="fixed top-20 right-8 bg-green-100 border border-green-200 text-green-800 px-6 py-4 rounded-xl shadow-lg flex items-center z-[60] animate-slide-up">
                <CheckCircle className="w-6 h-6 mr-3 text-green-600" />
                <div>
                    <h4 className="font-bold">Erfolgreich</h4>
                    <p className="text-sm">{successMsg}</p>
                </div>
            </div>
        )}

       {/* Header */}
       <div className="flex flex-col md:flex-row justify-between items-center">
         <h1 className="text-2xl font-bold text-slate-800">System & Einstellungen</h1>
         <div className="flex bg-white p-1 rounded-lg border border-slate-200 overflow-x-auto mt-4 md:mt-0 max-w-full">
            {userRole === 'admin' && (
                <button onClick={() => setActiveTab('company')} className={`px-4 py-2 rounded text-sm font-medium whitespace-nowrap ${activeTab === 'company' ? 'bg-slate-800 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>Firma</button>
            )}
            <button onClick={() => setActiveTab('users')} className={`px-4 py-2 rounded text-sm font-medium whitespace-nowrap ${activeTab === 'users' ? 'bg-slate-800 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>Benutzer</button>
            <button onClick={() => setActiveTab('backup')} className={`px-4 py-2 rounded text-sm font-medium whitespace-nowrap ${activeTab === 'backup' ? 'bg-slate-800 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>Backup</button>
            {userRole === 'admin' && (
                <>
                    <button onClick={() => setActiveTab('whatsapp')} className={`px-4 py-2 rounded text-sm font-medium whitespace-nowrap ${activeTab === 'whatsapp' ? 'bg-slate-800 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>WhatsApp</button>
                    <button onClick={() => setActiveTab('ai')} className={`px-4 py-2 rounded text-sm font-medium whitespace-nowrap ${activeTab === 'ai' ? 'bg-slate-800 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>KI & API</button>
                    <button onClick={() => setActiveTab('server')} className={`px-4 py-2 rounded text-sm font-medium whitespace-nowrap ${activeTab === 'server' ? 'bg-slate-800 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>Server</button>
                    <button onClick={() => setActiveTab('mail')} className={`px-4 py-2 rounded text-sm font-medium whitespace-nowrap ${activeTab === 'mail' ? 'bg-slate-800 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>Mail</button>
                    <button onClick={() => setActiveTab('finapi')} className={`px-4 py-2 rounded text-sm font-medium whitespace-nowrap ${activeTab === 'finapi' ? 'bg-slate-800 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>FinAPI</button>
                </>
            )}
         </div>
       </div>

       {/* TABS */}
       
       {/* --- TAB: FIRMA (Detailed Form) --- */}
       {activeTab === 'company' && (
           <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden animate-fade-in">
               <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
                   <div>
                       <h2 className="text-lg font-bold text-slate-800 flex items-center"><Building2 className="w-5 h-5 mr-2 text-brand-600"/> Firmendaten</h2>
                       <p className="text-sm text-slate-500 mt-1">Diese Daten erscheinen auf allen Rechnungen und Berichten.</p>
                   </div>
                   {settingsForm.logoUrl && <img src={settingsForm.logoUrl} alt="Logo" className="h-12 object-contain bg-white p-1 rounded border border-slate-200" />}
               </div>
               
               <div className="p-8 space-y-8">
                   {/* Logo Upload */}
                   <div className="flex items-center space-x-4 bg-slate-50 p-4 rounded-lg border border-slate-200">
                       <div className="flex-1">
                           <h3 className="text-sm font-bold text-slate-800">Firmenlogo</h3>
                           <p className="text-xs text-slate-500">Wird oben rechts auf Dokumenten angezeigt.</p>
                       </div>
                       <label className="cursor-pointer bg-white border border-slate-300 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center shadow-sm transition-colors">
                           <Upload className="w-4 h-4 mr-2" /> Logo hochladen 
                           <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} />
                       </label>
                   </div>

                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                       {/* Linke Spalte: Allgemein & Adresse */}
                       <div className="space-y-6">
                           <div className="space-y-4">
                               <h3 className="text-sm font-bold text-slate-900 border-b pb-2 uppercase tracking-wider flex items-center"><Briefcase className="w-4 h-4 mr-2"/> Stammdaten</h3>
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 mb-1">Firmenname (Rechtsform)</label>
                                   <input className="w-full border-slate-300 rounded-lg p-2.5 text-sm focus:ring-brand-500 focus:border-brand-500" value={settingsForm.name} onChange={e => setSettingsForm({...settingsForm, name: e.target.value})} placeholder="z.B. Muster GmbH" />
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 mb-1">Geschäftsführer / Inhaber</label>
                                   <input className="w-full border-slate-300 rounded-lg p-2.5 text-sm" value={settingsForm.owner} onChange={e => setSettingsForm({...settingsForm, owner: e.target.value})} placeholder="Max Mustermann" />
                               </div>
                           </div>

                           <div className="space-y-4">
                               <h3 className="text-sm font-bold text-slate-900 border-b pb-2 uppercase tracking-wider flex items-center"><Activity className="w-4 h-4 mr-2"/> Anschrift</h3>
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 mb-1">Straße & Hausnummer</label>
                                   <input className="w-full border-slate-300 rounded-lg p-2.5 text-sm" value={settingsForm.address} onChange={e => setSettingsForm({...settingsForm, address: e.target.value})} placeholder="Musterstraße 1" />
                               </div>
                               <div className="grid grid-cols-3 gap-4">
                                   <div className="col-span-1">
                                       <label className="block text-xs font-bold text-slate-500 mb-1">PLZ</label>
                                       <input className="w-full border-slate-300 rounded-lg p-2.5 text-sm" value={settingsForm.zip} onChange={e => setSettingsForm({...settingsForm, zip: e.target.value})} placeholder="1010" />
                                   </div>
                                   <div className="col-span-2">
                                       <label className="block text-xs font-bold text-slate-500 mb-1">Ort</label>
                                       <input className="w-full border-slate-300 rounded-lg p-2.5 text-sm" value={settingsForm.city} onChange={e => setSettingsForm({...settingsForm, city: e.target.value})} placeholder="Wien" />
                                   </div>
                               </div>
                           </div>
                           
                           <div className="space-y-4">
                               <h3 className="text-sm font-bold text-slate-900 border-b pb-2 uppercase tracking-wider flex items-center"><Phone className="w-4 h-4 mr-2"/> Kommunikation</h3>
                               <div className="grid grid-cols-2 gap-4">
                                   <div>
                                       <label className="block text-xs font-bold text-slate-500 mb-1">E-Mail</label>
                                       <input className="w-full border-slate-300 rounded-lg p-2.5 text-sm" value={settingsForm.email} onChange={e => setSettingsForm({...settingsForm, email: e.target.value})} />
                                   </div>
                                   <div>
                                       <label className="block text-xs font-bold text-slate-500 mb-1">Telefon</label>
                                       <input className="w-full border-slate-300 rounded-lg p-2.5 text-sm" value={settingsForm.phone} onChange={e => setSettingsForm({...settingsForm, phone: e.target.value})} />
                                   </div>
                                   <div className="col-span-2">
                                       <label className="block text-xs font-bold text-slate-500 mb-1">Webseite</label>
                                       <input className="w-full border-slate-300 rounded-lg p-2.5 text-sm" value={settingsForm.website} onChange={e => setSettingsForm({...settingsForm, website: e.target.value})} />
                                   </div>
                               </div>
                           </div>
                       </div>

                       {/* Rechte Spalte: Rechtliches & Bank */}
                       <div className="space-y-6">
                           <div className="space-y-4">
                               <h3 className="text-sm font-bold text-slate-900 border-b pb-2 uppercase tracking-wider flex items-center"><ShieldCheck className="w-4 h-4 mr-2"/> Rechtliche Daten</h3>
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 mb-1">UID-Nummer</label>
                                   <input className="w-full border-slate-300 rounded-lg p-2.5 text-sm" value={settingsForm.uid} onChange={e => setSettingsForm({...settingsForm, uid: e.target.value})} placeholder="ATU..." />
                               </div>
                               <div className="grid grid-cols-2 gap-4">
                                   <div>
                                       <label className="block text-xs font-bold text-slate-500 mb-1">Firmenbuchnummer (FN)</label>
                                       <input className="w-full border-slate-300 rounded-lg p-2.5 text-sm" value={settingsForm.fn} onChange={e => setSettingsForm({...settingsForm, fn: e.target.value})} />
                                   </div>
                                   <div>
                                       <label className="block text-xs font-bold text-slate-500 mb-1">Firmenbuchgericht</label>
                                       <input className="w-full border-slate-300 rounded-lg p-2.5 text-sm" value={settingsForm.court} onChange={e => setSettingsForm({...settingsForm, court: e.target.value})} />
                                   </div>
                               </div>
                           </div>

                           <div className="space-y-4">
                               <h3 className="text-sm font-bold text-slate-900 border-b pb-2 uppercase tracking-wider flex items-center"><Landmark className="w-4 h-4 mr-2"/> Bankverbindung</h3>
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 mb-1">Bankname</label>
                                   <input className="w-full border-slate-300 rounded-lg p-2.5 text-sm" value={settingsForm.bankName} onChange={e => setSettingsForm({...settingsForm, bankName: e.target.value})} />
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 mb-1">IBAN</label>
                                   <input className="w-full border-slate-300 rounded-lg p-2.5 text-sm font-mono" value={settingsForm.iban} onChange={e => setSettingsForm({...settingsForm, iban: e.target.value})} placeholder="AT..." />
                               </div>
                               <div>
                                   <label className="block text-xs font-bold text-slate-500 mb-1">BIC / SWIFT</label>
                                   <input className="w-full border-slate-300 rounded-lg p-2.5 text-sm font-mono" value={settingsForm.bic} onChange={e => setSettingsForm({...settingsForm, bic: e.target.value})} />
                               </div>
                           </div>
                       </div>
                   </div>
               </div>
               <div className="flex justify-end p-6 border-t border-slate-200 bg-slate-50">
                   <button onClick={handleSaveSettings} className="bg-brand-600 text-white px-8 py-3 rounded-lg font-bold shadow-lg hover:bg-brand-700 flex items-center transition-all transform hover:-translate-y-0.5"><Save className="w-5 h-5 mr-2" /> Änderungen speichern</button>
               </div>
           </div>
       )}

       {/* TAB: KI & API */}
       {activeTab === 'ai' && (
           <div className="bg-white rounded-xl border border-slate-200 animate-fade-in p-6">
                <h2 className="font-bold text-lg mb-4 flex items-center text-slate-800">
                    <BrainCircuit className="w-5 h-5 mr-2 text-brand-600"/> KI Integration (Gemini / LLM)
                </h2>
                <div className="space-y-4 max-w-2xl">
                    <div className="bg-slate-50 p-4 rounded border border-slate-200 text-sm mb-4">
                        <p className="font-bold text-slate-700">Google Gemini API</p>
                        <p className="text-slate-500">Benötigt für den KI-Posteingang und den Chat-Assistenten.</p>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">API Provider</label>
                        <select
                            className="w-full border-slate-300 rounded-lg p-2.5 text-sm"
                            value={settingsForm.aiProvider}
                            onChange={e => setSettingsForm({...settingsForm, aiProvider: e.target.value as any})}
                        >
                            <option value="google">Google Gemini (Empfohlen)</option>
                            <option value="openrouter">OpenRouter (Diverse Modelle)</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">API Key</label>
                        <div className="flex space-x-2">
                            <input
                                type="password"
                                className="flex-1 border-slate-300 rounded-lg p-2.5 text-sm font-mono"
                                value={settingsForm.aiApiKey}
                                onChange={e => setSettingsForm({...settingsForm, aiApiKey: e.target.value})}
                                placeholder="sk-..."
                            />
                        </div>
                         <p className="text-[10px] text-slate-400 mt-1">Der Key wird verschlüsselt im Browser/Server gespeichert.</p>
                    </div>

                     <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Modell</label>
                        <input
                            className="w-full border-slate-300 rounded-lg p-2.5 text-sm"
                            value={settingsForm.aiModel}
                            onChange={e => setSettingsForm({...settingsForm, aiModel: e.target.value})}
                            placeholder="gemini-2.0-flash"
                        />
                    </div>

                    <div className="pt-4 flex items-center space-x-4 border-t border-slate-100">
                        <button
                            onClick={async () => {
                                setTestStatus('loading');
                                const res = await testAIConnection(settingsForm);
                                setTestStatus(res.success ? 'success' : 'error');
                                setTestMessage(res.message);
                            }}
                            className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-900"
                        >
                            {testStatus === 'loading' ? 'Teste...' : 'Verbindung testen'}
                        </button>
                        <button onClick={handleSaveSettings} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700">
                             Speichern
                        </button>
                    </div>

                    {testStatus === 'success' && <div className="text-green-600 text-sm font-medium flex items-center"><CheckCircle className="w-4 h-4 mr-1"/> Erfolgreich verbunden!</div>}
                    {testStatus === 'error' && <div className="text-red-600 text-sm font-medium flex items-center"><X className="w-4 h-4 mr-1"/> Fehler: {testMessage}</div>}
                </div>
           </div>
       )}

       {/* TAB: WHATSAPP */}
       {activeTab === 'whatsapp' && (
           <div className="bg-white rounded-xl border border-slate-200 animate-fade-in p-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="font-bold text-lg flex items-center text-slate-800">
                            <Smartphone className="w-5 h-5 mr-2 text-green-600"/> WhatsApp Integration
                        </h2>
                        <p className="text-sm text-slate-500 mt-1">Verbinden Sie Ihr WhatsApp Business Konto für den Chatbot.</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center ${waStatus === 'connected' ? 'bg-green-100 text-green-700' : 'bg-slate-100 text-slate-600'}`}>
                        <div className={`w-2 h-2 rounded-full mr-2 ${waStatus === 'connected' ? 'bg-green-500' : 'bg-slate-400'}`}></div>
                        {waStatus === 'connected' ? 'Verbunden' : waStatus === 'scanning' ? 'Warte auf Scan...' : 'Getrennt'}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-6">
                        <div className="bg-slate-50 p-4 rounded border border-slate-200">
                            <h3 className="font-bold text-sm text-slate-800 mb-2">Verbindungsstatus</h3>
                            {waStatus === 'connected' ? (
                                <div className="text-center py-8">
                                    <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4"/>
                                    <p className="text-green-700 font-bold">WhatsApp ist betriebsbereit</p>
                                    <button onClick={handleResetSession} className="mt-4 text-xs text-red-500 hover:underline">Verbindung trennen & Reset</button>
                                </div>
                            ) : (
                                <div className="text-center py-4">
                                     <p className="text-sm text-slate-600 mb-4">Starten Sie die Session um den QR-Code zu laden.</p>
                                     {waStatus === 'scanning' ? (
                                         <div className="flex flex-col items-center">
                                             {realQR ? (
                                                 <div className="bg-white p-2 rounded shadow-sm">
                                                     <p className="font-mono text-[10px] break-all max-w-[200px] text-slate-400">QR Code Daten empfangen...</p>
                                                 </div>
                                             ) : (
                                                 <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mb-2"/>
                                             )}
                                             <p className="text-xs text-slate-500 mt-2">Lade QR Code...</p>
                                         </div>
                                     ) : (
                                         <button onClick={startWhatsAppSession} className="bg-green-600 text-white px-6 py-2 rounded-lg font-bold shadow-sm hover:bg-green-700">
                                             Session Starten
                                         </button>
                                     )}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="space-y-6">
                         <div className="bg-white border border-slate-200 rounded p-4">
                             <h3 className="font-bold text-sm text-slate-800 mb-4 flex items-center"><Keyboard className="w-4 h-4 mr-2"/> Alternative: Pairing Code</h3>
                             <p className="text-xs text-slate-500 mb-4">Falls der Kamera-Scan nicht möglich ist.</p>
                             
                             {!pairingCode ? (
                                 <div className="space-y-3">
                                     <div>
                                         <label className="block text-xs font-bold text-slate-500 mb-1">Telefonnummer (mit Vorwahl)</label>
                                         <input 
                                            className="w-full border-slate-300 rounded p-2 text-sm" 
                                            placeholder="436641234567"
                                            value={pairingNumber}
                                            onChange={e => setPairingNumber(e.target.value)}
                                         />
                                     </div>
                                     <button 
                                        onClick={handleRequestPairing} 
                                        disabled={isPairing || waStatus === 'connected'}
                                        className="w-full bg-slate-100 text-slate-700 py-2 rounded border border-slate-200 hover:bg-slate-200 text-sm font-medium disabled:opacity-50"
                                     >
                                         {isPairing ? 'Code wird abgerufen...' : 'Code anfordern'}
                                     </button>
                                 </div>
                             ) : (
                                 <div className="text-center bg-slate-50 p-4 rounded border border-slate-200">
                                     <p className="text-xs text-slate-500 mb-2">Geben Sie diesen Code in WhatsApp ein:</p>
                                     <p className="text-2xl font-mono font-bold tracking-widest text-slate-900">{pairingCode}</p>
                                     <button onClick={() => setPairingCode(null)} className="text-xs text-blue-600 mt-2 hover:underline">Abbrechen</button>
                                 </div>
                             )}
                         </div>
                    </div>
                </div>
           </div>
       )}

       {/* TAB: SERVER */}
       {activeTab === 'server' && (
           <div className="bg-white rounded-xl border border-slate-200 animate-fade-in p-6">
                <div className="flex justify-between items-center mb-6">
                   <h2 className="font-bold text-lg flex items-center text-slate-800"><Server className="w-5 h-5 mr-2 text-slate-600"/> Server Management</h2>
                   <div className={`px-3 py-1 rounded text-xs font-bold ${isRealBackend ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}`}>
                       {isRealBackend ? 'Backend Verbunden' : 'Frontend Only Modus'}
                   </div>
                </div>
                <div className="space-y-4">
                    <p className="text-sm text-slate-600">Laden Sie die Server-Software herunter, um WhatsApp und FinAPI im vollen Umfang zu nutzen.</p>
                    <button onClick={handleDownloadServer} className="flex items-center bg-slate-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-800">
                        <Download className="w-4 h-4 mr-2"/> server.js herunterladen
                    </button>
                </div>
           </div>
       )}

       {/* TAB: MAIL */}
       {activeTab === 'mail' && (
           <div className="bg-white rounded-xl border border-slate-200 animate-fade-in p-6">
               <h2 className="font-bold text-lg mb-6 flex items-center text-slate-800"><Mail className="w-5 h-5 mr-2 text-blue-600"/> E-Mail Server (SMTP/IMAP)</h2>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div>
                       <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Posteingang (IMAP)</h3>
                       <div className="space-y-3">
                           <input className="w-full border-slate-300 rounded p-2 text-sm" placeholder="Host (z.B. imap.gmail.com)" value={settingsForm.emailConfig?.incomingHost} onChange={e => setSettingsForm({...settingsForm, emailConfig: {...settingsForm.emailConfig!, incomingHost: e.target.value}})} />
                           <input className="w-full border-slate-300 rounded p-2 text-sm" placeholder="Port (z.B. 993)" value={settingsForm.emailConfig?.incomingPort} onChange={e => setSettingsForm({...settingsForm, emailConfig: {...settingsForm.emailConfig!, incomingPort: e.target.value}})} />
                           <input className="w-full border-slate-300 rounded p-2 text-sm" placeholder="User" value={settingsForm.emailConfig?.incomingUser} onChange={e => setSettingsForm({...settingsForm, emailConfig: {...settingsForm.emailConfig!, incomingUser: e.target.value}})} />
                           <input className="w-full border-slate-300 rounded p-2 text-sm" type="password" placeholder="Passwort" value={settingsForm.emailConfig?.incomingPass} onChange={e => setSettingsForm({...settingsForm, emailConfig: {...settingsForm.emailConfig!, incomingPass: e.target.value}})} />
                       </div>
                   </div>
                   <div>
                       <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4">Postausgang (SMTP)</h3>
                       <div className="space-y-3">
                           <input className="w-full border-slate-300 rounded p-2 text-sm" placeholder="Host (z.B. smtp.gmail.com)" value={settingsForm.emailConfig?.outgoingHost} onChange={e => setSettingsForm({...settingsForm, emailConfig: {...settingsForm.emailConfig!, outgoingHost: e.target.value}})} />
                           <input className="w-full border-slate-300 rounded p-2 text-sm" placeholder="Port (z.B. 587)" value={settingsForm.emailConfig?.outgoingPort} onChange={e => setSettingsForm({...settingsForm, emailConfig: {...settingsForm.emailConfig!, outgoingPort: e.target.value}})} />
                           <input className="w-full border-slate-300 rounded p-2 text-sm" placeholder="User" value={settingsForm.emailConfig?.outgoingUser} onChange={e => setSettingsForm({...settingsForm, emailConfig: {...settingsForm.emailConfig!, outgoingUser: e.target.value}})} />
                           <input className="w-full border-slate-300 rounded p-2 text-sm" type="password" placeholder="Passwort" value={settingsForm.emailConfig?.outgoingPass} onChange={e => setSettingsForm({...settingsForm, emailConfig: {...settingsForm.emailConfig!, outgoingPass: e.target.value}})} />
                       </div>
                   </div>
               </div>
               <div className="mt-6 border-t pt-4 flex justify-end">
                   <button onClick={handleSaveSettings} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Speichern</button>
               </div>
           </div>
       )}

       {/* TAB: FINAPI */}
       {activeTab === 'finapi' && (
           <div className="bg-white rounded-xl border border-slate-200 animate-fade-in p-6">
               <h2 className="font-bold text-lg mb-6 flex items-center text-slate-800"><ShieldCheck className="w-5 h-5 mr-2 text-purple-600"/> FinAPI Access Clients</h2>
               <div className="max-w-xl space-y-4">
                   <div>
                       <label className="block text-xs font-bold text-slate-500 mb-1">Client ID</label>
                       <input className="w-full border-slate-300 rounded p-2 text-sm font-mono" value={settingsForm.finApiConfig?.clientId} onChange={e => setSettingsForm({...settingsForm, finApiConfig: {...settingsForm.finApiConfig!, clientId: e.target.value}})} />
                   </div>
                   <div>
                       <label className="block text-xs font-bold text-slate-500 mb-1">Client Secret</label>
                       <input className="w-full border-slate-300 rounded p-2 text-sm font-mono" type="password" value={settingsForm.finApiConfig?.clientSecret} onChange={e => setSettingsForm({...settingsForm, finApiConfig: {...settingsForm.finApiConfig!, clientSecret: e.target.value}})} />
                   </div>
                   <div className="flex items-center space-x-2 pt-2">
                       <input type="checkbox" checked={settingsForm.finApiConfig?.sandbox} onChange={e => setSettingsForm({...settingsForm, finApiConfig: {...settingsForm.finApiConfig!, sandbox: e.target.checked}})} />
                       <span className="text-sm">Sandbox Mode verwenden</span>
                   </div>
                   <div className="pt-4">
                        <button onClick={handleSaveSettings} className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Speichern</button>
                   </div>
               </div>
           </div>
       )}

       {activeTab === 'backup' && (
           <div className="p-6 bg-white rounded-xl border border-slate-200">
               <h2 className="font-bold mb-4 text-red-600 flex items-center"><AlertTriangle className="w-5 h-5 mr-2"/> Datenbank Reset</h2>
               <p className="text-sm text-slate-600 mb-6">Achtung: Dies setzt die gesamte Anwendung auf den Auslieferungszustand zurück. Alle Daten gehen verloren.</p>
               <button onClick={onFactoryReset} className="bg-red-50 text-red-600 px-4 py-2 rounded border border-red-200 hover:bg-red-100 font-bold">Alles zurücksetzen</button>
           </div>
       )}

       {activeTab === 'users' && (
           <div className="bg-white rounded-xl border border-slate-200 animate-fade-in">
               <div className="p-4 border-b flex justify-between items-center bg-slate-50">
                   <h2 className="font-bold text-slate-800">Benutzerverwaltung</h2>
                   <button onClick={openAddUserModal} className="bg-brand-600 text-white px-3 py-1.5 rounded-lg text-sm hover:bg-brand-700 flex items-center"><UserPlus className="w-4 h-4 mr-2"/> Neuer Benutzer</button>
               </div>
               <table className="w-full text-sm text-left">
                   <thead className="bg-white border-b"><tr><th className="p-4">Name / Email</th><th className="p-4">Rolle</th><th className="p-4">Rechte</th><th className="p-4 text-right">Aktion</th></tr></thead>
                   <tbody>{users.map(u => (
                       <tr key={u.id} className="border-b last:border-0 hover:bg-slate-50">
                           <td className="p-4"><span className="font-medium text-slate-900">{u.name}</span><br/><span className="text-xs text-slate-500">{u.email}</span></td>
                           <td className="p-4 capitalize">{u.role === 'admin' ? <span className="bg-purple-100 text-purple-800 px-2 py-0.5 rounded text-xs font-bold">Administrator</span> : <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded text-xs">Mitarbeiter</span>}</td>
                           <td className="p-4">
                               <div className="flex flex-col space-y-1">
                                   <span className="text-xs text-slate-600">Zugriff: {u.allowedModules?.length || 'Alle'} Module</span>
                                   {u.canApprove && <span className="text-xs text-green-600 font-medium flex items-center"><CheckCircle className="w-3 h-3 mr-1"/> Darf freigeben</span>}
                               </div>
                           </td>
                           <td className="p-4 text-right">
                               <button onClick={() => openEditUserModal(u)} className="mr-2 text-slate-400 hover:text-brand-600 p-2 hover:bg-slate-100 rounded" title="Bearbeiten"><Edit2 size={16}/></button>
                               <button onClick={() => handleDeleteUserWrapper(u.id)} className="text-slate-400 hover:text-red-500 p-2 hover:bg-slate-100 rounded" title="Löschen"><Trash2 size={16}/></button>
                           </td>
                       </tr>
                   ))}</tbody>
               </table>
           </div>
       )}

       {/* User Modal */}
       {isUserModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm animate-fade-in">
               <div className="bg-white p-0 rounded-xl w-full max-w-2xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col">
                   <div className="flex justify-between items-center p-6 border-b bg-slate-50">
                       <h3 className="font-bold text-xl text-slate-800">{isEditMode ? 'Benutzer bearbeiten' : 'Neuer Benutzer'}</h3>
                       <button onClick={() => setIsUserModalOpen(false)}><X className="text-slate-400 hover:text-slate-600"/></button>
                   </div>
                   
                   <div className="p-6 overflow-y-auto">
                       <div className="grid grid-cols-2 gap-6">
                           <div className="col-span-2 md:col-span-1">
                               <label className="block text-xs font-bold text-slate-500 mb-1">Name</label>
                               <input className="w-full border border-slate-300 p-2.5 rounded-lg" placeholder="Max Mustermann" value={userData.name || ''} onChange={e => setUserData({...userData, name: e.target.value})} />
                           </div>
                           <div className="col-span-2 md:col-span-1">
                               <label className="block text-xs font-bold text-slate-500 mb-1">Email (Login)</label>
                               <input className="w-full border border-slate-300 p-2.5 rounded-lg" placeholder="email@firma.at" value={userData.email || ''} onChange={e => setUserData({...userData, email: e.target.value})} />
                           </div>
                           <div className="col-span-2 md:col-span-1">
                               <label className="block text-xs font-bold text-slate-500 mb-1">Passwort</label>
                               <input className="w-full border border-slate-300 p-2.5 rounded-lg" type="password" placeholder={isEditMode ? "Unverändert lassen" : "Vergeben"} value={userData.password || ''} onChange={e => setUserData({...userData, password: e.target.value})} />
                           </div>
                           <div className="col-span-2 md:col-span-1">
                               <label className="block text-xs font-bold text-slate-500 mb-1">Rolle</label>
                               <select className="w-full border border-slate-300 p-2.5 rounded-lg" value={userData.role} onChange={e => setUserData({...userData, role: e.target.value as UserRole})}>
                                   <option value="user">Mitarbeiter</option>
                                   <option value="admin">Administrator</option>
                               </select>
                           </div>
                       </div>

                       <div className="mt-8">
                           <h4 className="text-sm font-bold text-slate-800 mb-4 flex items-center border-b pb-2"><ShieldCheck className="w-4 h-4 mr-2 text-brand-600"/> 2.2 Berechtigungen & Zugriff</h4>
                           
                           {/* 2.1 Freigaberechte Checkbox */}
                           <div className="mb-6 bg-yellow-50 p-4 rounded-lg border border-yellow-200 flex items-start">
                               <input 
                                    type="checkbox" 
                                    id="canApprove"
                                    className="mt-1 mr-3 w-5 h-5 text-brand-600 rounded focus:ring-brand-500 border-gray-300"
                                    checked={userData.canApprove || false}
                                    onChange={(e) => setUserData({...userData, canApprove: e.target.checked})}
                               />
                               <label htmlFor="canApprove">
                                   <span className="font-bold text-sm text-slate-800 block">Freigaberechte erteilen</span>
                                   <span className="text-xs text-slate-600">Dieser Benutzer darf Rechnungen aus dem Entwurf holen, genehmigen und endgültig löschen.</span>
                               </label>
                           </div>

                           <p className="text-xs font-bold text-slate-500 mb-3 uppercase">Modulzugriff (Checkboxen)</p>
                           <div className="grid grid-cols-2 gap-3">
                               {NAV_ITEMS.map(item => (
                                   <label key={item.id} className="flex items-center space-x-2 cursor-pointer select-none">
                                       <input 
                                            type="checkbox" 
                                            className="w-4 h-4 text-brand-600 rounded focus:ring-brand-500 border-gray-300"
                                            checked={userData.allowedModules?.includes(item.id)}
                                            onChange={() => toggleModule(item.id)}
                                       />
                                       <span className="text-sm text-slate-700">{item.label}</span>
                                   </label>
                               ))}
                           </div>
                       </div>
                   </div>

                   <div className="flex justify-end space-x-2 p-6 border-t bg-slate-50">
                       <button onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 text-slate-500 hover:bg-white border border-transparent hover:border-slate-300 rounded-lg text-sm font-medium">Abbrechen</button>
                       <button onClick={handleSaveUser} className="bg-slate-900 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-slate-800 shadow-lg">Speichern</button>
                   </div>
               </div>
           </div>
       )}
    </div>
  );
};

export default System;
