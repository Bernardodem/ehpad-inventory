import { useState, useEffect } from 'react';
import api from '../api';
import toast from 'react-hot-toast';
import { X, Plus, Trash2 } from 'lucide-react';

function EmplacementsConfigModal({ onClose, onSaved, lieuId }) {
  const [data, setData] = useState({ etageres: [], niveaux: [], emplacements: [] });
  const [newValues, setNewValues] = useState({ etageres: '', niveaux: '', emplacements: '' });

  const load = async () => {
    const params = lieuId ? `?lieu_id=${lieuId}` : '';
    const [et, niv, emp] = await Promise.all([
      api.get(`/emplacements-config/etageres${params}`),
      api.get(`/emplacements-config/niveaux${params}`),
      api.get(`/emplacements-config/emplacements${params}`),
    ]);
    setData({ etageres: et.data, niveaux: niv.data, emplacements: emp.data });
  };

  useEffect(() => { load(); }, [lieuId]);

  const add = async (type) => {
    const value = newValues[type].trim();
    if (!value) return;
    try {
      await api.post(`/emplacements-config/${type}`, { name: value, lieu_id: lieuId || null });
      setNewValues(p => ({ ...p, [type]: '' }));
      await load();
      onSaved();
      toast.success('Ajouté');
    } catch (err) { toast.error(err.response?.data?.error || 'Erreur'); }
  };

  const remove = async (type, id) => {
    if (!window.confirm('Supprimer cet élément ?')) return;
    try {
      await api.delete(`/emplacements-config/${type}/${id}`);
      await load();
      onSaved();
      toast.success('Supprimé');
    } catch { toast.error('Erreur'); }
  };

  const columns = [
    { key: 'etageres', label: 'Étagères' },
    { key: 'niveaux', label: 'Niveaux' },
    { key: 'emplacements', label: 'Emplacements' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-3xl shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-bold text-gray-900">Gérer les emplacements</h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>
        <div className="grid sm:grid-cols-3 gap-5">
          {columns.map(col => (
            <div key={col.key}>
              <label className="label mb-2">{col.label}</label>
              <div className="flex gap-2 mb-3">
                <input
                  className="input"
                  placeholder="Nouveau..."
                  value={newValues[col.key]}
                  onChange={e => setNewValues(p => ({ ...p, [col.key]: e.target.value }))}
                  onKeyDown={e => e.key === 'Enter' && add(col.key)}
                />
                <button onClick={() => add(col.key)} className="btn-primary px-3"><Plus size={15} /></button>
              </div>
              <div className="space-y-1">
                {data[col.key].map(item => (
                  <div key={item.id} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                    <span>{item.name}</span>
                    <button onClick={() => remove(col.key, item.id)} className="text-red-500 hover:bg-red-50 rounded p-1">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {data[col.key].length === 0 && (
                  <p className="text-xs text-gray-400 italic px-3 py-2">Aucun élément</p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default EmplacementsConfigModal;
