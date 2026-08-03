export default function UserMenu({ user, onLogout, isRealAdmin, viewAs, setViewAs }) {
  return (
    <details className="relative">
      <summary className="list-none hover:bg-white/10 px-3 py-1.5 rounded-lg cursor-pointer select-none text-right">
        <div className="text-white text-sm font-medium flex items-center justify-end gap-1.5">{user?.full_name} <span className="opacity-80 text-base leading-none">▾</span></div>
      </summary>
      <div className="absolute right-0 top-10 z-30 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-48">
        <a href="/" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Retour au portail</a>
        {isRealAdmin && (
          <>
            <hr className="my-1 border-gray-100" />
            <p className="px-4 pt-1 pb-1 text-xs font-bold text-gray-400 uppercase">Vue (test)</p>
            {[["admin","Administrateur"],["gestionnaire","Gestionnaire de commande"],["inventaire","Agent Inventaire"]].map(([val,label]) => (
              <button key={val} onClick={() => setViewAs(val)}
                className={`w-full text-left px-4 py-1.5 text-sm ${viewAs === val ? "font-semibold text-amber-700 bg-amber-50" : "text-gray-600 hover:bg-gray-50"}`}>
                {viewAs === val ? "✓ " : ""}{label}
              </button>
            ))}
          </>
        )}
        <hr className="my-1 border-gray-100" />
        <button onClick={onLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
          Se déconnecter
        </button>
      </div>
    </details>
  );
}
