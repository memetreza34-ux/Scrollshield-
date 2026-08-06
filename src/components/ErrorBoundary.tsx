import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    const showErrorDetails = !import.meta.env.PROD;

    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col items-center justify-center p-6">
          <div className="w-16 h-16 bg-red-500/20 rounded-3xl flex items-center justify-center mb-6 border border-red-500/30">
            <AlertTriangle size={32} className="text-red-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight mb-2 text-center">Etwas ist schiefgelaufen</h1>
          <p className="text-zinc-400 text-sm max-w-xs text-center mb-8">
            Ein unerwarteter Fehler ist aufgetreten. ScrollShield hat den Fehler protokolliert und versucht, sich
            wiederherzustellen.
          </p>

          {showErrorDetails && this.state.error && (
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 w-full max-w-md mb-8 overflow-auto">
              <p className="text-xs text-zinc-500 font-mono break-all">{this.state.error.toString()}</p>
            </div>
          )}

          <button
            onClick={() => {
              this.setState({ hasError: false, error: null });
              window.location.reload();
            }}
            className="bg-zinc-100 text-zinc-950 font-bold py-3 px-8 rounded-xl active:scale-[0.98] transition-transform flex items-center gap-2"
          >
            <RefreshCw size={18} />
            App neu laden
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
