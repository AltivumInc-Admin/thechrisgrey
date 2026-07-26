import { Link } from 'react-router-dom';
import { typography } from '../utils/typography';
import Icon from './icons/Icon';

interface ErrorFallbackProps {
  onRetry?: () => void;
}

/**
 * Error fallback for Blog listing page.
 * Shows retry option for CMS fetch failures.
 */
export function BlogErrorFallback({ onRetry }: ErrorFallbackProps) {
  return (
    <div className="min-h-screen bg-altivum-dark flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-altivum-gold/10 border-2 border-altivum-gold mb-8">
          <Icon name="article" className="text-altivum-gold text-4xl" />
        </div>

        <h1 className="text-white mb-4" style={typography.sectionHeader}>
          Unable to load blog
        </h1>

        <p className="text-altivum-silver mb-8" style={typography.bodyText}>
          We couldn't load the blog posts right now. This might be a temporary issue.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onRetry || (() => window.location.reload())}
            className="px-6 py-3 bg-altivum-gold text-altivum-dark font-medium uppercase tracking-wider text-sm hover:bg-white transition-colors duration-300"
          >
            Try Again
          </button>
          <Link
            to="/"
            className="px-6 py-3 border border-altivum-gold text-altivum-gold font-medium uppercase tracking-wider text-sm hover:bg-altivum-gold hover:text-altivum-dark transition-colors duration-300"
          >
            Go Home
          </Link>
        </div>
      </div>
    </div>
  );
}

/**
 * Error fallback for Chat page.
 * Full-viewport design without Home button (matches Chat layout).
 */
export function ChatErrorFallback({ onRetry }: ErrorFallbackProps) {
  return (
    <div className="h-screen pt-20 flex flex-col bg-altivum-dark overflow-hidden">
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md w-full text-center">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-altivum-gold/10 border-2 border-altivum-gold mb-8">
            <Icon name="chat" className="text-altivum-gold text-4xl" />
          </div>

          <h1 className="text-white mb-4" style={typography.sectionHeader}>
            Chat unavailable
          </h1>

          <p className="text-altivum-silver mb-8" style={typography.bodyText}>
            Something went wrong with the chat. Let's start fresh.
          </p>

          <button
            onClick={onRetry || (() => window.location.reload())}
            className="px-6 py-3 bg-altivum-gold text-altivum-dark font-medium uppercase tracking-wider text-sm hover:bg-white transition-colors duration-300"
          >
            Restart Chat
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Generic error fallback for any page.
 * Accepts pageName for contextual messaging.
 */
export function GenericPageErrorFallback({
  pageName,
  onRetry,
  showHomeButton = true,
}: ErrorFallbackProps & { pageName?: string; showHomeButton?: boolean }) {
  const title = pageName ? `Unable to load ${pageName}` : 'Something went wrong';

  return (
    <div className="min-h-screen bg-altivum-dark flex items-center justify-center px-6">
      <div className="max-w-md w-full text-center">
        <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-altivum-gold/10 border-2 border-altivum-gold mb-8">
          <Icon name="error_outline" className="text-altivum-gold text-4xl" />
        </div>

        <h1 className="text-white mb-4" style={typography.sectionHeader}>
          {title}
        </h1>

        <p className="text-altivum-silver mb-8" style={typography.bodyText}>
          We encountered an unexpected error. Please try again.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button
            onClick={onRetry || (() => window.location.reload())}
            className="px-6 py-3 bg-altivum-gold text-altivum-dark font-medium uppercase tracking-wider text-sm hover:bg-white transition-colors duration-300"
          >
            Try Again
          </button>
          {showHomeButton && (
            <Link
              to="/"
              className="px-6 py-3 border border-altivum-gold text-altivum-gold font-medium uppercase tracking-wider text-sm hover:bg-altivum-gold hover:text-altivum-dark transition-colors duration-300"
            >
              Go Home
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
