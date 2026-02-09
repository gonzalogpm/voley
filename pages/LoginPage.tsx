import React, { useState, useEffect } from 'react';
import { useAuth, useData, useUI } from '../App';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const { setUser } = useAuth();
  const data = useData();
  const ui = useUI();

  // Solo cargar datos recordados si el usuario lo eligió
  useEffect(() => {
    const remembered = localStorage.getItem('vc_remember');
    if (remembered === 'true') {
      const savedEmail = localStorage.getItem('vc_saved_email');
      const savedPassword = localStorage.getItem('vc_saved_password');
      
      if (savedEmail && savedPassword) {
        setEmail(savedEmail);
        setPassword(savedPassword);
        setRememberMe(true);
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const u = await data.auth.login(email, password);
      setUser(u);
      
      // Guardar o limpiar datos según "Recordarme"
      if (rememberMe) {
        localStorage.setItem('vc_remember', 'true');
        localStorage.setItem('vc_saved_email', email);
        localStorage.setItem('vc_saved_password', password);
      } else {
        localStorage.removeItem('vc_remember');
        localStorage.removeItem('vc_saved_email');
        localStorage.removeItem('vc_saved_password');
      }
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    }
  };

  const handleClearSaved = () => {
    localStorage.removeItem('vc_remember');
    localStorage.removeItem('vc_saved_email');
    localStorage.removeItem('vc_saved_password');
    setEmail('');
    setPassword('');
    setRememberMe(false);
    ui.alert('Datos guardados eliminados');
  };

  return (
    <div className="h-screen flex items-center justify-center bg-slate-950 p-4 overflow-hidden">
      <div className="bg-slate-900 p-8 rounded-[40px] shadow-2xl w-full max-w-sm border border-slate-800">
        <div className="flex flex-col items-center mb-10 text-center">
          <div className="mb-4">
            <div className="w-16 h-16 rounded-2xl bg-blue-600 flex items-center justify-center mx-auto mb-2">
              <span className="text-white text-2xl font-black">V</span>
            </div>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tighter italic uppercase">VolleyCoach Pro</h1>
          <p className="text-slate-500 text-xs mt-2 uppercase tracking-widest">Gestión offline de equipos</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <input 
              type="text" 
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full px-5 py-4 bg-slate-800 text-white rounded-2xl focus:ring-4 focus:ring-blue-500/20 border-none outline-none font-bold text-sm transition-all" 
              placeholder="Email / Usuario"
              autoComplete="username"
            />
          </div>
          
          <div>
            <input 
              type="password" 
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full px-5 py-4 bg-slate-800 text-white rounded-2xl focus:ring-4 focus:ring-blue-500/20 border-none outline-none font-bold text-sm transition-all"
              placeholder="Contraseña"
              autoComplete="current-password"
            />
          </div>
          
          {/* Opción "Recordarme" */}
          <div className="flex items-center justify-between px-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-600 focus:ring-blue-500 focus:ring-2"
              />
              <span className="text-slate-400 text-xs font-medium uppercase tracking-widest">Recordarme</span>
            </label>
            
            {localStorage.getItem('vc_remember') === 'true' && (
              <button
                type="button"
                onClick={handleClearSaved}
                className="text-slate-500 hover:text-rose-500 text-[10px] font-black uppercase tracking-widest"
              >
                Limpiar datos
              </button>
            )}
          </div>
          
          {error && (
            <div className="p-3 bg-red-400/10 border border-red-500/30 rounded-xl">
              <p className="text-red-400 text-[10px] font-black uppercase text-center">{error}</p>
            </div>
          )}
          
          <button 
            type="submit"
            className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl active:scale-[0.98] transition-all mt-2 uppercase text-xs tracking-widest hover:bg-blue-700"
          >
            Entrar a la App
          </button>
        </form>

        {/* Credenciales de ejemplo */}
        <div className="mt-8 pt-6 border-t border-slate-800">
          <p className="text-slate-600 text-[10px] font-black uppercase tracking-widest text-center mb-2">Credenciales de prueba</p>
          <div className="space-y-2 text-center">
            <div>
              <p className="text-slate-500 text-[9px] uppercase tracking-widest">Administrador</p>
              <p className="text-slate-400 text-xs font-mono">admin / admin</p>
            </div>
            <div>
              <p className="text-slate-500 text-[9px] uppercase tracking-widest">Entrenador (si creas uno)</p>
              <p className="text-slate-400 text-xs">email / contraseña que definas</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
