
import React, { useState, useEffect } from 'react';
import { useData, useAuth, useUI } from '../App';
import { Tournament } from '../types';

export const TournamentsPage: React.FC<{ navigate: any }> = ({ navigate }) => {
  const { user } = useAuth();
  const data = useData();
  const ui = useUI();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', date: new Date().toISOString().split('T')[0] });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    if (!user) return;
    const res = await data.tournaments.getAll(user.id);
    setTournaments(res.sort((a,b) => b.createdAt - a.createdAt));
  };

  const handleEdit = (t: Tournament) => {
    setFormData({ name: t.name, date: t.date });
    setEditingId(t.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    ui.confirm('¿Eliminar torneo?', async () => {
        await data.tournaments.delete(id);
        loadAll();
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (editingId) {
        await data.tournaments.update(editingId, formData);
    } else {
        await data.tournaments.create({ ...formData, userId: user.id } as Tournament);
    }
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: '', date: new Date().toISOString().split('T')[0] });
    loadAll();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-black italic tracking-tight">Torneos</h1>
        <button onClick={() => { setShowForm(true); setEditingId(null); setFormData({ name: '', date: new Date().toISOString().split('T')[0] }); }} className="bg-blue-600 text-white font-black px-6 py-2 rounded-2xl shadow-lg active:scale-95 transition-all text-sm uppercase">Nuevo</button>
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/80 z-[100] p-4 flex items-center justify-center backdrop-blur-md">
          <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-sm space-y-5 shadow-2xl">
            <h2 className="text-xl font-black text-white">{editingId ? 'Editar' : 'Nuevo'} Torneo</h2>
            <input 
              required 
              placeholder="Nombre Torneo" 
              className="w-full p-4 bg-slate-800 text-white border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/20" 
              value={formData.name} 
              onChange={e => setFormData({...formData, name: e.target.value})} 
            />
            <input 
              type="date" 
              className="w-full p-4 bg-slate-800 text-white border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/20" 
              value={formData.date} 
              onChange={e => setFormData({...formData, date: e.target.value})} 
            />
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-800 text-slate-400 py-3 rounded-2xl font-bold uppercase text-xs">Cancelar</button>
              <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-black uppercase text-xs shadow-lg">Guardar</button>
            </div>
          </form>
        </div>
      )}

      <div className="space-y-4">
        {tournaments.map(t => (
          <div key={t.id} className="bg-slate-900 p-6 rounded-3xl shadow-xl border border-white/5 active:scale-[0.98] transition-all flex justify-between items-center">
            <div>
              <h3 className="font-black text-white text-lg">{t.name}</h3>
              <p className="text-xs text-slate-500 font-bold tracking-widest mt-1 uppercase">{t.date}</p>
            </div>
            <div className="flex gap-1">
              <button onClick={() => handleEdit(t)} className="p-3 text-slate-500 hover:text-blue-400"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
              <button onClick={() => handleDelete(t.id)} className="p-3 text-slate-500 hover:text-rose-500"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
