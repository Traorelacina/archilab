import React, { useEffect, useState, useCallback, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { publicApi } from '../../api/public';
import type { Produit, Categorie } from '../../types';
import { formatPrix } from '../../utils/format';
import { useCartStore } from '../../store/cartStore';
import { IconSearch, IconFilter, IconCart, IconCube, IconHeart, IconX } from '../../components/ui/Icons';
import toast from 'react-hot-toast';

type Filters = {
  q: string;
  categorie: string;
  collection: string;
  partenaire: string;
  prix_min: string;
  prix_max: string;
  disponible: boolean;
};

const filtersFromParams = (params: URLSearchParams): Filters => ({
  q: params.get('q') ?? params.get('recherche') ?? '',
  categorie: params.get('categorie') ?? '',
  collection: params.get('collection') ?? '',
  partenaire: params.get('partenaire') ?? '',
  prix_min: params.get('prix_min') ?? '',
  prix_max: params.get('prix_max') ?? '',
  disponible: params.get('disponible') === '1',
});

const sameFilters = (a: Filters, b: Filters) =>
  (Object.keys(a) as (keyof Filters)[]).every(k => a[k] === b[k]);

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap');

  .ct-page {
    --ct-ink: #1d2a22;
    --ct-forest: #22332a;
    --ct-forest-2: #2e4236;
    --ct-accent: #5f7a65;
    --ct-accent-hover: #4a6350;
    --ct-text: #3b4a40;
    --ct-muted: #66736a;
    --ct-light: #f4f6f2;
    --ct-mist: #e9eee7;
    --ct-line: #dde3da;
    --ct-brass: #c0975a;
    --font-display: 'Fraunces', Georgia, serif;
    --font-body: 'DM Sans', system-ui, -apple-system, sans-serif;
    --ease: cubic-bezier(.22,.8,.24,1);
    background: #fff; color: var(--ct-text);
    font-family: var(--font-body); font-size: 15px; -webkit-font-smoothing: antialiased;
  }
  .ct-page *, .ct-page *::before, .ct-page *::after { box-sizing: border-box; }
  .ct-page :focus-visible { outline: 2px solid var(--ct-brass); outline-offset: 3px; }
  .ct-wrap { width: min(1380px, calc(100% - 80px)); margin: 0 auto; }

  /* EN-TÊTE */
  .ct-hero { position: relative; background: var(--ct-forest); color: #fff; overflow: hidden; isolation: isolate; }
  .ct-hero::before {
    content: ''; position: absolute; inset: 0; z-index: -1; opacity: .55;
    background-image: linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: radial-gradient(ellipse at 85% 20%, #000, transparent 70%);
    -webkit-mask-image: radial-gradient(ellipse at 85% 20%, #000, transparent 70%);
  }
  .ct-hero::after {
    content: ''; position: absolute; z-index: -1; right: -120px; top: -160px; width: 520px; height: 520px; border-radius: 50%;
    background: radial-gradient(circle, rgba(192,151,90,.28), transparent 68%);
    animation: ct-drift 12s ease-in-out infinite alternate;
  }
  @keyframes ct-drift { to { transform: translate(-70px, 50px) scale(1.15); } }
  .ct-hero-inner { padding: 70px 0 64px; display: flex; align-items: flex-end; justify-content: space-between; gap: 30px; flex-wrap: wrap; }
  .ct-crumb { display: flex; gap: 10px; margin-bottom: 22px; font-size: 14px; font-weight: 500; color: rgba(255,255,255,.7); }
  .ct-crumb a { color: inherit; text-decoration: none; transition: color .25s; }
  .ct-crumb a:hover { color: var(--ct-brass); }
  .ct-hero h1 {
    margin: 0; font-family: var(--font-display); font-weight: 700;
    font-size: clamp(2.6rem, 5.4vw, 5rem); letter-spacing: -.04em; line-height: 1;
  }
  .ct-line { display: block; overflow: hidden; padding-bottom: .12em; margin-bottom: -.12em; }
  .ct-line > span { display: block; transform: translateY(112%); animation: ct-rise 1.1s var(--ease) .1s forwards; }
  @keyframes ct-rise { to { transform: none; } }
  .ct-hero p { max-width: 460px; margin: 18px 0 0; color: #c4d2c8; font-size: 17px; line-height: 1.7; opacity: 0; animation: ct-up .9s var(--ease) .5s forwards; }
  @keyframes ct-up { from { transform: translateY(18px); } to { opacity: 1; transform: none; } }
  .ct-hero-count {
    display: flex; align-items: baseline; gap: 12px; opacity: 0; animation: ct-up .9s var(--ease) .7s forwards;
    font-family: var(--font-display); color: var(--ct-brass);
  }
  .ct-hero-count b { font-size: clamp(2.8rem, 5vw, 4.6rem); font-weight: 700; line-height: 1; letter-spacing: -.03em; font-variant-numeric: tabular-nums; }
  .ct-hero-count span { color: #c4d2c8; font-family: var(--font-body); font-size: 15px; font-weight: 500; }

  /* CORPS */
  .ct-body { display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 56px; padding: 56px 0 120px; align-items: start; }

  /* FILTRES */
  .ct-overlay { display: none; }
  .ct-side {
    position: sticky; top: 100px; max-height: calc(100vh - 124px); overflow-y: auto;
    padding: 30px 26px; background: var(--ct-light); border-radius: 24px; scrollbar-width: thin;
  }
  .ct-side-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 26px; }
  .ct-side-head h2 { margin: 0; color: var(--ct-ink); font-family: var(--font-display); font-size: 24px; font-weight: 600; }
  .ct-reset { background: none; border: 0; padding: 0; color: var(--ct-accent-hover); font: inherit; font-size: 13.5px; font-weight: 700; cursor: pointer; text-decoration: underline; text-underline-offset: 3px; }
  .ct-reset:hover { color: var(--ct-brass); }
  .ct-close { display: none; width: 40px; height: 40px; place-items: center; border: 0; border-radius: 50%; background: #fff; color: var(--ct-ink); cursor: pointer; }

  .ct-group { margin-bottom: 30px; }
  .ct-label { display: block; margin-bottom: 12px; color: var(--ct-ink); font-size: 14px; font-weight: 700; }

  .ct-input-wrap { position: relative; }
  .ct-input-wrap svg { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); color: var(--ct-accent); pointer-events: none; }
  .ct-input {
    width: 100%; min-height: 50px; padding: 0 18px; background: #fff; color: var(--ct-ink);
    border: 1px solid var(--ct-line); border-radius: 999px; outline: none;
    font: inherit; font-size: 15px;
    transition: border-color .25s, box-shadow .25s;
  }
  .ct-input.has-icon { padding-left: 46px; }
  .ct-input::placeholder { color: #8b978e; }
  .ct-input:focus { border-color: var(--ct-brass); box-shadow: 0 0 0 4px rgba(192,151,90,.18); }
  .ct-price { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
  .ct-price .ct-input { padding: 0 16px; border-radius: 14px; }

  .ct-cats { display: flex; flex-direction: column; gap: 6px; }
  .ct-cat {
    display: flex; align-items: center; gap: 12px; width: 100%; padding: 8px 12px 8px 8px;
    border: 0; border-radius: 16px; background: transparent; color: var(--ct-text);
    font: inherit; font-size: 14.5px; font-weight: 600; text-align: left; cursor: pointer;
    transition: background .3s, color .3s, transform .35s var(--ease);
  }
  .ct-cat:hover { background: #fff; transform: translateX(4px); }
  .ct-cat.is-on { background: var(--ct-forest); color: #fff; }
  .ct-cat-img {
    width: 42px; height: 42px; flex-shrink: 0; border-radius: 12px; overflow: hidden;
    background: var(--ct-mist); display: grid; place-items: center; color: var(--ct-accent);
  }
  .ct-cat-img img { width: 100%; height: 100%; object-fit: cover; }
  .ct-cat.is-on .ct-cat-img { background: rgba(255,255,255,.14); color: var(--ct-brass); }

  .ct-check { display: flex; align-items: center; gap: 14px; cursor: pointer; color: var(--ct-ink); font-size: 14.5px; font-weight: 600; user-select: none; }
  .ct-check input { position: absolute; opacity: 0; pointer-events: none; }
  .ct-switch { position: relative; width: 48px; height: 28px; flex-shrink: 0; border-radius: 999px; background: #c9d2c8; transition: background .3s; }
  .ct-switch::after {
    content: ''; position: absolute; top: 3px; left: 3px; width: 22px; height: 22px; border-radius: 50%;
    background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.2); transition: transform .4s var(--ease);
  }
  .ct-check input:checked + .ct-switch { background: var(--ct-forest); }
  .ct-check input:checked + .ct-switch::after { transform: translateX(20px); }
  .ct-check input:focus-visible + .ct-switch { outline: 2px solid var(--ct-brass); outline-offset: 3px; }

  .ct-apply {
    display: none; width: 100%; min-height: 54px; margin-top: 8px; border: 0; border-radius: 999px;
    background: var(--ct-forest); color: #fff; font: inherit; font-size: 15px; font-weight: 700; cursor: pointer;
  }

  /* BARRE D'OUTILS */
  .ct-bar { display: flex; align-items: center; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 26px; }
  .ct-count { margin: 0; color: var(--ct-muted); font-size: 15.5px; }
  .ct-count strong { color: var(--ct-ink); font-weight: 700; }
  .ct-open-filters {
    display: none; align-items: center; gap: 10px; min-height: 46px; padding: 0 22px;
    border: 0; border-radius: 999px; background: var(--ct-forest); color: #fff;
    font: inherit; font-size: 14.5px; font-weight: 700; cursor: pointer;
  }
  .ct-chips { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 30px; }
  .ct-chip {
    display: inline-flex; align-items: center; gap: 10px; padding: 9px 12px 9px 18px;
    border: 1px solid var(--ct-line); border-radius: 999px; background: var(--ct-light); color: var(--ct-ink);
    font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer;
    animation: ct-pop .45s var(--ease) both;
    transition: background .25s, border-color .25s;
  }
  .ct-chip:hover { background: #fff; border-color: var(--ct-brass); }
  .ct-chip i { display: grid; place-items: center; width: 22px; height: 22px; border-radius: 50%; background: var(--ct-forest); color: #fff; }
  @keyframes ct-pop { from { opacity: 0; transform: scale(.8); } to { opacity: 1; transform: none; } }

  /* GRILLE */
  .ct-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 36px 24px; }
  .ct-card { min-width: 0; animation: ct-in .8s var(--ease) both; animation-delay: calc(var(--i, 0) * 70ms); }
  @keyframes ct-in { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: none; } }
  .ct-visual { position: relative; aspect-ratio: 4 / 4.7; overflow: hidden; background: var(--ct-mist); border-radius: 20px; }
  .ct-visual > a { display: block; width: 100%; height: 100%; }
  .ct-visual img { display: block; width: 100%; height: 100%; object-fit: cover; transition: transform .9s var(--ease); }
  .ct-card:hover .ct-visual img { transform: scale(1.08); }
  .ct-placeholder { display: grid; place-items: center; height: 100%; color: #a8b8aa; }

  .ct-badge {
    position: absolute; top: 14px; left: 14px; padding: 7px 13px; background: #fff; color: var(--ct-accent-hover);
    border-radius: 999px; font-size: 12px; font-weight: 700; box-shadow: 0 6px 18px rgba(34,51,42,.12);
  }
  .ct-badge.is-order { color: #8a6a35; }
  .ct-badge.is-out { color: #b05a5a; }

  .ct-heart {
    position: absolute; top: 14px; right: 14px; width: 40px; height: 40px; display: grid; place-items: center;
    background: #fff; border: 0; border-radius: 50%; color: var(--ct-forest); cursor: pointer;
    box-shadow: 0 6px 18px rgba(34,51,42,.12); transition: transform .35s var(--ease), color .25s;
  }
  .ct-heart:hover { transform: scale(1.14); }
  .ct-heart.is-liked { color: #c0504f; animation: ct-beat .5s var(--ease); }
  .ct-heart.is-liked svg { fill: currentColor; }
  @keyframes ct-beat { 40% { transform: scale(1.35); } }

  .ct-quick {
    position: absolute; left: 14px; right: 14px; bottom: 14px; display: flex; align-items: center; justify-content: center; gap: 10px;
    min-height: 50px; border: 0; border-radius: 999px; background: var(--ct-forest); color: #fff;
    font: inherit; font-size: 14px; font-weight: 700; cursor: pointer;
    transform: translateY(70px); opacity: 0;
    transition: transform .5s var(--ease), opacity .35s, background .3s;
  }
  .ct-card:hover .ct-quick, .ct-quick:focus-visible { transform: none; opacity: 1; }
  .ct-quick:hover:not(:disabled) { background: var(--ct-accent); }
  .ct-quick:disabled { background: #9aa69d; cursor: not-allowed; }

  .ct-info { padding: 18px 4px 4px; }
  .ct-cat-name { display: block; margin-bottom: 6px; color: var(--ct-accent); font-size: 12.5px; font-weight: 700; }
  .ct-name {
    display: block; color: var(--ct-ink); font-family: var(--font-display); font-size: 19px; font-weight: 600; line-height: 1.3;
    text-decoration: none; transition: color .25s;
  }
  .ct-name:hover { color: var(--ct-accent); }
  .ct-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 14px; }
  .ct-price-tag { color: var(--ct-forest); font-size: 18px; font-weight: 700; }
  .ct-add {
    width: 44px; height: 44px; display: grid; place-items: center; background: var(--ct-light);
    border: 1px solid var(--ct-line); border-radius: 50%; color: var(--ct-forest); cursor: pointer;
    transition: background .3s, color .3s, transform .35s var(--ease);
  }
  .ct-add:hover:not(:disabled) { background: var(--ct-brass); border-color: var(--ct-brass); color: #fff; transform: scale(1.1); }
  .ct-add:disabled { opacity: .4; cursor: not-allowed; }

  /* SQUELETTE */
  .ct-skel-img, .ct-skel-line {
    background: linear-gradient(100deg, #edf1ea 30%, #f8faf6 50%, #edf1ea 70%);
    background-size: 220% 100%; animation: ct-shimmer 1.5s linear infinite;
  }
  .ct-skel-img { aspect-ratio: 4 / 4.7; border-radius: 20px; }
  .ct-skel-line { height: 13px; margin-top: 14px; border-radius: 6px; }
  @keyframes ct-shimmer { to { background-position: -220% 0; } }

  /* ÉTAT VIDE */
  .ct-empty { padding: 90px 24px; text-align: center; background: var(--ct-light); border-radius: 24px; animation: ct-in .7s var(--ease) both; }
  .ct-empty svg { color: var(--ct-accent); margin-bottom: 18px; }
  .ct-empty h3 { margin: 0 0 8px; color: var(--ct-ink); font-family: var(--font-display); font-size: 28px; font-weight: 600; }
  .ct-empty p { margin: 0 0 26px; color: var(--ct-muted); font-size: 16px; }
  .ct-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 12px; min-height: 54px; padding: 0 32px;
    border: 1px solid var(--ct-forest); border-radius: 999px; background: var(--ct-forest); color: #fff;
    font: inherit; font-size: 15px; font-weight: 700; cursor: pointer;
    transition: background .3s, transform .35s var(--ease), box-shadow .35s;
  }
  .ct-btn:hover:not(:disabled) { background: var(--ct-accent); border-color: var(--ct-accent); transform: translateY(-3px); box-shadow: 0 16px 32px rgba(34,51,42,.25); }
  .ct-btn:disabled { opacity: .6; cursor: wait; }
  .ct-btn.is-ghost { background: transparent; color: var(--ct-forest); }
  .ct-btn.is-ghost:hover:not(:disabled) { color: #fff; }
  .ct-more { text-align: center; margin-top: 64px; }
  .ct-more small { display: block; margin-top: 14px; color: var(--ct-muted); font-size: 13.5px; }

  @media (max-width: 1000px) {
    .ct-wrap { width: calc(100% - 56px); }
    .ct-body { grid-template-columns: 1fr; gap: 0; padding-top: 36px; }
    .ct-open-filters { display: inline-flex; }
    .ct-overlay {
      display: block; position: fixed; inset: 0; z-index: 300; background: rgba(20,32,25,.45); backdrop-filter: blur(4px);
      opacity: 0; pointer-events: none; transition: opacity .35s;
    }
    .ct-overlay.is-open { opacity: 1; pointer-events: auto; }
    .ct-side {
      position: fixed; top: 0; left: 0; bottom: 0; z-index: 301; width: min(400px, 100%); max-height: none;
      border-radius: 0 24px 24px 0; padding: 26px; background: #fff;
      transform: translateX(-102%); transition: transform .5s var(--ease); box-shadow: 20px 0 70px rgba(20,32,25,.2);
    }
    .ct-side.is-open { transform: none; }
    .ct-close { display: grid; }
    .ct-apply { display: block; }
    .ct-input { background: var(--ct-light); }
  }
  @media (max-width: 640px) {
    .ct-wrap { width: calc(100% - 36px); }
    .ct-hero-inner { padding: 50px 0 44px; }
    .ct-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px 14px; }
    .ct-name { font-size: 16px; }
    .ct-price-tag { font-size: 15.5px; }
    .ct-add { width: 38px; height: 38px; }
    .ct-quick { transform: none; opacity: 1; min-height: 42px; font-size: 12.5px; left: 8px; right: 8px; bottom: 8px; }
    .ct-body { padding-bottom: 80px; }
  }
  @media (max-width: 380px) { .ct-grid { grid-template-columns: 1fr; } }
  @media (prefers-reduced-motion: reduce) {
    .ct-page *, .ct-page *::before, .ct-page *::after { animation: none !important; transition: none !important; }
    .ct-line > span, .ct-hero p, .ct-hero-count { transform: none; opacity: 1; }
  }
`;

function getBadge(p: Produit): { label: string; cls: string } | null {
  const anyP = p as Produit & Record<string, any>;
  const stock = Number(anyP.stock_total ?? 0);

  if (
    anyP.disponibilite === 'rupture' ||
    (anyP.stock_total !== undefined && stock <= 0 &&
      anyP.mode_stock !== 'fabrication' &&
      anyP.disponibilite !== 'fabrication')
  ) {
    return { label: 'Rupture', cls: 'is-out' };
  }
  if (anyP.est_nouveau) return { label: 'Nouveau', cls: 'is-new' };
  if (anyP.disponibilite === 'fabrication' || anyP.mode_stock === 'fabrication') {
    return { label: 'Sur commande', cls: 'is-order' };
  }
  return null;
}

function ProductCard({ produit, index }: { produit: Produit; index: number }) {
  const { addItem } = useCartStore();
  const [liked, setLiked] = useState(false);

  const img =
    produit.medias?.find(m => m.est_principale)?.url ?? produit.medias?.[0]?.url;
  const variante = produit.variantes?.[0];
  const badge = getBadge(produit);

  const indisponible = variante
    ? variante.mode_stock !== 'fabrication' &&
      (variante.mode_stock !== 'stock' || (variante.stock_disponible ?? 0) < 1)
    : true;

  const handleAdd = () => {
    if (!variante) return;
    const added = addItem({
      ...variante,
      produit: { nom: produit.nom, slug: produit.slug, medias: produit.medias },
    });
    if (added) toast.success('Ajouté au panier.');
    else toast.error('Cette variante est en rupture de stock.');
  };

  return (
    <article
      className="ct-card"
      style={{ ['--i' as any]: index % 12 }}
    >
      <div className="ct-visual">
        <Link to={`/catalogue/${produit.slug}`} aria-label={`Voir ${produit.nom}`}>
          {img ? (
            <img src={img} alt={produit.nom} loading="lazy" />
          ) : (
            <div className="ct-placeholder"><IconCube size={38} /></div>
          )}
        </Link>

        {badge && <span className={`ct-badge ${badge.cls}`}>{badge.label}</span>}

        <button
          type="button"
          className={`ct-heart ${liked ? 'is-liked' : ''}`}
          aria-label="Ajouter aux favoris"
          aria-pressed={liked}
          onClick={() => setLiked(v => !v)}
        >
          <IconHeart size={17} />
        </button>

        {variante && (
          <button
            type="button"
            className="ct-quick"
            disabled={indisponible}
            onClick={handleAdd}
          >
            <IconCart size={16} /> {indisponible ? 'Indisponible' : 'Ajouter au panier'}
          </button>
        )}
      </div>

      <div className="ct-info">
        {produit.categorie?.nom && (
          <span className="ct-cat-name">{produit.categorie.nom}</span>
        )}

        <Link to={`/catalogue/${produit.slug}`} className="ct-name">
          {produit.nom}
        </Link>

        <div className="ct-foot">
          <span className="ct-price-tag">{formatPrix(produit.prix_min)}</span>

          {variante && (
            <button
              type="button"
              className="ct-add"
              disabled={indisponible}
              onClick={handleAdd}
              aria-label={`Ajouter ${produit.nom} au panier`}
            >
              <IconCart size={16} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

export default function CataloguePage() {
  const [params, setParams] = useSearchParams();
  const [produits, setProduits] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filterOpen, setFilterOpen] = useState(false);

  const [filters, setFilters] = useState<Filters>(() => filtersFromParams(params));
  // Copie « différée » : évite un appel API à chaque frappe.
  const [applied, setApplied] = useState<Filters>(filters);
  const requestId = useRef(0);

  const fetchProduits = useCallback(async (p = 1) => {
    const id = ++requestId.current;
    setLoading(true);
    setLoadError(null);
    try {
      const res = await publicApi.produits({
        page: p, per_page: 12,
        recherche: applied.q || undefined,
        categorie: applied.categorie || undefined,
        collection: applied.collection || undefined,
        partenaire: applied.partenaire || undefined,
        prix_min: applied.prix_min ? Number(applied.prix_min) : undefined,
        prix_max: applied.prix_max ? Number(applied.prix_max) : undefined,
        en_stock: applied.disponible || undefined,
      });
      if (id !== requestId.current) return; // réponse obsolète
      const items = Array.isArray(res.data.data) ? res.data.data : [];
      setProduits(p === 1 ? items : prev => [...prev, ...items]);
      setTotal(res.data.meta?.total ?? res.data.total ?? 0);
      setLastPage(res.data.meta?.last_page ?? res.data.last_page ?? 1);
      setPage(p);
    } catch {
      if (id !== requestId.current) return;
      setLoadError('Impossible de charger les produits. Veuillez réessayer.');
      toast.error('Impossible de charger les produits.');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [applied]);

  useEffect(() => {
    publicApi.categories()
      .then(r => setCategories(r.data as unknown as Categorie[]))
      .catch(() => toast.error('Impossible de charger les catégories.'));
  }, []);

  useEffect(() => { fetchProduits(1); }, [fetchProduits]);

  // Debounce des filtres (350 ms) vers la requête.
  useEffect(() => {
    const t = setTimeout(() => setApplied(filters), 350);
    return () => clearTimeout(t);
  }, [filters]);

  // URL -> filtres (ex. clic sur un lien du footer pendant qu'on est sur la page).
  const paramsKey = params.toString();
  useEffect(() => {
    const next = filtersFromParams(params);
    setFilters(f => (sameFilters(f, next) ? f : next));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramsKey]);

  // Filtres -> URL (liens partageables).
  useEffect(() => {
    const next = new URLSearchParams();
    if (applied.q) next.set('q', applied.q);
    if (applied.categorie) next.set('categorie', applied.categorie);
    if (applied.collection) next.set('collection', applied.collection);
    if (applied.partenaire) next.set('partenaire', applied.partenaire);
    if (applied.prix_min) next.set('prix_min', applied.prix_min);
    if (applied.prix_max) next.set('prix_max', applied.prix_max);
    if (applied.disponible) next.set('disponible', '1');

    if (next.toString() !== params.toString() && sameFilters(filters, applied)) {
      setParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [applied]);

  // Verrouille le scroll quand le panneau mobile est ouvert.
  useEffect(() => {
    document.body.style.overflow = filterOpen ? 'hidden' : '';
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFilterOpen(false); };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKey);
    };
  }, [filterOpen]);

  const applyFilter = (key: keyof Filters, val: string | boolean) =>
    setFilters(f => ({ ...f, [key]: val }));

  const resetFilters = () =>
    setFilters(f => ({
      ...f, q: '', categorie: '', prix_min: '', prix_max: '', disponible: false,
      collection: '', partenaire: '',
    }));

  const activeChips: { key: keyof Filters; label: string }[] = [];
  if (filters.q) activeChips.push({ key: 'q', label: `« ${filters.q} »` });
  if (filters.categorie) {
    const c = categories.find(x => x.slug === filters.categorie);
    activeChips.push({ key: 'categorie', label: c?.nom ?? filters.categorie });
  }
  if (filters.collection) activeChips.push({ key: 'collection', label: `Collection : ${filters.collection}` });
  if (filters.partenaire) activeChips.push({ key: 'partenaire', label: `Partenaire : ${filters.partenaire}` });
  if (filters.prix_min) activeChips.push({ key: 'prix_min', label: `Dès ${formatPrix(Number(filters.prix_min))}` });
  if (filters.prix_max) activeChips.push({ key: 'prix_max', label: `Jusqu’à ${formatPrix(Number(filters.prix_max))}` });
  if (filters.disponible) activeChips.push({ key: 'disponible', label: 'En stock' });

  const clearChip = (key: keyof Filters) =>
    applyFilter(key, key === 'disponible' ? false : '');

  return (
    <>
      <style>{styles}</style>

      <div className="ct-page">
        {/* EN-TÊTE */}
        <section className="ct-hero">
          <div className="ct-wrap ct-hero-inner">
            <div>
              <nav className="ct-crumb" aria-label="Fil d’Ariane">
                <Link to="/">Accueil</Link><span>/</span><span>Catalogue</span>
              </nav>
              <h1>
                <span className="ct-line"><span>Le catalogue</span></span>
              </h1>
              <p>Des créations locales, des fiches techniques complètes et un stock mis à jour en temps réel.</p>
            </div>

            <div className="ct-hero-count" aria-live="polite">
              <b>{total}</b>
              <span>produit{total !== 1 ? 's' : ''} à découvrir</span>
            </div>
          </div>
        </section>

        <div className="ct-wrap ct-body">
          <div
            className={`ct-overlay ${filterOpen ? 'is-open' : ''}`}
            onClick={() => setFilterOpen(false)}
          />

          {/* FILTRES */}
          <aside
            className={`ct-side ${filterOpen ? 'is-open' : ''}`}
            aria-label="Filtres du catalogue"
          >
            <div className="ct-side-head">
              <h2>Filtres</h2>
              {activeChips.length > 0 ? (
                <button type="button" className="ct-reset" onClick={resetFilters}>
                  Tout effacer
                </button>
              ) : null}
              <button
                type="button"
                className="ct-close"
                aria-label="Fermer les filtres"
                onClick={() => setFilterOpen(false)}
              >
                <IconX size={20} />
              </button>
            </div>

            <div className="ct-group">
              <label className="ct-label" htmlFor="ct-q">Recherche</label>
              <div className="ct-input-wrap">
                <IconSearch size={17} />
                <input
                  id="ct-q"
                  className="ct-input has-icon"
                  placeholder="Nom, référence..."
                  value={filters.q}
                  onChange={e => applyFilter('q', e.target.value)}
                />
              </div>
            </div>

            <div className="ct-group">
              <span className="ct-label">Catégories</span>
              <div className="ct-cats">
                <button
                  type="button"
                  className={`ct-cat ${!filters.categorie ? 'is-on' : ''}`}
                  onClick={() => applyFilter('categorie', '')}
                >
                  <span className="ct-cat-img"><IconCube size={20} /></span>
                  Toutes
                </button>

                {categories.map(cat => (
                  <button
                    key={cat.id}
                    type="button"
                    className={`ct-cat ${filters.categorie === cat.slug ? 'is-on' : ''}`}
                    onClick={() => applyFilter('categorie', cat.slug)}
                  >
                    <span className="ct-cat-img">
                      {cat.image_url
                        ? <img src={cat.image_url} alt="" />
                        : <IconCube size={18} />}
                    </span>
                    {cat.nom}
                  </button>
                ))}
              </div>
            </div>

            <div className="ct-group">
              <span className="ct-label">Prix (FCFA)</span>
              <div className="ct-price">
                <input
                  className="ct-input" placeholder="Min" type="number" min={0}
                  aria-label="Prix minimum" value={filters.prix_min}
                  onChange={e => applyFilter('prix_min', e.target.value)}
                />
                <input
                  className="ct-input" placeholder="Max" type="number" min={0}
                  aria-label="Prix maximum" value={filters.prix_max}
                  onChange={e => applyFilter('prix_max', e.target.value)}
                />
              </div>
            </div>

            <div className="ct-group">
              <label className="ct-check">
                <input
                  type="checkbox"
                  checked={filters.disponible}
                  onChange={e => applyFilter('disponible', e.target.checked)}
                />
                <span className="ct-switch" />
                En stock uniquement
              </label>
            </div>

            <button type="button" className="ct-apply" onClick={() => setFilterOpen(false)}>
              Voir les {total} produit{total !== 1 ? 's' : ''}
            </button>
          </aside>

          {/* PRODUITS */}
          <main>
            <div className="ct-bar">
              <p className="ct-count">
                <strong>{total}</strong> produit{total !== 1 ? 's' : ''} trouvé{total !== 1 ? 's' : ''}
              </p>

              <button
                type="button"
                className="ct-open-filters"
                onClick={() => setFilterOpen(true)}
              >
                <IconFilter size={16} />
                Filtres{activeChips.length > 0 ? ` (${activeChips.length})` : ''}
              </button>
            </div>

            {activeChips.length > 0 && (
              <div className="ct-chips">
                {activeChips.map(chip => (
                  <button
                    key={chip.key}
                    type="button"
                    className="ct-chip"
                    onClick={() => clearChip(chip.key)}
                    aria-label={`Retirer le filtre ${chip.label}`}
                  >
                    {chip.label}
                    <i><IconX size={12} /></i>
                  </button>
                ))}
              </div>
            )}

            {loading && produits.length === 0 ? (
              <div className="ct-grid">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i}>
                    <div className="ct-skel-img" />
                    <div className="ct-info">
                      <div className="ct-skel-line" style={{ width: '35%' }} />
                      <div className="ct-skel-line" style={{ width: '78%' }} />
                      <div className="ct-skel-line" style={{ width: '42%' }} />
                    </div>
                  </div>
                ))}
              </div>
            ) : produits.length === 0 ? (
              <div className="ct-empty">
                <IconSearch size={52} />
                {loadError ? (
                  <>
                    <h3>Chargement impossible</h3>
                    <p>{loadError}</p>
                    <button type="button" className="ct-btn" onClick={() => fetchProduits(1)}>
                      Réessayer
                    </button>
                  </>
                ) : (
                  <>
                    <h3>Aucun produit trouvé</h3>
                    <p>Essayez de modifier ou d’effacer vos filtres.</p>
                    {activeChips.length > 0 && (
                      <button type="button" className="ct-btn" onClick={resetFilters}>
                        Effacer les filtres
                      </button>
                    )}
                  </>
                )}
              </div>
            ) : (
              <>
                <div className="ct-grid" style={{ opacity: loading ? .6 : 1, transition: 'opacity .3s' }}>
                  {produits.map((produit, i) => (
                    <ProductCard key={produit.id} produit={produit} index={i} />
                  ))}
                </div>

                {page < lastPage && (
                  <div className="ct-more">
                    <button
                      type="button"
                      className="ct-btn is-ghost"
                      onClick={() => fetchProduits(page + 1)}
                      disabled={loading}
                    >
                      {loading ? 'Chargement...' : 'Voir plus de produits'}
                    </button>
                    <small>{produits.length} sur {total} affichés</small>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
}