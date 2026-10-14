import React, { useEffect, useState } from 'react';
import { useParams, Link, useLocation, useNavigate } from 'react-router-dom';
import { publicApi } from '../../api/public';
import type { Produit, Variante, Avis, Media } from '../../types';
import { formatPrix, formatDate } from '../../utils/format';
import { useCartStore } from '../../store/cartStore';
import { IconCart, IconHeart, IconDownload, IconCube, IconCheck } from '../../components/ui/Icons';
import toast from 'react-hot-toast';
import { clientApi } from '../../api/client-api';
import { useAuthStore } from '../../store/authStore';

type ProduitDetail = Omit<Produit, 'points_forts' | 'variantes' | 'medias'> & {
  points_forts?: string[];
  variantes?: Array<Variante & {
    nom?: string | null;
    materiau?: string | null;
    finition?: string | null;
    coloris?: string | null;
    mode_stock?: 'stock' | 'fabrication';
    par_defaut?: boolean;
    longueur_cm?: number | null;
    largeur_cm?: number | null;
    hauteur_cm?: number | null;
    poids_kg?: number | null;
  }>;
  medias?: Media[];
  plans?: Array<{ id: number; type: string; url: string }>;
  fiche_technique?: Record<string, string | number | null> | null;
  garantie_mois?: number;
  avis_avg_note?: number | null;
  avis_count?: number;
};

function Viewer3D({ url }: { url: string }) {
  return (
    <div style={{ width: '100%', height: 380, background: 'var(--color-ivoire-dark)', borderRadius: 'var(--radius-lg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gris-moyen)' }}>
      <div style={{ textAlign: 'center' }}>
        <IconCube size={32} style={{ margin: '0 auto 8px', opacity: .4 }} />
        <p style={{ fontSize: 'var(--text-sm)' }}>Visualiseur 3D · {url.split('/').pop()}</p>
        <a href={url} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm" style={{ marginTop: 12 }}>Télécharger le modèle 3D</a>
      </div>
    </div>
  );
}

export default function ProduitDetailPage() {
  const { slug } = useParams();
  const [produit, setProduit] = useState<ProduitDetail | null>(null);
  const [avis, setAvis] = useState<Avis[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedMedia, setSelectedMedia] = useState(0);
  const [selectedVariante, setSelectedVariante] = useState<NonNullable<ProduitDetail['variantes']>[number] | null>(null);
  const [quantite, setQuantite] = useState(1);
  const [tab, setTab] = useState<'description'|'technique'|'avis'>('description');
  const { addItem, items: cartItems } = useCartStore();
  const user = useAuthStore((state) => state.user);
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    let mounted = true;
    const productSlug = slug;
    setLoading(true);
    setLoadError(null);
    setProduit(null);

    if (!productSlug) {
      setLoadError('Le produit demandé est introuvable.');
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    async function loadProduct(currentSlug: string) {
      const [productResult, reviewsResult] = await Promise.allSettled([
        publicApi.produit(currentSlug),
        publicApi.avis(currentSlug),
      ]);

      if (!mounted) return;

      if (productResult.status === 'rejected') {
        setProduit(null);
        const status = (productResult.reason as { response?: { status?: number } })
          ?.response?.status;
        const message = status === 404
          ? 'Produit introuvable.'
          : 'Impossible de charger ce produit.';
        setLoadError(message);
        if (status !== 404) toast.error(message);
        setLoading(false);
        return;
      }

      const raw = productResult.value.data as unknown as Record<string, any>;
      const variantes = (raw.variantes ?? []).map((variant: Record<string, any>) => ({
        ...variant,
        libelle:
          variant.libelle ??
          variant.nom ??
          ([variant.materiau, variant.coloris, variant.finition]
            .filter(Boolean)
            .join(' / ') || variant.sku),
        produit_id: variant.produit_id ?? raw.id,
      }));
      const medias = (raw.medias ?? []).map((media: Record<string, any>) => ({
        ...media,
        est_principale: media.est_principale ?? media.principale,
      }));
      const prod: ProduitDetail = {
        ...raw,
        reference: raw.reference ?? raw.sku ?? '',
        est_mis_en_avant: raw.est_mis_en_avant ?? raw.mis_en_avant ?? false,
        note_moyenne: raw.note_moyenne ?? raw.avis_avg_note ?? undefined,
        nombre_avis: raw.nombre_avis ?? raw.avis_count ?? 0,
        points_forts: Array.isArray(raw.points_forts)
          ? raw.points_forts
          : typeof raw.points_forts === 'string'
            ? raw.points_forts.split('\n').filter(Boolean)
            : [],
        partenaire: raw.partenaire
          ? {
              ...raw.partenaire,
              nom: raw.partenaire.nom ?? raw.partenaire.raison_sociale,
            }
          : undefined,
        variantes,
        medias,
        plans: raw.plans ?? [],
      } as ProduitDetail;

      setProduit(prod);
      setSelectedVariante(
        prod.variantes?.find((variant) => variant.par_defaut) ??
          prod.variantes?.[0] ??
          null,
      );
      const mainMediaIndex = medias.findIndex(
        (media: { est_principale?: boolean }) => media.est_principale,
      );
      setSelectedMedia(Math.max(0, mainMediaIndex));

      if (reviewsResult.status === 'fulfilled') {
        const reviewsData = reviewsResult.value.data as unknown as { data?: Avis[] } | Avis[];
        const reviewItems = Array.isArray(reviewsData) ? reviewsData : reviewsData.data ?? [];
        setAvis(reviewItems.map((review) => {
          const client = (review as Avis & {
            client?: { nom?: string; prenoms?: string };
          }).client;
          const clientName = [client?.prenoms, client?.nom]
            .filter(Boolean)
            .join(' ');

          return {
            ...review,
            user: review.user ?? (clientName ? { name: clientName } : undefined),
          };
        }));
      } else {
        setAvis([]);
        toast.error('Les avis de ce produit sont indisponibles pour le moment.');
      }

      setLoading(false);
    }

    loadProduct(productSlug).catch(() => {
      if (mounted) {
        setLoadError('Impossible de charger ce produit.');
        setLoading(false);
        toast.error('Impossible de charger ce produit.');
      }
    });

    return () => {
      mounted = false;
    };
  }, [slug]);

  if (loading) return <div className="page-loader"><div className="spinner" /></div>;
  if (!produit) return <div className="empty-state"><h3>{loadError ?? 'Produit introuvable'}</h3><Link to="/catalogue" className="btn btn-primary" style={{ marginTop: 16 }}>Retour au catalogue</Link></div>;

  const photos = produit.medias?.filter(m => m.type === 'photo' || m.type === 'ambiance') ?? [];
  const model3d = produit.plans?.find(plan => plan.type === 'modele_3d');
  const plan2d = produit.plans?.find(plan => plan.type === 'plan_2d');
  const currentMedia = photos[selectedMedia];
  const prix = selectedVariante?.prix_promo ?? selectedVariante?.prix_vente ?? produit.prix_min;
  const stockDisponible = selectedVariante?.stock_disponible ?? 0;
  const surCommande = selectedVariante?.mode_stock === 'fabrication';
  const quantiteDansPanier = cartItems.find((item) => item.variante.id === selectedVariante?.id)?.quantite ?? 0;
  const quantiteMaximale = surCommande ? Number.POSITIVE_INFINITY : Math.max(0, stockDisponible - quantiteDansPanier);

  const handleAddToCart = () => {
    if (!selectedVariante) { toast.error('Sélectionnez une variante'); return; }
    const added = addItem({ ...selectedVariante, produit: { nom: produit.nom, slug: produit.slug, medias: produit.medias } }, quantite);
    if (!added) {
      toast.error(stockDisponible === 0 ? 'Cette variante est en rupture de stock.' : `Stock disponible insuffisant. Il reste ${quantiteMaximale} unité${quantiteMaximale > 1 ? 's' : ''} ajoutable(s).`);
      return;
    }
    toast.success(`${produit.nom} ajouté au panier !`);
  };

  const handleToggleFavorite = async () => {
    if (!isAuthenticated || !user) {
      navigate(`/connexion?redirect=${encodeURIComponent(location.pathname)}`);
      return;
    }
    if (user.role !== 'client' && !user.roles?.includes('client')) {
      toast.error('Les favoris sont disponibles dans un compte client.');
      return;
    }
    try {
      const response = await clientApi.toggleFavori(produit.id);
      toast.success(response.data.message || (response.data.favori ? 'Ajouté aux favoris.' : 'Retiré des favoris.'));
    } catch {
      toast.error('Impossible de mettre à jour vos favoris.');
    }
  };

  return (
    <div style={{ background: 'var(--color-ivoire)', minHeight: '100vh' }}>
      {/* Fil d'Ariane */}
      <div style={{ background: 'var(--color-blanc)', borderBottom: '1px solid var(--color-ivoire-dark)', padding: '12px 0' }}>
        <div className="container" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 'var(--text-xs)', color: 'var(--color-gris-moyen)' }}>
          <Link to="/">Accueil</Link> <span>/</span>
          <Link to="/catalogue">Catalogue</Link> <span>/</span>
          {produit.categorie && <><Link to={`/catalogue?categorie=${produit.categorie.slug}`}>{produit.categorie.nom}</Link> <span>/</span></>}
          <span style={{ color: 'var(--color-charbon)', fontWeight: 500 }}>{produit.nom}</span>
        </div>
      </div>

      <div className="container" style={{ padding: 'var(--space-8) var(--space-6)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 340px), 1fr))', gap: 'var(--space-10)' }}>

          {/* Galerie */}
          <div>
            <div style={{ position: 'relative', aspectRatio: '4/3', borderRadius: 'var(--radius-xl)', overflow: 'hidden', background: 'var(--color-blanc)', boxShadow: 'var(--shadow-md)', marginBottom: 'var(--space-4)' }}>
              {currentMedia ? (
                <img src={currentMedia.url} alt={produit.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gris-clair)' }}>
                  <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
                </div>
              )}
            </div>
            {photos.length > 1 && (
              <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
                {photos.map((m, i) => (
                  <button key={m.id} onClick={() => setSelectedMedia(i)} style={{
                    width: 72, height: 72, borderRadius: 'var(--radius-md)', overflow: 'hidden',
                    border: `2px solid ${i === selectedMedia ? 'var(--color-terra)' : 'transparent'}`,
                    cursor: 'pointer', flexShrink: 0,
                  }}>
                    <img src={m.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
              </div>
            )}
            {model3d && (
              <div style={{ marginTop: 'var(--space-4)' }}>
                <Viewer3D url={model3d.url} />
              </div>
            )}
          </div>

          {/* Infos produit */}
          <div>
            <div style={{ position: 'sticky', top: 90 }}>
              <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
                {produit.categorie && <span className="badge badge-neutral">{produit.categorie.nom}</span>}
                {produit.est_mis_en_avant && <span className="badge badge-warning">⭐ Coup de cœur</span>}
              </div>

              <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-charbon)', lineHeight: 1.2, marginBottom: 8 }}>{produit.nom}</h1>

              <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gris-moyen)', marginBottom: 'var(--space-4)' }}>
                Par <strong style={{ color: 'var(--color-bois)' }}>{produit.partenaire?.nom}</strong> · Réf. {produit.reference}
              </p>

              {produit.note_moyenne && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 'var(--space-4)' }}>
                  {[1,2,3,4,5].map(i => (
                    <svg key={i} width="16" height="16" viewBox="0 0 24 24" fill={i <= Math.round(produit.note_moyenne!) ? 'var(--color-warning)' : 'none'} stroke="var(--color-warning)" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                  ))}
                  <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gris-moyen)' }}>{produit.note_moyenne?.toFixed(1)} ({produit.nombre_avis} avis)</span>
                </div>
              )}

              {/* Prix */}
              <div style={{ background: 'var(--color-ivoire)', borderRadius: 'var(--radius-lg)', padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                  <span style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-3xl)', fontWeight: 700, color: 'var(--color-terra)' }}>{formatPrix(prix)}</span>
                  {selectedVariante?.prix_promo && (
                    <span style={{ fontSize: 'var(--text-base)', color: 'var(--color-gris-clair)', textDecoration: 'line-through' }}>{formatPrix(selectedVariante.prix_vente)}</span>
                  )}
                </div>
                <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gris-moyen)', marginTop: 4 }}>
                  TTC · {surCommande
                    ? <span style={{ color: 'var(--color-bois)', fontWeight: 600 }}>Fabriqué à la commande</span>
                    : stockDisponible > 0
                      ? <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>✓ En stock ({stockDisponible})</span>
                      : <span style={{ color: 'var(--color-error)' }}>Rupture de stock</span>}
                </p>
              </div>

              {/* Variantes */}
              {produit.variantes && produit.variantes.length > 1 && (
                <div style={{ marginBottom: 'var(--space-5)' }}>
                  <p className="form-label" style={{ marginBottom: 8 }}>Déclinaison</p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                    {produit.variantes.map(v => (
                      <button type="button" key={v.id} onClick={() => { setSelectedVariante(v); setQuantite(1); }} style={{
                        padding: '8px 14px', borderRadius: 'var(--radius-md)', border: 'none', cursor: 'pointer',
                        background: selectedVariante?.id === v.id ? 'var(--color-terra)' : 'var(--color-ivoire-dark)',
                        color: selectedVariante?.id === v.id ? 'white' : 'var(--color-gris-fonce)',
                        fontSize: 'var(--text-xs)', fontWeight: 600,
                        transition: 'all 200ms',
                      }}>{v.libelle || v.sku}{v.mode_stock === 'stock' ? ` · ${v.stock_disponible ?? 0} dispo` : ''}</button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quantité */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 'var(--space-5)' }}>
                <p className="form-label">Quantité</p>
                <div style={{ display: 'flex', alignItems: 'center', border: '1.5px solid var(--color-beige)', borderRadius: 'var(--radius-md)', overflow: 'hidden' }}>
                  <button type="button" onClick={() => setQuantite(q => Math.max(1, q - 1))} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 18, color: 'var(--color-gris-fonce)', background: 'transparent', border: 'none' }}>−</button>
                  <span style={{ padding: '0 16px', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-charbon)', minWidth: 32, textAlign: 'center' }}>{quantite}</span>
                  <button type="button" disabled={quantite >= quantiteMaximale} onClick={() => setQuantite(q => Math.min(quantiteMaximale, q + 1))} style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: quantite >= quantiteMaximale ? 'not-allowed' : 'pointer', fontSize: 18, color: 'var(--color-gris-fonce)', background: 'transparent', border: 'none', opacity: quantite >= quantiteMaximale ? .4 : 1 }}>+</button>
                </div>
              </div>

              {/* Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <button type="button" disabled={!selectedVariante || (!surCommande && stockDisponible <= quantiteDansPanier)} onClick={handleAddToCart} className="btn btn-primary btn-lg" style={{ justifyContent: 'center' }}>
                  <IconCart size={18} /> Ajouter au panier
                </button>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button type="button" onClick={handleToggleFavorite} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', gap: 6 }}>
                    <IconHeart size={16} /> Favori
                  </button>
                  <Link to={`/espace-client/devis/nouveau?produit=${produit.slug}${selectedVariante ? `&variante=${selectedVariante.id}` : ''}`} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center', gap: 6, textDecoration: 'none' }}>
                    Demander un devis
                  </Link>
                </div>
              </div>

              {/* Téléchargements */}
              {plan2d && (
                <div style={{ marginTop: 'var(--space-4)', padding: 'var(--space-3)', background: 'var(--color-ivoire)', borderRadius: 'var(--radius-md)' }}>
                  <a href={plan2d.url} download className="btn btn-ghost btn-sm" style={{ gap: 6, color: 'var(--color-bois)' }}>
                    <IconDownload size={14} /> Télécharger le plan 2D
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Onglets */}
        <div style={{ marginTop: 'var(--space-12)' }}>
          <div style={{ display: 'flex', gap: 0, borderBottom: '2px solid var(--color-ivoire-dark)', marginBottom: 'var(--space-6)' }}>
            {(['description','technique','avis'] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '12px 24px', border: 'none', background: 'transparent', cursor: 'pointer',
                fontSize: 'var(--text-sm)', fontWeight: 600,
                color: tab === t ? 'var(--color-terra)' : 'var(--color-gris-moyen)',
                borderBottom: `2px solid ${tab === t ? 'var(--color-terra)' : 'transparent'}`,
                marginBottom: -2, transition: 'all 200ms',
              }}>
                {t === 'description' ? 'Description' : t === 'technique' ? 'Fiche technique' : `Avis (${avis.length})`}
              </button>
            ))}
          </div>

          {tab === 'description' && (
            <div style={{ maxWidth: 720 }}>
              <p style={{ color: 'var(--color-gris-fonce)', lineHeight: 1.8, marginBottom: 'var(--space-5)' }}>{produit.description ?? 'Aucune description disponible.'}</p>
              {produit.points_forts && produit.points_forts.length > 0 && (
                <div>
                  <h4 style={{ fontWeight: 600, marginBottom: 'var(--space-3)', color: 'var(--color-charbon)' }}>Points forts</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {produit.points_forts.map((pt, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                        <div style={{ width: 20, height: 20, borderRadius: '50%', background: 'rgba(61,139,95,.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 2 }}>
                          <IconCheck size={11} color="var(--color-success)" />
                        </div>
                        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gris-fonce)' }}>{pt}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {tab === 'technique' && (
            <div className="table-wrapper" style={{ maxWidth: 600 }}>
              <table className="table">
                <tbody>
                  {[
                    ['Référence', selectedVariante?.sku ?? produit.reference],
                    ['Dimensions', selectedVariante?.longueur_cm
                      ? `${selectedVariante.longueur_cm}×${selectedVariante.largeur_cm ?? '—'}×${selectedVariante.hauteur_cm ?? '—'} cm`
                      : '—'],
                    ['Poids', selectedVariante?.poids_kg ? `${selectedVariante.poids_kg} kg` : '—'],
                    ['Matériaux', selectedVariante?.materiau ?? produit.fiche_technique?.materiaux ?? '—'],
                    ['Finitions', selectedVariante?.finition ?? produit.fiche_technique?.finitions ?? '—'],
                    ['Coloris', selectedVariante?.coloris ?? produit.fiche_technique?.coloris ?? '—'],
                    ['Style', produit.style ?? '—'],
                    ['Garantie', produit.garantie_mois ? `${produit.garantie_mois} mois` : '—'],
                    ...Object.entries(produit.fiche_technique ?? {})
                      .filter(([key]) => !['materiaux', 'finitions', 'coloris'].includes(key))
                      .map(([key, value]) => [key, value ?? '—']),
                  ].map(([k, v]) => (
                    <tr key={k}>
                      <td style={{ fontWeight: 600, width: '40%', color: 'var(--color-gris-fonce)' }}>{k}</td>
                      <td>{v}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {tab === 'avis' && (
            <div style={{ maxWidth: 640 }}>
              {avis.length === 0 ? (
                <div className="empty-state" style={{ paddingTop: 40 }}>
                  <p>Aucun avis pour ce produit. Soyez le premier à donner votre avis !</p>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                  {avis.map(a => (
                    <div key={a.id} className="card" style={{ padding: 'var(--space-5)' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                        <div style={{ display: 'flex', gap: 2 }}>
                          {[1,2,3,4,5].map(i => (
                            <svg key={i} width="14" height="14" viewBox="0 0 24 24" fill={i <= a.note ? 'var(--color-warning)' : 'none'} stroke="var(--color-warning)" strokeWidth="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
                          ))}
                        </div>
                        <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{a.user?.name}</span>
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gris-moyen)' }}>{formatDate(a.created_at)}</span>
                      </div>
                      {a.commentaire && <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gris-fonce)', lineHeight: 1.6 }}>{a.commentaire}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
