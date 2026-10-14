import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { clientApi } from '../../api/client-api';
import type { Commande } from '../../types';
import { formatPrix, formatDate, statutCommande } from '../../utils/format';
import { IconBox } from '../../components/ui/Icons';
import '../../client-ui.css';

export default function CommandesPage() {
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    clientApi.commandes({ page })
      .then((response) => {
        if (!mounted) return;
        setCommandes(response.data.data);
        setLastPage(response.data.last_page);
        setLoadError(false);
      })
      .catch(() => {
        if (mounted) {
          setLoadError(true);
          toast.error('Impossible de charger vos commandes.');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [page]);

  return (
    <div className="cl-page">
      <div className="cl-head">
        <div>
          <h1 className="cl-title">Mes commandes</h1>
          <p className="cl-sub">Suivez l’état de vos achats et retrouvez leur détail.</p>
        </div>
      </div>

      {loading ? (
        <div className="cl-loader"><div className="cl-spin" /></div>
      ) : loadError ? (
        <div className="cl-empty">
          <h3>Commandes indisponibles</h3>
          <p>Une erreur est survenue pendant le chargement de vos commandes.</p>
        </div>
      ) : commandes.length === 0 ? (
        <div className="cl-empty">
          <span className="cl-empty-ico"><IconBox size={28} /></span>
          <h3>Aucune commande</h3>
          <p>Vous n'avez pas encore passé de commande.</p>
          <Link to="/catalogue" className="cl-btn is-primary">Explorer le catalogue</Link>
        </div>
      ) : (
        <div className="cl-items">
          {commandes.map((commande) => {
            const status = statutCommande[commande.statut] ?? { label: commande.statut, cls: 'badge-neutral' };
            return (
              <div key={commande.id} className="cl-item">
                <div>
                  <div className="cl-item-top">
                    <span className="cl-row-num">#{commande.numero}</span>
                    <span className={`badge ${status.cls}`}>{status.label}</span>
                  </div>
                  <p className="cl-row-meta">Passée le {formatDate(commande.created_at)}</p>
                  {commande.lignes && (
                    <p className="cl-row-meta">{commande.lignes.length} article{commande.lignes.length > 1 ? 's' : ''}</p>
                  )}
                </div>
                <div className="cl-item-side">
                  <span className="cl-price is-lg">{formatPrix(commande.montant_ttc)}</span>
                  <Link to={`/espace-client/commandes/${commande.id}`} className="cl-btn is-outline is-sm">Voir le détail</Link>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {!loading && !loadError && lastPage > 1 && (
        <div className="cl-pager">
          <button type="button" className="cl-btn is-outline is-sm" disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>Précédent</button>
          <span>Page {page} sur {lastPage}</span>
          <button type="button" className="cl-btn is-outline is-sm" disabled={page >= lastPage} onClick={() => setPage((current) => Math.min(lastPage, current + 1))}>Suivant</button>
        </div>
      )}
    </div>
  );
}