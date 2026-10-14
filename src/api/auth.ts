import api from './client';
import type { User } from '../types';

export const authApi = {
  login: (email: string, password: string) =>
    api.post<{ token: string; user: User }>('/auth/login', { email, password }),

  register: (data: {
    name: string;
    email: string;
    password: string;
    password_confirmation: string;
    telephone: string;
    type?: 'particulier' | 'professionnel';
    raison_sociale?: string;
    ncc?: string;
    ville?: string;
  }) =>
    api.post<{ token: string; user: User }>('/auth/register', data),

  logout: () => api.post('/auth/logout'),

  me: () => api.get<{ user: User }>('/auth/me'),

  changerMotDePasse: (data: {
    mot_de_passe_actuel: string;
    password: string;
    password_confirmation: string;
  }) =>
    api.put('/auth/mot-de-passe', data),
};
