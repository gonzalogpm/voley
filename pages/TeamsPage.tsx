
import React, { useState, useEffect } from 'react';
import { useData, useAuth, useUI } from '../App';
import { Team, Player } from '../types';

export const TeamsPage: React.FC<{ navigate: any }> = ({ navigate }) => {
  const { user } = useAuth();
  const data = useData();
  const ui = useUI();
  const [teams, setTeams] = useState<Team[]>([]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<{name: string, playerIds: string[]}>({
    name: '',
    playerIds: []
  });

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    if (!user) return;
    const [t, p] = await Promise.all([
      data.teams.getAll(user.id),
      data.players.getAll(user.id)
    ]);
    setTeams(t.sort((a,b) => a.name.localeCompare(b.name)));
    setPlayers(p.sort((a,b) => a.firstName.localeCompare(b.firstName)));
  };

  const togglePlayer = (id: string) => {
    setFormData(prev => ({
      ...prev,
      playerIds: prev.playerIds.includes(id) 
        ? prev.playerIds.filter(pid => pid !== id)
        : [...prev.playerIds, id]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    if (editingId) {
      await data.teams.update(editingId, formData);
    } else {
      await data.teams.create({
        ...formData,
        userId: user.id
      } as Team);
    }
    
    setEditingId(null);
    setShowForm(false);
    setFormData({ name: '', playerIds: [] });
    loadAll();
  };

  const handleEdit = (t: Team) => {
    setFormData({ name: t.name, playerIds: t.playerIds || [] });
    setEditingId(t.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    ui.confirm('¿Eliminar equipo?', async () => {
        await data.teams.delete(id);
        loadAll();
    });
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <h1 className="text-xl font-black italic uppercase tracking-tighter">Equipos</h1>
        <button onClick={() => { setShowForm(true); setEditingId(null); setFormData({name: '', playerIds: []}); }} className="bg-blue-600 text-white font-black px-5 py-2 rounded-2xl shadow-lg active:scale-95 transition-all text-[10px] uppercase tracking-widest">Añadir</button>
      </div>

      <div className="flex-1 overflow-y-auto pr-1 space-y-4 pb-4">
        {teams.length === 0 && <p className="text-center text-slate-600 py-10 text-[10px] font-black uppercase tracking-widest">Sin equipos registrados</p>}
        {teams.map(t => (
          <div key={t.id} className="bg-slate-900 p-6 rounded-[32px] shadow-xl border border-white/5 active:scale-[0.98] transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="flex-1">
                <h3 className="font-black text-lg text-white leading-tight">{t.name}</h3>
                <p className="text-blue-500 text-[9px] font-black uppercase tracking-widest mt-1">{t.playerIds?.length || 0} Jugadoras</p>
              </div>
              <div className="flex gap-1">
                <button onClick={() => handleEdit(t)} className="p-2 text-slate-500 hover:text-blue-400 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                </button>
                <button onClick={() => handleDelete(t.id)} className="p-2 text-slate-500 hover:text-rose-500 transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-2 mt-4 pt-4 border-t border-slate-800">
                {t.playerIds.map(pid => {
                    const p = players.find(x => x.id === pid);
                    if (!p) return null;
                    return (
                      <div key={pid} className="bg-slate-800/30 p-2.5 rounded-xl border border-slate-700/50 flex justify-between items-center">
                        <p className="text-[11px] font-bold text-slate-200">{p.firstName} {p.lastName}</p>
                        <p className="text-[8px] text-blue-500 font-black uppercase">{p.positions[0]}</p>
                      </div>
                    );
                })}
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/80 z-[100] p-4 flex items-center justify-center backdrop-blur-md">
          <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-8 rounded-[40px] w-full max-w-sm space-y-5 shadow-2xl h-[80vh] flex flex-col">
            <h2 className="text-lg font-black text-white uppercase tracking-tighter italic flex-shrink-0">{editingId ? 'Editar' : 'Nuevo'} Equipo</h2>
            <input placeholder="Nombre del Equipo" required className="w-full p-4 bg-slate-800 text-white border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/20 text-sm font-bold flex-shrink-0" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
            
            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-2 ml-1">Seleccionar Plantel</p>
              <div className="flex-1 overflow-y-auto space-y-1.5 bg-slate-950/40 rounded-2xl p-2 border border-slate-800">
                {players.map(p => (
                  <button key={p.id} type="button" onClick={() => togglePlayer(p.id)} className={`w-full text-left p-3 rounded-xl font-bold transition-all border flex justify-between items-center ${formData.playerIds.includes(p.id) ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-600'}`}>
                    <div className="truncate">
                      <p className="text-[11px] font-bold">{p.firstName} {p.lastName}</p>
                    </div>
                    {formData.playerIds.includes(p.id) && <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/></svg>}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-3 pt-4 flex-shrink-0">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-800 text-slate-500 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest">Cancelar</button>
              <button type="submit" className="flex-1 bg-blue-600 text-white py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
