import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { publicApi, type PublicPartenaire } from '../../api/public';
import { IconArrowRight } from '../../components/ui/Icons';

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=DM+Sans:wght@400;500;600;700&display=swap');

  .pt-page {
    --pt-ink: #1d2a22;
    --pt-forest: #22332a;
    --pt-forest-2: #2e4236;
    --pt-accent: #5f7a65;
    --pt-text: #3b4a40;
    --pt-muted: #66736a;
    --pt-light: #f4f6f2;
    --pt-mist: #e9eee7;
    --pt-line: #dde3da;
    --pt-brass: #c0975a;
    --font-display: 'Fraunces', Georgia, serif;
    --font-body: 'DM Sans', system-ui, -apple-system, sans-serif;
    --ease: cubic-bezier(.22,.8,.24,1);
    background: #fff; color: var(--pt-text); overflow: hidden; min-height: 60vh;
    font-family: var(--font-body); font-size: 15px; -webkit-font-smoothing: antialiased;
  }
  .pt-page *, .pt-page *::before, .pt-page *::after { box-sizing: border-box; }
  .pt-page :focus-visible { outline: 2px solid var(--pt-brass); outline-offset: 3px; }
  .pt-wrap { width: min(1380px, calc(100% - 80px)); margin: 0 auto; }

  .pt-eyebrow { display: inline-flex; align-items: center; gap: 12px; margin-bottom: 16px; color: var(--pt-accent); font-size: 13px; font-weight: 700; letter-spacing: .02em; }
  .pt-eyebrow::before { content: ''; width: 34px; height: 2px; background: var(--pt-brass); }

  .pt-btn {
    display: inline-flex; align-items: center; justify-content: center; gap: 14px; min-height: 54px; padding: 0 30px;
    border: 1px solid var(--pt-forest); border-radius: 999px; background: var(--pt-forest); color: #fff;
    font: inherit; font-size: 15px; font-weight: 700; text-decoration: none; cursor: pointer;
    transition: background .3s, color .3s, transform .35s var(--ease), box-shadow .35s;
  }
  .pt-btn:hover { background: var(--pt-accent); border-color: var(--pt-accent); transform: translateY(-3px); box-shadow: 0 16px 32px rgba(34,51,42,.25); }
  .pt-btn svg { transition: transform .35s var(--ease); }
  .pt-btn:hover svg { transform: translateX(5px); }
  .pt-btn.is-brass { background: var(--pt-brass); border-color: var(--pt-brass); color: #1d2a22; }
  .pt-btn.is-brass:hover { background: #d3aa6c; border-color: #d3aa6c; box-shadow: 0 16px 32px rgba(0,0,0,.28); }
  .pt-btn.is-ghost { background: transparent; color: var(--pt-forest); }
  .pt-btn.is-ghost:hover { color: #fff; }

  /* HERO */
  .pt-hero { position: relative; background: var(--pt-forest); color: #fff; overflow: hidden; isolation: isolate; }
  .pt-hero::before {
    content: ''; position: absolute; inset: 0; z-index: -1; opacity: .55;
    background-image: linear-gradient(rgba(255,255,255,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.05) 1px, transparent 1px);
    background-size: 56px 56px;
    mask-image: radial-gradient(ellipse at 85% 20%, #000, transparent 70%);
    -webkit-mask-image: radial-gradient(ellipse at 85% 20%, #000, transparent 70%);
  }
  .pt-hero::after {
    content: ''; position: absolute; z-index: -1; right: -120px; top: -160px; width: 560px; height: 560px; border-radius: 50%;
    background: radial-gradient(circle, rgba(192,151,90,.3), transparent 68%);
    animation: pt-drift 12s ease-in-out infinite alternate;
  }
  @keyframes pt-drift { to { transform: translate(-70px, 50px) scale(1.15); } }
  .pt-hero-inner { padding: 110px 0 100px; }
  .pt-crumb { display: flex; gap: 10px; margin-bottom: 26px; font-size: 14px; font-weight: 500; color: rgba(255,255,255,.7); opacity: 0; animation: pt-up .8s var(--ease) .05s forwards; }
  .pt-crumb a { color: inherit; text-decoration: none; transition: color .25s; }
  .pt-crumb a:hover { color: var(--pt-brass); }
  .pt-hero .pt-eyebrow { color: var(--pt-brass); opacity: 0; animation: pt-up .8s var(--ease) .1s forwards; }
  .pt-hero h1 { max-width: 880px; margin: 0; font-family: var(--font-display); font-size: clamp(2.8rem, 6vw, 5.6rem); line-height: 1.02; letter-spacing: -.04em; font-weight: 700; }
  .pt-line { display: block; overflow: hidden; padding-bottom: .12em; margin-bottom: -.12em; }
  .pt-line > span { display: block; transform: translateY(112%); animation: pt-rise 1.1s var(--ease) .15s forwards; }
  @keyframes pt-rise { to { transform: none; } }
  @keyframes pt-up { from { transform: translateY(20px); } to { opacity: 1; transform: none; } }
  .pt-hero p { max-width: 560px; margin: 28px 0 0; color: rgba(255,255,255,.88); font-size: 18px; line-height: 1.7; opacity: 0; animation: pt-up .9s var(--ease) .6s forwards; }

  /* LISTE */
  .pt-main { padding: 110px 0 120px; }
  .pt-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; flex-wrap: wrap; margin-bottom: 52px; }
  .pt-title { margin: 0; color: var(--pt-ink); font-family: var(--font-display); font-size: clamp(2rem, 3.6vw, 3.3rem); font-weight: 600; letter-spacing: -.025em; line-height: 1.1; }
  .pt-count { display: flex; align-items: baseline; gap: 10px; color: var(--pt-muted); font-size: 15.5px; }
  .pt-count b { color: var(--pt-ink); font-family: var(--font-display); font-size: 2.6rem; font-weight: 700; line-height: 1; font-variant-numeric: tabular-nums; }

  .pt-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 290px), 1fr)); gap: 28px; }
  .pt-card {
    display: flex; flex-direction: column; min-width: 0; border-radius: 26px; overflow: hidden;
    background: var(--pt-light); border: 1px solid transparent;
    animation: pt-in .8s var(--ease) both; animation-delay: calc(var(--i, 0) * 80ms);
    transition: transform .5s var(--ease), background .4s, box-shadow .5s, border-color .4s;
  }
  @keyframes pt-in { from { opacity: 0; transform: translateY(32px); } to { opacity: 1; transform: none; } }
  .pt-card:hover { transform: translateY(-10px); background: #fff; border-color: var(--pt-line); box-shadow: 0 34px 64px rgba(34,51,42,.14); }
  .pt-visual { position: relative; aspect-ratio: 4 / 3.3; overflow: hidden; display: grid; place-items: center; background: var(--tone, var(--pt-mist)); }
  .pt-visual img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: cover; transition: transform .9s var(--ease); }
  .pt-card:hover .pt-visual img { transform: scale(1.08); }
  .pt-initial {
    position: relative; width: 104px; height: 104px; display: grid; place-items: center; border-radius: 50%;
    background: rgba(255,255,255,.7); color: var(--pt-forest); font-family: var(--font-display); font-size: 46px; font-weight: 700;
    transition: transform .7s var(--ease);
  }
  .pt-card:hover .pt-initial { transform: scale(1.12) rotate(-6deg); }
  .pt-badge {
    position: absolute; left: 16px; top: 16px; padding: 8px 14px; border-radius: 999px; background: #fff; color: var(--pt-forest);
    font-size: 12.5px; font-weight: 700; box-shadow: 0 6px 18px rgba(34,51,42,.14);
  }
  .pt-body { display: flex; flex: 1; flex-direction: column; align-items: flex-start; padding: 28px 28px 30px; }
  .pt-body h3 { margin: 0 0 8px; color: var(--pt-ink); font-family: var(--font-display); font-size: 24px; font-weight: 600; letter-spacing: -.015em; line-height: 1.25; }
  .pt-body p { margin: 0 0 26px; color: var(--pt-muted); font-size: 15.5px; }
  .pt-more {
    position: relative; margin-top: auto; display: inline-flex; align-items: center; gap: 10px; padding-bottom: 5px;
    color: var(--pt-ink); font-size: 14.5px; font-weight: 700; text-decoration: none;
  }
  .pt-more::after { content: ''; position: absolute; left: 0; right: 0; bottom: 0; height: 2px; background: var(--pt-brass); transform-origin: left; transition: transform .45s var(--ease); }
  .pt-more:hover::after { transform: scaleX(.35); }
  .pt-more svg { transition: transform .35s var(--ease); }
  .pt-more:hover svg { transform: translateX(6px); }

  /* ÉTATS */
  .pt-skel-img, .pt-skel-line {
    background: linear-gradient(100deg, #edf1ea 30%, #f8faf6 50%, #edf1ea 70%);
    background-size: 220% 100%; animation: pt-shimmer 1.5s linear infinite;
  }
  .pt-skel-img { aspect-ratio: 4 / 3.3; border-radius: 26px; }
  .pt-skel-line { height: 14px; margin-top: 16px; border-radius: 6px; }
  @keyframes pt-shimmer { to { background-position: -220% 0; } }
  .pt-state { padding: 90px 24px; text-align: center; background: var(--pt-light); border-radius: 28px; animation: pt-in .7s var(--ease) both; }
  .pt-state h2 { margin: 0 0 10px; color: var(--pt-ink); font-family: var(--font-display); font-size: 2rem; font-weight: 600; }
  .pt-state p { max-width: 440px; margin: 0 auto 28px; color: var(--pt-muted); font-size: 16.5px; line-height: 1.7; }

  /* CTA */
  .pt-cta { position: relative; background: var(--pt-forest); color: #fff; overflow: hidden; }
  .pt-cta::after {
    content: ''; position: absolute; right: -140px; top: -140px; width: 480px; height: 480px; border-radius: 50%;
    border: 2px solid var(--pt-brass); opacity: .3; animation: pt-pulse 6s ease-in-out infinite;
  }
  @keyframes pt-pulse { 50% { transform: scale(1.18); opacity: .12; } }
  .pt-cta-inner { position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 40px; align-items: center; padding: 100px 0; }
  .pt-cta .pt-eyebrow { color: var(--pt-brass); }
  .pt-cta h2 { margin: 0; max-width: 680px; font-family: var(--font-display); font-size: clamp(2rem, 3.8vw, 3.5rem); font-weight: 600; letter-spacing: -.025em; line-height: 1.1; }
  .pt-cta p { max-width: 500px; margin: 20px 0 0; color: #c4d2c8; font-size: 17px; line-height: 1.7; }

  @media (max-width: 1100px) {
    .pt-wrap { width: calc(100% - 56px); }
    .pt-cta-inner { grid-template-columns: 1fr; padding: 80px 0; }
  }
  @media (max-width: 760px) {
    .pt-wrap { width: calc(100% - 36px); }
    .pt-hero-inner { padding: 80px 0 70px; }
    .pt-main { padding: 70px 0 80px; }
    .pt-head { margin-bottom: 36px; }
  }
  @media (prefers-reduced-motion: reduce) {
    .pt-page *, .pt-page *::before, .pt-page *::after { animation: none !important; transition: none !important; }
    .pt-line > span, .pt-crumb, .pt-hero p, .pt-hero .pt-eyebrow { transform: none; opacity: 1; }
  }
`;

// Teintes douces dans la palette, choisies selon l'identifiant du partenaire.
const TONES = [
  'linear-gradient(135deg, #dfe8dc, #b9ccbd)',
  'linear-gradient(135deg, #ece3d2, #d6c19b)',
  'linear-gradient(135deg, #d5e0d8, #a9bfae)',
  'linear-gradient(135deg, #e6e9de, #c4cdb4)',
];

export default function PartenairesPubPage() {
  const [partenaires, setPartenaires] = useState<PublicPartenaire[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPartenaires = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await publicApi.partenaires();
      setPartenaires(response.data);
    } catch {
      setError('Impossible de charger les partenaires pour le moment.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPartenaires();
  }, [loadPartenaires]);

  return (
    <>
      <style>{styles}</style>

      <main className="pt-page">
        {/* HERO */}
        <section className="pt-hero">
          <div className="pt-wrap pt-hero-inner">
            <nav className="pt-crumb" aria-label="Fil d’Ariane">
              <Link to="/">Accueil</Link><span>/</span><span>Nos partenaires</span>
            </nav>

            <span className="pt-eyebrow">Savoir-faire local</span>

            <h1>
              <span className="pt-line"><span>Nos partenaires</span></span>
            </h1>

            <p>
              Découvrez les artisans et ateliers qui donnent vie à notre sélection de mobilier.
            </p>
          </div>
        </section>

        {/* LISTE */}
        <section className="pt-main">
          <div className="pt-wrap">
            {loading ? (
              <div role="status" aria-live="polite" aria-label="Chargement des partenaires">
                <div className="pt-grid">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i}>
                      <div className="pt-skel-img" />
                      <div className="pt-skel-line" style={{ width: '70%' }} />
                      <div className="pt-skel-line" style={{ width: '45%' }} />
                    </div>
                  ))}
                </div>
              </div>
            ) : error ? (
              <div className="pt-state">
                <h2>Chargement impossible</h2>
                <p>{error}</p>
                <button type="button" className="pt-btn" onClick={() => void loadPartenaires()}>
                  Réessayer
                </button>
              </div>
            ) : partenaires.length === 0 ? (
              <div className="pt-state">
                <h2>Aucun partenaire à afficher</h2>
                <p>Notre réseau de partenaires sera bientôt présenté ici.</p>
                <Link to="/catalogue" className="pt-btn">
                  Découvrir le catalogue <IconArrowRight size={16} />
                </Link>
              </div>
            ) : (
              <>
                <div className="pt-head">
                  <div>
                    <span className="pt-eyebrow">Notre réseau</span>
                    <h2 className="pt-title">Des créations, des artisans</h2>
                  </div>

                  <div className="pt-count">
                    <b>{partenaires.length}</b>
                    <span>partenaire{partenaires.length !== 1 ? 's' : ''}</span>
                  </div>
                </div>

                <div className="pt-grid">
                  {partenaires.map((partenaire, i) => (
                    <article
                      key={partenaire.id}
                      className="pt-card"
                      style={{ ['--i' as any]: i % 9 }}
                    >
                      <div
                        className="pt-visual"
                        style={{ ['--tone' as any]: TONES[Number(partenaire.id) % TONES.length || 0] }}
                      >
                        {partenaire.image_url ? (
                          <img
                            src={partenaire.image_url}
                            alt={`Atelier ${partenaire.raison_sociale}`}
                            loading="lazy"
                          />
                        ) : (
                          <span className="pt-initial" aria-hidden="true">
                            {partenaire.raison_sociale.trim().charAt(0).toUpperCase()}
                          </span>
                        )}

                        <span className="pt-badge">
                          {partenaire.produits_count} produit{partenaire.produits_count !== 1 ? 's' : ''}
                        </span>
                      </div>

                      <div className="pt-body">
                        <h3>{partenaire.raison_sociale}</h3>
                        <p>
                          {partenaire.produits_count} produit{partenaire.produits_count !== 1 ? 's' : ''} au catalogue
                        </p>

                        <Link
                          to={`/catalogue?partenaire=${partenaire.id}`}
                          className="pt-more"
                        >
                          Voir ses produits <IconArrowRight size={16} />
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* CTA */}
        <section className="pt-cta">
          <div className="pt-wrap pt-cta-inner">
            <div>
              <span className="pt-eyebrow">Collaborons ensemble</span>
              <h2>Vous êtes concepteur ou fabricant ?</h2>
              <p>
                Rejoignez notre réseau de partenaires et donnez une nouvelle visibilité
                à vos créations auprès de clients en Côte d’Ivoire.
              </p>
            </div>

            <Link to="/contact" className="pt-btn is-brass">
              Devenir partenaire <IconArrowRight size={16} />
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}