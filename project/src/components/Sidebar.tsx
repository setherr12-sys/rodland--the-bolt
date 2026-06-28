import { LayoutGrid, CalendarDays, BarChart2 } from 'lucide-react';

export type View = 'rooms' | 'calendar' | 'reports';

interface Props {
  view: View;
  setView: (v: View) => void;
}

const nav: { id: View; label: string; icon: React.ReactNode }[] = [
  { id: 'rooms',    label: 'Rooms',    icon: <LayoutGrid className="w-5 h-5" /> },
  { id: 'calendar', label: 'Calendar', icon: <CalendarDays className="w-5 h-5" /> },
  { id: 'reports',  label: 'Reports',  icon: <BarChart2 className="w-5 h-5" /> },
];

export default function Sidebar({ view, setView }: Props) {
  return (
    <aside className="w-60 bg-slate-900 text-white flex flex-col shrink-0 h-full">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-slate-700/60">
        <div className="flex items-center gap-3">
          <img
            src="/Gemini_Generated_Image_j7cqg4j7cqg4j7cq.png"
            alt="Rodland"
            className="w-9 h-9 rounded-lg object-cover"
          />
          <div>
            <p className="font-semibold text-sm leading-tight text-white">Rodland</p>
            <p className="text-xs text-slate-400 leading-tight">Apartments Ops</p>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {nav.map(item => (
          <button
            key={item.id}
            onClick={() => setView(item.id)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 ${
              view === item.id
                ? 'bg-amber-500 text-white shadow-sm'
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-slate-700/60">
        <p className="text-xs text-slate-500">v1.0 · {new Date().getFullYear()}</p>
      </div>
    </aside>
  );
}
