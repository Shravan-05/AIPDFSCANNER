import React, { useState, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import './index.css';

const LandingPage = lazy(() => import('./pages/LandingPage'));
const LoginPage = lazy(() => import('./pages/Auth/LoginPage'));
const RegisterPage = lazy(() => import('./pages/Auth/RegisterPage'));
const ForgotPasswordPage = lazy(() => import('./pages/Auth/ForgotPasswordPage'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const ScannerWorkspace = lazy(() => import('./pages/ScannerWorkspace'));
const DocumentEditor = lazy(() => import('./pages/DocumentEditor'));
const FilesPage = lazy(() => import('./pages/FilesPage'));
const SettingsPage = lazy(() => import('./pages/SettingsPage'));
const MergePDF = lazy(() => import('./pages/MergePDF'));
const AiEditor = lazy(() => import('./pages/AiEditor'));
const SharedPdfPage = lazy(() => import('./pages/SharedPdfPage'));

const PageLoader = () => (
  <div style={{
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    height: '100vh', minHeight: 300,
    background: 'var(--bg-primary)'
  }}>
    <div style={{
      width: 40, height: 40,
      borderRadius: '50%',
      border: '3px solid var(--border-color)',
      borderTopColor: 'var(--accent-primary)',
      animation: 'spin 0.8s linear infinite'
    }} />
  </div>
);

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <PageLoader />;
  if (!user) return <Navigate to="/login" replace />;
  return children;
};

const AppLayout = ({ children }) => {
  const { user, token, loading } = useAuth();
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const authPaths = ['/', '/login', '/register', '/forgot-password'];
  const isSharePage = location.pathname.startsWith('/share/');
  const isAuthPage = authPaths.includes(location.pathname) || isSharePage;
  const shouldShowShell = !isAuthPage && (user || (token && loading));

  if (isAuthPage) return children;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {shouldShowShell && <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {shouldShowShell && <Navbar onToggleSidebar={() => setMobileSidebarOpen(o => !o)} />}
        <main style={{ flex: 1, padding: shouldShowShell ? '24px' : 0, minWidth: 0 }}>
          <Suspense fallback={<PageLoader />}>
            {children}
          </Suspense>
        </main>
      </div>
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: 'var(--bg-glass)',
                color: 'var(--text-primary)',
                backdropFilter: 'blur(12px)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-md)'
              }
            }}
          />
          <AppLayout>
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegisterPage />} />
              <Route path="/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/scanner" element={<ProtectedRoute><ScannerWorkspace /></ProtectedRoute>} />
              <Route path="/editor/:id" element={<ProtectedRoute><DocumentEditor /></ProtectedRoute>} />
              <Route path="/files" element={<ProtectedRoute><FilesPage /></ProtectedRoute>} />
              <Route path="/tools/merge" element={<ProtectedRoute><MergePDF /></ProtectedRoute>} />
              <Route path="/tools/ai" element={<ProtectedRoute><AiEditor /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
              <Route path="/share/:token" element={<SharedPdfPage />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </AppLayout>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
