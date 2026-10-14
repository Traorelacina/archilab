import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { IconHome, IconBox, IconBarChart, IconFileText, IconCreditCard, IconUser } from '../ui/Icons';

const NAV = [
  { to: '/partenaire', label: 'Tableau de bord', icon: <IconHome size={16} />, exact: true },
  { to: '/partenaire/produits', label: 'Mes produits', icon: <IconBox size={16} /> },
  { to: '/partenaire/commandes', label: 'Commandes', icon: <IconBarChart size={16} /> },
  { to: '/partenaire/reversements', label: 'Reversements', icon: <IconCreditCard size={16} /> },
  { to: '/partenaire/profil', label: 'Mon profil', icon: <IconUser size={16} /> },
];

export default function PartenaireLayout({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const { user } = useAuthStore();

  return (
    <div style={{ background: 'var(--color-ivoire)', minHeight: 'calc(100vh - 72px)' }}>
      <div className="container" style={{ display: 'grid', gridTemplateColumns: '240px 1fr', gap: 'var(--space-8)', padding: 'var(--space-8) var(--space-6)' }}>
        <aside>
          <div className="card" style={{ padding: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: 'linear-gradient(135deg, var(--color-terra), var(--color-bois-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700 }}>
                {user?.name?.charAt(0).toUpperCase()}
              </div>
              <div>
                <p style={{ fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-charbon)' }}>{user?.name}</p>
                <p style={{ fontSize: 10, color: 'var(--color-terra)', fontWeight: 600 }}>Partenaire</p>
              </div>
            </div>
          </div>
          <div className="card" style={{ overflow: 'hidden' }}>
            <nav style={{ display: 'flex', flexDirection: 'column' }}>
              {NAV.map(item => {
                const active = item.exact ? location.pathname === item.to : location.pathname.startsWith(item.to);
                return (
                  <Link key={item.to} to={item.to} style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '11px 16px', fontSize: 'var(--text-sm)', fontWeight: active ? 600 : 400,
                    color: active ? 'var(--color-terra)' : 'var(--color-gris-fonce)',
                    background: active ? 'rgba(196,98,58,.06)' : 'transparent',
                    borderLeft: `3px solid ${active ? 'var(--color-terra)' : 'transparent'}`,
                    textDecoration: 'none', transition: 'all 150ms',
                  }}>
                    <span style={{ opacity: active ? 1 : .6 }}>{item.icon}</span> {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </aside>
        <main>{children}</main>
      </div>
    </div>
  );
}
