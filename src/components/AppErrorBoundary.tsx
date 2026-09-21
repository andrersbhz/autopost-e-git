import { Component, ReactNode } from 'react';

interface Props { children: ReactNode }
interface State { hasError: boolean }

const RELOAD_KEY = 'a3:eb-reloaded-at';

/**
 * Global error boundary — guarantees the user never sees a blank white screen.
 * On chunk-load failures (stale deploy), it auto-reloads once; otherwise it
 * shows a friendly retry UI.
 */
class AppErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error('[AppErrorBoundary]', error);
    const msg = String(error?.message || '');
    const isChunkError =
      /Failed to fetch dynamically imported module|Importing a module script failed|ChunkLoadError|Loading chunk/i.test(msg);
    if (isChunkError) {
      // Auto-reload once (max 1x per 30s) to recover from stale chunks after deploy.
      const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
      if (Date.now() - last > 30_000) {
        sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 flex flex-col items-center justify-center gap-4 bg-background text-foreground p-6">
          <div className="h-2 w-2 rounded-full bg-primary animate-ping" />
          <p className="text-sm text-muted-foreground text-center">
            Algo deu errado ao carregar a página.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-md border border-border bg-secondary/50 px-4 py-2 text-sm hover:bg-secondary transition-colors"
          >
            Recarregar
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default AppErrorBoundary;
