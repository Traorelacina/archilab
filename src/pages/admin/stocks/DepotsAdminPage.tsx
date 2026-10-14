import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import { Link } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';

import {
  adminDepotsApi,
  type AdminDepot,
  type DepotType,
} from '../../../api/adminDepots';

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
    const first = Object.values(data.errors)
      .flat()
      .find(Boolean);

    if (typeof first === 'string') {
      return first;
    }
  }

  return fallback;
}

function typeLabel(
  type?: DepotType | string | null,
): string {
  switch (type) {
    case 'plateforme':
      return 'Plateforme';
    case 'partenaire':
      return 'Partenaire';
    default:
      return type || '—';
  }
}

function typeBadgeClass(
  type?: DepotType | string | null,
): string {
  return type === 'partenaire'
    ? 'badge-info'
    : 'badge-neutral';
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

export default function DepotsAdminPage() {
  const [depots, setDepots] =
    useState<AdminDepot[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState('');

  const [
    typeFilter,
    setTypeFilter,
  ] =
    useState<
      '' | DepotType
    >('');

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<
      '' | 'actif' | 'inactif'
    >('');

  const [
    busyId,
    setBusyId,
  ] =
    useState<number | null>(
      null,
    );

  async function fetchDepots() {
    setLoading(true);

    try {
      const response =
        await adminDepotsApi.depots();

      setDepots(
        response.data ?? [],
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible de charger les dépôts.',
        ),
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchDepots();
  }, []);

  const filteredDepots =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLocaleLowerCase(
            'fr',
          );

      return depots.filter(
        (depot) => {
          if (
            typeFilter &&
            depot.type !==
              typeFilter
          ) {
            return false;
          }

          if (
            statusFilter ===
              'actif' &&
            depot.actif ===
              false
          ) {
            return false;
          }

          if (
            statusFilter ===
              'inactif' &&
            depot.actif !==
              false
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            depot.nom,
            depot.adresse,
            depot.partenaire
              ?.raison_sociale,
            typeLabel(
              depot.type,
            ),
          ]
            .filter(Boolean)
            .some((value) =>
              String(value)
                .toLocaleLowerCase(
                  'fr',
                )
                .includes(
                  query,
                ),
            );
        },
      );
    }, [
      depots,
      search,
      typeFilter,
      statusFilter,
    ]);

  const activeCount =
    useMemo(
      () =>
        depots.filter(
          (depot) =>
            depot.actif !==
            false,
        ).length,
      [depots],
    );

  const platformCount =
    useMemo(
      () =>
        depots.filter(
          (depot) =>
            depot.type ===
            'plateforme',
        ).length,
      [depots],
    );

  const partnerCount =
    useMemo(
      () =>
        depots.filter(
          (depot) =>
            depot.type ===
            'partenaire',
        ).length,
      [depots],
    );

  async function quickToggle(
    depot: AdminDepot,
  ) {
    setBusyId(
      depot.id,
    );

    try {
      const response =
        await adminDepotsApi.updateDepot(
          depot.id,
          {
            actif:
              depot.actif ===
              false,
          },
        );

      setDepots(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              depot.id
                ? {
                    ...item,
                    ...response.data,
                  }
                : item,
          ),
      );

      toast.success(
        depot.actif ===
          false
          ? 'Dépôt activé.'
          : 'Dépôt désactivé.',
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible de modifier le statut du dépôt.',
        ),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(
    depot: AdminDepot,
  ) {
    if (
      !window.confirm(
        `Supprimer le dépôt "${depot.nom}" ?`,
      )
    ) {
      return;
    }

    setBusyId(
      depot.id,
    );

    try {
      const response =
        await adminDepotsApi.deleteDepot(
          depot.id,
        );

      setDepots(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              depot.id,
          ),
      );

      toast.success(
        response.data
          ?.message ??
          'Dépôt supprimé.',
      );
    } catch (error) {
      /*
       * Le backend peut notamment retourner :
       *
       * 422
       * Impossible de supprimer un dépôt contenant du stock.
       */
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible de supprimer le dépôt.',
        ),
      );
    } finally {
      setBusyId(null);
    }
  }

  const hasFilters =
    Boolean(search) ||
    Boolean(typeFilter) ||
    Boolean(statusFilter);

  return (
    <>
      <style>{`
        .da-page {
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .da-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          flex-wrap: wrap;
        }

        .da-header h1 {
          margin: 0;
          font-family: var(--font-display);
          font-size: var(--text-2xl);
          font-weight: 760;
          letter-spacing: -.02em;
        }

        .da-header p {
          margin: 5px 0 0;
          color: var(--color-gris-moyen);
          font-size: var(--text-sm);
          line-height: 1.55;
        }

        .da-summary {
          display: grid;
          grid-template-columns:
            repeat(4, minmax(140px, 1fr));
          gap: 12px;
        }

        .da-summary-card {
          padding: 16px 18px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 13px;
          background: var(--color-blanc);
        }

        .da-summary-card span {
          display: block;
          color: var(--color-gris-moyen);
          font-size: 9.5px;
          font-weight: 720;
          letter-spacing: .06em;
          text-transform: uppercase;
        }

        .da-summary-card strong {
          display: block;
          margin-top: 5px;
          font-size: 23px;
          line-height: 1;
          font-weight: 790;
        }

        .da-filters {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          padding: 14px;
        }

        .da-search {
          position: relative;
          flex: 1;
          min-width: 250px;
        }

        .da-search svg {
          position: absolute;
          top: 50%;
          left: 12px;
          transform: translateY(-50%);
          color: var(--color-gris-clair);
          pointer-events: none;
        }

        .da-search .form-input {
          padding-left: 36px;
        }

        .da-filter-select {
          width: 190px;
        }

        .da-name {
          min-width: 200px;
        }

        .da-name strong {
          display: block;
          font-size: 12px;
          font-weight: 730;
        }

        .da-name span {
          display: block;
          margin-top: 3px;
          color: var(--color-gris-moyen);
          font-size: 9.5px;
        }

        .da-partner {
          max-width: 220px;
          color: var(--color-gris-moyen);
          font-size: 10.5px;
        }

        .da-address {
          max-width: 300px;
          overflow: hidden;
          color: var(--color-gris-moyen);
          font-size: 10.5px;
          line-height: 1.45;
          text-overflow: ellipsis;
        }

        .da-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 5px;
          flex-wrap: wrap;
        }

        .da-loading {
          min-height: 280px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 900px) {
          .da-summary {
            grid-template-columns:
              repeat(2, minmax(140px, 1fr));
          }
        }

        @media (max-width: 620px) {
          .da-summary {
            grid-template-columns: 1fr;
          }

          .da-filter-select {
            width: 100%;
          }

          .da-header .btn {
            width: 100%;
          }
        }
      `}</style>

      <div className="da-page">
        <header className="da-header">
          <div>
            <h1>
              Dépôts
            </h1>

            <p>
              Gérez les lieux de stockage de la plateforme et des partenaires.
            </p>
          </div>

          <Link
            to="/admin/stocks/depots/nouveau"
            className="btn btn-primary"
            style={{
              gap: 6,
            }}
          >
            <IconPlus
              size={15}
            />
            Nouveau dépôt
          </Link>
        </header>

        <div className="da-summary">
          <div className="da-summary-card">
            <span>
              Total dépôts
            </span>

            <strong>
              {depots.length}
            </strong>
          </div>

          <div className="da-summary-card">
            <span>
              Dépôts actifs
            </span>

            <strong>
              {activeCount}
            </strong>
          </div>

          <div className="da-summary-card">
            <span>
              Plateforme
            </span>

            <strong>
              {platformCount}
            </strong>
          </div>

          <div className="da-summary-card">
            <span>
              Partenaires
            </span>

            <strong>
              {partnerCount}
            </strong>
          </div>
        </div>

        <section className="card da-filters">
          <div className="da-search">
            <IconSearch
              size={14}
            />

            <input
              type="search"
              className="form-input"
              placeholder="Rechercher par nom, adresse ou partenaire..."
              value={search}
              onChange={(
                event,
              ) =>
                setSearch(
                  event.target
                    .value,
                )
              }
            />
          </div>

          <select
            className="form-input da-filter-select"
            value={
              typeFilter
            }
            onChange={(
              event,
            ) =>
              setTypeFilter(
                event.target
                  .value as
                  | ''
                  | DepotType,
              )
            }
          >
            <option value="">
              Tous les types
            </option>

            <option value="plateforme">
              Plateforme
            </option>

            <option value="partenaire">
              Partenaire
            </option>
          </select>

          <select
            className="form-input da-filter-select"
            value={
              statusFilter
            }
            onChange={(
              event,
            ) =>
              setStatusFilter(
                event.target
                  .value as
                  | ''
                  | 'actif'
                  | 'inactif',
              )
            }
          >
            <option value="">
              Tous les statuts
            </option>

            <option value="actif">
              Actifs
            </option>

            <option value="inactif">
              Inactifs
            </option>
          </select>

          {hasFilters && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setSearch('');
                setTypeFilter('');
                setStatusFilter('');
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
            <div className="da-loading">
              <div className="spinner" />
            </div>
          ) : filteredDepots.length ===
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
                Aucun dépôt
              </h3>

              <p>
                {depots.length ===
                0
                  ? 'Créez le premier dépôt de stockage.'
                  : 'Aucun dépôt ne correspond aux filtres sélectionnés.'}
              </p>

              {depots.length ===
                0 && (
                <Link
                  to="/admin/stocks/depots/nouveau"
                  className="btn btn-primary"
                >
                  <IconPlus
                    size={14}
                  />
                  Nouveau dépôt
                </Link>
              )}
            </div>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>
                    Dépôt
                  </th>
                  <th>
                    Type
                  </th>
                  <th>
                    Partenaire
                  </th>
                  <th>
                    Adresse
                  </th>
                  <th>
                    Statut
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
                {filteredDepots.map(
                  (depot) => {
                    const active =
                      depot.actif !==
                      false;

                    return (
                      <tr
                        key={
                          depot.id
                        }
                      >
                        <td>
                          <div className="da-name">
                            <strong>
                              {
                                depot.nom
                              }
                            </strong>

                            <span>
                              ID #
                              {
                                depot.id
                              }
                            </span>
                          </div>
                        </td>

                        <td>
                          <span
                            className={`badge ${typeBadgeClass(
                              depot.type,
                            )}`}
                          >
                            {typeLabel(
                              depot.type,
                            )}
                          </span>
                        </td>

                        <td>
                          <div className="da-partner">
                            {depot.type ===
                            'partenaire'
                              ? depot
                                  .partenaire
                                  ?.raison_sociale ??
                                'Partenaire non chargé'
                              : '—'}
                          </div>
                        </td>

                        <td>
                          <div className="da-address">
                            {depot.adresse ??
                              '—'}
                          </div>
                        </td>

                        <td>
                          <span
                            className={`badge ${
                              active
                                ? 'badge-success'
                                : 'badge-error'
                            }`}
                          >
                            {active
                              ? 'Actif'
                              : 'Inactif'}
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
                            depot.created_at,
                          )}
                        </td>

                        <td>
                          <div className="da-actions">
                            <Link
                              to={`/admin/stocks/depots/${depot.id}/modifier`}
                              className="btn btn-ghost btn-sm"
                              title="Modifier"
                            >
                              <IconEdit
                                size={
                                  13
                                }
                              />
                            </Link>

                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={
                                busyId ===
                                depot.id
                              }
                              onClick={() =>
                                quickToggle(
                                  depot,
                                )
                              }
                              style={{
                                fontSize:
                                  10,
                              }}
                            >
                              {active
                                ? 'Désactiver'
                                : 'Activer'}
                            </button>

                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              disabled={
                                busyId ===
                                depot.id
                              }
                              onClick={() =>
                                handleDelete(
                                  depot,
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
                    );
                  },
                )}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </>
  );
}
