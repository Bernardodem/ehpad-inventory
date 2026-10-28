// Conditionnement d'un produit : partage par les pages Produits, Inventaire et Commande.
// L'inventaire et la commande se font dans cette unite (on compte des boites, pas des gants).

export const CONDITIONNEMENTS = { unite: 'Unité', sachet: 'Sachet', carton: 'Carton', boite: 'Boîte' };

export const nonPrecisee = p => p.conditionnement_quantite_non_precisee === true || p.conditionnement_quantite_non_precisee === 'true';

// Affichage commun liste / fiche : le conditionnement structure prime,
// l'ancien texte libre ne sert que tant qu'il n'a pas ete renseigne
export function formatConditionnement(p) {
  const type = p.conditionnement_type || 'unite';
  if (type === 'unite') return p.conditionnement || CONDITIONNEMENTS.unite;
  if (nonPrecisee(p)) return `${CONDITIONNEMENTS[type]} (nombre d'unités non précisé)`;
  return `${CONDITIONNEMENTS[type]} de ${p.conditionnement_quantite || '?'} unités`;
}

// Meme regle que l'API : sachet, carton ou boite exigent un nombre d'unites, sauf "non precise"
export function erreurConditionnement(form) {
  const type = form.conditionnement_type || 'unite';
  if (type === 'unite' || nonPrecisee(form)) return null;
  const n = Number(form.conditionnement_quantite);
  return Number.isInteger(n) && n >= 1 ? null : "Indiquez le nombre d'unités, ou cochez « non précisé »";
}

export function ConditionnementInput({ form, set }) {
  const type = form.conditionnement_type || 'unite';
  const inconnu = nonPrecisee(form);
  return (
    <div className="flex flex-wrap gap-2 items-center">
      <select className="input text-sm py-1" value={type} onChange={e => {
        set('conditionnement_type', e.target.value);
        if (e.target.value === 'unite') { set('conditionnement_quantite', ''); set('conditionnement_quantite_non_precisee', false); }
        set('conditionnement', ''); // remplace l'ancien texte libre
      }}>
        {Object.entries(CONDITIONNEMENTS).map(([v, label]) => <option key={v} value={v}>{label}</option>)}
      </select>
      {type !== 'unite' && (
        <>
          <div className="flex items-center gap-1">
            <input type="number" min="1" className="input text-sm py-1 w-24" placeholder="Nb unités" disabled={inconnu}
              value={inconnu ? '' : (form.conditionnement_quantite || '')} onChange={e => set('conditionnement_quantite', e.target.value)} />
            <span className="text-sm text-gray-500">unités / {CONDITIONNEMENTS[type].toLowerCase()}</span>
          </div>
          <label className="flex items-center gap-1.5 text-sm text-gray-700 cursor-pointer">
            <input type="checkbox" className="w-4 h-4 accent-primary-600" checked={inconnu} onChange={e => {
              set('conditionnement_quantite_non_precisee', e.target.checked);
              if (e.target.checked) set('conditionnement_quantite', '');
            }} />
            Non précisé
          </label>
        </>
      )}
    </div>
  );
}

const PLURIELS = { unite: 'unités', sachet: 'sachets', carton: 'cartons', boite: 'boîtes' };

// Unite dans laquelle on compte le stock et on commande
export function uniteComptage(p) {
  return PLURIELS[p?.conditionnement_type] || PLURIELS.unite;
}
