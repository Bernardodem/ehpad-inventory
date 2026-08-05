import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Plus, Trash2, X, Search, Package } from 'lucide-react';

function GererProduitsModal({ lieu, onClose }) {
  const [produitsLieu, setProduitsLieu] = useState([]);
  const [tousLesproduits, setTousProduits] = useState([]);
  const [recherche, setRecherche] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [pl, tp] = await Promise.all([
      api.get(`/lieux/${lieu.id}/produits`),
      api.get('/produits'),
    ]);
    setProduitsLieu(pl.data);
    setTousProduits(tp.data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const produitsFiltres = tousLesproduits.filter(p =>
    !produitsLieu.find(pl => pl.id === p.id) &&
    (recherche.length < 2 || p.denomination.toLowerCase().includes(recherche.toLowerCase()))
  );

  const ajouter = async (produit) => {
    try {
      await api.post(`/lieux/${lieu.id}/produits`, { produit_id: produit.id, dotation: produit.dotation });
      toast.success('Produit ajouté');
      load();
    } catch { toast.error('Erreur'); }
  };

  const retirer = async (produitLieuId) => {
    try {
      await api.delete(`/lieux/${lieu.id}/produits/${produitLieuId}`);
      toast.success('Produit retiré');
      load();
    } catch { toast.error('Erreur'); }
  };

  const updateDotation = async (produitLieuId, dotation) => {
    try {
      await api.post(`/lieux/${lieu.id}/produits`, { produit_id: produitsLieu.find(p => p.produit_lieu_id === produitLieuId)?.id, dotation: Number(dotation) });
    } catch {}
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="font-bold text-gray-900">Produits — {lieu.name}</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        {/* Produits du lieu */}
        <div className="mb-4 shrink-0">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Produits dans ce lieu ({produitsLieu.length})</p>
          {loading ? <p className="text-sm text-gray-400">Chargement...</p> : (
            <div className="max-h-48 overflow-y-auto space-y-1">
              {produitsLieu.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Aucun produit</p>
              ) : produitsLieu.map(p => (
                <div key={p.produit_lieu_id} className="flex items-center gap-3 bg-gray-50 rounded-lg px-3 py-2">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.denomination}{p.taille && <span className="ml-2 badge-gray">{p.taille}</span>}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-xs text-gray-400">Dotation</label>
                    <input type="number" min="0" step="1" className="input w-16 text-center py-1 text-sm"
                      defaultValue={p.dotation_lieu || ''}
                      onBlur={e => updateDotation(p.produit_lieu_id, e.target.value)}
                      placeholder="—"
                    />
                    <button onClick={() => retirer(p.produit_lieu_id)} className="text-red-400 hover:text-red-600 p-1"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Ajouter des produits */}
        <div className="border-t pt-4 flex-1 flex flex-col min-h-0">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Ajouter un produit</p>
          <div className="relative mb-2 shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input className="input w-full pl-9" placeholder="Rechercher..." value={recherche} onChange={e => setRecherche(e.target.value)} />
          </div>
          <div className="overflow-y-auto flex-1 space-y-1">
            {produitsFiltres.slice(0, 30).map(p => (
              <div key={p.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 rounded-lg cursor-pointer" onClick={() => ajouter(p)}>
                <Package size={14} className="text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">{p.denomination}{p.taille && <span className="ml-2 badge-gray">{p.taille}</span>}</p>
                  {p.fournisseur && <p className="text-xs text-gray-400">{p.fournisseur}</p>}
                </div>
                <Plus size={14} className="text-gray-400 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LieuxPage() {
  const [lieux, setLieux] = useState([]);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [gererLieu, setGererLieu] = useState(null);
  const [loading, setLoading] = useState(true);

  const load = () => api.get('/lieux').then(r => { setLieux(r.data); setLoading(false); });

  useEffect(() => { load(); }, []);

  const creer = async () => {
    if (!newName.trim()) { toast.error('Nom requis'); return; }
    try {
      await api.post('/lieux', { name: newName.trim(), description: newDesc.trim() || null });
      toast.success('Lieu créé');
      setNewName(''); setNewDesc(''); setShowForm(false);
      load();
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };

  const supprimer = async (id) => {
    if (!window.confirm('Supprimer ce lieu ?')) return;
    try {
      await api.delete(`/lieux/${id}`);
      toast.success('Lieu supprimé');
      load();
    } catch { toast.error('Erreur'); }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Lieux de stockage</h1>
          <p className="text-sm text-gray-500 mt-0.5">{lieux.length} lieu{lieux.length > 1 ? 'x' : ''} configuré{lieux.length > 1 ? 's' : ''}</p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary"><Plus size={16} /> Nouveau lieu</button>
      </div>

      {showForm && (
        <div className="card p-4 mb-6">
          <div className="flex gap-3 flex-wrap">
            <input className="input flex-1" placeholder="Nom du lieu (ex: Stock médical)" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && creer()} autoFocus />
            <input className="input flex-1" placeholder="Description (optionnel)" value={newDesc} onChange={e => setNewDesc(e.target.value)} />
            <button onClick={creer} className="btn-primary">Créer</button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Annuler</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-gray-400 text-center py-10">Chargement...</p> : (
        <div className="space-y-3">
          {lieux.map(l => (
            <div key={l.id} className="card px-4 py-3 flex items-center justify-between">
              <div>
                <p className="font-semibold text-gray-900">{l.name}</p>
                {l.description && <p className="text-sm text-gray-500 mt-0.5">{l.description}</p>}
              </div>
              <div className="flex gap-2">
                <button onClick={() => setGererLieu(l)} className="btn-secondary text-sm">Gérer les produits</button>
                <button onClick={() => supprimer(l.id)} className="p-2 rounded-lg border border-red-200 text-red-500 hover:bg-red-50"><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      {gererLieu && <GererProduitsModal lieu={gererLieu} onClose={() => { setGererLieu(null); load(); }} />}
    </div>
  );
}
