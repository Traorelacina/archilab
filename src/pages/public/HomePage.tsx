import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { publicApi } from '../../api/public';
import type { Produit, Categorie } from '../../types';
import { formatPrix } from '../../utils/format';
import { useCartStore } from '../../store/cartStore';
import {
  IconArrowRight,
  IconCart,
  IconCube,
  IconHeart,
  IconSearch,
} from '../../components/ui/Icons';
import toast from 'react-hot-toast';

type AnyProduit = Produit & Record<string, any>;
type AnyCategorie = Categorie & Record<string, any>;

const HERO_IMAGE = '/images/hero-salon.jpg';
const VISUAL_3D_IMAGE = '/images/visualisation-3d.jpg';
const PARTNER_IMAGE = '/images/partenaire-artisan.jpg';

const PATHS: Record<string, string[]> = {
  doc: ['M6 2h9l5 5v15H6z', 'M14 2v6h6', 'M9 13h8M9 17h8'],
  stock: ['M21 8l-9-5-9 5v8l9 5 9-5z', 'M3 8l9 5 9-5', 'M12 13v8'],
  shield: ['M12 2l8 3v6c0 5-3.5 9-8 11-4.5-2-8-6-8-11V5z', 'M9 12l2 2 4-4'],
  diamond: ['M6 3h12l4 6-10 13L2 9z', 'M2 9h20'],
  tool: ['M14.7 6.3a4 4 0 00-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 005.4-5.4l-2.5 2.5-2.5-2.5z'],
  users: ['M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2', 'M9 11a4 4 0 100-8 4 4 0 000 8z', 'M23 21v-2a4 4 0 00-3-3.9', 'M16.5 3.1a4 4 0 010 7.8'],
  chart: ['M3 3v18h18', 'M7 15v3M12 10v8M17 6v12'],
  trophy: ['M8 21h8M12 17v4', 'M7 4h10v5a5 5 0 01-10 0z', 'M7 6H4v2a3 3 0 003 3M17 6h3v2a3 3 0 01-3 3'],
  sofa: ['M4 11V8a3 3 0 013-3h10a3 3 0 013 3v3', 'M2 13a2 2 0 014 0v2h12v-2a2 2 0 014 0v5H2z', 'M5 18v2M19 18v2'],
  phone: ['M7 2h10a1 1 0 011 1v18a1 1 0 01-1 1H7a1 1 0 01-1-1V3a1 1 0 011-1z', 'M11 18h2'],
  pen: ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z'],
  store: ['M3 9l2-5h14l2 5', 'M3 9v11h18V9', 'M9 20v-6h6v6'],
};

function Ico({ name, size = 26 }: { name: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      {(PATHS[name] ?? []).map(d => <path key={d} d={d} />)}
    </svg>
  );
}

function getPartnerName(p: AnyProduit): string {
  return p.partenaire?.raison_sociale ?? p.partenaire?.nom ?? '';
}

function getMainImage(p: AnyProduit): string | undefined {
  const principal =
    p.medias?.find((m: any) => m.est_principale || m.principale)
    ?? p.medias?.[0];

  return (
    principal?.url ??
    principal?.image_url ??
    (principal?.chemin
      ? principal.chemin.startsWith('http') ||
        principal.chemin.startsWith('/')
        ? principal.chemin
        : `/storage/${principal.chemin}`
      : undefined)
  );
}

function getCategoryImage(c: AnyCategorie): string | undefined {
  return c.image_url ?? c.image ?? c.media?.url ?? c.photo_url;
}

function getBadge(p: AnyProduit): { label: string; cls: string } | null {
  const stock = Number(p.stock_total ?? 0);

  if (
    p.disponibilite === 'rupture' ||
    (stock <= 0 &&
      p.mode_stock !== 'fabrication' &&
      p.disponibilite !== 'fabrication')
  ) {
    return { label: 'Rupture', cls: 'is-out' };
  }

  if (p.est_nouveau) return { label: 'Nouveau', cls: 'is-new' };

  if (p.disponibilite === 'fabrication' || p.mode_stock === 'fabrication') {
    return { label: 'Sur commande', cls: 'is-order' };
  }

  return { label: 'En stock', cls: 'is-new' };
}

const FEATURES = [
  { icon: 'doc', label: 'Fiches techniques détaillées' },
  { icon: 'cube', label: 'Plans 2D/3D interactifs' },
  { icon: 'stock', label: 'Stock en temps réel' },
  { icon: 'shield', label: 'Paiement sécurisé' },
];

const WHY = [
  {
    icon: 'diamond',
    title: 'Des créations uniques',
    text: 'Des meubles conçus par des talents locaux.',
  },
  {
    icon: 'tool',
    title: 'Des fiches techniques complètes',
    text: 'Dimensions, matériaux, finitions et délais de fabrication.',
  },
  {
    icon: 'cube',
    title: 'Une gestion de stock fiable',
    text: 'Disponibilité des produits en temps réel.',
  },
  {
    icon: 'shield',
    title: 'Un paiement sécurisé',
    text: 'Mobile Money, espèces et bientôt carte internationale.',
  },
];

const STATS: {
  icon: string; to?: number; prefix?: string; suffix?: string;
  decimals?: number; big?: string; text: string;
}[] = [
  { icon: 'sofa', prefix: '+ ', to: 200, text: 'Références de mobilier la première année' },
  { icon: 'users', prefix: '+ ', to: 10, text: 'Partenariats avec des concepteurs' },
  { icon: 'chart', to: 99.5, decimals: 1, suffix: ' %', text: 'De disponibilité de la plateforme' },
  { icon: 'trophy', big: 'Une ambition', text: 'Devenir une référence en Côte d’Ivoire et dans l’UEMOA' },
];

const FALLBACK_PARTNERS = [
  'OCA DÉCO',
  'ATELIERS D’IVOIRE',
  'BOIS & STYLE',
  'L’ART DU MEUBLE',
  'DECO PRESTIGE',
  'AFRIK HOME',
];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap');

  .mb-page {
    --mb-ink: #1d2a22;
    --mb-forest: #22332a;
    --mb-forest-2: #2e4236;
    --mb-accent: #5f7a65;
    --mb-accent-hover: #4a6350;
    --mb-sage: #849587;
    --mb-text: #3b4a40;
    --mb-muted: #66736a;
    --mb-light: #f4f6f2;
    --mb-mist: #e9eee7;
    --mb-line: #dde3da;
    --mb-brass: #c0975a;
    --font-display: 'Fraunces', Georgia, serif;
    --font-body: 'DM Sans', system-ui, -apple-system, sans-serif;
    --ease: cubic-bezier(.22,.8,.24,1);
    width: 100%;
    overflow: hidden;
    background: #fff;
    color: var(--mb-text);
    font-family: var(--font-body);
    font-size: 15px;
    -webkit-font-smoothing: antialiased;
  }

  .mb-page *, .mb-page *::before, .mb-page *::after { box-sizing: border-box; }
  .mb-page :focus-visible { outline: 2px solid var(--mb-brass); outline-offset: 3px; }

  .mb-wrap { width: min(1380px, calc(100% - 80px)); margin: 0 auto; }

  /* Révélation au scroll */
  .mb-page .rv {
    opacity: 0; transform: translateY(34px);
    transition: opacity .9s var(--ease), transform .9s var(--ease);
    transition-delay: var(--d, 0ms);
  }
  .mb-page .rv.in { opacity: 1; transform: none; }

  .mb-head {
    display: flex; justify-content: space-between; align-items: flex-end;
    gap: 25px; margin-bottom: 48px;
  }
  .mb-eyebrow {
    display: inline-flex; align-items: center; gap: 12px;
    margin-bottom: 16px; color: var(--mb-accent);
    font-size: 13px; font-weight: 700; letter-spacing: .02em;
  }
  .mb-eyebrow::before {
    content: ''; width: 34px; height: 2px; background: var(--mb-brass);
  }
  .mb-title {
    margin: 0; color: var(--mb-ink);
    font-family: var(--font-display);
    font-size: clamp(2.1rem, 3.8vw, 3.6rem);
    font-weight: 600; letter-spacing: -.025em; line-height: 1.1;
  }
  .mb-sub {
    max-width: 520px; margin: 16px 0 0;
    color: var(--mb-muted); font-size: 16.5px; line-height: 1.7;
  }

  .mb-more {
    position: relative; display: inline-flex; align-items: center; gap: 10px;
    padding-bottom: 5px; color: var(--mb-ink);
    font-size: 14.5px; font-weight: 700; text-decoration: none; white-space: nowrap;
  }
  .mb-more::after {
    content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 2px;
    background: var(--mb-brass); transform-origin: left;
    transition: transform .45s var(--ease);
  }
  .mb-more:hover::after { transform: scaleX(.35); }
  .mb-more svg { transition: transform .35s var(--ease); }
  .mb-more:hover svg { transform: translateX(6px); }

  .mb-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 14px;
    min-height: 56px; padding: 0 32px;
    background: var(--mb-forest); border: 1px solid var(--mb-forest);
    border-radius: 999px; color: #fff; text-decoration: none;
    font-size: 15px; font-weight: 700;
    transition: background .3s, transform .35s var(--ease), box-shadow .35s;
  }
  .mb-btn:hover {
    background: var(--mb-accent); border-color: var(--mb-accent);
    transform: translateY(-3px); box-shadow: 0 16px 32px rgba(34,51,42,.25);
  }
  .mb-btn svg { transition: transform .35s var(--ease); }
  .mb-btn:hover svg { transform: translateX(5px); }
  .mb-btn.is-brass { background: var(--mb-brass); border-color: var(--mb-brass); color: #1d2a22; }
  .mb-btn.is-brass:hover { background: #d3aa6c; border-color: #d3aa6c; box-shadow: 0 16px 32px rgba(0,0,0,.28); }

  /* HERO */
  .mb-hero {
    position: relative; background: var(--mb-light);
    isolation: isolate; overflow: hidden;
  }
  .mb-hero::before {
    content: ''; position: absolute; z-index: -1;
    width: 760px; height: 760px; right: -160px; top: -220px;
    border-radius: 50%; background: radial-gradient(circle, #dfe8dc 0%, rgba(223,232,220,0) 68%);
    animation: mb-drift 14s ease-in-out infinite alternate;
  }
  @keyframes mb-drift { to { transform: translate(-60px, 50px) scale(1.12); } }

  .mb-hero-grid {
    display: grid; grid-template-columns: minmax(0, 1.05fr) minmax(0, .95fr);
    align-items: center; gap: 60px;
    min-height: min(780px, calc(100vh - 126px)); padding: 70px 0 110px;
  }
  .mb-hero h1 {
    margin: 0; color: var(--mb-ink);
    font-family: var(--font-display);
    font-size: clamp(3rem, 6.3vw, 6.2rem);
    font-weight: 700; letter-spacing: -.04em; line-height: 1;
  }
  .mb-line { display: block; overflow: hidden; padding-bottom: .12em; margin-bottom: -.12em; }
  .mb-line > span {
    display: block; transform: translateY(112%);
    animation: mb-rise 1.1s var(--ease) forwards;
    animation-delay: calc(.15s + var(--i, 0) * .14s);
  }
  .mb-hero h1 .mb-line:last-child { color: var(--mb-accent); font-style: italic; font-weight: 600; }
  @keyframes mb-rise { to { transform: none; } }

  .mb-hero-lead {
    max-width: 520px; margin: 32px 0 0;
    color: var(--mb-text); font-size: 18px; line-height: 1.7;
  }
  .mb-fade-up { opacity: 0; transform: translateY(22px); animation: mb-up .9s var(--ease) forwards; animation-delay: var(--d, 0s); }
  @keyframes mb-up { to { opacity: 1; transform: none; } }

  .mb-search {
    display: flex; align-items: center; max-width: 540px; margin-top: 40px;
    padding: 7px; background: #fff; border: 1px solid var(--mb-line);
    border-radius: 999px; box-shadow: 0 18px 44px rgba(34,51,42,.1);
    transition: box-shadow .35s, border-color .35s, transform .35s var(--ease);
  }
  .mb-search:focus-within {
    border-color: var(--mb-brass); transform: translateY(-2px);
    box-shadow: 0 24px 54px rgba(34,51,42,.16);
  }
  .mb-search-icon { margin: 0 8px 0 18px; color: var(--mb-accent); flex-shrink: 0; }
  .mb-search input {
    flex: 1; min-width: 0; padding: 14px 8px; border: 0; outline: none;
    background: transparent; color: var(--mb-ink); font: inherit; font-size: 15.5px;
  }
  .mb-search input::placeholder { color: #8b978e; }
  .mb-search button {
    width: 52px; height: 52px; display: grid; place-items: center; flex-shrink: 0;
    background: var(--mb-forest); border: 0; border-radius: 50%; color: #fff; cursor: pointer;
    transition: background .3s, transform .4s var(--ease);
  }
  .mb-search button:hover { background: var(--mb-accent); transform: scale(1.08) rotate(-8deg); }

  .mb-hero-visual { position: relative; }
  .mb-arch {
    position: relative; aspect-ratio: 4 / 5; width: 100%; max-width: 560px; margin-left: auto;
    border-radius: 999px 999px 24px 24px; overflow: hidden;
    background: linear-gradient(160deg, #cfdccf, #9db0a0);
    clip-path: inset(100% 0 0 0 round 999px 999px 24px 24px);
    animation: mb-reveal 1.4s var(--ease) .2s forwards;
    box-shadow: 0 40px 90px rgba(34,51,42,.28);
  }
  @keyframes mb-reveal { to { clip-path: inset(0 0 0 0 round 999px 999px 24px 24px); } }
  .mb-arch img {
    width: 100%; height: 100%; object-fit: cover; display: block;
    transform: scale(1.18); animation: mb-zoom 14s ease-out .2s forwards;
  }
  @keyframes mb-zoom { to { transform: scale(1); } }

  .mb-ring {
    position: absolute; left: -26px; bottom: 90px; z-index: 2;
    width: 124px; height: 124px;
  }
  .mb-ring svg { width: 100%; height: 100%; animation: mb-spin 18s linear infinite; }
  .mb-ring text { fill: var(--mb-forest); font-size: 10.5px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase; font-family: var(--font-body); }
  .mb-ring b {
    position: absolute; inset: 0; display: grid; place-items: center;
    color: var(--mb-brass);
  }
  .mb-ring::before {
    content: ''; position: absolute; inset: 0; border-radius: 50%; background: #fff;
    box-shadow: 0 16px 36px rgba(34,51,42,.18);
  }
  .mb-ring svg, .mb-ring b { z-index: 1; }
  @keyframes mb-spin { to { transform: rotate(360deg); } }

  .mb-float {
    position: absolute; right: -14px; top: 18%; z-index: 2;
    display: flex; align-items: center; gap: 14px; padding: 16px 22px 16px 16px;
    background: rgba(255,255,255,.95); border-radius: 18px;
    box-shadow: 0 22px 50px rgba(34,51,42,.2); backdrop-filter: blur(8px);
    animation: mb-bob 5s ease-in-out infinite;
  }
  @keyframes mb-bob { 50% { transform: translateY(-14px); } }
  .mb-float i {
    width: 46px; height: 46px; display: grid; place-items: center;
    border-radius: 14px; background: var(--mb-forest); color: #fff;
  }
  .mb-float strong { display: block; color: var(--mb-ink); font-size: 14.5px; font-weight: 700; }
  .mb-float span { display: flex; align-items: center; gap: 7px; margin-top: 3px; color: var(--mb-muted); font-size: 12.5px; }
  .mb-float span::before {
    content: ''; width: 8px; height: 8px; border-radius: 50%; background: #3fbf6d;
    animation: mb-live 2s ease-in-out infinite;
  }
  @keyframes mb-live {
    0%,100% { box-shadow: 0 0 0 0 rgba(63,191,109,.5); }
    50% { box-shadow: 0 0 0 7px rgba(63,191,109,0); }
  }

  .mb-hero-features { position: absolute; bottom: 0; left: 0; right: 0; background: var(--mb-forest); }
  .mb-hero-features ul {
    list-style: none; margin: 0; padding: 0;
    display: grid; grid-template-columns: repeat(4, 1fr);
  }
  .mb-hero-features li {
    display: flex; align-items: center; gap: 14px; padding: 22px 24px;
    color: #eaf1ec; font-size: 14.5px; font-weight: 600; line-height: 1.4;
    border-left: 1px solid rgba(255,255,255,.1);
    transition: background .35s;
  }
  .mb-hero-features li:first-child { border-left: 0; padding-left: 0; }
  .mb-hero-features li:hover { background: rgba(255,255,255,.05); }
  .mb-hero-features svg { color: var(--mb-brass); flex-shrink: 0; }

  /* CATEGORIES */
  .mb-cats { padding: 120px 0 80px; background: #fff; }
  .mb-cat-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 20px; }
  .mb-cat {
    position: relative; display: block; min-width: 0; aspect-ratio: 3 / 4;
    overflow: hidden; border-radius: 20px; background: var(--mb-mist);
    color: #fff; text-decoration: none; isolation: isolate;
  }
  .mb-cat:first-child { grid-column: span 2; aspect-ratio: auto; }
  .mb-cat-img { position: absolute; inset: 0; display: grid; place-items: center; color: #a8b8aa; z-index: -2; }
  .mb-cat-img img {
    width: 100%; height: 100%; object-fit: cover;
    transition: transform .9s var(--ease);
  }
  .mb-cat::after {
    content: ''; position: absolute; inset: 0; z-index: -1;
    background: linear-gradient(180deg, rgba(20,32,25,0) 38%, rgba(20,32,25,.78) 100%);
    transition: opacity .4s;
  }
  .mb-cat:hover .mb-cat-img img { transform: scale(1.09); }
  .mb-cat-label {
    position: absolute; left: 0; right: 0; bottom: 0; padding: 24px;
    display: flex; align-items: flex-end; justify-content: space-between; gap: 12px;
  }
  .mb-cat strong {
    font-family: var(--font-display); font-size: clamp(1.2rem, 1.7vw, 1.65rem);
    font-weight: 600; line-height: 1.2;
  }
  .mb-cat:first-child strong { font-size: clamp(1.7rem, 2.6vw, 2.5rem); }
  .mb-cat-go {
    width: 46px; height: 46px; flex-shrink: 0; display: grid; place-items: center;
    border-radius: 50%; background: #fff; color: var(--mb-forest);
    transform: translateY(14px) scale(.7); opacity: 0;
    transition: transform .5s var(--ease), opacity .35s, background .3s;
  }
  .mb-cat:hover .mb-cat-go { transform: none; opacity: 1; }
  .mb-cat-go:hover { background: var(--mb-brass); }
  .mb-cat-skel { aspect-ratio: 3 / 4; border-radius: 20px; }
  .mb-cat-skel:first-child { grid-column: span 2; aspect-ratio: auto; }

  /* PRODUITS */
  .mb-products { padding: 50px 0 120px; background: #fff; }
  .mb-carousel { position: relative; }
  .mb-track {
    display: grid; grid-auto-flow: column;
    grid-auto-columns: calc((100% - 72px) / 4); gap: 24px;
    overflow-x: auto; scroll-snap-type: x mandatory; scrollbar-width: none;
    padding: 4px 0 14px;
  }
  .mb-track::-webkit-scrollbar { display: none; }
  .mb-track > * { scroll-snap-align: start; }

  .mb-arrow {
    position: absolute; top: 34%; z-index: 2; width: 54px; height: 54px;
    display: grid; place-items: center; border: 0; border-radius: 50%;
    background: #fff; color: var(--mb-forest); font-size: 26px; cursor: pointer;
    box-shadow: 0 14px 36px rgba(34,51,42,.2);
    transition: background .3s, color .3s, transform .4s var(--ease);
  }
  .mb-arrow:hover { background: var(--mb-forest); color: #fff; transform: scale(1.1); }
  .mb-arrow.prev { left: -26px; }
  .mb-arrow.next { right: -26px; }

  .mb-card { min-width: 0; background: #fff; }
  .mb-card-visual {
    position: relative; aspect-ratio: 4 / 4.7; overflow: hidden;
    background: var(--mb-mist); border-radius: 20px;
  }
  .mb-card-visual > a { display: block; width: 100%; height: 100%; }
  .mb-card-visual img {
    display: block; width: 100%; height: 100%; object-fit: cover;
    transition: transform .9s var(--ease);
  }
  .mb-card:hover .mb-card-visual img { transform: scale(1.08); }
  .mb-card-placeholder { display: grid; place-items: center; height: 100%; color: #a8b8aa; }

  .mb-badge {
    position: absolute; top: 14px; left: 14px; padding: 7px 13px;
    background: #fff; color: var(--mb-accent-hover); border-radius: 999px;
    font-size: 12px; font-weight: 700; box-shadow: 0 6px 18px rgba(34,51,42,.12);
  }
  .mb-badge.is-order { color: #8a6a35; }
  .mb-badge.is-out { color: #b05a5a; }

  .mb-heart {
    position: absolute; top: 14px; right: 14px; width: 40px; height: 40px;
    display: grid; place-items: center; background: #fff; border: 0; border-radius: 50%;
    color: var(--mb-forest); cursor: pointer; box-shadow: 0 6px 18px rgba(34,51,42,.12);
    transition: transform .35s var(--ease), color .25s;
  }
  .mb-heart:hover { transform: scale(1.14); }
  .mb-heart.is-liked { color: #c0504f; animation: mb-beat .5s var(--ease); }
  .mb-heart.is-liked svg { fill: currentColor; }
  @keyframes mb-beat { 40% { transform: scale(1.35); } }

  .mb-quick {
    position: absolute; left: 14px; right: 14px; bottom: 14px;
    display: flex; align-items: center; justify-content: center; gap: 10px;
    min-height: 50px; border: 0; border-radius: 999px;
    background: var(--mb-forest); color: #fff;
    font: inherit; font-size: 14px; font-weight: 700; cursor: pointer;
    transform: translateY(70px); opacity: 0;
    transition: transform .5s var(--ease), opacity .35s, background .3s;
  }
  .mb-card:hover .mb-quick, .mb-quick:focus-visible { transform: none; opacity: 1; }
  .mb-quick:hover { background: var(--mb-accent); }

  .mb-card-body { padding: 20px 4px 6px; }
  .mb-card-name {
    display: block; color: var(--mb-ink);
    font-family: var(--font-display); font-size: 18.5px; font-weight: 600; line-height: 1.35;
    text-decoration: none; overflow: hidden; white-space: nowrap; text-overflow: ellipsis;
    transition: color .25s;
  }
  .mb-card-name:hover { color: var(--mb-accent); }
  .mb-card-sub {
    display: block; margin-top: 6px; color: var(--mb-muted); font-size: 13.5px;
    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .mb-card-foot { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 14px; }
  .mb-card-price { color: var(--mb-forest); font-size: 18px; font-weight: 700; }
  .mb-card-price.is-request { color: var(--mb-muted); font-size: 14px; font-weight: 500; }
  .mb-card-cart {
    width: 44px; height: 44px; display: grid; place-items: center;
    background: var(--mb-light); border: 1px solid var(--mb-line); border-radius: 50%;
    color: var(--mb-forest); cursor: pointer;
    transition: background .3s, color .3s, transform .35s var(--ease);
  }
  .mb-card-cart:hover { background: var(--mb-brass); border-color: var(--mb-brass); color: #fff; transform: scale(1.1); }

  .mb-empty { padding: 80px 20px; text-align: center; background: var(--mb-light); border-radius: 20px; color: var(--mb-muted); font-size: 16px; }

  .mb-skel-img, .mb-skel-line, .mb-cat-skel {
    background: linear-gradient(100deg, #edf1ea 30%, #f8faf6 50%, #edf1ea 70%);
    background-size: 220% 100%; animation: mb-shimmer 1.5s linear infinite;
  }
  .mb-skel-img { aspect-ratio: 4 / 4.7; border-radius: 20px; }
  .mb-skel-line { height: 13px; margin-top: 14px; border-radius: 6px; }
  @keyframes mb-shimmer { to { background-position: -220% 0; } }

  /* 3D */
  .mb-3d { background: var(--mb-forest); color: #fff; position: relative; overflow: hidden; }
  .mb-3d::before {
    content: ''; position: absolute; inset: 0; opacity: .5;
    background-image: linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: radial-gradient(ellipse at 70% 50%, #000 0%, transparent 70%);
    -webkit-mask-image: radial-gradient(ellipse at 70% 50%, #000 0%, transparent 70%);
  }
  .mb-3d-grid {
    position: relative; display: grid;
    grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr);
    align-items: center; gap: 70px; padding: 120px 0;
  }
  .mb-3d .mb-eyebrow { color: var(--mb-brass); }
  .mb-3d-copy h2 {
    margin: 0; font-family: var(--font-display);
    font-size: clamp(2.2rem, 3.8vw, 3.7rem); font-weight: 600; letter-spacing: -.025em; line-height: 1.1;
  }
  .mb-3d-copy p { max-width: 430px; margin: 24px 0 34px; color: #bccbc0; font-size: 17px; line-height: 1.75; }
  .mb-3d-list { list-style: none; margin: 0 0 40px; padding: 0; display: flex; flex-direction: column; gap: 16px; }
  .mb-3d-list li { display: flex; align-items: center; gap: 14px; color: #e9f0ea; font-size: 15.5px; font-weight: 500; }
  .mb-3d-list i {
    width: 44px; height: 44px; flex-shrink: 0; display: grid; place-items: center;
    border-radius: 12px; background: rgba(255,255,255,.08); color: var(--mb-brass);
  }

  .mb-3d-visual {
    position: relative; min-height: 480px; border-radius: 28px; overflow: hidden;
    display: grid; place-items: center; background: var(--mb-forest-2);
    box-shadow: 0 40px 90px rgba(0,0,0,.35);
  }
  .mb-3d-visual > img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; opacity: .75; }
  .mb-3d-visual::after {
    content: ''; position: absolute; inset: 0;
    background: radial-gradient(circle at 50% 50%, rgba(34,51,42,0) 30%, rgba(34,51,42,.55) 100%);
  }
  .mb-cube-scene { position: relative; z-index: 2; width: 150px; height: 150px; perspective: 700px; }
  .mb-cube { position: relative; width: 100%; height: 100%; transform-style: preserve-3d; animation: mb-cube 16s linear infinite; }
  .mb-cube span {
    position: absolute; inset: 0; border: 1.5px solid rgba(255,255,255,.85);
    background: rgba(192,151,90,.12); backdrop-filter: blur(1px);
  }
  .mb-cube span:nth-child(1) { transform: translateZ(75px); }
  .mb-cube span:nth-child(2) { transform: rotateY(180deg) translateZ(75px); }
  .mb-cube span:nth-child(3) { transform: rotateY(90deg) translateZ(75px); }
  .mb-cube span:nth-child(4) { transform: rotateY(-90deg) translateZ(75px); }
  .mb-cube span:nth-child(5) { transform: rotateX(90deg) translateZ(75px); }
  .mb-cube span:nth-child(6) { transform: rotateX(-90deg) translateZ(75px); }
  @keyframes mb-cube { from { transform: rotateX(-24deg) rotateY(0); } to { transform: rotateX(-24deg) rotateY(360deg); } }
  .mb-3d-tag {
    position: absolute; z-index: 3; left: 22px; bottom: 22px;
    padding: 10px 16px; border-radius: 999px; background: rgba(255,255,255,.14);
    border: 1px solid rgba(255,255,255,.25); backdrop-filter: blur(10px);
    font-size: 13px; font-weight: 600;
  }

  /* POURQUOI */
  .mb-why { padding: 130px 0 110px; background: #fff; }
  .mb-why-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-top: 56px; }
  .mb-why-item {
    position: relative; padding: 38px 30px 34px; border-radius: 22px;
    background: var(--mb-light); border: 1px solid transparent; overflow: hidden;
    transition: transform .5s var(--ease), background .4s, box-shadow .5s, border-color .4s;
  }
  .mb-why-item::before {
    content: ''; position: absolute; left: 0; top: 0; height: 4px; width: 100%;
    background: var(--mb-brass); transform: scaleX(0); transform-origin: left;
    transition: transform .6s var(--ease);
  }
  .mb-why-item:hover {
    transform: translateY(-10px); background: #fff; border-color: var(--mb-line);
    box-shadow: 0 30px 60px rgba(34,51,42,.12);
  }
  .mb-why-item:hover::before { transform: scaleX(1); }
  .mb-why-ico {
    width: 72px; height: 72px; margin-bottom: 28px; display: grid; place-items: center;
    background: var(--mb-forest); color: var(--mb-brass); border-radius: 20px;
    transition: transform .6s var(--ease);
  }
  .mb-why-item:hover .mb-why-ico { transform: rotate(-8deg) scale(1.08); }
  .mb-why-item strong { display: block; color: var(--mb-ink); font-family: var(--font-display); font-size: 21px; font-weight: 600; line-height: 1.3; }
  .mb-why-item p { margin: 12px 0 0; color: var(--mb-muted); font-size: 15.5px; line-height: 1.7; }

  /* PARTENAIRES CTA */
  .mb-partner { position: relative; isolation: isolate; background: var(--mb-forest-2); color: #fff; overflow: hidden; }
  .mb-partner-bg { position: absolute; inset: 0; z-index: -1; }
  .mb-partner-bg img { width: 100%; height: 100%; object-fit: cover; object-position: right center; }
  .mb-partner-bg::after {
    content: ''; position: absolute; inset: 0;
    background: linear-gradient(90deg, rgba(34,51,42,.97) 0%, rgba(34,51,42,.9) 45%, rgba(34,51,42,.45) 100%);
  }
  .mb-partner-inner {
    display: grid; grid-template-columns: 1.1fr .9fr; align-items: center; gap: 50px; padding: 120px 0;
  }
  .mb-partner .mb-eyebrow { color: var(--mb-brass); }
  .mb-partner h2 {
    max-width: 600px; margin: 0; font-family: var(--font-display);
    font-size: clamp(2.2rem, 4vw, 3.9rem); font-weight: 600; letter-spacing: -.025em; line-height: 1.1;
  }
  .mb-partner p { max-width: 480px; margin: 24px 0 36px; color: #c4d2c8; font-size: 17px; line-height: 1.75; }
  .mb-partner-points { display: flex; flex-direction: column; justify-self: end; gap: 16px; list-style: none; padding: 0; margin: 0; width: min(100%, 400px); }
  .mb-partner-points li {
    display: flex; align-items: center; gap: 18px; padding: 20px 24px;
    background: rgba(255,255,255,.08); border: 1px solid rgba(255,255,255,.14);
    border-radius: 18px; backdrop-filter: blur(10px);
    font-size: 15.5px; font-weight: 600;
    transition: transform .5s var(--ease), background .3s;
  }
  .mb-partner-points li:hover { transform: translateX(-10px); background: rgba(255,255,255,.14); }
  .mb-partner-points svg { color: var(--mb-brass); flex-shrink: 0; }

  /* CHIFFRES */
  .mb-stats { padding: 130px 0 90px; background: #fff; }
  .mb-stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); margin-top: 60px; border-top: 2px solid var(--mb-ink); }
  .mb-stat { padding: 34px 28px 10px 0; border-left: 1px solid var(--mb-line); padding-left: 28px; }
  .mb-stat:first-child { border-left: 0; padding-left: 0; }
  .mb-stat > svg { color: var(--mb-brass); margin-bottom: 22px; }
  .mb-stat strong {
    display: block; color: var(--mb-ink); font-family: var(--font-display);
    font-size: clamp(2.3rem, 3.8vw, 3.8rem); font-weight: 700; letter-spacing: -.03em; line-height: 1;
    font-variant-numeric: tabular-nums;
  }
  .mb-stat span { display: block; margin-top: 14px; max-width: 230px; color: var(--mb-muted); font-size: 15px; line-height: 1.6; }

  /* LOGOS */
  .mb-logos { padding: 50px 0 130px; background: #fff; }
  .mb-marq {
    margin-top: 50px; padding: 30px 0; overflow: hidden;
    border-block: 1px solid var(--mb-line);
    mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
    -webkit-mask-image: linear-gradient(90deg, transparent, #000 10%, #000 90%, transparent);
  }
  .mb-marq-track { display: flex; width: max-content; animation: mb-marq 34s linear infinite; }
  .mb-marq:hover .mb-marq-track { animation-play-state: paused; }
  @keyframes mb-marq { to { transform: translateX(-50%); } }
  .mb-logo {
    flex: 0 0 auto; padding: 0 44px; display: flex; align-items: center; gap: 44px;
    color: #8a978d; font-family: var(--font-display); font-size: 26px; font-weight: 600;
    letter-spacing: .02em; white-space: nowrap; transition: color .3s;
  }
  .mb-logo::after { content: '✦'; color: var(--mb-brass); font-size: 16px; }
  .mb-logo:hover { color: var(--mb-forest); }

  @media (max-width: 1100px) {
    .mb-wrap { width: calc(100% - 56px); }
    .mb-hero-grid { grid-template-columns: 1fr; padding: 60px 0 40px; min-height: 0; gap: 50px; }
    .mb-arch { max-width: 460px; margin: 0 auto; }
    .mb-hero-features { position: relative; }
    .mb-hero-features ul { grid-template-columns: repeat(2, 1fr); }
    .mb-hero-features li:nth-child(3) { border-left: 0; padding-left: 0; }
    .mb-cat-grid { grid-template-columns: repeat(2, 1fr); }
    .mb-track { grid-auto-columns: calc((100% - 48px) / 3); }
    .mb-3d-grid { grid-template-columns: 1fr; gap: 50px; padding: 90px 0; }
    .mb-why-grid, .mb-stats-grid { grid-template-columns: repeat(2, 1fr); }
    .mb-stat:nth-child(3) { border-left: 0; padding-left: 0; }
    .mb-partner-inner { grid-template-columns: 1fr; }
    .mb-partner-points { justify-self: start; }
    .mb-arrow.prev { left: 6px; } .mb-arrow.next { right: 6px; }
  }

  @media (max-width: 760px) {
    .mb-wrap { width: calc(100% - 36px); }
    .mb-head { flex-direction: column; align-items: flex-start; gap: 18px; margin-bottom: 36px; }
    .mb-float { right: 6px; top: 8%; }
    .mb-ring { left: 4px; width: 100px; height: 100px; bottom: 60px; }
    .mb-cats { padding: 80px 0 50px; }
    .mb-products { padding: 40px 0 80px; }
    .mb-track { grid-auto-columns: 78%; gap: 16px; }
    .mb-arrow { display: none; }
    .mb-quick { transform: none; opacity: 1; min-height: 44px; }
    .mb-3d-visual { min-height: 340px; }
    .mb-why { padding: 80px 0; }
    .mb-why-grid, .mb-stats-grid { grid-template-columns: 1fr; }
    .mb-stat { border-left: 0; padding-left: 0; border-top: 1px solid var(--mb-line); }
    .mb-stat:first-child { border-top: 0; }
    .mb-partner-inner { padding: 80px 0; }
    .mb-stats { padding: 80px 0 50px; }
    .mb-logos { padding: 40px 0 80px; }
    .mb-logo { font-size: 21px; padding: 0 28px; gap: 28px; }
  }

  @media (max-width: 480px) {
    .mb-cat-grid { gap: 12px; }
    .mb-cat-label { padding: 16px; }
    .mb-cat-go { display: none; }
    .mb-hero-features ul { grid-template-columns: 1fr; }
    .mb-hero-features li { border-left: 0; padding-left: 0; padding-block: 15px; }
    .mb-track { grid-auto-columns: 86%; }
  }

  @media (prefers-reduced-motion: reduce) {
    .mb-page *, .mb-page *::before, .mb-page *::after {
      animation: none !important; transition: none !important; scroll-behavior: auto !important;
    }
    .mb-page .rv { opacity: 1; transform: none; }
    .mb-line > span, .mb-fade-up { transform: none; opacity: 1; }
    .mb-arch { clip-path: none; }
    .mb-arch img { transform: none; }
  }
`;

/** Compteur animé lancé à l'entrée dans le viewport */
function CountUp({
  to, prefix = '', suffix = '', decimals = 0,
}: { to: number; prefix?: string; suffix?: string; decimals?: number }) {
  const ref = useRef<HTMLElement>(null);
  const [val, setVal] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !('IntersectionObserver' in window)) {
      setVal(to);
      return;
    }

    let raf = 0;
    const io = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      io.disconnect();

      const start = performance.now();
      const duration = 1800;

      const tick = (now: number) => {
        const t = Math.min(1, (now - start) / duration);
        const eased = 1 - Math.pow(1 - t, 4);
        setVal(to * eased);
        if (t < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    }, { threshold: 0.4 });

    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to]);

  return (
    <strong ref={ref}>
      {prefix}
      {val.toLocaleString('fr-FR', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      })}
      {suffix}
    </strong>
  );
}

function ProduitCard({ produit }: { produit: Produit }) {
  const p = produit as AnyProduit;
  const { addItem } = useCartStore();
  const [liked, setLiked] = useState(false);

  const image = getMainImage(p);
  const badge = getBadge(p);
  const partner = getPartnerName(p);

  const variant =
    p.variantes?.find((v: any) => v.active !== false)
    ?? p.variantes?.[0];

  const prixMin = Number(
    p.prix_min ?? variant?.prix_promo ?? variant?.prix_vente ?? 0
  );

  const hasPrice = Number.isFinite(prixMin) && prixMin > 0;

  const subtitle = [p.categorie?.nom, partner]
    .filter(Boolean)
    .join(' • ');

  const handleAdd = () => {
    if (!variant) {
      toast.error('Aucune variante disponible pour ce produit.');
      return;
    }

    const added = addItem({
      ...variant,
      produit: {
        nom: p.nom,
        slug: p.slug,
        medias: p.medias,
      },
    });

    if (added) toast.success('Produit ajouté au panier');
    else toast.error('Cette variante est en rupture de stock.');
  };

  return (
    <article className="mb-card">
      <div className="mb-card-visual">
        <Link to={`/catalogue/${p.slug}`} aria-label={`Voir ${p.nom}`}>
          {image ? (
            <img src={image} alt={p.nom} loading="lazy" />
          ) : (
            <div className="mb-card-placeholder">
              <IconCube size={38} />
            </div>
          )}
        </Link>

        {badge && (
          <span className={`mb-badge ${badge.cls}`}>
            {badge.label}
          </span>
        )}

        <button
          type="button"
          className={`mb-heart ${liked ? 'is-liked' : ''}`}
          aria-label="Ajouter aux favoris"
          aria-pressed={liked}
          onClick={() => setLiked(v => !v)}
        >
          <IconHeart size={17} />
        </button>

        {variant && (
          <button type="button" className="mb-quick" onClick={handleAdd}>
            <IconCart size={17} /> Ajouter au panier
          </button>
        )}
      </div>

      <div className="mb-card-body">
        <Link to={`/catalogue/${p.slug}`} className="mb-card-name">
          {p.nom}
        </Link>

        <span className="mb-card-sub">
          {subtitle || 'Mobilier'}
        </span>

        <div className="mb-card-foot">
          <span className={`mb-card-price ${!hasPrice ? 'is-request' : ''}`}>
            {hasPrice ? formatPrix(prixMin) : 'Prix sur demande'}
          </span>

          {variant && (
            <button
              type="button"
              className="mb-card-cart"
              onClick={handleAdd}
              aria-label={`Ajouter ${p.nom} au panier`}
            >
              <IconCart size={17} />
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

function CardSkeleton() {
  return (
    <div className="mb-card">
      <div className="mb-skel-img" />
      <div className="mb-card-body">
        <div className="mb-skel-line" style={{ width: '75%' }} />
        <div className="mb-skel-line" style={{ width: '48%' }} />
        <div className="mb-skel-line" style={{ width: '35%' }} />
      </div>
    </div>
  );
}

export default function HomePage() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [categories, setCategories] = useState<Categorie[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [heroOk, setHeroOk] = useState(true);

  const navigate = useNavigate();
  const pageRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      publicApi.produitsMisEnAvant(),
      publicApi.categories(),
    ])
      .then(([p, c]) => {
        if (!mounted) return;

        setProduits(p.data as unknown as Produit[]);
        setCategories(c.data as unknown as Categorie[]);
      })
      .catch(() => {
        if (mounted) {
          toast.error('Impossible de charger certaines données de la page.');
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, []);

  // Révélation des sections au scroll (rejouée quand les données arrivent)
  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;

    const items = Array.from(
      root.querySelectorAll<HTMLElement>('.rv:not(.in)')
    );

    if (!('IntersectionObserver' in window)) {
      items.forEach(el => el.classList.add('in'));
      return;
    }

    const io = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -6% 0px' }
    );

    items.forEach(el => io.observe(el));
    return () => io.disconnect();
  }, [loading, produits.length, categories.length]);

  const partnerNames = useMemo(() => {
    const names = Array.from(
      new Set(
        produits
          .map(p => getPartnerName(p as AnyProduit))
          .filter(Boolean)
      )
    );

    return names.length >= 3
      ? names.slice(0, 8)
      : FALLBACK_PARTNERS;
  }, [produits]);

  const visual3d = useMemo(() => {
    const found = produits.find(p =>
      getMainImage(p as AnyProduit)
    );

    return found
      ? getMainImage(found as AnyProduit)
      : undefined;
  }, [produits]);

  const scrollBy = (
    ref: React.RefObject<HTMLDivElement | null>,
    dir: 1 | -1
  ) => {
    const el = ref.current;
    if (!el) return;

    el.scrollBy({
      left: dir * el.clientWidth * 0.8,
      behavior: 'smooth',
    });
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const value = search.trim();
    if (!value) return;

    navigate(`/catalogue?recherche=${encodeURIComponent(value)}`);
  };

  const visibleCategories = categories.slice(0, 7);
  const marquee = [...partnerNames, ...partnerNames];

  return (
    <>
      <style>{styles}</style>

      <div className="mb-page" ref={pageRef}>
        {/* HERO */}

        <section className="mb-hero">
          <div className="mb-wrap mb-hero-grid">
            <div>
              <span className="mb-eyebrow mb-fade-up" style={{ ['--d' as any]: '.05s' }}>
                Design et mobilier made in Côte d'Ivoire
              </span>

              <h1>
                <span className="mb-line" style={{ ['--i' as any]: 0 }}>
                  <span>Le mobilier africain</span>
                </span>
                <span className="mb-line" style={{ ['--i' as any]: 1 }}>
                  <span>prend une nouvelle</span>
                </span>
                <span className="mb-line" style={{ ['--i' as any]: 2 }}>
                  <span>dimension.</span>
                </span>
              </h1>

              <p className="mb-hero-lead mb-fade-up" style={{ ['--d' as any]: '.7s' }}>
                Découvrez des meubles et objets de décoration uniques,
                imaginés par des talents locaux. Des créations qui allient
                savoir-faire, esthétique et fonctionnalité.
              </p>

              <form
                className="mb-search mb-fade-up"
                style={{ ['--d' as any]: '.9s' }}
                onSubmit={handleSearch}
                role="search"
              >
                <IconSearch size={20} className="mb-search-icon" />

                <input
                  type="search"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher un meuble, une catégorie..."
                  aria-label="Rechercher dans le catalogue"
                />

                <button type="submit" aria-label="Rechercher">
                  <IconSearch size={19} />
                </button>
              </form>
            </div>

            <div className="mb-hero-visual">
              <div className="mb-arch">
                {heroOk && (
                  <img
                    src={HERO_IMAGE}
                    alt="Salon meublé par des créateurs ivoiriens"
                    onError={() => setHeroOk(false)}
                  />
                )}
              </div>

              <div className="mb-ring" aria-hidden="true">
                <svg viewBox="0 0 120 120">
                  <defs>
                    <path id="mb-circ" d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0" />
                  </defs>
                  <text>
                    <textPath href="#mb-circ">Artisans ivoiriens • Design local •</textPath>
                  </text>
                </svg>
                <b><Ico name="diamond" size={28} /></b>
              </div>

              <div className="mb-float">
                <i><Ico name="stock" size={22} /></i>
                <div>
                  <strong>Stock en temps réel</strong>
                  <span>Disponibilité mise à jour</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-hero-features">
            <div className="mb-wrap">
              <ul>
                {FEATURES.map(f => (
                  <li key={f.label}>
                    {f.icon === 'cube'
                      ? <IconCube size={26} />
                      : <Ico name={f.icon} size={26} />}
                    <span>{f.label}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </section>

        {/* CATÉGORIES */}

        <section className="mb-cats">
          <div className="mb-wrap">
            <div className="mb-head rv">
              <div>
                <span className="mb-eyebrow">Nos univers</span>
                <h2 className="mb-title">Explorez nos catégories</h2>
                <p className="mb-sub">
                  Des pièces pensées pour chaque espace de votre intérieur.
                </p>
              </div>

              <Link to="/catalogue" className="mb-more">
                Toutes les catégories <IconArrowRight size={16} />
              </Link>
            </div>

            <div className="mb-cat-grid">
              {loading
                ? Array.from({ length: 7 }).map((_, i) => (
                    <div key={i} className="mb-cat-skel" />
                  ))
                : visibleCategories.map((categorie, i) => {
                    const cat = categorie as AnyCategorie;
                    const img = getCategoryImage(cat);

                    return (
                      <Link
                        key={cat.id}
                        to={`/catalogue?categorie=${cat.slug}`}
                        className="mb-cat rv"
                        style={{ ['--d' as any]: `${(i % 4) * 90}ms` }}
                      >
                        <div className="mb-cat-img">
                          {img ? (
                            <img src={img} alt={cat.nom} loading="lazy" />
                          ) : (
                            <IconCube size={34} />
                          )}
                        </div>

                        <div className="mb-cat-label">
                          <strong>{cat.nom}</strong>
                          <span className="mb-cat-go">
                            <IconArrowRight size={18} />
                          </span>
                        </div>
                      </Link>
                    );
                  })}
            </div>
          </div>
        </section>

        {/* PRODUITS */}

        <section className="mb-products">
          <div className="mb-wrap">
            <div className="mb-head rv">
              <div>
                <span className="mb-eyebrow">La sélection ARCHILAB</span>
                <h2 className="mb-title">Nos meubles en vedette</h2>
                <p className="mb-sub">
                  Des créations singulières pour un intérieur qui vous ressemble.
                </p>
              </div>

              <Link to="/catalogue" className="mb-more">
                Voir tout le catalogue <IconArrowRight size={16} />
              </Link>
            </div>

            {loading ? (
              <div className="mb-track">
                {Array.from({ length: 4 }).map((_, i) => (
                  <CardSkeleton key={i} />
                ))}
              </div>
            ) : produits.length === 0 ? (
              <div className="mb-empty">
                Aucun produit mis en avant pour le moment.
              </div>
            ) : (
              <div className="mb-carousel rv">
                <button
                  type="button"
                  className="mb-arrow prev"
                  aria-label="Produits précédents"
                  onClick={() => scrollBy(trackRef, -1)}
                >
                  ‹
                </button>

                <div className="mb-track" ref={trackRef}>
                  {produits.slice(0, 12).map(produit => (
                    <ProduitCard key={produit.id} produit={produit} />
                  ))}
                </div>

                <button
                  type="button"
                  className="mb-arrow next"
                  aria-label="Produits suivants"
                  onClick={() => scrollBy(trackRef, 1)}
                >
                  ›
                </button>
              </div>
            )}
          </div>
        </section>

        {/* VISUALISATION 3D */}

        <section className="mb-3d">
          <div className="mb-wrap mb-3d-grid">
            <div className="mb-3d-copy rv">
              <span className="mb-eyebrow">Innovation</span>
              <h2>
                Visualisez en 3D votre futur intérieur.
              </h2>

              <p>
                Explorez nos meubles sous tous les angles grâce
                aux modèles 3D interactifs et aux plans techniques
                disponibles dans notre catalogue.
              </p>

              <ul className="mb-3d-list">
                <li>
                  <i><IconCube size={22} /></i>
                  Modèles 3D interactifs
                </li>
                <li>
                  <i><Ico name="doc" size={22} /></i>
                  Plans 2D téléchargeables
                </li>
                <li>
                  <i><Ico name="phone" size={22} /></i>
                  Réalité augmentée (phase 2)
                </li>
              </ul>

              <Link to="/catalogue" className="mb-btn is-brass">
                Explorer nos modèles <IconArrowRight size={16} />
              </Link>
            </div>

            <div className="mb-3d-visual rv" style={{ ['--d' as any]: '150ms' }}>
              <img
                src={VISUAL_3D_IMAGE}
                alt="Visualisation de mobilier en 3D"
                loading="lazy"
                onError={e => {
                  const img = e.currentTarget;

                  if (visual3d && !img.dataset.fallback) {
                    img.dataset.fallback = 'true';
                    img.src = visual3d;
                  } else {
                    img.style.display = 'none';
                  }
                }}
              />

              <div className="mb-cube-scene" aria-hidden="true">
                <div className="mb-cube">
                  <span /><span /><span /><span /><span /><span />
                </div>
              </div>

              <span className="mb-3d-tag">Faites pivoter, zoomez, imaginez</span>
            </div>
          </div>
        </section>

        {/* POURQUOI ARCHILAB */}

        <section className="mb-why">
          <div className="mb-wrap">
            <div className="rv">
              <span className="mb-eyebrow">Notre différence</span>
              <h2 className="mb-title">Pourquoi choisir ARCHILAB ?</h2>

              <p className="mb-sub">
                Une plateforme qui rapproche les créateurs, les professionnels
                et les passionnés de mobilier.
              </p>
            </div>

            <div className="mb-why-grid">
              {WHY.map((w, i) => (
                <div
                  className="mb-why-item rv"
                  key={w.title}
                  style={{ ['--d' as any]: `${i * 100}ms` }}
                >
                  <div className="mb-why-ico">
                    {w.icon === 'cube'
                      ? <IconCube size={30} />
                      : <Ico name={w.icon} size={30} />}
                  </div>

                  <strong>{w.title}</strong>
                  <p>{w.text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* DEVENIR PARTENAIRE */}

        <section className="mb-partner">
          <div className="mb-partner-bg">
            <img
              src={PARTNER_IMAGE}
              alt=""
              loading="lazy"
              onError={e => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>

          <div className="mb-wrap mb-partner-inner">
            <div className="rv">
              <span className="mb-eyebrow">Collaborons ensemble</span>

              <h2>Vous êtes concepteur ou fabricant ?</h2>

              <p>
                Rejoignez notre réseau de partenaires et
                donnez une nouvelle visibilité à vos créations
                auprès de clients en Côte d'Ivoire.
              </p>

              <Link to="/partenaires" className="mb-btn is-brass">
                Devenir partenaire <IconArrowRight size={16} />
              </Link>
            </div>

            <ul className="mb-partner-points">
              {[
                { icon: <Ico name="pen" size={28} />, text: 'Numérisation de vos créations' },
                { icon: <Ico name="store" size={28} />, text: 'Visibilité auprès de nouveaux clients' },
                { icon: <IconCube size={28} />, text: 'Gestion simplifiée de vos ventes' },
              ].map((pt, i) => (
                <li
                  key={pt.text}
                  className="rv"
                  style={{ ['--d' as any]: `${200 + i * 130}ms` }}
                >
                  {pt.icon}
                  {pt.text}
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* ARCHILAB EN CHIFFRES */}

        <section className="mb-stats">
          <div className="mb-wrap">
            <div className="rv">
              <span className="mb-eyebrow">Notre ambition</span>
              <h2 className="mb-title">ARCHILAB en chiffres</h2>
            </div>

            <div className="mb-stats-grid">
              {STATS.map((s, i) => (
                <div
                  className="mb-stat rv"
                  key={s.text}
                  style={{ ['--d' as any]: `${i * 110}ms` }}
                >
                  <Ico name={s.icon} size={34} />

                  {s.to !== undefined ? (
                    <CountUp
                      to={s.to}
                      prefix={s.prefix}
                      suffix={s.suffix}
                      decimals={s.decimals}
                    />
                  ) : (
                    <strong>{s.big}</strong>
                  )}

                  <span>{s.text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* PARTENAIRES */}

        <section className="mb-logos">
          <div className="mb-wrap">
            <div className="rv">
              <span className="mb-eyebrow">Notre réseau</span>
              <h2 className="mb-title">Nos partenaires</h2>

              <p className="mb-sub">
                Des talents et ateliers qui participent au rayonnement
                du mobilier et du design africain.
              </p>
            </div>

            <div className="mb-marq" aria-label="Liste de nos partenaires">
              <div className="mb-marq-track">
                {marquee.map((name, i) => (
                  <div
                    className="mb-logo"
                    key={`${name}-${i}`}
                    aria-hidden={i >= partnerNames.length}
                  >
                    {name}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
