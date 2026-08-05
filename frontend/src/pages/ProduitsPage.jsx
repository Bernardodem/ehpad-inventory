import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Search, X, Edit2, Save, Upload, MapPin, Package, Plus, Trash2, ArrowLeft } from 'lucide-react';

const ETAGERES = ['A', 'B', 'C'];
const ETAGES = [1, 2, 3, 4, 5];

function Field({ label, field, type = 'text', options, editing, form, set }) {
  return (
    <div>
      <label className="label">{label}</label>
      {editing ? (
        options ? (
          <select className="input" value={form[field] || ''} onChange={e => set(field, e.target.value)}>
            <option value="">—</option>
            {options.map(o => <option key={o.id || o} value={o.id || o}>{o.name || o}</option>)}
          </select>
        ) : (
          <input className="input" type={type} value={form[field] || ''} onChange={e => set(field, e.target.value)} />
        )
      ) : (
        <p className="text-sm text-gray-900 py-2 border-b border-gray-100">{form[field] || <span className="text-gray-400 italic">Non renseigné</span>}</p>
      )}
    </div>
  );
}


function FicheProduit({ produit, categories, fournisseurs, etageres, niveaux, emplacementsList, lieux, onClose, canEdit, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...produit });
  const [photoFile, setPhotoFile] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => { setForm({ ...produit }); }, [produit]);
  const [loading, setLoading] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [showEmplacementsConfig, setShowEmplacementsConfig] = useState(false);
  const fileRef = useRef();
  const [lieuxProduit, setLieuxProduit] = useState({});
  const [etageresParLieu, setEtageresParLieu] = useState({});
  const [niveauxParLieu, setNiveauxParLieu] = useState({});
  const [emplacementsParLieu, setEmplacementsParLieu] = useState({});

  const loadEmplacementsLieu = async (lieuId) => {
    if (etageresParLieu[lieuId]) return; // Déjà chargé
    const [et, niv, emp] = await Promise.all([
      api.get(`/emplacements-config/etageres?lieu_id=${lieuId}`),
      api.get(`/emplacements-config/niveaux?lieu_id=${lieuId}`),
      api.get(`/emplacements-config/emplacements?lieu_id=${lieuId}`),
    ]);
    setEtageresParLieu(p => ({ ...p, [lieuId]: et.data }));
    setNiveauxParLieu(p => ({ ...p, [lieuId]: niv.data }));
    setEmplacementsParLieu(p => ({ ...p, [lieuId]: emp.data }));
  }; // { lieuId: { produit_lieu_id, emplacement_etagere, emplacement_etage, emplacement } }

  useEffect(() => {
    if (!lieux || !lieux.length) return;
    Promise.all(lieux.map(l => api.get(`/lieux/${l.id}/produits`).then(r => ({ lieuId: l.id, produits: r.data }))))
      .then(results => {
        const map = {};
        const lieuxActifs = [];
        results.forEach(r => {
          const pl = r.produits.find(p => p.id === produit.id);
          if (pl) { map[r.lieuId] = { produit_lieu_id: pl.produit_lieu_id, emplacement_etagere: pl.emplacement_etagere || '', emplacement_etage: pl.emplacement_etage || '', emplacement: pl.emplacement || '' }; lieuxActifs.push(r.lieuId); }
        });
        setLieuxProduit(map);
        lieuxActifs.forEach(lid => loadEmplacementsLieu(lid));
      });
  }, [produit.id, lieux]);

  const toggleLieu = async (lieuId) => {
    const estDedans = !!lieuxProduit[lieuId];
    try {
      if (estDedans) {
        await api.delete(`/lieux/${lieuId}/produits/${lieuxProduit[lieuId].produit_lieu_id}`);
        setLieuxProduit(p => { const n = { ...p }; delete n[lieuId]; return n; });
      } else {
        await api.post(`/lieux/${lieuId}/produits`, { produit_id: produit.id });
        const { data } = await api.get(`/lieux/${lieuId}/produits`);
        const pl = data.find(p => p.id === produit.id);
        setLieuxProduit(p => ({ ...p, [lieuId]: { produit_lieu_id: pl.produit_lieu_id, emplacement_etagere: '', emplacement_etage: '', emplacement: '' } }));
        await loadEmplacementsLieu(lieuId);
      }
    } catch { toast.error('Erreur'); }
  };

  const saveEmplacementLieu = async (lieuId, field, value) => {
    const current = lieuxProduit[lieuId] || {};
    const updated = { ...current, [field]: value };
    setLieuxProduit(p => ({ ...p, [lieuId]: updated }));
    try {
      await api.post(`/lieux/${lieuId}/produits`, {
        produit_id: produit.id,
        emplacement_etagere: updated.emplacement_etagere || null,
        emplacement_etage: updated.emplacement_etage || null,
        emplacement: updated.emplacement || null,
      });
    } catch { toast.error('Erreur de sauvegarde'); }
  };

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setLoading(true);
    try {
      const fd = new FormData();
      Object.entries(form).forEach(([k, v]) => {
        if (v !== null && v !== undefined && k !== 'categorie' && k !== 'fournisseur') fd.append(k, v);
      });
      if (photoFile) fd.append('photo', photoFile);
      await api.patch(`/produits/${produit.id}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      // Sauvegarde les emplacements par lieu
      for (const [lieuId, emp] of Object.entries(lieuxProduit)) {
        await api.post(`/lieux/${lieuId}/produits`, {
          produit_id: produit.id,
          emplacement_etagere: emp.emplacement_etagere || null,
          emplacement_etage: emp.emplacement_etage || null,
          emplacement: emp.emplacement || null,
        });
      }
      toast.success('Produit mis à jour');
      setEditing(false);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };


  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-lg text-gray-900">{produit.denomination}</h2>
            {produit.taille && <p className="text-sm text-gray-500">Taille : {produit.taille}</p>}
          </div>
          <div className="flex gap-2">
           {canEdit && !editing && (
  <>
    <button className="btn-secondary" onClick={() => setEditing(true)}><Edit2 size={15} /> Modifier</button>
    <button className="btn-danger" onClick={async () => {
      if (!window.confirm('Archiver ce produit ? Il n\'apparaîtra plus dans le catalogue.')) return;
      try {
        await api.delete(`/produits/${produit.id}`);
        toast.success('Produit archivé');
        onSaved();
        onClose();
      } catch { toast.error('Erreur'); }
    }}>Archiver</button>
  </>
)}
            {editing && (
              <>
                <button className="btn-secondary" onClick={() => { setEditing(false); setForm({ ...produit }); }}>Annuler</button>
                <button className="btn-primary" onClick={save} disabled={loading}><Save size={15} /> {loading ? 'Enregistrement…' : 'Enregistrer'}</button>
              </>
            )}
            <button className="btn-ghost p-2" onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-5 grid sm:grid-cols-2 gap-4">
          {/* Photo */}
          <div className="sm:col-span-2 flex items-start gap-4">
            <div className="w-24 h-24 rounded-xl bg-gray-100 flex items-center justify-center overflow-hidden flex-shrink-0 border border-gray-200">
              {(photoFile ? URL.createObjectURL(photoFile) : produit.photo_url) ? (
                <img src={photoFile ? URL.createObjectURL(photoFile) : produit.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <Package size={32} className="text-gray-300" />
              )}
            </div>
            {editing && (
              <div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => setPhotoFile(e.target.files[0])} />
                <button className="btn-secondary text-xs" onClick={() => fileRef.current.click()}><Upload size={14} /> Changer la photo</button>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG — max 5 Mo</p>
              </div>
            )}
          </div>

          <Field label="Dénomination" field="denomination" editing={editing} form={form} set={set} />
          <Field label="Taille / Référence" field="taille" editing={editing} form={form} set={set} />
          <Field label="Catégorie" field="categorie_id" options={categories} editing={editing} form={form} set={set} />
          <Field label="Fournisseur" field="fournisseur_id" options={fournisseurs} editing={editing} form={form} set={set} />
          <Field label="Réf. fournisseur" field="ref_fournisseur" editing={editing} form={form} set={set} />
          <Field label="Conditionnement" field="conditionnement" editing={editing} form={form} set={set} />
          <Field label="Prix (€)" field="prix" type="number" editing={editing} form={form} set={set} />
          <Field label="Dotation" field="dotation" type="number" editing={editing} form={form} set={set} />
          <div>
            <label className="label">Péremption</label>
            {editing ? (
              <label className="flex items-center gap-2 py-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={!!form.sans_peremption} onChange={e => set('sans_peremption', e.target.checked)} className="w-4 h-4 accent-primary-600" />
                Ce produit n'a pas de date de péremption
              </label>
            ) : (
              <div className="py-2">
                <span className="text-sm text-gray-900">{form.sans_peremption ? "Ce produit n'a pas de date de péremption" : 'Ce produit a une date de péremption'}</span>
              </div>
            )}
          </div>
          <div>
            <label className="label">Format de péremption</label>
            {editing ? (
              <label className={`flex items-center gap-2 py-2 text-sm ${form.sans_peremption ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 cursor-pointer'}`}>
                <input type="checkbox" disabled={!!form.sans_peremption} checked={!!form.peremption_sans_jour} onChange={e => set('peremption_sans_jour', e.target.checked)} className="w-4 h-4 accent-primary-600" />
                Dates de péremption au format mois/année
              </label>
            ) : (
              <div className="py-2">
                {form.sans_peremption ? (
                  <span className="text-sm text-gray-400">—</span>
                ) : form.peremption_sans_jour ? (
                  <span className="text-sm text-gray-900">Dates de péremption au format mois/année</span>
                ) : (
                  <span className="text-sm text-gray-400 italic">Format classique (jour précis)</span>
                )}
              </div>
            )}
          </div>

          <Field label="Seuil de commande" field="seuil_commande" editing={editing} form={form} set={set} />
          <Field label="Consommation mensuelle" field="consommation_mensuelle" type="number" editing={editing} form={form} set={set} />

          {/* Lieux de stockage avec emplacement par lieu */}
          <div className="sm:col-span-2">
            <label className="label"><MapPin size={12} className="inline mr-1" />Lieux de stockage</label>
            <div className="space-y-3 py-2">
              {lieux.map(l => {
                const actif = !!lieuxProduit[l.id];
                const emp = lieuxProduit[l.id] || {};
                return (
                  <div key={l.id} className={`rounded-xl border p-3 transition-colors ${actif ? 'border-primary-200 bg-primary-50' : 'border-gray-200'}`}>
                    <div className="flex items-center gap-2 flex-wrap w-full">
                      <button type="button" disabled={!editing} onClick={() => editing && toggleLieu(l.id)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium border transition-colors shrink-0 ${actif ? 'border-primary-400 bg-white text-primary-700' : 'border-gray-200 text-gray-500'} ${!editing ? 'opacity-50 pointer-events-none' : ''}`}>
                        {actif ? '✓ ' : ''}{l.name}
                      </button>
                      {actif && <>
                        <select className={`input text-sm py-1 flex-1 ${!editing ? 'opacity-50 pointer-events-none' : ''}`} value={emp.emplacement_etagere || ''} disabled={!editing}
                          onChange={e => { setLieuxProduit(p => ({ ...p, [l.id]: { ...p[l.id], emplacement_etagere: e.target.value } })); loadEmplacementsLieu(l.id); }}>
                          <option value="">Étagère —</option>
                          {(etageresParLieu[l.id] || etageres).map(e => <option key={e.id} value={e.name}>Étagère {e.name}</option>)}
                        </select>
                        <select className={`input text-sm py-1 flex-1 ${!editing ? 'opacity-50 pointer-events-none' : ''}`} value={emp.emplacement_etage || ''} disabled={!editing}
                          onChange={e => setLieuxProduit(p => ({ ...p, [l.id]: { ...p[l.id], emplacement_etage: e.target.value } }))}>
                          <option value="">Niveau —</option>
                          {(niveauxParLieu[l.id] || niveaux).map(n => <option key={n.id} value={n.name}>Niveau {n.name}</option>)}
                        </select>
                        <select className={`input text-sm py-1 flex-1 ${!editing ? 'opacity-50 pointer-events-none' : ''}`} value={emp.emplacement || ''} disabled={!editing}
                          onChange={e => setLieuxProduit(p => ({ ...p, [l.id]: { ...p[l.id], emplacement: e.target.value } }))}>
                          <option value="">Emplacement —</option>
                          {(emplacementsParLieu[l.id] || emplacementsList).map(em => <option key={em.id} value={em.name}>{em.name}</option>)}
                        </select>
                      </>}
                    </div>
                  </div>
                );
              })}
              {lieux.length === 0 && <p className="text-sm text-gray-400 italic">Aucun lieu configuré</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ProduitsPage() {
  const { can } = useAuth();
  const [produits, setProduits] = useState([]);
  const [categories, setCategories] = useState([]);
  const [fournisseurs, setFournisseurs] = useState([]);
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [showEmplacementsConfig, setShowEmplacementsConfig] = useState(false);
  const [lieux, setLieux] = useState([]);
  const [etageres, setEtageres] = useState([]);
  const [niveaux, setNiveaux] = useState([]);
  const [emplacementsList, setEmplacementsList] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (catFilter) params.categorie = catFilter;
      const [p, c, f, et, niv, emp] = await Promise.all([
        api.get('/produits', { params }),
        api.get('/produits/categories'),
        api.get('/produits/fournisseurs'),
        api.get('/emplacements-config/etageres'),
        api.get('/emplacements-config/niveaux'),
        api.get('/emplacements-config/emplacements'),
      ]);
      setProduits(p.data);
      setCategories(c.data);
      setFournisseurs(f.data);
      setEtageres(et.data);
      setNiveaux(niv.data);
      setEmplacementsList(emp.data);
      api.get('/lieux').then(r => setLieux(r.data)).catch(() => {});
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, catFilter]);

  // Group by category
  const grouped = produits.reduce((acc, p) => {
    const cat = p.categorie || 'Sans catégorie';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  return (
    <div>
      <Link to="/" className="sm:hidden flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
        <ArrowLeft size={16} /> Accueil
      </Link>
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <h1 className="text-xl font-bold text-gray-900 mr-auto">Catalogue produits</h1>
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input className="input pl-9 w-64" placeholder="Rechercher…" value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="input w-auto" value={catFilter} onChange={e => setCatFilter(e.target.value)}>
          <option value="">Toutes catégories</option>
          {categories.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48 text-gray-400">Chargement…</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-2 ml-1">{cat} ({items.length})</h2>
              <div className="card overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600">Dénomination</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600 hidden sm:table-cell">Conditionnement</th>
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600 hidden md:table-cell">Fournisseur</th>
                      <th className="text-center px-4 py-2.5 font-semibold text-gray-600">Dotation</th>

                    </tr>
                  </thead>
                  <tbody>
                    {items.map(p => (
                      <tr key={p.id} className="table-row cursor-pointer" onClick={() => setSelected(p)}>
                        <td className="px-4 py-2.5">
                          <span className="font-medium text-gray-900">{p.denomination}</span>
                          {p.taille && <span className="ml-2 badge-gray">{p.taille}</span>}
                        </td>
                        <td className="px-4 py-2.5 text-gray-500 hidden sm:table-cell">{p.conditionnement || '—'}</td>
                        <td className="px-4 py-2.5 text-gray-500 hidden md:table-cell">{p.fournisseur || '—'}</td>
                        <td className="px-4 py-2.5 text-center">
                          {p.dotation ? <span className="badge-blue">{p.dotation}</span> : <span className="text-gray-300">—</span>}
                        </td>

                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          {Object.keys(grouped).length === 0 && (
            <div className="text-center py-16 text-gray-400">Aucun produit trouvé</div>
          )}
        </div>
      )}



{can('gestionnaire', 'admin') && (
  <button className="btn-primary fixed bottom-6 right-6 shadow-lg w-44 justify-center" onClick={() => setShowAdd(true)}>
    <Plus size={16} /> Nouveau produit
  </button>
)}

{showAdd && (
  <AddProduitModal
    categories={categories}
    fournisseurs={fournisseurs}
    onClose={() => setShowAdd(false)}
    onSaved={() => { load(); setShowAdd(false); }}
  />
)}

      {selected && (
        <FicheProduit
          produit={selected}
          categories={categories}
          fournisseurs={fournisseurs}
          etageres={etageres}
          niveaux={niveaux}
          emplacementsList={emplacementsList}
          lieux={lieux}
          canEdit={can('gestionnaire', 'admin')}
          onClose={() => setSelected(null)}
          onSaved={() => { load(); setSelected(null); }}
        />
      )}
    </div>
  );
}

function AddProduitModal({ categories, fournisseurs, onClose, onSaved }) {
  const [form, setForm] = useState({ denomination: '', taille: '', categorie_id: '', fournisseur_id: '', conditionnement: '', dotation: '', seuil_commande: '', prix: '', sans_peremption: false });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    if (!form.denomination) return toast.error('Dénomination requise');
    setLoading(true);
    try {
      await api.post('/produits', form);
      toast.success('Produit ajouté');
      onSaved();
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
    finally { setLoading(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900">Nouveau produit</h2>
          <button className="btn-ghost p-1.5" onClick={onClose}><X size={18} /></button>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2"><label className="label">Dénomination *</label><input className="input" value={form.denomination} onChange={e => set('denomination', e.target.value)} /></div>
          <div><label className="label">Taille</label><input className="input" value={form.taille} onChange={e => set('taille', e.target.value)} /></div>
          <div><label className="label">Catégorie</label>
            <select className="input" value={form.categorie_id} onChange={e => set('categorie_id', e.target.value)}>
              <option value="">—</option>
              {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label className="label">Fournisseur</label>
            <select className="input" value={form.fournisseur_id} onChange={e => set('fournisseur_id', e.target.value)}>
              <option value="">—</option>
              {fournisseurs.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
            </select>
          </div>
          <div><label className="label">Conditionnement</label><input className="input" value={form.conditionnement} onChange={e => set('conditionnement', e.target.value)} /></div>
          <div><label className="label">Dotation</label><input className="input" type="number" value={form.dotation} onChange={e => set('dotation', e.target.value)} /></div>
          <div className="col-span-2">
            <label className="flex items-center gap-2 py-2 text-sm text-gray-700 cursor-pointer">
              <input type="checkbox" checked={!!form.sans_peremption} onChange={e => set('sans_peremption', e.target.checked)} className="w-4 h-4 accent-primary-600" />
              Ce produit n'a pas de date de péremption
            </label>
          </div>
          <div className="col-span-2">
            <label className={`flex items-center gap-2 py-2 text-sm ${form.sans_peremption ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 cursor-pointer'}`}>
              <input type="checkbox" disabled={!!form.sans_peremption} checked={!!form.peremption_sans_jour} onChange={e => set('peremption_sans_jour', e.target.checked)} className="w-4 h-4 accent-primary-600" />
              Dates de péremption au format mois/année
            </label>
          </div>
          <div><label className="label">Seuil de commande</label><input className="input" value={form.seuil_commande} onChange={e => set('seuil_commande', e.target.value)} /></div>
          <div><label className="label">Prix (€)</label><input className="input" type="number" value={form.prix} onChange={e => set('prix', e.target.value)} /></div>
        </div>
        <div className="flex gap-2 mt-5">
          <button className="btn-primary" onClick={save} disabled={loading}><Save size={15} />{loading ? 'Enregistrement…' : 'Ajouter'}</button>
          <button className="btn-secondary" onClick={onClose}>Annuler</button>
        </div>
      </div>
    </div>
  );
}