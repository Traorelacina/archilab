import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import type { DashboardStats } from '../../types';
import { formatPrix, formatDateCourt } from '../../utils/format';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import {
  IconTrendingUp, IconBox, IconFileText, IconAlertTriangle,
  IconBarChart, IconArrowRight
} from '../../components/ui/Icons';

function StatCard({ label, value, icon, color, sub }: { label: string; value: string | number; icon: React.ReactNode; color: string; sub?: string }) {
  return (
    <div className="card" style={{ padding: 'var(--space-5)' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
        <div style={{ width: 44, height: 44, borderRadius: 12, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color }}>{icon}</div>
        {sub && <span style={{ fontSize: 10, color: 'var(--color-success)', fontWeight: 600, background: 'rgba(61,139,95,.1)', padding: '3px 8px', borderRadius: 20 }}>{sub}</span>}
      </div>
      <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-charbon)', marginBottom: 2 }}>{value}</p>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gris-moyen)', fontWeight: 500 }}>{label}</p>
    </div>
  );
}

export default function AdminDashboard() {
  const user = useAuthStore((state) => state.user);
  const roles = new Set([...(user?.roles ?? []), ...(user ? [user.role] : [])]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    adminApi.dashboard()
      .then((response) => {
        setStats(response.data);
        setLoadError(false);
      })
      .catch(() => {
        setLoadError(true);
        toast.error('Impossible de charger le tableau de bord.');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* En-tête */}
      <div>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, color: 'var(--color-charbon)', marginBottom: 4 }}>Tableau de bord</h1>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gris-moyen)' }}>Vue d'ensemble de l'activité ARCHILAB</p>
      </div>

      {loadError && (
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <p>Les indicateurs sont momentanément indisponibles. Rechargez la page pour réessayer.</p>
        </div>
      )}

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
        <StatCard label="CA du jour" value={stats ? formatPrix(stats.ca_jour) : '—'} icon={<IconTrendingUp size={20} />} color="var(--color-terra)" />
        <StatCard label="CA du mois" value={stats ? formatPrix(stats.ca_mois) : '—'} icon={<IconBarChart size={20} />} color="var(--color-bois)" />
        <StatCard label="Commandes en cours" value={stats?.commandes_en_cours ?? '—'} icon={<IconBox size={20} />} color="var(--color-info)" />
        <StatCard label="Devis en attente" value={stats?.devis_en_attente ?? '—'} icon={<IconFileText size={20} />} color="var(--color-warning)" />
        {(stats?.alertes_stock ?? 0) > 0 && (
          <StatCard label="Alertes stock" value={stats?.alertes_stock ?? 0} icon={<IconAlertTriangle size={20} />} color="var(--color-error)" />
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
        {/* Top produits */}
        {stats?.top_produits && stats.top_produits.length > 0 && (
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700 }}>Top produits</h2>
              {roles.has('super_admin') || roles.has('gestionnaire_catalogue') ? (
                <Link to="/admin/catalogue/produits" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-terra)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>Voir tout <IconArrowRight size={12} /></Link>
              ) : null}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.top_produits.slice(0, 5).map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ width: 24, height: 24, borderRadius: 6, background: 'var(--color-ivoire-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: 'var(--color-gris-moyen)' }}>{i + 1}</span>
                    <div>
                      <p style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-charbon)' }}>{p.nom}</p>
                      <p style={{ fontSize: 10, color: 'var(--color-gris-moyen)' }}>{p.ventes} ventes</p>
                    </div>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--color-terra)', fontSize: 'var(--text-sm)' }}>{formatPrix(p.ca)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Top partenaires */}
        {stats?.top_partenaires && stats.top_partenaires.length > 0 && (
          <div className="card" style={{ padding: 'var(--space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-4)' }}>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700 }}>Top partenaires</h2>
              {roles.has('super_admin') ? (
                <Link to="/admin/administration/partenaires" style={{ fontSize: 'var(--text-xs)', color: 'var(--color-terra)', fontWeight: 600, textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 4 }}>Voir tout <IconArrowRight size={12} /></Link>
              ) : null}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {stats.top_partenaires.slice(0, 5).map((p, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: 'linear-gradient(135deg, var(--color-bois-light), var(--color-bois-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 12, fontWeight: 700 }}>{p.nom.charAt(0)}</div>
                    <span style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-charbon)' }}>{p.nom}</span>
                  </div>
                  <span style={{ fontWeight: 700, color: 'var(--color-bois)', fontSize: 'var(--text-sm)' }}>{formatPrix(p.ca)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Évolution CA */}
      {stats?.evolution_ca && stats.evolution_ca.length > 0 && (
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-5)' }}>Évolution du chiffre d'affaires</h2>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140 }}>
            {(() => {
              const max = Math.max(...stats.evolution_ca.map(e => e.montant), 1);
              return stats.evolution_ca.slice(-14).map((e, i) => (
                <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                  <div style={{ width: '100%', background: `linear-gradient(to top, var(--color-terra), var(--color-terra-light))`, borderRadius: '4px 4px 0 0', height: `${(e.montant / max) * 110}px`, minHeight: 4, transition: 'height 400ms ease' }} title={formatPrix(e.montant)} />
                  <span style={{ fontSize: 9, color: 'var(--color-gris-moyen)', transform: 'rotate(-30deg)', whiteSpace: 'nowrap' }}>{e.date.slice(5)}</span>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* Raccourcis actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
        {[
          ...(roles.has('super_admin') || roles.has('commercial') ? [
            { label: 'Nouvelle commande', to: '/admin/ventes/commandes', color: 'var(--color-terra)' },
            { label: 'Modérer les avis', to: '/admin/ventes/avis', color: 'var(--color-warning)' },
          ] : []),
          ...(roles.has('super_admin') || roles.has('gestionnaire_stock') ? [
            { label: 'Gérer les stocks', to: '/admin/stocks/inventaire', color: 'var(--color-bois)' },
          ] : []),
          ...(roles.has('super_admin') || roles.has('comptable') ? [
            { label: 'Valider des paiements', to: '/admin/finance/paiements', color: 'var(--color-success)' },
          ] : []),
        ].map(a => (
          <Link key={a.label} to={a.to} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: 'var(--space-4)', background: `${a.color}10`,
            borderRadius: 'var(--radius-lg)', border: `1px solid ${a.color}25`,
            color: a.color, fontWeight: 600, fontSize: 'var(--text-sm)',
            textDecoration: 'none', transition: 'all 200ms',
          }}
            onMouseEnter={e => { e.currentTarget.style.background = `${a.color}18`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = `${a.color}10`; e.currentTarget.style.transform = 'none'; }}
          >
            {a.label} <IconArrowRight size={14} />
          </Link>
        ))}
      </div>
    </div>
  );
}
