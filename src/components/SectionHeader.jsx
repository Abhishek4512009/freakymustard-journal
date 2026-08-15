import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/** Section heading with optional "Explore all" link. */
export default function SectionHeader({ title, subtitle, to, accent = true }) {
  return (
    <div className="flex items-end justify-between px-4 md:px-8 mb-3">
      <div>
        <h2 className="text-xl md:text-2xl font-bold text-white tracking-wide font-display flex items-center gap-2.5">
          {accent && (
            <span
              className="w-1.5 h-6 bg-gradient-to-b from-brand-500 to-accent-500 rounded-full shrink-0"
              aria-hidden="true"
            />
          )}
          {title}
        </h2>
        {subtitle && <p className="text-xs text-slate-500 mt-1 ml-4">{subtitle}</p>}
      </div>
      {to && (
        <Link
          to={to}
          className="text-sm text-slate-400 hover:text-white flex items-center gap-0.5 transition-colors font-semibold shrink-0"
        >
          Explore all <ChevronRight size={16} />
        </Link>
      )}
    </div>
  );
}
