import { Component } from 'react';

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
            <p className="mb-6 text-gray-600">
              A apărut o eroare neașteptată. Te rugăm să încerci din nou.
            </p>
            <button
              onClick={this.handleReset}
              className="rounded-lg bg-gray-900 px-6 py-2.5 text-sm font-medium text-white hover:bg-gray-800 transition-colors"
            >
              Reîncearcă
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
