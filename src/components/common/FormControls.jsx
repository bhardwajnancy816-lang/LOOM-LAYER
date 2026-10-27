import React from 'react';

export function Input({
  label,
  id,
  type = 'text',
  value,
  onChange,
  placeholder,
  hint,
  error,
  required = false,
  disabled = false,
  unit,
  className = '',
  ...props
}) {
  const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={inputId} className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5 font-mono">
          {label} {required && <span className="text-crimson-600">*</span>}
        </label>
      )}
      <div className="relative rounded-lg shadow-sm">
        <input
          id={inputId}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
          required={required}
          className={`block w-full rounded-lg border text-sm transition-colors py-2.5 px-3.5 text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-crimson-600/20 focus:border-crimson-700 disabled:bg-stone-50 disabled:text-stone-400 ${
            unit ? 'pr-12' : ''
          } ${error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' : 'border-stone-300 hover:border-stone-400 bg-white'} ${className}`}
          {...props}
        />
        {unit && (
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3.5">
            <span className="text-xs font-mono font-medium text-stone-500 bg-stone-100 px-1.5 py-0.5 rounded border border-stone-200">{unit}</span>
          </div>
        )}
      </div>
      {hint && !error && <p className="mt-1.5 text-xs text-stone-500">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-rose-600 font-medium">{error}</p>}
    </div>
  );
}

export function Select({
  label,
  id,
  value,
  onChange,
  options = [],
  hint,
  error,
  required = false,
  disabled = false,
  className = '',
  ...props
}) {
  const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-1.5 font-mono">
          {label} {required && <span className="text-crimson-600">*</span>}
        </label>
      )}
      <div className="relative rounded-lg shadow-sm">
        <select
          id={selectId}
          value={value}
          onChange={onChange}
          disabled={disabled}
          required={required}
          className={`block w-full rounded-lg border text-sm transition-colors py-2.5 px-3.5 text-stone-900 focus:outline-none focus:ring-2 focus:ring-crimson-600/20 focus:border-crimson-700 disabled:bg-stone-50 disabled:text-stone-400 bg-white ${
            error ? 'border-rose-300 focus:border-rose-500 focus:ring-rose-200' : 'border-stone-300 hover:border-stone-400'
          } ${className}`}
          {...props}
        >
          {options.map((opt) => (
            <option key={opt.value ?? opt} value={opt.value ?? opt}>
              {opt.label ?? opt}
            </option>
          ))}
        </select>
      </div>
      {hint && !error && <p className="mt-1.5 text-xs text-stone-500">{hint}</p>}
      {error && <p className="mt-1.5 text-xs text-rose-600 font-medium">{error}</p>}
    </div>
  );
}

export function RangeSlider({
  label,
  id,
  min = 0,
  max = 100,
  step = 1,
  value,
  onChange,
  unit = '',
  hint,
  disabled = false,
}) {
  const sliderId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-1.5">
        {label && (
          <label htmlFor={sliderId} className="block text-xs font-semibold uppercase tracking-wider text-stone-700 font-mono">
            {label}
          </label>
        )}
        <span className="text-sm font-bold text-crimson-800 font-mono">
          {value} {unit}
        </span>
      </div>
      <input
        id={sliderId}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full h-2 bg-stone-200 rounded-lg appearance-none cursor-pointer accent-crimson-700 disabled:opacity-50 disabled:cursor-not-allowed"
      />
      {hint && <p className="mt-1 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}

export function Toggle({
  label,
  description,
  checked,
  onChange,
  disabled = false,
  id,
}) {
  const toggleId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

  return (
    <div className="flex items-start justify-between gap-4 py-2">
      <div>
        <label htmlFor={toggleId} className="text-sm font-semibold text-stone-800 cursor-pointer select-none">
          {label}
        </label>
        {description && <p className="text-xs text-stone-500 mt-0.5">{description}</p>}
      </div>
      <button
        id={toggleId}
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-crimson-600 focus:ring-offset-2 ${
          checked ? 'bg-crimson-700' : 'bg-stone-200'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
            checked ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

export function RadioGroup({
  label,
  options = [],
  value,
  onChange,
  hint,
}) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-stone-700 mb-2 font-mono">
          {label}
        </label>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {options.map((option) => {
          const isSelected = value === option.value;
          return (
            <div
              key={option.value}
              onClick={() => onChange(option.value)}
              className={`flex items-start gap-3 p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                isSelected
                  ? 'border-crimson-700 bg-crimson-50/40 ring-1 ring-crimson-700'
                  : 'border-stone-200 hover:border-stone-300 bg-white'
              }`}
            >
              <div className="pt-0.5">
                <div
                  className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-crimson-700 bg-crimson-700' : 'border-stone-300 bg-white'
                  }`}
                >
                  {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                </div>
              </div>
              <div>
                <p className={`text-sm font-semibold ${isSelected ? 'text-crimson-950' : 'text-stone-900'}`}>
                  {option.label}
                </p>
                {option.description && (
                  <p className="text-xs text-stone-500 mt-0.5">{option.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      {hint && <p className="mt-2 text-xs text-stone-500">{hint}</p>}
    </div>
  );
}
