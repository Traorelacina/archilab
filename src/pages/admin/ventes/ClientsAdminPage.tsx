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
  adminClientsApi,
  type AdminClient,
  type ClientType,
} from '../../../api/adminClients';

import {
  IconPlus,
  IconEdit,
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

    if (
      typeof first === 'string'
    ) {
      return first;
    }
  }

  return fallback;
}

function displayName(
  client: AdminClient,
): string {
  if (
    client.type === 'professionnel' &&
    client.raison_sociale
  ) {
    return client.raison_sociale;
  }

  return [
    client.prenoms,
    client.nom,
  ]
    .filter(Boolean)
    .join(' ')
    .trim() || client.nom;
}

function secondaryIdentity(
  client: AdminClient,
): string {
  if (
    client.type === 'professionnel'
  ) {
    const contact = [
      client.prenoms,
      client.nom,
    ]
      .filter(Boolean)
      .join(' ')
      .trim();

    return contact
      ? `Contact : ${contact}`
      : client.ncc
        ? `NCC : ${client.ncc}`
        : 'Client professionnel';
  }

  return 'Client particulier';
}

function initials(
  client: AdminClient,
): string {
  const value =
    client.type ===
      'professionnel' &&
    client.raison_sociale
      ? client.raison_sociale
      : [
          client.prenoms,
          client.nom,
        ]
          .filter(Boolean)
          .join(' ');

  if (!value) return '?';

  return value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map(
      (part) =>
        part[0]?.toUpperCase(),
    )
    .join('');
}

function formatDate(
  value?: string | null,
): string {
  if (!value) {
    return '—';
  }

  const date =
    new Date(value);

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

export default function ClientsAdminPage() {
  const [clients, setClients] =
    useState<AdminClient[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [busyId, setBusyId] =
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

  const [
    typeFilter,
    setTypeFilter,
  ] =
    useState<
      '' | ClientType
    >('');

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

  const fetchClients =
    useCallback(async () => {
      setLoading(true);

      try {
        const response =
          await adminClientsApi.clients(
            {
              page,
              per_page: 15,
              recherche:
                recherche ||
                undefined,
              type:
                typeFilter ||
                undefined,
            },
          );

        const paginator =
          response.data;

        setClients(
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
            'Impossible de charger les clients.',
          ),
        );
      } finally {
        setLoading(false);
      }
    }, [
      page,
      recherche,
      typeFilter,
    ]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  const particuliersPage =
    useMemo(
      () =>
        clients.filter(
          (client) =>
            client.type ===
            'particulier',
        ).length,
      [clients],
    );

  const prosPage =
    useMemo(
      () =>
        clients.filter(
          (client) =>
            client.type ===
            'professionnel',
        ).length,
      [clients],
    );

  const commandesPage =
    useMemo(
      () =>
        clients.reduce(
          (
            totalCommandes,
            client,
          ) =>
            totalCommandes +
            Number(
              client.commandes_count ??
                0,
            ),
          0,
        ),
      [clients],
    );

  async function handleDelete(
    client: AdminClient,
  ) {
    if (
      !window.confirm(
        `Supprimer le client "${displayName(client)}" ?`,
      )
    ) {
      return;
    }

    setBusyId(client.id);

    try {
      const response =
        await adminClientsApi.deleteClient(
          client.id,
        );

      setClients(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              client.id,
          ),
      );

      setTotal(
        (current) =>
          Math.max(
            0,
            current - 1,
          ),
      );

      toast.success(
        response.data
          ?.message ??
          'Client supprimé.',
      );
    } catch (error) {
      /*
       * Le backend retourne notamment :
       * 422 Impossible de supprimer un client ayant des commandes.
       */
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible de supprimer le client.',
        ),
      );
    } finally {
      setBusyId(null);
    }
  }

  const hasFilters =
    Boolean(
      searchInput,
    ) ||
    Boolean(
      typeFilter,
    );

  return (
    <>
      <style>{`
        .ca-page {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .ca-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          flex-wrap: wrap;
        }

        .ca-header h1 {
          margin: 0;
          font-family: var(--font-display);
          font-size: var(--text-2xl);
          font-weight: 760;
          letter-spacing: -.02em;
        }

        .ca-header p {
          max-width: 720px;
          margin: 5px 0 0;
          color: var(--color-gris-moyen);
          font-size: var(--text-sm);
          line-height: 1.55;
        }

        .ca-summary {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(145px, 1fr));
          gap: 12px;
        }

        .ca-summary-card {
          padding: 16px 18px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 13px;
          background: var(--color-blanc);
        }

        .ca-summary-card span {
          display: block;
          color: var(--color-gris-moyen);
          font-size: 9.5px;
          font-weight: 720;
          letter-spacing: .06em;
          text-transform: uppercase;
        }

        .ca-summary-card strong {
          display: block;
          margin-top: 5px;
          font-size: 23px;
          line-height: 1;
          font-weight: 790;
        }

        .ca-filters {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          padding: 14px;
        }

        .ca-search {
          position: relative;
          flex: 1;
          min-width: 260px;
        }

        .ca-search svg {
          position: absolute;
          top: 50%;
          left: 12px;
          transform: translateY(-50%);
          color: var(--color-gris-clair);
          pointer-events: none;
        }

        .ca-search .form-input {
          padding-left: 36px;
        }

        .ca-type-filter {
          width: 210px;
        }

        .ca-client {
          display: flex;
          align-items: center;
          gap: 11px;
          min-width: 240px;
        }

        .ca-avatar {
          width: 40px;
          height: 40px;
          flex: 0 0 auto;
          display: grid;
          place-items: center;
          border-radius: 11px;
          background:
            linear-gradient(
              145deg,
              var(--color-ivoire-dark),
              var(--color-ivoire)
            );
          color: var(--color-terra);
          font-size: 11px;
          font-weight: 850;
        }

        .ca-client-name {
          font-size: 12px;
          font-weight: 740;
        }

        .ca-client-subtitle {
          max-width: 220px;
          margin-top: 2px;
          overflow: hidden;
          color: var(--color-gris-moyen);
          font-size: 9px;
          white-space: nowrap;
          text-overflow: ellipsis;
        }

        .ca-contact {
          min-width: 180px;
        }

        .ca-contact strong {
          display: block;
          font-size: 10.5px;
          font-weight: 690;
        }

        .ca-contact span {
          display: block;
          margin-top: 3px;
          color: var(--color-gris-moyen);
          font-size: 9px;
        }

        .ca-city {
          color: var(--color-gris-moyen);
          font-size: 10.5px;
        }

        .ca-orders {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 34px;
          height: 28px;
          padding: 0 9px;
          border-radius: 999px;
          background: var(--color-ivoire);
          font-size: 10px;
          font-weight: 750;
        }

        .ca-actions {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          gap: 5px;
          flex-wrap: wrap;
        }

        .ca-loading {
          min-height: 285px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .ca-pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 7px;
          flex-wrap: wrap;
        }

        .ca-pagination span {
          padding: 6px 13px;
          color: var(--color-gris-moyen);
          font-size: 11px;
        }

        @media (max-width: 960px) {
          .ca-summary {
            grid-template-columns:
              repeat(2, minmax(145px, 1fr));
          }
        }

        @media (max-width: 620px) {
          .ca-summary {
            grid-template-columns: 1fr;
          }

          .ca-type-filter,
          .ca-header .btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="ca-page">
        <header className="ca-header">
          <div>
            <h1>
              Clients
            </h1>

            <p>
              Gérez les clients particuliers et professionnels utilisés pour les devis, commandes et ventes comptoir.
            </p>
          </div>

          <Link
            to="/admin/ventes/clients/nouveau"
            className="btn btn-primary"
            style={{
              gap: 6,
            }}
          >
            <IconPlus
              size={15}
            />
            Nouveau client
          </Link>
        </header>

        <div className="ca-summary">
          <div className="ca-summary-card">
            <span>
              Total clients
            </span>

            <strong>
              {total}
            </strong>
          </div>

          <div className="ca-summary-card">
            <span>
              Particuliers sur cette page
            </span>

            <strong>
              {particuliersPage}
            </strong>
          </div>

          <div className="ca-summary-card">
            <span>
              Professionnels sur cette page
            </span>

            <strong>
              {prosPage}
            </strong>
          </div>

          <div className="ca-summary-card">
            <span>
              Commandes liées sur cette page
            </span>

            <strong>
              {commandesPage}
            </strong>
          </div>
        </div>

        <section className="card ca-filters">
          <div className="ca-search">
            <IconSearch
              size={14}
            />

            <input
              type="search"
              className="form-input"
              placeholder="Rechercher par nom, société, téléphone ou e-mail..."
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
            className="form-input ca-type-filter"
            value={
              typeFilter
            }
            onChange={(
              event,
            ) => {
              setPage(1);
              setTypeFilter(
                event.target
                  .value as
                  | ''
                  | ClientType,
              );
            }}
          >
            <option value="">
              Tous les types
            </option>

            <option value="particulier">
              Particuliers
            </option>

            <option value="professionnel">
              Professionnels
            </option>
          </select>

          {hasFilters && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearchInput('');
                setRecherche('');
                setTypeFilter('');
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
            <div className="ca-loading">
              <div className="spinner" />
            </div>
          ) : clients.length ===
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
                Aucun client
              </h3>

              <p>
                {recherche ||
                typeFilter
                  ? 'Aucun client ne correspond aux filtres sélectionnés.'
                  : 'Créez votre premier client comptoir.'}
              </p>

              {!recherche &&
                !typeFilter && (
                  <Link
                    to="/admin/ventes/clients/nouveau"
                    className="btn btn-primary"
                  >
                    <IconPlus
                      size={14}
                    />
                    Nouveau client
                  </Link>
                )}
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>
                    Client
                  </th>
                  <th>
                    Type
                  </th>
                  <th>
                    Contact
                  </th>
                  <th>
                    Ville
                  </th>
                  <th>
                    Commandes
                  </th>
                  <th>
                    Créé le
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
                {clients.map(
                  (client) => (
                    <tr
                      key={
                        client.id
                      }
                    >
                      <td>
                        <div className="ca-client">
                          <div className="ca-avatar">
                            {initials(
                              client,
                            )}
                          </div>

                          <div>
                            <div className="ca-client-name">
                              {displayName(
                                client,
                              )}
                            </div>

                            <div className="ca-client-subtitle">
                              {secondaryIdentity(
                                client,
                              )}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`badge ${
                            client.type ===
                            'professionnel'
                              ? 'badge-info'
                              : 'badge-neutral'
                          }`}
                        >
                          {client.type ===
                          'professionnel'
                            ? 'Professionnel'
                            : 'Particulier'}
                        </span>
                      </td>

                      <td>
                        <div className="ca-contact">
                          <strong>
                            {
                              client.telephone
                            }
                          </strong>

                          <span>
                            {client.email ??
                              'Pas d’e-mail'}
                          </span>
                        </div>
                      </td>

                      <td>
                        <span className="ca-city">
                          {client.ville ??
                            '—'}
                        </span>
                      </td>

                      <td>
                        <span className="ca-orders">
                          {Number(
                            client.commandes_count ??
                              0,
                          )}
                        </span>
                      </td>

                      <td
                        style={{
                          color:
                            'var(--color-gris-moyen)',
                          fontSize:
                            10.5,
                          whiteSpace:
                            'nowrap',
                        }}
                      >
                        {formatDate(
                          client.created_at,
                        )}
                      </td>

                      <td>
                        <div className="ca-actions">
                          <Link
                            to={`/admin/ventes/clients/${client.id}/modifier`}
                            className="btn btn-ghost btn-sm"
                            title="Modifier / consulter"
                          >
                            <IconEdit
                              size={
                                13
                              }
                            />
                          </Link>

                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            disabled={
                              busyId ===
                              client.id
                            }
                            onClick={() =>
                              handleDelete(
                                client,
                              )
                            }
                            style={{
                              color:
                                'var(--color-error)',
                              fontSize:
                                10,
                            }}
                          >
                            Supprimer
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
            <div className="ca-pagination">
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
                client
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
