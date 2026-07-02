import VerifyEmail from './pages/VerifyEmail';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MarketplacePage } from './pages/Marketplace';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/layout/Layout';
import Auth from './pages/Auth';
import { ForgotPasswordPage, ResetPasswordPage } from './pages/ForgotReset';
import { DashboardPage } from './pages/Dashboard';
import VetDashboard from './pages/VetDashboard';
import VetProfile from './pages/VetProfile';
import FindVet from './pages/FindVet';
import VetProfilePublic from './pages/VetProfilePublic';
import { AnimalsPage } from './pages/Animals';
import { AnimalDetailPage } from './pages/AnimalDetail';
import { AIAdvisorPage } from './pages/AIAdvisor';
import { MilkPage, HealthPage, BreedingPage, FinancialPage, WorkersPage } from './pages/DataPages';
import { ReportsPage } from './pages/Reports';
import { ProfilePage } from './pages/Profile';
import { ReportIssuePage } from './pages/ReportIssue';
import { SystemPanel } from './pages/SystemPanel';
// @ts-ignore
import LandingPage from './pages/LandingPage';
import AnimalPassport from './pages/AnimalPassport';
import ChooseJourney from './pages/ChooseJourney';
import ListingDetail from './pages/ListingDetail';
import CreateListing from './pages/CreateListing';
import MarketplaceAuth from './pages/MarketplaceAuth';
import VetAuth from './pages/VetAuth';
import Cart from './pages/Cart';
import Favorites from './pages/Favorites';
import Notifications from './pages/Notifications';
import SellerAnalytics from './pages/SellerAnalytics';
import AgreementSign from './pages/AgreementSign';
import MessagesInbox from './pages/MessagesInbox';
import MyOffers from './pages/MyOffers';
import MyListings from './pages/MyListings';
import { PageLoader } from './components/ui';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'superadmin') return <Navigate to="/system" replace />;
  return <>{children}</>;
}

function AdminRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'worker') return <Navigate to="/dashboard" replace />;
  if (user.role === 'superadmin') return <Navigate to="/system" replace />;
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  return user ? <Navigate to={user.role === 'superadmin' ? '/system' : user.role === 'vet' ? '/vet-dashboard' : '/dashboard'} replace /> : <>{children}</>;
}

function SystemRoute() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'superadmin') return <Navigate to="/dashboard" replace />;
  return <SystemPanel />;
}


function VetRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/vet/login" replace />;
  if (user.role !== 'vet' && user.role !== 'superadmin') return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
}

function FarmerRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role === 'buyer') return <Navigate to="/marketplace" replace />;
  if (user.role === 'vet') return <Navigate to="/vet-dashboard" replace />;
  return <>{children}</>;
}
function AppRoutes() {
  return (
    <Routes>
        <Route path="/marketplace" element={<MarketplacePage />} />
      <Route path="/marketplace/login" element={<MarketplaceAuth />} />
      <Route path="/marketplace/register" element={<MarketplaceAuth />} />
      <Route path="/marketplace/signup" element={<MarketplaceAuth />} />
      <Route path="/vet/login" element={<VetAuth />} />
      <Route path="/vet/register" element={<VetAuth />} />
      <Route path="/vet/signup" element={<VetAuth />} />
      <Route path="/vet-dashboard" element={<VetRoute><VetDashboard /></VetRoute>} />
      <Route path="/vet-settings" element={<VetRoute><VetProfile /></VetRoute>} />
      <Route path="/find-vet" element={<PrivateRoute><FindVet /></PrivateRoute>} />
      <Route path="/vet/:id" element={<PrivateRoute><VetProfilePublic /></PrivateRoute>} />
      {/* Public pages — no auth required */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicRoute><Auth /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Auth /></PublicRoute>} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify" element={<VerifyEmail />} />
      <Route path="/journey" element={<ChooseJourney />} />
                        <Route path="/marketplace/listing/:id" element={<ListingDetail />} />
      <Route path="/marketplace/create" element={<PrivateRoute><CreateListing /></PrivateRoute>} />
      <Route path="/marketplace/my-listings" element={<MyListings />} />
      <Route path="/marketplace/my-offers" element={<MyOffers />} />
      <Route path="/marketplace/messages" element={<MessagesInbox />} />
      <Route path="/marketplace/agreement/:listingId" element={<AgreementSign />} />
      <Route path="/marketplace/cart" element={<Cart />} />
      <Route path="/marketplace/favorites" element={<Favorites />} />
      <Route path="/marketplace/notifications" element={<Notifications />} />
      <Route path="/marketplace/analytics" element={<SellerAnalytics />} />
      
      <Route path="/animal/:agripulseId" element={<AnimalPassport />} />
      <Route path="/system" element={<SystemRoute />} />

      {/* Protected pages — auth required */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<FarmerRoute><DashboardPage /></FarmerRoute>} />
        <Route path="/animals" element={<AdminRoute><AnimalsPage /></AdminRoute>} />
        <Route path="/animals/:id" element={<AdminRoute><AnimalDetailPage /></AdminRoute>} />
        <Route path="/milk" element={<PrivateRoute><MilkPage /></PrivateRoute>} />
        <Route path="/health" element={<PrivateRoute><HealthPage /></PrivateRoute>} />
        <Route path="/breeding" element={<AdminRoute><BreedingPage /></AdminRoute>} />
        <Route path="/financial" element={<AdminRoute><FinancialPage /></AdminRoute>} />
        <Route path="/workers" element={<AdminRoute><WorkersPage /></AdminRoute>} />
        <Route path="/ai" element={<AdminRoute><AIAdvisorPage /></AdminRoute>} />
        <Route path="/reports" element={<AdminRoute><ReportsPage /></AdminRoute>} />
        <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        <Route path="/issues" element={<PrivateRoute><ReportIssuePage /></PrivateRoute>} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <CartProvider>
            <AppRoutes />
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
