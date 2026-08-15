import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-[80vh] flex flex-col items-center justify-center text-center px-6 animate-fade-in">
      <div className="w-20 h-20 rounded-3xl bg-ink-800 border border-ink-700 flex items-center justify-center mb-6">
        <Compass size={36} className="text-brand-400" />
      </div>
      <p className="text-7xl font-black text-gradient-brand font-display mb-2">404</p>
      <h1 className="text-xl font-bold text-white mb-2">This scene doesn't exist</h1>
      <p className="text-sm text-slate-400 max-w-sm mb-8">
        The page you're looking for was cut in post-production. Head back home to keep watching.
      </p>
      <Link
        to="/"
        className="px-7 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-bold text-sm transition-all hover:scale-[1.03] shadow-glow"
      >
        Back to Home
      </Link>
    </div>
  );
}
