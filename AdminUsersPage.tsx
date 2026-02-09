import React, { useState, useEffect } from 'react';
import { useData, useAuth, useUI } from '../App';
import { User, UserRole } from '../types';

export const AdminUsersPage: React.FC<{ navigate: any }> = ({ navigate }) => {
  const data = useData();
  const { user: currentUser } = useAuth();
  const ui = useUI();
  const [users, setUsers] = useState<User[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('comun');
  
  // Estados para editar usuario
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('comun');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    const res = await data.auth.listUsers();
    setUsers(res);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      ui.alert('Email y contraseña son obligatorios');
      return;
    }
    
    await data.auth.createUser({ email, password, role });
    setEmail('');
    setPassword('');
    setRole('comun');
    loadUsers();
    ui.alert('Usuario creado exitosamente');
  };

  const handleDelete = (id: string) => {
    ui.confirm('¿Eliminar usuario y todos sus datos?', async () => {
        await data.auth.deleteUser(id);
        loadUsers();
    });
  };

  const startEdit = (user: User) => {
    setEditingUserId(user.id);
    setEditEmail(user.email);
    setEditPassword(user.password || '');
    setEditRole(user.role);
    setShowPassword(false);
  };

  const cancelEdit = () => {
    setEditingUserId(null);
    setEditEmail('');
    setEditPassword('');
    setEditRole('comun');
  };

  const handleUpdate = async () => {
    if (!editingUserId) return;
    
    if (!editEmail) {
      ui.alert('El email es obligatorio');
      return;
    }

    try {
      // Primero obtener el usuario actual
      const usersList = await data.auth.listUsers();
      const userToUpdate = usersList.find(u => u.id === editingUserId);
      
      if (!userToUpdate) {
        ui.alert('Usuario no encontrado');
        return;
      }

      // Actualizar usuario
      const updatedUser = {
        ...userToUpdate,
        email: editEmail,
        role: editRole
      };

      // Si se proporcionó una nueva contraseña, actualizarla
      if (editPassword && editPassword !== userToUpdate.password) {
        updatedUser.password = editPassword;
      }

      // Necesitamos eliminar y recrear porque IndexedDB no tiene update parcial fácil
      await data.auth.deleteUser(editingUserId);
      await data.auth.createUser(updatedUser);
      
      ui.alert('Usuario actualizado exitosamente');
      cancelEdit();
      loadUsers();
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      ui.alert('Error al actualizar usuario');
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="p-6 h-full flex flex-col overflow-hidden">
      <h1 className="text-2xl font-black italic tracking-tight mb-6 text-rose-500">Administrar Usuarios</h1>
      
      {/* Formulario para crear nuevo usuario */}
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-3xl shadow-2xl mb-8 space-y-4">
        <h2 className="font-black text-white text-sm uppercase tracking-widest ml-1">Nuevo Usuario</h2>
        
        <form onSubmit={handleCreate} className="space-y-4">
          <input 
            className="w-full p-4 bg-slate-800 border-none rounded-2xl text-white outline-none focus:ring-4 focus:ring-rose-500/20 transition-all shadow-xl" 
            placeholder="Email / Usuario" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
            required 
          />
          
          <input 
            className="w-full p-4 bg-slate-800 border-none rounded-2xl text-white outline-none focus:ring-4 focus:ring-rose-500/20 transition-all shadow-xl" 
            type="password" 
            placeholder="Contraseña" 
            value={password} 
            onChange={e => setPassword(e.target.value)} 
            required 
          />
          
          <div className="space-y-2">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Tipo de Usuario</label>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={() => setRole('comun')}
                className={`flex-1 p-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border ${role === 'comun' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
              >
                Entrenador
              </button>
              <button 
                type="button"
                onClick={() => setRole('admin')}
                className={`flex-1 p-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all border ${role === 'admin' ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
              >
                Administrador
              </button>
            </div>
          </div>
          
          <button 
            type="submit" 
            className="w-full bg-rose-600 text-white p-4 rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all"
          >
            Crear Usuario
          </button>
        </form>
      </div>

      {/* Lista de usuarios */}
      <div className="flex-1 overflow-y-auto no-scrollbar space-y-4 pb-10">
        <h2 className="font-black text-white text-sm uppercase tracking-widest ml-1 mb-3">Usuarios Existentes</h2>
        
        {users.length === 0 && (
          <p className="text-center text-slate-700 py-8 text-[10px] font-black uppercase tracking-widest italic">No hay usuarios registrados</p>
        )}
        
        {users.map(u => {
          const isCurrentUser = u.id === currentUser?.id;
          const isEditing = editingUserId === u.id;
          
          return (
            <div key={u.id} className="bg-slate-900 p-5 rounded-3xl border border-white/5 flex flex-col shadow-lg transition-all">
              {isEditing ? (
                // Modo edición
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="font-black text-white">Editando Usuario</h3>
                    <button onClick={cancelEdit} className="text-slate-500 hover:text-white">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"/>
                      </svg>
                    </button>
                  </div>
                  
                  <input 
                    className="w-full p-3 bg-slate-800 border-none rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500/20"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    placeholder="Email"
                  />
                  
                  <div className="relative">
                    <input 
                      className="w-full p-3 bg-slate-800 border-none rounded-xl text-white outline-none focus:ring-2 focus:ring-blue-500/20 pr-10"
                      type={showPassword ? "text" : "password"}
                      value={editPassword}
                      onChange={e => setEditPassword(e.target.value)}
                      placeholder="Nueva contraseña (dejar vacío para mantener)"
                    />
                    <button 
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-500 hover:text-white"
                    >
                      {showPassword ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L6.59 6.59m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/>
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      onClick={() => setEditRole('comun')}
                      className={`flex-1 p-2 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all border ${editRole === 'comun' ? 'bg-blue-600 border-blue-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                    >
                      Entrenador
                    </button>
                    <button 
                      type="button"
                      onClick={() => setEditRole('admin')}
                      className={`flex-1 p-2 rounded-xl font-black uppercase text-[9px] tracking-widest transition-all border ${editRole === 'admin' ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-500'}`}
                    >
                      Administrador
                    </button>
                  </div>
                  
                  <div className="flex gap-2">
                    <button 
                      onClick={cancelEdit}
                      className="flex-1 bg-slate-800 text-slate-400 py-2 rounded-xl font-black text-[10px] uppercase"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleUpdate}
                      className="flex-1 bg-blue-600 text-white py-2 rounded-xl font-black text-[10px] uppercase"
                    >
                      Guardar
                    </button>
                  </div>
                </div>
              ) : (
                // Modo visualización
                <>
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <p className="font-black text-white text-lg">{u.email}</p>
                        {isCurrentUser && (
                          <span className="text-[8px] bg-blue-600 text-white px-2 py-1 rounded-full font-black uppercase tracking-widest">
                            TÚ
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <p className={`text-[10px] font-black uppercase tracking-widest ${u.role === 'admin' ? 'text-rose-500' : 'text-blue-500'}`}>
                          {u.role === 'admin' ? 'Administrador' : 'Entrenador'}
                        </p>
                        <span className="text-[8px] text-slate-600 font-medium">
                          ID: {u.id.substring(0, 8)}...
                        </span>
                      </div>
                      
                      {/* Mostrar contraseña (solo para admin o propio usuario) */}
                      {(currentUser?.role === 'admin' || isCurrentUser) && u.password && (
                        <div className="mt-3 p-3 bg-slate-800/50 rounded-xl">
                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest mb-1">Contraseña Actual</p>
                          <div className="flex items-center gap-2">
                            <code className="text-[11px] font-mono text-slate-300 bg-black/30 px-2 py-1 rounded">
                              {u.password}
                            </code>
                            <span className="text-[8px] text-slate-600 italic">(visible solo aquí)</span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="flex gap-1">
                      <button 
                        onClick={() => startEdit(u)}
                        className="p-3 bg-slate-800/50 rounded-2xl text-slate-500 hover:text-blue-400 transition-all"
                        title="Editar usuario"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/>
                        </svg>
                      </button>
                      
                      {!isCurrentUser && u.role !== 'admin' && (
                        <button 
                          onClick={() => handleDelete(u.id)}
                          className="p-3 bg-slate-800/50 rounded-2xl text-slate-500 hover:text-rose-500 transition-all"
                          title="Eliminar usuario"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/>
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-white/5 text-[9px] text-slate-600">
                    <p>Creado: {new Date(u.createdAt).toLocaleDateString()}</p>
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};