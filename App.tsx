import React, { useState, useEffect, createContext, useContext } from 'react';
import { User, DataProvider } from './types';
import { localProvider } from './services/localProvider';
import { LoginPage } from './pages/LoginPage';
import { Dashboard } from './pages/Dashboard';
import { TeamsPage } from './pages/TeamsPage';
import { PlayersPage } from './pages/PlayersPage';
import { TournamentsPage } from './pages/TournamentsPage';
import { MatchWizard } from './pages/MatchWizard';
import { HistoryPage } from './pages/HistoryPage';
import { WhiteboardPage } from './pages/WhiteboardPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { ExportImportPage } from './pages/ExportImportPage';

// UI Context
const UIContext = createContext<{
  confirm: (message: string, onConfirm: () => void) => void;
  alert: (message: string) => void;
  logo: string;
  setLogo: (logo: string) => void;
}>({ confirm: () => {}, alert: () => {}, logo: '', setLogo: () => {} });

const AuthContext = createContext<{
  user: User | null;
  setUser: (u: User | null) => void;
  loading: boolean;
}>({ user: null, setUser: () => {}, loading: true });

const DataContext = createContext<DataProvider>(localProvider);

export const useAuth = () => useContext(AuthContext);
export const useData = () => useContext(DataContext);
export const useUI = () => useContext(UIContext);

// Logo por defecto como SVG inline base64 (offline)
const DEFAULT_LOGO = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgdmlld0JveD0iMCAwIDIwMCAyMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMTAwIiBjeT0iMTAwIiByPSI4MCIgZmlsbD0iIzI1NjNlYiIvPjx0ZXh0IHg9IjEwMCIgeT0iMTE1IiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iNjAiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IndoaXRlIiBmb250LXdlaWdodD0iYm9sZCI+VjwvdGV4dD48L3N2Zz4=';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState<string>('home');
  const [pageParams, setPageParams] = useState<any>(null);
  const [logo, setLogoState] = useState<string>(localStorage.getItem('vc_logo') || DEFAULT_LOGO);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [modal, setModal] = useState<{ show: boolean; message: string; type: 'alert' | 'confirm'; onConfirm?: () => void } | null>(null);

  // Efecto para detectar conexión
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const init = async () => {
      const u = localProvider.auth.getCurrentUser();
      setUser(u);
      setLoading(false);
    };
    init();
  }, []);

  const setLogo = (newLogo: string) => {
    localStorage.setItem('vc_logo', newLogo);
    setLogoState(newLogo);
  };

  const navigate = (page: string, params: any = null) => {
    setCurrentPage(page);
    setPageParams(params);
  };

  const ui = {
    confirm: (message: string, onConfirm: () => void) => setModal({ show: true, message, type: 'confirm', onConfirm }),
    alert: (message: string) => setModal({ show: true, message, type: 'alert' }),
    logo,
    setLogo
  };

  // Loading screen mejorado con estado offline
  if (loading) return (
    <div className="h-full flex items-center justify-center bg-slate-950 text-white flex-col p-6">
      <div className="text-center">
        {!isOnline && (
          <div className="mb-4 p-3 bg-amber-900/30 border border-amber-500/30 rounded-xl">
            <p className="text-amber-400 text-sm font-bold">Modo offline activado</p>
            <p className="text-amber-500/80 text-xs mt-1">La app funciona sin conexión</p>
          </div>
        )}
        <div className="text-xl font-bold mb-2">Cargando VolleyCoach Pro...</div>
        <div className="text-slate-500 text-sm">App offline ready</div>
        <div className="mt-4">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      </div>
    </div>
  );

  if (!user) return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
        <UIContext.Provider value={ui}>
            <LoginPage />
        </UIContext.Provider>
    </AuthContext.Provider>
  );

  return (
    <AuthContext.Provider value={{ user, setUser, loading }}>
      <DataContext.Provider value={localProvider}>
        <UIContext.Provider value={ui}>
            <div className="h-full w-full flex flex-col bg-slate-950 text-slate-100 overflow-hidden">
                {/* Banner de estado offline */}
                {!isOnline && (
                  <div className="bg-amber-900/50 border-b border-amber-700/30 px-4 py-2 text-center">
                    <p className="text-amber-300 text-xs font-bold uppercase tracking-widest">
                      ⚡ Modo offline - Trabajando localmente
                    </p>
                  </div>
                )}
                
                {currentPage !== 'home' && currentPage !== 'whiteboard' && (
                    <header className="bg-slate-900/80 backdrop-blur-md flex-shrink-0 border-b border-slate-800 px-4 py-2 flex items-center h-12">
                        <button onClick={() => navigate('home')} className="p-2 hover:bg-slate-800 rounded-xl transition-colors">
                            <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"/>
                            </svg>
                        </button>
                        <span className="ml-2 font-black uppercase text-[10px] tracking-widest text-slate-500">Volver</span>
                    </header>
                )}
                
                <main className="flex-1 overflow-hidden relative w-full h-full">
                    {renderPage(currentPage, pageParams, navigate)}
                </main>
            
                {modal?.show && (
                    <div className="fixed inset-0 z-[999] bg-black/70 flex items-center justify-center p-4 backdrop-blur-sm">
                        <div className="bg-slate-800 p-6 rounded-3xl w-full max-w-xs border border-slate-700 shadow-2xl">
                            <p className="text-slate-100 mb-6 text-center font-bold text-sm leading-relaxed">{modal.message}</p>
                            <div className="flex gap-3">
                                {modal.type === 'confirm' && (
                                    <button onClick={() => setModal(null)} className="flex-1 py-3 rounded-2xl bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest">Cancelar</button>
                                )}
                                <button 
                                    onClick={() => {
                                        if (modal.onConfirm) modal.onConfirm();
                                        setModal(null);
                                    }} 
                                    className="flex-1 py-3 rounded-2xl bg-blue-600 text-white font-black text-[10px] uppercase tracking-widest shadow-lg"
                                >
                                    {modal.type === 'alert' ? 'Aceptar' : 'Confirmar'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </UIContext.Provider>
      </DataContext.Provider>
    </AuthContext.Provider>
  );
}

function renderPage(currentPage: string, params: any, navigate: any) {
  switch (currentPage) {
    case 'home': return <Dashboard navigate={navigate} />;
    case 'teams': return <TeamsPage navigate={navigate} />;
    case 'players': return <PlayersPage navigate={navigate} />;
    case 'tournaments': return <TournamentsPage navigate={navigate} />;
    case 'match-wizard': return <MatchWizard navigate={navigate} matchId={params?.matchId} />;
    case 'history': return <HistoryPage navigate={navigate} />;
    case 'whiteboard': return <WhiteboardPage navigate={navigate} params={params} />;
    case 'admin-users': return <AdminUsersPage navigate={navigate} />;
    case 'export-import': return <ExportImportPage navigate={navigate} />;
    default: return <Dashboard navigate={navigate} />;
  }
}