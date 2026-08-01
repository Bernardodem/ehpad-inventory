import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Package, ClipboardList, ShoppingCart, Users, Home, Menu, X } from 'lucide-react';
import { useState } from 'react';
import UserMenu from './UserMenu';
import toast from 'react-hot-toast';

const ROLE_LABELS = { admin: 'Administrateur', gestionnaire: 'Gestionnaire de commande', inventaire: 'Inventaire' };
const ROLE_COLORS = { admin: 'badge-red', gestionnaire: 'badge-blue', inventaire: 'badge-green' };


const SAINTS = ["Marie","Basile","Genevieve","Odilon","Edouard","Melaine","Raymond","Lucien","Alix","Guillaume","Paulin","Tatiana","Yvette","Nina","Remi","Marcel","Roseline","Prisca","Marius","Sebastien","Agnes","Vincent","Barnard","Francois","Ananie","Paule","Angele","Thomas","Gildas","Martine","Marcelle","Ella","Theophane","Blaise","Veronique","Agathe","Gaston","Eugenie","Jacqueline","Apolline","Arnaud","Heloise","Felix","Beatrice","Valentin","Claude","Julienne","Alexis","Bernadette","Gabin","Aimee","Pierre-Damien","Isabelle","Lazare","Modeste","Romeo","Nestor","Honorine","Romain","Auguste","Aubin","Charles","Guenole","Casimir","Olive","Colette","Felicite","Jean","Francoise","Vivien","Rosine","Justine","Rodrigue","Mathilde","Louise","Benedicte","Patrice","Cyrille","Joseph","Herbert","Clemence","Lea","Victorien","Catherine","Humbert","Larissa","Habib","Gontran","Gwladys","Amedee","Benjamin","Hugues","Sandrine","Richard","Isidore","Irene","Marcellin","Jean-Baptiste","Julie","Gauthier","Fulbert","Stanislas","Jules","Ida","Maxime","Paterne","Benoit-Joseph","Anicet","Parfait","Emma","Odette","Anselme","Alexandre","Georges","Fidele","Marc","Alida","Zita","Valerie","Catherine","Robert","Jeremie","Boris","Philippe","Sylvain","Judith","Prudence","Gisele","Desire","Pacome","Solange","Estelle","Achille","Rolande","Matthias","Denise","Honore","Pascal","Eric","Yves","Bernardin","Constantin","Emile","Didier","Donatien","Sophie","Berenger","Augustin","Germain","Aymard","Ferdinand","Perrine","Justin","Blandine","Kevin","Clotilde","Igor","Norbert","Gilbert","Medard","Diane","Landry","Barnabe","Guy","Antoine","Elisee","Germaine","Jean-Francois","Herve","Leonce","Romuald","Silvere","Rodolphe","Alban","Audrey","Jean-Baptiste","Prosper","Anthelme","Fernand","Irenee","Pierre","Martial","Thierry","Martinien","Thomas","Florent","Antoine","Mariette","Raoul","Thibaut","Amandine","Ulrich","Benoit","Olivier","Henri","Camille","Donald","Carmen","Charlotte","Frederic","Arsene","Marina","Victor","Marie-Madeleine","Brigitte","Christine","Jacques","Anne","Nathalie","Samson","Marthe","Juliette","Ignace","Alphonse","Julien","Lydie","Jean-Marie","Abel","Octavien","Gaetan","Dominique","Amour","Laurent","Claire","Clarisse","Hippolyte","Evrard","Marie","Armel","Hyacinthe","Helene","Jean-Eudes","Bernard","Christophe","Fabrice","Rose","Barthelemy","Louis","Natacha","Monique","Augustin","Sabine","Fiacre","Aristide","Gilles","Ingrid","Gregoire","Rosalie","Raissa","Bertrand","Reine","Adrien","Alain","Ines","Adelphe","Apollinaire","Aime","Cyprien","Roland","Edith","Renaud","Nadege","Emilie","Davy","Matthieu","Maurice","Constant","Thecle","Hermann","Come","Vincent","Venceslas","Michel","Jerome","Therese","Leger","Gerard","Francois","Fleur","Bruno","Serge","Pelagie","Denis","Ghislain","Firmin","Wilfried","Geraud","Juste","Aurelie","Edwige","Baudouin","Luc","Rene","Adeline","Celine","Elodie","Jean","Florentin","Crepin","Dimitri","Emeline","Simon","Narcisse","Bienvenue","Quentin","Harold","Oceane","Hubert","Charles","Sylvie","Bertille","Carine","Geoffroy","Theodore","Leon","Martin","Christian","Brice","Sidoine","Albert","Marguerite","Elisabeth","Aude","Tanguy","Edmond","Rufus","Cecile","Clement","Flora","Catherine","Delphine","Severin","Jacques","Saturnin","Andre","Florence","Viviane","Xavier","Barbara","Gerald","Nicolas","Ambroise","Elfried","Pierre","Romaric","Daniel","Corentin","Lucie","Odile","Ninon","Alice","Gael","Gatien","Urbain","Theophile","Pierre","Francoise-Xaviere","Armand","Adele","Emmanuel","Etienne","Jean","Gaspard","David","Roger","Sylvestre"];

function getSaintDuJour() {
  const now = new Date();
  const year = now.getFullYear();
  const start = new Date(year, 0, 1);
  const diff = now - start;
  const oneDay = 1000 * 60 * 60 * 24;
  let day = Math.floor(diff / oneDay);
  const isBissextile = (year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0));
  if (!isBissextile && day >= 59) day++;
  return SAINTS[Math.min(day, SAINTS.length - 1)] || '';
}

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
          <div className="grid grid-cols-3 items-center">
            <div className="flex items-center gap-3 min-w-0">
              <img src="https://monaec.fr/logo-aec.jpg" alt="Arc en Ciel" className="h-12 rounded-lg shrink-0" />
              <div className="min-w-0">
                <h1 className="text-base font-bold truncate">Bonjour, {user?.prenom || user?.full_name} 👋</h1>
                <p className="text-xs leading-tight" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}
                  <br />Nous fêtons les {getSaintDuJour()}
                </p>
              </div>
            </div>
            <div className="text-center font-bold text-base">Gestion des stocks</div>
            <div className="flex justify-end">
              <UserMenu user={user} onLogout={handleLogout} />
            </div>
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
