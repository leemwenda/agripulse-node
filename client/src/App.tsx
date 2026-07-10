import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';

const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const MarketplacePage = lazy(() => import('./pages/Marketplace').then(m => ({ default: m.MarketplacePage })));
const Auth = lazy(() => import('./pages/Auth'));
const ForgotPasswordPage = lazy(() => import('./pages/ForgotReset').then(m => ({ default: m.ForgotPasswordPage })));
const ResetPasswordPage = lazy(() => import('./pages/ForgotReset').then(m => ({ default: m.ResetPasswordPage })));
const DashboardPage = lazy(() => import('./pages/Dashboard').then(m => ({ default: m.DashboardPage })));
const VetDashboard = lazy(() => import('./pages/VetDashboard'));
const VetProfile = lazy(() => import('./pages/VetProfile'));
const FindVet = lazy(() => import('./pages/FindVet'));
const MyVetAppointments = lazy(() => import('./pages/MyVetAppointments'));
const VetVerifications = lazy(() => import('./pages/VetVerifications'));
const VetMessagesInbox = lazy(() => import('./pages/VetMessagesInbox'));
const VetProfilePublic = lazy(() => import('./pages/VetProfilePublic'));
const AnimalsPage = lazy(() => import('./pages/Animals').then(m => ({ default: m.AnimalsPage })));
const AnimalDetailPage = lazy(() => import('./pages/AnimalDetail').then(m => ({ default: m.AnimalDetailPage })));
const AIAdvisorPage = lazy(() => import('./pages/AIAdvisor').then(m => ({ default: m.AIAdvisorPage })));
const MilkPage = lazy(() => import('./pages/DataPages').then(m => ({ default: m.MilkPage })));
const HealthPage = lazy(() => import('./pages/DataPages').then(m => ({ default: m.HealthPage })));
const BreedingPage = lazy(() => import('./pages/DataPages').then(m => ({ default: m.BreedingPage })));
const FinancialPage = lazy(() => import('./pages/DataPages').then(m => ({ default: m.FinancialPage })));
const WorkersPage = lazy(() => import('./pages/DataPages').then(m => ({ default: m.WorkersPage })));
const ReportsPage = lazy(() => import('./pages/Reports').then(m => ({ default: m.ReportsPage })));
const ProfilePage = lazy(() => import('./pages/Profile').then(m => ({ default: m.ProfilePage })));
const ReportIssuePage = lazy(() => import('./pages/ReportIssue').then(m => ({ default: m.ReportIssuePage })));
const SystemPanel = lazy(() => import('./pages/SystemPanel').then(m => ({ default: m.SystemPanel })));
const LandingPage = lazy(() => import('./pages/LandingPage'));
const AnimalPassport = lazy(() => import('./pages/AnimalPassport'));
const ChooseJourney = lazy(() => import('./pages/ChooseJourney'));
const ListingDetail = lazy(() => import('./pages/ListingDetail'));
const CreateListing = lazy(() => import('./pages/CreateListing'));
const MarketplaceAuth = lazy(() => import('./pages/MarketplaceAuth'));
const VetAuth = lazy(() => import('./pages/VetAuth'));
const Cart = lazy(() => import('./pages/Cart'));
const Favorites = lazy(() => import('./pages/Favorites'));
const Notifications = lazy(() => import('./pages/Notifications'));
const SellerAnalytics = lazy(() => import('./pages/SellerAnalytics'));
const AgreementSign = lazy(() => import('./pages/AgreementSign'));
const MessagesInbox = lazy(() => import('./pages/MessagesInbox'));
const MyOffers = lazy(() => import('./pages/MyOffers'));
const MyListings = lazy(() => import('./pages/MyListings'));
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/layout/Layout';
// @ts-ignore
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
      <Route path="/my-vet-appointments" element={<PrivateRoute><MyVetAppointments /></PrivateRoute>} />
      <Route path="/vet-messages" element={<PrivateRoute><VetMessagesInbox /></PrivateRoute>} />
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
      <Route path="/system/vet-verifications" element={<VetVerifications />} />

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
            <Suspense fallback={<div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#0d1117',color:'#8aab94',fontSize:14}}>Loading...</div>}>
              <AppRoutes />
            </Suspense>
          </CartProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
