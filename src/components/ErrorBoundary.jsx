import { Component } from 'react';
import { AlertTriangle } from 'lucide-react';

/**
 * Top-level error boundary — catches render crashes and shows a
 * recoverable screen instead of a white page.
 */
export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    console.error('FreakyMustard crashed:', error, info);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="min-h-screen bg-ink-950 flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
          <AlertTriangle size={28} className="text-red-400" />
        </div>
        <h1 className="text-2xl font-black text-white mb-2 font-display">Something broke</h1>
        <p className="text-sm text-slate-400 max-w-md mb-8">
          An unexpected error occurred while rendering this page. Reloading usually fixes it.
        </p>
        <div className="flex gap-3">
          <button
            onClick={() => this.setState({ error: null })}
            className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white font-bold text-sm transition-colors cursor-pointer"
          >
            Try again
          </button>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl bg-brand-500 hover:bg-brand-400 text-white font-bold text-sm transition-colors cursor-pointer"
          >
            Reload app
          </button>
        </div>
      </div>
    );
  }
}
