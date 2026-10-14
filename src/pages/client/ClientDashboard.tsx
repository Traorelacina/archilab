import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { clientApi, type ClientProfile } from '../../api/client-api';
import type { Commande } from '../../types';
import { formatPrix, formatDate, statutCommande } from '../../utils/format';
import { useAuthStore } from '../../store/authStore';
import { IconBox, IconFileText, IconCreditCard, IconHeart } from '../../components/ui/Icons';
import '../../client-ui.css';

export default function ClientDashboard() {
  const user = useAuthStore((state) => state.user);
  const [commandes, setCommandes] = useState<Commande[]>([]);
  const [profile, setProfile] = useState<ClientProfile | null>(null);
  const [totals, setTotals] = useState({ commandes: 0, devis: 0, factures: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      clientApi.commandes({ page: 1 }),
      clientApi.devis({ page: 1 }),
      clientApi.factures({ page: 1 }),
      clientApi.profil(),
    ])
      .then(([orders, quotes, invoices, clientProfile]) => {
        if (!active) return;
        let hasError = false;
        if (orders.status === 'fulfilled') {
          setCommandes(orders.value.data.data.slice(0, 3));
          setTotals((current) => ({ ...current, commandes: orders.value.data.total }));
        } else hasError = true;
        if (quotes.status === 'fulfilled') {
          setTotals((current) => ({ ...current, devis: quotes.value.data.total }));
        } else hasError = true;
        if (invoices.status === 'fulfilled') {
          setTotals((current) => ({ ...current, factures: invoices.value.data.total }));
        } else hasError = true;
        if (clientProfile.status === 'fulfilled') setProfile(clientProfile.value.data);
        else hasError = true;
        setLoadError(hasError);
        if (hasError) toast.error('Certaines informations de votre espace client sont indisponibles.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const stats = [
    { label: 'Commandes', value: totals.commandes, icon: <IconBox size={20} />, to: '/espace-client/commandes' },
    { label: 'Devis', value: totals.devis, icon: <IconFileText size={20} />, to: '/espace-client/devis' },
    { label: 'Factures', value: totals.factures, icon: <IconCreditCard size={20} />, to: '/espace-client/factures' },
    { label: 'Favoris', value: 'Voir', icon: <IconHeart size={20} />, to: '/espace-client/favoris' },
  ];

  const firstName = (profile?.prenoms || user?.name || 'client').split(' ')[0];

  return (
    <div className="cl-page">
      <div className="cl-head">
        <div>
          <h1 className="cl-title">Bonjour, {firstName}</h1>
          <p className="cl-sub">Voici un aperçu de votre activité sur ARCHILAB.</p>
        </div>
        <Link to="/catalogue" className="cl-btn is-outline">Explorer le catalogue</Link>
      </div>

      {loadError && (
        <div className="cl-alert" role="alert">
          Certaines informations n’ont pas pu être chargées. Rechargez la page pour réessayer.
        </div>
      )}

      <div className="cl-stats">
        {stats.map((item) => (
          <Link key={item.label} to={item.to} className="cl-stat">
            <span className="cl-stat-ico">{item.icon}</span>
            <div>
              <strong>{loading ? '—' : item.value}</strong>
              <span>{item.label}</span>
            </div>
          </Link>
        ))}
      </div>

      <section className="cl-card">
        <div className="cl-card-head">
          <h2 className="cl-card-title">Dernières commandes</h2>
          <Link to="/espace-client/commandes" className="cl-link">Voir tout</Link>
        </div>

        {loading ? (
          <div className="cl-loader"><div className="cl-spin" /></div>
        ) : commandes.length === 0 ? (
          <p className="cl-sub">Aucune commande pour le moment.</p>
        ) : (
          <div className="cl-rows">
            {commandes.map((commande) => {
              const status = statutCommande[commande.statut] ?? { label: commande.statut, cls: 'badge-neutral' };
              return (
                <Link key={commande.id} to={`/espace-client/commandes/${commande.id}`} className="cl-row">
                  <div>
                    <div className="cl-row-num">#{commande.numero}</div>
                    <p className="cl-row-meta">{formatDate(commande.created_at)}</p>
                  </div>
                  <div className="cl-row-end">
                    <span className={`badge ${status.cls}`}>{status.label}</span>
                    <span className="cl-price">{formatPrix(commande.montant_ttc)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      <section className="cl-hero">
        <div>
          <h2>Un projet sur mesure ?</h2>
          <p>Envoyez une demande à notre équipe commerciale : dimensions, matières, style, budget.</p>
        </div>
        <Link to="/espace-client/devis/nouveau" className="cl-btn is-primary">Demander un devis</Link>
      </section>
    </div>
  );
}
