import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { clientApi } from '../../api/client-api';
import type { Produit } from '../../types';
import { formatPrix } from '../../utils/format';
import { useCartStore } from '../../store/cartStore';
import { IconHeart, IconCart } from '../../components/ui/Icons';

export default function FavorisPage() {
  const [favoris, setFavoris] = useState<Produit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const { addItem } = useCartStore();

  useEffect(() => {
    let active = true;
    clientApi.favoris()
      .then((response) => {
        if (active) setFavoris(response.data);
      })
      .catch(() => {
        if (active) {
          setLoadError(true);
          toast.error('Impossible de charger vos favoris.');
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handleToggle = async (id: number) => {
    setBusyId(id);
    try {
      const response = await clientApi.toggleFavori(id);
      if (!response.data.favori) setFavoris((current) => current.filter((product) => product.id !== id));
      toast.success(response.data.message || 'Favoris mis à jour.');
    } catch {
      toast.error('Impossible de modifier vos favoris.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-2xl)', fontWeight: 700, marginBottom: 'var(--space-6)' }}>Mes favoris</h1>
      {loading ? <div className="page-loader"><div className="spinner" /></div> :
        loadError ? <div className="empty-state"><h3>Favoris indisponibles</h3><p>Une erreur est survenue pendant le chargement de vos favoris.</p></div> :
        favoris.length === 0 ? (
          <div className="empty-state">
            <IconHeart size={48} style={{ margin: '0 auto 12px', opacity: .3 }} />
            <h3>Aucun favori</h3>
            <p>Ajoutez des produits à vos favoris pour les retrouver facilement.</p>
            <Link to="/catalogue" className="btn btn-primary" style={{ marginTop: 16 }}>Explorer le catalogue</Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
            {favoris.map((product) => {
              const img = product.medias?.find((media) => media.est_principale)?.url ?? product.medias?.[0]?.url;
              const variant = product.variantes?.[0];
              return (
                <div key={product.id} className="card" style={{ overflow: 'hidden' }}>
                  <div style={{ position: 'relative', aspectRatio: '4/3', background: 'var(--color-ivoire)' }}>
                    {img ? <img src={img} alt={product.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> :
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-gris-clair)' }}><IconHeart size={32} /></div>}
                    <button disabled={busyId === product.id} onClick={() => handleToggle(product.id)} aria-label={`Retirer ${product.nom} des favoris`} style={{ position: 'absolute', top: 8, right: 8, width: 32, height: 32, borderRadius: '50%', background: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-error)' }}>
                      <IconHeart size={14} />
                    </button>
                  </div>
                  <div style={{ padding: 'var(--space-3)' }}>
                    <Link to={`/catalogue/${product.slug}`} style={{ textDecoration: 'none' }}>
                      <h3 style={{ fontFamily: 'var(--font-display)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-charbon)', marginBottom: 8 }}>{product.nom}</h3>
                    </Link>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: 700, color: 'var(--color-terra)', fontSize: 'var(--text-sm)' }}>{formatPrix(product.prix_min)}</span>
                      {variant && (
                        <button type="button" aria-label={`Ajouter ${product.nom} au panier`} onClick={() => {
                          const added = addItem({ ...variant, produit: { nom: product.nom, slug: product.slug, medias: product.medias } });
                          if (added) toast.success('Ajouté au panier.');
                          else toast.error('Stock insuffisant pour cette variante.');
                        }} style={{ width: 28, height: 28, borderRadius: 8, background: 'var(--color-terra)', color: 'white', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <IconCart size={12} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
    </div>
  );
}
