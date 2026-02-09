
import React, { useState, useEffect } from 'react';
import { useData, useAuth, useUI } from '../App';
import { Match, Team, Tournament } from '../types';

declare const jspdf: any;

export const HistoryPage: React.FC<{ navigate: any }> = ({ navigate }) => {
  const { user } = useAuth();
  const data = useData();
  const ui = useUI();
  const [matches, setMatches] = useState<Match[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  
  // Filters
  const [searchRival, setSearchRival] = useState('');
  const [resultFilter, setResultFilter] = useState<'ALL' | 'WON' | 'LOST'>('ALL');
  const [venueFilter, setVenueFilter] = useState<'ALL' | 'HOME' | 'AWAY'>('ALL');

  useEffect(() => {
    loadAll();
  }, []);

  const loadAll = async () => {
    if (!user) return;
    const [m, t, tour] = await Promise.all([
      data.matches.getAll(user.id),
      data.teams.getAll(user.id),
      data.tournaments.getAll(user.id)
    ]);
    setMatches(m.sort((a,b) => b.createdAt - a.createdAt));
    setTeams(t);
    setTournaments(tour);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    ui.confirm('¿Eliminar definitivamente este partido?', async () => {
        await data.matches.delete(id);
        loadAll();
    });
  };

  const filteredMatches = matches.filter(m => {
    const team = teams.find(t => t.id === m.teamId);
    const matchesRival = m.opponent.toLowerCase().includes(searchRival.toLowerCase()) || 
                         (team?.name.toLowerCase().includes(searchRival.toLowerCase()));
    
    const teamSets = m.sets.filter(s => s.scoreTeam > s.scoreOpponent).length;
    const oppSets = m.sets.filter(s => s.scoreOpponent > s.scoreTeam).length;
    const isWinner = teamSets > oppSets;

    const matchesResult = resultFilter === 'ALL' || 
                         (resultFilter === 'WON' && isWinner) || 
                         (resultFilter === 'LOST' && !isWinner);
    
    const matchesVenue = venueFilter === 'ALL' || 
                        (venueFilter === 'HOME' && m.isHome) || 
                        (venueFilter === 'AWAY' && !m.isHome);

    return matchesRival && matchesResult && matchesVenue;
  });

  const exportToPDF = () => {
    if (filteredMatches.length === 0) return ui.alert('No hay datos para exportar');

    const doc = new jspdf.jsPDF();
    doc.setFontSize(18);
    doc.text('Historial de Partidos - VolleyCoach Pro', 14, 20);
    doc.setFontSize(10);
    doc.text(`Generado el: ${new Date().toLocaleDateString()}`, 14, 28);

    const tableData = filteredMatches.map(m => {
      const team = teams.find(t => t.id === m.teamId);
      const teamSets = m.sets.filter(s => s.scoreTeam > s.scoreOpponent).length;
      const oppSets = m.sets.filter(s => s.scoreOpponent > s.scoreTeam).length;
      return [
        m.date,
        `${team?.name || 'Equipo'} vs ${m.opponent}`,
        m.isHome ? 'Local' : 'Visitante',
        `${teamSets} - ${oppSets}`,
        teamSets > oppSets ? 'Ganado' : 'Perdido'
      ];
    });

    doc.autoTable({
      startY: 35,
      head: [['Fecha', 'Encuentro', 'Condición', 'Sets', 'Resultado']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [37, 99, 235] }
    });

    doc.save(`historial-volleycoach-${new Date().getTime()}.pdf`);
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <h1 className="text-2xl font-black italic tracking-tight text-white">Historial</h1>
        <button 
          onClick={exportToPDF}
          className="bg-emerald-600 text-white p-3 rounded-2xl flex items-center gap-2 shadow-lg active:scale-95 transition-all"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          <span className="text-[10px] font-black uppercase tracking-widest mr-1">PDF</span>
        </button>
      </div>
      
      {/* Filtros */}
      <div className="mb-6 flex-shrink-0 space-y-3">
        <div className="relative">
            <svg className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"/></svg>
            <input 
              placeholder="Buscar Rival o Equipo..." 
              className="w-full pl-12 pr-4 py-4 bg-slate-900 border border-slate-800 rounded-2xl text-white outline-none focus:ring-4 focus:ring-blue-500/20 shadow-xl font-bold text-sm"
              value={searchRival}
              onChange={e => setSearchRival(e.target.value)}
            />
        </div>
        
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
            <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 flex-shrink-0">
                <button onClick={() => setResultFilter('ALL')} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${resultFilter === 'ALL' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500'}`}>Todos</button>
                <button onClick={() => setResultFilter('WON')} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${resultFilter === 'WON' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500'}`}>Ganados</button>
                <button onClick={() => setResultFilter('LOST')} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${resultFilter === 'LOST' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500'}`}>Perdidos</button>
            </div>
            
            <div className="flex bg-slate-900 p-1 rounded-2xl border border-slate-800 flex-shrink-0">
                <button onClick={() => setVenueFilter('ALL')} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${venueFilter === 'ALL' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500'}`}>Cualquiera</button>
                <button onClick={() => setVenueFilter('HOME')} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${venueFilter === 'HOME' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500'}`}>Local</button>
                <button onClick={() => setVenueFilter('AWAY')} className={`px-4 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${venueFilter === 'AWAY' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-500'}`}>Visitante</button>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-10">
        {filteredMatches.length === 0 && <p className="text-center text-slate-700 py-16 font-black italic uppercase tracking-widest text-[10px]">Sin coincidencias</p>}
        {filteredMatches.map(m => {
          const team = teams.find(t => t.id === m.teamId);
          const teamSets = m.sets.filter(s => s.scoreTeam > s.scoreOpponent).length;
          const oppSets = m.sets.filter(s => s.scoreOpponent > s.scoreTeam).length;
          const isWinner = teamSets > oppSets;
          
          return (
            <div 
                key={m.id} 
                className="bg-slate-900 p-6 rounded-[32px] shadow-xl border border-white/5 active:scale-[0.98] transition-all cursor-pointer overflow-hidden relative group" 
                onClick={() => navigate('match-wizard', { matchId: m.id })}
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex-1">
                    <h3 className="font-black text-white text-lg leading-tight flex items-center gap-2">
                        {team?.name || 'Equipo'} 
                        <span className="text-slate-600 font-medium text-[10px] tracking-widest uppercase">vs</span> 
                        {m.opponent}
                    </h3>
                    <div className="flex items-center gap-3 mt-1.5">
                        <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{m.date}</p>
                        <span className={`text-[7px] font-black uppercase tracking-[0.2em] px-2 py-0.5 rounded-full border ${m.isHome ? 'border-blue-500/20 text-blue-500 bg-blue-500/5' : 'border-amber-500/20 text-amber-500 bg-amber-500/5'}`}>
                            {m.isHome ? 'Local' : 'Visitante'}
                        </span>
                    </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                    <button 
                        onClick={(e) => { e.stopPropagation(); navigate('match-wizard', { matchId: m.id }); }} 
                        className="p-3 bg-slate-800/50 rounded-2xl text-slate-500 hover:text-blue-400 transition-all border border-transparent hover:border-blue-500/20"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
                    </button>
                    <button 
                        onClick={(e) => handleDelete(m.id, e)} 
                        className="p-3 bg-slate-800/50 rounded-2xl text-slate-500 hover:text-rose-500 transition-all border border-transparent hover:border-rose-500/20"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                    </button>
                </div>
              </div>

              <div className="flex justify-between items-end mt-4">
                <div className="flex gap-2 overflow-x-auto no-scrollbar max-w-[60%]">
                    {m.sets.map((s, i) => (
                        <div key={i} className={`flex flex-col items-center px-3 py-1.5 rounded-xl border flex-shrink-0 ${s.scoreTeam > s.scoreOpponent ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-800/50 border-slate-700/50'}`}>
                            <span className="text-[7px] font-black text-slate-500 uppercase mb-0.5 tracking-tighter">Set {s.setNumber}</span>
                            <span className="text-[11px] font-black text-white">{s.scoreTeam}:{s.scoreOpponent}</span>
                        </div>
                    ))}
                </div>
                <div className={`px-5 py-2.5 rounded-2xl text-[10px] font-black shadow-lg border uppercase tracking-widest ${isWinner ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500' : 'bg-rose-500/10 border-rose-500/30 text-rose-500'}`}>
                    {teamSets} - {oppSets}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
