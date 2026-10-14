import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import type { Role } from '../types';

export function useGuard(allowedRoles?: Role[]) {
  const { isAuthenticated, user } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) { navigate('/connexion', { replace: true }); return; }
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, user, allowedRoles, navigate]);
}
