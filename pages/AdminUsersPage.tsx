
import React, { useState, useEffect } from 'react';
import { useData, useUI } from '../App';
import { User } from '../types';

export const AdminUsersPage: React.FC<{ navigate: any }> = ({ navigate }) => {
  const data = useData();
  const ui = useUI();
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const res = await data.auth.listUsers();
    setUsers(res);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    await data.auth.createUser({ email, password, role: 'comun' });
    setEmail('');
    setPassword('');
    loadUsers();
  };

  const handleDelete = (id: string) => {
    ui.confirm('¿Eliminar usuario y todos sus datos?', async () => {
        await data.auth.deleteUser(id);
        loadUsers();
    });
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-black italic tracking-tight mb-8 text-rose-500">Administrar Usuarios</h1>
      
      <form onSubmit={handleCreate} className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl mb-10 space-y-4">
        <h2 className="font-black text-white text-sm uppercase tracking-widest ml-1">Nuevo Entrenador</h2>
        <input className="w-full p-4 bg-slate-800 border-none rounded-2xl text-white outline-none focus:ring-4 focus:ring-rose-500/20 transition-all shadow-xl" placeholder="Email / Usuario" value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="w-full p-4 bg-slate-800 border-none rounded-2xl text-white outline-none focus:ring-4 focus:ring-rose-500/20 transition-all shadow-xl" type="password" placeholder="Contraseña" value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit" className="w-full bg-rose-600 text-white p-4 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">Crear Acceso</button>
      </form>

      <div className="space-y-4">
        {users.map(u => (
          <div key={u.id} className="bg-slate-900 p-5 rounded-3xl border border-white/5 flex justify-between items-center shadow-lg transition-all">
            <div>
              <p className="font-black text-white">{u.email}</p>
              <p className={`text-[10px] font-black uppercase tracking-widest mt-1 ${u.role === 'admin' ? 'text-rose-500' : 'text-slate-500'}`}>{u.role}</p>
            </div>
            {u.role !== 'admin' && (
                <button onClick={() => handleDelete(u.id)} className="bg-rose-600/10 text-rose-500 px-4 py-2 rounded-xl text-xs font-black uppercase border border-rose-500/20 hover:bg-rose-600 hover:text-white transition-all">Eliminar</button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
