import { Component } from 'react';

/** Top-level error boundary — a plain correction slip, not a light show. */
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
      <div className="fm-main" style={{ paddingTop: 60 }}>
        <div className="fm-notice" role="alert">
          <h2>Correction.</h2>
          <p>Something broke while setting this page. Reloading usually fixes it.</p>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button
              type="button"
              onClick={() => this.setState({ error: null })}
              className="fm-btn fm-btn--plain"
            >
              Try again
            </button>
            <button type="button" onClick={() => window.location.reload()} className="fm-btn">
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }
}
