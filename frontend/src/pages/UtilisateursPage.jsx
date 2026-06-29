import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Plus, Shield, Edit2, UserX, UserCheck, X, Save, Eye } from 'lucide-react';

const ROLE_LABELS = { admin: 'Administrateur', gestionnaire: 'Gestionnaire de commande', inventaire: 'Inventaire' };
const ROLE_COLORS = { admin: 'badge-red', gestionnaire: 'badge-blue', inventaire: 'badge-green' };

function UserModal({ user, onClose, onSaved }) {
  const isNew = !user;
  const [form, setForm] = useState(user ? { full_name: user.full_name, role: user.role, password: '' } : { username: '', password: '', full_name: '', role: 'inventaire' });
  const [loading, setLoading] = useState(false);

  const save = async () => {
    if (!form.full_name || !form.role) return toast.error('Prénom/nom et rôle requis');
    if (isNew && (!form.username || !form.password)) return toast.error('Identifiant et mot de passe requis');
    setLoading(true);
    try {
      if (isNew) {
        await api.post('/users', form);
        toast.success('Utilisateur créé');
      } else {
        const payload = { full_name: form.full_name, role: form.role };
        if (form.password) payload.password = form.password;
        await api.patch(`/users/${user.id}`, payload);
        toast.success('Utilisateur modifié');
      }
      onSaved();
      onClose();
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="card w-full max-w-md p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900">{isNew ? 'Nouvel utilisateur' : 'Modifier l\'utilisateur'}</h2>
          <button className="btn-ghost p-1.5" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="space-y-4">
          {isNew && (
            <div>
              <label className="label">Identifiant de connexion</label>
              <input className="input" value={form.username} onChange={e => setForm(p => ({ ...p, username: e.target.value }))} placeholder="ex: jdupont" />
            </div>
          )}
          <div>
            <label className="label">Prénom & Nom</label>
            <input className="input" value={form.full_name} onChange={e => setForm(p => ({ ...p, full_name: e.target.value }))} placeholder="ex: Jean Dupont" />
          </div>
          <div>
            <label className="label">Niveau d'habilitation</label>
            <select className="input" value={form.role} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
              <option value="inventaire">Inventaire</option>
              <option value="gestionnaire">Gestionnaire de commande</option>
              <option value="admin">Administrateur</option>
            </select>
            <p className="text-xs text-gray-400 mt-1">
              {form.role === 'inventaire' && 'Accès : saisie inventaire uniquement'}
              {form.role === 'gestionnaire' && 'Accès : inventaire + commandes + modification produits'}
              {form.role === 'admin' && 'Accès complet incluant la gestion des utilisateurs'}
            </p>
          </div>
          <div>
            <label className="label">{isNew ? 'Mot de passe' : 'Nouveau mot de passe (laisser vide = inchangé)'}</label>
            <input className="input" type="password" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))} placeholder={isNew ? 'Minimum 8 caractères' : '••••••••'} />
          </div>
        </div>
        <div className="flex gap-2 mt-5">
          <button className="btn-primary" onClick={save} disabled={loading}><Save size={15} />{loading ? 'Enregistrement…' : 'Enregistrer'}</button>
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  );
}

export default function UtilisateursPage() {
  const [users, setUsers] = useState([]);
  const [modal, setModal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showInactifs, setShowInactifs] = useState(false);

  const load = async () => {
    try {
      const { data } = await api.get('/users');
      setUsers(data);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleActive = async (user) => {
    try {
      await api.patch(`/users/${user.id}`, { active: !user.active });
      toast.success(user.active ? 'Compte désactivé' : 'Compte réactivé');
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };

  const actifs = users.filter(u => u.active);
  const inactifs = users.filter(u => !u.active);
  const displayed = showInactifs ? inactifs : actifs;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Gestion des utilisateurs</h1>
        <div className="flex gap-2">
          <button
            className={showInactifs ? 'btn-primary' : 'btn-secondary'}
            onClick={() => setShowInactifs(p => !p)}
          >
            <Eye size={15} />
            {showInactifs ? 'Voir actifs' : `Désactivés (${inactifs.length})`}
          </button>
          <button className="btn-primary" onClick={() => setModal('new')}><Plus size={16} /> Nouvel utilisateur</button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-32 text-gray-400">Chargement…</div>
      ) : (
        <div className="card overflow-hidden">
          {displayed.length === 0 ? (
            <div className="p-10 text-center text-gray-400">
              {showInactifs ? 'Aucun compte désactivé' : 'Aucun utilisateur actif'}
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Utilisateur</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600 hidden sm:table-cell">Identifiant</th>
                  <th className="text-left px-4 py-3 font-semibold text-gray-600">Habilitation</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {displayed.map(u => (
                  <tr key={u.id} className="table-row">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-bold text-xs flex-shrink-0">
                          {u.full_name.charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-900">{u.full_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono hidden sm:table-cell">{u.username}</td>
                    <td className="px-4 py-3">
                      <span className={ROLE_COLORS[u.role]}><Shield size={11} className="inline mr-1" />{ROLE_LABELS[u.role]}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1 justify-end">
                        {!showInactifs && (
                          <button className="btn-ghost p-1.5" title="Modifier" onClick={() => setModal(u)}><Edit2 size={15} /></button>
                        )}
                        <button
                          className={`btn-ghost p-1.5 ${u.active ? 'text-red-500 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'}`}
                          title={u.active ? 'Désactiver' : 'Réactiver'}
                          onClick={() => toggleActive(u)}
                        >
                          {u.active ? <UserX size={15} /> : <UserCheck size={15} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {modal && (
        <UserModal
          user={modal === 'new' ? null : modal}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}