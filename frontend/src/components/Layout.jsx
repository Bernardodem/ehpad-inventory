import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Package, ClipboardList, ShoppingCart, Users, Home, Menu, X } from 'lucide-react';
import { useState } from 'react';
import UserMenu from './UserMenu';
import toast from 'react-hot-toast';

const ROLE_LABELS = { admin: 'Administrateur', gestionnaire: 'Gestionnaire de commande', inventaire: 'Inventaire' };
const ROLE_COLORS = { admin: 'badge-red', gestionnaire: 'badge-blue', inventaire: 'badge-green' };

export default function Layout() {
  const { user, logout, can } = useAuth();
  const [burgerOpen, setBurgerOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success('Déconnexion réussie');
    navigate('/login');
  };

  const navItems = [
    { to: '/', label: 'Accueil', icon: Home, always: true },
    { to: '/produits', label: 'Produits', icon: Package, always: true },
    { to: '/inventaire', label: 'Inventaire', icon: ClipboardList, roles: ['inventaire', 'gestionnaire', 'admin'] },
    { to: '/commande', label: 'Commande', icon: ShoppingCart, roles: ['gestionnaire', 'admin'] },
  ].filter(item => item.always || (item.roles && can(...item.roles)));

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <div className="max-w-5xl mx-auto px-4 pt-4 w-full">
        <div className="rounded-2xl px-5 py-4 mb-4 text-white" style={{ background: 'linear-gradient(135deg, #3A2020, #5C3A37)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src="https://monaec.fr/logo-aec.jpg" alt="Arc en Ciel" className="h-12 rounded-lg" />
              <div>
                <h1 className="text-base font-bold">Gestion des stocks</h1>
                <p className="text-xs" style={{ color: 'rgba(255,255,255,0.55)' }}>Résidence Arc en Ciel</p>
              </div>
            </div>
            <UserMenu user={user} onLogout={handleLogout} />
          </div>
        </div>
      </div>

      {/* Nav desktop */}
      <nav className="bg-white border-b border-gray-200 shadow-sm hidden sm:block">
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex gap-1">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                    isActive ? 'border-primary-600 text-primary-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`
                }
              >
                <Icon size={16} />
                {label}
              </NavLink>
            ))}
          </div>
        </div>
      </nav>

      {/* Nav mobile burger */}
      <div className="sm:hidden bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-2 flex items-center justify-between">
          <span className="text-sm font-medium text-gray-700">Navigation</span>
          <button onClick={() => setBurgerOpen(o => !o)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100">
            {burgerOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
        {burgerOpen && (
          <div className="border-t border-gray-100">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink key={to} to={to} end={to === '/'}
                onClick={() => setBurgerOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-4 py-3 text-sm font-medium border-l-4 transition-colors ${
                    isActive ? 'border-primary-600 text-primary-700 bg-primary-50' : 'border-transparent text-gray-600 hover:bg-gray-50'
                  }`
                }
              >
                <Icon size={17} />
                {label}
              </NavLink>
            ))}
          </div>
        )}
      </div>

      {/* Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-100 py-3 text-center text-xs text-gray-400">
        EHPAD Arc en Ciel — MAPAD Group — Gestion des stocks v1.0
      </footer>
    </div>
  );
}
