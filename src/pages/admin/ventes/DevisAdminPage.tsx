import React, {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

import {
  adminDevisApi,
  type AdminDevis,
} from '../../../api/adminDevis';

import {
  IconPlus,
  IconEdit,
  IconSearch,
} from '../../../components/ui/Icons';

function getApiErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (!axios.isAxiosError(error)) return fallback;

  const data = error.response?.data;

  if (typeof data?.message === 'string' && data.message.trim()) {
    return data.message;
  }

  if (data?.errors && typeof data.errors === 'object') {
    const first = Object.values(data.errors).flat().find(Boolean);
    if (typeof first === 'string') return first;
  }

  return fallback;
}

function clientName(devis: AdminDevis): string {
  const client = devis.client;

  if (!client) return 'Client non chargé';

  if (client.raison_sociale) return client.raison_sociale;

  const fullName = [client.prenoms, client.nom]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || `Client #${client.id}`;
}

function formatMoney(value?: number | null): string {
  const amount = Number(value ?? 0);

  return `${new Intl.NumberFormat('fr-FR').format(amount)} FCFA`;
}

function formatDate(value?: string | null): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

function statutLabel(value?: string | null): string {
  const labels: Record<string, string> = {
    brouillon: 'Brouillon',
    envoye: 'Envoyé',
    accepte: 'Accepté',
    refuse: 'Refusé',
    expire: 'Expiré',
    converti: 'Converti',
  };

  return value ? labels[value] ?? value : '—';
}

function statutClass(value?: string | null): string {
  switch (value) {
    case 'envoye':
      return 'badge-info';
    case 'accepte':
    case 'converti':
      return 'badge-success';
    case 'refuse':
    case 'expire':
      return 'badge-error';
    default:
      return 'badge-neutral';
  }
}

export default function DevisAdminPage() {
  const [devis, setDevis] = useState<AdminDevis[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [searchInput, setSearchInput] = useState('');
  const [recherche, setRecherche] = useState('');
  const [statut, setStatut] = useState('');

  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setPage(1);
      setRecherche(searchInput.trim());
    }, 350);

    return () => window.clearTimeout(timer);
  }, [searchInput]);

  const fetchDevis = useCallback(async () => {
    setLoading(true);

    try {
      const response = await adminDevisApi.devis({
        page,
        per_page: 15,
        recherche: recherche || undefined,
        statut: statut || undefined,
      });

      const paginator = response.data;

      setDevis(paginator.data ?? []);
      setTotal(Number(paginator.total ?? 0));
      setLastPage(Number(paginator.last_page ?? 1));
      setPage(Number(paginator.current_page ?? page));
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible de charger les devis.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }, [page, recherche, statut]);

  useEffect(() => {
    fetchDevis();
  }, [fetchDevis]);

  const draftCount = useMemo(
    () => devis.filter((item) => item.statut === 'brouillon').length,
    [devis],
  );

  const sentCount = useMemo(
    () => devis.filter((item) => item.statut === 'envoye').length,
    [devis],
  );

  const pageAmount = useMemo(
    () =>
      devis.reduce(
        (sum, item) => sum + Number(item.montant_ttc ?? 0),
        0,
      ),
    [devis],
  );

  async function handleSend(item: AdminDevis) {
    if (
      !window.confirm(
        `Envoyer le devis ${item.numero} au client ?`,
      )
    ) {
      return;
    }

    setBusyId(item.id);

    try {
      const response = await adminDevisApi.envoyerDevis(item.id);

      setDevis((current) =>
        current.map((row) =>
          row.id === item.id
            ? {
                ...row,
                ...response.data.devis,
                statut: 'envoye',
              }
            : row,
        ),
      );

      toast.success(response.data.message ?? 'Devis envoyé.');
    } catch (error) {
      toast.error(
        getApiErrorMessage(error, 'Impossible d’envoyer le devis.'),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(item: AdminDevis) {
    if (
      !window.confirm(
        `Supprimer le devis ${item.numero} ?`,
      )
    ) {
      return;
    }

    setBusyId(item.id);

    try {
      const response = await adminDevisApi.deleteDevis(item.id);

      setDevis((current) =>
        current.filter((row) => row.id !== item.id),
      );

      setTotal((current) => Math.max(0, current - 1));

      toast.success(response.data.message ?? 'Devis supprimé.');
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible de supprimer le devis.',
        ),
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <style>{`
        .qa-page {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .qa-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          flex-wrap: wrap;
        }

        .qa-header h1 {
          margin: 0;
          font-family: var(--font-display);
          font-size: var(--text-2xl);
          font-weight: 760;
          letter-spacing: -.02em;
        }

        .qa-header p {
          margin: 5px 0 0;
          color: var(--color-gris-moyen);
          font-size: var(--text-sm);
        }

        .qa-summary {
          display: grid;
          grid-template-columns: repeat(4, minmax(150px, 1fr));
          gap: 12px;
        }

        .qa-summary-card {
          padding: 16px 18px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 13px;
          background: var(--color-blanc);
        }

        .qa-summary-card span {
          display: block;
          color: var(--color-gris-moyen);
          font-size: 9.5px;
          font-weight: 720;
          letter-spacing: .06em;
          text-transform: uppercase;
        }

        .qa-summary-card strong {
          display: block;
          margin-top: 5px;
          font-size: 22px;
          line-height: 1.1;
          font-weight: 790;
        }

        .qa-filters {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          padding: 14px;
        }

        .qa-search {
          position: relative;
          flex: 1;
          min-width: 260px;
        }

        .qa-search svg {
          position: absolute;
          top: 50%;
          left: 12px;
          transform: translateY(-50%);
          color: var(--color-gris-clair);
          pointer-events: none;
        }

        .qa-search .form-input {
          padding-left: 36px;
        }

        .qa-filter {
          width: 190px;
        }

        .qa-number {
          min-width: 130px;
        }

        .qa-number strong {
          display: block;
          font-size: 11.5px;
          font-weight: 780;
        }

        .qa-number span {
          display: block;
          margin-top: 3px;
          color: var(--color-gris-moyen);
          font-size: 9px;
        }

        .qa-client {
          min-width: 210px;
        }

        .qa-client strong {
          display: block;
          font-size: 11.5px;
          font-weight: 720;
        }

        .qa-client span {
          display: block;
          margin-top: 3px;
          color: var(--color-gris-moyen);
          font-size: 9px;
        }

        .qa-amount {
          white-space: nowrap;
          font-weight: 760;
        }

        .qa-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 5px;
          flex-wrap: wrap;
        }

        .qa-loading {
          min-height: 285px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .qa-pagination {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          flex-wrap: wrap;
        }

        .qa-pagination span {
          padding: 6px 13px;
          color: var(--color-gris-moyen);
          font-size: 11px;
        }

        @media (max-width: 960px) {
          .qa-summary {
            grid-template-columns: repeat(2, minmax(150px, 1fr));
          }
        }

        @media (max-width: 620px) {
          .qa-summary {
            grid-template-columns: 1fr;
          }

          .qa-filter,
          .qa-header .btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="qa-page">
        <header className="qa-header">
          <div>
            <h1>Devis</h1>
            <p>
              Créez, modifiez et envoyez les devis commerciaux aux clients.
            </p>
          </div>

          <Link
            to="/admin/ventes/devis/nouveau"
            className="btn btn-primary"
            style={{ gap: 6 }}
          >
            <IconPlus size={15} />
            Nouveau devis
          </Link>
        </header>

        <div className="qa-summary">
          <div className="qa-summary-card">
            <span>Total devis</span>
            <strong>{total}</strong>
          </div>

          <div className="qa-summary-card">
            <span>Brouillons sur cette page</span>
            <strong>{draftCount}</strong>
          </div>

          <div className="qa-summary-card">
            <span>Envoyés sur cette page</span>
            <strong>{sentCount}</strong>
          </div>

          <div className="qa-summary-card">
            <span>Montant TTC de la page</span>
            <strong>{formatMoney(pageAmount)}</strong>
          </div>
        </div>

        <section className="card qa-filters">
          <div className="qa-search">
            <IconSearch size={14} />

            <input
              type="search"
              className="form-input"
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Rechercher par numéro ou nom du client..."
            />
          </div>

          <select
            className="form-input qa-filter"
            value={statut}
            onChange={(event) => {
              setPage(1);
              setStatut(event.target.value);
            }}
          >
            <option value="">Tous les statuts</option>
            <option value="brouillon">Brouillon</option>
            <option value="envoye">Envoyé</option>
            <option value="accepte">Accepté</option>
            <option value="refuse">Refusé</option>
            <option value="expire">Expiré</option>
            <option value="converti">Converti</option>
          </select>

          {(searchInput || statut) && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearchInput('');
                setRecherche('');
                setStatut('');
                setPage(1);
              }}
            >
              Réinitialiser
            </button>
          )}
        </section>

        <section
          className="table-wrapper card"
          style={{ overflowX: 'auto' }}
        >
          {loading ? (
            <div className="qa-loading">
              <div className="spinner" />
            </div>
          ) : devis.length === 0 ? (
            <div
              className="empty-state"
              style={{ padding: '52px 20px', textAlign: 'center' }}
            >
              <h3>Aucun devis</h3>
              <p>
                {recherche || statut
                  ? 'Aucun devis ne correspond aux filtres sélectionnés.'
                  : 'Créez votre premier devis commercial.'}
              </p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Devis</th>
                  <th>Client</th>
                  <th>Commercial</th>
                  <th>Statut</th>
                  <th>Validité</th>
                  <th>Montant TTC</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {devis.map((item) => {
                  const editable = ['brouillon', 'envoye'].includes(
                    item.statut,
                  );
                  const canSend = item.statut === 'brouillon';
                  const canDelete = item.statut === 'brouillon';

                  return (
                    <tr key={item.id}>
                      <td>
                        <div className="qa-number">
                          <strong>{item.numero}</strong>
                          <span>{formatDate(item.created_at)}</span>
                        </div>
                      </td>

                      <td>
                        <div className="qa-client">
                          <strong>{clientName(item)}</strong>
                          <span>
                            {item.client?.type ?? `Client #${item.client_id}`}
                          </span>
                        </div>
                      </td>

                      <td>
                        {item.user?.name ?? '—'}
                      </td>

                      <td>
                        <span className={`badge ${statutClass(item.statut)}`}>
                          {statutLabel(item.statut)}
                        </span>
                      </td>

                      <td>{formatDate(item.date_validite)}</td>

                      <td>
                        <span className="qa-amount">
                          {formatMoney(item.montant_ttc)}
                        </span>
                      </td>

                      <td>
                        <div className="qa-actions">
                          <Link
                            to={`/admin/ventes/devis/${item.id}/modifier`}
                            className="btn btn-ghost btn-sm"
                            title={editable ? 'Modifier' : 'Consulter'}
                          >
                            <IconEdit size={13} />
                          </Link>

                          {canSend && (
                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={busyId === item.id}
                              onClick={() => handleSend(item)}
                              style={{ fontSize: 10 }}
                            >
                              Envoyer
                            </button>
                          )}

                          {canDelete && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              disabled={busyId === item.id}
                              onClick={() => handleDelete(item)}
                              style={{
                                color: 'var(--color-error)',
                                fontSize: 10,
                              }}
                            >
                              Supprimer
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </section>

        {!loading && lastPage > 1 && (
          <div className="qa-pagination">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page <= 1}
              onClick={() =>
                setPage((current) => Math.max(1, current - 1))
              }
            >
              ← Précédent
            </button>

            <span>
              Page {page} / {lastPage} · {total} devis
            </span>

            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={page >= lastPage}
              onClick={() =>
                setPage((current) => Math.min(lastPage, current + 1))
              }
            >
              Suivant →
            </button>
          </div>
        )}
      </div>
    </>
  );
}
