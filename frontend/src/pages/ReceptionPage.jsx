import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import toast from 'react-hot-toast';
import { Package, CheckCircle, ChevronDown, ChevronUp } from 'lucide-react';
import Footer from '../components/Footer';

export default function ReceptionPage() {
  const [commandes, setCommandes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState({});
  const [quantites, setQuantites] = useState({});
  const [saving, setSaving] = useState(null);
  const [searchParams, setSearchParams] = useSearchParams();

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/commandes');
      const commandeId = searchParams.get('commande');
      const enAttente = data.filter(c => c.status === 'validee' || (commandeId && c.id === commandeId && c.status === 'recue_partielle'));
      setCommandes(enAttente);
      if (commandeId) {
        const cible = enAttente.find(c => c.id === commandeId);
        if (cible) setTimeout(() => toggleExpand(commandeId), 300);
      }
    } catch { toast.error('Erreur de chargement'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleExpand = async (id) => {
    if (expanded[id]) {
      setExpanded(p => ({ ...p, [id]: null }));
      return;
    }
    try {
      const { data } = await api.get(`/commandes/${id}`);
      setExpanded(p => ({ ...p, [id]: data }));
      const init = {};
      for (const l of data.lignes) {
        init[l.id] = l.quantite_recue !== null ? l.quantite_recue : l.quantite_commandee;
      }
      setQuantites(p => ({ ...p, ...init }));
    } catch { toast.error('Erreur de chargement des lignes'); }
  };

  const ajouterReception = async (commandeId, ligneId) => {
    const qte = quantites[ligneId];
    if (!qte || Number(qte) <= 0) { toast.error('Saisissez une quantité'); return; }
    try {
      await api.post(`/commandes/${commandeId}/lignes/${ligneId}/receptions`, { quantite: Number(qte) });
      setQuantites(p => ({ ...p, [ligneId]: '' }));
      const { data } = await api.get(`/commandes/${commandeId}`);
      setExpanded(p => ({ ...p, [commandeId]: data }));
      toast.success('Réception enregistrée');
    } catch { toast.error("Erreur lors de l'enregistrement"); }
  };

  const finaliserReception = async (commandeId, force = false) => {
    const commande = expanded[commandeId];
    if (!force) {
      const depassements = commande.lignes.filter(l => {
        const qteNouvelle = Number(quantites[l.id] || 0);
        const dejaRecue = l.quantite_recue ?? 0;
        return (dejaRecue + qteNouvelle) > l.quantite_commandee;
      });
      if (depassements.length > 0) {
        const noms = depassements.map(l => l.denomination).join(', ');
        if (!window.confirm(`Attention : la quantité reçue dépasse la quantité commandée pour : ${noms}.\n\nConfirmer quand même ?`)) return;
      }
    }
    setSaving(commandeId);
    try {
      for (const l of commande.lignes) {
        const qte = quantites[l.id];
        if (qte && Number(qte) > 0) {
          await api.post(`/commandes/${commandeId}/lignes/${l.id}/receptions`, { quantite: Number(qte) });
        }
      }
      const { data } = await api.patch(`/commandes/${commandeId}/receptionner`, {});
      toast.success(`Réception finalisée — ${data.status === 'recue' ? 'Reçue complètement' : 'Reçue partiellement'}`);
      setExpanded(p => ({ ...p, [commandeId]: null }));
      setQuantites(p => { const n = { ...p }; Object.keys(n).forEach(k => delete n[k]); return n; });
      setSearchParams({}, { replace: true });
      // Recharge sans tenir compte du parametre URL qui vient d'etre efface
      const { data: listeCommandes } = await api.get('/commandes');
      setCommandes(listeCommandes.filter(c => c.status === 'validee'));
    } catch { toast.error('Erreur lors de la finalisation'); }
    finally { setSaving(null); }
  };

  if (loading) return <div className="flex items-center justify-center h-48 text-gray-400">Chargement…</div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Réception de commandes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {commandes.length === 0 ? 'Aucune commande en attente de réception' : `${commandes.length} commande${commandes.length > 1 ? 's' : ''} en attente`}
          </p>
        </div>
      </div>

      {commandes.length === 0 ? (
        <div className="card p-10 text-center text-gray-400 flex flex-col items-center gap-3">
          <CheckCircle size={32} className="text-green-400" />
          <p className="font-medium">Toutes les commandes ont été réceptionnées</p>
        </div>
      ) : (
        <div className="space-y-4">
          {commandes.map(c => (
            <div key={c.id} className="card overflow-hidden">
              <button
                className="w-full px-4 py-3 flex items-center justify-between bg-gray-50 hover:bg-gray-100 transition-colors"
                onClick={() => toggleExpand(c.id)}
              >
                <div className="text-left">
                  <p className="font-bold text-sm text-gray-800">{c.fournisseur}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Validée le {new Date(c.date_validation).toLocaleDateString('fr-FR')} · {c.nb_lignes} référence{c.nb_lignes > 1 ? 's' : ''}
                  </p>
                </div>
                {expanded[c.id] ? <ChevronUp size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
              </button>

              {expanded[c.id] && (
                <div>
                  <table className="w-full text-sm">
                    <thead className="border-b border-gray-100 bg-white">
                      <tr className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                        <th className="text-left px-4 py-2">Dénomination</th>
                        <th className="text-center px-4 py-2">Commandé</th>
                        <th className="text-center px-4 py-2">Historique réceptions</th>
                        <th className="text-center px-4 py-2 bg-blue-50 text-blue-700">Ajouter réception</th>
                      </tr>
                    </thead>
                    <tbody>
                      {expanded[c.id].lignes.map(l => (
                        <tr key={l.id} className="border-b border-gray-50 align-top">
                          <td className="px-4 py-3 font-medium text-gray-900">
                            {l.denomination}
                            {l.taille && <span className="ml-2 badge-gray">{l.taille}</span>}
                          </td>
                          <td className="px-4 py-3 text-center text-gray-600">{l.quantite_commandee}</td>
                          <td className="px-4 py-3 text-center">
                            {l.receptions?.length > 0 ? (
                              <div className="space-y-1">
                                {l.receptions.map(r => (
                                  <p key={r.id} className="text-xs text-gray-600">
                                    {r.quantite} reçu(e)s le {new Date(r.date_reception).toLocaleDateString('fr-FR')}
                                  </p>
                                ))}
                                <p className="text-xs font-semibold text-gray-800 mt-1">Total : {l.quantite_recue ?? 0}</p>
                              </div>
                            ) : (
                              <span className="text-xs text-gray-400">Aucune</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-center bg-blue-50">
                            <input
                              type="number" min="0" step="1"
                              className="w-20 text-center input text-sm py-1 mx-auto block"
                              value={quantites[l.id] ?? ''}
                              onChange={e => {
                                const val = e.target.value;
                                setQuantites(p => ({ ...p, [l.id]: val }));
                              }}
                              onKeyDown={e => {
                                if (e.key === 'Enter') {
                                  const lignes = expanded[c.id]?.lignes || [];
                                  const estDerniereLigne = lignes[lignes.length - 1]?.id === l.id;
                                  if (estDerniereLigne) {
                                    finaliserReception(c.id);
                                  }
                                }
                              }}
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="px-4 py-3 bg-gray-50 flex justify-end">
                    <button
                      onClick={() => finaliserReception(c.id)}
                      disabled={saving === c.id}
                      className="btn-primary"
                    >
                      <CheckCircle size={16} />
                      {saving === c.id ? 'Finalisation...' : 'Finaliser la réception'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
      <Footer appSource="Gestion des stocks" />
    </div>
  );
}
