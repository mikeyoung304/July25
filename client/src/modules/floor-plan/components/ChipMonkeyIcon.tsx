import React from 'react'

interface ChipMonkeyIconProps {
  className?: string
  size?: number
}

export function ChipMonkeyIcon({ className = '', size = 24 }: ChipMonkeyIconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Simple monkey silhouette */}
      <g>
        {/* Head */}
        <circle cx="12" cy="9" r="4.5" />
        {/* Ears */}
        <circle cx="7" cy="8" r="2.5" />
        <circle cx="17" cy="8" r="2.5" />
        {/* Body */}
        <ellipse cx="12" cy="16" rx="3.5" ry="5" />
        {/* Tail */}
        <path d="M15 18 Q20 16 19 11" strokeWidth="1.5" fill="none" stroke="currentColor" />
        {/* Simple face features */}
        <circle cx="10" cy="8.5" r="0.5" fill="white" />
        <circle cx="14" cy="8.5" r="0.5" fill="white" />
      </g>
    </svg>
  )
}