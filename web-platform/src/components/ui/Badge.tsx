import type { HTMLAttributes, ReactNode } from 'react';

type Tone = 'green' | 'amber' | 'rose' | 'blue' | 'neutral';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: Tone;
  withDot?: boolean;
  children: ReactNode;
}

export function Badge({ tone = 'neutral', withDot, children, className = '', ...rest }: BadgeProps) {
  return (
    <span className={`ui-badge ui-badge--${tone} ${className}`} {...rest}>
      {withDot ? <span className="ui-badge-dot" /> : null}
      <span>{children}</span>
    </span>
  );
}
