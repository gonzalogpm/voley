
import React from 'react';
import { useAuth, useUI } from '../App';
import { db } from '../services/db';

export const ExportImportPage: React.FC<{ navigate: any }> = ({ navigate }) => {
  const { user } = useAuth();
  const { logo, setLogo } = useUI();
  const ui = useUI();
  
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setLogo(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleExport = async () => {
    if (!user) return;
    const stores = ['players', 'teams', 'tournaments', 'matches', 'whiteboard'];
    const data: any = { userId: user.id, email: user.email };
    
    for (const store of stores) {
        if (store === 'whiteboard') {
            const items = await db.perform<any[]>('whiteboard', 'readonly', s => s.getAll());
            data[store] = items.filter(i => i.userId === user.id);
        } else {
            data[store] = await db.getAllByUserId(store, user.id);
        }
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `volleycoach-backup-${user.email}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    ui.confirm('Esta operación sobrescribirá datos si hay conflictos de ID. ¿Continuar?', () => {
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const data = JSON.parse(event.target?.result as string);
                const stores = ['players', 'teams', 'tournaments', 'matches', 'whiteboard'];
                for (const store of stores) {
                    if (data[store]) {
                        for (const item of data[store]) {
                            item.userId = user.id;
                            await db.perform(store, 'readwrite', s => s.put(item));
                        }
                    }
                }
                ui.alert('Importación completada con éxito');
                navigate('home');
            } catch (err) {
                ui.alert('Error al importar archivo');
            }
        };
        reader.readAsText(file);
    });
  };

  return (
    <div className="h-full flex flex-col p-6 overflow-hidden">
        <h1 className="text-xl font-black italic uppercase tracking-tighter mb-8 text-white">Configuración y Backup</h1>
        
        <div className="flex-1 overflow-y-auto no-scrollbar space-y-6 pb-6">
            {/* Logo del Club Section */}
            <div className="bg-slate-900 p-6 rounded-[32px] shadow-xl border border-white/5 space-y-4">
                <h2 className="font-black text-blue-500 uppercase text-[9px] tracking-widest ml-1">Identidad Visual</h2>
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 rounded-2xl bg-slate-800 overflow-hidden border border-white/10 flex-shrink-0">
                    <img src={logo} alt="Club Logo" className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] text-slate-400 font-medium mb-3">Cambia el logo que aparece en la pantalla de inicio de sesión.</p>
                    <label className="inline-block bg-slate-800 text-white px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest cursor-pointer hover:bg-slate-700 transition-all active:scale-95 border border-white/5">
                      Cambiar Logo
                      <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                    </label>
                  </div>
                </div>
            </div>

            <div className="bg-slate-900 p-6 rounded-[32px] shadow-xl border border-white/5 space-y-6">
                <div className="p-4 bg-blue-600/5 rounded-2xl border border-blue-500/10">
                    <h2 className="font-black text-blue-500 mb-2 uppercase text-[9px] tracking-widest">Exportar</h2>
                    <p className="text-[10px] text-slate-500 mb-4 font-medium leading-relaxed">Descarga una copia completa de tus equipos, jugadoras y partidos en formato JSON para seguridad.</p>
                    <button onClick={handleExport} className="w-full bg-blue-600 text-white p-3.5 rounded-2xl font-black uppercase text-[9px] tracking-[0.2em] shadow-lg active:scale-95 transition-all">Generar Backup</button>
                </div>

                <div className="p-4 bg-slate-800/20 rounded-2xl border border-slate-700/30">
                    <h2 className="font-black text-slate-400 mb-2 uppercase text-[9px] tracking-widest">Importar</h2>
                    <p className="text-[10px] text-slate-500 mb-4 font-medium leading-relaxed">Carga un archivo de respaldo previo. Los datos se asociarán a tu cuenta actual.</p>
                    <div className="relative">
                        <input 
                            type="file" 
                            accept=".json" 
                            onChange={handleImport} 
                            className="block w-full text-[8px] text-slate-600 file:mr-3 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-[8px] file:font-black file:uppercase file:bg-slate-800 file:text-slate-400 hover:file:bg-slate-700 cursor-pointer transition-all"
                        />
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
};
