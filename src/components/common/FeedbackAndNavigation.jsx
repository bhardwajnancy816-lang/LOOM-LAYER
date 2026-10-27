import React from 'react';
import { Check, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const STEPS = [
  { number: 1, name: 'Roll Specs', path: 'new', subpath: '' },
  { number: 2, name: 'Garment Pieces', path: 'patterns', subpath: '/patterns' },
  { number: 3, name: 'Marker Nesting', path: 'optimize', subpath: '/optimize' },
  { number: 4, name: 'Cut Plan', path: 'result', subpath: '/result' },
];

export function StepIndicator({ currentStep = 1, projectId = null, onStepClick }) {
  const navigate = useNavigate();

  const handleStepNavigation = (step) => {
    if (onStepClick) {
      onStepClick(step.number);
      return;
    }

    if (!projectId) return;

    if (step.number === 1) {
      navigate(`/project/new`);
    } else if (step.number === 2) {
      navigate(`/project/${projectId}/patterns`);
    } else if (step.number === 3) {
      navigate(`/project/${projectId}/optimize`);
    } else if (step.number === 4) {
      navigate(`/project/${projectId}/result`);
    }
  };

  return (
    <nav aria-label="Progress" className="w-full max-w-3xl mx-auto my-6 px-4">
      <ol className="flex items-center justify-between">
        {STEPS.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const isClickable = isCompleted || isCurrent || (projectId && step.number <= currentStep + 1);

          return (
            <li key={step.name} className="relative flex-1 flex items-center">
              <div
                onClick={() => isClickable && handleStepNavigation(step)}
                className={`group flex items-center gap-2.5 sm:gap-3 select-none ${
                  isClickable ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-mono transition-all duration-200 ${
                    isCompleted
                      ? 'bg-crimson-700 text-white ring-4 ring-crimson-100'
                      : isCurrent
                      ? 'bg-atelier-900 text-white ring-4 ring-cream-300'
                      : 'bg-white text-stone-400 border border-stone-300 group-hover:border-stone-400'
                  }`}
                >
                  {isCompleted ? <Check className="w-4 h-4 stroke-[2.5]" /> : step.number}
                </div>
                <div className="hidden sm:block text-left">
                  <p
                    className={`text-xs font-mono font-medium ${
                      isCurrent ? 'text-crimson-800 font-bold' : isCompleted ? 'text-stone-800' : 'text-stone-400'
                    }`}
                  >
                    Step 0{step.number}
                  </p>
                  <p
                    className={`text-xs font-semibold ${
                      isCurrent ? 'text-stone-900' : isCompleted ? 'text-stone-700' : 'text-stone-400'
                    }`}
                  >
                    {step.name}
                  </p>
                </div>
              </div>

              {index < STEPS.length - 1 && (
                <div className="flex-1 mx-2 sm:mx-4 h-0.5 bg-stone-200">
                  <div
                    className={`h-full transition-all duration-300 ${
                      step.number < currentStep ? 'bg-crimson-700' : 'bg-transparent'
                    }`}
                  />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

export function StatusBadge({ status = 'Draft', className = '' }) {
  const styles = {
    Completed: 'bg-crimson-50 text-crimson-800 border-crimson-200',
    'In-Progress': 'bg-stone-100 text-stone-800 border-stone-300 animate-pulse',
    Optimizing: 'bg-amber-50 text-amber-800 border-amber-200',
    Draft: 'bg-cream-100 text-stone-600 border-stone-200',
    Pending: 'bg-amber-50 text-amber-700 border-amber-200',
  };

  const currentStyle = styles[status] || styles.Draft;

  return (
    <span
      className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-mono font-medium border ${currentStyle} ${className}`}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
          status === 'Completed'
            ? 'bg-crimson-700'
            : status === 'Optimizing' || status === 'In-Progress'
            ? 'bg-amber-600'
            : status === 'Pending'
            ? 'bg-amber-500'
            : 'bg-stone-400'
        }`}
      />
      {status}
    </span>
  );
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className = '',
}) {
  return (
    <div className={`text-center py-12 px-4 rounded-xl border border-dashed border-cream-400 bg-cream-50/60 ${className}`}>
      {Icon && (
        <div className="mx-auto w-12 h-12 rounded-lg bg-cream-200/70 border border-cream-300 flex items-center justify-center text-stone-600 mb-4">
          <Icon className="w-6 h-6" />
        </div>
      )}
      <h3 className="text-sm font-semibold text-stone-800">{title}</h3>
      {description && <p className="mt-1 text-xs text-stone-500 max-w-sm mx-auto">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-atelier-950/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className={`relative w-full ${maxWidth} bg-cream-25 rounded-2xl border border-cream-300 shadow-xl overflow-hidden animate-in fade-in zoom-in-95`}>
        <div className="flex items-start justify-between p-5 border-b border-cream-200 bg-cream-100/60">
          <div>
            <h3 className="text-lg font-bold text-atelier-950 font-sans">{title}</h3>
            {subtitle && <p className="text-xs text-stone-500 mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-stone-400 hover:text-crimson-800 hover:bg-cream-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-5 sm:p-6 bg-white">
          {children}
        </div>
      </div>
    </div>
  );
}
