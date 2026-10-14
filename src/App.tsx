import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import ProtectedRoute from './components/ui/ProtectedRoute';
import PublicLayout from './components/layout/PublicLayout';
import AdminLayout from './components/layout/AdminLayout';
import ClientLayout from './components/layout/ClientLayout';
import PartenaireLayout from './components/layout/PartenaireLayout';

// Public
import HomePage from './pages/public/HomePage';
import CataloguePage from './pages/public/CataloguePage';
import ProduitDetailPage from './pages/public/ProduitDetailPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';
import PartenairesPubPage from './pages/public/PartenairesPubPage';
import AproposPage from './pages/public/Apropospage';
import ContactPage from './pages/public/Contactpage';
import ServicesPage from './pages/public/Servicespage';

// Client
import ClientDashboard from './pages/client/ClientDashboard';
import CommandesPage from './pages/client/CommandesPage';
import DevisPage from './pages/client/DevisPage';
import FacturesPage from './pages/client/FacturesPage';
import FavorisPage from './pages/client/FavorisPage';
import ProfilPage from './pages/client/ProfilPage';
import CommandeDetailPage from './pages/client/CommandeDetailPage';
import CheckoutPage from './pages/client/CheckoutPage';
import DemandeDevisPage from './pages/client/DemandeDevisPage';


// Partenaire
import PartenaireDashboard from './pages/partenaire/PartenaireDashboard';
import PartenaireProduitsPage from './pages/partenaire/PartenaireProduitsPage';

// Admin
import AdminDashboard from './pages/admin/AdminDashboard';
import ProduitsAdminPage from './pages/admin/catalogue/ProduitsAdminPage';
import ProduitFormPage from './pages/admin/catalogue/ProduitFormPage';
import CategoriesAdminPage from './pages/admin/catalogue/CategoriesAdminPage';
import CategorieFormPage from './pages/admin/catalogue/CategorieFormPage';
import CollectionsAdminPage from './pages/admin/catalogue/CollectionsAdminPage';
import CollectionFormPage from './pages/admin/catalogue/CollectionFormPage';
import CoutsAdminPage from './pages/admin/catalogue/CoutsAdminPage';
import StocksAdminPage from './pages/admin/stocks/StocksAdminPage';
import DepotFormPage from './pages/admin/stocks/DepotFormPage';
import MouvementsAdminPage from './pages/admin/stocks/MouvementsAdminPage';
import CommandesAdminPage from './pages/admin/ventes/CommandesAdminPage';
import DevisAdminPage from './pages/admin/ventes/DevisAdminPage';
import DevisFormPage from './pages/admin/ventes/DevisFormPage';
import ClientsAdminPage from './pages/admin/ventes/ClientsAdminPage';
import ClientFormPage from './pages/admin/ventes/ClientFormPage';
import AvisAdminPage from './pages/admin/ventes/AvisAdminPage';
import PaiementsAdminPage from './pages/admin/finance/PaiementsAdminPage';
import FacturesAdminPage from './pages/admin/finance/FacturesAdminPage';
import FactureDetailPage from './pages/admin/finance/FactureDetailPage';
import GenererFacturePage from './pages/admin/finance/GenererFacturePage';
import ReversementsAdminPage from './pages/admin/finance/ReversementsAdminPage';
import PartenairesAdminPage from './pages/admin/administration/PartenairesAdminPage';
import UtilisateursAdminPage from './pages/admin/administration/UtilisateursAdminPage';
import UtilisateurFormPage from './pages/admin/administration/UtilisateurFormPage';
import NumerisationAdminPage from './pages/admin/catalogue/NumerisationAdminPage';
import AuditAdminPage from './pages/admin/administration/AuditAdminPage';
import ParametresAdminPage from './pages/admin/administration/ParametresAdminPage';
import DepotsAdminPage from './pages/admin/stocks/DepotsAdminPage';

const ADMIN_ROLES = ['super_admin','gestionnaire_catalogue','gestionnaire_stock','comptable','commercial'] as const;
const CATALOGUE_ROLES = ['super_admin', 'gestionnaire_catalogue'] as const;
const STOCK_ROLES = ['super_admin', 'gestionnaire_stock'] as const;
const SALES_ROLES = ['super_admin', 'commercial'] as const;
const FINANCE_ROLES = ['super_admin', 'comptable'] as const;
const COST_ROLES = ['super_admin', 'gestionnaire_catalogue', 'comptable'] as const;

function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
      <div className="spinner" />
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            fontFamily: 'Inter, sans-serif',
            fontSize: '14px',
            borderRadius: '12px',
            boxShadow: '0 8px 24px rgba(30,21,16,.12)',
          },
          success: { iconTheme: { primary: 'var(--color-success)', secondary: 'white' } },
          error: { iconTheme: { primary: 'var(--color-error)', secondary: 'white' } },
        }}
      />
      <Routes>
        {/* ── PUBLIC ── */}
        <Route path="/" element={<PublicLayout><HomePage /></PublicLayout>} />
        <Route path="/apropos" element={<PublicLayout><AproposPage /></PublicLayout>} />
        <Route path="/contact" element={<PublicLayout><ContactPage /></PublicLayout>} />
        <Route path="/services" element={<PublicLayout><ServicesPage /></PublicLayout>} />
        <Route path="/catalogue" element={<PublicLayout><CataloguePage /></PublicLayout>} />
        <Route path="/catalogue/:slug" element={<PublicLayout><ProduitDetailPage /></PublicLayout>} />
        <Route path="/partenaires" element={<PublicLayout><PartenairesPubPage /></PublicLayout>} />
        <Route path="/connexion" element={<PublicLayout><LoginPage /></PublicLayout>} />
        <Route path="/inscription" element={<PublicLayout><RegisterPage /></PublicLayout>} />
        <Route path="/commande" element={
          <ProtectedRoute roles={['client']}>
            <PublicLayout><CheckoutPage /></PublicLayout>
          </ProtectedRoute>
        } />

        {/* ── ESPACE CLIENT ── */}
        <Route path="/espace-client" element={
          <ProtectedRoute roles={['client']}>
            <PublicLayout><ClientLayout><ClientDashboard /></ClientLayout></PublicLayout>
          </ProtectedRoute>
        } />
        <Route path="/espace-client/commandes" element={
          <ProtectedRoute roles={['client']}>
            <PublicLayout><ClientLayout><CommandesPage /></ClientLayout></PublicLayout>
          </ProtectedRoute>
        } />
        <Route path="/espace-client/commandes/:id" element={
          <ProtectedRoute roles={['client']}>
            <PublicLayout><ClientLayout><CommandeDetailPage /></ClientLayout></PublicLayout>
          </ProtectedRoute>
        } />
        <Route path="/espace-client/devis" element={
          <ProtectedRoute roles={['client']}>
            <PublicLayout><ClientLayout><DevisPage /></ClientLayout></PublicLayout>
          </ProtectedRoute>
        } />
        <Route path="/espace-client/devis/nouveau" element={
          <ProtectedRoute roles={['client']}>
            <PublicLayout><ClientLayout><DemandeDevisPage /></ClientLayout></PublicLayout>
          </ProtectedRoute>
        } />
        <Route path="/espace-client/factures" element={
          <ProtectedRoute roles={['client']}>
            <PublicLayout><ClientLayout><FacturesPage /></ClientLayout></PublicLayout>
          </ProtectedRoute>
        } />
        <Route path="/espace-client/favoris" element={
          <ProtectedRoute roles={['client']}>
            <PublicLayout><ClientLayout><FavorisPage /></ClientLayout></PublicLayout>
          </ProtectedRoute>
        } />
        <Route path="/espace-client/profil" element={
          <ProtectedRoute roles={['client']}>
            <PublicLayout><ClientLayout><ProfilPage /></ClientLayout></PublicLayout>
          </ProtectedRoute>
        } />

        {/* ── PORTAIL PARTENAIRE ── */}
        <Route path="/partenaire" element={
          <ProtectedRoute roles={['partenaire']}>
            <PublicLayout><PartenaireLayout><PartenaireDashboard /></PartenaireLayout></PublicLayout>
          </ProtectedRoute>
        } />
        <Route path="/partenaire/produits" element={
          <ProtectedRoute roles={['partenaire']}>
            <PublicLayout><PartenaireLayout><PartenaireProduitsPage /></PartenaireLayout></PublicLayout>
          </ProtectedRoute>
        } />

        {/* ── BACK-OFFICE ADMIN ── */}
        <Route path="/admin" element={
          <ProtectedRoute roles={ADMIN_ROLES as any}>
            <AdminLayout><AdminDashboard /></AdminLayout>
          </ProtectedRoute>
        } />

        {/* Catalogue admin */}
        <Route path="/admin/catalogue/produits" element={<ProtectedRoute roles={CATALOGUE_ROLES as any}><AdminLayout><ProduitsAdminPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/catalogue/produits/nouveau" element={<ProtectedRoute roles={CATALOGUE_ROLES as any}><AdminLayout><ProduitFormPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/catalogue/produits/:id/modifier" element={<ProtectedRoute roles={CATALOGUE_ROLES as any}><AdminLayout><ProduitFormPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/catalogue/categories" element={<ProtectedRoute roles={CATALOGUE_ROLES as any}><AdminLayout><CategoriesAdminPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/catalogue/categories/nouvelle" element={<ProtectedRoute roles={CATALOGUE_ROLES as any}><AdminLayout><CategorieFormPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/catalogue/categories/:id/modifier" element={<ProtectedRoute roles={CATALOGUE_ROLES as any}><AdminLayout><CategorieFormPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/catalogue/collections" element={<ProtectedRoute roles={CATALOGUE_ROLES as any}><AdminLayout><CollectionsAdminPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/catalogue/collections/nouvelle" element={<ProtectedRoute roles={CATALOGUE_ROLES as any}><AdminLayout><CollectionFormPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/catalogue/collections/:id/modifier" element={<ProtectedRoute roles={CATALOGUE_ROLES as any}><AdminLayout><CollectionFormPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/catalogue/numerisation" element={<ProtectedRoute roles={CATALOGUE_ROLES as any}><AdminLayout><NumerisationAdminPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/catalogue/couts" element={<ProtectedRoute roles={COST_ROLES as any}><AdminLayout><CoutsAdminPage /></AdminLayout></ProtectedRoute>} />

        {/* Stocks admin */}
        <Route path="/admin/stocks/inventaire" element={<ProtectedRoute roles={STOCK_ROLES as any}><AdminLayout><StocksAdminPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/stocks/mouvements" element={<ProtectedRoute roles={STOCK_ROLES as any}><AdminLayout><MouvementsAdminPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/stocks/alertes" element={<ProtectedRoute roles={STOCK_ROLES as any}><AdminLayout><StocksAdminPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/stocks/depots/nouveau" element={<ProtectedRoute roles={['super_admin','gestionnaire_stock'] as any}><AdminLayout><DepotFormPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/stocks/depots/:id/modifier" element={<ProtectedRoute roles={['super_admin','gestionnaire_stock'] as any}><AdminLayout><DepotFormPage /></AdminLayout></ProtectedRoute>} />

        {/* Ventes admin */}
        <Route path="/admin/ventes/commandes" element={<ProtectedRoute roles={SALES_ROLES as any}><AdminLayout><CommandesAdminPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/ventes/devis" element={<ProtectedRoute roles={SALES_ROLES as any}><AdminLayout><DevisAdminPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/ventes/devis/nouveau" element={<ProtectedRoute roles={['super_admin','commercial'] as any}><AdminLayout><DevisFormPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/ventes/devis/:id/modifier" element={<ProtectedRoute roles={['super_admin','commercial'] as any}><AdminLayout><DevisFormPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/ventes/clients" element={<ProtectedRoute roles={['super_admin','commercial'] as any}><AdminLayout><ClientsAdminPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/ventes/clients/nouveau" element={<ProtectedRoute roles={['super_admin','commercial'] as any}><AdminLayout><ClientFormPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/ventes/clients/:id/modifier" element={<ProtectedRoute roles={['super_admin','commercial'] as any}><AdminLayout><ClientFormPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/ventes/avis" element={<ProtectedRoute roles={SALES_ROLES as any}><AdminLayout><AvisAdminPage /></AdminLayout></ProtectedRoute>} />

        {/* Finance admin */}
        <Route path="/admin/finance/paiements" element={<ProtectedRoute roles={FINANCE_ROLES as any}><AdminLayout><PaiementsAdminPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/finance/factures" element={<ProtectedRoute roles={FINANCE_ROLES as any}><AdminLayout><FacturesAdminPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/finance/factures/generer" element={<ProtectedRoute roles={FINANCE_ROLES as any}><AdminLayout><GenererFacturePage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/finance/factures/:id" element={<ProtectedRoute roles={FINANCE_ROLES as any}><AdminLayout><FactureDetailPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/finance/reversements" element={<ProtectedRoute roles={FINANCE_ROLES as any}><AdminLayout><ReversementsAdminPage /></AdminLayout></ProtectedRoute>} />

        {/* Administration */}
        <Route path="/admin/administration/partenaires" element={<ProtectedRoute roles={['super_admin'] as any}><AdminLayout><PartenairesAdminPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/administration/utilisateurs" element={<ProtectedRoute roles={['super_admin'] as any}><AdminLayout><UtilisateursAdminPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/administration/utilisateurs/nouveau" element={<ProtectedRoute roles={['super_admin'] as any}><AdminLayout><UtilisateurFormPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/administration/utilisateurs/:id/modifier" element={<ProtectedRoute roles={['super_admin'] as any}><AdminLayout><UtilisateurFormPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/administration/audit" element={<ProtectedRoute roles={['super_admin'] as any}><AdminLayout><AuditAdminPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/administration/parametres" element={<ProtectedRoute roles={['super_admin'] as any}><AdminLayout><ParametresAdminPage /></AdminLayout></ProtectedRoute>} />
        <Route path="/admin/stocks/depots" element={<ProtectedRoute roles={STOCK_ROLES as any}><AdminLayout><DepotsAdminPage /></AdminLayout></ProtectedRoute>} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
