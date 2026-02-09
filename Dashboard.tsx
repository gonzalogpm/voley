import React from 'react';
import { useAuth } from '../App';

interface Props {
  navigate: (page: string) => void;
}

export const Dashboard: React.FC<Props> = ({ navigate }) => {
  const { user } = useAuth();

  const menuItems = [
    { id: 'match-wizard', label: 'Nuevo Partido', color: 'bg-blue-600', icon: 'M12 4v16m8-8H4' },
    { id: 'tournaments', label: 'Torneos', color: 'bg-indigo-600', icon: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1' },
    { id: 'history', label: 'Historial', color: 'bg-teal-600', icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z' },
    { id: 'whiteboard', label: 'Pizarra', color: 'bg-orange-600', icon: 'M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z' },
    { id: 'teams', label: 'Equipos', color: 'bg-slate-700', icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'players', label: 'Jugadoras', color: 'bg-emerald-600', icon: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z' },
  ];

  // Solo agregar Admin si el usuario es administrador
  if (user?.role === 'admin') {
    menuItems.push({ id: 'admin-users', label: 'Admin', color: 'bg-rose-600', icon: 'M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z' });
  }

  menuItems.push({ id: 'export-import', label: 'Backup', color: 'bg-slate-600', icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10' });

  return (
    <div className="h-full w-full flex flex-col p-4 overflow-hidden">
      <header className="text-center mb-8 mt-4 flex-shrink-0">
        <h2 className="text-3xl font-black text-white tracking-tighter italic uppercase">Dashboard</h2>
        <p className="text-slate-500 text-sm mt-1">
          {user?.role === 'admin' ? 'Modo Administrador' : 'Modo Entrenador'}
        </p>
      </header>

      <div className="flex-1 flex flex-col items-center justify-start py-2">
        <div className="grid grid-cols-4 gap-3 w-full max-w-2xl">
            {menuItems.map(item => (
            <button
                key={item.id}
                onClick={() => navigate(item.id)}
                className={`${item.color} p-4 rounded-[24px] shadow-2xl flex flex-col items-center justify-center text-white active:scale-95 transition-all border border-white/10 h-28 overflow-hidden`}
            >
                <div className="bg-white/10 p-2 rounded-xl mb-2 shadow-sm">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={item.icon} />
                    </svg>
                </div>
                <span className="font-black text-[14px] uppercase tracking-tighter text-center leading-none px-0.5 line-clamp-2">
                    {item.label}
                </span>
            </button>
            ))}
        </div>
      </div>
    </div>
  );
};