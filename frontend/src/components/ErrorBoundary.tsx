import React from 'react';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: React.ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: null };
  }

  public override componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    console.error('Uncaught component error in Gateway UI:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    try {
      this.setState({ hasError: false, error: null, errorInfo: null });
    } catch {
      window.location.reload();
    }
  };

  private handleClearAndReload = () => {
    try {
      localStorage.removeItem('9tepay_pristine_clean');
      window.location.reload();
    } catch {
      window.location.reload();
    }
  };

  public override render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '20px', fontFamily: 'sans-serif', backgroundColor: '#fee2e2', color: '#991b1b', borderRadius: '8px', margin: '20px' }}>
          <h2 style={{ fontSize: '20px', fontWeight: 'bold' }}>Application Error Caught</h2>
          <pre style={{ marginTop: '10px', fontSize: '12px', whiteSpace: 'pre-wrap' }}>
            {typeof this.state.error?.message === 'string' ? this.state.error.message : String(this.state.error || 'Unknown application error')}
          </pre>
          <pre style={{ marginTop: '10px', fontSize: '10px', whiteSpace: 'pre-wrap' }}>
            {typeof this.state.error?.stack === 'string' ? this.state.error.stack : ''}
          </pre>
          <button 
            onClick={this.handleReset}
            style={{ marginTop: '20px', padding: '10px 20px', backgroundColor: '#b91c1c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
          >
            Reload Interface
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
