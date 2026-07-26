import { Component, ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { typography } from '../utils/typography';
import { captureError, isRumInitialized, addBreadcrumb } from '../utils/rum';
import { captureSentryError, isSentryInitialized } from '../utils/sentry';
import { createLogger } from '../utils/logger';
import Icon from './icons/Icon';

const log = createLogger('ErrorBoundary');

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onReset?: () => void;
  showHomeButton?: boolean;
  pageName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    addBreadcrumb('error', `ErrorBoundary caught: ${error.message}`, {
      pageName: this.props.pageName || 'unknown',
    });
    if (isRumInitialized) {
      captureError(error, {
        componentStack: errorInfo.componentStack,
        pageName: this.props.pageName || 'unknown',
      });
    }
    if (isSentryInitialized()) {
      captureSentryError(error, {
        componentStack: errorInfo.componentStack,
        pageName: this.props.pageName || 'unknown',
      });
    }
    if (!isRumInitialized && !isSentryInitialized()) {
      log.error('uncaught_error', { error: error.message, componentStack: errorInfo.componentStack });
    }
  }

  handleReset = () => {
    this.props.onReset?.();
    this.setState({ hasError: false, error: null });
  };

  render() {
    const { showHomeButton = true, pageName, fallback } = this.props;

    if (this.state.hasError) {
      // Use the custom fallback if the caller passed one — even when it is null
      // or another falsy node. `'fallback' in this.props` distinguishes "caller
      // opted into a (possibly empty) fallback" from "no fallback prop given",
      // so a SafeCanvas with a null fallback degrades to nothing instead of the
      // full-screen "Something went wrong" page.
      if ('fallback' in this.props) {
        return fallback;
      }

      const errorTitle = pageName ? `Something went wrong with ${pageName}` : 'Something went wrong';

      return (
        <div className="min-h-screen bg-altivum-dark flex items-center justify-center px-6">
          <div className="max-w-md w-full text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-altivum-gold/10 border-2 border-altivum-gold mb-8">
              <Icon name="error_outline" className="text-altivum-gold text-4xl" />
            </div>

            <h1 className="text-white mb-4" style={typography.sectionHeader}>
              {errorTitle}
            </h1>

            <p className="text-altivum-silver mb-8" style={typography.bodyText}>
              We encountered an unexpected error. Please try refreshing the page
              {showHomeButton ? ' or return to the home page' : ''}.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <button
                onClick={() => {
                  this.handleReset();
                  window.location.reload();
                }}
                className="px-6 py-3 bg-altivum-gold text-altivum-dark font-medium uppercase tracking-wider text-sm hover:bg-white transition-colors duration-300"
              >
                Refresh Page
              </button>
              {showHomeButton && (
                <Link
                  to="/"
                  onClick={this.handleReset}
                  className="px-6 py-3 border border-altivum-gold text-altivum-gold font-medium uppercase tracking-wider text-sm hover:bg-altivum-gold hover:text-altivum-dark transition-colors duration-300"
                >
                  Go Home
                </Link>
              )}
            </div>

            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-8 text-left">
                <summary className="text-altivum-silver cursor-pointer hover:text-white text-sm">Error Details</summary>
                <pre className="mt-4 p-4 bg-altivum-navy rounded-sm text-xs text-red-400 overflow-auto">
                  {this.state.error.toString()}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
