/**
 * Surface Component
 * Base container component with elevation variants
 */

import type { SurfaceProps } from '../../types';
import './Surface.css';

export default function Surface({
  children,
  variant = 'flat',
  padding = 'md',
  className = '',
  style,
}: SurfaceProps) {
  const classNames = [
    'surface',
    `surface--${variant}`,
    `surface--padding-${padding}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={classNames} style={style}>
      {children}
    </div>
  );
}
