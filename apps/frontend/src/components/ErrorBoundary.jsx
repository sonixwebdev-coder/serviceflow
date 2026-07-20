import { Component } from 'react';
import { captureException } from '../utils/sentry';

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo);
    captureException(error, { componentStack: errorInfo?.componentStack });
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-gray-50 p-6">
          <div className="max-w-md text-center">
            <div className="mb-4 text-5xl">⚠️</div>
            <h1 className="mb-2 text-2xl font-bold text-gray-900">Ceva nu a funcționat</h1>
            <p className="mb-4 text-gray-600">
              A apărut o eroare neașteptată. Te rugăm să încerci din nou.
            </p>
            {this.state.error?.message && (
              <p className="mb-6 rounded-lg bg-gray-100 px-4 py-2 text-xs text-gray-500 font-mono break-all">
                {this.state.error.message}
              </p>
            )}
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={this.handleReset}
                className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
              >
                Reîncearcă
              </button>
              <button
                onClick={() => window.location.reload()}
                className="rounded-lg border border-gray-300 bg-white px-6 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                Reîncarcă pagina
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
