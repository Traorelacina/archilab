import React, {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  Link,
  useNavigate,
  useSearchParams,
} from 'react-router-dom';

import axios from 'axios';
import toast from 'react-hot-toast';

import {
  adminFacturesApi,
  type CommandeLookup,
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
  commande: CommandeLookup,
): string {
  const client = commande.client;

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

function formatMoney(
  value?: number | null,
): string {
  return `${new Intl.NumberFormat(
    'fr-FR',
  ).format(
    Number(value ?? 0),
  )} FCFA`;
}

const TYPE_OPTIONS: Array<{
  value:
    | 'proforma'
    | 'acompte'
    | 'definitive';
  label: string;
  description: string;
}> = [
  {
    value: 'proforma',
    label: 'Facture proforma',
    description:
      'Document commercial préparatoire généré à partir de la commande.',
  },
  {
    value: 'acompte',
    label: 'Facture d’acompte',
    description:
      'Facture correspondant à une partie du montant de la commande.',
  },
  {
    value: 'definitive',
    label: 'Facture définitive',
    description:
      'Facture finale générée à partir de la commande.',
  },
];

export default function GenererFacturePage() {
  const navigate =
    useNavigate();

  const [
    searchParams,
  ] = useSearchParams();

  const initialCommandeId =
    searchParams.get(
      'commande_id',
    ) ?? '';

  const [
    commandes,
    setCommandes,
  ] =
    useState<
      CommandeLookup[]
    >([]);

  const [
    commandeId,
    setCommandeId,
  ] =
    useState(
      initialCommandeId,
    );

  const [type, setType] =
    useState<
      | 'proforma'
      | 'acompte'
      | 'definitive'
    >('proforma');

  const [
    montant,
    setMontant,
  ] = useState('');

  const [
    recherche,
    setRecherche,
  ] = useState('');

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      try {
        const response =
          await adminFacturesApi.commandes(
            {
              per_page: 200,
            },
          );

        if (!mounted) {
          return;
        }

        setCommandes(
          response.data.data ??
            [],
        );
      } catch (error) {
        toast.error(
          getApiErrorMessage(
            error,
            'Impossible de charger les commandes disponibles.',
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

  const selectedCommande =
    useMemo(
      () =>
        commandes.find(
          (commande) =>
            String(
              commande.id,
            ) ===
            commandeId,
        ),
      [
        commandes,
        commandeId,
      ],
    );

  const filteredCommandes =
    useMemo(() => {
      const query =
        recherche
          .trim()
          .toLocaleLowerCase(
            'fr',
          );

      if (!query) {
        return commandes;
      }

      return commandes.filter(
        (commande) =>
          [
            commande.numero,
            clientName(
              commande,
            ),
            commande.statut,
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
            ),
      );
    }, [
      commandes,
      recherche,
    ]);

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const parsedCommande =
      Number(
        commandeId,
      );

    if (
      !Number.isInteger(
        parsedCommande,
      ) ||
      parsedCommande <= 0
    ) {
      toast.error(
        'Sélectionnez une commande valide.',
      );
      return;
    }

    const parsedMontant =
      montant.trim()
        ? Number(
            montant,
          )
        : null;

    if (
      parsedMontant !==
        null &&
      (!Number.isInteger(
        parsedMontant,
      ) ||
        parsedMontant < 1)
    ) {
      toast.error(
        'Le montant doit être un entier supérieur à zéro.',
      );
      return;
    }

    setSaving(true);

    try {
      const response =
        await adminFacturesApi.genererFacture(
          parsedCommande,
          {
            type,
            montant:
              parsedMontant,
          },
        );

      toast.success(
        response.data
          .message ??
          'Facture générée.',
      );

      navigate(
        `/admin/finance/factures/${response.data.facture.id}`,
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible de générer la facture.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <style>{`
        .fg-page {
          max-width: 1160px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .fg-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 18px;
          flex-wrap: wrap;
        }

        .fg-back {
          display: inline-block;
          margin-bottom: 7px;
          color: var(--color-gris-moyen);
          font-size: var(--text-sm);
          text-decoration: none;
        }

        .fg-title {
          margin: 0;
          font-family: var(--font-display);
          font-size: var(--text-2xl);
          font-weight: 760;
          letter-spacing: -.02em;
        }

        .fg-subtitle {
          max-width: 700px;
          margin: 5px 0 0;
          color: var(--color-gris-moyen);
          font-size: var(--text-sm);
          line-height: 1.55;
        }

        .fg-layout {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            320px;
          gap: 20px;
          align-items: start;
        }

        .fg-main,
        .fg-sidebar {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .fg-sidebar {
          position: sticky;
          top: 18px;
        }

        .fg-card {
          padding: 22px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 14px;
          background: var(--color-blanc);
        }

        .fg-card-head {
          margin-bottom: 18px;
          padding-bottom: 15px;
          border-bottom: 1px solid var(--color-border, rgba(0,0,0,.08));
        }

        .fg-card-head small {
          display: block;
          margin-bottom: 5px;
          color: var(--color-terra);
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: .10em;
          text-transform: uppercase;
        }

        .fg-card-head h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 760;
        }

        .fg-card-head p {
          margin: 5px 0 0;
          color: var(--color-gris-moyen);
          font-size: 10.5px;
          line-height: 1.55;
        }

        .fg-field {
          display: flex;
          flex-direction: column;
          margin-bottom: 16px;
        }

        .fg-field:last-child {
          margin-bottom: 0;
        }

        .fg-field label {
          margin-bottom: 6px;
          font-size: 11.5px;
          font-weight: 720;
        }

        .fg-help {
          margin-top: 6px;
          color: var(--color-gris-moyen);
          font-size: 9.5px;
          line-height: 1.45;
        }

        .fg-search {
          margin-bottom: 10px;
        }

        .fg-type-grid {
          display: grid;
          grid-template-columns:
            repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .fg-type {
          position: relative;
          min-height: 142px;
          padding: 14px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 11px;
          background: var(--color-blanc);
          cursor: pointer;
          transition:
            border-color .16s ease,
            background .16s ease,
            transform .16s ease;
        }

        .fg-type:hover {
          transform: translateY(-1px);
        }

        .fg-type.is-active {
          border-color: var(--color-terra);
          background: rgba(196,98,58,.045);
        }

        .fg-type input {
          position: absolute;
          opacity: 0;
          pointer-events: none;
        }

        .fg-type strong {
          display: block;
          font-size: 11.5px;
          font-weight: 760;
        }

        .fg-type span {
          display: block;
          margin-top: 6px;
          color: var(--color-gris-moyen);
          font-size: 9.5px;
          line-height: 1.5;
        }

        .fg-command-card {
          padding: 15px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 11px;
          background: var(--color-ivoire);
        }

        .fg-command-card span {
          display: block;
          color: var(--color-gris-moyen);
          font-size: 9px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .fg-command-card strong {
          display: block;
          margin-top: 5px;
          font-size: 14px;
        }

        .fg-command-card p {
          margin: 6px 0 0;
          color: var(--color-gris-moyen);
          font-size: 10px;
          line-height: 1.5;
        }

        .fg-summary {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .fg-summary-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 9px;
          border-bottom: 1px solid var(--color-border, rgba(0,0,0,.07));
          font-size: 10.5px;
        }

        .fg-summary-row span:first-child {
          color: var(--color-gris-moyen);
        }

        .fg-summary-row strong {
          text-align: right;
        }

        .fg-submit {
          width: 100%;
          min-height: 44px;
        }

        @media (max-width: 900px) {
          .fg-layout {
            grid-template-columns: 1fr;
          }

          .fg-sidebar {
            position: static;
          }
        }

        @media (max-width: 680px) {
          .fg-type-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <form
        className="fg-page"
        onSubmit={handleSubmit}
      >
        <header className="fg-header">
          <div>
            <Link
              to="/admin/finance/factures"
              className="fg-back"
            >
              ← Retour aux factures
            </Link>

            <h1 className="fg-title">
              Générer une facture
            </h1>

            <p className="fg-subtitle">
              Sélectionnez la commande source puis choisissez le type de document à générer.
            </p>
          </div>
        </header>

        <div className="fg-layout">
          <main className="fg-main">
            <section className="fg-card">
              <div className="fg-card-head">
                <small>
                  Commande
                </small>

                <h2>
                  Commande source
                </h2>

                <p>
                  La facture est générée à partir d’une commande existante.
                </p>
              </div>

              <div className="fg-field">
                <label htmlFor="commande-search">
                  Rechercher une commande
                </label>

                <input
                  id="commande-search"
                  type="search"
                  className="form-input fg-search"
                  value={recherche}
                  onChange={(
                    event,
                  ) =>
                    setRecherche(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Numéro, client ou statut..."
                />

                <select
                  className="form-input"
                  required
                  disabled={loading}
                  value={commandeId}
                  onChange={(
                    event,
                  ) =>
                    setCommandeId(
                      event.target
                        .value,
                    )
                  }
                >
                  <option value="">
                    {loading
                      ? 'Chargement des commandes...'
                      : 'Sélectionner une commande'}
                  </option>

                  {filteredCommandes.map(
                    (commande) => (
                      <option
                        key={
                          commande.id
                        }
                        value={
                          commande.id
                        }
                      >
                        {commande.numero}
                        {' — '}
                        {clientName(
                          commande,
                        )}
                        {commande.montant_ttc !==
                          undefined &&
                        commande.montant_ttc !==
                          null
                          ? ` — ${formatMoney(
                              commande.montant_ttc,
                            )}`
                          : ''}
                      </option>
                    ),
                  )}
                </select>
              </div>
            </section>

            <section className="fg-card">
              <div className="fg-card-head">
                <small>
                  Document
                </small>

                <h2>
                  Type de facture
                </h2>

                <p>
                  Le contrôleur autorise uniquement proforma, acompte et définitive.
                </p>
              </div>

              <div className="fg-type-grid">
                {TYPE_OPTIONS.map(
                  (option) => (
                    <label
                      key={
                        option.value
                      }
                      className={`fg-type ${
                        type ===
                        option.value
                          ? 'is-active'
                          : ''
                      }`}
                    >
                      <input
                        type="radio"
                        name="facture-type"
                        value={
                          option.value
                        }
                        checked={
                          type ===
                          option.value
                        }
                        onChange={() =>
                          setType(
                            option.value,
                          )
                        }
                      />

                      <strong>
                        {option.label}
                      </strong>

                      <span>
                        {option.description}
                      </span>
                    </label>
                  ),
                )}
              </div>
            </section>

            <section className="fg-card">
              <div className="fg-card-head">
                <small>
                  Montant
                </small>

                <h2>
                  Montant personnalisé
                </h2>

                <p>
                  Le montant est facultatif. Laissez ce champ vide pour laisser `FactureService` déterminer le montant selon la commande et le type de facture.
                </p>
              </div>

              <div className="fg-field">
                <label htmlFor="facture-montant">
                  Montant (FCFA)
                </label>

                <input
                  id="facture-montant"
                  type="number"
                  min={1}
                  step={1}
                  className="form-input"
                  value={montant}
                  onChange={(
                    event,
                  ) =>
                    setMontant(
                      event.target
                        .value,
                    )
                  }
                  placeholder="Facultatif"
                />

                <div className="fg-help">
                  Le backend exige un entier supérieur ou égal à 1 uniquement lorsqu’un montant est fourni.
                </div>
              </div>
            </section>
          </main>

          <aside className="fg-sidebar">
            <section className="fg-card">
              <div className="fg-card-head">
                <small>
                  Récapitulatif
                </small>

                <h2>
                  Génération
                </h2>
              </div>

              {selectedCommande ? (
                <div className="fg-command-card">
                  <span>
                    Commande sélectionnée
                  </span>

                  <strong>
                    {
                      selectedCommande.numero
                    }
                  </strong>

                  <p>
                    {clientName(
                      selectedCommande,
                    )}
                    {selectedCommande.statut
                      ? ` · ${selectedCommande.statut}`
                      : ''}
                  </p>
                </div>
              ) : (
                <div className="fg-command-card">
                  <span>
                    Commande
                  </span>

                  <strong>
                    Non sélectionnée
                  </strong>

                  <p>
                    Choisissez une commande pour continuer.
                  </p>
                </div>
              )}

              <div
                className="fg-summary"
                style={{
                  marginTop: 16,
                }}
              >
                <div className="fg-summary-row">
                  <span>
                    Type
                  </span>

                  <strong>
                    {
                      TYPE_OPTIONS.find(
                        (option) =>
                          option.value ===
                          type,
                      )?.label
                    }
                  </strong>
                </div>

                <div className="fg-summary-row">
                  <span>
                    Montant
                  </span>

                  <strong>
                    {montant
                      ? formatMoney(
                          Number(
                            montant,
                          ),
                        )
                      : 'Calcul automatique'}
                  </strong>
                </div>
              </div>
            </section>

            <section className="fg-card">
              <button
                type="submit"
                className="btn btn-primary fg-submit"
                disabled={
                  saving ||
                  !commandeId
                }
              >
                {saving
                  ? 'Génération...'
                  : 'Générer la facture'}
              </button>

              <div
                className="fg-help"
                style={{
                  marginTop: 10,
                }}
              >
                Après génération, vous serez redirigé vers la fiche de la facture créée.
              </div>
            </section>
          </aside>
        </div>
      </form>
    </>
  );
}
