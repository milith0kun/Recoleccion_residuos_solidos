import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react';

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
  hint?: ReactNode;
  error?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, className = '', id, ...rest },
  ref
) {
  const inputId = id ?? rest.name;
  return (
    <div className="ui-field">
      {label ? (
        <label className="ui-label" htmlFor={inputId}>
          {label}
        </label>
      ) : null}
      <input ref={ref} id={inputId} className={`ui-input ${className}`} {...rest} />
      {hint && !error ? <span className="ui-hint">{hint}</span> : null}
      {error ? <span className="ui-hint" style={{ color: 'var(--color-rose-500)' }}>{error}</span> : null}
    </div>
  );
});
