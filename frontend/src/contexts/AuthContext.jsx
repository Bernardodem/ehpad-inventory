import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewAs, setViewAsState] = useState(() => localStorage.getItem('test_view_as') || 'admin');
  const setViewAs = (v) => { localStorage.setItem('test_view_as', v); setViewAsState(v); };

  useEffect(() => {
    // Récupère le token SSO depuis l'URL
    const params = new URLSearchParams(window.location.search);
    const urlToken = params.get('token');
    
    if (urlToken) {
      localStorage.setItem('sso_token', urlToken);
      // Nettoie l'URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    const token = localStorage.getItem('sso_token') || localStorage.getItem('token');
    
    if (!token) {
      window.location.href = '/';
      return;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('sso_token');
        localStorage.removeItem('token');
        window.location.href = '/';
        return;
      }
    } catch {}

    api.get('/auth/me')
.then(({ data }) => {
  const normalized = {
    ...data,
    full_name: data.full_name || `${data.prenom || ''} ${data.nom || ''}`.trim(),
    role: data.role || (data.role_global === 'admin_groupe' || data.role_global === 'admin_etablissement' ? 'admin' : 'gestionnaire')
  };
  setUser(normalized);
})
      .catch(() => {
        localStorage.removeItem('sso_token');
        localStorage.removeItem('token');
        window.location.href = '/';
      })
      .finally(() => setLoading(false));
  }, []);

  const logout = () => {
    localStorage.removeItem('sso_token');
    localStorage.removeItem('token');
    window.location.href = '/';
  };

  const isRealAdmin = user && (user.role === 'admin' || ['admin_etablissement','admin_groupe'].includes(user.role_global));
  const can = (...roles) => {
    if (!user) return false;
    if (isRealAdmin) return roles.includes(viewAs);
    const role = user.role || user.role_global;
    return roles.includes(role);
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center text-gray-400">Chargement...</div>;

  return (
    <AuthContext.Provider value={{ user, logout, can, isRealAdmin, viewAs, setViewAs }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
