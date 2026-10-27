import React from 'react';

export function MetricCard({
  title,
  value,
  unit = '',
  subtitle,
  icon: Icon,
  trend,
  trendLabel,
  trendDirection = 'up', // 'up' | 'down' | 'neutral'
  variant = 'default', // 'default' | 'crimson' | 'bordeaux' | 'amber' | 'emerald'
  className = '',
}) {
  const variantStyles = {
    default: {
      bg: 'bg-white',
      border: 'border-stone-200/90',
      iconBg: 'bg-stone-100 text-stone-700',
      valueColor: 'text-stone-900',
    },
    crimson: {
      bg: 'bg-crimson-50/50',
      border: 'border-crimson-200/80',
      iconBg: 'bg-crimson-100 text-crimson-800',
      valueColor: 'text-crimson-950',
    },
    bordeaux: {
      bg: 'bg-red-50/40',
      border: 'border-red-200/80',
      iconBg: 'bg-red-100 text-red-800',
      valueColor: 'text-red-950',
    },
    emerald: {
      bg: 'bg-stone-50',
      border: 'border-stone-200',
      iconBg: 'bg-crimson-50 text-crimson-700',
      valueColor: 'text-crimson-900',
    },
    amber: {
      bg: 'bg-amber-50/40',
      border: 'border-amber-200/80',
      iconBg: 'bg-amber-100 text-amber-800',
      valueColor: 'text-amber-950',
    },
  };

  const currentVariant = variantStyles[variant] || variantStyles.default;

  return (
    <div
      className={`rounded-xl border shadow-sm p-5 transition-all duration-200 hover:shadow-md ${currentVariant.bg} ${currentVariant.border} ${className}`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-wider text-stone-500 font-mono">
          {title}
        </p>
        {Icon && (
          <div className={`p-2 rounded-lg ${currentVariant.iconBg}`}>
            <Icon className="w-4 h-4" />
          </div>
        )}
      </div>

      <div className="mt-3 flex items-baseline gap-1.5">
        <span className={`text-2xl sm:text-3xl font-bold tracking-tight font-mono ${currentVariant.valueColor}`}>
          {value}
        </span>
        {unit && <span className="text-sm font-medium text-stone-500">{unit}</span>}
      </div>

      {(trend || subtitle) && (
        <div className="mt-2.5 flex items-center justify-between text-xs">
          {trend && (
            <span
              className={`inline-flex items-center gap-1 font-mono font-medium px-1.5 py-0.5 rounded ${
                trendDirection === 'up'
                  ? 'text-crimson-800 bg-crimson-100/80'
                  : trendDirection === 'down'
                  ? 'text-amber-800 bg-amber-100/70'
                  : 'text-stone-600 bg-stone-100'
              }`}
            >
              {trend}
              {trendLabel && <span className="text-stone-500 font-normal">{trendLabel}</span>}
            </span>
          )}
          {subtitle && (
            <span className="text-stone-500 truncate max-w-full">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
