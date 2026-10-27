import React from 'react';
import { AlertCircle, RotateCcw, UploadCloud } from 'lucide-react';
import { Button } from './Button';

/**
 * Standard React Error Boundary component
 * Catches runtime JavaScript errors in child component trees, logs them,
 * and displays a recoverable fallback UI instead of crashing the whole page.
 */
export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error(`[ErrorBoundary] Caught error in ${this.props.componentName || 'component'}:`, error, errorInfo);
    if (typeof this.props.onError === 'function') {
      this.props.onError(error, errorInfo);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    if (typeof this.props.onReset === 'function') {
      this.props.onReset();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return typeof this.props.fallback === 'function'
          ? this.props.fallback(this.state.error, this.handleReset)
          : this.props.fallback;
      }

      return (
        <div className={`p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-3 ${this.props.className || ''}`}>
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="font-bold text-sm text-amber-900">
                {this.props.title || 'Component Error'}
              </h4>
              <p className="leading-relaxed text-amber-800">
                {this.props.message || this.state.error?.message || 'An unexpected error occurred in this module.'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 pt-1 border-t border-amber-200">
            <Button
              variant="outline"
              size="sm"
              icon={RotateCcw}
              onClick={this.handleReset}
            >
              Retry
            </Button>
            {this.props.onFallbackAction && (
              <Button
                variant="primary"
                size="sm"
                icon={this.props.fallbackActionIcon || UploadCloud}
                onClick={this.props.onFallbackAction}
              >
                {this.props.fallbackActionLabel || 'Use Alternative'}
              </Button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
