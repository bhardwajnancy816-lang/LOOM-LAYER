import React from 'react';

export function Card({
  children,
  className = '',
  hoverEffect = false,
  padding = 'p-6',
  ...props
}) {
  return (
    <div
      className={`bg-white rounded-xl border border-stone-200/90 shadow-sm ${
        hoverEffect ? 'transition-all duration-200 hover:shadow-md hover:border-stone-300' : ''
      } ${padding} ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
  className = '',
}) {
  return (
    <div className={`flex items-start justify-between pb-4 border-b border-stone-200/80 ${className}`}>
      <div>
        <h3 className="font-semibold text-stone-900 text-base sm:text-lg">{title}</h3>
        {subtitle && <p className="text-xs sm:text-sm text-stone-500 mt-0.5">{subtitle}</p>}
      </div>
      {action && <div className="ml-4 shrink-0">{action}</div>}
    </div>
  );
}
