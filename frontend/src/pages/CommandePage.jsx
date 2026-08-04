import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { ShoppingCart, Printer, AlertTriangle, ChevronLeft } from 'lucide-react';

export default function CommandePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('');
  const [filterFourn, setFilterFourn] = useState('');
  const [validating, setValidating] = useState(null);
  const [quantitesModifiees, setQuantitesModifiees] = useState({});

  const [commandesExistantes, setCommandesExistantes] = useState([]);

  const loadCommandes = (sessionId) => {
    api.get('/commandes').then(r => {
      setCommandesExistantes(r.data.filter(c => c.inventaire_session_id === sessionId));
    });
  };

  useEffect(() => {
    api.get('/inventaire/commande')
      .then(r => {
        setData(r.data);
        if (r.data.session_id) loadCommandes(r.data.session_id);
      })
      .catch(() => toast.error('Erreur de chargement'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400">Chargement…</div>;

  if (!data?.session_id) {
    return (
      <div className="card flex flex-col items-center justify-center h-64 text-gray-400 gap-3">
        <AlertTriangle size={32} />
        <p className="font-medium">Aucun inventaire terminé</p>
        <p className="text-sm">Terminez un inventaire pour générer une commande</p>
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

  const getQuantite = (l) => quantitesModifiees[l.produit_id] ?? l.qte_a_commander;

  return (
    <div>
      <Link to="/" className="sm:hidden flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-3">
        <ChevronLeft size={16} /> Accueil
      </Link>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Commande à passer</h1>
          <p className="text-sm text-gray-500 mt-0.5">{totalLignes} référence{totalLignes > 1 ? 's' : ''} à commander</p>
        </div>
        <button className="btn-secondary" onClick={handlePrint}><Printer size={16} /> Imprimer</button>
      </div>

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
          {Object.entries(grouped).map(([fourn, items]) => {
            const fournisseurId = items[0]?.fournisseur_id;
            const commande = commandeExistePour(fournisseurId);
            return (
            <div key={fourn} className="card overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <h2 className="font-bold text-sm text-gray-700 uppercase tracking-wide">{fourn}</h2>
                {commande ? (
                  <span className="badge-green text-xs px-3 py-1.5">✓ Commande validée</span>
                ) : (
                  <button
                    className="btn-primary text-xs py-1.5 px-3"
                    disabled={validating === fourn}
                    onClick={() => validerCommande(fourn, items)}
                  >
                    {validating === fourn ? 'Validation...' : 'Valider la commande'}
                  </button>
                )}
              </div>
              <table className="w-full text-sm">
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
              </table>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
