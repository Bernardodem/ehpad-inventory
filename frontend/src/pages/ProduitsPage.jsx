import { useState, useEffect, useRef } from 'react';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { Search, X, Edit2, Save, Upload, MapPin, Package, Plus } from 'lucide-react';

const ETAGERES = ['A', 'B', 'C'];
const ETAGES = [1, 2, 3, 4, 5];

function FicheProduit({ produit, categories, fournisseurs, onClose, canEdit, onSaved }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...produit });
  const [photoFile, setPhotoFile] = useState(null);
  const [loading, setLoading] = useState(false);
const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const fileRef = useRef();

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
      toast.success('Produit mis à jour');
      setEditing(false);
      onSaved();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la sauvegarde');
    } finally {
      setLoading(false);
    }
  };

  const Field = ({ label, field, type = 'text', options }) => (
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

          <Field label="Dénomination" field="denomination" />
          <Field label="Taille / Référence" field="taille" />
          <Field label="Catégorie" field="categorie_id" options={categories} />
          <Field label="Fournisseur" field="fournisseur_id" options={fournisseurs} />
          <Field label="Réf. fournisseur" field="ref_fournisseur" />
          <Field label="Conditionnement" field="conditionnement" />
          <Field label="Prix (€)" field="prix" type="number" />
          <Field label="Dotation" field="dotation" type="number" />
          <Field label="Seuil de commande" field="seuil_commande" />
          <Field label="Consommation mensuelle" field="consommation_mensuelle" type="number" />

          {/* Emplacement */}
          <div className="sm:col-span-2">
            <label className="label"><MapPin size={12} className="inline mr-1" />Emplacement réserve</label>
            {editing ? (
              <div className="flex gap-3">
                <select className="input" value={form.emplacement_etagere || ''} onChange={e => set('emplacement_etagere', e.target.value)}>
                  <option value="">Étagère —</option>
                  {ETAGERES.map(e => <option key={e} value={e}>Étagère {e}</option>)}
                </select>
                <select className="input" value={form.emplacement_etage || ''} onChange={e => set('emplacement_etage', e.target.value)}>
                  <option value="">Niveau —</option>
                  {ETAGES.map(n => <option key={n} value={n}>Niveau {n}</option>)}
                </select>
              </div>
            ) : (
              <p className="text-sm text-gray-900 py-2 border-b border-gray-100">
                {form.emplacement_etagere && form.emplacement_etage
                  ? `Étagère ${form.emplacement_etagere} — Niveau ${form.emplacement_etage}`
                  : <span className="text-gray-400 italic">Non renseigné</span>}
              </p>
            )}
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

  const load = async () => {
    setLoading(true);
    try {
      const params = {};
      if (search) params.search = search;
      if (catFilter) params.categorie = catFilter;
      const [p, c, f] = await Promise.all([
        api.get('/produits', { params }),
        api.get('/produits/categories'),
        api.get('/produits/fournisseurs'),
      ]);
      setProduits(p.data);
      setCategories(c.data);
      setFournisseurs(f.data);
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
                      <th className="text-left px-4 py-2.5 font-semibold text-gray-600 hidden lg:table-cell">Emplacement</th>
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
                        <td className="px-4 py-2.5 text-gray-500 hidden lg:table-cell">
                          {p.emplacement_etagere ? `Ét. ${p.emplacement_etagere} / N${p.emplacement_etage}` : '—'}
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

<button className="btn-primary fixed bottom-6 right-6 shadow-lg" onClick={() => setShowAdd(true)}>
  <Plus size={16} /> Nouveau produit
</button>

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
          canEdit={can('gestionnaire', 'admin')}
          onClose={() => setSelected(null)}
          onSaved={() => { load(); setSelected(null); }}
        />
      )}
    </div>
  );
}

function AddProduitModal({ categories, fournisseurs, onClose, onSaved }) {
  const [form, setForm] = useState({ denomination: '', taille: '', categorie_id: '', fournisseur_id: '', conditionnement: '', dotation: '', seuil_commande: '', prix: '' });
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