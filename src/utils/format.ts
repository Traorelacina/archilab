export const formatPrix = (montant: number) =>
  new Intl.NumberFormat('fr-CI', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(montant);

export const formatDate = (date: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(date));

export const formatDateCourt = (date: string) =>
  new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(date));

export const statutCommande: Record<string, { label: string; cls: string }> = {
  en_attente_paiement: { label: 'En attente de paiement', cls: 'badge-warning' },
  confirmee:          { label: 'Confirmée',               cls: 'badge-info' },
  en_preparation:     { label: 'En préparation',          cls: 'badge-info' },
  en_fabrication:     { label: 'En fabrication',          cls: 'badge-info' },
  prete:              { label: 'Prête',                   cls: 'badge-success' },
  en_livraison:       { label: 'En livraison',            cls: 'badge-info' },
  livree:             { label: 'Livrée',                  cls: 'badge-success' },
  cloturee:           { label: 'Clôturée',                cls: 'badge-neutral' },
  annulee:            { label: 'Annulée',                 cls: 'badge-error' },
  remboursee:         { label: 'Remboursée',              cls: 'badge-neutral' },
};

export const statutDevis: Record<string, { label: string; cls: string }> = {
  brouillon: { label: 'Brouillon', cls: 'badge-neutral' },
  envoye:    { label: 'Envoyé',    cls: 'badge-info' },
  accepte:   { label: 'Accepté',   cls: 'badge-success' },
  refuse:    { label: 'Refusé',    cls: 'badge-error' },
  expire:    { label: 'Expiré',    cls: 'badge-warning' },
};

export const statutFacture: Record<string, { label: string; cls: string }> = {
  payee:              { label: 'Payée',              cls: 'badge-success' },
  partielle:          { label: 'Partiellement payée', cls: 'badge-warning' },
  partiellement_payee:{ label: 'Partiel.',           cls: 'badge-warning' },
  impayee:            { label: 'Impayée',            cls: 'badge-error' },
  annulee:            { label: 'Annulée',             cls: 'badge-neutral' },
};
