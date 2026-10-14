import React, {
  useEffect,
  useMemo,
  useState,
} from 'react';

import axios from 'axios';
import toast from 'react-hot-toast';

import {
  adminParametresApi,
  type ParametresMap,
} from '../../../api/adminParametres';

import {
  IconPlus,
  IconSearch,
} from '../../../components/ui/Icons';

type ExistingRow = {
  id: string;
  key: string;
  value: string;
  originalValue: unknown;
  isNew: false;
};

type NewRow = {
  id: string;
  key: string;
  value: string;
  originalValue: undefined;
  isNew: true;
};

type ParametreRow =
  | ExistingRow
  | NewRow;

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
      typeof first ===
      'string'
    ) {
      return first;
    }
  }

  return fallback;
}

function valueToText(
  value: unknown,
): string {
  if (
    value === null ||
    value === undefined
  ) {
    return '';
  }

  if (
    typeof value ===
    'string'
  ) {
    return value;
  }

  if (
    typeof value ===
      'object'
  ) {
    try {
      return JSON.stringify(
        value,
        null,
        2,
      );
    } catch {
      return String(value);
    }
  }

  return String(value);
}

function valueFromText(
  text: string,
  originalValue: unknown,
): unknown {
  if (
    typeof originalValue ===
    'boolean'
  ) {
    if (
      text === 'true'
    ) {
      return true;
    }

    if (
      text === 'false'
    ) {
      return false;
    }
  }

  if (
    typeof originalValue ===
    'number'
  ) {
    const parsed =
      Number(text);

    if (
      Number.isFinite(parsed)
    ) {
      return parsed;
    }
  }

  if (
    originalValue === null &&
    text === ''
  ) {
    return null;
  }

  if (
    originalValue &&
    typeof originalValue ===
      'object'
  ) {
    try {
      return JSON.parse(
        text,
      );
    } catch {
      return text;
    }
  }

  return text;
}

function isSensitiveKey(
  key: string,
): boolean {
  return /password|secret|token|api[_-]?key|private[_-]?key/i.test(
    key,
  );
}

function isLongValue(
  value: string,
): boolean {
  return (
    value.length > 90 ||
    value.includes('\n')
  );
}

function makeRows(
  values: ParametresMap,
): ParametreRow[] {
  return Object.entries(values)
    .sort(([a], [b]) =>
      a.localeCompare(
        b,
        'fr',
        {
          sensitivity:
            'base',
        },
      ),
    )
    .map(
      ([key, value]) => ({
        id: `existing:${key}`,
        key,
        value:
          valueToText(
            value,
          ),
        originalValue:
          value,
        isNew: false,
      }),
    );
}

export default function ParametresAdminPage() {
  const [
    rows,
    setRows,
  ] =
    useState<
      ParametreRow[]
    >([]);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    showOnlyModified,
    setShowOnlyModified,
  ] =
    useState(false);

  const [
    visibleSecrets,
    setVisibleSecrets,
  ] =
    useState<
      Record<string, boolean>
    >({});

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      try {
        const response =
          await adminParametresApi.parametres();

        if (!mounted) {
          return;
        }

        setRows(
          makeRows(
            response.data ??
              {},
          ),
        );
      } catch (error) {
        toast.error(
          getApiErrorMessage(
            error,
            'Impossible de charger les paramètres.',
          ),
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, []);

  function isModified(
    row: ParametreRow,
  ): boolean {
    if (row.isNew) {
      return (
        row.key.trim() !==
          '' ||
        row.value !== ''
      );
    }

    return (
      row.value !==
      valueToText(
        row.originalValue,
      )
    );
  }

  const modifiedCount =
    useMemo(
      () =>
        rows.filter(
          isModified,
        ).length,
      [rows],
    );

  const newCount =
    useMemo(
      () =>
        rows.filter(
          (row) =>
            row.isNew &&
            row.key.trim() !==
              '',
        ).length,
      [rows],
    );

  const filteredRows =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLocaleLowerCase(
            'fr',
          );

      return rows.filter(
        (row) => {
          if (
            showOnlyModified &&
            !isModified(row)
          ) {
            return false;
          }

          if (!query) {
            return true;
          }

          return (
            row.key
              .toLocaleLowerCase(
                'fr',
              )
              .includes(
                query,
              ) ||
            row.value
              .toLocaleLowerCase(
                'fr',
              )
              .includes(
                query,
              )
          );
        },
      );
    }, [
      rows,
      search,
      showOnlyModified,
    ]);

  function updateRow(
    id: string,
    field:
      | 'key'
      | 'value',
    value: string,
  ) {
    setRows(
      (current) =>
        current.map(
          (row) =>
            row.id === id
              ? {
                  ...row,
                  [field]:
                    value,
                }
              : row,
        ),
    );
  }

  function addParameter() {
    const id =
      `new:${Date.now()}:${Math.random()
        .toString(36)
        .slice(2)}`;

    setRows(
      (current) => [
        {
          id,
          key: '',
          value: '',
          originalValue:
            undefined,
          isNew: true,
        },
        ...current,
      ],
    );
  }

  function removeNewRow(
    id: string,
  ) {
    setRows(
      (current) =>
        current.filter(
          (row) =>
            row.id !== id,
        ),
    );
  }

  function resetChanges() {
    setRows(
      (current) =>
        current
          .filter(
            (row) =>
              !row.isNew,
          )
          .map(
            (row) => ({
              ...row,
              value:
                valueToText(
                  row.originalValue,
                ),
            }),
          ),
    );

    toast.success(
      'Modifications annulées.',
    );
  }

  function validateRows():
    | ParametresMap
    | null {
    const changed:
      ParametresMap = {};

    const existingKeys =
      new Set<string>();

    for (const row of rows) {
      const key =
        row.key.trim();

      if (row.isNew) {
        if (
          !key &&
          !row.value
        ) {
          continue;
        }

        if (!key) {
          toast.error(
            'Chaque nouveau paramètre doit avoir une clé.',
          );

          return null;
        }
      }

      if (
        key &&
        existingKeys.has(
          key,
        )
      ) {
        toast.error(
          `La clé "${key}" est présente plusieurs fois.`,
        );

        return null;
      }

      if (key) {
        existingKeys.add(
          key,
        );
      }

      if (
        isModified(row) &&
        key
      ) {
        changed[key] =
          row.isNew
            ? row.value
            : (valueFromText(
                row.value,
                row.originalValue,
              ) as any);
      }
    }

    if (
      Object.keys(changed)
        .length === 0
    ) {
      toast(
        'Aucune modification à enregistrer.',
      );

      return null;
    }

    return changed;
  }

  async function saveChanges() {
    const changed =
      validateRows();

    if (!changed) {
      return;
    }

    setSaving(true);

    try {
      const response =
        await adminParametresApi.updateParametres(
          {
            parametres:
              changed,
          },
        );

      toast.success(
        response.data
          ?.message ??
          'Paramètres enregistrés.',
      );

      const fresh =
        await adminParametresApi.parametres();

      setRows(
        makeRows(
          fresh.data ?? {},
        ),
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible d’enregistrer les paramètres.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <style>{`
        .pa-page {
          display: flex;
          flex-direction: column;
          gap: 20px;
          max-width: 1280px;
          margin: 0 auto;
        }

        .pa-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 18px;
          flex-wrap: wrap;
        }

        .pa-header h1 {
          margin: 0;
          font-family: var(--font-display);
          font-size: var(--text-2xl);
          font-weight: 760;
          letter-spacing: -.02em;
        }

        .pa-header p {
          max-width: 720px;
          margin: 5px 0 0;
          color: var(--color-gris-moyen);
          font-size: var(--text-sm);
          line-height: 1.55;
        }

        .pa-header-actions {
          display: flex;
          align-items: center;
          gap: 8px;
          flex-wrap: wrap;
        }

        .pa-summary {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(140px, 1fr));
          gap: 12px;
        }

        .pa-summary-card {
          padding: 16px 18px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 13px;
          background: var(--color-blanc);
        }

        .pa-summary-card span {
          display: block;
          color: var(--color-gris-moyen);
          font-size: 9.5px;
          font-weight: 720;
          letter-spacing: .06em;
          text-transform: uppercase;
        }

        .pa-summary-card strong {
          display: block;
          margin-top: 5px;
          font-size: 23px;
          line-height: 1;
          font-weight: 790;
        }

        .pa-tools {
          display: flex;
          align-items: center;
          gap: 10px;
          flex-wrap: wrap;
          padding: 14px;
        }

        .pa-search {
          position: relative;
          flex: 1;
          min-width: 260px;
        }

        .pa-search svg {
          position: absolute;
          top: 50%;
          left: 12px;
          transform: translateY(-50%);
          color: var(--color-gris-clair);
          pointer-events: none;
        }

        .pa-search .form-input {
          padding-left: 36px;
        }

        .pa-filter-toggle {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 38px;
          padding: 0 11px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 9px;
          background: var(--color-blanc);
          color: var(--color-gris-fonce);
          font-size: 10.5px;
          font-weight: 700;
          cursor: pointer;
        }

        .pa-filter-toggle input {
          accent-color: var(--color-terra);
        }

        .pa-editor {
          overflow: hidden;
        }

        .pa-editor-head {
          display: grid;
          grid-template-columns:
            minmax(230px, .9fr)
            minmax(0, 1.7fr)
            110px;
          gap: 14px;
          padding: 11px 16px;
          border-bottom: 1px solid var(--color-border, rgba(0,0,0,.08));
          background: var(--color-ivoire);
          color: var(--color-gris-moyen);
          font-size: 9.5px;
          font-weight: 750;
          letter-spacing: .05em;
          text-transform: uppercase;
        }

        .pa-row {
          display: grid;
          grid-template-columns:
            minmax(230px, .9fr)
            minmax(0, 1.7fr)
            110px;
          gap: 14px;
          align-items: start;
          padding: 15px 16px;
          border-bottom: 1px solid var(--color-border, rgba(0,0,0,.07));
          background: var(--color-blanc);
          transition: background .16s ease;
        }

        .pa-row:last-child {
          border-bottom: 0;
        }

        .pa-row.is-modified {
          background:
            linear-gradient(
              90deg,
              rgba(196,98,58,.045),
              var(--color-blanc) 35%
            );
        }

        .pa-field {
          min-width: 0;
        }

        .pa-key-input {
          font-family: var(--font-mono, monospace);
          font-size: 11.5px;
          font-weight: 650;
        }

        .pa-key-readonly {
          min-height: 42px;
          display: flex;
          align-items: center;
          padding: 0 12px;
          border: 1px solid transparent;
          border-radius: 9px;
          background: var(--color-ivoire);
          color: var(--color-gris-fonce);
          font-family: var(--font-mono, monospace);
          font-size: 11px;
          font-weight: 650;
          overflow-wrap: anywhere;
        }

        .pa-field-help {
          margin-top: 5px;
          color: var(--color-gris-moyen);
          font-size: 9px;
          line-height: 1.4;
        }

        .pa-value-wrap {
          position: relative;
        }

        .pa-value-wrap .form-input {
          padding-right: 68px;
        }

        .pa-value-toggle {
          position: absolute;
          top: 50%;
          right: 9px;
          transform: translateY(-50%);
          border: 0;
          background: transparent;
          color: var(--color-gris-moyen);
          font-size: 9.5px;
          font-weight: 700;
          cursor: pointer;
        }

        .pa-textarea {
          min-height: 92px;
          resize: vertical;
          padding-top: 10px !important;
          padding-bottom: 10px !important;
          line-height: 1.5;
        }

        .pa-row-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 6px;
          min-height: 42px;
        }

        .pa-modified-badge {
          display: inline-flex;
          align-items: center;
          min-height: 25px;
          padding: 0 8px;
          border-radius: 999px;
          background: rgba(196,98,58,.10);
          color: var(--color-terra);
          font-size: 8.5px;
          font-weight: 800;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .pa-empty {
          padding: 48px 20px;
          text-align: center;
        }

        .pa-empty h3 {
          margin: 0 0 6px;
          font-size: 15px;
        }

        .pa-empty p {
          margin: 0;
          color: var(--color-gris-moyen);
          font-size: 11px;
        }

        .pa-footer-save {
          position: sticky;
          bottom: 14px;
          z-index: 20;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          padding: 13px 15px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 13px;
          background: rgba(255,255,255,.94);
          backdrop-filter: blur(12px);
          box-shadow: 0 12px 32px rgba(0,0,0,.08);
        }

        .pa-footer-save p {
          margin: 0;
          color: var(--color-gris-moyen);
          font-size: 10.5px;
        }

        .pa-footer-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .pa-loading {
          min-height: 280px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        @media (max-width: 860px) {
          .pa-editor-head {
            display: none;
          }

          .pa-row {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .pa-row-actions {
            justify-content: flex-start;
          }

          .pa-summary {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 620px) {
          .pa-header-actions,
          .pa-footer-actions {
            width: 100%;
          }

          .pa-header-actions .btn,
          .pa-footer-actions .btn {
            flex: 1;
          }

          .pa-footer-save {
            align-items: stretch;
            flex-direction: column;
          }
        }
      `}</style>

      <div className="pa-page">
        <header className="pa-header">
          <div>
            <h1>
              Paramètres
            </h1>

            <p>
              Gérez les paramètres généraux enregistrés par l’application. Les modifications sont auditées automatiquement par le backend lorsqu’une valeur change.
            </p>
          </div>

          <div className="pa-header-actions">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={
                addParameter
              }
            >
              <IconPlus
                size={14}
              />
              Nouveau paramètre
            </button>

            <button
              type="button"
              className="btn btn-primary"
              disabled={
                saving ||
                modifiedCount ===
                  0
              }
              onClick={
                saveChanges
              }
            >
              {saving
                ? 'Enregistrement...'
                : 'Enregistrer'}
            </button>
          </div>
        </header>

        <div className="pa-summary">
          <div className="pa-summary-card">
            <span>
              Paramètres enregistrés
            </span>

            <strong>
              {
                rows.filter(
                  (row) =>
                    !row.isNew,
                ).length
              }
            </strong>
          </div>

          <div className="pa-summary-card">
            <span>
              Modifications en attente
            </span>

            <strong>
              {modifiedCount}
            </strong>
          </div>

          <div className="pa-summary-card">
            <span>
              Nouveaux paramètres
            </span>

            <strong>
              {newCount}
            </strong>
          </div>
        </div>

        <section className="card pa-tools">
          <div className="pa-search">
            <IconSearch
              size={14}
            />

            <input
              type="search"
              className="form-input"
              placeholder="Rechercher une clé ou une valeur..."
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

          <label className="pa-filter-toggle">
            <input
              type="checkbox"
              checked={
                showOnlyModified
              }
              onChange={(
                event,
              ) =>
                setShowOnlyModified(
                  event.target
                    .checked,
                )
              }
            />

            Modifiés uniquement
          </label>
        </section>

        <section className="card pa-editor">
          {loading ? (
            <div className="pa-loading">
              <div className="spinner" />
            </div>
          ) : (
            <>
              <div className="pa-editor-head">
                <span>
                  Clé
                </span>
                <span>
                  Valeur
                </span>
                <span
                  style={{
                    textAlign:
                      'right',
                  }}
                >
                  État
                </span>
              </div>

              {filteredRows.length ===
              0 ? (
                <div className="pa-empty">
                  <h3>
                    Aucun paramètre
                  </h3>

                  <p>
                    Aucun élément ne correspond à votre recherche ou à vos filtres.
                  </p>
                </div>
              ) : (
                filteredRows.map(
                  (row) => {
                    const modified =
                      isModified(
                        row,
                      );

                    const sensitive =
                      isSensitiveKey(
                        row.key,
                      );

                    const secretVisible =
                      Boolean(
                        visibleSecrets[
                          row.id
                        ],
                      );

                    const longValue =
                      isLongValue(
                        row.value,
                      );

                    return (
                      <div
                        key={
                          row.id
                        }
                        className={`pa-row ${
                          modified
                            ? 'is-modified'
                            : ''
                        }`}
                      >
                        <div className="pa-field">
                          {row.isNew ? (
                            <>
                              <input
                                className="form-input pa-key-input"
                                value={
                                  row.key
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateRow(
                                    row.id,
                                    'key',
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                placeholder="ex. entreprise_nom"
                              />

                              <div className="pa-field-help">
                                La clé sera créée lors de l’enregistrement.
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="pa-key-readonly">
                                {
                                  row.key
                                }
                              </div>

                              <div className="pa-field-help">
                                Une clé existante n’est pas renommable avec le backend actuel.
                              </div>
                            </>
                          )}
                        </div>

                        <div className="pa-field">
                          {longValue ? (
                            <textarea
                              className="form-input pa-textarea"
                              value={
                                row.value
                              }
                              onChange={(
                                event,
                              ) =>
                                updateRow(
                                  row.id,
                                  'value',
                                  event
                                    .target
                                    .value,
                                )
                              }
                            />
                          ) : (
                            <div className="pa-value-wrap">
                              <input
                                type={
                                  sensitive &&
                                  !secretVisible
                                    ? 'password'
                                    : 'text'
                                }
                                className="form-input"
                                value={
                                  row.value
                                }
                                onChange={(
                                  event,
                                ) =>
                                  updateRow(
                                    row.id,
                                    'value',
                                    event
                                      .target
                                      .value,
                                  )
                                }
                                placeholder="Valeur du paramètre"
                              />

                              {sensitive && (
                                <button
                                  type="button"
                                  className="pa-value-toggle"
                                  onClick={() =>
                                    setVisibleSecrets(
                                      (
                                        current,
                                      ) => ({
                                        ...current,
                                        [row.id]:
                                          !secretVisible,
                                      }),
                                    )
                                  }
                                >
                                  {secretVisible
                                    ? 'Masquer'
                                    : 'Afficher'}
                                </button>
                              )}
                            </div>
                          )}

                          {typeof row.originalValue ===
                            'boolean' && (
                            <div className="pa-field-help">
                              Valeur booléenne : utilisez « true » ou « false ».
                            </div>
                          )}

                          {typeof row.originalValue ===
                            'number' && (
                            <div className="pa-field-help">
                              Valeur numérique.
                            </div>
                          )}
                        </div>

                        <div className="pa-row-actions">
                          {modified && (
                            <span className="pa-modified-badge">
                              {row.isNew
                                ? 'Nouveau'
                                : 'Modifié'}
                            </span>
                          )}

                          {row.isNew && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              onClick={() =>
                                removeNewRow(
                                  row.id,
                                )
                              }
                              style={{
                                color:
                                  'var(--color-error)',
                              }}
                            >
                              Retirer
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  },
                )
              )}
            </>
          )}
        </section>

        {!loading && (
          <div className="pa-footer-save">
            <p>
              {modifiedCount > 0
                ? `${modifiedCount} modification${modifiedCount > 1 ? 's' : ''} non enregistrée${modifiedCount > 1 ? 's' : ''}.`
                : 'Tous les paramètres sont enregistrés.'}
            </p>

            <div className="pa-footer-actions">
              <button
                type="button"
                className="btn btn-secondary"
                disabled={
                  saving ||
                  modifiedCount ===
                    0
                }
                onClick={
                  resetChanges
                }
              >
                Annuler les changements
              </button>

              <button
                type="button"
                className="btn btn-primary"
                disabled={
                  saving ||
                  modifiedCount ===
                    0
                }
                onClick={
                  saveChanges
                }
              >
                {saving
                  ? 'Enregistrement...'
                  : `Enregistrer${
                      modifiedCount >
                      0
                        ? ` (${modifiedCount})`
                        : ''
                    }`}
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
