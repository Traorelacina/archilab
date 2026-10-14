import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.DEV ? '/api' : (import.meta.env.VITE_API_URL ?? 'http://localhost:8000/api'),
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
});

// Injecter le token Bearer
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('mobilia_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Gérer les erreurs 401
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('mobilia_token');
      localStorage.removeItem('mobilia_user');
      window.location.href = '/connexion';
    }
    return Promise.reject(error);
  }
);

export default api;
