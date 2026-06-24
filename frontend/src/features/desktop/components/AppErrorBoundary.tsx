import { Component, type ComponentType, type ReactNode } from "react";

type FallbackProps = { error: Error; retry: () => void };

type AppErrorBoundaryProps = {
  children: ReactNode;
  fallback: ComponentType<FallbackProps>;
  retryLimit?: number;
};

type State = { error: Error | null; retryCount: number };

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, State> {
  state: State = { error: null, retryCount: 0 };

  static getDerivedStateFromError(error: Error): State {
    return { error, retryCount: 0 };
  }

  handleRetry = () => {
    const limit = this.props.retryLimit ?? 0;
    if (this.state.retryCount >= limit) return;
    this.setState((prev) => ({ error: null, retryCount: prev.retryCount + 1 }));
  };

  render() {
    const { fallback: Fallback } = this.props;
    if (this.state.error) {
      return <Fallback error={this.state.error} retry={this.handleRetry} />;
    }
    return this.props.children;
  }
}
