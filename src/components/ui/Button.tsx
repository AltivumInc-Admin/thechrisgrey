import { Link } from 'react-router-dom';

interface ButtonProps {
  children: React.ReactNode;
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  icon?: string;
  iconPosition?: 'left' | 'right';
  href?: string;
  to?: string;
  external?: boolean;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
  type?: 'button' | 'submit';
}

const variants = {
  primary: 'bg-altivum-gold text-altivum-dark hover:bg-white',
  secondary: 'bg-white/10 text-white hover:bg-white/20',
  outline: 'border border-white/20 text-white hover:border-altivum-gold hover:text-altivum-gold',
  ghost: 'text-altivum-silver hover:text-white',
};

const sizes = {
  sm: 'px-4 py-2 text-sm',
  md: 'px-6 py-3 text-base',
  lg: 'px-8 py-4 text-lg',
};

export const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'right',
  href,
  to,
  external = false,
  onClick,
  disabled = false,
  className = '',
  type = 'button',
}: ButtonProps) => {
  const baseClasses = 'inline-flex items-center justify-center font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-altivum-gold focus:ring-offset-2 focus:ring-offset-altivum-dark disabled:opacity-50 disabled:cursor-not-allowed';
  const variantClasses = variants[variant];
  const sizeClasses = sizes[size];
  const combinedClasses = `${baseClasses} ${variantClasses} ${sizeClasses} ${className}`;

  const iconElement = icon && (
    <span className={`material-icons text-sm ${iconPosition === 'left' ? 'mr-2' : 'ml-2'}`} aria-hidden="true">
      {icon}
    </span>
  );

  const content = (
    <>
      {iconPosition === 'left' && iconElement}
      {children}
      {iconPosition === 'right' && iconElement}
    </>
  );

  // Internal link using React Router
  if (to) {
    return (
      <Link to={to} className={combinedClasses}>
        {content}
      </Link>
    );
  }

  // External link
  if (href) {
    return (
      <a
        href={href}
        className={combinedClasses}
        target={external ? '_blank' : undefined}
        rel={external ? 'noopener noreferrer' : undefined}
      >
        {content}
      </a>
    );
  }

  // Button
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={combinedClasses}
    >
      {content}
    </button>
  );
};
