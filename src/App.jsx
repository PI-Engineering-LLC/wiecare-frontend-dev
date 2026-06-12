import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import NavigationTracker from '@/lib/NavigationTracker'
import { pagesConfig } from '@/pages.config'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import { Navigate } from 'react-router-dom';
import PageNotFound from '@/lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import Login from '@/pages/Login';
 import ForgotPassword from '@/pages/ForgotPassword';
import AcceptInvite from '@/pages/AcceptInvite';
import AuthCallback from "@/pages/AuthCallback"
import MfaVerify from "@/pages/MfaVerify"
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import { ProtectedRoute } from "@/components/ProtectedRoute"
import ResetPassword from "@/pages/ResetPassword"
import { usePlatformRole } from "@/hooks/usePlatfromRole"
import Forbidden from "@/components/Forbidden"
import { ClientProvider } from "@/lib/ClientContext"

const { Pages, Layout, getMainPage , routeGuards } = pagesConfig; 


const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

const AuthenticatedApp = () => {
  const isInternalAdmin = usePlatformRole('super_admin') || usePlatformRole('platform_admin');
  const { user, loading, isAuthenticated, authError, navigateToLogin } = useAuth(); 
  const mainPageKey = getMainPage(isInternalAdmin);

  // Show loading spinner while checking auth
  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } 
    else if (authError.type === 'auth_required') {
      navigateToLogin(); // Redirect to login automatically
    }
  }

  return (
    <Routes>

      {/* ── Root redirect ── */}
      <Route
        path="/"
        element={
          isAuthenticated
            ? <Navigate to={`/${mainPageKey}`} replace />
            : <Navigate to="/login" replace />
        }
      />

      {/* ── Public routes ── */}
      <Route path="/login" element={<Login />} />
      {<Route path="/forgotPassword" element={<ForgotPassword/>} /> }
      <Route path="/accept-invite/:token" element={<AcceptInvite />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/auth-callback" element={<AuthCallback />} />
       <Route path="/mfa-verify" element={<MfaVerify />} />
       <Route path="/forbidden" element={<Forbidden/>} /> {/* Forbidden page route */}

      {/* ── Authenticated pages ── */}
      {Object.entries(Pages).map(([path, PageComponent]) => {
        // Get route guards from pages.config.js
        const guards = routeGuards[path] || {}; // Default to empty object if no guards specified

        return (
          <Route
            key={path}
            path={`/${path}`}
            element={
              <ProtectedRoute
                permission={guards.permission}
                platformRole={guards.platformRole}
                allowedRoles={guards.allowedRoles} // Pass array of role names
              >
                <LayoutWrapper currentPageName={path}>
                  <PageComponent />
                </LayoutWrapper>
              </ProtectedRoute>
            }
          />
        );
      })}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
    <AuthProvider>
      
        <Router>
          <NavigationTracker />
          <ClientProvider>
            <AuthenticatedApp />
          </ClientProvider>
        </Router>
        <Toaster />
        <SonnerToaster />
     
    </AuthProvider>
    </QueryClientProvider>
  )
}

export default App