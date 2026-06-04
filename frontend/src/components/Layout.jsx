import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Package, ClipboardList, ShoppingCart, Users, LogOut, Home } from 'lucide-react';
import toast from 'react-hot-toast';

const ROLE_LABELS = { admin: 'Administrateur', gestionnaire: 'Gestionnaire de commande', inventaire: 'Inventaire' };
const ROLE_COLORS = { admin: 'badge-red', gestionnaire: 'badge-blue', inventaire: 'badge-green' };

export default function Layout() {
  const { user, logout, can } = useAuth();
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
    { to: '/utilisateurs', label: 'Utilisateurs', icon: Users, roles: ['admin'] },
  ].filter(item => item.always || (item.roles && can(...item.roles)));

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-primary-900 text-white shadow-lg sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-xl">🏥</span>
            <div>
              <span className="font-bold text-sm">Arc en Ciel</span>
              <span className="text-primary-300 text-xs ml-2 hidden sm:inline">MAPAD Group</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex flex-col items-end">
              <span className="text-sm font-medium">{user?.full_name}</span>
              <span className={`${ROLE_COLORS[user?.role]} text-xs`}>{ROLE_LABELS[user?.role]}</span>
            </div>
            <button onClick={handleLogout} className="btn-ghost text-white hover:bg-primary-700 p-2 rounded-lg" title="Déconnexion">
              <LogOut size={18} />
            </button>
          </div>
        </div>
      </header>

      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {navItems.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
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

      {/* Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-6">
        <Outlet />
      </main>

      <footer className="bg-white border-t border-gray-100 py-3 text-center text-xs text-gray-400">
        EHPAD Arc en Ciel — MAPAD Group — Gestion des stocks v1.0
      </footer>
    </div>
  );
}
