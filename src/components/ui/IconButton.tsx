import Icon from '../icons/Icon';
interface IconButtonProps {
  icon: string;
  label: string;
  onClick?: () => void;
  href?: string;
  className?: string;
}

export const IconButton = ({ icon, label, onClick, href, className = '' }: IconButtonProps) => {
  const baseClasses = 'p-2 rounded-md transition-colors focus:outline-hidden focus:ring-2 focus:ring-altivum-gold';

  if (href) {
    return (
      <a
        href={href}
        aria-label={label}
        className={`${baseClasses} ${className}`}
        target="_blank"
        rel="noopener noreferrer"
      >
        <Icon name={icon} aria-hidden="true" />
      </a>
    );
  }

  return (
    <button onClick={onClick} aria-label={label} className={`${baseClasses} ${className}`}>
      <Icon name={icon} aria-hidden="true" />
    </button>
  );
};
