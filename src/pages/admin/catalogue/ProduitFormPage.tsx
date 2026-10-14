import React, {
  ChangeEvent,
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
  adminApi,
  type ProduitPayload,
} from '../../../api/admin';
import { adminStockApi, type StockDepotOption } from '../../../api/adminStock';

import type {
  Categorie,
  Collection,
  Partenaire,
  Produit,
} from '../../../types';

type FormState = {
  partenaire_id: string;
  categorie_id: string;
  collection_id: string;
  sku: string;
  nom: string;
  description: string;
  style: string;
  usage_recommande: string;
  garantie_mois: string;
  delai_fabrication_jours: string;
  mis_en_avant: boolean;
};

type SpecificationRow = {
  cle: string;
  valeur: string;
};

type ProduitMedia = {
  id: number;
  produit_id: number;
  type?: string | null;
  chemin: string;
  url?: string | null;
  alt?: string | null;
  ordre?: number | null;
  principale?: boolean | number;
};

type ProduitVariante = {
  id: number;
  produit_id: number;
  prix_vente: number | string;
  prix_promo?: number | string | null;
  mode_stock: 'stock' | 'fabrication';
  active: boolean | number;
  stocks?: Array<{
    id: number;
    quantite: number;
    quantite_reservee: number;
    depot?: {
      id: number;
      nom?: string;
    } | null;
  }>;
};

type AdminProduitDetail = Omit<Produit, 'medias' | 'variantes'> & {
  medias?: ProduitMedia[];
  variantes?: ProduitVariante[];
} & Record<string, any>;

type VariantDraft = {
  prix_vente: string;
  prix_promo: string;
  mode_stock: 'stock' | 'fabrication';
  active: boolean;
};

type ValidationErrors = Record<string, string[]>;
type StockDraft = {
  depot_id: string;
  quantite: string;
};

const INITIAL_FORM: FormState = {
  partenaire_id: '',
  categorie_id: '',
  collection_id: '',
  sku: '',
  nom: '',
  description: '',
  style: '',
  usage_recommande: '',
  garantie_mois: '',
  delai_fabrication_jours: '',
  mis_en_avant: false,
};

const INITIAL_VARIANT: VariantDraft = {
  prix_vente: '',
  prix_promo: '',
  mode_stock: 'stock',
  active: true,
};

function getItems<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) return payload as T[];

  if (
    payload &&
    typeof payload === 'object' &&
    Array.isArray((payload as { data?: unknown }).data)
  ) {
    return (payload as { data: T[] }).data;
  }

  return [];
}

function apiErrorMessage(
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

function apiValidationErrors(
  error: unknown,
): ValidationErrors {
  if (!axios.isAxiosError(error)) return {};

  const errors = error.response?.data?.errors;

  if (!errors || typeof errors !== 'object') return {};

  return errors as ValidationErrors;
}

function normalizePointsForts(value: unknown): string[] {
  if (!Array.isArray(value)) return [''];

  const rows = value
    .map((item) => String(item ?? '').trim())
    .filter(Boolean);

  return rows.length ? rows : [''];
}

function normalizeSpecifications(
  value: unknown,
): SpecificationRow[] {
  if (!value) return [{ cle: '', valeur: '' }];

  if (Array.isArray(value)) {
    const rows = value.flatMap((item: any) => {
      if (!item || typeof item !== 'object') return [];

      if ('cle' in item || 'valeur' in item) {
        return [
          {
            cle: String(item.cle ?? ''),
            valeur: String(item.valeur ?? ''),
          },
        ];
      }

      return Object.entries(item).map(([cle, valeur]) => ({
        cle,
        valeur: String(valeur ?? ''),
      }));
    });

    return rows.length ? rows : [{ cle: '', valeur: '' }];
  }

  if (typeof value === 'object') {
    const rows = Object.entries(
      value as Record<string, unknown>,
    ).map(([cle, valeur]) => ({
      cle,
      valeur: String(valeur ?? ''),
    }));

    return rows.length ? rows : [{ cle: '', valeur: '' }];
  }

  return [{ cle: '', valeur: '' }];
}

function nullableNumber(value: string): number | null {
  if (value.trim() === '') return null;

  const number = Number(value);

  return Number.isFinite(number) ? number : null;
}

function statusLabel(status?: string | null): string {
  switch (status) {
    case 'publie':
      return 'Publié';
    case 'archive':
      return 'Archivé';
    default:
      return 'Brouillon';
  }
}

function statusClass(status?: string | null): string {
  switch (status) {
    case 'publie':
      return 'badge-success';
    case 'archive':
      return 'badge-error';
    default:
      return 'badge-neutral';
  }
}

function mediaSource(media: ProduitMedia): string {
  const raw = media.url || media.chemin || '';

  if (!raw) return '';

  if (
    raw.startsWith('http://') ||
    raw.startsWith('https://') ||
    raw.startsWith('data:') ||
    raw.startsWith('/')
  ) {
    return raw;
  }

  if (raw.startsWith('storage/')) {
    return `/${raw}`;
  }

  return `/storage/${raw}`;
}

function formatMoney(value: number | string | null | undefined): string {
  if (value === null || value === undefined || value === '') return '—';

  const number = Number(value);

  if (!Number.isFinite(number)) return String(value);

  return new Intl.NumberFormat('fr-FR').format(number) + ' FCFA';
}

function availableVariantStock(variant: ProduitVariante): number {
  if (!Array.isArray(variant.stocks)) return 0;

  return variant.stocks.reduce((total, stock) => {
    const quantity = Number(stock.quantite ?? 0);
    const reserved = Number(stock.quantite_reservee ?? 0);

    return total + Math.max(0, quantity - reserved);
  }, 0);
}

function FieldError({ errors }: { errors?: string[] }) {
  if (!errors?.length) return null;

  return <div className="pf-field-error">{errors[0]}</div>;
}

function SectionHeader({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="pf-section-head">
      <div>
        {eyebrow && <div className="pf-eyebrow">{eyebrow}</div>}

        <h2 className="pf-section-title">{title}</h2>

        {description && (
          <p className="pf-section-description">{description}</p>
        )}
      </div>

      {action && <div className="pf-section-action">{action}</div>}
    </div>
  );
}

export default function ProduitFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const produitId = id ? Number(id) : null;
  const isEditing = Number.isFinite(produitId) && produitId !== null;

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [pointsForts, setPointsForts] = useState<string[]>(['']);
  const [specifications, setSpecifications] = useState<SpecificationRow[]>([
    { cle: '', valeur: '' },
  ]);

  const [categories, setCategories] = useState<Categorie[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [partenaires, setPartenaires] = useState<Partenaire[]>([]);
  const [stockDepots, setStockDepots] = useState<StockDepotOption[]>([]);

  const [produit, setProduit] = useState<AdminProduitDetail | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);

  const [saving, setSaving] = useState(false);
  const [assetBusy, setAssetBusy] = useState(false);
  const [validationErrors, setValidationErrors] =
    useState<ValidationErrors>({});

  // Photos
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaAlt, setMediaAlt] = useState('');
  const [mediaPrincipale, setMediaPrincipale] = useState(true);

  // Nouvelle variante
  const [variantDraft, setVariantDraft] =
    useState<VariantDraft>(INITIAL_VARIANT);

  // Edition des variantes existantes
  const [variantEdits, setVariantEdits] = useState<
    Record<number, VariantDraft>
  >({});
  const [initialStockDepotId, setInitialStockDepotId] = useState('');
  const [initialStockQuantity, setInitialStockQuantity] = useState('0');
  const [stockDrafts, setStockDrafts] = useState<Record<number, StockDraft>>({});

  const titre = isEditing ? 'Modifier le produit' : 'Nouveau produit';

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);
      setLoadError(null);

      try {
        const requests: Promise<any>[] = [
          adminApi.categories(),
          adminApi.collections(),
          adminApi.partenairesCatalogue(),
        ];

        if (isEditing && produitId) {
          requests.push(adminApi.produit(produitId));
        }

        const results = await Promise.all(requests);

        if (!mounted) return;

        setCategories(getItems<Categorie>(results[0].data));
        setCollections(getItems<Collection>(results[1].data));
        setPartenaires(getItems<Partenaire>(results[2].data));

        if (isEditing) {
          hydrateProduct(results[3].data as AdminProduitDetail);
        }
      } catch (error) {
        if (mounted) {
          const message = apiErrorMessage(
            error,
            isEditing
              ? 'Impossible de charger le produit.'
              : 'Impossible de charger les données du formulaire.',
          );

          setLoadError(message);
          toast.error(message);
        }
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
    };
  }, [isEditing, produitId, loadAttempt]);

  useEffect(() => {
    if (!isEditing) return;
    let mounted = true;
    adminStockApi.depotsPourCatalogue()
      .then((response) => {
        if (!mounted) return;
        setStockDepots(response.data);
        setInitialStockDepotId((current) => current || String(response.data[0]?.id ?? ''));
      })
      .catch((error: unknown) => {
        if (mounted) toast.error(apiErrorMessage(error, 'Impossible de charger les dépôts actifs.'));
      });
    return () => {
      mounted = false;
    };
  }, [isEditing]);

  function hydrateProduct(value: AdminProduitDetail) {
    setProduit(value);

    setForm({
      partenaire_id: value.partenaire_id
        ? String(value.partenaire_id)
        : '',
      categorie_id: value.categorie_id
        ? String(value.categorie_id)
        : '',
      collection_id: value.collection_id
        ? String(value.collection_id)
        : '',
      sku: value.sku ?? '',
      nom: value.nom ?? '',
      description: value.description ?? '',
      style: value.style ?? '',
      usage_recommande: value.usage_recommande ?? '',
      garantie_mois:
        value.garantie_mois !== null &&
        value.garantie_mois !== undefined
          ? String(value.garantie_mois)
          : '',
      delai_fabrication_jours:
        value.delai_fabrication_jours !== null &&
        value.delai_fabrication_jours !== undefined
          ? String(value.delai_fabrication_jours)
          : '',
      mis_en_avant: Boolean(value.mis_en_avant),
    });

    setPointsForts(normalizePointsForts(value.points_forts));
    setSpecifications(normalizeSpecifications(value.fiche_technique));

    const edits: Record<number, VariantDraft> = {};

    (value.variantes ?? []).forEach((variant) => {
      edits[variant.id] = {
        prix_vente: String(variant.prix_vente ?? ''),
        prix_promo:
          variant.prix_promo !== null &&
          variant.prix_promo !== undefined
            ? String(variant.prix_promo)
            : '',
        mode_stock: variant.mode_stock ?? 'stock',
        active: Boolean(variant.active),
      };
    });

    setVariantEdits(edits);
  }

  const ficheTechnique = useMemo(() => {
    return specifications.reduce<Record<string, string>>((result, row) => {
      const cle = row.cle.trim();
      const valeur = row.valeur.trim();

      if (cle && valeur) {
        result[cle] = valeur;
      }

      return result;
    }, {});
  }, [specifications]);

  const selectedPartnerId = form.partenaire_id
    ? Number(form.partenaire_id)
    : null;

  const visibleCollections = useMemo(() => {
    return collections.filter((collection: any) => {
      const collectionPartnerId =
        collection.partenaire_id ?? collection.partenaire?.id ?? null;

      if (collectionPartnerId === null) return true;
      if (selectedPartnerId === null) return true;

      return Number(collectionPartnerId) === selectedPartnerId;
    });
  }, [collections, selectedPartnerId]);

  const p = produit;

  const medias: ProduitMedia[] = Array.isArray(p?.medias)
    ? p.medias
    : [];

  const variantes: ProduitVariante[] = Array.isArray(p?.variantes)
    ? p.variantes
    : [];

  const mediaCount = medias.length;

  const activeVariantCount = variantes.filter(
    (variant) => Boolean(variant.active),
  ).length;

  const productReady = mediaCount > 0 && activeVariantCount > 0;

  function updateField<K extends keyof FormState>(
    field: K,
    value: FormState[K],
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));

    setValidationErrors((current) => {
      if (!current[field]) return current;

      const next = { ...current };
      delete next[field];

      return next;
    });
  }

  function handlePartnerChange(value: string) {
    setForm((current) => {
      let nextCollection = current.collection_id;

      if (nextCollection) {
        const selectedCollection = collections.find(
          (item: any) => String(item.id) === nextCollection,
        ) as any;

        const collectionPartnerId =
          selectedCollection?.partenaire_id ??
          selectedCollection?.partenaire?.id ??
          null;

        if (
          collectionPartnerId !== null &&
          value &&
          Number(collectionPartnerId) !== Number(value)
        ) {
          nextCollection = '';
        }
      }

      return {
        ...current,
        partenaire_id: value,
        collection_id: nextCollection,
      };
    });
  }

  function addPointFort() {
    setPointsForts((current) => [...current, '']);
  }

  function updatePointFort(index: number, value: string) {
    setPointsForts((current) =>
      current.map((item, i) => (i === index ? value : item)),
    );
  }

  function removePointFort(index: number) {
    setPointsForts((current) => {
      const next = current.filter((_, i) => i !== index);
      return next.length ? next : [''];
    });
  }

  function addSpecification() {
    setSpecifications((current) => [
      ...current,
      { cle: '', valeur: '' },
    ]);
  }

  function updateSpecification(
    index: number,
    field: keyof SpecificationRow,
    value: string,
  ) {
    setSpecifications((current) =>
      current.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]: value,
            }
          : row,
      ),
    );
  }

  function removeSpecification(index: number) {
    setSpecifications((current) => {
      const next = current.filter((_, i) => i !== index);

      return next.length
        ? next
        : [
            {
              cle: '',
              valeur: '',
            },
          ];
    });
  }

  function buildPayload(): ProduitPayload | null {
    setValidationErrors({});

    if (!form.nom.trim()) {
      setValidationErrors({
        nom: ['Le nom du produit est obligatoire.'],
      });

      toast.error('Le nom du produit est obligatoire.');
      return null;
    }

    if (!form.partenaire_id) {
      setValidationErrors({
        partenaire_id: ['Sélectionnez un partenaire.'],
      });

      toast.error('Sélectionnez un partenaire.');
      return null;
    }

    if (!form.categorie_id) {
      setValidationErrors({
        categorie_id: ['Sélectionnez une catégorie.'],
      });

      toast.error('Sélectionnez une catégorie.');
      return null;
    }

    const garantie = nullableNumber(form.garantie_mois);
    const delai = nullableNumber(form.delai_fabrication_jours);

    if (
      garantie !== null &&
      (!Number.isInteger(garantie) || garantie < 0)
    ) {
      setValidationErrors({
        garantie_mois: [
          'La garantie doit être un nombre entier positif ou nul.',
        ],
      });
      return null;
    }

    if (delai !== null && (!Number.isInteger(delai) || delai < 0)) {
      setValidationErrors({
        delai_fabrication_jours: [
          'Le délai doit être un nombre entier positif ou nul.',
        ],
      });
      return null;
    }

    return {
      partenaire_id: Number(form.partenaire_id),
      categorie_id: Number(form.categorie_id),
      collection_id: form.collection_id
        ? Number(form.collection_id)
        : null,
      sku: form.sku.trim() || null,
      nom: form.nom.trim(),
      description: form.description.trim() || null,
      points_forts: pointsForts
        .map((item) => item.trim())
        .filter(Boolean),
      style: form.style.trim() || null,
      usage_recommande: form.usage_recommande.trim() || null,
      fiche_technique: ficheTechnique,
      garantie_mois: garantie,
      delai_fabrication_jours: delai,
      mis_en_avant: form.mis_en_avant,
    };
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const payload = buildPayload();
    if (!payload) return;

    const hasVariantDraft =
      variantDraft.prix_vente.trim() !== '' ||
      variantDraft.prix_promo.trim() !== '';

    if (isEditing && hasVariantDraft && !validateVariant(variantDraft)) {
      return;
    }

    setSaving(true);
    setValidationErrors({});

    try {
      if (isEditing && produitId) {
        const response = await adminApi.updateProduit(produitId, payload);

        setProduit((current) => ({
          ...(current as any),
          ...(response.data as any),
        }));

        if (hasVariantDraft) {
          try {
            const variantResponse = await adminApi.createProduitVariante(
              produitId,
              {
                prix_vente: Number(variantDraft.prix_vente),
                prix_promo:
                  variantDraft.prix_promo.trim() === ''
                    ? null
                    : Number(variantDraft.prix_promo),
                mode_stock: variantDraft.mode_stock,
                active: variantDraft.active,
              },
            );

            addCreatedVariant(variantResponse.data as ProduitVariante);
            setVariantDraft(INITIAL_VARIANT);
            toast.success('Produit et variante enregistrés.');
            return;
          } catch (error) {
            toast.error(
              `Produit enregistré, mais la variante n'a pas été enregistrée : ${apiErrorMessage(
                error,
                "impossible d'ajouter la variante.",
              )}`,
            );
            return;
          }
        }

        toast.success('Produit mis à jour.');
      } else {
        const response = await adminApi.createProduit(payload);
        const created = response.data;

        toast.success(
          'Produit créé. Ajoutez maintenant au moins une photo et une variante active.',
        );

        navigate(
          `/admin/catalogue/produits/${created.id}/modifier`,
          { replace: true },
        );
      }
    } catch (error) {
      setValidationErrors(apiValidationErrors(error));

      toast.error(
        apiErrorMessage(
          error,
          isEditing
            ? 'Impossible de modifier le produit.'
            : 'Impossible de créer le produit.',
        ),
      );
    } finally {
      setSaving(false);
    }
  }

  async function refreshProduct() {
    if (!produitId) return;

    const response = await adminApi.produit(produitId);

    hydrateProduct(response.data as AdminProduitDetail);
  }

  function addCreatedVariant(variant: ProduitVariante) {
    setProduit((current) =>
      current
        ? {
            ...current,
            variantes: [...(current.variantes ?? []), variant],
          }
        : current,
    );
    setVariantEdits((current) => ({
      ...current,
      [variant.id]: {
        prix_vente: String(variant.prix_vente),
        prix_promo:
          variant.prix_promo !== null && variant.prix_promo !== undefined
            ? String(variant.prix_promo)
            : '',
        mode_stock: variant.mode_stock,
        active: Boolean(variant.active),
      },
    }));
  }

  function updateVariantStockData(
    varianteId: number,
    stocks: ProduitVariante['stocks'],
  ) {
    setProduit((current) =>
      current
        ? {
            ...current,
            variantes: (current.variantes ?? []).map((variant) =>
              variant.id === varianteId ? { ...variant, stocks } : variant,
            ),
          }
        : current,
    );
  }

  async function handleAddVariantStock(varianteId: number) {
    const draft = stockDrafts[varianteId] ?? {
      depot_id: String(stockDepots[0]?.id ?? ''),
      quantite: '',
    };
    const quantity = Number(draft.quantite);

    if (!draft.depot_id) {
      toast.error('Sélectionnez un dépôt actif.');
      return;
    }
    if (!Number.isInteger(quantity) || quantity < 1) {
      toast.error('La quantité à ajouter doit être un entier supérieur à zéro.');
      return;
    }

    setAssetBusy(true);
    try {
      const response = await adminStockApi.ajouterStockVariante(varianteId, {
        depot_id: Number(draft.depot_id),
        quantite: quantity,
      });
      updateVariantStockData(varianteId, response.data.variante.stocks);
      setStockDrafts((current) => ({
        ...current,
        [varianteId]: { ...draft, quantite: '' },
      }));
      toast.success(`${response.data.message} ${quantity} unité${quantity > 1 ? 's' : ''} ajoutée${quantity > 1 ? 's' : ''}.`);
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Impossible d’ajouter ce stock.'));
    } finally {
      setAssetBusy(false);
    }
  }

  // ─────────────────────────────────────────────
  // PHOTOS
  // ─────────────────────────────────────────────

  function handleMediaFiles(event: ChangeEvent<HTMLInputElement>) {
    setMediaFiles(Array.from(event.target.files ?? []));
  }

  async function handleUploadMedia() {
    if (!produitId) {
      toast.error("Enregistrez d'abord le produit.");
      return;
    }

    if (!mediaFiles.length) {
      toast.error('Sélectionnez au moins une image.');
      return;
    }

    setAssetBusy(true);

    try {
      for (let index = 0; index < mediaFiles.length; index += 1) {
        const file = mediaFiles[index];
        const data = new FormData();

        data.append('fichier', file);
        data.append('type', 'photo');
        data.append('alt', mediaAlt.trim());

        // Si le produit n'a aucune photo, la première devient principale.
        const shouldBeMain =
          (mediaCount === 0 && index === 0) ||
          (mediaPrincipale && index === 0);

        data.append('principale', shouldBeMain ? '1' : '0');
        data.append('ordre', String(mediaCount + index));

        await adminApi.createProduitMedia(produitId, data);
      }

      toast.success(
        `${mediaFiles.length} photo${mediaFiles.length > 1 ? 's' : ''} ajoutée${mediaFiles.length > 1 ? 's' : ''}.`,
      );

      setMediaFiles([]);
      setMediaAlt('');
      setMediaPrincipale(false);

      const input = document.getElementById(
        'produit-photos',
      ) as HTMLInputElement | null;

      if (input) input.value = '';

      await refreshProduct();
    } catch (error) {
      toast.error(
        apiErrorMessage(error, "Impossible d'ajouter la photo."),
      );
    } finally {
      setAssetBusy(false);
    }
  }

  async function handleSetMainMedia(mediaId: number) {
    if (!produitId) return;

    setAssetBusy(true);

    try {
      await adminApi.setProduitMediaPrincipale(mediaId);

      toast.success('Photo principale mise à jour.');
      await refreshProduct();
    } catch (error) {
      toast.error(
        apiErrorMessage(
          error,
          'Impossible de définir la photo principale.',
        ),
      );
    } finally {
      setAssetBusy(false);
    }
  }

  async function handleDeleteMedia(mediaId: number) {
    if (!produitId) return;

    if (!window.confirm('Supprimer cette photo ?')) return;

    setAssetBusy(true);

    try {
      await adminApi.deleteProduitMedia(mediaId);

      toast.success('Photo supprimée.');
      await refreshProduct();
    } catch (error) {
      toast.error(
        apiErrorMessage(error, 'Impossible de supprimer la photo.'),
      );
    } finally {
      setAssetBusy(false);
    }
  }

  // ─────────────────────────────────────────────
  // VARIANTES
  // ─────────────────────────────────────────────

  function updateVariantDraft<K extends keyof VariantDraft>(
    key: K,
    value: VariantDraft[K],
  ) {
    setVariantDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function updateVariantEdit<K extends keyof VariantDraft>(
    id: number,
    key: K,
    value: VariantDraft[K],
  ) {
    setVariantEdits((current) => ({
      ...current,
      [id]: {
        ...(current[id] ?? INITIAL_VARIANT),
        [key]: value,
      },
    }));
  }

  function validateVariant(values: VariantDraft): boolean {
    if (values.prix_vente.trim() === '') {
      toast.error('Saisissez un prix de vente.');
      return false;
    }

    const salePrice = Number(values.prix_vente);
    const promoPrice =
      values.prix_promo.trim() === ''
        ? null
        : Number(values.prix_promo);

    if (
      !Number.isInteger(salePrice) ||
      !Number.isFinite(salePrice) ||
      salePrice < 0
    ) {
      toast.error('Saisissez un prix de vente valide.');
      return false;
    }

    if (
      promoPrice !== null &&
      (
        !Number.isInteger(promoPrice) ||
        !Number.isFinite(promoPrice) ||
        promoPrice < 0
      )
    ) {
      toast.error('Saisissez un prix promotionnel valide.');
      return false;
    }

    if (promoPrice !== null && promoPrice >= salePrice) {
      toast.error(
        'Le prix promotionnel doit être inférieur au prix de vente.',
      );
      return false;
    }

    return true;
  }

  async function handleCreateVariant() {
    if (!produitId) {
      toast.error("Enregistrez d'abord le produit.");
      return;
    }

    if (!validateVariant(variantDraft)) return;

    const initialQuantity = Number(initialStockQuantity);
    if (!Number.isInteger(initialQuantity) || initialQuantity < 0) {
      toast.error('La quantité initiale doit être un entier positif ou nul.');
      return;
    }
    if (variantDraft.mode_stock === 'stock' && initialQuantity > 0 && !initialStockDepotId) {
      toast.error('Sélectionnez un dépôt actif pour enregistrer le stock.');
      return;
    }

    setAssetBusy(true);

    try {
      const response = await adminApi.createProduitVariante(produitId, {
        prix_vente: Number(variantDraft.prix_vente),
        prix_promo:
          variantDraft.prix_promo.trim() === ''
            ? null
            : Number(variantDraft.prix_promo),
        mode_stock: variantDraft.mode_stock,
        active: variantDraft.active,
      });

      const createdVariant = response.data as ProduitVariante;
      addCreatedVariant(createdVariant);
      setVariantDraft(INITIAL_VARIANT);
      setInitialStockQuantity('0');

      if (initialQuantity > 0 && variantDraft.mode_stock === 'stock') {
        try {
          const stockResponse = await adminStockApi.ajouterStockVariante(createdVariant.id, {
            depot_id: Number(initialStockDepotId),
            quantite: initialQuantity,
          });
          updateVariantStockData(createdVariant.id, stockResponse.data.variante.stocks);
          toast.success('Variante et stock enregistrés.');
        } catch (error) {
          setStockDrafts((current) => ({
            ...current,
            [createdVariant.id]: {
              depot_id: initialStockDepotId,
              quantite: String(initialQuantity),
            },
          }));
          toast.error(
            `Variante créée, mais le stock n'a pas été ajouté : ${apiErrorMessage(error, 'ajout de stock impossible.')}`,
          );
        }
      } else {
        toast.success('Variante ajoutée.');
      }
    } catch (error) {
      toast.error(
        apiErrorMessage(error, "Impossible d'ajouter la variante."),
      );
    } finally {
      setAssetBusy(false);
    }
  }

  async function handleUpdateVariant(variantId: number) {
    if (!produitId) return;

    const values = variantEdits[variantId];
    if (!values || !validateVariant(values)) return;

    setAssetBusy(true);

    try {
      await adminApi.updateProduitVariante(variantId, {
        prix_vente: Number(values.prix_vente),
        prix_promo:
          values.prix_promo.trim() === ''
            ? null
            : Number(values.prix_promo),
        mode_stock: values.mode_stock,
        active: values.active,
      });

      toast.success('Variante mise à jour.');
      await refreshProduct();
    } catch (error) {
      toast.error(
        apiErrorMessage(error, 'Impossible de modifier la variante.'),
      );
    } finally {
      setAssetBusy(false);
    }
  }

  async function handleDeleteVariant(variantId: number) {
    if (!produitId) return;

    if (!window.confirm('Supprimer cette variante ?')) return;

    setAssetBusy(true);

    try {
      await adminApi.deleteProduitVariante(variantId);

      toast.success('Variante supprimée.');
      await refreshProduct();
    } catch (error) {
      toast.error(
        apiErrorMessage(error, 'Impossible de supprimer la variante.'),
      );
    } finally {
      setAssetBusy(false);
    }
  }

  async function handlePublier() {
    if (!produitId) return;

    if (!productReady) {
      if (!mediaCount && !activeVariantCount) {
        toast.error(
          'Ajoutez au moins une photo et une variante active avant de publier.',
        );
      } else if (!mediaCount) {
        toast.error('Ajoutez au moins une photo avant de publier.');
      } else {
        toast.error(
          'Ajoutez au moins une variante active avant de publier.',
        );
      }

      return;
    }

    setSaving(true);

    try {
      await adminApi.publierProduit(produitId);

      toast.success('Produit publié.');
      await refreshProduct();
    } catch (error) {
      toast.error(
        apiErrorMessage(error, 'Impossible de publier le produit.'),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleArchiver() {
    if (!produitId) return;

    if (!window.confirm('Archiver ce produit ?')) return;

    setSaving(true);

    try {
      await adminApi.archiverProduit(produitId);

      toast.success('Produit archivé.');
      await refreshProduct();
    } catch (error) {
      toast.error(
        apiErrorMessage(error, "Impossible d'archiver le produit."),
      );
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!produitId) return;

    if (
      !window.confirm(
        'Supprimer ce produit ? Il sera archivé par suppression logique.',
      )
    ) {
      return;
    }

    setSaving(true);

    try {
      await adminApi.deleteProduit(produitId);

      toast.success('Produit supprimé.');

      navigate('/admin/catalogue/produits', {
        replace: true,
      });
    } catch (error) {
      toast.error(
        apiErrorMessage(error, 'Impossible de supprimer le produit.'),
      );
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="pf-loading">
        <div className="spinner" />
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="card pf-error-state">
        <h2>Chargement impossible</h2>
        <p>{loadError}</p>

        <div className="pf-error-actions">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
          >
            Réessayer
          </button>

          <Link
            to="/admin/catalogue/produits"
            className="btn btn-ghost"
          >
            Retour aux produits
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{`
        .pf-page {
          --pf-border: var(--color-border, rgba(15, 23, 42, .10));
          --pf-border-strong: rgba(15, 23, 42, .16);
          --pf-surface: var(--color-blanc, #ffffff);
          --pf-soft: var(--color-ivoire, #faf9f6);
          --pf-soft-2: var(--color-ivoire-dark, #f4f1eb);
          --pf-text: var(--color-texte, #172033);
          --pf-muted: var(--color-gris-moyen, #6b7280);
          --pf-accent: var(--color-terra, #9b5f45);

          width: 100%;
          max-width: 1540px;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          gap: 20px;
          color: var(--pf-text);
        }

        .pf-page *,
        .pf-page *::before,
        .pf-page *::after {
          box-sizing: border-box;
        }

        /* ---------- EN-TÊTE ---------- */

        .pf-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 24px;
          flex-wrap: wrap;
          padding: 20px 22px;
          border: 1px solid var(--pf-border);
          border-radius: 16px;
          background:
            linear-gradient(
              135deg,
              var(--pf-surface) 0%,
              var(--pf-soft) 100%
            );
          box-shadow: 0 8px 28px rgba(15, 23, 42, .045);
        }

        .pf-header > div:first-child {
          min-width: 0;
          flex: 1 1 420px;
        }

        .pf-back {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
          color: var(--pf-muted);
          font-size: 12px;
          font-weight: 650;
          text-decoration: none;
          transition: color .18s ease;
        }

        .pf-back:hover {
          color: var(--pf-accent);
        }

        .pf-title {
          margin: 0;
          font-family: var(--font-display);
          font-size: clamp(1.65rem, 2.3vw, 2.05rem);
          line-height: 1.15;
          font-weight: 780;
          letter-spacing: -.03em;
        }

        .pf-subtitle {
          max-width: 760px;
          margin: 7px 0 0;
          color: var(--pf-muted);
          font-size: 12.5px;
          line-height: 1.55;
        }

        .pf-header-actions {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 8px;
          flex: 0 0 auto;
          flex-wrap: wrap;
        }

        .pf-header-actions .btn {
          min-height: 40px;
          white-space: nowrap;
        }

        /* ---------- ÉTAT DE PUBLICATION ---------- */

        .pf-notice {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 18px;
          padding: 15px 18px;
          border: 1px solid rgba(181, 126, 0, .20);
          border-left: 4px solid var(--color-warning);
          border-radius: 13px;
          background: linear-gradient(
            90deg,
            rgba(181, 126, 0, .055),
            var(--pf-surface)
          );
        }

        .pf-notice.ready {
          border-color: rgba(28, 130, 70, .20);
          border-left-color: var(--color-success);
          background: linear-gradient(
            90deg,
            rgba(28, 130, 70, .055),
            var(--pf-surface)
          );
        }

        .pf-notice > div:first-child {
          min-width: 0;
        }

        .pf-notice strong {
          display: block;
          margin-bottom: 3px;
          font-size: 13px;
          font-weight: 760;
        }

        .pf-notice p {
          max-width: 800px;
          margin: 0;
          color: var(--pf-muted);
          font-size: 11.5px;
          line-height: 1.55;
        }

        .pf-notice-status {
          display: flex;
          align-items: center;
          justify-content: flex-end;
          gap: 7px;
          flex-wrap: wrap;
          flex-shrink: 0;
        }

        /* ---------- LAYOUT ---------- */

        .pf-layout {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 330px;
          gap: 20px;
          align-items: start;
        }

        .pf-main,
        .pf-sidebar {
          min-width: 0;
          display: flex;
          flex-direction: column;
          gap: 18px;
        }

        .pf-sidebar {
          position: sticky;
          top: 18px;
        }

        .pf-card {
          padding: 22px;
          overflow: hidden;
          border: 1px solid var(--pf-border);
          border-radius: 15px;
          background: var(--pf-surface);
          box-shadow: 0 7px 24px rgba(15, 23, 42, .04);
        }

        /* ---------- TITRES DE SECTIONS ---------- */

        .pf-section-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 16px;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid var(--pf-border);
        }

        .pf-section-head > div:first-child {
          min-width: 0;
        }

        .pf-eyebrow {
          margin-bottom: 5px;
          color: var(--pf-accent);
          font-size: 9.5px;
          line-height: 1;
          font-weight: 820;
          letter-spacing: .13em;
          text-transform: uppercase;
        }

        .pf-section-title {
          margin: 0;
          font-size: 16.5px;
          line-height: 1.3;
          font-weight: 760;
          letter-spacing: -.015em;
        }

        .pf-section-description {
          max-width: 720px;
          margin: 5px 0 0;
          color: var(--pf-muted);
          font-size: 11.5px;
          line-height: 1.55;
        }

        .pf-section-action {
          flex: 0 0 auto;
        }

        .pf-section-action .btn {
          min-height: 36px;
        }

        /* ---------- FORMULAIRE ---------- */

        .pf-grid {
          display: grid;
          grid-template-columns: repeat(12, minmax(0, 1fr));
          gap: 17px 18px;
          align-items: start;
        }

        .pf-span-12 { grid-column: span 12; }
        .pf-span-8  { grid-column: span 8; }
        .pf-span-6  { grid-column: span 6; }
        .pf-span-4  { grid-column: span 4; }

        .pf-field {
          min-width: 0;
          display: flex;
          flex-direction: column;
        }

        .pf-field .form-label {
          min-height: 18px;
          margin: 0 0 7px;
          color: var(--pf-text);
          font-size: 11.5px;
          line-height: 1.35;
          font-weight: 720;
        }

        .pf-required {
          margin-left: 3px;
          color: var(--color-error);
        }

        .pf-page .form-input {
          width: 100%;
          min-width: 0;
          height: 44px;
          padding: 0 12px;
          border: 1px solid var(--pf-border-strong);
          border-radius: 10px;
          background: var(--pf-surface);
          color: var(--pf-text);
          font: inherit;
          font-size: 12.5px;
          outline: none;
          transition:
            border-color .16s ease,
            box-shadow .16s ease,
            background .16s ease;
        }

        .pf-page select.form-input {
          cursor: pointer;
        }

        .pf-page .form-input:hover {
          border-color: rgba(15, 23, 42, .24);
        }

        .pf-page .form-input:focus {
          border-color: var(--pf-accent);
          box-shadow: 0 0 0 3px rgba(155, 95, 69, .10);
        }

        .pf-page .form-input::placeholder {
          color: var(--color-gris-clair, #9ca3af);
        }

        .pf-page input[type="file"].form-input {
          height: auto;
          min-height: 44px;
          padding: 8px 10px;
          line-height: 26px;
        }

        .pf-page textarea.form-input {
          height: auto;
          padding: 11px 12px;
        }

        .pf-textarea {
          min-height: 148px !important;
          resize: vertical;
          line-height: 1.6;
        }

        .pf-help {
          min-height: 15px;
          margin-top: 6px;
          color: var(--pf-muted);
          font-size: 10px;
          line-height: 1.45;
        }

        .pf-field-error {
          margin-top: 6px;
          color: var(--color-error);
          font-size: 10.5px;
          line-height: 1.4;
          font-weight: 650;
        }

        .pf-field.has-error .form-input {
          border-color: var(--color-error);
          box-shadow: 0 0 0 2px rgba(190, 40, 40, .06);
        }

        /* ---------- LISTES DYNAMIQUES ---------- */

        .pf-list {
          display: flex;
          flex-direction: column;
          gap: 9px;
        }

        .pf-list-row {
          display: grid;
          grid-template-columns: 34px minmax(0, 1fr) 38px;
          gap: 9px;
          align-items: center;
        }

        .pf-row-number {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: 1px solid var(--pf-border);
          border-radius: 9px;
          background: var(--pf-soft);
          color: var(--pf-muted);
          font-size: 10px;
          font-weight: 800;
        }

        .pf-remove {
          width: 36px;
          height: 36px;
          min-height: 36px !important;
          padding: 0 !important;
          border-radius: 9px !important;
          font-size: 17px;
          line-height: 1;
        }

        .pf-spec-row {
          display: grid;
          grid-template-columns:
            minmax(170px, .9fr)
            minmax(240px, 1.4fr)
            38px;
          gap: 10px;
          align-items: center;
        }

        /* ---------- ÉTATS VERROUILLÉS ---------- */

        .pf-assets-locked {
          padding: 24px;
          border: 1px dashed var(--pf-border-strong);
          border-radius: 12px;
          background: var(--pf-soft);
          text-align: center;
        }

        .pf-assets-locked strong {
          display: block;
          margin-bottom: 5px;
          font-size: 13px;
          font-weight: 760;
        }

        .pf-assets-locked p {
          max-width: 620px;
          margin: 0 auto;
          color: var(--pf-muted);
          font-size: 11px;
          line-height: 1.55;
        }

        /* ---------- PHOTOS ---------- */

        .pf-upload-box {
          padding: 17px;
          border: 1px dashed var(--pf-border-strong);
          border-radius: 12px;
          background: var(--pf-soft);
        }

        .pf-upload-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.4fr) minmax(220px, .8fr);
          gap: 15px;
          align-items: start;
        }

        .pf-media-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(175px, 1fr));
          gap: 13px;
          margin-top: 18px;
        }

        .pf-media-card {
          overflow: hidden;
          border: 1px solid var(--pf-border);
          border-radius: 12px;
          background: var(--pf-surface);
          transition:
            transform .16s ease,
            box-shadow .16s ease,
            border-color .16s ease;
        }

        .pf-media-card:hover {
          transform: translateY(-1px);
          border-color: rgba(155, 95, 69, .24);
          box-shadow: 0 9px 22px rgba(15, 23, 42, .07);
        }

        .pf-media-image {
          position: relative;
          aspect-ratio: 4 / 3;
          overflow: hidden;
          border-bottom: 1px solid var(--pf-border);
          background: var(--pf-soft-2);
        }

        .pf-media-image img {
          width: 100%;
          height: 100%;
          display: block;
          object-fit: contain;
          padding: 10px;
        }

        .pf-main-badge {
          position: absolute;
          top: 9px;
          left: 9px;
          box-shadow: 0 3px 10px rgba(15, 23, 42, .08);
        }

        .pf-media-body {
          padding: 11px;
        }

        .pf-media-alt {
          min-height: 32px;
          overflow: hidden;
          color: var(--pf-muted);
          font-size: 10.5px;
          line-height: 1.45;
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
        }

        .pf-media-actions {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 6px;
          margin-top: 9px;
        }

        /* ---------- VARIANTES ---------- */

        .pf-variant-create {
          padding: 17px;
          border: 1px solid var(--pf-border);
          border-radius: 12px;
          background: var(--pf-soft);
        }

        .pf-variant-create-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(135px, 1fr));
          gap: 12px;
          align-items: end;
        }

        .pf-stock-entry {
          display: grid;
          grid-template-columns: minmax(170px, 1fr) minmax(180px, 1.2fr) 130px auto;
          align-items: center;
          gap: 10px;
          padding: 11px 13px;
          border: 1px solid var(--pf-border);
          border-radius: 10px;
          background: var(--pf-soft);
          color: var(--pf-text);
          font-size: 11px;
        }

        .pf-variants {
          display: flex;
          flex-direction: column;
          gap: 10px;
          margin-top: 16px;
        }

        .pf-variant-row {
          display: grid;
          grid-template-columns:
            48px
            minmax(130px, .85fr)
            minmax(130px, .85fr)
            minmax(190px, 1.2fr)
            115px
            auto
            auto;
          gap: 10px;
          align-items: end;
          padding: 13px;
          border: 1px solid var(--pf-border);
          border-radius: 12px;
          background: var(--pf-surface);
          transition:
            border-color .16s ease,
            box-shadow .16s ease;
        }

        .pf-variant-row:hover {
          border-color: rgba(155, 95, 69, .22);
          box-shadow: 0 6px 18px rgba(15, 23, 42, .045);
        }

        .pf-variant-id {
          align-self: center;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-height: 34px;
          padding: 0 7px;
          border-radius: 8px;
          background: var(--pf-soft);
          color: var(--pf-muted);
          font-size: 10px;
          font-weight: 800;
        }

        .pf-variant-stock {
          color: var(--pf-text);
          font-size: 10.5px;
          line-height: 1.4;
          font-weight: 720;
        }

        .pf-toggle-inline {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          min-height: 32px;
          white-space: nowrap;
          color: var(--pf-text);
          font-size: 10.5px;
          font-weight: 680;
          cursor: pointer;
        }

        .pf-toggle-inline input,
        .pf-toggle input {
          width: 16px;
          height: 16px;
          accent-color: var(--pf-accent);
          cursor: pointer;
        }

        /* ---------- SIDEBAR ---------- */

        .pf-toggle {
          display: flex;
          align-items: flex-start;
          gap: 11px;
          padding: 13px;
          border: 1px solid var(--pf-border);
          border-radius: 10px;
          background: var(--pf-soft);
          cursor: pointer;
          transition: border-color .16s ease;
        }

        .pf-toggle:hover {
          border-color: rgba(155, 95, 69, .25);
        }

        .pf-toggle input {
          flex: 0 0 auto;
          margin-top: 2px;
        }

        .pf-toggle strong {
          display: block;
          margin-bottom: 2px;
          font-size: 12.5px;
          line-height: 1.35;
        }

        .pf-toggle span span {
          display: block;
          color: var(--pf-muted);
          font-size: 10.5px;
          line-height: 1.5;
        }

        .pf-meta {
          display: grid;
          gap: 0;
          margin: 0;
        }

        .pf-meta-row {
          display: grid;
          grid-template-columns: minmax(0, 1fr) auto;
          gap: 12px;
          align-items: center;
          padding: 10px 0;
          border-bottom: 1px solid var(--pf-border);
        }

        .pf-meta-row:first-child {
          padding-top: 0;
        }

        .pf-meta-row:last-child {
          padding-bottom: 0;
          border-bottom: 0;
        }

        .pf-meta dt {
          color: var(--pf-muted);
          font-size: 10.5px;
        }

        .pf-meta dd {
          max-width: 175px;
          margin: 0;
          overflow-wrap: anywhere;
          text-align: right;
          font-size: 11.5px;
          font-weight: 720;
        }

        .pf-checks {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: 15px;
        }

        .pf-check {
          padding: 11px;
          border: 1px solid var(--pf-border);
          border-radius: 10px;
          background: var(--pf-soft);
        }

        .pf-check-label {
          color: var(--pf-muted);
          font-size: 9.5px;
          font-weight: 620;
          text-transform: uppercase;
          letter-spacing: .04em;
        }

        .pf-check-value {
          margin-top: 4px;
          font-size: 13px;
          font-weight: 780;
        }

        .pf-danger {
          border-color: rgba(198, 45, 45, .16);
          background: linear-gradient(
            180deg,
            var(--pf-surface),
            rgba(198, 45, 45, .025)
          );
        }

        .pf-danger p {
          margin: 0 0 14px;
          color: var(--pf-muted);
          font-size: 10.5px;
          line-height: 1.55;
        }

        /* ---------- UTILITAIRES ---------- */

        .pf-loading {
          min-height: 340px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .pf-error-state {
          padding: 42px;
          text-align: center;
        }

        .pf-error-state p {
          color: var(--pf-muted);
        }

        .pf-error-actions {
          display: flex;
          justify-content: center;
          gap: 8px;
          flex-wrap: wrap;
          margin-top: 18px;
        }

        /* ---------- RESPONSIVE ---------- */

        @media (max-width: 1260px) {
          .pf-layout {
            grid-template-columns: minmax(0, 1fr) 300px;
          }

          .pf-variant-create-grid {
            grid-template-columns: repeat(2, minmax(150px, 1fr));
          }

          .pf-variant-row {
            grid-template-columns:
              48px
              repeat(2, minmax(140px, 1fr))
              minmax(190px, 1.2fr);
          }

          .pf-variant-row > :nth-child(5),
          .pf-variant-row > :nth-child(6),
          .pf-variant-row > :nth-child(7) {
            grid-column: auto;
          }
        }

        @media (max-width: 1080px) {
          .pf-layout {
            grid-template-columns: 1fr;
          }

          .pf-sidebar {
            position: static;
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            align-items: start;
          }

          .pf-sidebar .pf-danger {
            grid-column: 1 / -1;
          }

          .pf-variant-row {
            grid-template-columns:
              48px
              repeat(2, minmax(130px, 1fr));
          }

          .pf-variant-row > :nth-child(4) {
            grid-column: 2 / -1;
          }

          .pf-variant-row > :nth-child(5) {
            grid-column: 2;
          }
        }

        @media (max-width: 760px) {
          .pf-page {
            gap: 14px;
          }

          .pf-header {
            align-items: stretch;
            padding: 17px;
            border-radius: 13px;
          }

          .pf-header-actions {
            width: 100%;
            justify-content: stretch;
          }

          .pf-header-actions .btn {
            flex: 1 1 140px;
          }

          .pf-notice {
            align-items: stretch;
            flex-direction: column;
          }

          .pf-notice-status {
            justify-content: flex-start;
          }

          .pf-layout,
          .pf-sidebar {
            display: flex;
            flex-direction: column;
          }

          .pf-card {
            padding: 17px;
            border-radius: 13px;
          }

          .pf-section-head {
            flex-direction: column;
            margin-bottom: 16px;
            padding-bottom: 14px;
          }

          .pf-section-action {
            width: 100%;
          }

          .pf-section-action .btn {
            width: 100%;
          }

          .pf-grid {
            grid-template-columns: 1fr;
            gap: 14px;
          }

          .pf-span-12,
          .pf-span-8,
          .pf-span-6,
          .pf-span-4 {
            grid-column: 1;
          }

          .pf-upload-grid,
          .pf-variant-create-grid,
          .pf-spec-row,
          .pf-variant-row,
          .pf-stock-entry {
            grid-template-columns: 1fr;
          }

          .pf-variant-create-grid > :nth-child(n),
          .pf-variant-row > :nth-child(n) {
            grid-column: 1;
          }

          .pf-media-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .pf-list-row {
            grid-template-columns: 30px minmax(0, 1fr) 36px;
          }

          .pf-spec-row .pf-remove {
            width: 100%;
          }
        }

        @media (max-width: 480px) {
          .pf-media-grid {
            grid-template-columns: 1fr;
          }

          .pf-checks {
            grid-template-columns: 1fr;
          }

          .pf-check[style] {
            grid-column: 1 !important;
          }
        }
      `}</style>

      <form onSubmit={handleSubmit} className="pf-page">
        {/* EN-TÊTE */}
        <header className="pf-header">
          <div>
            <Link
              to="/admin/catalogue/produits"
              className="pf-back"
            >
              ← Retour aux produits
            </Link>

            <h1 className="pf-title">{titre}</h1>

            <p className="pf-subtitle">
              {isEditing
                ? `SKU : ${p?.sku || '—'} · ${statusLabel(p?.statut)}`
                : 'Renseignez les informations essentielles du produit, puis complétez ses visuels, sa tarification et sa disponibilité.'}
            </p>
          </div>

          <div className="pf-header-actions">
            {isEditing && p?.statut !== 'publie' && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={saving || assetBusy || !productReady}
                onClick={handlePublier}
                title={
                  productReady
                    ? 'Publier le produit'
                    : 'Ajoutez au moins une photo et une variante active.'
                }
              >
                Publier
              </button>
            )}

            {isEditing && p?.statut === 'publie' && (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={saving || assetBusy}
                onClick={handleArchiver}
              >
                Archiver
              </button>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || assetBusy}
            >
              {saving
                ? 'Enregistrement...'
                : isEditing
                  ? 'Enregistrer les modifications'
                  : 'Créer le produit'}
            </button>
          </div>
        </header>

        {/* CONDITIONS DE PUBLICATION */}
        <section
          className={`pf-notice ${
            isEditing && productReady ? 'ready' : ''
          }`}
        >
          <div>
            <strong>
              {isEditing && productReady
                ? 'Produit prêt pour la publication'
                : 'Contrôle avant publication'}
            </strong>

            <p>
              {!isEditing
                ? "Créez d’abord la fiche produit. Ajoutez ensuite au moins une photo et une variante active pour autoriser la publication."
                : productReady
                  ? "Les éléments obligatoires sont complets : le produit peut maintenant être publié."
                  : "La publication reste bloquée tant qu’une photo et une variante active ne sont pas renseignées."}
            </p>
          </div>

          {isEditing && (
            <div className="pf-notice-status">
              <span className={`badge ${statusClass(p?.statut)}`}>
                {statusLabel(p?.statut)}
              </span>

              <span
                className={`badge ${
                  mediaCount > 0 ? 'badge-success' : 'badge-error'
                }`}
              >
                Photos : {mediaCount}
              </span>

              <span
                className={`badge ${
                  activeVariantCount > 0
                    ? 'badge-success'
                    : 'badge-error'
                }`}
              >
                Variantes actives : {activeVariantCount}
              </span>
            </div>
          )}
        </section>

        <div className="pf-layout">
          <main className="pf-main">
            {/* INFORMATIONS PRINCIPALES */}
            <section className="card pf-card">
              <SectionHeader
                eyebrow="Catalogue"
                title="Informations générales"
                description="Identifiez le produit et classez-le correctement dans le catalogue. Les champs marqués d’un astérisque sont obligatoires."
              />

              <div className="pf-grid">
                <div
                  className={`pf-field pf-span-8 ${
                    validationErrors.nom ? 'has-error' : ''
                  }`}
                >
                  <label
                    className="form-label"
                    htmlFor="produit-nom"
                  >
                    Nom commercial du produit
                    <span className="pf-required">*</span>
                  </label>

                  <input
                    id="produit-nom"
                    className="form-input"
                    maxLength={255}
                    required
                    value={form.nom}
                    onChange={(e) =>
                      updateField('nom', e.target.value)
                    }
                    placeholder="Ex. Canapé 3 places Luna"
                  />

                  <FieldError errors={validationErrors.nom} />
                </div>

                <div
                  className={`pf-field pf-span-4 ${
                    validationErrors.sku ? 'has-error' : ''
                  }`}
                >
                  <label
                    className="form-label"
                    htmlFor="produit-sku"
                  >
                    Référence / SKU
                  </label>

                  <input
                    id="produit-sku"
                    className="form-input"
                    maxLength={50}
                    value={form.sku}
                    onChange={(e) =>
                      updateField('sku', e.target.value)
                    }
                    placeholder="Automatique si vide"
                  />

                  <div className="pf-help">
                    Laissez ce champ vide pour générer automatiquement une référence unique.
                  </div>

                  <FieldError errors={validationErrors.sku} />
                </div>

                <div
                  className={`pf-field pf-span-4 ${
                    validationErrors.partenaire_id ? 'has-error' : ''
                  }`}
                >
                  <label
                    className="form-label"
                    htmlFor="produit-partenaire"
                  >
                    Partenaire
                    <span className="pf-required">*</span>
                  </label>

                  <select
                    id="produit-partenaire"
                    className="form-input"
                    required
                    value={form.partenaire_id}
                    onChange={(e) =>
                      handlePartnerChange(e.target.value)
                    }
                  >
                    <option value="">Sélectionner...</option>

                    {partenaires.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.raison_sociale ??
                          item.nom ??
                          `#${item.id}`}
                      </option>
                    ))}
                  </select>

                  <FieldError
                    errors={validationErrors.partenaire_id}
                  />
                </div>

                <div
                  className={`pf-field pf-span-4 ${
                    validationErrors.categorie_id ? 'has-error' : ''
                  }`}
                >
                  <label
                    className="form-label"
                    htmlFor="produit-categorie"
                  >
                    Catégorie
                    <span className="pf-required">*</span>
                  </label>

                  <select
                    id="produit-categorie"
                    className="form-input"
                    required
                    value={form.categorie_id}
                    onChange={(e) =>
                      updateField('categorie_id', e.target.value)
                    }
                  >
                    <option value="">Sélectionner...</option>

                    {categories.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.nom}
                      </option>
                    ))}
                  </select>

                  <FieldError
                    errors={validationErrors.categorie_id}
                  />
                </div>

                <div
                  className={`pf-field pf-span-4 ${
                    validationErrors.collection_id ? 'has-error' : ''
                  }`}
                >
                  <label
                    className="form-label"
                    htmlFor="produit-collection"
                  >
                    Collection
                  </label>

                  <select
                    id="produit-collection"
                    className="form-input"
                    value={form.collection_id}
                    onChange={(e) =>
                      updateField('collection_id', e.target.value)
                    }
                  >
                    <option value="">Aucune collection</option>

                    {visibleCollections.map((item: any) => (
                      <option key={item.id} value={item.id}>
                        {item.nom ??
                          item.libelle ??
                          `Collection #${item.id}`}
                      </option>
                    ))}
                  </select>

                  <FieldError
                    errors={validationErrors.collection_id}
                  />
                </div>
              </div>
            </section>

            {/* DESCRIPTION */}
            <section className="card pf-card">
              <SectionHeader
                eyebrow="Contenu"
                title="Présentation du produit"
              />

              <div className="pf-grid">
                <div className="pf-field pf-span-6">
                  <label
                    className="form-label"
                    htmlFor="produit-style"
                  >
                    Style
                  </label>

                  <input
                    id="produit-style"
                    className="form-input"
                    maxLength={100}
                    value={form.style}
                    onChange={(e) =>
                      updateField('style', e.target.value)
                    }
                    placeholder="Ex. Moderne, contemporain, classique"
                  />

                  <FieldError errors={validationErrors.style} />
                </div>

                <div className="pf-field pf-span-6">
                  <label
                    className="form-label"
                    htmlFor="produit-usage"
                  >
                    Usage recommandé
                  </label>

                  <input
                    id="produit-usage"
                    className="form-input"
                    maxLength={255}
                    value={form.usage_recommande}
                    onChange={(e) =>
                      updateField(
                        'usage_recommande',
                        e.target.value,
                      )
                    }
                    placeholder="Ex. Salon, chambre, bureau, hôtel"
                  />

                  <FieldError
                    errors={validationErrors.usage_recommande}
                  />
                </div>

                <div className="pf-field pf-span-12">
                  <label
                    className="form-label"
                    htmlFor="produit-description"
                  >
                    Description
                  </label>

                  <textarea
                    id="produit-description"
                    className="form-input pf-textarea"
                    rows={7}
                    value={form.description}
                    onChange={(e) =>
                      updateField('description', e.target.value)
                    }
                    placeholder="Décrivez le produit, ses bénéfices, ses matériaux et son utilisation..."
                  />

                  <FieldError
                    errors={validationErrors.description}
                  />
                </div>
              </div>
            </section>

            {/* PHOTOS */}
            <section className="card pf-card">
              <SectionHeader
                eyebrow="Médias"
                title="Visuels du produit"
                description="Ajoutez des photos nettes et cohérentes. La photo principale sera utilisée comme visuel prioritaire dans le catalogue."
              />

              {!isEditing ? (
                <div className="pf-assets-locked">
                  <strong>Enregistrez d'abord le produit</strong>
                  <p>
                    La photo doit être rattachée à un produit existant.
                    Cliquez sur « Créer le produit » ; vous reviendrez
                    automatiquement sur cette page avec la section Photos active.
                  </p>
                </div>
              ) : (
                <>
                  <div className="pf-upload-box">
                    <div className="pf-upload-grid">
                      <div className="pf-field">
                        <label
                          className="form-label"
                          htmlFor="produit-photos"
                        >
                          Ajouter des photos
                        </label>

                        <input
                          id="produit-photos"
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          multiple
                          className="form-input"
                          onChange={handleMediaFiles}
                        />

                        <div className="pf-help">
                          Formats acceptés : JPG, PNG et WEBP. Vous pouvez importer plusieurs images en une seule fois.
                        </div>
                      </div>

                      <div className="pf-field">
                        <label
                          className="form-label"
                          htmlFor="media-alt"
                        >
                          Texte alternatif (accessibilité)
                        </label>

                        <input
                          id="media-alt"
                          className="form-input"
                          value={mediaAlt}
                          onChange={(e) => setMediaAlt(e.target.value)}
                          placeholder={form.nom || 'Description de la photo'}
                        />
                      </div>
                    </div>

                    <div
                      style={{
                        marginTop: 14,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                        flexWrap: 'wrap',
                      }}
                    >
                      <label className="pf-toggle-inline">
                        <input
                          type="checkbox"
                          checked={mediaPrincipale}
                          onChange={(e) =>
                            setMediaPrincipale(e.target.checked)
                          }
                        />
                        Définir la première image comme photo principale
                      </label>

                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={assetBusy || mediaFiles.length === 0}
                        onClick={handleUploadMedia}
                      >
                        {assetBusy
                          ? 'Envoi...'
                          : `Ajouter ${mediaFiles.length || ''} photo${
                              mediaFiles.length > 1 ? 's' : ''
                            }`}
                      </button>
                    </div>
                  </div>

                  {medias.length === 0 ? (
                    <div className="pf-assets-locked" style={{ marginTop: 16 }}>
                      <strong>Aucun visuel enregistré</strong>
                      <p>
                        Ajoutez au moins une photo pour compléter la fiche et autoriser sa publication.
                      </p>
                    </div>
                  ) : (
                    <div className="pf-media-grid">
                      {medias
                        .slice()
                        .sort(
                          (a, b) =>
                            Number(b.principale ?? 0) -
                              Number(a.principale ?? 0) ||
                            Number(a.ordre ?? 0) -
                              Number(b.ordre ?? 0),
                        )
                        .map((media) => (
                          <article
                            key={media.id}
                            className="pf-media-card"
                          >
                            <div className="pf-media-image">
                              {mediaSource(media) ? (
                                <img
                                  src={mediaSource(media)}
                                  alt={media.alt || form.nom}
                                />
                              ) : null}

                              {Boolean(media.principale) && (
                                <span className="badge badge-success pf-main-badge">
                                  Principale
                                </span>
                              )}
                            </div>

                            <div className="pf-media-body">
                              <div className="pf-media-alt">
                                {media.alt || 'Sans texte alternatif'}
                              </div>

                              <div className="pf-media-actions">
                                {!Boolean(media.principale) ? (
                                  <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    disabled={assetBusy}
                                    onClick={() =>
                                      handleSetMainMedia(media.id)
                                    }
                                  >
                                    Principale
                                  </button>
                                ) : (
                                  <span />
                                )}

                                <button
                                  type="button"
                                  className="btn btn-ghost btn-sm"
                                  disabled={assetBusy}
                                  onClick={() =>
                                    handleDeleteMedia(media.id)
                                  }
                                  style={{
                                    color: 'var(--color-error)',
                                  }}
                                >
                                  Supprimer
                                </button>
                              </div>
                            </div>
                          </article>
                        ))}
                    </div>
                  )}
                </>
              )}
            </section>

            {/* VARIANTES */}
            <section className="card pf-card">
              <SectionHeader
                eyebrow="Tarification"
                title="Prix et disponibilité"
                description="Créez au moins une variante active. Chaque variante définit son prix, son éventuelle promotion et son mode de disponibilité."
              />

              {!isEditing ? (
                <div className="pf-assets-locked">
                  <strong>Enregistrez d'abord le produit</strong>
                  <p>
                    Une variante doit être liée à l'identifiant du produit.
                    Après création de la fiche, vous pourrez définir le prix
                    de vente, un prix promotionnel éventuel et l'activer.
                  </p>
                </div>
              ) : (
                <>
                  <div className="pf-variant-create">
                    <div className="pf-variant-create-grid">
                      <div className="pf-field">
                        <label className="form-label">
                          Prix de vente (FCFA)
                          <span className="pf-required">*</span>
                        </label>

                        <input
                          type="number"
                          min={0}
                          step={1}
                          className="form-input"
                          value={variantDraft.prix_vente}
                          onChange={(e) =>
                            updateVariantDraft(
                              'prix_vente',
                              e.target.value,
                            )
                          }
                          placeholder="Ex. 250000"
                        />
                      </div>

                      <div className="pf-field">
                        <label className="form-label">
                          Prix promotionnel (FCFA)
                        </label>

                        <input
                          type="number"
                          min={0}
                          step={1}
                          className="form-input"
                          value={variantDraft.prix_promo}
                          onChange={(e) =>
                            updateVariantDraft(
                              'prix_promo',
                              e.target.value,
                            )
                          }
                          placeholder="Facultatif"
                        />
                      </div>

                      <div className="pf-field">
                        <label className="form-label">
                          Gestion de disponibilité
                        </label>
                        <select
                          className="form-input"
                          value={variantDraft.mode_stock}
                          onChange={(e) =>
                            {
                              const mode = e.target.value as VariantDraft['mode_stock'];
                              updateVariantDraft('mode_stock', mode);
                              if (mode === 'fabrication') setInitialStockQuantity('0');
                            }
                          }
                        >
                          <option value="stock">Géré en stock</option>
                          <option value="fabrication">Fabriqué à la commande</option>
                        </select>
                      </div>

                      {variantDraft.mode_stock === 'stock' && (
                        <>
                          <div className="pf-field">
                            <label className="form-label">Stock initial</label>
                            <input
                              type="number"
                              min={0}
                              step={1}
                              className="form-input"
                              value={initialStockQuantity}
                              onChange={(event) => setInitialStockQuantity(event.target.value)}
                              placeholder="0"
                            />
                          </div>
                          <div className="pf-field">
                            <label className="form-label">Dépôt</label>
                            <select
                              className="form-input"
                              value={initialStockDepotId}
                              disabled={stockDepots.length === 0}
                              onChange={(event) => setInitialStockDepotId(event.target.value)}
                            >
                              <option value="">Sélectionner un dépôt</option>
                              {stockDepots.map((depot) => (
                                <option key={depot.id} value={depot.id}>{depot.nom}</option>
                              ))}
                            </select>
                            {stockDepots.length === 0 && (
                              <small>Aucun dépôt actif. Créez-en un dans la gestion des dépôts.</small>
                            )}
                          </div>
                        </>
                      )}

                      <label className="pf-toggle-inline">
                        <input
                          type="checkbox"
                          checked={variantDraft.active}
                          onChange={(e) =>
                            updateVariantDraft(
                              'active',
                              e.target.checked,
                            )
                          }
                        />
                        Variante active
                      </label>

                      <button
                        type="button"
                        className="btn btn-primary"
                        disabled={assetBusy}
                        onClick={handleCreateVariant}
                      >
                        + Ajouter la variante
                      </button>
                    </div>
                  </div>

                  {variantes.length === 0 ? (
                    <div className="pf-assets-locked" style={{ marginTop: 16 }}>
                      <strong>Aucune variante enregistrée</strong>
                      <p>
                        Ajoutez une variante active avec un prix de vente pour rendre le produit publiable.
                      </p>
                    </div>
                  ) : (
                    <div className="pf-variants">
                      {variantes.map((variant) => {
                        const edit =
                          variantEdits[variant.id] ?? {
                            prix_vente: String(
                              variant.prix_vente ?? '',
                            ),
                            prix_promo:
                              variant.prix_promo !== null &&
                              variant.prix_promo !== undefined
                                ? String(variant.prix_promo)
                                : '',
                            mode_stock: variant.mode_stock ?? 'stock',
                            active: Boolean(variant.active),
                          };

                        return (
                          <div key={variant.id} style={{ display: 'grid', gap: 8 }}>
                          <div className="pf-variant-row">
                            <div className="pf-variant-id">
                              #{variant.id}
                            </div>

                            <div className="pf-field">
                              <label className="form-label">
                                Prix de vente
                              </label>

                              <input
                                type="number"
                                min={0}
                                step={1}
                                className="form-input"
                                value={edit.prix_vente}
                                onChange={(e) =>
                                  updateVariantEdit(
                                    variant.id,
                                    'prix_vente',
                                    e.target.value,
                                  )
                                }
                              />
                            </div>

                            <div className="pf-field">
                              <label className="form-label">
                                Prix promotionnel (FCFA)
                              </label>

                              <input
                                type="number"
                                min={0}
                                step={1}
                                className="form-input"
                                value={edit.prix_promo}
                                onChange={(e) =>
                                  updateVariantEdit(
                                    variant.id,
                                    'prix_promo',
                                    e.target.value,
                                  )
                                }
                              />
                            </div>

                            <div className="pf-field">
                              <label className="form-label">
                                Gestion de disponibilité
                              </label>
                              <select
                                className="form-input"
                                value={edit.mode_stock}
                                onChange={(e) =>
                                  updateVariantEdit(
                                    variant.id,
                                    'mode_stock',
                                    e.target.value as VariantDraft['mode_stock'],
                                  )
                                }
                              >
                                <option value="stock">Géré en stock</option>
                                <option value="fabrication">Fabriqué à la commande</option>
                              </select>
                            </div>

                            <div>
                              <div className="pf-variant-stock">
                                Stock : {availableVariantStock(variant)}
                              </div>

                              <label
                                className="pf-toggle-inline"
                                style={{ marginTop: 7 }}
                              >
                                <input
                                  type="checkbox"
                                  checked={edit.active}
                                  onChange={(e) =>
                                    updateVariantEdit(
                                      variant.id,
                                      'active',
                                      e.target.checked,
                                    )
                                  }
                                />
                                Variante active
                              </label>
                            </div>

                            <button
                              type="button"
                              className="btn btn-secondary btn-sm"
                              disabled={assetBusy}
                              onClick={() =>
                                handleUpdateVariant(variant.id)
                              }
                            >
                              Enregistrer
                            </button>

                            <button
                              type="button"
                              className="btn btn-ghost btn-sm"
                              disabled={assetBusy}
                              onClick={() =>
                                handleDeleteVariant(variant.id)
                              }
                              style={{
                                color: 'var(--color-error)',
                              }}
                            >
                              Supprimer
                            </button>
                          </div>
                          {edit.mode_stock === 'stock' && (
                            <div className="pf-stock-entry">
                              <strong>Ajouter du stock disponible</strong>
                              <select
                                className="form-input"
                                aria-label={`Dépôt pour ${variant.id}`}
                                value={stockDrafts[variant.id]?.depot_id ?? String(stockDepots[0]?.id ?? '')}
                                disabled={stockDepots.length === 0}
                                onChange={(event) => setStockDrafts((current) => ({
                                  ...current,
                                  [variant.id]: {
                                    depot_id: event.target.value,
                                    quantite: current[variant.id]?.quantite ?? '',
                                  },
                                }))}
                              >
                                <option value="">Sélectionner un dépôt</option>
                                {stockDepots.map((depot) => (
                                  <option key={depot.id} value={depot.id}>{depot.nom}</option>
                                ))}
                              </select>
                              <input
                                type="number"
                                min={1}
                                step={1}
                                className="form-input"
                                aria-label={`Quantité de stock à ajouter pour ${variant.id}`}
                                placeholder="Quantité"
                                value={stockDrafts[variant.id]?.quantite ?? ''}
                                onChange={(event) => setStockDrafts((current) => ({
                                  ...current,
                                  [variant.id]: {
                                    depot_id: current[variant.id]?.depot_id ?? String(stockDepots[0]?.id ?? ''),
                                    quantite: event.target.value,
                                  },
                                }))}
                              />
                              <button
                                type="button"
                                className="btn btn-secondary btn-sm"
                                disabled={assetBusy || stockDepots.length === 0 || variant.mode_stock !== 'stock'}
                                onClick={() => handleAddVariantStock(variant.id)}
                              >
                                Ajouter
                              </button>
                              {variant.mode_stock !== 'stock' && (
                                <small>Enregistrez d’abord le mode « Géré en stock » de cette variante.</small>
                              )}
                              {stockDepots.length === 0 && (
                                <small>Aucun dépôt actif disponible.</small>
                              )}
                            </div>
                          )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </section>

            {/* POINTS FORTS */}
            <section className="card pf-card">
              <SectionHeader
                eyebrow="Arguments commerciaux"
                title="Points forts du produit"
                action={
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={addPointFort}
                  >
                    + Ajouter la variante un point
                  </button>
                }
              />

              <div className="pf-list">
                {pointsForts.map((point, index) => (
                  <div key={index} className="pf-list-row">
                    <span className="pf-row-number">{index + 1}</span>

                    <input
                      className="form-input"
                      value={point}
                      onChange={(e) =>
                        updatePointFort(index, e.target.value)
                      }
                      placeholder="Ex. Structure renforcée, finition premium, entretien facile"
                    />

                    <button
                      type="button"
                      className="btn btn-ghost btn-sm pf-remove"
                      onClick={() => removePointFort(index)}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <FieldError errors={validationErrors.points_forts} />
            </section>

            {/* FICHE TECHNIQUE */}
            <section className="card pf-card">
              <SectionHeader
                eyebrow="Données techniques"
                title="Caractéristiques techniques"
                action={
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={addSpecification}
                  >
                    + Ajouter une caractéristique
                  </button>
                }
              />

              <div className="pf-list">
                {specifications.map((row, index) => (
                  <div key={index} className="pf-spec-row">
                    <input
                      className="form-input"
                      value={row.cle}
                      onChange={(e) =>
                        updateSpecification(
                          index,
                          'cle',
                          e.target.value,
                        )
                      }
                      placeholder="Ex. Dimensions"
                    />

                    <input
                      className="form-input"
                      value={row.valeur}
                      onChange={(e) =>
                        updateSpecification(
                          index,
                          'valeur',
                          e.target.value,
                        )
                      }
                      placeholder="Ex. 220 × 95 × 85 cm"
                    />

                    <button
                      type="button"
                      className="btn btn-ghost btn-sm pf-remove"
                      onClick={() =>
                        removeSpecification(index)
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>

              <FieldError
                errors={validationErrors.fiche_technique}
              />
            </section>
          </main>

          {/* COLONNE DROITE */}
          <aside className="pf-sidebar">
            <section className="card pf-card">
              <SectionHeader
                eyebrow="Paramètres"
                title="Garantie et délai"
              />

              <div className="pf-grid">
                <div className="pf-field pf-span-12">
                  <label
                    className="form-label"
                    htmlFor="produit-garantie"
                  >
                    Durée de garantie (mois)
                  </label>

                  <input
                    id="produit-garantie"
                    type="number"
                    min={0}
                    step={1}
                    className="form-input"
                    value={form.garantie_mois}
                    onChange={(e) =>
                      updateField(
                        'garantie_mois',
                        e.target.value,
                      )
                    }
                    placeholder="Ex. 12"
                  />

                  <FieldError
                    errors={validationErrors.garantie_mois}
                  />
                </div>

                <div className="pf-field pf-span-12">
                  <label
                    className="form-label"
                    htmlFor="produit-delai"
                  >
                    Délai de fabrication (en jours)
                  </label>

                  <input
                    id="produit-delai"
                    type="number"
                    min={0}
                    step={1}
                    className="form-input"
                    value={form.delai_fabrication_jours}
                    onChange={(e) =>
                      updateField(
                        'delai_fabrication_jours',
                        e.target.value,
                      )
                    }
                    placeholder="Ex. 15"
                  />

                  <FieldError
                    errors={
                      validationErrors.delai_fabrication_jours
                    }
                  />
                </div>
              </div>

              <div style={{ marginTop: 16 }}>
                <label className="pf-toggle">
                  <input
                    type="checkbox"
                    checked={form.mis_en_avant}
                    onChange={(e) =>
                      updateField(
                        'mis_en_avant',
                        e.target.checked,
                      )
                    }
                  />

                  <span>
                    <strong>Mettre en avant</strong>
                    <span>
                      Afficher ce produit dans les sélections et emplacements mis en avant du catalogue.
                    </span>
                  </span>
                </label>
              </div>
            </section>

            <section className="card pf-card">
              <SectionHeader
                eyebrow="Publication"
                title="Publication et contrôle"
              />

              <dl className="pf-meta">
                <div className="pf-meta-row">
                  <dt>Statut</dt>
                  <dd>
                    <span className={`badge ${statusClass(p?.statut)}`}>
                      {statusLabel(p?.statut)}
                    </span>
                  </dd>
                </div>

                <div className="pf-meta-row">
                  <dt>SKU</dt>
                  <dd>{p?.sku || form.sku || 'Automatique'}</dd>
                </div>

                <div className="pf-meta-row">
                  <dt>Slug</dt>
                  <dd>{p?.slug || 'Généré à la création'}</dd>
                </div>

                {isEditing && (
                  <div className="pf-meta-row">
                    <dt>ID</dt>
                    <dd>#{produitId}</dd>
                  </div>
                )}
              </dl>

              {isEditing && (
                <div className="pf-checks">
                  <div className="pf-check">
                    <div className="pf-check-label">
                      Photos
                    </div>
                    <div className="pf-check-value">
                      {mediaCount}
                    </div>
                  </div>

                  <div className="pf-check">
                    <div className="pf-check-label">
                      Variantes actives
                    </div>
                    <div className="pf-check-value">
                      {activeVariantCount}
                    </div>
                  </div>

                  <div
                    className="pf-check"
                    style={{ gridColumn: '1 / -1' }}
                  >
                    <div className="pf-check-label">
                      Publication
                    </div>

                    <div
                      className="pf-check-value"
                      style={{
                        color: productReady
                          ? 'var(--color-success)'
                          : 'var(--color-error)',
                      }}
                    >
                      {productReady
                        ? 'Prêt à publier'
                        : 'Publication incomplète'}
                    </div>
                  </div>
                </div>
              )}
            </section>

            {isEditing && (
              <section className="card pf-card pf-danger">
                <SectionHeader
                  eyebrow="Attention"
                  title="Zone sensible"
                />

                <p>
                  La suppression est logique (Soft Delete) : le produit sera archivé sans être effacé définitivement de la base.
                </p>

                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={saving || assetBusy}
                  onClick={handleDelete}
                  style={{
                    width: '100%',
                    color: 'var(--color-error)',
                  }}
                >
                  Supprimer le produit
                </button>
              </section>
            )}
          </aside>
        </div>
      </form>
    </>
  );
}
