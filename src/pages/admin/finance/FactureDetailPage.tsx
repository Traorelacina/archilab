import React, {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useParams,
} from 'react-router-dom';

import axios from 'axios';
import toast from 'react-hot-toast';

import {
  adminFacturesApi,
  type AdminFacture,
} from '../../../api/adminFactures';

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

function clientName(
  facture: AdminFacture,
): string {
  const client = facture.client;

  if (!client) {
    return 'Client non chargé';
  }

  if (client.raison_sociale) {
    return client.raison_sociale;
  }

  return [
    client.prenoms,
    client.nom,
  ]
    .filter(Boolean)
    .join(' ')
    .trim() || `Client #${client.id}`;
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
  if (!value) return '—';

  if (value === 'partielle') {
    return 'Partiellement payée';
  }

  return value
    .replace(/_/g, ' ')
    .replace(
      /\b\w/g,
      (letter) =>
        letter.toUpperCase(),
    );
}

function statutClass(
  value?: string | null,
): string {
  switch (value) {
    case 'payee':
      return 'badge-success';
    case 'partiellement_payee':
    case 'partielle':
      return 'badge-warning';
    case 'annulee':
    case 'impayee':
      return 'badge-error';
    case 'emise':
      return 'badge-info';
    default:
      return 'badge-neutral';
  }
}

function formatMoney(
  value?: number | null,
): string {
  return `${new Intl.NumberFormat(
    'fr-FR',
  ).format(
    Number(value ?? 0),
  )} FCFA`;
}

function formatDate(
  value?: string | null,
): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
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

function formatDateTime(
  value?: string | null,
): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat(
    'fr-FR',
    {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

export default function FactureDetailPage() {
  const { id } =
    useParams<{ id: string }>();

  const navigate =
    useNavigate();

  const factureId =
    Number(id);

  const [facture, setFacture] =
    useState<AdminFacture | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState(false);

  const [
    showAvoir,
    setShowAvoir,
  ] = useState(false);

  const [
    avoirMontant,
    setAvoirMontant,
  ] = useState('');

  const [
    avoirMotif,
    setAvoirMotif,
  ] = useState('');

  async function loadFacture() {
    setLoading(true);

    try {
      const response =
        await adminFacturesApi.facture(
          factureId,
        );

      setFacture(
        response.data,
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible de charger cette facture.',
        ),
      );

      navigate(
        '/admin/finance/factures',
        {
          replace: true,
        },
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (
      !Number.isFinite(
        factureId,
      )
    ) {
      navigate(
        '/admin/finance/factures',
        {
          replace: true,
        },
      );
      return;
    }

    loadFacture();
  }, [factureId]);

  const paiements =
    useMemo(
      () =>
        facture?.paiements ??
        [],
      [facture],
    );

  const commandeLignes =
    useMemo(
      () =>
        facture?.commande
          ?.lignes ?? [],
      [facture],
    );

  const totalPaid =
    useMemo(
      () =>
        paiements.reduce(
          (
            total,
            paiement,
          ) =>
            total + (paiement.statut === 'valide'
              ? Number(paiement.montant ?? 0)
              : 0),
          0,
        ),
      [paiements],
    );

  async function handlePdf() {
    if (!facture) return;

    setBusy(true);

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
      setBusy(false);
    }
  }

  async function handleAvoir(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!facture) return;

    if (!avoirMotif.trim()) {
      toast.error(
        'Le motif de l’avoir est obligatoire.',
      );
      return;
    }

    const parsed =
      avoirMontant.trim()
        ? Number(
            avoirMontant,
          )
        : null;

    if (
      parsed !== null &&
      (!Number.isInteger(
        parsed,
      ) ||
        parsed < 1)
    ) {
      toast.error(
        'Le montant de l’avoir doit être un entier supérieur à zéro.',
      );
      return;
    }

    setBusy(true);

    try {
      const response =
        await adminFacturesApi.genererAvoir(
          facture.id,
          {
            montant: parsed,
            motif:
              avoirMotif.trim(),
          },
        );

      toast.success(
        response.data
          .message ??
          'Avoir généré.',
      );

      navigate(
        `/admin/finance/factures/${response.data.facture.id}`,
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible de générer l’avoir.',
        ),
      );
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: 340,
          display: 'flex',
          alignItems:
            'center',
          justifyContent:
            'center',
        }}
      >
        <div className="spinner" />
      </div>
    );
  }

  if (!facture) {
    return null;
  }

  return (
    <>
      <style>{`
        .fd-page {
          max-width: 1380px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .fd-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          flex-wrap: wrap;
        }

        .fd-back {
          display: inline-block;
          margin-bottom: 7px;
          color: var(--color-gris-moyen);
          font-size: var(--text-sm);
          text-decoration: none;
        }

        .fd-title {
          margin: 0;
          font-family: var(--font-display);
          font-size: var(--text-2xl);
          font-weight: 760;
          letter-spacing: -.02em;
        }

        .fd-subtitle {
          margin: 5px 0 0;
          color: var(--color-gris-moyen);
          font-size: var(--text-sm);
        }

        .fd-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .fd-layout {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            330px;
          gap: 20px;
          align-items: start;
        }

        .fd-main,
        .fd-sidebar {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .fd-sidebar {
          position: sticky;
          top: 18px;
        }

        .fd-card {
          padding: 22px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 14px;
          background: var(--color-blanc);
        }

        .fd-card-head {
          margin-bottom: 18px;
          padding-bottom: 14px;
          border-bottom: 1px solid var(--color-border, rgba(0,0,0,.08));
        }

        .fd-card-head small {
          display: block;
          margin-bottom: 5px;
          color: var(--color-terra);
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: .10em;
          text-transform: uppercase;
        }

        .fd-card-head h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 760;
        }

        .fd-meta-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 12px;
        }

        .fd-meta {
          min-width: 0;
          padding: 13px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 10px;
          background: var(--color-ivoire);
        }

        .fd-meta span {
          display: block;
          color: var(--color-gris-moyen);
          font-size: 8.5px;
          font-weight: 700;
          letter-spacing: .04em;
          text-transform: uppercase;
        }

        .fd-meta strong {
          display: block;
          margin-top: 5px;
          font-size: 11.5px;
          overflow-wrap: anywhere;
        }

        .fd-client-name {
          font-size: 14px;
          font-weight: 760;
        }

        .fd-client-info {
          margin-top: 5px;
          color: var(--color-gris-moyen);
          font-size: 10.5px;
          line-height: 1.55;
        }

        .fd-table-wrap {
          overflow-x: auto;
        }

        .fd-money {
          white-space: nowrap;
          font-weight: 720;
        }

        .fd-summary {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .fd-summary-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 9px;
          border-bottom: 1px solid var(--color-border, rgba(0,0,0,.07));
          font-size: 10.5px;
        }

        .fd-summary-row span:first-child {
          color: var(--color-gris-moyen);
        }

        .fd-summary-row strong {
          text-align: right;
        }

        .fd-summary-row--total {
          border-bottom: 0;
          padding-top: 4px;
          font-size: 13px;
        }

        .fd-summary-row--total strong {
          color: var(--color-terra);
          font-size: 16px;
        }

        .fd-origin {
          padding: 12px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 10px;
          background: var(--color-ivoire);
        }

        .fd-origin span {
          display: block;
          color: var(--color-gris-moyen);
          font-size: 9px;
          text-transform: uppercase;
          font-weight: 700;
        }

        .fd-origin a {
          display: inline-block;
          margin-top: 5px;
          color: var(--color-terra);
          font-size: 11px;
          font-weight: 750;
          text-decoration: none;
        }

        .fd-avoir {
          border-color: rgba(196,98,58,.18);
        }

        .fd-field {
          display: flex;
          flex-direction: column;
          margin-bottom: 12px;
        }

        .fd-field:last-child {
          margin-bottom: 0;
        }

        .fd-field label {
          margin-bottom: 6px;
          font-size: 10.5px;
          font-weight: 700;
        }

        .fd-textarea {
          min-height: 90px;
          resize: vertical;
          line-height: 1.5;
        }

        @media (max-width: 960px) {
          .fd-layout {
            grid-template-columns: 1fr;
          }

          .fd-sidebar {
            position: static;
          }
        }

        @media (max-width: 700px) {
          .fd-meta-grid {
            grid-template-columns: 1fr;
          }

          .fd-actions {
            width: 100%;
          }

          .fd-actions .btn {
            flex: 1;
          }
        }
      `}</style>

      <div className="fd-page">
        <header className="fd-header">
          <div>
            <Link
              to="/admin/finance/factures"
              className="fd-back"
            >
              ← Retour aux factures
            </Link>

            <h1 className="fd-title">
              {facture.numero}
            </h1>

            <p className="fd-subtitle">
              Détail de la facture et suivi des paiements.
            </p>
          </div>

          <div className="fd-actions">
            <button
              type="button"
              className="btn btn-secondary"
              disabled={busy}
              onClick={handlePdf}
            >
              Télécharger PDF
            </button>

            {facture.type !== 'avoir' && (
              <button
                type="button"
                className="btn btn-primary"
                onClick={() =>
                  setShowAvoir(
                    (current) =>
                      !current,
                  )
                }
              >
                Générer un avoir
              </button>
            )}
          </div>
        </header>

        <div className="fd-layout">
          <main className="fd-main">
            <section className="fd-card">
              <div className="fd-card-head">
                <small>
                  Informations
                </small>

                <h2>
                  Facture
                </h2>
              </div>

              <div className="fd-meta-grid">
                <div className="fd-meta">
                  <span>
                    Type
                  </span>

                  <strong>
                    <span
                      className={`badge ${typeClass(
                        facture.type,
                      )}`}
                    >
                      {typeLabel(
                        facture.type,
                      )}
                    </span>
                  </strong>
                </div>

                <div className="fd-meta">
                  <span>
                    Statut
                  </span>

                  <strong>
                    <span
                      className={`badge ${statutClass(
                        facture.statut,
                      )}`}
                    >
                      {statutLabel(
                        facture.statut,
                      )}
                    </span>
                  </strong>
                </div>

                <div className="fd-meta">
                  <span>
                    Date d’émission
                  </span>

                  <strong>
                    {formatDate(
                      facture.date_emission ??
                        facture.created_at,
                    )}
                  </strong>
                </div>

                <div className="fd-meta">
                  <span>
                    Commande
                  </span>

                  <strong>
                    {facture.commande
                      ?.numero ??
                      '—'}
                  </strong>
                </div>

                <div className="fd-meta">
                  <span>
                    Échéance
                  </span>

                  <strong>
                    {formatDate(
                      facture.date_echeance,
                    )}
                  </strong>
                </div>

                <div className="fd-meta">
                  <span>
                    PDF
                  </span>

                  <strong>
                    {facture.chemin_pdf
                      ? 'Disponible'
                      : 'Généré à la demande'}
                  </strong>
                </div>
              </div>
            </section>

            <section className="fd-card">
              <div className="fd-card-head">
                <small>
                  Client
                </small>

                <h2>
                  Destinataire
                </h2>
              </div>

              <div className="fd-client-name">
                {clientName(
                  facture,
                )}
              </div>

              <div className="fd-client-info">
                Type :{' '}
                {facture.client
                  ?.type ??
                  '—'}
                {' · '}
                Client #
                {facture.client
                  ?.id ??
                  facture.client_id ??
                  '—'}
              </div>
            </section>

            <section className="fd-card">
              <div className="fd-card-head">
                <small>
                  Commande source
                </small>

                <h2>
                  Lignes de commande
                </h2>
              </div>

              {commandeLignes.length ===
              0 ? (
                <div className="empty-state">
                  <p>
                    Aucune ligne de commande n’est disponible dans la réponse.
                  </p>
                </div>
              ) : (
                <div className="fd-table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>
                          Désignation
                        </th>
                        <th>
                          Qté
                        </th>
                        <th>
                          Prix unitaire
                        </th>
                        <th>
                          Montant
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {commandeLignes.map(
                        (line) => (
                          <tr
                            key={
                              line.id
                            }
                          >
                            <td>
                              {line.designation ??
                                `Ligne #${line.id}`}
                            </td>

                            <td>
                              {Number(
                                line.quantite ??
                                  0,
                              )}
                            </td>

                            <td>
                              <span className="fd-money">
                                {formatMoney(
                                  line.prix_unitaire,
                                )}
                              </span>
                            </td>

                            <td>
                              <span className="fd-money">
                                {formatMoney(
                                  line.montant ??
                                    Number(
                                      line.quantite ??
                                        0,
                                    ) *
                                      Number(
                                        line.prix_unitaire ??
                                          0,
                                      ),
                                )}
                              </span>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <section className="fd-card">
              <div className="fd-card-head">
                <small>
                  Encaissements
                </small>

                <h2>
                  Paiements
                </h2>
              </div>

              {paiements.length ===
              0 ? (
                <div className="empty-state">
                  <p>
                    Aucun paiement n’est actuellement associé à cette facture.
                  </p>
                </div>
              ) : (
                <div className="fd-table-wrap">
                  <table className="table">
                    <thead>
                      <tr>
                        <th>
                          Date
                        </th>
                        <th>
                          Mode
                        </th>
                        <th>
                          Référence
                        </th>
                        <th>
                          Statut
                        </th>
                        <th>
                          Montant
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {paiements.map(
                        (paiement) => (
                          <tr
                            key={
                              paiement.id
                            }
                          >
                            <td>
                              {formatDateTime(
                                paiement.date_paiement ??
                                  paiement.created_at,
                              )}
                            </td>

                            <td>
                              {paiement.moyen ??
                                paiement.mode ??
                                '—'}
                            </td>

                            <td>
                              {paiement.reference_externe ??
                                paiement.reference ??
                                '—'}
                            </td>

                            <td>
                              {statutLabel(
                                paiement.statut,
                              )}
                            </td>

                            <td>
                              <span className="fd-money">
                                {formatMoney(
                                  paiement.montant,
                                )}
                              </span>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </main>

          <aside className="fd-sidebar">
            <section className="fd-card">
              <div className="fd-card-head">
                <small>
                  Montants
                </small>

                <h2>
                  Récapitulatif
                </h2>
              </div>

              <div className="fd-summary">
                <div className="fd-summary-row">
                  <span>
                    Montant HT
                  </span>

                  <strong>
                    {formatMoney(
                      facture.montant_ht,
                    )}
                  </strong>
                </div>

                <div className="fd-summary-row">
                  <span>
                    TVA
                  </span>

                  <strong>
                    {formatMoney(
                      facture.tva,
                    )}
                  </strong>
                </div>

                <div className="fd-summary-row">
                  <span>
                    Paiements chargés
                  </span>

                  <strong>
                    {formatMoney(
                      totalPaid,
                    )}
                  </strong>
                </div>

                {(facture.montant_paye ?? facture.montant_regle) !==
                  undefined &&
                  (facture.montant_paye ?? facture.montant_regle) !==
                    null && (
                    <div className="fd-summary-row">
                      <span>
                        Montant payé enregistré
                      </span>

                      <strong>
                        {formatMoney(
                          facture.montant_paye ?? facture.montant_regle,
                        )}
                      </strong>
                    </div>
                  )}

                {(facture.solde ??
                  Math.max(0, Number(facture.montant_ttc ?? 0) - Number(facture.montant_paye ?? facture.montant_regle ?? 0))) !== null && (
                    <div className="fd-summary-row">
                      <span>
                        Solde
                      </span>

                      <strong>
                        {formatMoney(
                          facture.solde ??
                            Math.max(0, Number(facture.montant_ttc ?? 0) - Number(facture.montant_paye ?? facture.montant_regle ?? 0)),
                        )}
                      </strong>
                    </div>
                  )}

                <div className="fd-summary-row fd-summary-row--total">
                  <span>
                    Total TTC
                  </span>

                  <strong>
                    {formatMoney(
                      facture.montant_ttc,
                    )}
                  </strong>
                </div>
              </div>
            </section>

            {facture.origine && (
              <section className="fd-card">
                <div className="fd-card-head">
                  <small>
                    Origine
                  </small>

                  <h2>
                    Facture d’origine
                  </h2>
                </div>

                <div className="fd-origin">
                  <span>
                    Document lié
                  </span>

                  <Link
                    to={`/admin/finance/factures/${facture.origine.id}`}
                  >
                    {facture.origine.numero}
                  </Link>
                </div>
              </section>
            )}

            {showAvoir &&
              facture.type !==
                'avoir' && (
                <section className="fd-card fd-avoir">
                  <div className="fd-card-head">
                    <small>
                      Avoir
                    </small>

                    <h2>
                      Générer un avoir
                    </h2>
                  </div>

                  <form
                    onSubmit={
                      handleAvoir
                    }
                  >
                    <div className="fd-field">
                      <label htmlFor="avoir-montant">
                        Montant
                      </label>

                      <input
                        id="avoir-montant"
                        type="number"
                        min={1}
                        step={1}
                        className="form-input"
                        value={
                          avoirMontant
                        }
                        onChange={(
                          event,
                        ) =>
                          setAvoirMontant(
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder="Vide = montant calculé par le service"
                      />
                    </div>

                    <div className="fd-field">
                      <label htmlFor="avoir-motif">
                        Motif
                      </label>

                      <textarea
                        id="avoir-motif"
                        maxLength={255}
                        required
                        className="form-input fd-textarea"
                        value={
                          avoirMotif
                        }
                        onChange={(
                          event,
                        ) =>
                          setAvoirMotif(
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder="Motif obligatoire de l’avoir..."
                      />
                    </div>

                    <button
                      type="submit"
                      className="btn btn-primary"
                      disabled={busy}
                      style={{
                        width:
                          '100%',
                      }}
                    >
                      {busy
                        ? 'Génération...'
                        : 'Générer l’avoir'}
                    </button>
                  </form>
                </section>
              )}
          </aside>
        </div>
      </div>
    </>
  );
}
