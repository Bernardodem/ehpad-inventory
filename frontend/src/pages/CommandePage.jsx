import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { ShoppingCart, Printer, AlertTriangle, ChevronLeft, ChevronDown, ChevronUp, Plus, X } from 'lucide-react';


function CommandeLibreModal({ onClose, onSaved }) {
  const [recherche, setRecherche] = useState('');
  const [produits, setProduits] = useState([]);
  const [quantites, setQuantites] = useState({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get('/produits').then(r => setProduits(r.data)).catch(() => {});
  }, []);

  const produitsFiltres = recherche.length >= 2
    ? produits.filter(p => p.denomination.toLowerCase().includes(recherche.toLowerCase()))
    : produits;

  const grouped = produitsFiltres.reduce((acc, p) => {
    const cat = p.categorie || 'Sans catégorie';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(p);
    return acc;
  }, {});

  const panier = produits.filter(p => quantites[p.id] > 0);
  const nbProduits = panier.length;

  const valider = async () => {
    if (nbProduits === 0) { toast.error('Saisissez au moins une quantité'); return; }
    setSaving(true);
    try {
      const parFournisseur = panier.reduce((acc, p) => {
        const f = p.fournisseur || 'Sans fournisseur';
        if (!acc[f]) acc[f] = { fournisseur_id: p.fournisseur_id, lignes: [] };
        acc[f].lignes.push({ produit_id: p.id, quantite: quantites[p.id] });
        return acc;
      }, {});
      for (const [, groupe] of Object.entries(parFournisseur)) {
        await api.post('/commandes', { fournisseur_id: groupe.fournisseur_id, inventaire_session_id: null, lignes: groupe.lignes });
      }
      toast.success('Commande(s) créée(s)');
      onSaved();
    } catch { toast.error('Erreur lors de la création'); }
    finally { setSaving(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="font-bold text-gray-900">Commande sans inventaire</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="mb-4 shrink-0">
          <input
            autoFocus
            className="input w-full"
            placeholder="Rechercher un produit..."
            value={recherche}
            onChange={e => setRecherche(e.target.value)}
          />
        </div>
        <div className="flex-1 overflow-y-auto space-y-4">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{cat}</p>
              <div className="bg-gray-50 rounded-xl overflow-hidden">
                {items.map(p => (
                  <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 border-b border-gray-100 last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{p.denomination}{p.taille && <span className="ml-2 badge-gray">{p.taille}</span>}</p>
                      <p className="text-xs text-gray-400">
                        {[p.fournisseur, p.conditionnement, p.dotation ? `Dotation : ${p.dotation}` : null].filter(Boolean).join(' · ')}
                      </p>
                    </div>
                    <input
                      type="number" min="0" step="1"
                      className={`w-20 text-center input text-sm py-1 ${quantites[p.id] > 0 ? 'border-primary-400 bg-primary-50' : ''}`}
                      value={quantites[p.id] || ''}
                      onChange={e => setQuantites(q => ({ ...q, [p.id]: Number(e.target.value) || 0 }))}
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 mt-4 shrink-0">
          <button onClick={valider} disabled={saving || nbProduits === 0} className="btn-primary flex-1 justify-center">
            {saving ? 'Création...' : nbProduits > 0 ? `Valider (${nbProduits} produit${nbProduits > 1 ? 's' : ''})` : 'Valider'}
          </button>
          <button onClick={onClose} className="btn-secondary">Annuler</button>
        </div>
      </div>
    </div>
  );
}

function HistoriqueCommandes({ historique }) {
  const [expanded, setExpanded] = useState({});
  const [confirmSansVerif, setConfirmSansVerif] = useState(null);
  const navigate = useNavigate();

  const receptionnerSansVerif = async (commandeId) => {
    try {
      const { data: detail } = await api.get(`/commandes/${commandeId}`);
      for (const l of detail.lignes) {
        await api.post(`/commandes/${commandeId}/lignes/${l.id}/receptions`, { quantite: l.quantite_commandee });
      }
      await api.patch(`/commandes/${commandeId}/receptionner`, {});
      toast.success('Réception enregistrée — tout reçu');
      setConfirmSansVerif(null);
      window.location.reload();
    } catch { toast.error('Erreur'); }
  };

  const toggleExpand = async (id) => {
    if (expanded[id]) { setExpanded(p => ({ ...p, [id]: null })); return; }
    try {
      const { data } = await api.get(`/commandes/${id}`);
      setExpanded(p => ({ ...p, [id]: data }));
    } catch {}
  };

  if (historique.length === 0) return <div className="card p-10 text-center text-gray-400">Aucune commande passée</div>;

  return (
    <>
    {confirmSansVerif && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
        <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
          <h2 className="font-bold text-gray-900 mb-3">Réception sans vérification</h2>
          <p className="text-sm text-gray-600 mb-5">Les quantités reçues seront considérées égales aux quantités commandées. Cette action est irréversible.</p>
          <div className="flex gap-2">
            <button onClick={() => receptionnerSansVerif(confirmSansVerif)} className="btn-primary flex-1 justify-center">Confirmer</button>
            <button onClick={() => setConfirmSansVerif(null)} className="btn-secondary">Annuler</button>
          </div>
        </div>
      </div>
    )}
    <div className="space-y-3">
      {historique.map(c => (
        <div key={c.id} className="card overflow-hidden">
          <button className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors" onClick={() => toggleExpand(c.id)}>
            <div className="text-left">
              <p className="font-semibold text-sm text-gray-800">{c.fournisseur}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {new Date(c.date_validation).toLocaleDateString('fr-FR')} · {c.nb_lignes} référence{c.nb_lignes > 1 ? 's' : ''}
                {!c.inventaire_session_id && ' · Sans inventaire'}
              </p>
            </div>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              c.status === 'validee' ? 'bg-amber-50 text-amber-700' :
              c.status === 'recue_partielle' ? 'bg-blue-50 text-blue-700' :
              'bg-green-50 text-green-700'
            }`}>
              {c.status === 'validee' ? 'En attente' : c.status === 'recue_partielle' ? 'Reçue partiellement' : 'Reçue'}
            </span>
          </button>
          {c.status === 'recue_partielle' && (
            <div className="px-4 py-2 bg-blue-50 border-t border-blue-100 flex justify-end">
              <button onClick={() => navigate(`/reception?commande=${c.id}`)}
                className="text-xs px-3 py-1.5 rounded-lg border border-blue-200 text-blue-600 hover:bg-blue-100">
                Compléter la réception
              </button>
            </div>
          )}
          {c.status === 'validee' && (
            <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex justify-end gap-2">
              <button onClick={e => { e.stopPropagation(); navigate(`/reception?commande=${c.id}`); }}
                className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-100">
                Réceptionner
              </button>
              <button onClick={e => { e.stopPropagation(); setConfirmSansVerif(c.id); }}
                className="text-xs px-3 py-1.5 rounded-lg border border-amber-200 text-amber-700 hover:bg-amber-50">
                Réception sans vérification
              </button>
            </div>
          )}
          {expanded[c.id] && (
            <table className="w-full text-sm">
              <thead className="border-b border-gray-100 bg-white">
                <tr className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                  <th className="text-left px-4 py-2">Dénomination</th>
                  <th className="text-center px-4 py-2">Commandé</th>
                  {expanded[c.id].lignes.some(l => l.quantite_recue !== null) && <th className="text-center px-4 py-2">Reçu</th>}
                </tr>
              </thead>
              <tbody>
                {expanded[c.id].lignes.map(l => (
                  <tr key={l.id} className="border-b border-gray-50">
                    <td className="px-4 py-2 text-gray-900">{l.denomination}{l.taille && <span className="ml-2 badge-gray">{l.taille}</span>}</td>
                    <td className="px-4 py-2 text-center">{l.quantite_commandee}</td>
                    {expanded[c.id].lignes.some(l => l.quantite_recue !== null) && <td className="px-4 py-2 text-center">{l.quantite_recue ?? '—'}</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ))}
    </div>
    </>
  );
}

export default function CommandePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('');
  const [filterFourn, setFilterFourn] = useState('');
  const [validating, setValidating] = useState(null);
  const [quantitesModifiees, setQuantitesModifiees] = useState({});

  const [commandesExistantes, setCommandesExistantes] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [expandedFourn, setExpandedFourn] = useState({});
  const [showCommandeLibre, setShowCommandeLibre] = useState(false);
  const [sousVue, setSousVue] = useState('encours'); // 'encours' | 'historique'
  const [historique, setHistorique] = useState([]);

  const loadCommandes = (sessionId) => {
    api.get('/commandes').then(r => {
      setCommandesExistantes(r.data.filter(c => c.inventaire_session_id === sessionId));
      setHistorique(r.data);
    });
  };

  useEffect(() => {
    api.get('/inventaire/sessions/recentes').then(r => setSessions(r.data)).catch(() => {});
    api.get('/inventaire/commande')
      .then(r => {
        setData(r.data);
        setSelectedSession(r.data.session_id || null);
        if (r.data.session_id) loadCommandes(r.data.session_id);
      })
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  const chargerSession = async (sessionId) => {
    setSelectedSession(sessionId);
    setLoading(true);
    try {
      const r = await api.get(`/inventaire/commande?session=${sessionId}`);
      setData(r.data);
      loadCommandes(sessionId);
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400">Chargement…</div>;

  if (!data?.session_id) {
    return (
      <div className="space-y-4">
        <div className="card flex flex-col items-center justify-center h-48 text-gray-400 gap-3">
          <AlertTriangle size={32} />
          <p className="font-medium">Aucun inventaire terminé</p>
          <p className="text-sm">Terminez un inventaire pour générer une commande</p>
        </div>
        <div className="flex justify-center">
          <button onClick={() => setShowCommandeLibre(true)} className="btn-primary">
            <Plus size={16} /> Nouvelle commande sans inventaire
          </button>
        </div>
        {showCommandeLibre && <CommandeLibreModal onClose={() => setShowCommandeLibre(false)} onSaved={() => { setShowCommandeLibre(false); loadCommandes(null); }} />}
      </div>
    );
  }

  const lignes = data.lignes.filter(l => {
    const hasCommande = l.qte_a_commander > 0;
    const catMatch = !filterCat || l.categorie === filterCat;
    const fournMatch = !filterFourn || l.fournisseur === filterFourn;
    return hasCommande && catMatch && fournMatch;
  });

  const categories = [...new Set(data.lignes.filter(l => l.qte_a_commander > 0).map(l => l.categorie))].sort();
  const fournisseursDisponibles = [...new Set(data.lignes.filter(l => l.qte_a_commander > 0).map(l => l.fournisseur))].filter(Boolean).sort();

  const grouped = lignes.reduce((acc, l) => {
    const fourn = l.fournisseur || 'Sans fournisseur';
    if (!acc[fourn]) acc[fourn] = [];
    acc[fourn].push(l);
    return acc;
  }, {});

  const totalLignes = lignes.length;
  const peremptionAlert = data.lignes.filter(l => l.date_peremption && new Date(l.date_peremption) < new Date(Date.now() + 30 * 86400000));

  const handlePrint = () => window.print();

  const validerCommande = async (fournisseurNom, items) => {
    const fournisseur_id = items[0]?.fournisseur_id;
    if (!fournisseur_id) { toast.error('Fournisseur introuvable pour ce groupe'); return; }
    setValidating(fournisseurNom);
    try {
      await api.post('/commandes', {
        fournisseur_id,
        inventaire_session_id: data.session_id,
        lignes: items.map(l => ({ produit_id: l.produit_id, quantite: getQuantite(l) })),
      });
      toast.success(`Commande validée pour ${fournisseurNom}`);
      loadCommandes(data.session_id);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Erreur lors de la validation');
    } finally {
      setValidating(null);
    }
  };

  const commandeExistePour = (fournisseurId) => commandesExistantes.find(c => c.fournisseur_id === fournisseurId);

  const toutesValidees = fournisseursDisponibles.length > 0 && fournisseursDisponibles.every(f => {
    const fournisseurId = data?.lignes?.find(l => l.fournisseur === f)?.fournisseur_id;
    return fournisseurId && commandeExistePour(fournisseurId);
  });

  const getQuantite = (l) => quantitesModifiees[l.produit_id] ?? l.qte_a_commander;

  return (
    <div>
      <Link to="/" className="sm:hidden flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
        <ChevronLeft size={16} /> Accueil
      </Link>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            {sousVue === 'historique' ? 'Historique des commandes' :
              toutesValidees ? 'Toutes les commandes validées ✓' : 'Commande à passer'}
          </h1>
          {sousVue === 'encours' && !toutesValidees && (
            <p className="text-sm text-gray-500 mt-0.5">{totalLignes} référence{totalLignes > 1 ? 's' : ''} à commander</p>
          )}
        </div>

      </div>
      <div className="flex gap-1 bg-white rounded-xl p-1 shadow-sm border border-gray-100 mb-4">
        <button onClick={() => setSousVue('encours')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${sousVue === 'encours' ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`} style={sousVue === 'encours' ? { background: '#4A2C2A' } : {}}>À commander</button>
        <button onClick={() => setSousVue('enattente')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${sousVue === 'enattente' ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`} style={sousVue === 'enattente' ? { background: '#4A2C2A' } : {}}>En cours</button>
        <button onClick={() => setSousVue('historique')} className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-all ${sousVue === 'historique' ? 'text-white' : 'text-gray-500 hover:text-gray-700'}`} style={sousVue === 'historique' ? { background: '#4A2C2A' } : {}}>Historique</button>
      </div>

      {sousVue === 'encours' && <div>
      {/* Alertes péremption */}
      {peremptionAlert.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex gap-3">
          <AlertTriangle size={20} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800 text-sm">Péremptions dans moins de 30 jours</p>
            <ul className="text-xs text-amber-700 mt-1 space-y-0.5">
              {peremptionAlert.map(l => (
                <li key={l.produit_id}>{l.denomination} — expire le {new Date(l.date_peremption).toLocaleDateString('fr-FR')}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <div className="flex justify-end mb-2">
        <button onClick={() => setShowCommandeLibre(true)} className="btn-secondary text-sm">
          <Plus size={15} /> Commande sans inventaire
        </button>
      </div>
      {showCommandeLibre && <CommandeLibreModal onClose={() => setShowCommandeLibre(false)} onSaved={() => { setShowCommandeLibre(false); loadCommandes(selectedSession); }} />}

      {/* Sélecteur d'inventaire */}
      {sessions.length > 1 && (
        <div className="mb-4 flex gap-2 flex-wrap items-center">
          <label className="text-sm text-gray-500">Inventaire :</label>
          <select className="input w-auto" value={selectedSession || ''} onChange={e => chargerSession(e.target.value)}>
            {sessions.map(s => (
              <option key={s.id} value={s.id}>
                {s.label} — {new Date(s.finished_at).toLocaleDateString('fr-FR')}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Filtres */}
      <div className="mb-4 flex gap-2 flex-wrap">
        <select className="input w-auto" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">Toutes catégories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="input w-auto" value={filterFourn} onChange={e => setFilterFourn(e.target.value)}>
          <option value="">Tous fournisseurs</option>
          {fournisseursDisponibles.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <ShoppingCart size={32} className="mx-auto mb-2" />
          <p>Aucune commande à passer pour cette sélection</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).filter(([fourn, items]) => {
            const fournisseurId = items[0]?.fournisseur_id;
            return !commandeExistePour(fournisseurId);
          }).map(([fourn, items]) => {
            const fournisseurId = items[0]?.fournisseur_id;
            const commande = commandeExistePour(fournisseurId);
            const isExpanded = expandedFourn[fourn];
            return (
            <div key={fourn} className="card overflow-hidden">
              <button className="w-full px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors" onClick={() => setExpandedFourn(p => ({ ...p, [fourn]: !p[fourn] }))}>
                <h2 className="font-bold text-sm text-gray-700 uppercase tracking-wide">{fourn}</h2>
                <div className="flex items-center gap-2">
                  {commande ? (
                    <span className="badge-green text-xs px-3 py-1.5">✓ Validée le {new Date(commande.date_validation).toLocaleDateString('fr-FR')}</span>
                  ) : (
                    <button
                      className="btn-primary text-xs py-1.5 px-3"
                      disabled={validating === fourn}
                      onClick={e => { e.stopPropagation(); validerCommande(fourn, items); }}
                    >
                      {validating === fourn ? 'Validation...' : 'Valider la commande'}
                    </button>
                  )}
                  {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                </div>
              </button>
              {isExpanded && <table className="w-full text-sm">
                <thead className="border-b border-gray-100">
                  <tr className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                    <th className="text-left px-4 py-2">Dénomination</th>
                    <th className="text-left px-4 py-2 hidden sm:table-cell">Réf. fournisseur</th>
                    <th className="text-left px-4 py-2 hidden md:table-cell">Fournisseur</th>
                    <th className="text-left px-4 py-2 hidden sm:table-cell">Conditionnement</th>
                    <th className="text-center px-4 py-2">Stock actuel</th>
                    <th className="text-center px-4 py-2">Dotation</th>
                    <th className="text-center px-4 py-2 bg-blue-50 font-bold text-blue-700">À commander</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(l => (
                    <tr key={l.produit_id} className="table-row">
                      <td className="px-4 py-3 font-medium text-gray-900">
                        {l.denomination}
                        {l.taille && <span className="ml-2 badge-gray">{l.taille}</span>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 font-mono text-xs hidden sm:table-cell">{l.ref_fournisseur || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 hidden md:table-cell">{l.fournisseur || '—'}</td>
                      <td className="px-4 py-3 text-gray-500 hidden sm:table-cell">{l.conditionnement || '—'}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`badge ${l.stock_actuel === null ? 'badge-gray' : l.stock_actuel === 0 ? 'badge-red' : 'badge-yellow'}`}>
                          {l.stock_actuel ?? 'N/S'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-gray-500">{l.dotation}</td>
                      <td className="px-4 py-3 text-center bg-blue-50">
                        <input
                          type="number" min="0" step="1"
                          className="w-20 text-center text-lg font-bold text-blue-700 bg-blue-50 rounded-lg border border-blue-200 py-1"
                          value={getQuantite(l)}
                          disabled={!!commande}
                          onChange={e => setQuantitesModifiees(p => ({ ...p, [l.produit_id]: e.target.value === '' ? '' : Number(e.target.value) }))}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>}
            </div>
            );
          })}
        </div>
      )}
      </div>}

      {sousVue === 'enattente' && (
        <div className="space-y-3">
          {historique.filter(c => c.status === 'validee').length === 0 ? (
            <div className="card p-10 text-center text-gray-400">Aucune commande en attente de réception</div>
          ) : (
            <HistoriqueCommandes historique={historique.filter(c => c.status === 'validee')} />
          )}
        </div>
      )}

      {sousVue === 'historique' && (
        <HistoriqueCommandes historique={historique.filter(c => c.status !== 'validee')} />
      )}

    </div>
  );
}
