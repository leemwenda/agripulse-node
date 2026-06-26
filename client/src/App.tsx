import VerifyEmail from './pages/VerifyEmail';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { Layout } from './components/layout/Layout';
import { LoginPage, RegisterPage } from './pages/Auth';
import { ForgotPasswordPage, ResetPasswordPage } from './pages/ForgotReset';
import { DashboardPage } from './pages/Dashboard';
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
  return user ? <Navigate to={user.role === 'superadmin' ? '/system' : '/dashboard'} replace /> : <>{children}</>;
}

function SystemRoute() {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== 'superadmin') return <Navigate to="/dashboard" replace />;
  return <SystemPanel />;
}

function AppRoutes() {
  return (
    <Routes>
      {/* Public pages — no auth required */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/verify" element={<VerifyEmail />} />
      <Route path="/journey" element={<ChooseJourney />} />
      <Route path="/animal/:agripulseId" element={<AnimalPassport />} />
      <Route path="/system" element={<SystemRoute />} />

      {/* Protected pages — auth required */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<PrivateRoute><DashboardPage /></PrivateRoute>} />
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
          <AppRoutes />
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
