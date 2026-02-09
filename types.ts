export type UserRole = 'admin' | 'comun';

export interface User {
  id: string;
  email: string;
  password?: string;  // Asegurar que password sea opcional pero disponible
  role: UserRole;
  createdAt: number;
}

export type PlayerPosition = 'ARMADORA' | 'OPUESTA' | 'PUNTA' | 'CENTRAL' | 'LIBERO';

export interface Player {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  number?: string; // Jersey number
  positions: PlayerPosition[]; // Updated to multiple
  active: boolean;
  createdAt: number;
}

export interface Team {
  id: string;
  userId: string;
  name: string;
  playerIds: string[];
  createdAt: number;
}

export interface Tournament {
  id: string;
  userId: string;
  name: string;
  date: string;
  createdAt: number;
}

export interface SetData {
  id: string;
  setNumber: number;
  scoreTeam: number;
  scoreOpponent: number;
  lineup: { [key: number]: string | null }; // positions 1-6 + libero (7)
  isCompleted: boolean;
}

export interface Match {
  id: string;
  userId: string;
  teamId: string;
  tournamentId?: string;
  opponent: string;
  date: string;
  tournamentDate?: string;
  isHome: boolean;
  sets: SetData[];
  winner?: 'team' | 'opponent';
  completed: boolean;
  createdAt: number;
}

export interface WhiteboardState {
  id: string;
  userId: string;
  dataUrl: string; // Base64 image
  updatedAt: number;
}

// Data Provider Interfaces
export interface AuthProvider {
  getCurrentUser: () => User | null;
  login: (email: string, password: string) => Promise<User>;
  logout: () => void;
  createUser: (userData: Omit<User, 'id' | 'createdAt'>) => Promise<User>;
  deleteUser: (userId: string) => Promise<void>;
  listUsers: () => Promise<User[]>;
}

export interface GenericRepository<T> {
  getAll: (userId: string) => Promise<T[]>;
  getById: (id: string) => Promise<T | undefined>;
  create: (item: T) => Promise<T>;
  update: (id: string, item: Partial<T>) => Promise<T>;
  delete: (id: string) => Promise<void>;
}

export interface DataProvider {
  auth: AuthProvider;
  players: GenericRepository<Player>;
  teams: GenericRepository<Team>;
  tournaments: GenericRepository<Tournament>;
  matches: GenericRepository<Match>;
  whiteboard: {
    get: (userId: string) => Promise<WhiteboardState | null>;
    save: (state: WhiteboardState) => Promise<void>;
  };
}