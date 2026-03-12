import { Component } from 'react';
import type { ReactNode, ErrorInfo } from 'react';

import './ErrorBoundary.css';

// ── Types ──

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// ── Component ──

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary] Caught error:', error, info.componentStack);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="errorBoundary">
          <div className="errorBoundaryCard">
            <img
              className="errorBoundaryPixie"
              src="/pixie/connection-lost.png"
              alt="Something went wrong"
              draggable={false}
            />
            <h1 className="errorBoundaryTitle">Something went wrong</h1>
            <p className="errorBoundaryMessage">
              Peeksy hit an unexpected error. This is usually temporary.
            </p>
            {this.state.error && (
              <pre className="errorBoundaryDetails">
                {this.state.error.message}
              </pre>
            )}
            <div className="errorBoundaryActions">
              <button
                className="errorBoundaryButton errorBoundaryButton--primary"
                onClick={this.handleReload}
                type="button"
              >
                Reload Page
              </button>
              <button
                className="errorBoundaryButton errorBoundaryButton--secondary"
                onClick={this.handleGoHome}
                type="button"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
