import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { Layout } from './layout/Layout';
import { ToastProvider } from './components/Toast';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { ClientesPage } from './pages/ClientesPage';
import { ObrigacoesPage } from './pages/ObrigacoesPage';
import { TemplatesPage } from './pages/TemplatesPage';
import { CiclosPage } from './pages/CiclosPage';
import { CicloDetailPage } from './pages/CicloDetailPage';
import { ExcecoesPage } from './pages/ExcecoesPage';
import { AuditoriaPage } from './pages/AuditoriaPage';

function ProtectedRoute() {
  const { sessao, loading } = useAuth();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading">Carregando...</div>
      </div>
    );
  }

  if (!sessao) return <Navigate to="/login" replace />;

  return <Outlet />;
}

function PublicRoute() {
  const { sessao, loading } = useAuth();

  if (loading) return null;
  if (sessao) return <Navigate to="/" replace />;

  return <Outlet />;
}

export function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<PublicRoute />}>
              <Route path="/login" element={<LoginPage />} />
            </Route>
            <Route element={<ProtectedRoute />}>
              <Route element={<Layout />}>
                <Route index element={<DashboardPage />} />
                <Route path="/clientes" element={<ClientesPage />} />
                <Route path="/obrigacoes" element={<ObrigacoesPage />} />
                <Route path="/templates" element={<TemplatesPage />} />
                <Route path="/ciclos" element={<CiclosPage />} />
                <Route path="/ciclos/:id" element={<CicloDetailPage />} />
                <Route path="/excecoes" element={<ExcecoesPage />} />
                <Route path="/auditoria" element={<AuditoriaPage />} />
              </Route>
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </ToastProvider>
    </AuthProvider>
  );
}
