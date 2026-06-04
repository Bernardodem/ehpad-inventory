import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import ProduitsPage from './pages/ProduitsPage';
import InventairePage from './pages/InventairePage';
import CommandePage from './pages/CommandePage';
import UtilisateursPage from './pages/UtilisateursPage';

function RequireAuth({ children }) {
  const { user } = useAuth();
  return user ? children : <Navigate to="/login" replace />;
}

function RequireRole({ roles, children }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!roles.includes(user.role)) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RequireAuth><Layout /></RequireAuth>}>
            <Route index element={<HomePage />} />
            <Route path="produits" element={<ProduitsPage />} />
            <Route path="inventaire" element={
              <RequireRole roles={['inventaire', 'gestionnaire', 'admin']}><InventairePage /></RequireRole>
            } />
            <Route path="commande" element={
              <RequireRole roles={['gestionnaire', 'admin']}><CommandePage /></RequireRole>
            } />
            <Route path="utilisateurs" element={
              <RequireRole roles={['admin']}><UtilisateursPage /></RequireRole>
            } />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
