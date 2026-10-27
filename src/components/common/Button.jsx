import React from 'react';

export function Button({
  children,
  variant = 'primary',
  size = 'md',
  type = 'button',
  disabled = false,
  loading = false,
  icon: Icon,
  iconPosition = 'left',
  className = '',
  onClick,
  ...props
}) {
  const baseStyles = 'cloth-btn-base inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-crimson-700/20 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none shrink-0 whitespace-nowrap';

  const sizeStyles = {
    sm: 'text-xs px-4 py-1.5 gap-1.5',
    md: 'text-sm px-5 py-2 gap-2',
    lg: 'text-base px-6 py-2.5 gap-2.5 font-semibold',
  };

  const variantStyles = {
    primary: 'cloth-btn-primary',
    secondary: 'cloth-btn-secondary',
    outline: 'cloth-btn-outline',
    ghost: 'bg-transparent hover:bg-cream-200/70 text-atelier-900 focus:ring-crimson-700/20',
    danger: 'bg-crimson-50 hover:bg-crimson-100 text-crimson-800 border border-crimson-200 focus:ring-crimson-600',
    success: 'bg-cream-100 text-crimson-900 border border-crimson-300 hover:bg-cream-200 focus:ring-crimson-600',
    tech: 'cloth-btn-primary',
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant] || variantStyles.primary} ${className}`}
      onClick={onClick}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      ) : Icon && iconPosition === 'left' ? (
        <Icon className="w-4 h-4 shrink-0" />
      ) : null}
      <span className="relative z-10">{children}</span>
      {!loading && Icon && iconPosition === 'right' && (
        <Icon className="w-4 h-4 shrink-0 relative z-10" />
      )}
    </button>
  );
}
