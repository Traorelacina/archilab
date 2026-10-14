import { create } from 'zustand';
import type { User } from '../types';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

function normalizeUser(user: User): User {
  return {
    ...user,
    role: user.role ?? user.roles?.[0] ?? 'client',
  };
}

const savedUser = localStorage.getItem('mobilia_user');
const savedToken = localStorage.getItem('mobilia_token');
const initialUser = savedUser ? normalizeUser(JSON.parse(savedUser)) : null;

export const useAuthStore = create<AuthState>((set) => ({
  user: initialUser,
  token: savedToken ?? null,
  isAuthenticated: !!savedToken,

  setAuth: (user, token) => {
    const normalizedUser = normalizeUser(user);
    localStorage.setItem('mobilia_token', token);
    localStorage.setItem('mobilia_user', JSON.stringify(normalizedUser));
    set({ user: normalizedUser, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('mobilia_token');
    localStorage.removeItem('mobilia_user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (partial) =>
    set((s) => {
      const updated = s.user ? { ...s.user, ...partial } : null;
      if (updated) localStorage.setItem('mobilia_user', JSON.stringify(updated));
      return { user: updated };
    }),
}));
