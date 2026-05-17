import type { HTMLAttributes, ReactNode } from 'react';

type Tone = 'green' | 'amber' | 'rose' | 'blue' | 'ink';
type Size = 'md' | 'lg';

interface IconTileProps extends HTMLAttributes<HTMLDivElement> {
  tone?: Tone;
  size?: Size;
  children: ReactNode;
}

export function IconTile({ tone = 'green', size = 'md', children, className = '', ...rest }: IconTileProps) {
  return (
    <div
      className={`ui-icon-tile ui-icon-tile--${tone} ${size === 'lg' ? 'ui-icon-tile--lg' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
