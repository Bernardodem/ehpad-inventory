import { useState, useEffect, useRef } from 'react';
import WheelDatePicker from '../components/WheelDatePicker';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { Plus, CheckCircle, ClipboardList, ChevronDown, ChevronUp, ChevronLeft, ChevronRight, X, LayoutGrid, List, Edit2 } from 'lucide-react';

export default function InventairePage() {
  const { sessionId } = useParams();
  const navigate = useNavigate();
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

  useEffect(() => {
    if (sessions.length === 0) return;
    if (sessionId) {
      const found = sessions.find(s => s.id === sessionId);
      if (found) setActiveSession(found);
    } else {
      setActiveSession(null);
    }
  }, [sessionId, sessions]);

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

  const [triPar, setTriPar] = useState('emplacement');
  const [vueCarte, setVueCarte] = useState(false);
  const [editCondProduit, setEditCondProduit] = useState(null);

  const emplacementLabel = (p) => {
    if (!p.emplacement_etage && !p.emplacement_etagere) return 'Sans emplacement';
    return `Étage ${p.emplacement_etage ?? '?'} — Étagère ${p.emplacement_etagere ?? '?'}`;
  };

  const grouped = filteredProduits.reduce((acc, p) => {
    const key = triPar === 'categorie' ? (p.categorie || 'Sans catégorie') : emplacementLabel(p);
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const progress = filteredProduits.length > 0
    ? Math.round((Object.keys(lignes).length / filteredProduits.length) * 100)
    : 0;

  if (vueCarte && activeSession && filteredProduits.length > 0) {
    const produitsTries = [...filteredProduits].sort((a, b) => {
      const ka = triPar === 'categorie' ? (a.categorie || 'Sans catégorie') : emplacementLabel(a);
      const kb = triPar === 'categorie' ? (b.categorie || 'Sans catégorie') : emplacementLabel(b);
      return ka.localeCompare(kb) || a.denomination.localeCompare(b.denomination);
    });
    return (
      <InventaireCarteUnique
        produits={produitsTries}
        lignes={lignes}
        disabled={activeSession.status === 'termine'}
        onSave={(produitId, qte, date) => saveLigne(produitId, qte, date)}
        onClose={() => setVueCarte(false)}
        triPar={triPar}
        setTriPar={setTriPar}
      />
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        {sessionId ? (
          <button className="btn-secondary" onClick={() => navigate('/inventaire')}>
            <ChevronLeft size={16} /> Retour aux sessions
          </button>
        ) : (
          <>
            <h1 className="text-xl font-bold text-gray-900">Inventaire</h1>
            <button className="btn-primary" onClick={() => setShowNew(true)}><Plus size={16} /> Nouvelle session</button>
          </>
        )}
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

      <div className={sessionId ? "" : "grid lg:grid-cols-3 gap-6"}>
        {/* Sessions list */}
        <div className={sessionId ? "hidden" : "space-y-2"}>
          <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-3">Sessions récentes</h2>
          {sessions.length === 0 && <p className="text-sm text-gray-400 italic">Aucune session</p>}
          {sessions.map(s => (
            <button
              key={s.id}
              onClick={() => navigate(`/inventaire/${s.id}`)}
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
              <div className="mb-4">
                <h2 className="font-semibold text-gray-900">{activeSession.label}</h2>
                <p className="text-xs text-gray-500">{Object.keys(lignes).length} / {filteredProduits.length} produits saisis — {progress}%</p>
              </div>

              {/* Tri */}
              <div className="flex items-center justify-between gap-2 mb-4 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500">Trier par</span>
                  <button onClick={() => setTriPar('emplacement')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${triPar === 'emplacement' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    Emplacement
                  </button>
                  <button onClick={() => setTriPar('categorie')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium ${triPar === 'categorie' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
                    Catégorie
                  </button>
                </div>
                <button onClick={() => setVueCarte(true)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 hover:bg-gray-200">
                  <LayoutGrid size={14} /> Vue par produit
                </button>
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
                                <button onClick={() => setEditCondProduit(p)} className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-600">
                                  {p.conditionnement || 'Aucun conditionnement'} <Edit2 size={11} />
                                </button>
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

              {activeSession.status === 'en_cours' && (
                <div className="flex justify-center mt-6">
                  <button className="btn-primary bg-green-600 hover:bg-green-700" onClick={finishSession}>
                    <CheckCircle size={16} /> Terminer
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {editCondProduit && (
        <EditConditionnementModal
          produit={editCondProduit}
          onClose={() => setEditCondProduit(null)}
          onSaved={(newVal) => { editCondProduit.conditionnement = newVal; setProduits(prev => prev.map(p => p.id === editCondProduit.id ? { ...p, conditionnement: newVal } : p)); }}
        />
      )}
    </div>
  );
}


async function majFormatPeremption(produit, nouvelleDate) {
  const sansJour = /^\d{4}-\d{2}$/.test(nouvelleDate);
  if (sansJour === !!produit.peremption_sans_jour) return;
  try {
    const fd = new FormData();
    fd.append('peremption_sans_jour', sansJour);
    await api.patch(`/produits/${produit.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
    produit.peremption_sans_jour = sansJour;
  } catch {}
}

function EditConditionnementModal({ produit, onClose, onSaved }) {
  const [value, setValue] = useState(produit.conditionnement || '');
  const [loading, setLoading] = useState(false);

  const save = async () => {
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append('conditionnement', value);
      await api.patch(`/produits/${produit.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success('Conditionnement mis à jour');
      onSaved(value);
      onClose();
    } catch { toast.error('Erreur lors de la mise à jour'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-gray-900">Corriger le conditionnement</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <p className="text-sm text-gray-500 mb-3">{produit.denomination}</p>
        <input
          autoFocus
          className="input mb-4"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && save()}
        />
        <div className="flex gap-2">
          <button onClick={save} disabled={loading} className="btn-primary">{loading ? 'Enregistrement...' : 'Enregistrer'}</button>
          <button onClick={onClose} className="btn-secondary">Annuler</button>
        </div>
      </div>
    </div>
  );
}

function InventaireCarteUnique({ produits, lignes, disabled, onSave, onClose, triPar, setTriPar }) {
  const progressCarte = produits.length > 0 ? Math.round((Object.keys(lignes).length / produits.length) * 100) : 0;
  const [index, setIndex] = useState(0);
  const produit = produits[index];
  const initial = lignes[produit?.id];

  const [qte, setQte] = useState(initial?.quantite ?? '');
  const [date, setDate] = useState(initial?.date_peremption ?? '');
  const [editCond, setEditCond] = useState(false);
  const [condValue, setCondValue] = useState('');
  const touchStartX = useRef(0);

  const saveConditionnement = async () => {
    try {
      const fd = new FormData();
      fd.append('conditionnement', condValue);
      await api.patch(`/produits/${produit.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      produit.conditionnement = condValue;
      setEditCond(false);
      toast.success('Conditionnement mis à jour');
    } catch { toast.error('Erreur lors de la mise à jour'); }
  };

  useEffect(() => {
    const l = lignes[produit?.id];
    setQte(l?.quantite ?? '');
    setDate(l?.date_peremption ?? '');
  }, [index, produit?.id]);

  const suivant = () => setIndex(i => Math.min(i + 1, produits.length - 1));
  const precedent = () => setIndex(i => Math.max(i - 1, 0));

  const valider = () => {
    if (qte === '') { toast.error('Saisissez une quantité'); return; }
    onSave(produit.id, qte, date);
    suivant();
  };

  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (diff > 60) precedent();
    else if (diff < -60) suivant();
  };

  if (!produit) return null;

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-end mb-2">
          <button onClick={onClose} className="btn-ghost p-2 flex items-center gap-1 text-sm"><List size={16} /> Vue liste</button>
        </div>
        <p className="text-xs text-gray-500 mb-1">{Object.keys(lignes).length} / {produits.length} produits saisis — {progressCarte}%</p>
        <div className="w-full bg-gray-200 rounded-full h-1.5 mb-2">
          <div className="bg-green-500 h-1.5 rounded-full transition-all" style={{ width: `${progressCarte}%` }} />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-gray-500">Trier par</span>
          <button onClick={() => setTriPar('emplacement')}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${triPar === 'emplacement' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            Emplacement
          </button>
          <button onClick={() => setTriPar('categorie')}
            className={`px-3 py-1 rounded-lg text-xs font-medium ${triPar === 'categorie' ? 'bg-primary-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
            Catégorie
          </button>
        </div>
      </div>

      <div className="flex-1 flex flex-col justify-center px-6">
        <div className="text-center mb-8">
          <p className="text-xl font-bold text-gray-900">{produit.denomination}</p>
          {produit.taille && <p className="text-sm text-gray-400 mt-1">{produit.taille}</p>}
          {editCond ? (
            <div className="flex items-center justify-center gap-2 mt-2">
              <input
                autoFocus
                className="input text-sm text-center w-40"
                value={condValue}
                onChange={e => setCondValue(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && saveConditionnement()}
              />
              <button onClick={saveConditionnement} className="btn-primary py-1.5 px-2 text-xs">OK</button>
              <button onClick={() => setEditCond(false)} className="btn-secondary py-1.5 px-2 text-xs">Annuler</button>
            </div>
          ) : (
            <button onClick={() => { setCondValue(produit.conditionnement || ''); setEditCond(true); }}
              className="flex items-center gap-1.5 mx-auto mt-1 text-sm text-gray-400 hover:text-gray-600">
              {produit.conditionnement || 'Aucun conditionnement'} <Edit2 size={13} />
            </button>
          )}
        </div>

        <div className="space-y-4 max-w-sm mx-auto w-full">
          <div>
            <label className="label">Qté en stock</label>
            <input
              className="input text-center text-2xl py-4"
              type="number" min="0" step="0.5"
              value={qte}
              disabled={disabled}
              onChange={e => setQte(e.target.value)}
              autoFocus
            />
          </div>
          {!produit.sans_peremption && (
            <div>
              <label className="label">Date péremption</label>
              {!disabled && (
                <input
                  type="date"
                  autoFocus
                  className="input text-center mb-2"
                  value={date}
                  onChange={e => setDate(e.target.value)}
                />
              )}
              {!disabled && <WheelDatePicker value={date} onChange={d => { setDate(d); majFormatPeremption(produit, d); }} defaultSansJour={produit.peremption_sans_jour} />}
              {produit.derniere_peremption && (
                <p className="text-xs text-gray-400 mt-2 text-center">Dernière saisie : {new Date(produit.derniere_peremption).toLocaleDateString('fr-FR')}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 p-4 border-t border-gray-100">
        <button onClick={precedent} disabled={index === 0} className="btn-secondary flex-1 disabled:opacity-30">
          <ChevronLeft size={18} /> Précédent
        </button>
        <button onClick={valider} disabled={disabled} className="btn-primary flex-1">
          Valider et suivant <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

function InventaireInput({ produit, initial, disabled, onSave }) {
  const [qte, setQte] = useState(initial?.quantite ?? '');
  const [date, setDate] = useState(initial?.date_peremption ?? '');
  const [dirty, setDirty] = useState(false);
  const [showPicker, setShowPicker] = useState(false);

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
      {!produit.sans_peremption && (
        <div className="relative">
          <label className="label">Date péremption</label>
          <button type="button" disabled={disabled} onClick={() => setShowPicker(p => !p)}
            className="input text-xs text-left">
            {date ? (/^\d{4}-\d{2}$/.test(date) ? new Date(date + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' }) : new Date(date).toLocaleDateString('fr-FR')) : 'Choisir une date'}
          </button>
          {produit.derniere_peremption && (
            <p className="text-xs text-gray-400 mt-1">Dernière saisie : {new Date(produit.derniere_peremption).toLocaleDateString('fr-FR')}</p>
          )}
          {showPicker && (
            <div className="absolute z-20 top-full left-0 mt-1 bg-white rounded-xl shadow-lg border border-gray-200 p-2">
              <input
                type="date"
                autoFocus
                className="input text-xs mb-2"
                value={date}
                onChange={e => setDate(e.target.value)}
              />
              <WheelDatePicker value={date} onChange={d => { setDate(d); majFormatPeremption(produit, d); }} defaultSansJour={produit.peremption_sans_jour} />
              <button
                className="btn-primary w-full mt-2 text-xs py-1.5 flex justify-center"
                onClick={() => { setDirty(true); setShowPicker(false); handleSave(); }}
              >
                Valider
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
