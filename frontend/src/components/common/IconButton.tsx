/**
 * IconButton Component
 * Accessible button with icon for player controls and actions
 */

import type { IconButtonProps } from '../../types';
import './IconButton.css';

export default function IconButton({
  icon,
  onClick,
  disabled = false,
  variant = 'ghost',
  size = 'md',
  ariaLabel,
  className = '',
  style,
}: IconButtonProps) {
  const classNames = [
    'icon-button',
    `icon-button--${variant}`,
    `icon-button--${size}`,
    disabled && 'icon-button--disabled',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={classNames}
      style={style}
    >
      {icon}
    </button>
  );
}
