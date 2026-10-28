import type { CSSProperties } from 'react';
import { cx } from '../cx';

export interface IconProps {
  /** Material Symbols ligature, e.g. "menu_book". */
  name: string;
  /** Filled glyph, used for the active navigation item. */
  filled?: boolean;
  size?: number;
  className?: string;
  /** Accessible name. Without it the icon is decorative and hidden from assistive tech. */
  label?: string;
}

export function Icon({ name, filled = false, size, className, label }: IconProps) {
  const style: CSSProperties = {
    ...(size !== undefined && { fontSize: size }),
    ...(filled && { fontVariationSettings: "'FILL' 1" }),
  };
  return (
    <span
      className={cx('material-symbols-outlined', className)}
      style={style}
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
    >
      {name}
    </span>
  );
}
