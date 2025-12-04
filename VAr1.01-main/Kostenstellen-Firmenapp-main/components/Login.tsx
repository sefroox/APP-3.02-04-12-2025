
import React, { useState } from 'react';
import { User } from '../types';
import { Lock, User as UserIcon, ArrowRight, AlertCircle, Mail, ArrowLeft, CheckCircle } from 'lucide-react';

interface LoginProps {
  users: User[];
  onLogin: (user: User) => void;
  companyName?: string;
  logoUrl?: string;
}

const Login: React.FC<LoginProps> = ({ users, onLogin, companyName, logoUrl }) => {
  const [view, setView] = useState<'login' | 'forgot-password'>('login');
  
  // Login State - Pre-filled for easier testing
  const [username, setUsername] = useState('bars.b@live.at');
  const [password, setPassword] = useState('9747597');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Forgot Password State
  const [resetEmail, setResetEmail] = useState('');
  const [resetStatus, setResetStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Simulate network delay for realism
    setTimeout(() => {
      // Check credentials
      const user = users.find(u => 
        (u.email.toLowerCase() === username.toLowerCase() || u.name.toLowerCase() === username.toLowerCase()) && 
        u.password === password
      );

      if (user) {
        onLogin(user);
      } else {
        setError('Ungültige Anmeldedaten. Bitte überprüfen Sie Benutzername und Passwort.');
        setIsLoading(false);
      }
    }, 800);
  };

  const handleResetPassword = (e: React.FormEvent) => {
      e.preventDefault();
      setResetStatus('loading');
      
      setTimeout(() => {
          const userExists = users.find(u => u.email.toLowerCase() === resetEmail.toLowerCase());
          if (userExists) {
              setResetStatus('success');
          } else {
              setResetStatus('error');
          }
      }, 1000);
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4 font-sans">
       <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col md:flex-row animate-fade-in">
          
          <div className="w-full p-8 md:p-10">
             <div className="text-center mb-8">
                {logoUrl ? (
                    <img src={logoUrl} alt={companyName} className="h-24 object-contain mx-auto mb-4" />
                ) : (
                    <div className="w-16 h-16 bg-brand-600 rounded-xl flex items-center justify-center text-white text-2xl font-bold shadow-lg mx-auto mb-4">
                       {companyName ? companyName.substring(0,1).toUpperCase() : 'N'}
                    </div>
                )}
                
                <h1 className="text-2xl font-bold text-slate-900">
                    {view === 'login' ? 'Willkommen zurück' : 'Passwort wiederherstellen'}
                </h1>
                <p className="text-slate-500 text-sm mt-2">{companyName || 'NexGen Management ERP'}</p>
             </div>

             {view === 'login' ? (
                 /* LOGIN FORM */
                 <form onSubmit={handleSubmit} className="space-y-5">
                    {error && (
                       <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start">
                          <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                          {error}
                       </div>
                    )}
    
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Benutzername / Email</label>
                       <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                             <UserIcon className="w-5 h-5" />
                          </div>
                          <input 
                            type="text" 
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-all outline-none text-slate-800" 
                            placeholder="z.B. admin"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                          />
                       </div>
                    </div>
    
                    <div className="space-y-1">
                       <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Passwort</label>
                       <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                             <Lock className="w-5 h-5" />
                          </div>
                          <input 
                            type="password" 
                            className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-all outline-none text-slate-800" 
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required
                          />
                       </div>
                       <div className="text-right pt-1">
                           <button type="button" onClick={() => setView('forgot-password')} className="text-xs text-brand-600 hover:text-brand-800 hover:underline">
                               Passwort vergessen?
                           </button>
                       </div>
                    </div>
    
                    <button 
                      type="submit" 
                      disabled={isLoading}
                      className={`w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-lg shadow-brand transition-all transform hover:-translate-y-0.5 flex justify-center items-center ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
                    >
                      {isLoading ? (
                         <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      ) : (
                         <>Anmelden <ArrowRight className="w-5 h-5 ml-2" /></>
                      )}
                    </button>
                 </form>
             ) : (
                 /* FORGOT PASSWORD FORM */
                 <div className="space-y-5 animate-slide-up">
                     {resetStatus === 'success' ? (
                         <div className="text-center space-y-4">
                             <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                                 <CheckCircle className="w-6 h-6 text-green-600" />
                             </div>
                             <div>
                                 <h3 className="font-bold text-slate-800">E-Mail gesendet!</h3>
                                 <p className="text-sm text-slate-600 mt-2">
                                     Wir haben einen Link zum Zurücksetzen des Passworts an <strong>{resetEmail}</strong> gesendet.
                                 </p>
                             </div>
                             <button onClick={() => setView('login')} className="text-brand-600 font-medium hover:underline text-sm">
                                 Zurück zum Login
                             </button>
                         </div>
                     ) : (
                         <form onSubmit={handleResetPassword} className="space-y-5">
                             <p className="text-sm text-slate-600 text-center">
                                 Geben Sie Ihre E-Mail-Adresse ein. Wir senden Ihnen Anweisungen, wie Sie Ihr Passwort zurücksetzen können.
                             </p>
                             
                             {resetStatus === 'error' && (
                                <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm flex items-start">
                                    <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                                    E-Mail Adresse nicht gefunden.
                                </div>
                             )}

                             <div className="space-y-1">
                               <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">E-Mail Adresse</label>
                               <div className="relative">
                                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                                     <Mail className="w-5 h-5" />
                                  </div>
                                  <input 
                                    type="email" 
                                    className="w-full pl-10 pr-4 py-3 rounded-lg border border-slate-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 transition-all outline-none text-slate-800" 
                                    placeholder="ihre.email@firma.at"
                                    value={resetEmail}
                                    onChange={(e) => setResetEmail(e.target.value)}
                                    required
                                  />
                               </div>
                            </div>

                            <button 
                              type="submit" 
                              disabled={resetStatus === 'loading'}
                              className={`w-full bg-slate-800 hover:bg-slate-900 text-white font-bold py-3 rounded-lg transition-all transform hover:-translate-y-0.5 flex justify-center items-center ${resetStatus === 'loading' ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                              {resetStatus === 'loading' ? (
                                 <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                              ) : (
                                 <>Link senden <Mail className="w-4 h-4 ml-2" /></>
                              )}
                            </button>
                            
                            <div className="text-center">
                                <button type="button" onClick={() => setView('login')} className="text-sm text-slate-500 hover:text-slate-800 flex items-center justify-center mx-auto">
                                    <ArrowLeft className="w-4 h-4 mr-1" /> Zurück zum Login
                                </button>
                            </div>
                         </form>
                     )}
                 </div>
             )}

             <div className="mt-8 text-center text-xs text-slate-400">
                <p>&copy; {new Date().getFullYear()} {companyName || 'NexGen ERP Solutions'}. Alle Rechte vorbehalten.</p>
                <p className="mt-1">Sichere SSL Verbindung</p>
             </div>
          </div>
       </div>
    </div>
  );
};

export default Login;
