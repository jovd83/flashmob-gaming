/**
 * Copyright (c) 2026 jovd83
 * FlashMob Gaming Platform - The Collective Gaming Experience
 */
import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
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
    if (this.state.hasError) {
      return (
        <div style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#020617',
          color: '#f8fafc',
          fontFamily: 'sans-serif',
          padding: '2rem',
          textAlign: 'center'
        }}>
          <h1 style={{ color: '#00ffcc', marginBottom: '1rem' }}>Something went wrong</h1>
          <p style={{ opacity: 0.7, marginBottom: '2rem' }}>
            The application encountered a critical error.
          </p>
          <pre style={{
            background: 'rgba(0,0,0,0.3)',
            padding: '1rem',
            borderRadius: '12px',
            fontSize: '0.8rem',
            maxWidth: '100%',
            overflow: 'auto',
            color: '#f43f5e'
          }}>
            {this.state.error?.message}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              marginTop: '2rem',
              padding: '0.75rem 1.5rem',
              background: '#00ffcc',
              color: '#020617',
              border: 'none',
              borderRadius: '8px',
              fontWeight: 'bold',
              cursor: 'pointer'
            }}
          >
            Reload Application
          </button>
        </div>
      );
    }

    return this.children;
  }

  /* Adding this to handle the compilation of the children property in some TS versions */
  private get children() {
    return (this.props as any).children;
  }
}

export default ErrorBoundary;
