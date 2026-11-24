/**
 * Icons and logo (M6c, spec R20). Our own drawings: 24 × 24 grid, 2 px round
 * stroke in currentColor, so they follow text colour, disabled state and
 * theme. One icon per action, used the same way everywhere.
 */
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { ICONS, type IconName } from './iconPaths'

export type { IconName }

export function Icon({ name }: { name: IconName }) {
  return (
    <svg
      className="icon"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      data-icon={name}
    >
      <path d={ICONS[name]} />
    </svg>
  )
}

/** R20.AC1: a button with its icon before the text. */
export function Button({
  icon,
  children,
  type = 'button',
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  icon: IconName
  children?: ReactNode
}) {
  return (
    <button type={type} {...props}>
      <Icon name={icon} />
      {children}
    </button>
  )
}

/** labelcraft logo (R20.AC4): a sticker peeling at the corner. */
export function Logo({ size = 24 }: { size?: number }) {
  return (
    <svg
      className="logo"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path d="M4 5h16v9l-5 5H4z M20 14c-3 0-5 2-5 5 M8 9h8 M8 12h5" />
      <path
        d="M15 19c0-2.5 2-5 5-5z"
        fill="currentColor"
        fillOpacity={0.25}
        stroke="none"
      />
    </svg>
  )
}
