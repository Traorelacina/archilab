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
  adminCollectionsApi,
  type AdminCollection,
} from '../../../api/adminCollections';

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

export default function CollectionsAdminPage() {
  const [collections, setCollections] =
    useState<AdminCollection[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadError, setLoadError] =
    useState<string | null>(null);

  const [search, setSearch] =
    useState('');

  const [statusFilter, setStatusFilter] =
    useState<'all' | 'active' | 'inactive'>('all');

  const [partnerFilter, setPartnerFilter] =
    useState('');

  const [busyId, setBusyId] =
    useState<number | null>(null);

  const fetchCollections =
    useCallback(async () => {
      setLoading(true);
      setLoadError(null);

      try {
        const response =
          await adminCollectionsApi.collections();

        setCollections(response.data);
      } catch (error) {
        const message = getApiErrorMessage(
          error,
          'Impossible de charger les collections.',
        );
        setLoadError(message);
        toast.error(message);
      } finally {
        setLoading(false);
      }
    }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const partenaires = useMemo(() => {
    const map = new Map<
      number,
      string
    >();

    collections.forEach(
      (collection) => {
        if (
          collection.partenaire
            ?.id &&
          collection.partenaire
            .raison_sociale
        ) {
          map.set(
            collection.partenaire.id,
            collection.partenaire
              .raison_sociale,
          );
        }
      },
    );

    return Array.from(
      map.entries(),
    )
      .map(
        ([
          id,
          raison_sociale,
        ]) => ({
          id,
          raison_sociale,
        }),
      )
      .sort((a, b) =>
        a.raison_sociale.localeCompare(
          b.raison_sociale,
          'fr',
          {
            sensitivity: 'base',
          },
        ),
      );
  }, [collections]);

  const filteredCollections =
    useMemo(() => {
      const normalizedSearch =
        search
          .trim()
          .toLocaleLowerCase('fr');

      return [...collections]
        .filter((collection) => {
          const matchesSearch =
            !normalizedSearch ||
            collection.nom
              .toLocaleLowerCase(
                'fr',
              )
              .includes(
                normalizedSearch,
              ) ||
            collection.slug
              ?.toLocaleLowerCase(
                'fr',
              )
              .includes(
                normalizedSearch,
              ) ||
            collection.description
              ?.toLocaleLowerCase(
                'fr',
              )
              .includes(
                normalizedSearch,
              ) ||
            collection.partenaire
              ?.raison_sociale
              ?.toLocaleLowerCase(
                'fr',
              )
              .includes(
                normalizedSearch,
              );

          const matchesStatus =
            statusFilter ===
              'all' ||
            (statusFilter ===
              'active' &&
              collection.active) ||
            (statusFilter ===
              'inactive' &&
              !collection.active);

          const matchesPartner =
            !partnerFilter ||
            String(
              collection.partenaire_id ??
                collection.partenaire
                  ?.id ??
                '',
            ) === partnerFilter;

          return (
            matchesSearch &&
            matchesStatus &&
            matchesPartner
          );
        })
        .sort((a, b) =>
          a.nom.localeCompare(
            b.nom,
            'fr',
            {
              sensitivity: 'base',
            },
          ),
        );
    }, [
      collections,
      search,
      statusFilter,
      partnerFilter,
    ]);

  const activeCount =
    useMemo(
      () =>
        collections.filter(
          (item) => item.active,
        ).length,
      [collections],
    );

  const inactiveCount =
    collections.length -
    activeCount;

  async function toggleActive(
    collection: AdminCollection,
  ) {
    setBusyId(collection.id);

    try {
      const response =
        await adminCollectionsApi.updateCollection(
          collection.id,
          {
            active:
              !collection.active,
          },
        );

      setCollections((current) =>
        current.map((item) =>
          item.id ===
          collection.id
            ? {
                ...item,
                ...response.data,

                // update() ne recharge pas nécessairement les relations/counts.
                partenaire:
                  response.data
                    .partenaire ??
                  item.partenaire,

                produits_count:
                  response.data
                    .produits_count ??
                  item.produits_count,
              }
            : item,
        ),
      );

      toast.success(
        collection.active
          ? 'Collection désactivée.'
          : 'Collection activée.',
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible de modifier le statut de la collection.',
        ),
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deleteCollection(
    collection: AdminCollection,
  ) {
    const productCount =
      collection.produits_count ??
      0;

    const message =
      productCount > 0
        ? `"${collection.nom}" contient ${productCount} produit(s).\n\nLaravel refusera la suppression tant que ces produits sont rattachés à la collection.\n\nContinuer ?`
        : `Supprimer définitivement la collection "${collection.nom}" ?`;

    if (
      !window.confirm(message)
    ) {
      return;
    }

    setBusyId(collection.id);

    try {
      const response =
        await adminCollectionsApi.deleteCollection(
          collection.id,
        );

      setCollections(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              collection.id,
          ),
      );

      toast.success(
        response.data?.message ??
          'Collection supprimée.',
      );
    } catch (error) {
      /*
       * Le backend retourne par exemple :
       * 422 Impossible de supprimer une collection contenant des produits.
       */
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible de supprimer la collection.',
        ),
      );
    } finally {
      setBusyId(null);
    }
  }

  const hasFilters =
    Boolean(search) ||
    statusFilter !== 'all' ||
    Boolean(partnerFilter);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection:
          'column',
        gap: 'var(--space-5)',
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: 'flex',
          alignItems:
            'flex-start',
          justifyContent:
            'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontFamily:
                'var(--font-display)',
              fontSize:
                'var(--text-2xl)',
              fontWeight: 700,
            }}
          >
            Collections
          </h1>

          <p
            style={{
              margin:
                '5px 0 0',
              fontSize:
                'var(--text-sm)',
              color:
                'var(--color-gris-moyen)',
            }}
          >
            {
              collections.length
            }{' '}
            collection
            {collections.length !==
            1
              ? 's'
              : ''}{' '}
            · {activeCount}{' '}
            active
            {activeCount !== 1
              ? 's'
              : ''}{' '}
            · {inactiveCount}{' '}
            inactive
            {inactiveCount !== 1
              ? 's'
              : ''}
          </p>
        </div>

        <Link
          to="/admin/catalogue/collections/nouvelle"
          className="btn btn-primary"
          style={{
            gap: 6,
          }}
        >
          <IconPlus size={15} />
          Nouvelle collection
        </Link>
      </div>

      {/* FILTRES */}

      <div
        className="card"
        style={{
          padding:
            'var(--space-4)',
          display: 'flex',
          gap: 'var(--space-3)',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            position:
              'relative',
            flex: 1,
            minWidth: 240,
          }}
        >
          <IconSearch
            size={14}
            style={{
              position:
                'absolute',
              left: 12,
              top: '50%',
              transform:
                'translateY(-50%)',
              color:
                'var(--color-gris-clair)',
              pointerEvents:
                'none',
            }}
          />

          <input
            type="search"
            className="form-input"
            style={{
              paddingLeft: 35,
            }}
            placeholder="Rechercher une collection..."
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value,
              )
            }
          />
        </div>

        <select
          className="form-input"
          style={{
            width: 180,
          }}
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(
              event.target
                .value as
                | 'all'
                | 'active'
                | 'inactive',
            )
          }
        >
          <option value="all">
            Tous les statuts
          </option>
          <option value="active">
            Actives
          </option>
          <option value="inactive">
            Inactives
          </option>
        </select>

        <select
          className="form-input"
          style={{
            width: 220,
          }}
          value={partnerFilter}
          onChange={(event) =>
            setPartnerFilter(
              event.target.value,
            )
          }
        >
          <option value="">
            Tous les partenaires
          </option>

          {partenaires.map(
            (partenaire) => (
              <option
                key={
                  partenaire.id
                }
                value={
                  partenaire.id
                }
              >
                {
                  partenaire.raison_sociale
                }
              </option>
            ),
          )}
        </select>

        {hasFilters && (
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => {
              setSearch('');
              setStatusFilter(
                'all',
              );
              setPartnerFilter('');
            }}
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* TABLE */}

      <div
        className="table-wrapper card"
        style={{
          overflowX: 'auto',
        }}
      >
        {loading ? (
          <div
            style={{
              minHeight: 260,
              display: 'flex',
              alignItems:
                'center',
              justifyContent:
                'center',
            }}
          >
            <div className="spinner" />
          </div>
        ) : loadError ? (
          <div
            className="empty-state"
            style={{
              padding: '55px 20px',
              textAlign: 'center',
            }}
          >
            <h3>Chargement impossible</h3>
            <p style={{ color: 'var(--color-gris-moyen)' }}>{loadError}</p>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => void fetchCollections()}
            >
              Réessayer
            </button>
          </div>
        ) : filteredCollections.length ===
          0 ? (
          <div
            className="empty-state"
            style={{
              padding:
                '55px 20px',
              textAlign: 'center',
            }}
          >
            <h3>
              Aucune collection
            </h3>

            <p
              style={{
                color:
                  'var(--color-gris-moyen)',
              }}
            >
              {collections.length ===
              0
                ? 'Commencez par créer votre première collection.'
                : 'Aucune collection ne correspond aux filtres sélectionnés.'}
            </p>

            {collections.length ===
              0 && (
              <Link
                to="/admin/catalogue/collections/nouvelle"
                className="btn btn-primary"
              >
                <IconPlus
                  size={14}
                />
                Créer une collection
              </Link>
            )}
          </div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>
                  Collection
                </th>
                <th>Slug</th>
                <th>
                  Partenaire
                </th>
                <th>
                  Produits
                </th>
                <th>
                  Statut
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
              {filteredCollections.map(
                (collection) => (
                  <tr
                    key={
                      collection.id
                    }
                  >
                    <td>
                      <div
                        style={{
                          minWidth:
                            220,
                        }}
                      >
                        <div
                          style={{
                            fontWeight:
                              650,
                          }}
                        >
                          {
                            collection.nom
                          }
                        </div>

                        {collection.description && (
                          <div
                            style={{
                              marginTop:
                                3,
                              maxWidth:
                                420,
                              color:
                                'var(--color-gris-moyen)',
                              fontSize:
                                11,
                              lineHeight:
                                1.45,
                              overflow:
                                'hidden',
                              display:
                                '-webkit-box',
                              WebkitLineClamp:
                                2,
                              WebkitBoxOrient:
                                'vertical',
                            }}
                          >
                            {
                              collection.description
                            }
                          </div>
                        )}
                      </div>
                    </td>

                    <td>
                      <code
                        style={{
                          fontSize:
                            11,
                          fontFamily:
                            'var(--font-mono)',
                          color:
                            'var(--color-gris-moyen)',
                        }}
                      >
                        {
                          collection.slug
                        }
                      </code>
                    </td>

                    <td
                      style={{
                        color:
                          'var(--color-gris-moyen)',
                      }}
                    >
                      {collection.partenaire
                        ?.raison_sociale ??
                        '—'}
                    </td>

                    <td>
                      <span
                        style={{
                          display:
                            'inline-flex',
                          minWidth:
                            28,
                          height: 28,
                          alignItems:
                            'center',
                          justifyContent:
                            'center',
                          borderRadius:
                            999,
                          padding:
                            '0 8px',
                          background:
                            'var(--color-ivoire-dark)',
                          fontWeight:
                            700,
                          fontSize:
                            12,
                        }}
                      >
                        {collection.produits_count ??
                          0}
                      </span>
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          collection.active
                            ? 'badge-success'
                            : 'badge-neutral'
                        }`}
                      >
                        {collection.active
                          ? 'Active'
                          : 'Inactive'}
                      </span>
                    </td>

                    <td>
                      <div
                        style={{
                          display:
                            'flex',
                          justifyContent:
                            'flex-end',
                          gap: 5,
                          flexWrap:
                            'wrap',
                        }}
                      >
                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          disabled={
                            busyId ===
                            collection.id
                          }
                          onClick={() =>
                            toggleActive(
                              collection,
                            )
                          }
                          style={{
                            fontSize:
                              11,
                          }}
                        >
                          {collection.active
                            ? 'Désactiver'
                            : 'Activer'}
                        </button>

                        <Link
                          to={`/admin/catalogue/collections/${collection.id}/modifier`}
                          className="btn btn-ghost btn-sm"
                          title="Modifier"
                        >
                          <IconEdit
                            size={13}
                          />
                        </Link>

                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          disabled={
                            busyId ===
                            collection.id
                          }
                          onClick={() =>
                            deleteCollection(
                              collection,
                            )
                          }
                          style={{
                            color:
                              'var(--color-error)',
                            fontSize:
                              11,
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
      </div>
    </div>
  );
}
