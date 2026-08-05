import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import ProduitsPage from './pages/ProduitsPage';
import InventairePage from './pages/InventairePage';
import CommandePage from './pages/CommandePage';
import ReceptionPage from './pages/ReceptionPage';
import LieuxPage from './pages/LieuxPage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter basename="/stocks">
        <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="produits" element={<ProduitsPage />} />
            <Route path="inventaire" element={<InventairePage />} />
            <Route path="inventaire/:sessionId" element={<InventairePage />} />
            <Route path="commande" element={<CommandePage />} />
            <Route path="reception" element={<ReceptionPage />} />
            <Route path="lieux" element={<LieuxPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}

