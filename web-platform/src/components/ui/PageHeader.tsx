import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
}

export function PageHeader({ title, subtitle, actions }: PageHeaderProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 24,
        marginBottom: 40,
        flexWrap: 'wrap',
      }}
    >
      <div style={{ minWidth: 0, flex: 1 }}>
        <h1 className="text-h1" style={{ color: 'var(--color-text)' }}>
          {title}
        </h1>
        {subtitle ? (
          <p
            className="text-body"
            style={{ color: 'var(--color-text-muted)', marginTop: 8, maxWidth: 640 }}
          >
            {subtitle}
          </p>
        ) : null}
      </div>
      {actions ? (
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>{actions}</div>
      ) : null}
    </div>
  );
}
