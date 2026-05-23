import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import Navbar from './components/Layout/Navbar';
import Sidebar from './components/Layout/Sidebar';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import ForgotPasswordPage from './pages/Auth/ForgotPasswordPage';
import Dashboard from './pages/Dashboard';
import ScannerWorkspace from './pages/ScannerWorkspace';
import DocumentEditor from './pages/DocumentEditor';
import FilesPage from './pages/FilesPage';
import SettingsPage from './pages/SettingsPage';
import MergePDF from './pages/MergePDF';
import AiEditor from './pages/AiEditor';
import './index.css';

const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><div className="skeleton" style={{ width: 48, height: 48, borderRadius: '50%' }} /></div>;
  if (!user) return <Navigate to="/login" />;
  return children;
};

const AppLayout = ({ children }) => {
  const { user, token, loading } = useAuth();
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const authPaths = ['/', '/login', '/register', '/forgot-password'];
  const isAuthPage = authPaths.includes(location.pathname);
  const shouldShowShell = !isAuthPage && (user || (token && loading));

  if (isAuthPage) return children;

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      {shouldShowShell && <Sidebar mobileOpen={mobileSidebarOpen} onClose={() => setMobileSidebarOpen(false)} />}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {shouldShowShell && <Navbar onToggleSidebar={() => setMobileSidebarOpen(o => !o)} />}
        <main style={{ flex: 1, padding: shouldShowShell ? '24px' : 0, minWidth: 0 }}>
          {children}
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
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </AppLayout>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
