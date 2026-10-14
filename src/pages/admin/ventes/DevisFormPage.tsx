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
  adminDevisApi,
  type AdminDevis,
  type ClientLookup,
  type DevisLigne,
  type SaveDevisPayload,
  type VarianteLookup,
} from '../../../api/adminDevis';

type LineDraft = {
  id: string;
  variante_id: string;
  designation: string;
  quantite: string;
  prix_unitaire: string;
};

type FormState = {
  client_id: string;
  date_validite: string;
  remise: string;
  notes: string;
};

type ValidationErrors =
  Record<string, string[]>;

const INITIAL_FORM: FormState = {
  client_id: '',
  date_validite: '',
  remise: '0',
  notes: '',
};

function makeLine(
  source?: Partial<DevisLigne>,
): LineDraft {
  return {
    id:
      source?.id !== undefined
        ? `existing:${source.id}`
        : `new:${Date.now()}:${Math.random()
            .toString(36)
            .slice(2)}`,
    variante_id:
      source?.variante_id
        ? String(source.variante_id)
        : '',
    designation:
      source?.designation ?? '',
    quantite:
      String(source?.quantite ?? 1),
    prix_unitaire:
      String(source?.prix_unitaire ?? 0),
  };
}

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
    const first = Object.values(
      data.errors,
    )
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

function getValidationErrors(
  error: unknown,
): ValidationErrors {
  if (!axios.isAxiosError(error)) {
    return {};
  }

  const errors =
    error.response?.data?.errors;

  if (
    !errors ||
    typeof errors !==
      'object'
  ) {
    return {};
  }

  return errors as ValidationErrors;
}

function getItems<T>(
  payload: any,
): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (
    Array.isArray(payload?.data)
  ) {
    return payload.data;
  }

  return [];
}

function clientName(
  client: ClientLookup,
): string {
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

  return (
    fullName ||
    `Client #${client.id}`
  );
}

function formatMoney(
  value: number,
): string {
  return `${new Intl.NumberFormat(
    'fr-FR',
  ).format(
    Math.round(value),
  )} FCFA`;
}

function statutLabel(
  value?: string | null,
): string {
  const labels: Record<
    string,
    string
  > = {
    brouillon: 'Brouillon',
    envoye: 'Envoyé',
    accepte: 'Accepté',
    refuse: 'Refusé',
    expire: 'Expiré',
    converti: 'Converti',
  };

  return value
    ? labels[value] ?? value
    : 'Brouillon';
}

function statutClass(
  value?: string | null,
): string {
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

function defaultValidityDate(): string {
  const date = new Date();
  date.setDate(
    date.getDate() + 30,
  );

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');

  const day = String(
    date.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function tomorrowDate(): string {
  const date = new Date();
  date.setDate(
    date.getDate() + 1,
  );

  const year =
    date.getFullYear();

  const month = String(
    date.getMonth() + 1,
  ).padStart(2, '0');

  const day = String(
    date.getDate(),
  ).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function FieldError({
  errors,
}: {
  errors?: string[];
}) {
  if (!errors?.length) {
    return null;
  }

  return (
    <div className="qf-field-error">
      {errors[0]}
    </div>
  );
}

export default function DevisFormPage() {
  const { id } =
    useParams<{ id: string }>();

  const navigate =
    useNavigate();

  const devisId =
    id ? Number(id) : null;

  const isEditing =
    devisId !== null &&
    Number.isFinite(devisId);

  const [form, setForm] =
    useState<FormState>({
      ...INITIAL_FORM,
      date_validite:
        defaultValidityDate(),
    });

  const [lines, setLines] =
    useState<LineDraft[]>([
      makeLine(),
    ]);

  const [devis, setDevis] =
    useState<AdminDevis | null>(
      null,
    );

  const [clients, setClients] =
    useState<ClientLookup[]>([]);

  const [
    variants,
    setVariants,
  ] = useState<
    VarianteLookup[]
  >([]);

  const [
    clientsLookupAvailable,
    setClientsLookupAvailable,
  ] = useState(true);

  const [
    variantsLookupAvailable,
    setVariantsLookupAvailable,
  ] = useState(true);

  const [tvaRate, setTvaRate] =
    useState(18);

  const [loading, setLoading] =
    useState(true);

  const [saving, setSaving] =
    useState(false);

  const [
    validationErrors,
    setValidationErrors,
  ] =
    useState<ValidationErrors>({});

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      try {
        const requiredRequests:
          Promise<any>[] = [];

        if (
          isEditing &&
          devisId !== null
        ) {
          requiredRequests.push(
            adminDevisApi.devisDetail(
              devisId,
            ),
          );
        }

        const required =
          await Promise.all(
            requiredRequests,
          );

        if (!mounted) {
          return;
        }

        if (
          isEditing &&
          required[0]
        ) {
          const loaded =
            required[0]
              .data as AdminDevis;

          setDevis(loaded);

          setForm({
            client_id:
              String(
                loaded.client_id,
              ),
            date_validite:
              loaded.date_validite ??
              '',
            remise:
              String(
                loaded.remise ??
                  0,
              ),
            notes:
              loaded.notes ?? '',
          });

          setLines(
            loaded.lignes
              ?.length
              ? loaded.lignes.map(
                  (line) =>
                    makeLine(line),
                )
              : [makeLine()],
          );
        }

        const [
          clientResult,
          variantResult,
          parameterResult,
        ] =
          await Promise.allSettled(
            [
              adminDevisApi.clients(
                {
                  per_page:
                    300,
                },
              ),
              adminDevisApi.variantes(
                {
                  per_page:
                    300,
                },
              ),
              adminDevisApi.parametres(),
            ],
          );

        if (!mounted) {
          return;
        }

        if (
          clientResult.status ===
          'fulfilled'
        ) {
          setClients(
            getItems<ClientLookup>(
              clientResult.value
                .data,
            ),
          );
        } else {
          setClientsLookupAvailable(
            false,
          );
        }

        if (
          variantResult.status ===
          'fulfilled'
        ) {
          setVariants(
            getItems<VarianteLookup>(
              variantResult.value
                .data,
            ),
          );
        } else {
          setVariantsLookupAvailable(
            false,
          );
        }

        if (
          parameterResult.status ===
          'fulfilled'
        ) {
          const raw =
            parameterResult.value
              .data?.tva_taux;

          const numeric =
            Number(raw);

          if (
            Number.isFinite(
              numeric,
            )
          ) {
            setTvaRate(
              numeric,
            );
          }
        }
      } catch (error) {
        toast.error(
          getApiErrorMessage(
            error,
            isEditing
              ? 'Impossible de charger le devis.'
              : 'Impossible de préparer le formulaire.',
          ),
        );

        if (isEditing) {
          navigate(
            '/admin/ventes/devis',
            {
              replace: true,
            },
          );
        }
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
  }, [
    isEditing,
    devisId,
    navigate,
  ]);

  const editable =
    !isEditing ||
    ['brouillon', 'envoye'].includes(
      devis?.statut ?? '',
    );

  const canSend =
    isEditing &&
    devis?.statut ===
      'brouillon';

  const canDelete =
    isEditing &&
    devis?.statut ===
      'brouillon';

  const subtotal =
    useMemo(
      () =>
        lines.reduce(
          (
            total,
            line,
          ) => {
            const qty =
              Number(
                line.quantite,
              );

            const price =
              Number(
                line.prix_unitaire,
              );

            if (
              !Number.isFinite(
                qty,
              ) ||
              !Number.isFinite(
                price,
              )
            ) {
              return total;
            }

            return (
              total +
              qty * price
            );
          },
          0,
        ),
      [lines],
    );

  const discount =
    useMemo(() => {
      const value =
        Number(
          form.remise ||
            0,
        );

      if (
        !Number.isFinite(
          value,
        )
      ) {
        return 0;
      }

      return Math.max(
        0,
        value,
      );
    }, [form.remise]);

  const totalTtc =
    Math.max(
      0,
      subtotal - discount,
    );

  const estimatedHt =
    Math.round(
      totalTtc /
        (1 + tvaRate / 100),
    );

  const estimatedTva =
    totalTtc - estimatedHt;

  function updateField<
    K extends keyof FormState,
  >(
    field: K,
    value: FormState[K],
  ) {
    setForm(
      (current) => ({
        ...current,
        [field]: value,
      }),
    );

    setValidationErrors(
      (current) => {
        if (
          !current[field]
        ) {
          return current;
        }

        const next = {
          ...current,
        };

        delete next[field];

        return next;
      },
    );
  }

  function updateLine(
    id: string,
    field:
      keyof Omit<
        LineDraft,
        'id'
      >,
    value: string,
  ) {
    setLines(
      (current) =>
        current.map(
          (line) =>
            line.id === id
              ? {
                  ...line,
                  [field]:
                    value,
                }
              : line,
        ),
    );
  }

  function addLine() {
    setLines(
      (current) => [
        ...current,
        makeLine(),
      ],
    );
  }

  function removeLine(
    id: string,
  ) {
    setLines(
      (current) => {
        const next =
          current.filter(
            (line) =>
              line.id !== id,
          );

        return next.length
          ? next
          : [makeLine()];
      },
    );
  }

  function handleVariantChange(
    lineId: string,
    value: string,
  ) {
    const selected =
      variants.find(
        (variant) =>
          String(
            variant.id,
          ) === value,
      );

    setLines(
      (current) =>
        current.map(
          (line) => {
            if (
              line.id !==
              lineId
            ) {
              return line;
            }

            if (!selected) {
              return {
                ...line,
                variante_id:
                  value,
              };
            }

            const price =
              selected.prix_promo ??
              selected.prix_vente ??
              Number(
                line.prix_unitaire ||
                  0,
              );

            return {
              ...line,
              variante_id:
                String(
                  selected.id,
                ),
              designation:
                selected.produit
                  ?.nom ??
                line.designation,
              prix_unitaire:
                String(price),
            };
          },
        ),
    );
  }

  function buildPayload():
    | SaveDevisPayload
    | null {
    const errors:
      ValidationErrors = {};

    const clientId =
      Number(
        form.client_id,
      );

    if (
      !form.client_id ||
      !Number.isInteger(
        clientId,
      ) ||
      clientId <= 0
    ) {
      errors.client_id = [
        'Sélectionnez un client valide.',
      ];
    }

    if (
      form.date_validite &&
      form.date_validite <=
        new Date()
          .toISOString()
          .slice(0, 10)
    ) {
      errors.date_validite =
        [
          'La date de validité doit être postérieure à aujourd’hui.',
        ];
    }

    const remise =
      form.remise.trim() ===
      ''
        ? 0
        : Number(
            form.remise,
          );

    if (
      !Number.isInteger(
        remise,
      ) ||
      remise < 0
    ) {
      errors.remise = [
        'La remise doit être un montant entier positif ou nul.',
      ];
    }

    const cleanLines:
      SaveDevisPayload['lignes'] =
      [];

    lines.forEach(
      (line, index) => {
        const designation =
          line.designation.trim();

        const qty =
          Number(
            line.quantite,
          );

        const price =
          Number(
            line.prix_unitaire,
          );

        if (!designation) {
          errors[
            `lignes.${index}.designation`
          ] = [
            'La désignation est obligatoire.',
          ];
        }

        if (
          !Number.isInteger(
            qty,
          ) ||
          qty < 1
        ) {
          errors[
            `lignes.${index}.quantite`
          ] = [
            'La quantité doit être au moins égale à 1.',
          ];
        }

        if (
          !Number.isInteger(
            price,
          ) ||
          price < 0
        ) {
          errors[
            `lignes.${index}.prix_unitaire`
          ] = [
            'Le prix unitaire doit être un entier positif ou nul.',
          ];
        }

        cleanLines.push({
          variante_id:
            line.variante_id
              ? Number(
                  line.variante_id,
                )
              : null,
          designation,
          quantite:
            Number.isInteger(
              qty,
            )
              ? qty
              : 1,
          prix_unitaire:
            Number.isInteger(
              price,
            )
              ? price
              : 0,
        });
      },
    );

    setValidationErrors(
      errors,
    );

    if (
      Object.keys(errors)
        .length > 0
    ) {
      return null;
    }

    return {
      client_id:
        clientId,
      date_validite:
        form.date_validite ||
        null,
      remise,
      notes:
        form.notes.trim() ||
        null,
      lignes:
        cleanLines,
    };
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (!editable) {
      toast.error(
        'Ce devis ne peut plus être modifié.',
      );
      return;
    }

    const payload =
      buildPayload();

    if (!payload) {
      toast.error(
        'Vérifiez les informations du devis.',
      );
      return;
    }

    setSaving(true);

    try {
      if (
        isEditing &&
        devisId !== null
      ) {
        const response =
          await adminDevisApi.updateDevis(
            devisId,
            payload,
          );

        const fresh =
          await adminDevisApi.devisDetail(
            devisId,
          );

        setDevis(
          fresh.data,
        );

        setLines(
          fresh.data.lignes
            ?.length
            ? fresh.data.lignes.map(
                (line) =>
                  makeLine(line),
              )
            : response.data
                .lignes?.map(
                  (line) =>
                    makeLine(line),
                ) ??
              [makeLine()],
        );

        toast.success(
          'Devis mis à jour.',
        );
      } else {
        const response =
          await adminDevisApi.createDevis(
            payload,
          );

        toast.success(
          'Devis créé avec succès.',
        );

        navigate(
          `/admin/ventes/devis/${response.data.id}/modifier`,
          {
            replace: true,
          },
        );
      }
    } catch (error) {
      setValidationErrors(
        getValidationErrors(
          error,
        ),
      );

      toast.error(
        getApiErrorMessage(
          error,
          isEditing
            ? 'Impossible de modifier le devis.'
            : 'Impossible de créer le devis.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleSend() {
    if (
      !isEditing ||
      devisId === null
    ) {
      return;
    }

    if (
      !window.confirm(
        `Envoyer le devis ${devis?.numero ?? ''} au client ?`,
      )
    ) {
      return;
    }

    setSaving(true);

    try {
      const response =
        await adminDevisApi.envoyerDevis(
          devisId,
        );

      setDevis(
        (current) => ({
          ...(current ??
            ({} as AdminDevis)),
          ...response.data
            .devis,
          statut:
            'envoye',
        }),
      );

      toast.success(
        response.data
          .message ??
          'Devis envoyé.',
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible d’envoyer le devis.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (
      !isEditing ||
      devisId === null
    ) {
      return;
    }

    if (
      !window.confirm(
        `Supprimer le devis ${devis?.numero ?? ''} ?`,
      )
    ) {
      return;
    }

    setSaving(true);

    try {
      const response =
        await adminDevisApi.deleteDevis(
          devisId,
        );

      toast.success(
        response.data
          ?.message ??
          'Devis supprimé.',
      );

      navigate(
        '/admin/ventes/devis',
        {
          replace: true,
        },
      );
    } catch (error) {
      toast.error(
        getApiErrorMessage(
          error,
          'Impossible de supprimer le devis.',
        ),
      );
    } finally {
      setSaving(false);
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

  return (
    <>
      <style>{`
        .qf-page {
          max-width: 1420px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .qf-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          flex-wrap: wrap;
        }

        .qf-back {
          display: inline-block;
          margin-bottom: 7px;
          color: var(--color-gris-moyen);
          font-size: var(--text-sm);
          text-decoration: none;
        }

        .qf-title {
          margin: 0;
          font-family: var(--font-display);
          font-size: var(--text-2xl);
          font-weight: 760;
          letter-spacing: -.02em;
        }

        .qf-subtitle {
          max-width: 720px;
          margin: 5px 0 0;
          color: var(--color-gris-moyen);
          font-size: var(--text-sm);
          line-height: 1.55;
        }

        .qf-header-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .qf-layout {
          display: grid;
          grid-template-columns:
            minmax(0, 1fr)
            330px;
          gap: 20px;
          align-items: start;
        }

        .qf-main,
        .qf-sidebar {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .qf-sidebar {
          position: sticky;
          top: 18px;
        }

        .qf-card {
          padding: 22px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 14px;
          background: var(--color-blanc);
        }

        .qf-card-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 12px;
          margin-bottom: 18px;
          padding-bottom: 15px;
          border-bottom: 1px solid var(--color-border, rgba(0,0,0,.08));
        }

        .qf-card-head small {
          display: block;
          margin-bottom: 5px;
          color: var(--color-terra);
          font-size: 9.5px;
          font-weight: 800;
          letter-spacing: .10em;
          text-transform: uppercase;
        }

        .qf-card-head h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 760;
        }

        .qf-card-head p {
          max-width: 680px;
          margin: 5px 0 0;
          color: var(--color-gris-moyen);
          font-size: 10.5px;
          line-height: 1.55;
        }

        .qf-grid {
          display: grid;
          grid-template-columns:
            repeat(2, minmax(0, 1fr));
          gap: 16px 18px;
        }

        .qf-field {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .qf-field--full {
          grid-column: 1 / -1;
        }

        .qf-field .form-label {
          margin-bottom: 6px;
          font-size: 11.5px;
          font-weight: 720;
        }

        .qf-required {
          margin-left: 2px;
          color: var(--color-error);
        }

        .qf-help {
          margin-top: 6px;
          color: var(--color-gris-moyen);
          font-size: 9.5px;
          line-height: 1.45;
        }

        .qf-field-error {
          margin-top: 6px;
          color: var(--color-error);
          font-size: 10.5px;
          font-weight: 650;
        }

        .qf-textarea {
          min-height: 108px;
          resize: vertical;
          line-height: 1.55;
        }

        .qf-locked {
          padding: 12px 14px;
          border: 1px solid rgba(190,40,40,.12);
          border-radius: 10px;
          background: rgba(190,40,40,.035);
          color: var(--color-gris-moyen);
          font-size: 10.5px;
          line-height: 1.5;
        }

        .qf-lines {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .qf-line {
          display: grid;
          grid-template-columns:
            48px
            minmax(150px, .9fr)
            minmax(220px, 1.5fr)
            90px
            140px
            145px
            38px;
          gap: 10px;
          align-items: end;
          padding: 13px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 12px;
          background: var(--color-blanc);
        }

        .qf-line-number {
          align-self: center;
          min-height: 36px;
          display: grid;
          place-items: center;
          border-radius: 9px;
          background: var(--color-ivoire);
          color: var(--color-gris-moyen);
          font-size: 10px;
          font-weight: 800;
        }

        .qf-line label {
          display: block;
          margin-bottom: 5px;
          font-size: 9.5px;
          font-weight: 700;
        }

        .qf-line-total {
          min-height: 42px;
          display: flex;
          align-items: center;
          padding: 0 10px;
          border-radius: 9px;
          background: var(--color-ivoire);
          font-size: 10.5px;
          font-weight: 760;
          white-space: nowrap;
        }

        .qf-remove {
          width: 36px;
          height: 36px;
          padding: 0 !important;
          color: var(--color-error);
          font-size: 17px;
        }

        .qf-summary {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .qf-summary-row {
          display: flex;
          justify-content: space-between;
          gap: 12px;
          padding-bottom: 9px;
          border-bottom: 1px solid var(--color-border, rgba(0,0,0,.07));
          font-size: 10.5px;
        }

        .qf-summary-row span:first-child {
          color: var(--color-gris-moyen);
        }

        .qf-summary-row strong {
          text-align: right;
        }

        .qf-summary-row--total {
          padding-top: 4px;
          border-bottom: 0;
          font-size: 13px;
        }

        .qf-summary-row--total strong {
          color: var(--color-terra);
          font-size: 16px;
        }

        .qf-status-box {
          text-align: center;
        }

        .qf-number {
          font-family: var(--font-display);
          font-size: 18px;
          font-weight: 760;
        }

        .qf-status-box p {
          margin: 5px 0 12px;
          color: var(--color-gris-moyen);
          font-size: 10px;
        }

        .qf-order {
          margin-top: 15px;
          padding: 12px;
          border: 1px solid var(--color-border, rgba(0,0,0,.08));
          border-radius: 10px;
          background: var(--color-ivoire);
          text-align: left;
        }

        .qf-order span {
          display: block;
          color: var(--color-gris-moyen);
          font-size: 9px;
          text-transform: uppercase;
          font-weight: 700;
        }

        .qf-order strong {
          display: block;
          margin-top: 4px;
          font-size: 11px;
        }

        .qf-danger {
          border-color: rgba(190,40,40,.16);
        }

        .qf-danger p {
          color: var(--color-gris-moyen);
          font-size: 10.5px;
          line-height: 1.55;
        }

        @media (max-width: 1180px) {
          .qf-line {
            grid-template-columns:
              42px
              minmax(140px, 1fr)
              minmax(190px, 1.4fr)
              90px
              130px;
          }

          .qf-line > :nth-child(6) {
            grid-column: 2 / 5;
          }

          .qf-line > :nth-child(7) {
            grid-column: 5;
          }
        }

        @media (max-width: 960px) {
          .qf-layout {
            grid-template-columns: 1fr;
          }

          .qf-sidebar {
            position: static;
          }
        }

        @media (max-width: 700px) {
          .qf-grid,
          .qf-line {
            grid-template-columns: 1fr;
          }

          .qf-field--full,
          .qf-line > :nth-child(n) {
            grid-column: 1;
          }

          .qf-header-actions {
            width: 100%;
          }

          .qf-header-actions .btn {
            flex: 1;
          }

          .qf-line-number {
            width: 36px;
          }

          .qf-remove {
            width: 100%;
          }
        }
      `}</style>

      <form
        onSubmit={handleSubmit}
        className="qf-page"
      >
        <header className="qf-header">
          <div>
            <Link
              to="/admin/ventes/devis"
              className="qf-back"
            >
              ← Retour aux devis
            </Link>

            <h1 className="qf-title">
              {isEditing
                ? `Devis ${devis?.numero ?? ''}`
                : 'Nouveau devis'}
            </h1>

            <p className="qf-subtitle">
              {isEditing
                ? 'Mettez à jour les informations commerciales et les lignes du devis tant que son statut le permet.'
                : 'Établissez un devis en sélectionnant le client, puis ajoutez les articles ou prestations à facturer.'}
            </p>
          </div>

          <div className="qf-header-actions">
            {canSend && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={saving}
                onClick={handleSend}
              >
                Envoyer au client
              </button>
            )}

            {editable && (
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving
                  ? 'Enregistrement...'
                  : isEditing
                    ? 'Enregistrer'
                    : 'Créer le devis'}
              </button>
            )}
          </div>
        </header>

        {!editable && (
          <div className="qf-locked">
            Ce devis est en statut « {statutLabel(devis?.statut)} » et ne peut plus être modifié par le contrôleur actuel.
          </div>
        )}

        <div className="qf-layout">
          <main className="qf-main">
            <section className="qf-card">
              <div className="qf-card-head">
                <div>
                  <small>Client & validité</small>
                  <h2>Informations générales</h2>
                  <p>
                    Le client est obligatoire. La date de validité doit être postérieure à aujourd’hui.
                  </p>
                </div>
              </div>

              <div className="qf-grid">
                <div className="qf-field">
                  <label
                    className="form-label"
                    htmlFor="devis-client"
                  >
                    Client
                    <span className="qf-required">*</span>
                  </label>

                  {clientsLookupAvailable && clients.length > 0 ? (
                    <select
                      id="devis-client"
                      className="form-input"
                      disabled={!editable}
                      required
                      value={form.client_id}
                      onChange={(event) =>
                        updateField(
                          'client_id',
                          event.target.value,
                        )
                      }
                    >
                      <option value="">
                        Sélectionner un client
                      </option>

                      {clients.map((client) => (
                        <option
                          key={client.id}
                          value={client.id}
                        >
                          {clientName(client)}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="devis-client"
                      type="number"
                      min={1}
                      className="form-input"
                      disabled={!editable}
                      required
                      value={form.client_id}
                      onChange={(event) =>
                        updateField(
                          'client_id',
                          event.target.value,
                        )
                      }
                      placeholder="ID du client"
                    />
                  )}

                  {!clientsLookupAvailable && (
                    <div className="qf-help">
                      L’endpoint de liste des clients n’est pas disponible : saisissez directement l’ID du client.
                    </div>
                  )}

                  <FieldError
                    errors={validationErrors.client_id}
                  />
                </div>

                <div className="qf-field">
                  <label
                    className="form-label"
                    htmlFor="devis-validite"
                  >
                    Date de validité
                  </label>

                  <input
                    id="devis-validite"
                    type="date"
                    min={tomorrowDate()}
                    className="form-input"
                    disabled={!editable}
                    value={form.date_validite}
                    onChange={(event) =>
                      updateField(
                        'date_validite',
                        event.target.value,
                      )
                    }
                  />

                  <div className="qf-help">
                    Si aucune date n’est fournie au backend, il applique 30 jours par défaut.
                  </div>

                  <FieldError
                    errors={validationErrors.date_validite}
                  />
                </div>

                <div className="qf-field">
                  <label
                    className="form-label"
                    htmlFor="devis-remise"
                  >
                    Remise globale (FCFA)
                  </label>

                  <input
                    id="devis-remise"
                    type="number"
                    min={0}
                    step={1}
                    className="form-input"
                    disabled={!editable}
                    value={form.remise}
                    onChange={(event) =>
                      updateField(
                        'remise',
                        event.target.value,
                      )
                    }
                  />

                  <FieldError
                    errors={validationErrors.remise}
                  />
                </div>

                <div className="qf-field qf-field--full">
                  <label
                    className="form-label"
                    htmlFor="devis-notes"
                  >
                    Notes
                  </label>

                  <textarea
                    id="devis-notes"
                    className="form-input qf-textarea"
                    disabled={!editable}
                    value={form.notes}
                    onChange={(event) =>
                      updateField(
                        'notes',
                        event.target.value,
                      )
                    }
                    placeholder="Conditions particulières, informations complémentaires..."
                  />

                  <FieldError
                    errors={validationErrors.notes}
                  />
                </div>
              </div>
            </section>

            <section className="qf-card">
              <div className="qf-card-head">
                <div>
                  <small>Lignes du devis</small>
                  <h2>Articles et prestations</h2>
                  <p>
                    Ajoutez au moins une ligne. La liaison à une variante est facultative ; la désignation, la quantité et le prix restent obligatoires.
                  </p>
                </div>

                {editable && (
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={addLine}
                  >
                    + Ajouter une ligne
                  </button>
                )}
              </div>

              <div className="qf-lines">
                {lines.map((line, index) => {
                  const quantity =
                    Number(line.quantite || 0);

                  const price =
                    Number(line.prix_unitaire || 0);

                  const amount =
                    Number.isFinite(quantity) &&
                    Number.isFinite(price)
                      ? quantity * price
                      : 0;

                  return (
                    <div
                      className="qf-line"
                      key={line.id}
                    >
                      <div className="qf-line-number">
                        {index + 1}
                      </div>

                      <div>
                        <label>Variante</label>

                        {variantsLookupAvailable && variants.length > 0 ? (
                          <select
                            className="form-input"
                            disabled={!editable}
                            value={line.variante_id}
                            onChange={(event) =>
                              handleVariantChange(
                                line.id,
                                event.target.value,
                              )
                            }
                          >
                            <option value="">
                              Sans variante
                            </option>

                            {variants.map((variant) => (
                              <option
                                key={variant.id}
                                value={variant.id}
                              >
                                {variant.produit?.nom ??
                                  `Variante #${variant.id}`}
                                {' · '}
                                {formatMoney(
                                  Number(
                                    variant.prix_promo ??
                                      variant.prix_vente ??
                                      0,
                                  ),
                                )}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            type="number"
                            min={1}
                            className="form-input"
                            disabled={!editable}
                            value={line.variante_id}
                            onChange={(event) =>
                              updateLine(
                                line.id,
                                'variante_id',
                                event.target.value,
                              )
                            }
                            placeholder="Optionnel"
                          />
                        )}
                      </div>

                      <div>
                        <label>
                          Désignation
                          <span className="qf-required">*</span>
                        </label>

                        <input
                          className="form-input"
                          maxLength={255}
                          disabled={!editable}
                          value={line.designation}
                          onChange={(event) =>
                            updateLine(
                              line.id,
                              'designation',
                              event.target.value,
                            )
                          }
                          placeholder="Produit ou prestation"
                        />

                        <FieldError
                          errors={
                            validationErrors[
                              `lignes.${index}.designation`
                            ]
                          }
                        />
                      </div>

                      <div>
                        <label>
                          Qté
                          <span className="qf-required">*</span>
                        </label>

                        <input
                          type="number"
                          min={1}
                          step={1}
                          className="form-input"
                          disabled={!editable}
                          value={line.quantite}
                          onChange={(event) =>
                            updateLine(
                              line.id,
                              'quantite',
                              event.target.value,
                            )
                          }
                        />

                        <FieldError
                          errors={
                            validationErrors[
                              `lignes.${index}.quantite`
                            ]
                          }
                        />
                      </div>

                      <div>
                        <label>
                          Prix unitaire
                          <span className="qf-required">*</span>
                        </label>

                        <input
                          type="number"
                          min={0}
                          step={1}
                          className="form-input"
                          disabled={!editable}
                          value={line.prix_unitaire}
                          onChange={(event) =>
                            updateLine(
                              line.id,
                              'prix_unitaire',
                              event.target.value,
                            )
                          }
                        />

                        <FieldError
                          errors={
                            validationErrors[
                              `lignes.${index}.prix_unitaire`
                            ]
                          }
                        />
                      </div>

                      <div>
                        <label>Montant</label>
                        <div className="qf-line-total">
                          {formatMoney(amount)}
                        </div>
                      </div>

                      {editable ? (
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm qf-remove"
                          onClick={() =>
                            removeLine(line.id)
                          }
                          aria-label={`Supprimer la ligne ${index + 1}`}
                        >
                          ×
                        </button>
                      ) : (
                        <span />
                      )}
                    </div>
                  );
                })}
              </div>

              <FieldError
                errors={validationErrors.lignes}
              />
            </section>
          </main>

          <aside className="qf-sidebar">
            <section className="qf-card qf-status-box">
              <div className="qf-number">
                {devis?.numero ?? 'Nouveau devis'}
              </div>

              <p>
                {devis?.user?.name
                  ? `Établi par ${devis.user.name}`
                  : 'Devis commercial'}
              </p>

              <span
                className={`badge ${statutClass(
                  devis?.statut ?? 'brouillon',
                )}`}
              >
                {statutLabel(
                  devis?.statut ?? 'brouillon',
                )}
              </span>

              {devis?.commande && (
                <div className="qf-order">
                  <span>Commande liée</span>
                  <strong>
                    {devis.commande.numero} · {devis.commande.statut}
                  </strong>
                </div>
              )}
            </section>

            <section className="qf-card">
              <div className="qf-card-head">
                <div>
                  <small>Totaux</small>
                  <h2>Récapitulatif</h2>
                </div>
              </div>

              <div className="qf-summary">
                <div className="qf-summary-row">
                  <span>Sous-total des lignes</span>
                  <strong>{formatMoney(subtotal)}</strong>
                </div>

                <div className="qf-summary-row">
                  <span>Remise</span>
                  <strong>- {formatMoney(discount)}</strong>
                </div>

                <div className="qf-summary-row">
                  <span>HT estimé</span>
                  <strong>{formatMoney(estimatedHt)}</strong>
                </div>

                <div className="qf-summary-row">
                  <span>TVA ({tvaRate} %)</span>
                  <strong>{formatMoney(estimatedTva)}</strong>
                </div>

                <div className="qf-summary-row qf-summary-row--total">
                  <span>Total TTC</span>
                  <strong>{formatMoney(totalTtc)}</strong>
                </div>
              </div>

              <div className="qf-help" style={{ marginTop: 12 }}>
                Le calcul affiché est une prévisualisation. Le backend recalcule et enregistre les montants lors de la sauvegarde.
              </div>
            </section>

            {canDelete && (
              <section className="qf-card qf-danger">
                <div className="qf-card-head">
                  <div>
                    <small>Attention</small>
                    <h2>Suppression</h2>
                  </div>
                </div>

                <p>
                  Seul un devis en brouillon peut être supprimé.
                </p>

                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={saving}
                  onClick={handleDelete}
                  style={{
                    width: '100%',
                    color: 'var(--color-error)',
                  }}
                >
                  Supprimer le devis
                </button>
              </section>
            )}
          </aside>
        </div>
      </form>
    </>
  );
}
