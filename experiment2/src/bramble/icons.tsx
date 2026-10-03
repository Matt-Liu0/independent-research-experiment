// Small line icons matching the mockups (24px grid, 1.8px stroke).
import type { SVGProps } from 'react'

const base: SVGProps<SVGSVGElement> = {
  width: 24,
  height: 24,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
  'aria-hidden': true,
}

export const CartIcon = () => (
  <svg {...base}>
    <path d="M3 4h2l2.4 11h10.2L20 8H6.2" />
    <circle cx="9" cy="19" r="1.3" />
    <circle cx="17" cy="19" r="1.3" />
  </svg>
)

export const BagIcon = () => (
  <svg {...base}>
    <path d="M5 8h14l-1 12H6L5 8Z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </svg>
)

export const TagIcon = () => (
  <svg {...base}>
    <path d="M3 12V4h8l9 9-8 8-9-9Z" />
    <circle cx="7.5" cy="8.5" r="1.3" />
  </svg>
)

export const GiftIcon = () => (
  <svg {...base}>
    <rect x="4" y="9" width="16" height="11" rx="1" />
    <path d="M3 9h18v-2H3v2ZM12 7v13M12 7c-1.5-3-5-3-5-1s5 1 5 1Zm0 0c1.5-3 5-3 5-1s-5 1-5 1Z" />
  </svg>
)

export const ReceiptIcon = () => (
  <svg {...base}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
    <path d="M9 8h6M9 12h6" />
  </svg>
)

export const UserIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" />
  </svg>
)

export const PinIcon = () => (
  <svg {...base}>
    <path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21Z" />
    <circle cx="12" cy="9.5" r="2.5" />
  </svg>
)

export const ClockIcon = () => (
  <svg {...base}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
)

export const PeopleIcon = () => (
  <svg {...base}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 19c.8-3 3.2-5 6-5s5.2 2 6 5M16 5a3 3 0 0 1 0 6M18 14c1.5.6 2.6 2.4 3 5" />
  </svg>
)

export const HeartIcon = ({ filled }: { filled?: boolean }) => (
  <svg {...base} fill={filled ? 'currentColor' : 'none'}>
    <path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10C19.5 15.4 12 20 12 20Z" />
  </svg>
)

export const SearchIcon = () => (
  <svg {...base}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4 4" />
  </svg>
)

export const BackIcon = () => (
  <svg {...base}>
    <path d="m15 5-7 7 7 7" />
  </svg>
)

export const CheckIcon = () => (
  <svg {...base} strokeWidth={2.4}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
)

export const ChatIcon = () => (
  <svg {...base}>
    <path d="M5 5h14v11H9l-4 3V5Z" />
  </svg>
)
