import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { IconHome, IconBox, IconFileText, IconHeart, IconUser, IconCreditCard } from '../ui/Icons';

const NAV = [
  { to: '/espace-client', label: 'Tableau de bord', icon: <IconHome size={16} />, exact: true },
  { to: '/espace-client/commandes', label: 'Mes commandes', icon: <IconBox size={16} /> },
  { to: '/espace-client/devis', label: 'Mes devis', icon: <IconFileText size={16} /> },
  { to: '/espace-client/factures', label: 'Mes factures', icon: <IconCreditCard size={16} /> },
  { to: '/espace-client/favoris', label: 'Mes favoris', icon: <IconHeart size={16} /> },
  { to: '/espace-client/profil', label: 'Mon profil', icon: <IconUser size={16} /> },
];

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useAuthStore();

  return (
    <div className="cl-shell">
      <div className="container cl-layout">
        {/* Sidebar */}
        <aside className="cl-sidebar">
          <div className="card cl-profile-card">
            <div className="cl-profile-user">
              <div className="cl-avatar">
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="cl-profile-name">{user?.name}</p>
                <p className="cl-profile-role">Client</p>
              </div>
            </div>
          </div>
          <div className="card cl-nav-card">
            <nav className="cl-nav">
              {NAV.map(item => {
                const active = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
                return (
                  <Link key={item.to} to={item.to} className={`cl-nav-link${active ? ' is-active' : ''}`}>
                    <span>{item.icon}</span> {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="cl-catalogue-wrap">
            <Link to="/catalogue" className="btn btn-primary cl-catalogue-link">
              ← Retour au catalogue
            </Link>
          </div>
        </aside>

        {/* Main */}
        <main>{children}</main>
      </div>
    </div>
  );
}
