export default function UserMenu({ user, onLogout }) {
  return (
    <details className="relative">
      <summary className="list-none hover:bg-white/10 px-3 py-1.5 rounded-lg cursor-pointer select-none text-right">
        <div className="text-white text-sm font-medium flex items-center justify-end gap-1.5">{user?.full_name} <span className="opacity-80 text-base leading-none">▾</span></div>
      </summary>
      <div className="absolute right-0 top-10 z-30 bg-white rounded-xl shadow-lg border border-gray-100 py-1 min-w-44">
        <a href="/" className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-50">Retour au portail</a>
        <hr className="my-1 border-gray-100" />
        <button onClick={onLogout} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
          Se déconnecter
        </button>
      </div>
    </details>
  );
}
