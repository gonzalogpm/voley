
import React, { useState, useEffect } from 'react';
import { useData, useAuth, useUI } from '../App';
import { Player, PlayerPosition, Team, Tournament, Match } from '../types';

declare const jspdf: any;

export const PlayersPage: React.FC<{ navigate: any }> = ({ navigate }) => {
  const { user } = useAuth();
  const data = useData();
  const ui = useUI();
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Player>>({
    firstName: '',
    lastName: '',
    number: '',
    positions: [],
    active: true
  });

  const [selectedPlayerForHistory, setSelectedPlayerForHistory] = useState<Player | null>(null);

  const positionsList: PlayerPosition[] = ['ARMADORA', 'OPUESTA', 'PUNTA', 'CENTRAL', 'LIBERO'];

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    if (!user) return;
    const [p, t, tour, m] = await Promise.all([
      data.players.getAll(user.id),
      data.teams.getAll(user.id),
      data.tournaments.getAll(user.id),
      data.matches.getAll(user.id)
    ]);
    setPlayers(p.sort((a,b) => a.firstName.localeCompare(b.firstName)));
    setTeams(t);
    setTournaments(tour);
    setMatches(m);
  };

  const togglePosition = (pos: PlayerPosition) => {
    const current = formData.positions || [];
    if (current.includes(pos)) {
        setFormData({ ...formData, positions: current.filter(p => p !== pos) });
    } else {
        setFormData({ ...formData, positions: [...current, pos] });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if ((formData.positions?.length || 0) === 0) return ui.alert('Seleccione al menos un rol');
    
    if (editingId) {
      await data.players.update(editingId, formData);
    } else {
      await data.players.create({
        ...formData,
        userId: user.id
      } as Player);
    }
    
    setEditingId(null);
    setShowForm(false);
    setFormData({ firstName: '', lastName: '', number: '', positions: [], active: true });
    loadAll();
  };

  const handleEdit = (p: Player) => {
    setFormData(p);
    setEditingId(p.id);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    ui.confirm('¿Eliminar jugadora?', async () => {
      await data.players.delete(id);
      loadAll();
    });
  };

  const getPlayerMatchesDetails = (playerId: string) => {
    return matches.filter(m => {
        return m.sets.some(s => Object.values(s.lineup).includes(playerId));
    }).map(m => {
        const team = teams.find(t => t.id === m.teamId);
        const teamSets = m.sets.filter(s => s.scoreTeam > s.scoreOpponent).length;
        const oppSets = m.sets.filter(s => s.scoreOpponent > s.scoreTeam).length;
        const setsPlayed = m.sets.map((s) => {
            const pos = Object.entries(s.lineup).find(([_, pId]) => pId === playerId);
            return pos ? { set: s.setNumber, pos: pos[0] } : null;
        }).filter(Boolean);

        return {
            match: m,
            teamName: team?.name || 'Equipo',
            score: `${teamSets} - ${oppSets}`,
            isWinner: teamSets > oppSets,
            setsPlayed
        };
    });
  };

  const getPlayerTeams = (playerId: string) => {
    return teams.filter(t => t.playerIds?.includes(playerId)).map(t => t.name).join(', ') || 'Sin equipo';
  };

  const exportPlayerHistoryToPDF = (player: Player) => {
    const activity = getPlayerMatchesDetails(player.id);
    if (activity.length === 0) return ui.alert('No hay actividad registrada para exportar');

    const doc = new jspdf.jsPDF();
    doc.setFontSize(18);
    doc.text(`Historial de Actividad: ${player.firstName} ${player.lastName}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Número: ${player.number || 'S/N'}`, 14, 28);
    doc.setFontSize(10);
    doc.text(`Fecha del reporte: ${new Date().toLocaleDateString()}`, 14, 34);

    const tableData = activity.map(({ match, teamName, score, setsPlayed }) => {
      const setsStr = setsPlayed.map((s: any) => `Set ${s.set} (Pos ${s.pos === '7' ? 'Lib' : s.pos})`).join(', ');
      return [
        match.date,
        `${teamName} vs ${match.opponent}`,
        score,
        setsStr
      ];
    });

    doc.autoTable({
      startY: 40,
      head: [['Fecha', 'Partido', 'Resultado', 'Participación']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(`actividad-${player.lastName}-${new Date().getTime()}.pdf`);
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <h1 className="text-xl font-black italic uppercase tracking-tighter text-white">Plantilla</h1>
        <button 
          onClick={() => { setShowForm(true); setEditingId(null); setFormData({ firstName: '', lastName: '', number: '', positions: [], active: true }); }}
          className="bg-blue-600 text-white font-black px-5 py-2 rounded-2xl shadow-lg active:scale-95 transition-all text-[10px] uppercase tracking-[0.2em]"
        >
          Añadir
        </button>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-12">
        {players.length === 0 && <p className="text-center text-slate-700 py-16 text-[10px] font-black uppercase tracking-widest italic">Lista vacía</p>}
        {players.map(p => {
          const assignedTeams = getPlayerTeams(p.id);
          return (
            <div key={p.id} className="bg-slate-900/80 p-5 rounded-[32px] shadow-xl border border-white/5 active:scale-[0.98] transition-all relative overflow-hidden group">
              <div className="flex justify-between items-start relative z-10">
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-xs shadow-lg border border-white/20">
                      {p.number || '#'}
                    </span>
                    <p className="font-black text-white text-base leading-tight">{p.firstName} {p.lastName}</p>
                  </div>
                  <div className="flex gap-1.5 flex-wrap mt-2">
                    {(p.positions || []).map(pos => (
                        <span key={pos} className="text-[7px] bg-blue-500/10 text-blue-400 font-black px-2.5 py-1 rounded-full border border-blue-500/20 uppercase tracking-widest">
                            {pos}
                        </span>
                    ))}
                  </div>
                  <div className="mt-3">
                    <p className="text-[8px] text-slate-500 font-black uppercase tracking-widest">Equipos:</p>
                    <p className="text-[10px] text-slate-300 font-medium italic">{assignedTeams}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(p)} className="p-3 bg-slate-800/50 rounded-2xl text-slate-500 hover:text-blue-400 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                  <button onClick={() => handleDelete(p.id)} className="p-3 bg-slate-800/50 rounded-2xl text-slate-500 hover:text-rose-500 transition-all"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg></button>
                </div>
              </div>
              <div className="mt-5 pt-4 border-t border-white/5 relative z-10 flex gap-2">
                 <button 
                    onClick={() => setSelectedPlayerForHistory(p)}
                    className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 py-3 rounded-2xl font-black text-[9px] uppercase tracking-[0.15em] transition-all flex items-center justify-center gap-2 border border-white/5"
                 >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"/></svg>
                    Historial Actividad
                 </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal Historial de Partidos Jugados */}
      {selectedPlayerForHistory && (
        <div className="fixed inset-0 bg-black/90 z-[110] p-4 flex items-center justify-center backdrop-blur-xl">
            <div className="bg-slate-900 border border-slate-800 p-8 rounded-[48px] w-full max-w-lg h-[80vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="flex justify-between items-start mb-6 flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Registro de Actividad</h2>
                        <p className="text-blue-500 font-black text-[10px] uppercase tracking-widest mt-1">
                            {selectedPlayerForHistory.firstName} {selectedPlayerForHistory.lastName} #{selectedPlayerForHistory.number || 'S/N'}
                        </p>
                    </div>
                    <div className="flex gap-2">
                        <button 
                            onClick={() => exportPlayerHistoryToPDF(selectedPlayerForHistory)}
                            className="p-3 bg-emerald-600 rounded-2xl text-white shadow-lg active:scale-95 transition-all"
                            title="Exportar a PDF"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
                        </button>
                        <button onClick={() => setSelectedPlayerForHistory(null)} className="p-3 bg-slate-800 rounded-2xl text-slate-500"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/></svg></button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-4">
                    {getPlayerMatchesDetails(selectedPlayerForHistory.id).length === 0 && (
                        <p className="text-center py-20 text-slate-600 font-black uppercase text-[10px] tracking-widest italic">No ha participado en partidos oficiales</p>
                    )}
                    {getPlayerMatchesDetails(selectedPlayerForHistory.id).map(({ match, teamName, score, isWinner, setsPlayed }, i) => (
                        <div key={i} className="bg-slate-800/40 border border-white/5 rounded-3xl p-5 shadow-inner">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <p className="text-[7px] text-slate-500 font-black uppercase tracking-widest">{match.date}</p>
                                    <p className="text-sm font-black text-white mt-1 uppercase italic tracking-tighter">
                                        {teamName} <span className="text-slate-600 lowercase font-medium mx-1">vs</span> {match.opponent}
                                    </p>
                                </div>
                                <div className={`px-3 py-1 rounded-xl font-black text-[10px] border ${isWinner ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-rose-500/10 border-rose-500/30 text-rose-500'}`}>
                                    {score}
                                </div>
                            </div>
                            
                            <div className="flex flex-wrap gap-2 mt-4">
                                {setsPlayed.map((sp: any, j: number) => (
                                    <div key={j} className="bg-slate-900 border border-slate-700 px-3 py-1.5 rounded-xl flex items-center gap-2">
                                        <span className="text-blue-500 font-black text-[8px] uppercase">Set {sp.set}</span>
                                        <div className="w-px h-3 bg-slate-700" />
                                        <span className="text-slate-300 font-bold text-[8px] uppercase tracking-tighter">Pos {sp.pos === '7' ? 'Libero' : sp.pos}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
                
                <button 
                    onClick={() => setSelectedPlayerForHistory(null)}
                    className="w-full mt-6 bg-slate-800 text-slate-400 py-4 rounded-[24px] font-black uppercase text-[10px] tracking-[0.2em] flex-shrink-0"
                >
                    Volver a Plantilla
                </button>
            </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black/90 z-[100] p-4 flex items-center justify-center backdrop-blur-xl">
          <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 p-8 rounded-[48px] w-full max-w-sm space-y-5 shadow-2xl">
            <h2 className="text-xl font-black text-white uppercase tracking-tighter italic">Ficha Técnica</h2>
            <div className="grid grid-cols-4 gap-3">
                <input placeholder="Nº" className="col-span-1 p-4 bg-slate-800 text-white border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/20 text-sm font-black text-center" value={formData.number} onChange={e => setFormData({ ...formData, number: e.target.value })} />
                <input placeholder="Nombre" required className="col-span-3 p-4 bg-slate-800 text-white border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/20 text-sm font-bold" value={formData.firstName} onChange={e => setFormData({ ...formData, firstName: e.target.value })} />
            </div>
            <input placeholder="Apellido" required className="w-full p-4 bg-slate-800 text-white border-none rounded-2xl outline-none focus:ring-4 focus:ring-blue-500/20 text-sm font-bold" value={formData.lastName} onChange={e => setFormData({ ...formData, lastName: e.target.value })} />
            
            <div>
                <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] mb-3 ml-1">Especialización</p>
                <div className="grid grid-cols-2 gap-2">
                    {positionsList.map(pos => (
                        <button key={pos} type="button" onClick={() => togglePosition(pos)} className={`px-2 py-3 rounded-2xl text-[8px] font-black border transition-all ${formData.positions?.includes(pos) ? 'bg-blue-600 border-blue-500 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>
                            {pos}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex items-center gap-3 py-1">
                <input type="checkbox" className="w-6 h-6 rounded-lg border-none bg-slate-800 text-blue-600 focus:ring-0" checked={formData.active} onChange={e => setFormData({...formData, active: e.target.checked})} />
                <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Activa</label>
            </div>
            
            <div className="flex gap-3 pt-3">
              <button type="button" onClick={() => setShowForm(false)} className="flex-1 bg-slate-800 text-slate-500 py-4 rounded-[24px] font-black uppercase text-[10px] tracking-[0.2em]">Cerrar</button>
              <button type="submit" className="flex-1 bg-blue-600 text-white py-4 rounded-[24px] font-black uppercase text-[10px] tracking-[0.2em] shadow-xl">Guardar</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
