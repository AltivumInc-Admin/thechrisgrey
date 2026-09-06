import { typography } from '../../utils/typography';
import Icon from '../icons/Icon';

export interface ForgetStatus {
  ok: boolean;
  message: string;
}

interface ForgetStatusBannerProps {
  /** Null renders nothing — the banner only exists after a forget attempt. */
  status: ForgetStatus | null;
  onDismiss: () => void;
  /** Layout hook for the surface hosting it (the widget needs `shrink-0`). */
  className?: string;
}

/**
 * Outcome of the destructive forget-me action, in the site's own UI.
 *
 * Extracted so both surfaces that call handleForgetMemory report through the
 * same component: /chat used to answer a privacy action with window.confirm
 * followed by window.alert — the only alert() calls anywhere in src — while the
 * widget already had this designed, dismissible banner.
 */
const ForgetStatusBanner = ({ status, onDismiss, className = '' }: ForgetStatusBannerProps) => {
  if (!status) return null;

  return (
    <div
      className={`px-4 py-2 border-b border-white/10 bg-altivum-dark/60 backdrop-blur-xs ${className}`}
      role="status"
      aria-live="polite"
    >
      <p
        className={`flex items-start gap-2 text-xs ${status.ok ? 'text-altivum-silver' : 'text-red-300'}`}
        style={typography.smallText}
      >
        <Icon name={status.ok ? 'check' : 'error_outline'} className="text-sm mt-0.5 shrink-0" aria-hidden="true" />
        <span>{status.message}</span>
        <button
          onClick={onDismiss}
          className="ml-auto -mt-0.5 p-0.5 text-altivum-silver/60 hover:text-white rounded-sm transition-colors duration-200"
          aria-label="Dismiss notice"
        >
          <Icon name="close" className="text-sm" />
        </button>
      </p>
    </div>
  );
};

export default ForgetStatusBanner;
