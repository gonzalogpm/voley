import { DataProvider, GenericRepository, User, Player, Team, Tournament, Match, WhiteboardState, AuthProvider } from '../types';
import { db } from './db';

const generateId = () => crypto.randomUUID();

const createRepo = <T extends { id: string, userId: string }>(storeName: string): GenericRepository<T> => ({
  getAll: async (userId: string) => db.getAllByUserId<T>(storeName, userId),
  getById: async (id: string) => db.perform<T>(storeName, 'readonly', s => s.get(id)),
  create: async (item: T) => {
    const newItem = { ...item, id: item.id || generateId(), createdAt: Date.now() };
    await db.perform(storeName, 'readwrite', s => s.add(newItem));
    return newItem;
  },
  update: async (id: string, item: Partial<T>) => {
    const existing = await db.perform<T>(storeName, 'readonly', s => s.get(id));
    const updated = { ...existing, ...item };
    await db.perform(storeName, 'readwrite', s => s.put(updated));
    return updated;
  },
  delete: async (id: string) => {
    await db.perform(storeName, 'readwrite', s => s.delete(id));
  }
});

const localAuth: AuthProvider = {
  getCurrentUser: () => {
    const saved = localStorage.getItem('vc_session');
    return saved ? JSON.parse(saved) : null;
  },
  login: async (email, password) => {
    const users = await db.perform<User[]>('users', 'readonly', s => s.getAll());
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) throw new Error('Credenciales inválidas');
    
    // Guardar sesión (sin contraseña por seguridad)
    const { password: _, ...userWithoutPassword } = user;
    localStorage.setItem('vc_session', JSON.stringify(userWithoutPassword));
    
    return user;
  },
  logout: () => {
    // Eliminar solo la sesión, NO los datos de "recordarme"
    localStorage.removeItem('vc_session');
  },
  createUser: async (userData) => {
    const newUser = { ...userData, id: generateId(), createdAt: Date.now() };
    await db.perform('users', 'readwrite', s => s.add(newUser));
    return newUser;
  },
  deleteUser: async (userId) => {
    // Cascade delete simulation
    const stores = ['players', 'teams', 'tournaments', 'matches'];
    for (const store of stores) {
        const items = await db.getAllByUserId<{id: string}>(store, userId);
        for (const item of items) {
            await db.perform(store, 'readwrite', s => s.delete(item.id));
        }
    }
    await db.perform('users', 'readwrite', s => s.delete(userId));
  },
  listUsers: async () => db.perform<User[]>('users', 'readonly', s => s.getAll())
};

export const localProvider: DataProvider = {
  auth: localAuth,
  players: createRepo<Player>('players'),
  teams: createRepo<Team>('teams'),
  tournaments: createRepo<Tournament>('tournaments'),
  matches: createRepo<Match>('matches'),
  whiteboard: {
    get: async (userId) => {
        const items = await db.perform<WhiteboardState[]>('whiteboard', 'readonly', s => s.getAll());
        return items.find(i => i.userId === userId) || null;
    },
    save: async (state) => {
        await db.perform('whiteboard', 'readwrite', s => s.put(state));
    }
  }
};
