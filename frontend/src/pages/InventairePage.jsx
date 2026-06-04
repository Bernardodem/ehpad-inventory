import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { Plus, CheckCircle, ClipboardList, ChevronDown, ChevronUp } from 'lucide-react';

export default function InventairePage() {
  const [sessions, setSessions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [produits, setProduits] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [lignes, setLignes] = useState({});
  const [newSession, setNewSession] = useState({ label: '', type: 'total', categories: [] });
  const [showNew, setShowNew] = useState(false);
  const [loading, setLoading] = useState(false);
  const [openCats, setOpenCats] = useState({});

  const load = async () => {
    const [s, c, p] = await Promise.all([
      api.get('/inventaire/sessions'),
      api.get('/produits/categories'),
      api.get('/produits'),
    ]);
    setSessions(s.data);
    setCategories(c.data);
    setProduits(p.data);
  };

  const loadLignes = async (sessionId) => {
    const { data } = await api.get(`/inventaire/sessions/${sessionId}/lignes`);
    const map = {};
    data.forEach(l => { map[l.produit_id] = l; });
    setLignes(map);
  };

  useEffect(() => { load(); }, []);
  useEffect(() => { if (activeSession) loadLignes(activeSession.id); }, [activeSession]);

  const createSession = async () => {
    if (!newSession.label) return toast.error('Donnez un nom à la session');
    setLoading(true);
    try {
      const { data } = await api.post('/inventaire/sessions', {
        ...newSession,
        categories: newSession.type === 'partiel' ? newSession.categories : null
      });
      await load();
      const ses = (await api.get('/inventaire/sessions')).data.find(s => s.id === data.id);
      setActiveSession(ses);
      setShowNew(false);
      setNewSession({ label: '', type: 'total', categories: [] });
      toast.success('Session créée');
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
    finally { setLoading(false); }
  };

  const saveLigne = async (produitId, quantite, datePeremption) => {
    try {
      await api.post(`/inventaire/sessions/${activeSession.id}/lignes`, {
        produit_id: produitId, quantite: parseFloat(quantite) || 0, date_peremption: datePeremption || null
      });
      await loadLignes(activeSession.id);
    } catch (err) { toast.error('Erreur de saisie'); }
  };

  const finishSession = async () => {
    if (!window.confirm('Terminer cet inventaire ? Il sera utilisé pour le calcul des commandes.')) return;
    await api.patch(`/inventaire/sessions/${activeSession.id}/finish`);
    toast.success('Inventaire terminé');
    await load();
    setActiveSession(s => ({ ...s, status: 'termine' }));
  };

  // Filter products for current session
  const filteredProduits = activeSession?.type === 'partiel' && activeSession.categories
    ? produits.filter(p => {
        const cats = JSON.parse(activeSession.categories);
        return cats.includes(p.categorie);
      })
    : produits;

  const grouped = filteredProduits.reduce((acc, p) => {
    const cat = p.categorie || 'Sans catégorie';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const progress = filteredProduits.length > 0
    ? Math.round((Object.keys(lignes).length / filteredProduits.length) * 100)
    : 0;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-gray-900">Inventaire</h1>
        <button className="btn-primary" onClick={() => setShowNew(true)}><Plus size={16} /> Nouvelle session</button>
      </div>

      {/* Nouvelle session */}
      {showNew && (
        <div className="card p-5 mb-6 border-2 border-primary-200">
          <h2 className="font-semibold text-gray-900 mb-4">Créer une session d'inventaire</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Nom de la session</label>
              <input className="input" placeholder="Ex: Inventaire juin 2025" value={newSession.label} onChange={e => setNewSession(p => ({ ...p, label: e.target.value }))} />
            </div>
            <div>
              <label className="label">Type</label>
              <select className="input" value={newSession.type} onChange={e => setNewSession(p => ({ ...p, type: e.target.value, categories: [] }))}>
                <option value="total">Inventaire total</option>
                <option value="partiel">Inventaire partiel (par catégorie)</option>
              </select>
            </div>
            {newSession.type === 'partiel' && (
              <div className="sm:col-span-2">
                <label className="label">Catégories à inventorier</label>
                <div className="flex flex-wrap gap-2">
                  {categories.map(c => (
                    <label key={c.id} className="flex items-center gap-2 cursor-pointer">
                      <input type="checkbox" checked={newSession.categories.includes(c.name)}
                        onChange={e => setNewSession(p => ({
                          ...p,
                          categories: e.target.checked ? [...p.categories, c.name] : p.categories.filter(x => x !== c.name)
                        }))}
                      />
                      <span className="text-sm">{c.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button className="btn-primary" onClick={createSession} disabled={loading}>Créer</button>
            <button className="btn-secondary" onClick={() => setShowNew(false)}>Annuler</button>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Sessions list */}
        <div className="space-y-2">
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Sessions récentes</h2>
          {sessions.length === 0 && <p className="text-sm text-gray-400 italic">Aucune session</p>}
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => setActiveSession(s)}
              className={`w-full text-left card p-3 border-2 transition-all ${activeSession?.id === s.id ? 'border-primary-400 bg-primary-50' : 'border-transparent hover:border-gray-300'}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="font-medium text-sm text-gray-900">{s.label}</p>
                  <p className="text-xs text-gray-500">{new Date(s.created_at).toLocaleDateString('fr-FR')}</p>
                </div>
                <span className={s.status === 'termine' ? 'badge-green' : 'badge-yellow'}>
                  {s.status === 'termine' ? 'Terminé' : 'En cours'}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1 capitalize">{s.type} {s.categories ? `— ${JSON.parse(s.categories).join(', ')}` : ''}</p>
            </button>
          ))}
        </div>

        {/* Saisie */}
        <div className="lg:col-span-2">
          {!activeSession ? (
            <div className="card flex flex-col items-center justify-center h-48 text-gray-400">
              <ClipboardList size={32} className="mb-2" />
              <p>Sélectionnez ou créez une session</p>
            </div>
          ) : (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold text-gray-900">{activeSession.label}</h2>
                  <p className="text-xs text-gray-500">{Object.keys(lignes).length} / {filteredProduits.length} produits saisis — {progress}%</p>
                </div>
                {activeSession.status === 'en_cours' && (
                  <button className="btn-primary bg-green-600 hover:bg-green-700" onClick={finishSession}>
                    <CheckCircle size={16} /> Terminer
                  </button>
                )}
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2 mb-5">
                <div className="bg-green-500 h-2 rounded-full transition-all" style={{ width: `${progress}%` }} />
              </div>

              <div className="space-y-3">
                {Object.entries(grouped).map(([cat, items]) => (
                  <div key={cat} className="card overflow-hidden">
                    <button
                      className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-100 hover:bg-gray-100"
                      onClick={() => setOpenCats(p => ({ ...p, [cat]: !p[cat] }))}
                    >
                      <span className="font-semibold text-sm text-gray-700">{cat}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-400">{items.filter(p => lignes[p.id]).length}/{items.length}</span>
                        {openCats[cat] ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </div>
                    </button>
                    {openCats[cat] && (
                      <div className="divide-y divide-gray-50">
                        {items.map(p => {
                          const l = lignes[p.id];
                          return (
                            <div key={p.id} className={`px-4 py-3 grid grid-cols-3 gap-3 items-center ${l ? 'bg-green-50' : ''}`}>
                              <div className="col-span-1">
                                <p className="text-sm font-medium text-gray-900">{p.denomination}</p>
                                {p.taille && <p className="text-xs text-gray-400">{p.taille}</p>}
                                <p className="text-xs text-gray-400">{p.conditionnement}</p>
                              </div>
                              <InventaireInput
                                key={p.id}
                                produit={p}
                                initial={l}
                                disabled={activeSession.status === 'termine'}
                                onSave={(qte, date) => saveLigne(p.id, qte, date)}
                              />
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InventaireInput({ produit, initial, disabled, onSave }) {
  const [qte, setQte] = useState(initial?.quantite ?? '');
  const [date, setDate] = useState(initial?.date_peremption ?? '');
  const [dirty, setDirty] = useState(false);

  const handleSave = () => {
    if (qte === '') return toast.error('Saisissez une quantité');
    onSave(qte, date);
    setDirty(false);
  };

  return (
    <>
      <div>
        <label className="label">Qté en stock</label>
        <input
          className={`input text-center ${initial && !dirty ? 'border-green-300 bg-green-50' : ''}`}
          type="number" min="0" step="0.5"
          value={qte}
          disabled={disabled}
          onChange={e => { setQte(e.target.value); setDirty(true); }}
          onBlur={() => { if (dirty && qte !== '') handleSave(); }}
          placeholder="0"
        />
      </div>
      <div>
        <label className="label">Date péremption</label>
        <input
          className="input text-xs"
          type="date"
          value={date}
          disabled={disabled}
          onChange={e => { setDate(e.target.value); setDirty(true); }}
          onBlur={() => { if (dirty && qte !== '') handleSave(); }}
        />
      </div>
    </>
  );
}
