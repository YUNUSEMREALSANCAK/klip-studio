import { Component, type ReactNode } from 'react';

// Beklenmeyen bir hata tüm arayüzü beyaz ekrana çevirmesin; proje IndexedDB'de güvende kalır.
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
          <h2>Bir şeyler ters gitti</h2>
          <p className="hint">Projeniz otomatik kaydedildi. Sayfayı yenileyerek kaldığınız yerden devam edebilirsiniz.</p>
          <pre>{this.state.error.message}</pre>
          <button className="btn primary" onClick={() => location.reload()}>
            Sayfayı yenile
          </button>
        </div>
      </div>
    );
  }
}
