import React, { useEffect, useState } from 'react';
import { clientApi } from '../../api/client-api';
import type { Facture } from '../../types';
import { formatPrix, formatDate, statutFacture } from '../../utils/format';
import { IconCreditCard, IconDownload } from '../../components/ui/Icons';
import toast from 'react-hot-toast';

export default function FacturesPage() {
  const [factures, setFactures] = useState<Facture[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  useEffect(() => {
    let mounted = true;

    clientApi.factures({ page })
      .then((response) => {
        if (mounted) {
          setFactures(response.data.data ?? []);
          setLastPage(response.data.last_page ?? 1);
          setLoadError(false);
        }
      })
      .catch(() => {
        if (mounted) {
          setLoadError(true);
          toast.error('Impossible de charger vos factures.');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [page]);

  const handleDownload = async (id: number, numero: string) => {
    try {
      const res = await clientApi.facturePdf(id);
      const url = URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `facture-${numero}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      toast.error('Impossible de télécharger cette facture.');
    }
  };

  const typeLabel: Record<string, string> = { proforma: 'Pro forma', acompte: 'Acompte', definitive: 'Définitive', avoir: 'Avoir' };

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Mes factures</h1>
      {loading ? <div className="page-loader"><div className="spinner" /></div> :
        loadError ? (
          <div className="empty-state">
            <h3>Factures indisponibles</h3>
            <p>Une erreur est survenue pendant le chargement de vos factures.</p>
          </div>
        ) :
        factures.length === 0 ? (
          <div className="empty-state">
            <IconCreditCard size={48} style={{ margin: '0 auto 12px', opacity: .3 }} />
            <h3>Aucune facture</h3>
            <p>Vos factures apparaîtront ici une fois vos commandes confirmées.</p>
          </div>
        ) : (
          <div className="table-wrapper card">
            <table className="table">
              <thead><tr><th>Numéro</th><th>Type</th><th>Commande</th><th>Date</th><th>Montant</th><th>Statut</th><th>Action</th></tr></thead>
              <tbody>
                {factures.map(f => {
                  const st = statutFacture[f.statut] ?? { label: f.statut, cls: 'badge-neutral' };
                  return (
                    <tr key={f.id}>
                      <td style={{ fontWeight: 600 }}>{f.numero}</td>
                      <td>{typeLabel[f.type] ?? f.type}</td>
                      <td style={{ color: 'var(--color-gris-moyen)' }}>{f.commande?.numero ?? '—'}</td>
                      <td style={{ color: 'var(--color-gris-moyen)' }}>{formatDate(f.date_emission ?? f.created_at)}</td>
                      <td style={{ fontWeight: 700, color: 'var(--color-terra)' }}>{formatPrix(f.montant_ttc)}</td>
                      <td><span className={`badge ${st.cls}`}>{st.label}</span></td>
                      <td>
                        <button onClick={() => handleDownload(f.id, f.numero)} className="btn btn-ghost btn-sm" style={{ gap: 4 }}>
                          <IconDownload size={13} /> PDF
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      {!loading && !loadError && lastPage > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, marginTop: 'var(--space-5)' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Précédent
          </button>
          <span>Page {page} sur {lastPage}</span>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            disabled={page >= lastPage}
            onClick={() => setPage((current) => Math.min(lastPage, current + 1))}
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  );
}
