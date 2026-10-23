import { tr } from '../i18n';
import { Component, type ReactNode } from 'react';

// An unexpected error shouldn't blank the whole UI; the project stays safe in IndexedDB.
export class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div className="crash">
        <div>
          <h2>{tr('Something went wrong')}</h2>
          <p className="hint">{tr('Your project was saved automatically. Reload the page to continue where you left off.')}</p>
          <pre>{this.state.error.message}</pre>
          <button className="btn primary" onClick={() => location.reload()}>
            {tr('Reload page')}
          </button>
        </div>
      </div>
    );
  }
}
