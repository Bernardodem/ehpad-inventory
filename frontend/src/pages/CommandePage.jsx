import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { ShoppingCart, Printer, AlertTriangle } from 'lucide-react';

export default function CommandePage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filterCat, setFilterCat] = useState('');

  useEffect(() => {
    api.get('/inventaire/commande')
      .then(r => setData(r.data))
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
    return hasCommande && catMatch;
  });

  const categories = [...new Set(data.lignes.filter(l => l.qte_a_commander > 0).map(l => l.categorie))].sort();

  const grouped = lignes.reduce((acc, l) => {
    const cat = l.categorie || 'Sans catégorie';
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(l);
    return acc;
  }, {});

  const totalLignes = lignes.length;
  const peremptionAlert = data.lignes.filter(l => l.date_peremption && new Date(l.date_peremption) < new Date(Date.now() + 30 * 86400000));

  const handlePrint = () => window.print();

  return (
    <div>
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

      {/* Filtre */}
      <div className="mb-4">
        <select className="input w-auto" value={filterCat} onChange={e => setFilterCat(e.target.value)}>
          <option value="">Toutes catégories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {Object.keys(grouped).length === 0 ? (
        <div className="card p-10 text-center text-gray-400">
          <ShoppingCart size={32} className="mx-auto mb-2" />
          <p>Aucune commande à passer pour cette sélection</p>
        </div>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="card overflow-hidden">
              <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="font-bold text-sm text-gray-700 uppercase tracking-wide">{cat}</h2>
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
                        <span className="text-lg font-bold text-blue-700">{l.qte_a_commander}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
