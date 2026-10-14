/* ================================================================
   ARCHILAB — Types TypeScript centralisés
================================================================ */

export type Role = 'client' | 'partenaire' | 'super_admin' | 'gestionnaire_catalogue' | 'gestionnaire_stock' | 'comptable' | 'commercial';

export interface User {
  id: number;
  name: string;
  email: string;
  role: Role;
  roles?: Role[];
  telephone?: string;
  avatar_url?: string;
  created_at: string;
}

export interface Categorie {
  id: number;
  nom: string;
  slug: string;
  description?: string;
  image?: string | null;
  image_url?: string | null;
  icone?: string;
  produits_count?: number;
}

export interface Collection {
  id: number;
  nom: string;
  slug: string;
  description?: string;
  image_url?: string;
  produits_count?: number;
}

export interface Partenaire {
  id: number;
  nom: string;
  raison_sociale?: string;
  slug: string;
  description?: string;
  logo_url?: string;
  localite?: string;
  taux_commission: number;
  statut: 'actif' | 'inactif' | 'suspendu';
  user?: User;
}

export interface Variante {
  id: number;
  sku: string;
  nom?: string | null;
  libelle: string;
  prix_vente: number;
  prix_promo?: number;
  stock_disponible?: number;
  mode_stock?: 'stock' | 'fabrication';
  active?: boolean;
  par_defaut?: boolean;
  stocks?: Array<{ quantite: number; quantite_reservee?: number }>;
  dimensions?: string;
  matiere?: string;
  coloris?: string;
  finition?: string;
  delai_fabrication?: number;
  produit_id: number;
}

export interface Media {
  id: number;
  url: string;
  chemin?: string;
  image_url?: string;
  type: 'photo' | 'ambiance' | 'video' | 'plan_2d' | 'modele_3d';
  est_principale: boolean;
  ordre: number;
  produit_id: number;
}

export interface Produit {
  id: number;
  nom: string;
  slug: string;
  reference: string;
  description?: string;
  points_forts?: string;
  usage?: string;
  style?: string;
  longueur?: number;
  largeur?: number;
  hauteur?: number;
  poids?: number;
  materiaux?: string;
  finitions?: string;
  coloris_disponibles?: string;
  garantie?: string;
  statut: 'brouillon' | 'publie' | 'archive';
  est_mis_en_avant: boolean;
  prix_min: number;
  prix_max: number;
  stock_total: number;
  disponibilite?: 'en_stock' | 'sur_commande' | 'rupture' | 'fabrication';
  note_moyenne?: number;
  nombre_avis?: number;
  categorie?: Categorie;
  collection?: Collection;
  partenaire?: Partenaire;
  variantes?: Variante[];
  medias?: Media[];
}

export interface Avis {
  id: number;
  note: number;
  commentaire?: string;
  statut: 'en_attente' | 'approuve' | 'rejete';
  created_at: string;
  produit?: { nom: string; slug: string };
  user?: { name: string };
}

export interface CommandeLigne {
  id: number;
  designation?: string;
  quantite: number;
  prix_unitaire: number;
  sous_total: number;
  montant?: number;
  statut_fabrication?: 'en_attente' | 'en_fabrication' | 'controle' | 'pret';
  variante?: Variante & { produit_id?: number; produit?: { id?: number; nom: string } };
}

export interface Commande {
  id: number;
  numero: string;
  statut: 'en_attente_paiement' | 'confirmee' | 'en_preparation' | 'en_fabrication' | 'prete' | 'en_livraison' | 'livree' | 'cloturee' | 'annulee' | 'remboursee';
  montant_ht: number;
  montant_ttc: number;
  tva?: number;
  frais_livraison?: number;
  montant_acompte?: number;
  acompte_requis?: number;
  montant_paye?: number;
  mode_livraison: 'retrait_showroom' | 'retrait' | 'livraison_abidjan' | 'livraison_interieur';
  adresse_livraison?: string;
  notes?: string;
  created_at: string;
  lignes?: CommandeLigne[];
  client?: User;
  facture?: Facture;
  paiements?: Paiement[];
}

export interface Devis {
  id: number;
  numero: string;
  statut: 'brouillon' | 'envoye' | 'accepte' | 'refuse' | 'expire';
  montant_ht: number;
  montant_ttc: number;
  notes?: string;
  date_expiration?: string;
  date_validite?: string;
  demande_client?: string;
  created_at: string;
  client?: User;
  lignes?: CommandeLigne[];
}

export interface Facture {
  id: number;
  numero: string;
  type: 'proforma' | 'acompte' | 'definitive' | 'avoir';
  montant_ttc: number;
  statut: 'payee' | 'partielle' | 'partiellement_payee' | 'impayee' | 'annulee';
  pdf_url?: string;
  date_emission?: string;
  created_at: string;
  commande?: { numero: string };
}

export interface Paiement {
  id: number;
  montant: number;
  mode: 'mobile_money' | 'virement' | 'especes' | 'tpe';
  operateur?: string;
  statut: 'en_attente' | 'valide' | 'rejete';
  reference?: string;
  created_at: string;
}

export interface Stock {
  id: number;
  quantite: number;
  quantite_reservee?: number;
  seuil_alerte: number;
  variante?: Variante & { produit?: { nom: string; sku?: string } };
  depot?: { id?: number; nom: string };
}

export interface MouvementStock {
  id: number;
  type: 'entree' | 'sortie' | 'transfert' | 'inventaire';
  quantite: number;
  motif?: string;
  created_at: string;
  variante?: { libelle: string; produit?: { nom: string } };
  user?: { name: string };
}

export interface Reversement {
  id: number;
  numero: string;
  montant_total: number;
  statut: 'en_attente' | 'verse';
  periode_debut: string;
  periode_fin: string;
  created_at: string;
  partenaire?: Partenaire;
}

export interface DashboardStats {
  ca_jour: number;
  ca_mois: number;
  commandes_en_cours: number;
  devis_en_attente: number;
  alertes_stock: number;
  top_produits: Array<{ nom: string; ventes: number; ca: number }>;
  top_partenaires: Array<{ nom: string; ca: number }>;
  evolution_ca: Array<{ date: string; montant: number }>;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
  };
}

export interface ApiError {
  message: string;
  errors?: Record<string, string[]>;
}
