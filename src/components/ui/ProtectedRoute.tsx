import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import type { Role } from '../../types';

interface Props { children: React.ReactNode; roles?: Role[]; }

export default function ProtectedRoute({ children, roles }: Props) {
  const { isAuthenticated, user } = useAuthStore();
  const location = useLocation();
  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/connexion?redirect=${encodeURIComponent(redirect)}`} replace />;
  }
  if (roles && user && ![user.role, ...(user.roles ?? [])].some((role) => roles.includes(role))) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
