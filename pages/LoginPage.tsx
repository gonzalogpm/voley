
import React, { useState } from 'react';
import { useAuth, useData } from '../App';

export const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState('');
  const { setUser } = useAuth();
  const data = useData();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const u = await data.auth.login(email, password);
      setUser(u);
    } catch (err: any) {
      setError(err.message || 'Error al iniciar sesión');
    }
  };

  return (
    <div className="h-screen flex items-center justify-center bg-slate-950 p-4 overflow-hidden">
      <div className="bg-slate-900 p-8 rounded-[40px] shadow-2xl w-full max-w-sm border border-slate-800">
        <div className="flex flex-col items-center mb-10 text-center">
          <h1 className="text-3xl font-black text-white tracking-tighter italic uppercase">VolleyCoach Pro</h1>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <input 
            type="text" 
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full px-5 py-4 bg-slate-800 text-white rounded-2xl focus:ring-4 focus:ring-blue-500/20 border-none outline-none font-bold text-sm transition-all" 
            placeholder="Email / Usuario"
          />
          <input 
            type="password" 
            value={password}
            onChange={e => setPassword(e.target.value)}
            className="w-full px-5 py-4 bg-slate-800 text-white rounded-2xl focus:ring-4 focus:ring-blue-500/20 border-none outline-none font-bold text-sm transition-all"
            placeholder="Contraseña"
          />
          {error && <p className="text-red-400 text-[10px] font-black uppercase text-center bg-red-400/10 py-2 rounded-xl">{error}</p>}
          <button 
            type="submit"
            className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl active:scale-[0.98] transition-all mt-2 uppercase text-xs tracking-widest"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};
