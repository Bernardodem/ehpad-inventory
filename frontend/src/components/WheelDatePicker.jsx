import { useState, useRef, useEffect } from "react";

const MOIS = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Août","Sep","Oct","Nov","Déc"];
const ITEM_HEIGHT = 40;

function Wheel({ values, selected, onSelect, formatLabel }) {
  const ref = useRef(null);

  useEffect(() => {
    const idx = values.indexOf(selected);
    if (ref.current && idx >= 0) {
      ref.current.scrollTop = idx * ITEM_HEIGHT;
    }
  }, []);

  const handleScroll = () => {
    if (!ref.current) return;
    clearTimeout(ref.current._t);
    ref.current._t = setTimeout(() => {
      const idx = Math.round(ref.current.scrollTop / ITEM_HEIGHT);
      const clamped = Math.max(0, Math.min(values.length - 1, idx));
      ref.current.scrollTo({ top: clamped * ITEM_HEIGHT, behavior: "smooth" });
      onSelect(values[clamped]);
    }, 120);
  };

  return (
    <div className="relative flex-1" style={{ height: ITEM_HEIGHT * 3 }}>
      <div className="absolute left-0 right-0 pointer-events-none border-y-2 border-primary-400" style={{ top: ITEM_HEIGHT, height: ITEM_HEIGHT }} />
      <div
        ref={ref}
        onScroll={handleScroll}
        className="overflow-y-scroll h-full"
        style={{ scrollSnapType: "y mandatory", paddingTop: ITEM_HEIGHT, paddingBottom: ITEM_HEIGHT }}
      >
        {values.map(v => (
          <div
            key={v}
            style={{ height: ITEM_HEIGHT, scrollSnapAlign: "center" }}
            className={`flex items-center justify-center text-sm ${v === selected ? "font-bold text-gray-900" : "text-gray-400"}`}
          >
            {formatLabel ? formatLabel(v) : v}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function WheelDatePicker({ value, onChange, defaultSansJour }) {
  const isMonthOnly = value && /^\d{4}-\d{2}$/.test(value);
  const initial = value ? new Date(isMonthOnly ? value + "-01" : value) : new Date();

  const [jourInconnu, setJourInconnu] = useState(value ? !!isMonthOnly : !!defaultSansJour);
  const [jour, setJour] = useState(initial.getDate());
  const [mois, setMois] = useState(initial.getMonth());
  const [annee, setAnnee] = useState(initial.getFullYear());

  const jours = Array.from({ length: 31 }, (_, i) => i + 1);
  const moisIdx = Array.from({ length: 12 }, (_, i) => i);
  const annees = Array.from({ length: 8 }, (_, i) => new Date().getFullYear() + i);

  useEffect(() => {
    if (jourInconnu) {
      const iso = `${annee}-${String(mois + 1).padStart(2, "0")}`;
      onChange(iso);
    } else {
      const iso = `${annee}-${String(mois + 1).padStart(2, "0")}-${String(jour).padStart(2, "0")}`;
      onChange(iso);
    }
  }, [jour, mois, annee, jourInconnu]);

  return (
    <div className="bg-gray-50 rounded-xl p-2">
      <label className="flex items-center gap-2 px-1 pb-2 text-xs text-gray-600 cursor-pointer">
        <input type="checkbox" checked={jourInconnu} onChange={e => setJourInconnu(e.target.checked)} className="w-3.5 h-3.5 accent-primary-600" />
        Jour inconnu (mois/année seulement)
      </label>
      <div className="flex items-center gap-1 w-full">
        {!jourInconnu && <Wheel values={jours} selected={jour} onSelect={setJour} />}
        <Wheel values={moisIdx} selected={mois} onSelect={setMois} formatLabel={i => MOIS[i]} />
        <Wheel values={annees} selected={annee} onSelect={setAnnee} />
      </div>
    </div>
  );
}
