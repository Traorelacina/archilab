import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import toast from 'react-hot-toast';
import {
  IconHome, IconGrid, IconBox, IconUsers, IconBarChart, IconSettings,
  IconFileText, IconCreditCard, IconLogOut, IconChevronDown, IconBell,
  IconAlertTriangle, IconUser, IconTrendingUp, IconPackage
} from '../ui/Icons';

interface NavItem { label: string; to: string; icon: React.ReactNode; roles?: string[]; children?: NavItem[]; }

const NAV: NavItem[] = [
  { label: 'Tableau de bord', to: '/admin', icon: <IconHome size={16} /> },
  {
    label: 'Catalogue', to: '/admin/catalogue', icon: <IconGrid size={16} />,
    roles: ['super_admin','gestionnaire_catalogue'],
    children: [
      { label: 'Produits', to: '/admin/catalogue/produits', icon: <IconBox size={14} /> },
      { label: 'Catégories', to: '/admin/catalogue/categories', icon: <IconGrid size={14} /> },
      { label: 'Collections', to: '/admin/catalogue/collections', icon: <IconPackage size={14} /> },
      { label: 'Numérisations', to: '/admin/catalogue/numerisation', icon: <IconFileText size={14} /> },
    ],
  },
  {
    label: 'Coûts & marges',
    to: '/admin/catalogue/couts',
    icon: <IconBarChart size={16} />,
    roles: ['super_admin', 'gestionnaire_catalogue', 'comptable'],
  },
  {
    label: 'Stocks', to: '/admin/stocks', icon: <IconBox size={16} />,
    roles: ['super_admin','gestionnaire_stock'],
    children: [
      { label: 'Inventaire', to: '/admin/stocks/inventaire', icon: <IconBox size={14} /> },
      { label: 'Mouvements', to: '/admin/stocks/mouvements', icon: <IconTrendingUp size={14} /> },
      { label: 'Alertes', to: '/admin/stocks/alertes', icon: <IconAlertTriangle size={14} /> },
      { label: 'Dépôts', to: '/admin/stocks/depots', icon: <IconHome size={14} /> },
    ],
  },
  {
    label: 'Ventes', to: '/admin/ventes', icon: <IconTrendingUp size={16} />,
    roles: ['super_admin','commercial'],
    children: [
      { label: 'Commandes', to: '/admin/ventes/commandes', icon: <IconBox size={14} /> },
      { label: 'Devis', to: '/admin/ventes/devis', icon: <IconFileText size={14} /> },
      { label: 'Clients', to: '/admin/ventes/clients', icon: <IconUsers size={14} /> },
      { label: 'Avis', to: '/admin/ventes/avis', icon: <IconBarChart size={14} /> },
    ],
  },
  {
    label: 'Finance', to: '/admin/finance', icon: <IconCreditCard size={16} />,
    roles: ['super_admin','comptable'],
    children: [
      { label: 'Factures', to: '/admin/finance/factures', icon: <IconFileText size={14} /> },
      { label: 'Paiements', to: '/admin/finance/paiements', icon: <IconCreditCard size={14} /> },
      { label: 'Reversements', to: '/admin/finance/reversements', icon: <IconTrendingUp size={14} /> },
    ],
  },
  {
    label: 'Administration', to: '/admin/administration', icon: <IconSettings size={16} />,
    roles: ['super_admin'],
    children: [
      { label: 'Partenaires', to: '/admin/administration/partenaires', icon: <IconUsers size={14} /> },
      { label: 'Utilisateurs', to: '/admin/administration/utilisateurs', icon: <IconUser size={14} /> },
      { label: 'Journal audit', to: '/admin/administration/audit', icon: <IconFileText size={14} /> },
      { label: 'Paramètres', to: '/admin/administration/parametres', icon: <IconSettings size={14} /> },
    ],
  },
];

function NavSection({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const userRoles = [...(user?.roles ?? []), ...(user ? [user.role] : [])];
  const [open, setOpen] = useState(location.pathname.startsWith(item.to));
  const isActive = location.pathname.startsWith(item.to);

  if (!item.children) {
    return (
      <Link to={item.to} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 16px', borderRadius: 10, margin: '1px 8px',
        fontSize: 'var(--text-sm)', fontWeight: 500,
        color: isActive ? 'white' : 'rgba(255,255,255,.55)',
        background: isActive ? 'rgba(196,98,58,.25)' : 'transparent',
        transition: 'all 200ms', textDecoration: 'none',
      }}>
        <span style={{ flexShrink: 0, opacity: isActive ? 1 : .7 }}>{item.icon}</span>
        {!collapsed && item.label}
      </Link>
    );
  }

  return (
    <div>
      <button onClick={() => setOpen(v => !v)} style={{
        display: 'flex', alignItems: 'center', gap: 10,
        padding: '9px 16px', margin: '1px 8px', width: 'calc(100% - 16px)',
        borderRadius: 10, border: 'none', cursor: 'pointer',
        fontSize: 'var(--text-sm)', fontWeight: 500,
        color: isActive ? 'white' : 'rgba(255,255,255,.55)',
        background: isActive ? 'rgba(255,255,255,.06)' : 'transparent',
        justifyContent: 'space-between',
      }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ flexShrink: 0, opacity: isActive ? 1 : .7 }}>{item.icon}</span>
          {!collapsed && item.label}
        </span>
        {!collapsed && <span style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms', opacity: .5 }}><IconChevronDown size={12} /></span>}
      </button>
      {open && !collapsed && (
        <div style={{ paddingLeft: 12 }}>
          {item.children.filter((child) => !child.roles || child.roles.some((role) => userRoles.some((userRole) => userRole === role))).map(child => {
            const childActive = location.pathname === child.to || location.pathname.startsWith(`${child.to}/`);
            return (
              <Link key={child.to} to={child.to} style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '7px 14px', borderRadius: 8, margin: '1px 8px',
                fontSize: 'var(--text-xs)', fontWeight: childActive ? 600 : 400,
                color: childActive ? 'var(--color-terra-light)' : 'rgba(255,255,255,.45)',
                background: childActive ? 'rgba(196,98,58,.15)' : 'transparent',
                transition: 'all 150ms', textDecoration: 'none',
              }}>
                <span style={{ opacity: .7 }}>{child.icon}</span> {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuthStore();
  const userRoles = [...(user?.roles ?? []), ...(user ? [user.role] : [])];
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = async () => {
    try { await authApi.logout(); } catch (_) {}
    logout();
    toast.success('Déconnexion réussie');
    navigate('/');
  };

  const sidebarW = collapsed ? 68 : 260;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {/* SIDEBAR */}
      <aside style={{
        position: 'fixed', top: 0, left: 0, bottom: 0,
        width: sidebarW, background: 'var(--color-charbon)',
        display: 'flex', flexDirection: 'column',
        transition: 'width 250ms var(--ease-smooth)',
        zIndex: 200, overflow: 'hidden',
      }}>
        {/* Logo */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '18px 16px', borderBottom: '1px solid rgba(255,255,255,.06)',
          flexShrink: 0,
        }}>
          <div style={{ width: 34, height: 34, background: 'linear-gradient(135deg, var(--color-terra), var(--color-bois-dark))', borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
          </div>
          {!collapsed && (
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, color: 'white', fontSize: 16, lineHeight: 1 }}>ARCHILAB</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)', marginTop: 2 }}>Back-office</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          {NAV.filter((item) => !item.roles || item.roles.some((role) => userRoles.some((userRole) => userRole === role))).map(item => (
            <NavSection key={item.to} item={item} collapsed={collapsed} />
          ))}
        </nav>

        {/* Utilisateur */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '12px 8px' }}>
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '10px 12px', borderRadius: 10,
            background: 'rgba(255,255,255,.04)',
          }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--color-bois), var(--color-terra))',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'white', fontSize: 13, fontWeight: 700, flexShrink: 0,
            }}>
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            {!collapsed && (
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'white', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,.4)' }}>{user?.role?.replace('_', ' ')}</div>
              </div>
            )}
          </div>
          <button onClick={handleLogout} style={{
            display: 'flex', alignItems: 'center', gap: 10, width: '100%',
            padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
            marginTop: 6, color: 'rgba(255,255,255,.4)', background: 'transparent',
            fontSize: 'var(--text-xs)', transition: 'all 200ms',
          }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-error)'; e.currentTarget.style.background = 'rgba(184,50,50,.08)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,.4)'; e.currentTarget.style.background = 'transparent'; }}
          >
            <IconLogOut size={14} />
            {!collapsed && 'Déconnexion'}
          </button>
        </div>
      </aside>

      {/* CONTENT */}
      <div style={{ marginLeft: sidebarW, flex: 1, display: 'flex', flexDirection: 'column', transition: 'margin-left 250ms var(--ease-smooth)', minWidth: 0 }}>
        {/* Topbar */}
        <header style={{
          position: 'sticky', top: 0, zIndex: 100,
          background: 'rgba(247,243,238,.95)', backdropFilter: 'blur(12px)',
          borderBottom: '1px solid var(--color-ivoire-dark)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 var(--space-6)', height: 60,
          boxShadow: 'var(--shadow-sm)',
        }}>
          <button onClick={() => setCollapsed(v => !v)} style={{ padding: 8, borderRadius: 'var(--radius-md)', color: 'var(--color-gris-moyen)', cursor: 'pointer' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="18" x2="21" y2="18"/>
            </svg>
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Link to="/" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gris-moyen)', fontWeight: 500 }} target="_blank">↗ Voir le site</Link>
            <button style={{ position: 'relative', padding: 8, borderRadius: 'var(--radius-md)', color: 'var(--color-gris-moyen)' }}>
              <IconBell size={18} />
              <span style={{ position: 'absolute', top: 4, right: 4, width: 8, height: 8, background: 'var(--color-terra)', borderRadius: '50%', border: '2px solid var(--color-ivoire)' }} />
            </button>
          </div>
        </header>

        {/* Page content */}
        <main style={{ flex: 1, padding: 'var(--space-6)', overflow: 'auto' }}>
          {children}
        </main>
      </div>
    </div>
  );
}
