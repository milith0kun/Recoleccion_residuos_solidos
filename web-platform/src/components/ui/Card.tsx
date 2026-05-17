import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  clickable?: boolean;
}

export function Card({ children, className = '', clickable, ...rest }: CardProps) {
  const classes = ['ui-card', clickable && 'ui-card--clickable', className].filter(Boolean).join(' ');
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export function CardHeader({ title, subtitle, actions }: CardHeaderProps) {
  return (
    <div className="ui-card-header">
      <div>
        <h3 className="text-h3" style={{ marginBottom: subtitle ? 4 : 0 }}>
          {title}
        </h3>
        {subtitle ? (
          <p className="text-small" style={{ color: 'var(--color-text-muted)' }}>
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? <div style={{ display: 'flex', gap: 8 }}>{actions}</div> : null}
    </div>
  );
}
