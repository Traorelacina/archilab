import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';
import { authApi } from '../../api/auth';
import toast from 'react-hot-toast';
import {
  IconMenu, IconX, IconSearch, IconUser, IconCart,
  IconHeart, IconHome, IconLogOut, IconChevronDown,
} from '../ui/Icons';

const NAV_LINKS = [
  { to: '/', label: 'Accueil', exact: true },
  { to: '/catalogue', label: 'Catalogue' },
  { to: '/apropos', label: 'À propos' },
  { to: '/partenaires', label: 'Nos partenaires' },
  { to: '/services', label: 'Services' },
  { to: '/contact', label: 'Contact' },
];

const FOOTER_COLS = [
  {
    title: 'Catalogue',
    links: [
      ['Salon', '/catalogue?categorie=salon'],
      ['Salle à manger', '/catalogue?categorie=salle-a-manger'],
      ['Chambre', '/catalogue?categorie=chambre'],
      ['Bureau', '/catalogue?categorie=bureau'],
      ['Rangement', '/catalogue?categorie=rangement'],
      ['Décoration', '/catalogue?categorie=decoration'],
      ['Extérieur', '/catalogue?categorie=exterieur'],
    ],
  },
  {
    title: 'À propos',
    links: [
      ['Notre histoire', '/apropos'],
      ['Nos partenaires', '/partenaires'],
      ['Contact', '/contact'],
    ],
  },
  {
    title: 'Services',
    links: [
      ['Numérisation 2D/3D', '/services'],
      ['Gestion de stock', '/services'],
      ['Devis & facturation', '/services'],
      ['Accompagnement partenaires', '/partenaires'],
    ],
  },
];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap');

  .mbl-layout {
    --mbl-white: #ffffff;
    --mbl-bg: #f4f6f2;
    --mbl-surface: #e9eee7;
    --mbl-line: #dde3da;
    --mbl-ink: #1d2a22;
    --mbl-forest: #22332a;
    --mbl-forest-2: #2e4236;
    --mbl-text: #3b4a40;
    --mbl-muted: #6b786f;
    --mbl-accent: #5f7a65;
    --mbl-accent-hover: #4a6350;
    --mbl-brass: #c0975a;
    --font-display: 'Fraunces', Georgia, serif;
    --font-body: 'DM Sans', system-ui, -apple-system, sans-serif;
    --ease: cubic-bezier(.22,.8,.24,1);
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    background: var(--mbl-white);
    color: var(--mbl-text);
    font-family: var(--font-body);
    font-size: 15px;
    -webkit-font-smoothing: antialiased;
  }

  .mbl-layout *,
  .mbl-layout *::before,
  .mbl-layout *::after { box-sizing: border-box; }

  .mbl-layout :focus-visible {
    outline: 2px solid var(--mbl-brass);
    outline-offset: 3px;
  }

  /* BANDEAU */
  .mbl-top {
    background: var(--mbl-forest);
    color: #e8efe9;
    font-size: 12.5px;
    font-weight: 500;
    overflow: hidden;
  }
  .mbl-top-inner {
    width: min(1380px, calc(100% - 80px));
    margin: auto;
    min-height: 38px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
  }
  .mbl-top b { color: var(--mbl-brass); font-weight: 700; }
  .mbl-top-dot {
    display: inline-block; width: 7px; height: 7px; margin-right: 9px;
    border-radius: 50%; background: #7fd49a;
    animation: mbl-pulse 2s ease-in-out infinite;
  }
  @keyframes mbl-pulse {
    0%,100% { box-shadow: 0 0 0 0 rgba(127,212,154,.55); }
    50% { box-shadow: 0 0 0 7px rgba(127,212,154,0); }
  }

  /* HEADER */
  .mbl-header {
    position: sticky; top: 0; z-index: 100; width: 100%;
    background: rgba(255,255,255,.92);
    border-bottom: 1px solid var(--mbl-line);
    backdrop-filter: blur(16px) saturate(1.4);
    transition: box-shadow .35s var(--ease), background .35s;
  }
  .mbl-header.is-scrolled {
    background: rgba(255,255,255,.97);
    box-shadow: 0 10px 34px rgba(29,42,34,.09);
  }
  .mbl-bar {
    width: min(1380px, calc(100% - 80px));
    margin: auto; height: 88px;
    display: flex; align-items: center; gap: 36px;
    transition: height .35s var(--ease);
  }
  .mbl-header.is-scrolled .mbl-bar { height: 70px; }

  .mbl-logo { display: inline-flex; align-items: center; flex-shrink: 0; text-decoration: none; }
  .mbl-logo img { max-width: 190px; object-fit: contain; transition: transform .4s var(--ease); }
  .mbl-logo:hover img { transform: scale(1.04); }

  .mbl-nav {
    display: flex; align-items: center; justify-content: center;
    flex: 1; gap: clamp(10px, 1.7vw, 30px);
  }
  .mbl-nav a {
    position: relative; padding: 10px 2px;
    color: var(--mbl-ink); font-size: 14px; font-weight: 600;
    letter-spacing: .005em; text-decoration: none; white-space: nowrap;
    transition: color .25s ease;
  }
  .mbl-nav a::after {
    content: ''; position: absolute; left: 0; right: 0; bottom: 3px; height: 2px;
    background: var(--mbl-brass);
    transform: scaleX(0); transform-origin: right;
    transition: transform .4s var(--ease);
  }
  .mbl-nav a:hover { color: var(--mbl-accent); }
  .mbl-nav a:hover::after,
  .mbl-nav a.is-active::after { transform: scaleX(1); transform-origin: left; }
  .mbl-nav a.is-active { color: var(--mbl-accent-hover); }

  .mbl-actions { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
  .mbl-icon-btn {
    position: relative; width: 44px; height: 44px;
    display: grid; place-items: center;
    border: 0; border-radius: 50%; background: transparent;
    color: var(--mbl-ink); cursor: pointer; text-decoration: none;
    transition: background .25s, color .25s, transform .3s var(--ease);
  }
  .mbl-icon-btn:hover { background: var(--mbl-surface); color: var(--mbl-accent-hover); transform: translateY(-2px); }

  .mbl-cart-count {
    position: absolute; top: 1px; right: 0;
    min-width: 19px; height: 19px; padding: 0 5px;
    border-radius: 20px; display: grid; place-items: center;
    background: var(--mbl-brass); color: #fff;
    font-size: 11px; font-weight: 700;
    animation: mbl-pop .4s var(--ease);
  }
  @keyframes mbl-pop { from { transform: scale(0); } to { transform: scale(1); } }

  .mbl-login {
    display: inline-flex; justify-content: center; align-items: center;
    min-height: 44px; margin-left: 8px; padding: 0 24px;
    background: var(--mbl-forest); border: 1px solid var(--mbl-forest);
    border-radius: 999px; color: #fff;
    font-size: 13.5px; font-weight: 600; text-decoration: none; white-space: nowrap;
    transition: background .3s, transform .3s var(--ease), box-shadow .3s;
  }
  .mbl-login:hover {
    background: var(--mbl-accent); border-color: var(--mbl-accent);
    transform: translateY(-2px); box-shadow: 0 10px 22px rgba(46,66,54,.25);
  }

  .mbl-user-wrap { position: relative; }
  .mbl-user-btn {
    display: flex; align-items: center; gap: 8px;
    padding: 10px 16px; margin-left: 8px;
    background: var(--mbl-surface); border: 1px solid var(--mbl-line);
    border-radius: 999px; color: var(--mbl-ink);
    font: inherit; font-size: 13.5px; font-weight: 600; cursor: pointer;
    transition: background .25s;
  }
  .mbl-user-btn:hover { background: var(--mbl-line); }
  .mbl-user-name { max-width: 100px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }

  .mbl-menu {
    position: absolute; top: calc(100% + 14px); right: 0; z-index: 150;
    width: 270px; background: #fff; border: 1px solid var(--mbl-line);
    border-radius: 14px; box-shadow: 0 24px 60px rgba(29,42,34,.16);
    overflow: hidden; transform-origin: top right;
    animation: mbl-menu-in .28s var(--ease) both;
  }
  @keyframes mbl-menu-in {
    from { opacity: 0; transform: translateY(-8px) scale(.96); }
    to { opacity: 1; transform: none; }
  }
  .mbl-menu-info { padding: 19px; background: var(--mbl-bg); border-bottom: 1px solid var(--mbl-line); }
  .mbl-menu-info strong { display: block; font-size: 14.5px; font-weight: 700; color: var(--mbl-ink); overflow-wrap: anywhere; }
  .mbl-menu-info small { display: block; margin-top: 5px; color: var(--mbl-muted); font-size: 12.5px; overflow-wrap: anywhere; }
  .mbl-menu a, .mbl-menu button {
    width: 100%; display: flex; align-items: center; gap: 12px;
    padding: 14px 19px; background: transparent; border: 0;
    color: var(--mbl-text); text-decoration: none;
    font: inherit; font-size: 14px; font-weight: 500; text-align: left; cursor: pointer;
    transition: background .2s, padding-left .3s var(--ease);
  }
  .mbl-menu a:hover, .mbl-menu button:hover { background: var(--mbl-bg); padding-left: 25px; }
  .mbl-menu .mbl-logout { border-top: 1px solid var(--mbl-line); color: #b05a5a; }

  .mbl-burger { display: none; }

  .mbl-mobile {
    position: absolute; top: 100%; left: 0; right: 0;
    background: #fff; padding: 8px 26px 24px;
    border-top: 1px solid var(--mbl-line);
    box-shadow: 0 24px 40px rgba(29,42,34,.12);
    max-height: calc(100dvh - 80px); overflow-y: auto;
    animation: mbl-drop .35s var(--ease) both;
  }
  @keyframes mbl-drop { from { opacity: 0; transform: translateY(-12px); } to { opacity: 1; transform: none; } }
  .mbl-mobile a {
    display: block; padding: 17px 6px;
    color: var(--mbl-ink); border-bottom: 1px solid var(--mbl-line);
    text-decoration: none; font-size: 16px; font-weight: 600;
    font-family: var(--font-display);
  }
  .mbl-mobile a:hover, .mbl-mobile a.is-active { color: var(--mbl-accent); }

  .mbl-main { flex: 1; min-width: 0; }

  /* FOOTER */
  .mbl-footer {
    position: relative; overflow: hidden;
    background: var(--mbl-forest); color: #cfdad2;
    padding: 90px 0 0;
  }
  .mbl-footer-wrap { position: relative; z-index: 1; width: min(1380px, calc(100% - 80px)); margin: 0 auto; }
  .mbl-footer-grid {
    display: grid; grid-template-columns: 1.2fr repeat(3, minmax(0, 1fr)) 1.5fr;
    gap: 40px; padding-bottom: 70px;
  }
  .mbl-footer .mbl-logo img { filter: brightness(0) invert(1); }
  .mbl-footer h4 {
    margin: 0 0 24px; color: #fff;
    font-family: var(--font-display); font-size: 17px; font-weight: 600;
  }
  .mbl-footer ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 14px; }
  .mbl-footer ul a {
    display: inline-block; color: #aebcb2; font-size: 14px; line-height: 1.5; text-decoration: none;
    transition: color .25s, transform .3s var(--ease);
  }
  .mbl-footer ul a:hover { color: var(--mbl-brass); transform: translateX(5px); }

  .mbl-news-text { margin: 0 0 20px; color: #aebcb2; font-size: 14px; line-height: 1.75; }
  .mbl-news {
    display: flex; background: rgba(255,255,255,.07);
    border: 1px solid rgba(255,255,255,.16); border-radius: 999px;
    overflow: hidden; padding: 4px;
    transition: border-color .3s, background .3s;
  }
  .mbl-news:focus-within { border-color: var(--mbl-brass); background: rgba(255,255,255,.11); }
  .mbl-news input {
    flex: 1; min-width: 0; padding: 12px 16px; border: 0; background: transparent;
    outline: none; font: inherit; font-size: 14px; color: #fff;
  }
  .mbl-news input::placeholder { color: #8fa095; }
  .mbl-news button {
    width: 46px; height: 46px; border: 0; border-radius: 50%;
    background: var(--mbl-brass); color: #fff; font-size: 18px; cursor: pointer;
    transition: transform .3s var(--ease), background .25s;
  }
  .mbl-news button:hover { transform: rotate(-35deg) scale(1.06); background: #d3aa6c; }

  .mbl-socials { display: flex; gap: 10px; margin-top: 24px; }
  .mbl-socials a {
    width: 40px; height: 40px; display: grid; place-items: center;
    border: 1px solid rgba(255,255,255,.2); border-radius: 50%;
    color: #dfe8e1; text-decoration: none; font-size: 12px; font-weight: 700;
    transition: background .3s, color .3s, transform .3s var(--ease), border-color .3s;
  }
  .mbl-socials a:hover { background: var(--mbl-brass); border-color: var(--mbl-brass); color: #fff; transform: translateY(-4px); }

  .mbl-legal {
    display: flex; justify-content: space-between; align-items: center;
    gap: 15px; flex-wrap: wrap; padding: 26px 0;
    border-top: 1px solid rgba(255,255,255,.12);
    color: #8fa095; font-size: 13px;
  }
  .mbl-legal nav { display: flex; flex-wrap: wrap; gap: 22px; }
  .mbl-legal a { color: inherit; text-decoration: none; transition: color .25s; }
  .mbl-legal a:hover { color: var(--mbl-brass); }

  .mbl-wordmark {
    position: relative; z-index: 0;
    margin: -10px 0 -0.18em; text-align: center;
    font-family: var(--font-display); font-weight: 700;
    font-size: clamp(5rem, 22vw, 20rem); line-height: .9; letter-spacing: -.04em;
    color: transparent; -webkit-text-stroke: 1px rgba(255,255,255,.13);
    user-select: none; pointer-events: none;
  }

  /* PANIER */
  .mbl-cart-overlay {
    position: fixed; inset: 0; z-index: 300;
    background: rgba(20,32,25,.45); backdrop-filter: blur(4px);
    animation: mbl-fade .3s ease both;
  }
  @keyframes mbl-fade { from { opacity: 0; } to { opacity: 1; } }
  .mbl-cart-drawer {
    position: fixed; top: 0; right: 0; bottom: 0; z-index: 301;
    width: min(460px, 100%); display: flex; flex-direction: column;
    background: #fff; box-shadow: -20px 0 70px rgba(20,32,25,.2);
    animation: mbl-slide .45s var(--ease) both;
  }
  @keyframes mbl-slide { from { transform: translateX(100%); } to { transform: none; } }
  .mbl-cart-top {
    padding: 26px; display: flex; align-items: center; justify-content: space-between;
    border-bottom: 1px solid var(--mbl-line);
  }
  .mbl-cart-top h2 { margin: 0; font-family: var(--font-display); font-size: 26px; font-weight: 600; color: var(--mbl-ink); }
  .mbl-cart-close {
    display: grid; place-items: center; width: 40px; height: 40px;
    background: var(--mbl-surface); border: 0; border-radius: 50%;
    color: var(--mbl-ink); cursor: pointer;
    transition: transform .35s var(--ease), background .25s;
  }
  .mbl-cart-close:hover { transform: rotate(90deg); background: var(--mbl-line); }
  .mbl-cart-list { flex: 1; overflow-y: auto; padding: 8px 24px 22px; }
  .mbl-cart-empty { padding: 90px 20px; text-align: center; color: var(--mbl-muted); font-size: 15px; }
  .mbl-cart-empty svg { color: var(--mbl-accent); margin-bottom: 8px; }
  .mbl-cart-empty a { font-weight: 600; color: var(--mbl-accent-hover); }
  .mbl-cart-item {
    display: flex; gap: 15px; padding: 20px 0;
    border-bottom: 1px solid var(--mbl-line);
    animation: mbl-item .5s var(--ease) both;
  }
  @keyframes mbl-item { from { opacity: 0; transform: translateX(26px); } to { opacity: 1; transform: none; } }
  .mbl-cart-photo {
    flex: 0 0 92px; width: 92px; height: 100px; object-fit: cover;
    background: var(--mbl-surface); border-radius: 10px;
  }
  .mbl-cart-info { flex: 1; min-width: 0; }
  .mbl-cart-info strong { display: block; color: var(--mbl-ink); font-size: 15px; font-weight: 700; line-height: 1.45; }
  .mbl-cart-info small { display: block; margin-top: 4px; color: var(--mbl-muted); font-size: 12.5px; }
  .mbl-cart-price { margin: 12px 0 0; color: var(--mbl-accent-hover); font-size: 16px; font-weight: 700; white-space: nowrap; }
  .mbl-cart-qty {
    display: inline-flex; align-items: center; gap: 4px; margin-top: 12px;
    border: 1px solid var(--mbl-line); border-radius: 999px; padding: 3px;
  }
  .mbl-cart-qty button {
    width: 30px; height: 30px; display: grid; place-items: center;
    background: var(--mbl-bg); border: 0; border-radius: 50%;
    color: var(--mbl-ink); font-size: 16px; cursor: pointer;
    transition: background .2s, color .2s;
  }
  .mbl-cart-qty button:hover:not(:disabled) { background: var(--mbl-forest); color: #fff; }
  .mbl-cart-qty button:disabled { opacity: .35; cursor: not-allowed; }
  .mbl-cart-qty span { min-width: 28px; text-align: center; font-size: 14px; font-weight: 600; }
  .mbl-remove {
    align-self: flex-start; border: 0; background: transparent;
    color: #a3afa6; cursor: pointer; padding: 4px;
    transition: color .2s, transform .3s var(--ease);
  }
  .mbl-remove:hover { color: #b05a5a; transform: rotate(90deg); }
  .mbl-cart-bottom { padding: 26px; border-top: 1px solid var(--mbl-line); background: var(--mbl-bg); }
  .mbl-cart-total { display: flex; justify-content: space-between; align-items: center; margin-bottom: 22px; font-size: 15px; font-weight: 500; }
  .mbl-cart-total strong { color: var(--mbl-ink); font-family: var(--font-display); font-size: 26px; font-weight: 700; }
  .mbl-checkout {
    width: 100%; min-height: 54px; background: var(--mbl-forest); border: 0;
    border-radius: 999px; color: #fff; font: inherit; font-size: 15px; font-weight: 700; cursor: pointer;
    transition: background .3s, transform .3s var(--ease), box-shadow .3s;
  }
  .mbl-checkout:hover { background: var(--mbl-accent); transform: translateY(-2px); box-shadow: 0 14px 28px rgba(46,66,54,.25); }
  .mbl-clear {
    display: block; margin: 16px auto 0; background: none; border: 0;
    color: var(--mbl-muted); font: inherit; font-size: 13.5px; cursor: pointer; text-decoration: underline;
  }
  .mbl-clear:hover { color: #b05a5a; }

  @media (max-width: 1100px) {
    .mbl-nav { display: none; }
    .mbl-burger { display: grid; }
    .mbl-actions { margin-left: auto; }
    .mbl-top-inner, .mbl-bar, .mbl-footer-wrap { width: calc(100% - 48px); }
    .mbl-bar, .mbl-header.is-scrolled .mbl-bar { height: 72px; }
    .mbl-footer-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  }
  @media (max-width: 760px) {
    .mbl-footer-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .mbl-top-inner span:last-child { display: none; }
  }
  @media (max-width: 560px) {
    .mbl-top { font-size: 11.5px; }
    .mbl-top-inner, .mbl-bar { width: calc(100% - 30px); }
    .mbl-bar { gap: 9px; }
    .mbl-logo img { max-width: 125px; max-height: 38px; }
    .mbl-actions { gap: 0; }
    .mbl-icon-btn { width: 38px; height: 40px; }
    .mbl-login { padding: 0 14px; min-height: 38px; font-size: 12.5px; }
    .mbl-user-name { display: none; }
    .mbl-footer { padding-top: 58px; }
    .mbl-footer-wrap { width: calc(100% - 36px); }
    .mbl-footer-grid { grid-template-columns: 1fr; gap: 34px; }
    .mbl-legal { flex-direction: column; align-items: flex-start; }
    .mbl-cart-photo { flex-basis: 76px; width: 76px; height: 86px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .mbl-layout *, .mbl-layout *::before, .mbl-layout *::after {
      animation: none !important; transition: none !important;
    }
  }
`;

function Logo({ size = 40 }: { size?: number }) {
  return (
    <Link to="/" className="mbl-logo" aria-label="ARCHILAB — accueil">
      <img
        src="/images/Fichier 8.PNG"
        alt="ARCHILAB"
        style={{ height: size, width: 'auto' }}
      />
    </Link>
  );
}

const formatPrix = (n: number) =>
  new Intl.NumberFormat('fr-CI', {
    style: 'currency',
    currency: 'XOF',
    maximumFractionDigits: 0,
  }).format(n);

function CartDrawer() {
  const {
    items, removeItem, updateQuantite,
    total, toggleCart, clear,
  } = useCartStore();

  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') toggleCart();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleCart]);

  return (
    <>
      <div className="mbl-cart-overlay" onClick={toggleCart} />

      <aside className="mbl-cart-drawer" aria-label="Mon panier">
        <div className="mbl-cart-top">
          <h2>Mon panier</h2>
          <button className="mbl-cart-close" onClick={toggleCart} aria-label="Fermer">
            <IconX size={20} />
          </button>
        </div>

        <div className="mbl-cart-list">
          {items.length === 0 ? (
            <div className="mbl-cart-empty">
              <IconCart size={46} />
              <p>Votre panier est vide pour le moment.</p>
              <Link to="/catalogue" onClick={toggleCart}>
                Découvrir le catalogue
              </Link>
            </div>
          ) : (
            items.map(item => {
              const variante = item.variante;
              const prix = variante.prix_promo ?? variante.prix_vente;

              const img = variante.produit?.medias?.find(
                m => m.est_principale
              )?.url;

              const stockDisponible =
                typeof variante.stock_disponible === 'number'
                  ? variante.stock_disponible
                  : variante.stocks?.reduce(
                      (sum, stock) =>
                        sum + Math.max(
                          0,
                          stock.quantite -
                          (stock.quantite_reservee ?? 0)
                        ),
                      0
                    );

              const surCommande = variante.mode_stock === 'fabrication';
              const canIncrease = surCommande ||
                (stockDisponible !== undefined &&
                  item.quantite < stockDisponible);

              return (
                <div className="mbl-cart-item" key={variante.id}>
                  {img ? (
                    <img className="mbl-cart-photo" src={img} alt={variante.libelle} />
                  ) : (
                    <div
                      className="mbl-cart-photo"
                      style={{ display: 'grid', placeItems: 'center' }}
                    >
                      <IconCart size={24} />
                    </div>
                  )}

                  <div className="mbl-cart-info">
                    <strong>{variante.produit?.nom}</strong>
                    <small>{variante.libelle}</small>
                    <small>
                      {surCommande
                        ? 'Fabriqué à la commande'
                        : stockDisponible === undefined
                          ? 'Stock à vérifier'
                          : `${stockDisponible} disponible(s)`}
                    </small>

                    <div className="mbl-cart-qty">
                      <button
                        aria-label="Diminuer la quantité"
                        onClick={() =>
                          updateQuantite(variante.id, item.quantite - 1)
                        }
                      >
                        −
                      </button>

                      <span>{item.quantite}</span>

                      <button
                        aria-label="Augmenter la quantité"
                        disabled={!canIncrease}
                        onClick={() => {
                          if (!updateQuantite(variante.id, item.quantite + 1)) {
                            toast.error('Stock insuffisant');
                          }
                        }}
                      >
                        +
                      </button>
                    </div>

                    <p className="mbl-cart-price">
                      {formatPrix(prix * item.quantite)}
                    </p>
                  </div>

                  <button
                    className="mbl-remove"
                    aria-label="Retirer du panier"
                    onClick={() => removeItem(variante.id)}
                  >
                    <IconX size={16} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="mbl-cart-bottom">
            <div className="mbl-cart-total">
              <span>Total</span>
              <strong>{formatPrix(total())}</strong>
            </div>

            <button
              className="mbl-checkout"
              onClick={() => {
                toggleCart();
                navigate('/commande');
              }}
            >
              Passer commande
            </button>

            <button className="mbl-clear" onClick={clear}>
              Vider le panier
            </button>
          </div>
        )}
      </aside>
    </>
  );
}

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [email, setEmail] = useState('');

  const { user, isAuthenticated, logout } = useAuthStore();
  const { count, toggleCart, isOpen } = useCartStore();

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    setMenuOpen(false);
    setUserMenuOpen(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setUserMenuOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (_) {
      // Conserver la déconnexion locale.
    }

    logout();
    setUserMenuOpen(false);
    toast.success('Déconnexion réussie');
    navigate('/');
  };

  const getPortalLink = () => {
    if (!user) return null;

    if ([
      'super_admin',
      'gestionnaire_catalogue',
      'gestionnaire_stock',
      'comptable',
      'commercial',
    ].includes(user.role)) {
      return '/admin';
    }

    if (user.role === 'partenaire') return '/partenaire';

    return '/espace-client';
  };

  const isActive = (link: { to: string; exact?: boolean }) =>
    link.exact
      ? location.pathname === link.to
      : location.pathname === link.to ||
        location.pathname.startsWith(link.to + '/');

  const handleNewsletter = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    // Aucun endpoint newsletter n'était branché dans le composant fourni.
    toast.success('Merci ! Vous êtes inscrit à la newsletter.');
    setEmail('');
  };

  return (
    <div className="mbl-layout">
      <style>{styles}</style>

      <div className="mbl-top">
        <div className="mbl-top-inner">
          <span>
            <i className="mbl-top-dot" />
            Livraison à Abidjan et dans toute la Côte d'Ivoire
          </span>
          <span>
            Paiement par <b>Mobile Money</b> ou en espèces
          </span>
        </div>
      </div>

      <header className={`mbl-header ${scrolled ? 'is-scrolled' : ''}`}>
        <div className="mbl-bar">
          <Logo />

          <nav className="mbl-nav" aria-label="Navigation principale">
            {NAV_LINKS.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={isActive(link) ? 'is-active' : ''}
                aria-current={isActive(link) ? 'page' : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          <div className="mbl-actions">
            <button
              className="mbl-icon-btn"
              aria-label="Rechercher"
              onClick={() => navigate('/recherche')}
            >
              <IconSearch size={20} />
            </button>

            <Link
              to={isAuthenticated
                ? '/espace-client/favoris'
                : '/connexion'}
              className="mbl-icon-btn"
              aria-label="Mes favoris"
            >
              <IconHeart size={20} />
            </Link>

            <button
              className="mbl-icon-btn"
              aria-label="Ouvrir le panier"
              onClick={toggleCart}
            >
              <IconCart size={20} />

              {count() > 0 && (
                <span className="mbl-cart-count" key={count()}>
                  {count()}
                </span>
              )}
            </button>

            {isAuthenticated ? (
              <div className="mbl-user-wrap">
                <button
                  className="mbl-user-btn"
                  aria-expanded={userMenuOpen}
                  aria-label="Menu du compte"
                  onClick={() => setUserMenuOpen(v => !v)}
                >
                  <IconUser size={17} />
                  <span className="mbl-user-name">
                    {user?.name?.split(' ')[0]}
                  </span>
                  <IconChevronDown size={13} />
                </button>

                {userMenuOpen && (
                  <div className="mbl-menu">
                    <div className="mbl-menu-info">
                      <strong>{user?.name}</strong>
                      <small>{user?.email}</small>
                    </div>

                    {getPortalLink() && (
                      <Link
                        to={getPortalLink()!}
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <IconHome size={16} /> Mon espace
                      </Link>
                    )}

                    {user?.role === 'client' && (
                      <Link to="/espace-client/favoris">
                        <IconHeart size={16} /> Mes favoris
                      </Link>
                    )}

                    <button className="mbl-logout" onClick={handleLogout}>
                      <IconLogOut size={16} /> Déconnexion
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/connexion" className="mbl-login">
                Se connecter
              </Link>
            )}

            <button
              className="mbl-icon-btn mbl-burger"
              onClick={() => setMenuOpen(v => !v)}
              aria-label="Menu"
              aria-expanded={menuOpen}
            >
              {menuOpen ? <IconX size={22} /> : <IconMenu size={22} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="mbl-mobile" aria-label="Navigation mobile">
            {NAV_LINKS.map(link => (
              <Link
                key={link.to}
                to={link.to}
                className={isActive(link) ? 'is-active' : ''}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}

            {!isAuthenticated && (
              <Link to="/inscription" onClick={() => setMenuOpen(false)}>
                S'inscrire
              </Link>
            )}
          </nav>
        )}
      </header>

      <main className="mbl-main">{children}</main>

      <footer className="mbl-footer">
        <div className="mbl-footer-wrap">
          <div className="mbl-footer-grid">
            <div>
              <Logo size={48} />
            </div>

            {FOOTER_COLS.map(col => (
              <div key={col.title}>
                <h4>{col.title}</h4>
                <ul>
                  {col.links.map(([label, href]) => (
                    <li key={href + label}>
                      <Link to={href}>{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}

            <div>
              <h4>Restez informé</h4>
              <p className="mbl-news-text">
                Découvrez les nouveautés de notre catalogue
                et les créations de nos partenaires.
              </p>

              <form className="mbl-news" onSubmit={handleNewsletter}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Votre adresse email"
                  aria-label="Adresse email"
                />
                <button type="submit" aria-label="S'inscrire">→</button>
              </form>

              <div className="mbl-socials">
                <a href="https://facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">f</a>
                <a href="https://instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">ig</a>
                <a href="https://linkedin.com" target="_blank" rel="noreferrer" aria-label="LinkedIn">in</a>
                <a href="https://youtube.com" target="_blank" rel="noreferrer" aria-label="YouTube">▶</a>
              </div>
            </div>
          </div>

          <div className="mbl-legal">
            <span>
              © {new Date().getFullYear()} ARCHILAB. Tous droits réservés.
            </span>

            <nav aria-label="Informations légales">
              <Link to="/mentions-legales">Mentions légales</Link>
              <Link to="/confidentialite">Confidentialité</Link>
              <Link to="/cgu">CGU</Link>
            </nav>

            <span>Abidjan, Côte d'Ivoire</span>
          </div>
        </div>

        <div className="mbl-wordmark" aria-hidden="true">ARCHILAB</div>
      </footer>

      {isOpen && <CartDrawer />}

      {userMenuOpen && (
        <div
          onClick={() => setUserMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 99,
            background: 'transparent',
          }}
        />
      )}
    </div>
  );
}
