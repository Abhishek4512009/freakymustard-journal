import React from 'react';

const variants = {
  primary:
    'bg-brand-500 hover:bg-brand-400 text-white shadow-lg shadow-brand-500/25 hover:shadow-brand-500/40',
  secondary: 'bg-white/10 hover:bg-white/20 text-white border border-white/10 backdrop-blur-sm',
  ghost: 'bg-transparent hover:bg-white/10 text-slate-300 hover:text-white',
  danger: 'bg-red-600/90 hover:bg-red-500 text-white',
  white: 'bg-white hover:bg-slate-200 text-ink-950 shadow-lg',
};

const sizes = {
  sm: 'px-3 py-1.5 text-xs gap-1.5 rounded-lg',
  md: 'px-5 py-2.5 text-sm gap-2 rounded-xl',
  lg: 'px-7 py-3.5 text-base gap-2.5 rounded-xl',
  icon: 'p-2.5 rounded-xl',
};

/**
 * <Button variant="primary|secondary|ghost|danger|white" size="sm|md|lg|icon">
 */
const Button = React.forwardRef(function Button(
  { variant = 'primary', size = 'md', className = '', children, ...props },
  ref
) {
  return (
    <button
      ref={ref}
      className={`inline-flex items-center justify-center font-bold transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});

export default Button;
