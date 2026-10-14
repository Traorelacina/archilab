import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi } from '../../api/admin';
import type { Produit } from '../../types';
import { formatPrix } from '../../utils/format';
import { IconPlus, IconEdit, IconEye } from '../../components/ui/Icons';
import toast from 'react-hot-toast';

export default function PartenaireProduitsPage() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    adminApi.partenaireProduits()
      .then((response) => setProduits(response.data.data))
      .catch(() => toast.error('Impossible de charger vos produits.'))
      .finally(() => setLoading(false));
  }, []);

  const statutStyle: Record<string, string> = { publie: 'badge-success', brouillon: 'badge-neutral', archive: 'badge-error' };
  const statutLabel: Record<string, string> = { publie: 'Publié', brouillon: 'Brouillon', archive: 'Archivé' };

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 'var(--space-6)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700 }}>Mes produits</h1>
        <Link to="/partenaire/produits/nouveau" className="btn btn-primary" style={{ gap: 6 }}>
          <IconPlus size={15} /> Nouveau produit
        </Link>
      </div>

      {loading ? <div className="page-loader"><div className="spinner" /></div> :
        produits.length === 0 ? (
          <div className="empty-state">
            <h3>Aucun produit</h3>
            <p>Commencez par ajouter votre premier produit.</p>
            <Link to="/partenaire/produits/nouveau" className="btn btn-primary" style={{ marginTop: 16 }}>Ajouter un produit</Link>
          </div>
        ) : (
          <div className="table-wrapper card">
            <table className="table">
              <thead><tr><th>Produit</th><th>Référence</th><th>Catégorie</th><th>Prix</th><th>Stock</th><th>Statut</th><th>Actions</th></tr></thead>
              <tbody>
                {produits.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 600, color: 'var(--color-charbon)' }}>{p.nom}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-xs)', color: 'var(--color-gris-moyen)' }}>{p.reference}</td>
                    <td style={{ color: 'var(--color-gris-moyen)' }}>{p.categorie?.nom ?? '—'}</td>
                    <td style={{ fontWeight: 600, color: 'var(--color-terra)' }}>{formatPrix(p.prix_min)}</td>
                    <td>{p.stock_total}</td>
                    <td><span className={`badge ${statutStyle[p.statut]}`}>{statutLabel[p.statut]}</span></td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <Link to={`/catalogue/${p.slug}`} target="_blank" className="btn btn-ghost btn-sm"><IconEye size={13} /></Link>
                        <Link to={`/partenaire/produits/${p.id}/modifier`} className="btn btn-ghost btn-sm"><IconEdit size={13} /></Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
    </div>
  );
}
