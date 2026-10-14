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
  adminFacturesApi,
  type AdminFacture,
} from '../../../api/adminFactures';

import {
  IconPlus,
  IconSearch,
} from '../../../components/ui/Icons';

function getApiErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  const data = error.response?.data;

  if (
    typeof data?.message === 'string' &&
    data.message.trim()
  ) {
    return data.message;
  }

  if (
    data?.errors &&
    typeof data.errors === 'object'
  ) {
    const first =
      Object.values(data.errors)
        .flat()
        .find(Boolean);

    if (typeof first === 'string') {
      return first;
    }
  }

  return fallback;
}

function displayClient(
  facture: AdminFacture,
): string {
  const client = facture.client;

  if (!client) {
    return 'Client non chargé';
  }

  if (client.raison_sociale) {
    return client.raison_sociale;
  }

  const fullName = [
    client.prenoms,
    client.nom,
  ]
    .filter(Boolean)
    .join(' ')
    .trim();

  return fullName || `Client #${client.id}`;
}

function typeLabel(
  value?: string | null,
): string {
  const labels: Record<string, string> = {
    proforma: 'Proforma',
    acompte: 'Acompte',
    definitive: 'Définitive',
    avoir: 'Avoir',
  };

  return value
    ? labels[value] ?? value
    : '—';
}

function typeClass(
  value?: string | null,
): string {
  switch (value) {
    case 'avoir':
      return 'badge-warning';
    case 'definitive':
      return 'badge-success';
    case 'acompte':
      return 'badge-info';
    default:
      return 'badge-neutral';
  }
}

function statutLabel(
  value?: string | null,
): string {
  if (!value) {
    return '—';
  }

  const labels: Record<string, string> = {
    payee: 'Payée',
    partielle: 'Partiellement payée',
    impayee: 'Impayée',
    annulee: 'Annulée',
  };

  return (
    labels[value] ??
    value
      .replace(/_/g, ' ')
      .replace(
        /\b\w/g,
        (letter) =>
          letter.toUpperCase(),
      )
  );
}

function statutClass(
  value?: string | null,
): string {
  switch (value) {
    case 'payee':
      return 'badge-success';

    case 'partielle':
      return 'badge-warning';

    case 'annulee':
    case 'impayee':
      return 'badge-error';

    default:
      return 'badge-neutral';
  }
}

function formatMoney(
  value?: number | null,
): string {
  const amount =
    Number(value ?? 0);

  return `${new Intl.NumberFormat(
    'fr-FR',
  ).format(amount)} FCFA`;
}

function formatDate(
  value?: string | null,
): string {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'fr-FR',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    },
  ).format(date);
}

function downloadBlob(
  blob: Blob,
  filename: string,
) {
  const url =
    URL.createObjectURL(blob);

  const anchor =
    document.createElement('a');

  anchor.href = url;
  anchor.download = filename;

  document.body.appendChild(
    anchor,
  );

  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(url);
}

export default function FacturesAdminPage() {
  const [
    factures,
    setFactures,
  ] =
    useState<
      AdminFacture[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  const [
    busyId,
    setBusyId,
  ] =
    useState<number | null>(
      null,
    );

  const [
    searchInput,
    setSearchInput,
  ] = useState('');

  const [
    recherche,
    setRecherche,
  ] = useState('');

  const [statut, setStatut] =
    useState('');

  const [type, setType] =
    useState('');

  const [page, setPage] =
    useState(1);

  const [
    lastPage,
    setLastPage,
  ] = useState(1);

  const [total, setTotal] =
    useState(0);

  useEffect(() => {
    const timer =
      window.setTimeout(
        () => {
          setPage(1);
          setRecherche(
            searchInput.trim(),
          );
        },
        350,
      );

    return () =>
      window.clearTimeout(
        timer,
      );
  }, [searchInput]);

  const fetchFactures =
    useCallback(async () => {
      setLoading(true);

      try {
        const response =
          await adminFacturesApi.factures(
            {
              page,
              per_page: 15,
              recherche:
                recherche ||
                undefined,
              statut:
                statut ||
                undefined,
              type:
                type ||
                undefined,
            },
          );

        const paginator =
          response.data;

        setFactures(
          paginator.data ?? [],
        );

        setTotal(
          Number(
            paginator.total ?? 0,
          ),
        );

        setLastPage(
          Number(
            paginator.last_page ??
              1,
          ),
        );

        setPage(
          Number(
            paginator.current_page ??
              page,
          ),
        );
      } catch (error) {
        toast.error(
          getApiErrorMessage(
            error,
            'Impossible de charger les factures.',
          ),
        );
      } finally {
        setLoading(false);
      }
    }, [
      page,
      recherche,
      statut,
      type,
    ]);

  useEffect(() => {
    fetchFactures();
  }, [fetchFactures]);

  const pageAmount =
    useMemo(
      () =>
        factures.reduce(
          (
            sum,
            item,
          ) =>
            sum +
            Number(
              item.montant_ttc ??
                0,
            ),
          0,
        ),
      [factures],
    );

  const paidCount =
    useMemo(
      () =>
        factures.filter(
          (item) =>
            item.statut ===
            'payee',
        ).length,
      [factures],
    );

  const creditCount =
    useMemo(
      () =>
        factures.filter(
          (item) =>
            item.type ===
            'avoir',
        ).length,
      [factures],
    );

  async function handlePdf(
    facture: AdminFacture,
  ) {
    setBusyId(
      facture.id,
    );

    try {
      const response =
        await adminFacturesApi.pdf(
          facture.id,
        );

      downloadBlob(
        response.data,
        `${facture.numero}.pdf`,
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible de télécharger le PDF.',
        ),
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <style>{`
        .fa-page {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .fa-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          flex-wrap: wrap;
        }

        .fa-header h1 {
          margin: 0;
          font-family: var(--font-display);
          font-size: var(--text-2xl);
          font-weight: 760;
          letter-spacing: -.02em;
        }

        .fa-header p {
          max-width: 720px;
          margin: 5px 0 0;
          color: var(--color-gris-moyen);
          font-size: var(--text-sm);
          line-height: 1.55;
        }

        .fa-summary {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(150px, 1fr));
          gap: 12px;
        }

        .fa-summary-card {
          padding: 16px 18px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 13px;
          background: var(--color-blanc);
        }

        .fa-summary-card span {
          display: block;
          color: var(--color-gris-moyen);
          font-size: 9.5px;
          font-weight: 720;
          letter-spacing: .06em;
          text-transform: uppercase;
        }

        .fa-summary-card strong {
          display: block;
          margin-top: 5px;
          font-size: 22px;
          line-height: 1.1;
          font-weight: 790;
        }

        .fa-filters {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          padding: 14px;
        }

        .fa-search {
          position: relative;
          flex: 1;
          min-width: 260px;
        }

        .fa-search svg {
          position: absolute;
          top: 50%;
          left: 12px;
          transform: translateY(-50%);
          color: var(--color-gris-clair);
          pointer-events: none;
        }

        .fa-search .form-input {
          padding-left: 36px;
        }

        .fa-filter {
          width: 190px;
        }

        .fa-number {
          min-width: 150px;
        }

        .fa-number strong {
          display: block;
          font-size: 11.5px;
          font-weight: 780;
        }

        .fa-number span {
          display: block;
          margin-top: 3px;
          color: var(--color-gris-moyen);
          font-size: 9px;
        }

        .fa-client {
          min-width: 205px;
        }

        .fa-client strong {
          display: block;
          font-size: 11.5px;
          font-weight: 720;
        }

        .fa-client span {
          display: block;
          margin-top: 3px;
          color: var(--color-gris-moyen);
          font-size: 9px;
        }

        .fa-order {
          color: var(--color-gris-moyen);
          font-size: 10.5px;
          white-space: nowrap;
        }

        .fa-amount {
          white-space: nowrap;
          font-size: 11.5px;
          font-weight: 760;
        }

        .fa-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
        }

        .fa-loading {
          min-height: 285px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .fa-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
        }

        .fa-pagination span {
          padding: 6px 13px;
          color: var(--color-gris-moyen);
          font-size: 11px;
        }

        @media (max-width: 980px) {
          .fa-summary {
            grid-template-columns:
              repeat(2, minmax(150px, 1fr));
          }
        }

        @media (max-width: 620px) {
          .fa-summary {
            grid-template-columns: 1fr;
          }

          .fa-filter,
          .fa-header .btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="fa-page">
        <header className="fa-header">
          <div>
            <h1>
              Factures
            </h1>

            <p>
              Consultez les proformas, factures d’acompte, factures définitives et avoirs générés à partir des commandes.
            </p>
          </div>

          <Link
            to="/admin/finance/factures/generer"
            className="btn btn-primary"
            style={{
              gap: 6,
            }}
          >
            <IconPlus
              size={15}
            />
            Générer une facture
          </Link>
        </header>

        <div className="fa-summary">
          <div className="fa-summary-card">
            <span>
              Total factures
            </span>

            <strong>
              {total}
            </strong>
          </div>

          <div className="fa-summary-card">
            <span>
              Payées sur cette page
            </span>

            <strong>
              {paidCount}
            </strong>
          </div>

          <div className="fa-summary-card">
            <span>
              Avoirs sur cette page
            </span>

            <strong>
              {creditCount}
            </strong>
          </div>

          <div className="fa-summary-card">
            <span>
              Montant TTC de la page
            </span>

            <strong>
              {formatMoney(
                pageAmount,
              )}
            </strong>
          </div>
        </div>

        <section className="card fa-filters">
          <div className="fa-search">
            <IconSearch
              size={14}
            />

            <input
              type="search"
              className="form-input"
              placeholder="Rechercher par numéro de facture..."
              value={
                searchInput
              }
              onChange={(
                event,
              ) =>
                setSearchInput(
                  event.target
                    .value,
                )
              }
            />
          </div>

          <select
            className="form-input fa-filter"
            value={type}
            onChange={(
              event,
            ) => {
              setPage(1);
              setType(
                event.target
                  .value,
              );
            }}
          >
            <option value="">
              Tous les types
            </option>

            <option value="proforma">
              Proforma
            </option>

            <option value="acompte">
              Acompte
            </option>

            <option value="definitive">
              Définitive
            </option>

            <option value="avoir">
              Avoir
            </option>
          </select>

          <div style={{ width: 190 }}>
            <input
              className="form-input"
              list="facture-status-options"
              value={statut}
              onChange={(event) => {
                setPage(1);
                setStatut(event.target.value);
              }}
              placeholder="Tous les statuts"
            />

            <datalist id="facture-status-options">
              <option value="payee" />
              <option value="partielle" />
              <option value="impayee" />
              <option value="annulee" />
            </datalist>
          </div>

          {(searchInput ||
            type ||
            statut) && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearchInput('');
                setRecherche('');
                setType('');
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
          style={{
            overflowX: 'auto',
          }}
        >
          {loading ? (
            <div className="fa-loading">
              <div className="spinner" />
            </div>
          ) : factures.length ===
            0 ? (
            <div
              className="empty-state"
              style={{
                padding:
                  '52px 20px',
                textAlign:
                  'center',
              }}
            >
              <h3>
                Aucune facture
              </h3>

              <p>
                {recherche ||
                type ||
                statut
                  ? 'Aucune facture ne correspond aux filtres sélectionnés.'
                  : 'Aucune facture n’a encore été générée.'}
              </p>
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>
                    Facture
                  </th>
                  <th>
                    Client
                  </th>
                  <th>
                    Type
                  </th>
                  <th>
                    Statut
                  </th>
                  <th>
                    Commande
                  </th>
                  <th>
                    Émission
                  </th>
                  <th>
                    Montant TTC
                  </th>
                  <th
                    style={{
                      textAlign:
                        'right',
                    }}
                  >
                    Actions
                  </th>
                </tr>
              </thead>

              <tbody>
                {factures.map(
                  (facture) => (
                    <tr
                      key={
                        facture.id
                      }
                    >
                      <td>
                        <div className="fa-number">
                          <strong>
                            {
                              facture.numero
                            }
                          </strong>

                          <span>
                            ID #
                            {
                              facture.id
                            }
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className="fa-client">
                          <strong>
                            {displayClient(
                              facture,
                            )}
                          </strong>

                          <span>
                            {facture.client
                              ?.type ??
                              '—'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`badge ${typeClass(
                            facture.type,
                          )}`}
                        >
                          {typeLabel(
                            facture.type,
                          )}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`badge ${statutClass(
                            facture.statut,
                          )}`}
                        >
                          {statutLabel(
                            facture.statut,
                          )}
                        </span>
                      </td>

                      <td>
                        <span className="fa-order">
                          {facture.commande
                            ?.numero ??
                            '—'}
                        </span>
                      </td>

                      <td>
                        {formatDate(
                          facture.date_emission ??
                            facture.created_at,
                        )}
                      </td>

                      <td>
                        <span className="fa-amount">
                          {formatMoney(
                            facture.montant_ttc,
                          )}
                        </span>
                      </td>

                      <td>
                        <div className="fa-actions">
                          <Link
                            to={`/admin/finance/factures/${facture.id}`}
                            className="btn btn-secondary btn-sm"
                          >
                            Voir
                          </Link>

                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={
                              busyId ===
                              facture.id
                            }
                            onClick={() =>
                              handlePdf(
                                facture,
                              )
                            }
                          >
                            PDF
                          </button>
                        </div>
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          )}
        </section>

        {!loading &&
          lastPage > 1 && (
            <div className="fa-pagination">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={
                  page <= 1
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.max(
                        1,
                        current - 1,
                      ),
                  )
                }
              >
                ← Précédent
              </button>

              <span>
                Page {page} /{' '}
                {lastPage} ·{' '}
                {total}{' '}
                facture
                {total !== 1
                  ? 's'
                  : ''}
              </span>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                disabled={
                  page >=
                  lastPage
                }
                onClick={() =>
                  setPage(
                    (current) =>
                      Math.min(
                        lastPage,
                        current + 1,
                      ),
                  )
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
