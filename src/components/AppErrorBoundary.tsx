import { Component, type ErrorInfo, type ReactNode } from "react";

interface AppErrorBoundaryProps {
  children: ReactNode;
}

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = {
    hasError: false,
  };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("App render error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-background p-6">
          <div className="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-card">
            <h1 className="font-display text-2xl font-bold">Falha ao carregar a tela</h1>
            <p className="mt-3 text-sm text-muted-foreground">
              Ocorreu um erro de renderizacao. Recarregue a pagina para tentar novamente.
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
