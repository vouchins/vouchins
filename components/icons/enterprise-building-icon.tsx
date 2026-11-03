import React from 'react';

export interface EnterpriseBuildingIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
}

export function EnterpriseBuildingIcon({
  size,
  className = '',
  ...props
}: EnterpriseBuildingIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size || '1em'}
      height={size || '1em'}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...props}
    >
      {/* Foundation ground baseline */}
      <path d="M2 21.5h20" />

      {/* Primary Executive Corporate High-Rise */}
      <path d="M5 21.5V5a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v16.5" />

      {/* Architectural crown / spire */}
      <path d="M10 3V1.5" />

      {/* Secondary Corporate Wing */}
      <path d="M15 9.5h3.5a1.5 1.5 0 0 1 1.5 1.5v10.5" />

      {/* Modern architectural glass mullions & window lines */}
      <path d="M8 7h4" />
      <path d="M8 10.5h4" />
      <path d="M8 14h4" />

      {/* Secondary wing window points */}
      <path d="M17.5 13.5h.01" strokeWidth="2.5" />
      <path d="M17.5 17h.01" strokeWidth="2.5" />

      {/* Executive entrance portal */}
      <path d="M8.5 21.5v-2.5a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v2.5" />
    </svg>
  );
}

export default EnterpriseBuildingIcon;

