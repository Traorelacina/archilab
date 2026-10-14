import React, { useEffect, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { adminApi } from '../../api/admin';
import { formatPrix } from '../../utils/format';
import { IconBox, IconTrendingUp, IconCreditCard, IconBarChart } from '../../components/ui/Icons';

export default function PartenaireDashboard() {
  const { user } = useAuthStore();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { adminApi.dashboard().then(r => setStats(r.data)).finally(() => setLoading(false)); }, []);

  const cards = [
    { label: 'CA du mois', value: stats ? formatPrix(stats.ca_mois) : '—', icon: <IconTrendingUp size={20} />, color: 'var(--color-terra)' },
    { label: 'Commandes en cours', value: stats?.commandes_en_cours ?? '—', icon: <IconBox size={20} />, color: 'var(--color-bois)' },
    { label: 'Alertes stock', value: stats?.alertes_stock ?? '—', icon: <IconBarChart size={20} />, color: 'var(--color-warning)' },
  ];

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 4 }}>
        Bonjour, {user?.name?.split(' ')[0]} 👋
      </h1>
      <p style={{ color: 'var(--color-gris-moyen)', marginBottom: 'var(--space-8)', fontSize: 'var(--text-sm)' }}>Portail partenaire ARCHILAB</p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-8)' }}>
        {cards.map(c => (
          <div key={c.label} className="card" style={{ padding: 'var(--space-5)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: `${c.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.color }}>
                {c.icon}
              </div>
              <div>
                <p style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-xl)', fontWeight: 700, color: 'var(--color-charbon)' }}>{loading ? '—' : c.value}</p>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gris-moyen)' }}>{c.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {stats?.top_produits?.length > 0 && (
        <div className="card" style={{ padding: 'var(--space-5)' }}>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Mes produits les plus vendus</h2>
          <div className="table-wrapper">
            <table className="table">
              <thead><tr><th>#</th><th>Produit</th><th>Ventes</th><th>CA</th></tr></thead>
              <tbody>
                {stats.top_produits.map((p: any, i: number) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--color-gris-moyen)' }}>{i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{p.nom}</td>
                    <td>{p.ventes}</td>
                    <td style={{ fontWeight: 700, color: 'var(--color-terra)' }}>{formatPrix(p.ca)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
