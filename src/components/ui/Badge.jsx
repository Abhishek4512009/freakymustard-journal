const tones = {
  brand: 'bg-brand-500/15 text-brand-300 border-brand-500/25',
  neutral: 'bg-white/5 text-slate-300 border-white/10',
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25',
  warning: 'bg-amber-500/15 text-amber-300 border-amber-500/25',
  danger: 'bg-red-500/15 text-red-300 border-red-500/25',
  accent: 'bg-accent-500/15 text-accent-400 border-accent-500/25',
};

/** Small pill label: <Badge tone="brand">HD</Badge> */
export default function Badge({ tone = 'neutral', className = '', children }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-bold tracking-wide ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
