import { useState, useEffect } from 'react';
import { AlertCircle, History, X, Plus, ArrowLeft } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ssoApi = axios.create({ baseURL: '/sso/api' });
ssoApi.interceptors.request.use(config => {
  const token = localStorage.getItem('sso_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function SignalerBugModal({ appSource, onClose }) {
  const [vue, setVue] = useState('liste');
  const [signalements, setSignalements] = useState([]);
  const [loadingListe, setLoadingListe] = useState(true);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    ssoApi.get('/signalements')
      .then(r => setSignalements(r.data.filter(s => s.status === 'nouveau')))
      .catch(() => {})
      .finally(() => setLoadingListe(false));
  }, []);

  const envoyer = async () => {
    if (!message.trim()) { toast.error('Décris le problème avant d\'envoyer'); return; }
    setLoading(true);
    try {
      await ssoApi.post('/signalements', { app_source: appSource, message, url_context: window.location.href });
      toast.success('Signalement envoyé, merci !');
      onClose();
    } catch {
      toast.error('Erreur lors de l\'envoi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4 shrink-0">
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            {vue === 'form' && (
              <button onClick={() => setVue('liste')} className="p-1 hover:bg-gray-100 rounded-lg"><ArrowLeft size={16} /></button>
            )}
            {vue === 'liste' ? 'Bugs déjà signalés' : 'Signaler un bug'}
          </h2>
          <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-lg"><X size={18} /></button>
        </div>

        {vue === 'liste' ? (
          <>
            <div className="overflow-y-auto flex-1 -mx-2 px-2">
              {loadingListe ? (
                <p className="text-sm text-gray-400 text-center py-6">Chargement...</p>
              ) : signalements.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Aucun bug signalé pour l'instant</p>
              ) : (
                <div className="space-y-2">
                  {signalements.map(s => (
                    <div key={s.id} className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-800">{s.message}</p>
                      <p className="text-xs text-gray-400 mt-1">{s.app_source} · {s.prenom} {s.nom}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <button onClick={() => setVue('form')} className="btn-primary w-full justify-center mt-4 shrink-0">
              <Plus size={16} /> Signaler un nouveau problème
            </button>
          </>
        ) : (
          <>
            <textarea
              autoFocus
              className="input w-full h-28 resize-none"
              placeholder="Décris ce qui ne fonctionne pas..."
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
            <div className="flex gap-2 mt-4 shrink-0">
              <button onClick={envoyer} disabled={loading} className="btn-primary flex-1 justify-center">
                {loading ? 'Envoi...' : 'Envoyer'}
              </button>
              <button onClick={onClose} className="btn-secondary">Annuler</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function Footer({ appSource }) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <footer className="max-w-5xl mx-auto px-4 py-6 flex items-center justify-center gap-4 text-xs text-gray-400">
        <button onClick={() => setShowModal(true)} className="flex items-center gap-1 hover:text-gray-600">
          <AlertCircle size={13} /> Signaler un bug
        </button>
        <span className="text-gray-300">·</span>
        <a href="/evolutions" className="flex items-center gap-1 hover:text-gray-600">
          <History size={13} /> Évolutions
        </a>
      </footer>
      {showModal && <SignalerBugModal appSource={appSource} onClose={() => setShowModal(false)} />}
    </>
  );
}
