/**
 * Divider Component
 * Visual separator between sections
 */

import type { CommonComponentProps } from '../../types';
import './Divider.css';

interface DividerProps extends CommonComponentProps {
  orientation?: 'horizontal' | 'vertical';
  spacing?: 'sm' | 'md' | 'lg';
}

export default function Divider({
  orientation = 'horizontal',
  spacing = 'md',
  className = '',
  style,
}: DividerProps) {
  const classNames = [
    'divider',
    `divider--${orientation}`,
    `divider--spacing-${spacing}`,
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={classNames} style={style} role="separator" />;
}
