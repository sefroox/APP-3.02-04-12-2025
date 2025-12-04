
import React, { useState, useRef } from 'react';
import { Inbox, UploadCloud, Check, AlertCircle, Wand2, Mail, Loader2 } from 'lucide-react';
import { analyzeInvoiceText, analyzeInvoiceImage } from '../services/geminiService';
import { Invoice, InvoiceStatus, CompanySettings } from '../types';

interface AIInboxProps {
  onInvoiceCreated: (invoice: Invoice) => void;
  companySettings?: CompanySettings; 
}

const AIInbox: React.FC<AIInboxProps> = ({ onInvoiceCreated, companySettings }) => {
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<Partial<Invoice> | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Handle File Upload (Real Vision API)
  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files[0]) {
          const file = e.target.files[0];
          setIsAnalyzing(true);
          setAnalysisResult(null);

          const reader = new FileReader();
          reader.onload = async (event) => {
              const base64Data = event.target?.result as string;
              // Use real service
              const result = await analyzeInvoiceImage(base64Data, file.type, companySettings);
              setAnalysisResult(result);
              setIsAnalyzing(false);
          };
          reader.readAsDataURL(file);
      }
  };

  const handleConfirm = () => {
    if (!analysisResult) return;
    const newInvoice: Invoice = {
      id: `ai-inv-${Date.now()}`,
      type: 'incoming',
      number: analysisResult.number || `AI-${Math.floor(Math.random() * 10000)}`,
      supplier: analysisResult.supplier || 'Unbekannt',
      amount: analysisResult.amount || 0,
      date: analysisResult.date || new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
      status: InvoiceStatus.PENDING_APPROVAL,
      category: analysisResult.category || 'Sonstiges',
      aiSuggestion: analysisResult.aiSuggestion,
      createdBy: 'KI Posteingang'
    };
    onInvoiceCreated(newInvoice);
    setAnalysisResult(null);
  };

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center"><Wand2 className="w-6 h-6 mr-2 text-purple-600" /> KI-Posteingang</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
           <h3 className="font-semibold text-slate-800 mb-4">Upload & Analyse</h3>
           <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 flex flex-col items-center justify-center text-center">
                <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleFileSelect} />
                <button onClick={() => fileInputRef.current?.click()} className="bg-brand-50 text-brand-600 px-6 py-3 rounded-lg font-medium mb-2 hover:bg-brand-100 transition-colors">Datei wählen</button>
                <p className="text-xs text-slate-400">JPG, PNG (Max 10MB)</p>
           </div>
        </div>

        <div className="space-y-6">
          {!analysisResult && !isAnalyzing && (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl p-12">
               <Inbox className="w-12 h-12 mb-2 opacity-50" />
               <p>Warte auf Beleg...</p>
            </div>
          )}

          {isAnalyzing && (
             <div className="h-full flex flex-col items-center justify-center p-12 bg-white rounded-xl border border-slate-100">
                <Loader2 className="animate-spin w-10 h-10 text-purple-600 mb-4" />
                <p className="text-slate-600 font-medium">Gemini Vision analysiert...</p>
             </div>
          )}

          {analysisResult && (
            <div className="bg-white rounded-xl shadow-lg border border-purple-100 overflow-hidden animate-slide-up">
               <div className="bg-purple-600 p-4 text-white flex justify-between items-center">
                 <span className="font-semibold flex items-center"><Wand2 className="w-4 h-4 mr-2" /> Ergebnis</span>
               </div>
               <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                     <div className="p-3 bg-slate-50 rounded-lg">
                        <span className="text-xs text-slate-500 block uppercase">Lieferant</span>
                        <span className="font-bold text-slate-900">{analysisResult.supplier || '-'}</span>
                     </div>
                     <div className="p-3 bg-slate-50 rounded-lg">
                        <span className="text-xs text-slate-500 block uppercase">Betrag</span>
                        <span className="font-bold text-xl text-slate-900">€ {analysisResult.amount?.toFixed(2)}</span>
                     </div>
                  </div>
                  {analysisResult.aiSuggestion && <div className="bg-yellow-50 p-3 rounded text-sm text-yellow-800">{analysisResult.aiSuggestion}</div>}
                  <button onClick={handleConfirm} className="w-full py-3 bg-brand-600 text-white rounded-lg font-medium hover:bg-brand-700 flex justify-center items-center">
                    <Check className="w-4 h-4 mr-2" /> Bestätigen & Buchen
                  </button>
               </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AIInbox;
