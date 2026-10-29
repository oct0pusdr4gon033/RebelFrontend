import React from 'react';
import { iconPaths } from './iconPaths';
import type { GoogleIconProps } from './GoogleIconProps';

export const GoogleIcon: React.FC<GoogleIconProps> = ({
  name,
  size = 20,
  color = 'currentColor',
  className = '',
  style,
  ...rest
}) => {
  const path = iconPaths[name];

  if (!path) {
    // Si no está en el mapa SVG directo, utiliza la clase de Google Fonts Material Symbols
    return (
      <span
        className={`material-symbols-rounded ${className}`}
        style={{
          fontSize: typeof size === 'number' ? `${size}px` : size,
          color,
          lineHeight: 1,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          verticalAlign: 'middle',
          ...style,
        }}
      >
        {name}
      </span>
    );
  }

  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill={color}
      className={`google-icon ${className}`}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}
      aria-hidden="true"
      {...rest}
    >
      <path d={path} />
    </svg>
  );
};

export default GoogleIcon;
