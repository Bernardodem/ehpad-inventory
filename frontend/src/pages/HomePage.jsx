import { useAuth } from '../contexts/AuthContext';
import { ClipboardList, ShoppingCart, Package, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ROLE_LABELS = { admin: 'Administrateur', gestionnaire: 'Gestionnaire de commande', inventaire: 'Agent Inventaire' };

export default function HomePage() {
  const { user, can } = useAuth();
  const navigate = useNavigate();

  const cards = [
    {
      title: 'Inventaire',
      desc: 'Saisir les quantités et dates de péremption par catégorie ou en totalité',
      icon: ClipboardList,
      color: 'bg-green-50 border-green-200 hover:border-green-400',
      iconColor: 'text-green-600',
      path: '/inventaire',
      roles: ['inventaire', 'gestionnaire', 'admin'],
    },
    {
      title: 'Commande',
      desc: 'Visualiser les quantités à commander basées sur le dernier inventaire et la dotation',
      icon: ShoppingCart,
      color: 'bg-blue-50 border-blue-200 hover:border-blue-400',
      iconColor: 'text-blue-600',
      path: '/commande',
      roles: ['gestionnaire', 'admin'],
    },
    {
      title: 'Catalogue produits',
      desc: 'Fiches produits : conditionnement, fournisseur, emplacement, photo…',
      icon: Package,
      color: 'bg-purple-50 border-purple-200 hover:border-purple-400',
      iconColor: 'text-purple-600',
      path: '/produits',
      roles: ['inventaire', 'gestionnaire', 'admin'],
    },
    {
      title: 'Utilisateurs',
      desc: 'Créer des comptes et gérer les niveaux d\'habilitation',
      icon: Users,
      color: 'bg-red-50 border-red-200 hover:border-red-400',
      iconColor: 'text-red-600',
      path: '/utilisateurs',
      roles: ['admin'],
    },
  ].filter(c => can(...c.roles));

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Bonjour, {user?.full_name}</h1>
        <p className="text-gray-500 mt-1">
          Connecté en tant que <span className="font-medium text-primary-700">{ROLE_LABELS[user?.role]}</span>
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map(({ title, desc, icon: Icon, color, iconColor, path }) => (
          <button
            key={path}
            onClick={() => navigate(path)}
            className={`card border-2 p-6 text-left transition-all duration-150 cursor-pointer ${color}`}
          >
            <div className={`inline-flex p-3 rounded-xl bg-white mb-4 shadow-sm`}>
              <Icon size={24} className={iconColor} />
            </div>
            <h2 className="font-semibold text-gray-900 mb-1">{title}</h2>
            <p className="text-sm text-gray-500 leading-relaxed">{desc}</p>
          </button>
        ))}
      </div>
    </div>
  );
}
