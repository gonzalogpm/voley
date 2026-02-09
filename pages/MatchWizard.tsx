
import React, { useState, useEffect } from 'react';
import { useData, useAuth, useUI } from '../App';
import { Match, Team, Player, Tournament, SetData } from '../types';

export const MatchWizard: React.FC<{ navigate: any, matchId?: string }> = ({ navigate, matchId }) => {
  const { user } = useAuth();
  const data = useData();
  const ui = useUI();
  
  const [step, setStep] = useState<'info' | 'scoring'>('info');
  const [match, setMatch] = useState<Partial<Match>>({
    opponent: '',
    date: new Date().toISOString().split('T')[0],
    isHome: true,
    sets: [],
    completed: false
  });
  const [teams, setTeams] = useState<Team[]>([]);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [teamPlayers, setTeamPlayers] = useState<Player[]>([]);
  
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [activePosition, setActivePosition] = useState<number | null>(null);
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [manualScores, setManualScores] = useState({ team: '', opponent: '' });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    if (!user) return;
    const [t, tour] = await Promise.all([
      data.teams.getAll(user.id),
      data.tournaments.getAll(user.id)
    ]);
    setTeams(t);
    setTournaments(tour);
    
    if (matchId) {
      const existing = await data.matches.getById(matchId);
      if (existing) {
        setMatch(existing);
        setStep('scoring');
        const team = t.find(te => te.id === existing.teamId);
        if (team) {
            setSelectedTeam(team);
            const p = await data.players.getAll(user.id);
            setTeamPlayers(p.filter(player => team.playerIds?.includes(player.id)).sort((a,b) => a.firstName.localeCompare(b.firstName)));
            const lastIncomplete = existing.sets.findIndex(s => !s.isCompleted);
            setCurrentSetIndex(lastIncomplete === -1 ? existing.sets.length - 1 : lastIncomplete);
        }
      }
    }
  };

  const handleStart = async () => {
    if (!match.teamId || !match.opponent) return ui.alert('Complete los datos del partido');
    if (!user) return;
    
    const team = teams.find(t => t.id === match.teamId);
    if (!team) return;
    setSelectedTeam(team);
    const p = await data.players.getAll(user.id);
    setTeamPlayers(p.filter(player => team.playerIds?.includes(player.id)).sort((a,b) => a.firstName.localeCompare(b.firstName)));

    const firstSet: SetData = {
        id: crypto.randomUUID(),
        setNumber: 1,
        scoreTeam: 0,
        scoreOpponent: 0,
        lineup: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
        isCompleted: false
    };

    const newMatch = await data.matches.create({
        ...match,
        userId: user.id,
        sets: [firstSet],
        createdAt: Date.now()
    } as Match);

    setMatch(newMatch);
    setStep('scoring');
  };

  const finishSetManually = async () => {
    if (!match.sets) return;
    const updatedSets = [...match.sets];
    const currentSet = { ...updatedSets[currentSetIndex] };
    
    currentSet.scoreTeam = parseInt(manualScores.team) || 0;
    currentSet.scoreOpponent = parseInt(manualScores.opponent) || 0;
    currentSet.isCompleted = true;

    updatedSets[currentSetIndex] = currentSet;
    const updatedMatch = { ...match, sets: updatedSets } as Match;
    setMatch(updatedMatch);
    await data.matches.update(updatedMatch.id, { sets: updatedSets });
    
    setShowScoreModal(false);
    setManualScores({ team: '', opponent: '' });
    checkMatchCompletion(updatedMatch);
  };

  const checkMatchCompletion = async (m: Match) => {
    const teamWins = m.sets.filter(s => s.scoreTeam > s.scoreOpponent).length;
    const oppWins = m.sets.filter(s => s.scoreOpponent > s.scoreTeam).length;

    if (teamWins === 3 || oppWins === 3) {
        const finalMatch = { ...m, completed: true, winner: teamWins === 3 ? 'team' : 'opponent' } as Match;
        setMatch(finalMatch);
        await data.matches.update(m.id, { completed: true, winner: finalMatch.winner });
        ui.alert('¡Partido Finalizado!');
        navigate('history');
    } else {
        const nextSet: SetData = {
            id: crypto.randomUUID(),
            setNumber: m.sets.length + 1,
            scoreTeam: 0,
            scoreOpponent: 0,
            lineup: { 1: null, 2: null, 3: null, 4: null, 5: null, 6: null, 7: null },
            isCompleted: false
        };
        const withNext = { ...m, sets: [...m.sets, nextSet] };
        setMatch(withNext);
        const nextIdx = m.sets.length;
        setCurrentSetIndex(nextIdx);
        await data.matches.update(m.id, { sets: withNext.sets });
    }
  };

  const assignPlayerToActivePosition = async (playerId: string) => {
    if (activePosition === null || !match.sets) return;
    const updatedSets = [...match.sets];
    const currentSet = { ...updatedSets[currentSetIndex] };
    
    Object.keys(currentSet.lineup).forEach(key => {
        if (currentSet.lineup[parseInt(key)] === playerId) {
            currentSet.lineup[parseInt(key)] = null;
        }
    });

    currentSet.lineup[activePosition] = playerId;
    updatedSets[currentSetIndex] = currentSet;
    setMatch({ ...match, sets: updatedSets });
    await data.matches.update(match.id!, { sets: updatedSets });
    setActivePosition(null);
  };

  const loadLineupFromSet = async (targetSetIndex: number) => {
    if (!match.sets) return;
    const sourceSet = match.sets[targetSetIndex];
    const updatedSets = [...match.sets];
    const currentSet = { ...updatedSets[currentSetIndex] };
    currentSet.lineup = { ...sourceSet.lineup };
    updatedSets[currentSetIndex] = currentSet;
    setMatch({ ...match, sets: updatedSets });
    await data.matches.update(match.id!, { sets: updatedSets });
  };

  if (step === 'info') {
    return (
        <div className="h-full flex flex-col p-6 overflow-hidden">
            <h1 className="text-xl font-black italic uppercase tracking-tighter mb-8 text-white">Configurar Partido</h1>
            <div className="flex-1 overflow-y-auto no-scrollbar space-y-5 pb-6">
                <div className="bg-slate-900 p-6 rounded-3xl border border-slate-800 space-y-4 shadow-xl">
                    <div>
                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Tu Equipo</label>
                        <select className="w-full p-4 bg-slate-800 border-none rounded-2xl text-white outline-none focus:ring-4 focus:ring-blue-500/20 appearance-none font-bold text-sm" value={match.teamId} onChange={e => setMatch({...match, teamId: e.target.value})}>
                            <option value="">Seleccionar...</option>
                            {teams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Rival</label>
                        <input className="w-full p-4 bg-slate-800 border-none rounded-2xl text-white outline-none focus:ring-4 focus:ring-blue-500/20 font-bold text-sm" placeholder="Equipo Contrario" value={match.opponent} onChange={e => setMatch({...match, opponent: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Fecha</label>
                        <input type="date" className="w-full p-4 bg-slate-800 border-none rounded-2xl text-white outline-none focus:ring-4 focus:ring-blue-500/20 font-bold text-sm" value={match.date} onChange={e => setMatch({...match, date: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-[8px] font-black text-slate-500 uppercase tracking-widest mb-2 ml-1">Condición</label>
                        <div className="flex gap-2">
                            <button onClick={() => setMatch({...match, isHome: true})} className={`flex-1 p-3 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all border ${match.isHome ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>Local</button>
                            <button onClick={() => setMatch({...match, isHome: false})} className={`flex-1 p-3 rounded-2xl font-black uppercase text-[9px] tracking-widest transition-all border ${!match.isHome ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}>Visitante</button>
                        </div>
                    </div>
                </div>
                <button onClick={handleStart} className="w-full bg-blue-600 text-white p-5 rounded-[32px] font-black uppercase text-xs tracking-[0.2em] shadow-2xl active:scale-95 transition-all">Empezar Partido</button>
            </div>
        </div>
    );
  }

  const currentSet = match.sets![currentSetIndex];
  const completedSets = match.sets?.map((s, idx) => ({ ...s, originalIndex: idx })).filter(s => s.isCompleted && s.originalIndex !== currentSetIndex) || [];
  
  // Cálculo de sets ganados para el marcador superior
  const teamSetsWon = match.sets?.filter(s => s.isCompleted && s.scoreTeam > s.scoreOpponent).length || 0;
  const opponentSetsWon = match.sets?.filter(s => s.isCompleted && s.scoreOpponent > s.scoreTeam).length || 0;

  return (
    <div className="h-full flex flex-col bg-slate-950 overflow-hidden">
        {/* Cabecera del Marcador (Marcador de Sets) */}
        <div className="bg-slate-900 text-white p-3 flex justify-between items-center shadow-xl border-b border-slate-800 flex-shrink-0 z-20">
            <div className="flex flex-col">
                <span className="font-black italic text-[9px] uppercase tracking-widest text-slate-500">Set {currentSet.setNumber}</span>
                <span className="text-[10px] font-black text-blue-500 uppercase leading-none">Puntos: {currentSet.scoreTeam}:{currentSet.scoreOpponent}</span>
            </div>
            <div className="flex gap-4 items-center bg-black/30 px-6 py-2 rounded-2xl border border-white/5">
                <div className="flex flex-col items-center">
                    <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest leading-none mb-1">Marcador Sets</span>
                    <div className="flex items-center gap-3">
                      <span className="text-2xl font-black text-white leading-none">{teamSetsWon}</span>
                      <span className="text-slate-700 font-black text-xs">-</span>
                      <span className="text-2xl font-black text-slate-400 leading-none">{opponentSetsWon}</span>
                    </div>
                </div>
            </div>
            <div className="hidden md:flex flex-col items-end">
                <span className="text-[8px] font-black text-slate-500 uppercase tracking-tighter mb-0.5">{selectedTeam?.name} vs {match.opponent}</span>
            </div>
        </div>

        <div className="flex-1 flex flex-row overflow-hidden relative">
            {/* Sección Izquierda: Lista de Sets Finalizados */}
            <div className="w-32 sm:w-40 md:w-48 flex flex-col bg-slate-950 border-r border-slate-800 flex-shrink-0 overflow-y-auto no-scrollbar py-2 gap-2">
                <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest text-center px-1 mb-1">Sets Terminados</p>
                {completedSets.map((s) => (
                    <div key={s.id} className="mx-2 bg-slate-900/60 rounded-xl border border-white/5 p-2 flex flex-col gap-2 shadow-sm">
                        <div className="text-center bg-slate-800/50 py-1.5 rounded-lg border border-white/5">
                            <p className="text-[8px] font-black text-slate-500 uppercase leading-none mb-1">Set {s.setNumber}</p>
                            <p className="text-xs font-black text-white leading-none">{s.scoreTeam} - {s.scoreOpponent}</p>
                        </div>
                        
                        <div className="space-y-1.5 py-1 border-t border-white/5">
                            {[1, 2, 3, 4, 5, 6, 7].map(pos => {
                                const pId = s.lineup[pos];
                                const player = teamPlayers.find(p => p.id === pId);
                                if (!player) return null;
                                return (
                                    <div key={pos} className="flex items-center gap-1.5 overflow-hidden">
                                        <div className="w-4 h-4 rounded-full bg-blue-600/20 border border-blue-500/30 flex items-center justify-center flex-shrink-0">
                                            <span className="text-[6px] font-black text-blue-400">{player.number || (pos === 7 ? 'L' : pos)}</span>
                                        </div>
                                        <p className="text-[8px] font-bold text-slate-200 truncate leading-tight uppercase tracking-tight">
                                            {player.firstName} {player.lastName}
                                        </p>
                                    </div>
                                );
                            })}
                        </div>

                        <button 
                            onClick={() => loadLineupFromSet(s.originalIndex)}
                            className="w-full bg-emerald-600/10 hover:bg-emerald-600/30 text-emerald-500 font-black text-[7px] py-2 rounded-lg uppercase border border-emerald-500/20 active:scale-95 transition-all shadow-sm"
                        >
                            Cargar
                        </button>
                    </div>
                ))}
                {completedSets.length === 0 && (
                    <div className="flex-1 flex items-center justify-center px-4">
                        <p className="text-[7px] text-slate-700 font-black italic text-center uppercase tracking-widest leading-relaxed">
                            No hay sets aún
                        </p>
                    </div>
                )}
            </div>

            {/* Centro: Campo de Juego */}
            <div className="flex-1 p-2 sm:p-4 flex flex-col items-center justify-center relative bg-slate-950 overflow-hidden">
                <div className="w-full max-w-[280px] aspect-[3/4] bg-emerald-900/40 border-2 border-white/20 relative grid grid-cols-3 grid-rows-2 rounded shadow-2xl overflow-hidden">
                    {[4, 3, 2, 5, 6, 1].map(pos => {
                        const assignedPlayer = teamPlayers.find(p => p.id === currentSet.lineup[pos]);
                        const isActive = activePosition === pos;
                        return (
                            <div key={pos} onClick={() => setActivePosition(pos)} className={`border border-white/5 flex items-center justify-center text-white relative transition-all ${isActive ? 'bg-blue-600/30' : ''}`}>
                                <span className="absolute top-1 left-1.5 text-[7px] font-black opacity-20 text-white">{pos}</span>
                                <div className="flex flex-col items-center text-center px-1">
                                    <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center text-xl font-black border-2 transition-all ${assignedPlayer ? 'bg-blue-600 border-white shadow-lg scale-110' : 'bg-slate-900/60 border-white/10 text-white/10'}`}>
                                        {assignedPlayer ? (assignedPlayer.number || '#') : pos }
                                    </div>
                                    {assignedPlayer && (
                                        <div className="mt-1.5 bg-black/60 px-2 py-0.5 rounded-full shadow-lg">
                                            <p className="text-[7px] sm:text-[9px] font-black text-white leading-tight uppercase tracking-tighter whitespace-nowrap">
                                                {assignedPlayer.firstName} {assignedPlayer.lastName}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Panel de Control Derecho: Lista de Jugadoras - Fijo a la derecha */}
            <div className="w-48 sm:w-64 md:w-80 flex flex-col bg-slate-900 overflow-hidden flex-shrink-0 shadow-2xl border-l border-slate-800 h-full">
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Posición 7 (Líbero) */}
                    <div className="bg-slate-950/60 border-b border-slate-800 flex items-center justify-between p-3 flex-shrink-0">
                        <p className="text-[7px] font-black text-slate-600 uppercase tracking-tighter">Pos 7 Libero</p>
                        <button 
                            onClick={() => setActivePosition(7)}
                            className={`w-10 h-10 rounded-xl border-2 flex flex-col items-center justify-center text-[10px] font-black shadow-lg transition-all relative ${activePosition === 7 ? 'bg-amber-600 border-amber-400 scale-110' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                        >
                            <span className="text-[12px] leading-none">7</span>
                            {currentSet.lineup[7] && <div className="absolute inset-0 bg-amber-500 rounded-xl flex items-center justify-center text-white border-2 border-white shadow-xl">
                                <span className="text-xs font-black leading-none">{teamPlayers.find(p => p.id === currentSet.lineup[7])?.number || 'L'}</span>
                            </div>}
                        </button>
                    </div>

                    {/* Lista de Jugadoras para Asignar */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        <div className="p-3 bg-slate-800/80 border-b border-slate-800 flex items-center justify-between">
                             <p className={`text-[8px] font-black uppercase tracking-widest transition-colors ${activePosition !== null ? 'text-blue-500 animate-pulse' : 'text-slate-600'}`}>
                                {activePosition !== null ? `Asignar a Pos ${activePosition}` : 'Toca campo'}
                             </p>
                             {activePosition && <button onClick={() => setActivePosition(null)} className="text-[8px] font-black text-rose-500 uppercase">Limpiar</button>}
                        </div>
                        <div className="flex-1 overflow-y-auto no-scrollbar p-2 space-y-1.5">
                            {teamPlayers.map(p => {
                                const currentPos = Object.keys(currentSet.lineup).find(k => currentSet.lineup[parseInt(k)] === p.id);
                                return (
                                    <button 
                                        key={p.id}
                                        onClick={() => assignPlayerToActivePosition(p.id)}
                                        disabled={activePosition === null}
                                        className={`w-full p-2 border rounded-2xl transition-all truncate text-left flex justify-between items-center ${activePosition !== null ? 'hover:border-blue-500 hover:bg-slate-800/80' : 'opacity-40'} ${currentPos ? 'bg-blue-600/20 border-blue-500/50' : 'bg-slate-800/50 border-slate-700/50'}`}
                                    >
                                        <div className="flex items-center gap-2 overflow-hidden">
                                            <span className={`w-5 h-5 flex-shrink-0 rounded-full flex items-center justify-center text-[9px] font-black ${currentPos ? 'bg-blue-600 text-white' : 'bg-white/10 text-white/40'}`}>
                                                {p.number || '#'}
                                            </span>
                                            <p className={`text-[9px] font-black uppercase tracking-tighter truncate ${currentPos ? 'text-white' : 'text-slate-300'}`}>
                                                {p.firstName} {p.lastName}
                                            </p>
                                        </div>
                                        {currentPos && (
                                            <span className="bg-blue-600 text-white px-1.5 py-0.5 rounded-full text-[6px] font-black">P{currentPos}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Acciones Finales */}
                <div className="p-3 bg-slate-950 border-t border-slate-800 flex-shrink-0 space-y-2">
                    <button 
                        onClick={() => setShowScoreModal(true)} 
                        className="w-full bg-rose-600 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl active:scale-95 transition-all"
                    >
                        Terminar Set
                    </button>
                    <button 
                        onClick={() => navigate('whiteboard', { returnPage: 'match-wizard', matchId: match.id })}
                        className="w-full bg-slate-800 text-slate-300 py-2.5 rounded-2xl font-black text-[8px] uppercase tracking-[0.2em] border border-white/5 shadow-lg active:scale-95 transition-all"
                    >
                        Pizarra
                    </button>
                </div>
            </div>
        </div>

        {/* Modal para cargar resultado */}
        {showScoreModal && (
            <div className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-6">
                <div className="bg-slate-900 border border-slate-800 p-8 rounded-[40px] w-full max-w-sm shadow-2xl space-y-6">
                    <div className="text-center">
                        <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Finalizar Set {currentSet.setNumber}</h2>
                        <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest mt-1">Ingresa el resultado final</p>
                    </div>

                    <div className="flex items-center gap-4 justify-center py-4">
                        <div className="flex flex-col items-center gap-2">
                            <label className="text-[8px] font-black text-blue-500 uppercase tracking-widest">Nosotros</label>
                            <input 
                                type="number" 
                                className="w-20 p-4 bg-slate-800 text-white text-center rounded-2xl text-2xl font-black outline-none border-none focus:ring-4 focus:ring-blue-500/20"
                                value={manualScores.team}
                                onChange={e => setManualScores({...manualScores, team: e.target.value})}
                                placeholder="0"
                            />
                        </div>
                        <span className="text-slate-700 font-black text-xl mt-4">:</span>
                        <div className="flex flex-col items-center gap-2">
                            <label className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Rival</label>
                            <input 
                                type="number" 
                                className="w-20 p-4 bg-slate-800 text-white text-center rounded-2xl text-2xl font-black outline-none border-none focus:ring-4 focus:ring-blue-500/20"
                                value={manualScores.opponent}
                                onChange={e => setManualScores({...manualScores, opponent: e.target.value})}
                                placeholder="0"
                            />
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowScoreModal(false)} 
                            className="flex-1 bg-slate-800 text-slate-500 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-slate-700"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={finishSetManually}
                            className="flex-1 bg-blue-600 text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all"
                        >
                            Guardar
                        </button>
                    </div>
                </div>
            </div>
        )}
    </div>
  );
};
