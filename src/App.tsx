import { useState } from 'react';
import { StoreProvider, useStore, isAdminEmailCheck } from './lib/store';
import { useHashRoute, parseRoute } from './lib/router';
import { ToastContainer } from './components/Toast';
import { AuthModal } from './components/AuthModal';
import { ProfileEditModal } from './components/ProfileEditModal';
import { UploadModal } from './components/UploadModal';
import { PersonaSwitcher } from './components/PersonaSwitcher';
import { EditPostModal } from './components/EditPostModal';
import { Sidebar, type AppRoute } from './components/Sidebar';
import { Landing } from './pages/Landing';
import { DashboardHome } from './pages/DashboardHome';
import { CreatorProfileView, CreatorAnalyticsView } from './pages/CreatorDashboard';
import { WalletPage } from './pages/Wallet';
import { KycPage } from './pages/Kyc';
import { ReferEarnPage } from './pages/ReferEarn';
import { SettingsPage } from './pages/SettingsPage';
import { CreatorProfile } from './pages/CreatorProfile';
import { ContentView } from './pages/ContentView';
import { AdminPanel } from './pages/AdminPanel';
import { PurchaseLibrary } from './pages/PurchaseLibrary';
import { PaymentResult } from './pages/PaymentResult';
import { AccessPage } from './pages/AccessPage';
import { SupportPage } from './pages/SupportPage';
import { PrivacyPolicyPage } from './pages/PrivacyPolicyPage';
import { TermsPage } from './pages/TermsPage';
import { LegalCenter } from './pages/LegalCenter';
import { Loader2, Menu } from 'lucide-react';

function Router() {
  const { route, navigate } = useHashRoute();
  const { loading, isRedirecting, user } = useStore();
  const isAdmin = user ? isAdminEmailCheck(user.email) : false;
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-4">
          <Loader2 size={36} className="animate-spin text-indigo-500" />
          <div className="text-center">
            <p className="text-base font-semibold text-slate-900 dark:text-white">Redirecting to checkout</p>
            <p className="text-sm text-slate-400 dark:text-zinc-500 mt-1">You are being securely redirected to Whop...</p>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-zinc-950">
        <div className="flex flex-col items-center gap-3">
          <Loader2 size={32} className="animate-spin text-indigo-500" />
          <p className="text-sm text-slate-400 dark:text-zinc-500">Loading...</p>
        </div>
      </div>
    );
  }

  const { segments } = parseRoute(route);

  // Landing page (no sidebar)
  if (segments.length === 0) {
    if (user) {
      navigate(isAdmin ? 'admin' : 'dashboard');
      return null;
    }
    return (
      <>
        <Landing onNavigate={navigate} />
        <ToastContainer />
        <AuthModal onNavigate={navigate} />
        <ProfileEditModal />
      <UploadModal />
        <PersonaSwitcher />
        <EditPostModal />
      </>
    );
  }

  const [first, second, third] = segments;

  // Support page (no sidebar)
  if (first === 'support' || first === 'contact') {
    return (
      <>
        <SupportPage onNavigate={navigate} />
        <ToastContainer />
      </>
    );
  }

  // Privacy policy (no sidebar)
  if (first === 'privacy') {
    return (
      <>
        <PrivacyPolicyPage onNavigate={navigate} />
        <ToastContainer />
      </>
    );
  }

  // Terms of service (no sidebar)
  if (first === 'terms') {
    return (
      <>
        <TermsPage onNavigate={navigate} />
        <ToastContainer />
      </>
    );
  }

  // Legal Center (no sidebar)
  if (first === 'legal') {
    return (
      <>
        <LegalCenter onNavigate={navigate} />
        <ToastContainer />
      </>
    );
  }

  // Payment result (no sidebar)
  if (first === 'payment' && second === 'success') {
    return (
      <>
        <PaymentResult onNavigate={navigate} />
        <ToastContainer />
      </>
    );
  }

  // Access link page (no sidebar) — 7-day expiring guest access
  if (first === 'access') {
    const query = route.includes('?') ? route.slice(route.indexOf('?') + 1) : '';
    const accessToken = new URLSearchParams(query).get('token');
    if (!accessToken) {
      return (
        <>
          <AccessPage token="" onNavigate={navigate} />
          <ToastContainer />
        </>
      );
    }
    return (
      <>
        <AccessPage token={accessToken} onNavigate={navigate} />
        <ToastContainer />
      </>
    );
  }

  // Admin (no sidebar)
  if (first === 'admin') {
    return (
      <>
        <AdminPanel onNavigate={navigate} />
        <ToastContainer />
      </>
    );
  }

  // Content view (no sidebar)
  if (first === 'u' && second) {
    return (
      <>
        <ContentView contentId={second} onNavigate={navigate} />
        <ToastContainer />
        <AuthModal onNavigate={navigate} />
      </>
    );
  }

  // Creator profile (no sidebar)
  if (first === 'c' && second) {
    return (
      <>
        <CreatorProfile username={second} onNavigate={navigate} />
        <ToastContainer />
        <AuthModal onNavigate={navigate} />
      </>
    );
  }

  // Library (no sidebar)
  if (first === 'library') {
    return (
      <>
        <PurchaseLibrary onNavigate={navigate} />
        <ToastContainer />
        <AuthModal onNavigate={navigate} />
      </>
    );
  }

  // Sidebar app routes (require auth)
  const sidebarRoutes: AppRoute[] = ['home', 'wallet', 'kyc', 'refer', 'settings'];
  const creatorSubRoutes = ['creator-profile', 'creator-analytics', 'creator-settings'];
  let currentRoute: AppRoute = 'home';

  if (first === 'dashboard' || first === 'home') currentRoute = 'home';
  else if (first === 'wallet') currentRoute = 'wallet';
  else if (first === 'kyc') currentRoute = 'kyc';
  else if (first === 'refer') currentRoute = 'refer';
  else if (first === 'settings') currentRoute = 'settings';
  else if (creatorSubRoutes.includes(first)) currentRoute = 'home';
  else currentRoute = 'home';

  const showSidebar = user && (sidebarRoutes.includes(currentRoute) || creatorSubRoutes.includes(first));

  if (!user && showSidebar) {
    return (
      <>
        <Landing onNavigate={navigate} />
        <ToastContainer />
        <AuthModal onNavigate={navigate} />
      </>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-zinc-950">
      {/* Desktop sidebar */}
      {showSidebar && (
        <aside className="hidden lg:block sticky top-0 h-screen shrink-0">
          <Sidebar current={currentRoute} onNavigate={navigate} />
        </aside>
      )}

      {/* Mobile sidebar drawer */}
      {showSidebar && sidebarOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 lg:hidden animate-fade-in"
            onClick={() => setSidebarOpen(false)}
          />
          <aside className="fixed left-0 top-0 z-50 h-full lg:hidden animate-slide-in">
            <Sidebar current={currentRoute} onNavigate={navigate} onClose={() => setSidebarOpen(false)} />
          </aside>
        </>
      )}

      {/* Main content */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Mobile top bar */}
        {showSidebar && (
          <header className="lg:hidden sticky top-0 z-40 h-14 glass border-b border-slate-200 dark:border-zinc-800 flex items-center px-4 gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800"
            >
              <Menu size={20} />
            </button>
            <span className="font-bold text-slate-900 dark:text-white">Velour</span>
          </header>
        )}

        <main className="flex-1 px-4 sm:px-6 py-6">
          <div className="max-w-6xl mx-auto">
            {currentRoute === 'home' && (first === 'creator-profile' ? (
              <CreatorProfileView onNavigate={navigate} />
            ) : first === 'creator-analytics' ? (
              <CreatorAnalyticsView onNavigate={navigate} />
            ) : first === 'creator-settings' ? (
              <SettingsPage />
            ) : (
              <DashboardHome onNavigate={navigate} />
            ))}
            {currentRoute === 'wallet' && <WalletPage />}
            {currentRoute === 'kyc' && <KycPage />}
            {currentRoute === 'refer' && <ReferEarnPage />}
            {currentRoute === 'settings' && <SettingsPage />}
          </div>
        </main>
      </div>

      <ToastContainer />
      <AuthModal onNavigate={navigate} />
      <ProfileEditModal />
      <UploadModal />
      <PersonaSwitcher />
      <EditPostModal />
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Router />
    </StoreProvider>
  );
}
