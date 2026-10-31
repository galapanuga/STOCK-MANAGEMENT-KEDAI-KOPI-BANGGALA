import type { ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

function Svg({ children, ...props }: IconProps & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  )
}

export const IconCoffee = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 9h12v6a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V9Z" />
    <path d="M16 10h2a3 3 0 0 1 0 6h-2" />
    <path d="M7 3.5c0 1.5 1.5 1.5 1.5 3M11.5 3.5c0 1.5 1.5 1.5 1.5 3" />
  </Svg>
)

export const IconGrid = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="3" width="7" height="7" rx="1.5" />
    <rect x="14" y="3" width="7" height="7" rx="1.5" />
    <rect x="3" y="14" width="7" height="7" rx="1.5" />
    <rect x="14" y="14" width="7" height="7" rx="1.5" />
  </Svg>
)

export const IconBox = (p: IconProps) => (
  <Svg {...p}>
    <path d="M21 8.5 12 3 3 8.5v7L12 21l9-5.5v-7Z" />
    <path d="m3.3 8.6 8.7 5.3 8.7-5.3M12 13.9V21" />
  </Svg>
)

export const IconSwap = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 4 3 8l4 4" />
    <path d="M3 8h13a4 4 0 0 1 4 4v1" />
    <path d="m17 20 4-4-4-4" />
    <path d="M21 16H8a4 4 0 0 1-4-4v-1" />
  </Svg>
)

export const IconChart = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 20V4M4 20h16" />
    <path d="M8 16v-4M12 16V8M16 16v-6M20 16v-9" />
  </Svg>
)

export const IconUsers = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3.5 20a5.5 5.5 0 0 1 11 0" />
    <path d="M16 5.3a3.2 3.2 0 0 1 0 6.4M17.5 14.4A5.5 5.5 0 0 1 20.5 20" />
  </Svg>
)

export const IconSettings = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.56V21a2 2 0 1 1-4 0v-.09A1.7 1.7 0 0 0 9 19.36a1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.64 15a1.7 1.7 0 0 0-1.56-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.64 9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.64h.01a1.7 1.7 0 0 0 1-1.56V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.56 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.36 9v.01a1.7 1.7 0 0 0 1.56 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.56 1Z" />
  </Svg>
)

export const IconSearch = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.5" />
    <path d="m16 16 4.5 4.5" />
  </Svg>
)

export const IconPlus = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
)

export const IconEdit = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
  </Svg>
)

export const IconArchive = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="4" width="18" height="4.5" rx="1.2" />
    <path d="M5 8.5V19a1.5 1.5 0 0 0 1.5 1.5h11A1.5 1.5 0 0 0 19 19V8.5" />
    <path d="M10 12.5h4" />
  </Svg>
)

export const IconRestore = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 12a9 9 0 1 0 3-6.7L3 8" />
    <path d="M3 3v5h5" />
  </Svg>
)

export const IconTrash = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12" />
    <path d="M10 11v5M14 11v5" />
  </Svg>
)

export const IconDownload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3v12M8 11l4 4 4-4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </Svg>
)

export const IconUpload = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 16V4M8 8l4-4 4 4" />
    <path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2" />
  </Svg>
)

export const IconPrint = (p: IconProps) => (
  <Svg {...p}>
    <path d="M7 8V3h10v5" />
    <rect x="4" y="8" width="16" height="8" rx="2" />
    <path d="M7 16v5h10v-5M17 11h.01" />
  </Svg>
)

export const IconLogout = (p: IconProps) => (
  <Svg {...p}>
    <path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" />
    <path d="m10 16-4-4 4-4M6 12h10" />
  </Svg>
)

export const IconAlert = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 2.5 20h19L12 3Z" />
    <path d="M12 9v5M12 17.5h.01" />
  </Svg>
)

export const IconCheck = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12.5 9 17.5 20 6.5" />
  </Svg>
)

export const IconX = (p: IconProps) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
)

export const IconMenu = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 6h16M4 12h16M4 18h16" />
  </Svg>
)

export const IconCalendar = (p: IconProps) => (
  <Svg {...p}>
    <rect x="3" y="5" width="18" height="16" rx="2.5" />
    <path d="M8 3v4M16 3v4M3 10h18" />
  </Svg>
)

export const IconWallet = (p: IconProps) => (
  <Svg {...p}>
    <path d="M20 7V6a2 2 0 0 0-2-2H5a2 2 0 0 0 0 4h15v12H5a2 2 0 0 1-2-2V6" />
    <path d="M16 13h2" />
  </Svg>
)

export const IconArrowDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 4v16M6 14l6 6 6-6" />
  </Svg>
)

export const IconArrowUp = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 20V4M6 10l6-6 6 6" />
  </Svg>
)

export const IconArrowRight = (p: IconProps) => (
  <Svg {...p}>
    <path d="M4 12h16M14 6l6 6-6 6" />
  </Svg>
)

export const IconShield = (p: IconProps) => (
  <Svg {...p}>
    <path d="M12 3 5 6v5c0 4.4 3 8.3 7 10 4-1.7 7-5.6 7-10V6l-7-3Z" />
    <path d="m9 12 2 2 4-4" />
  </Svg>
)

export const IconKey = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="8" cy="8" r="4" />
    <path d="m11 11 9 9M17 17l2-2M14 14l2-2" />
  </Svg>
)

export const IconEye = (p: IconProps) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <circle cx="12" cy="12" r="2.8" />
  </Svg>
)

export const IconEyeOff = (p: IconProps) => (
  <Svg {...p}>
    <path d="M3 3l18 18" />
    <path d="M10.6 6c.45-.07.92-.1 1.4-.1 6 0 9.5 6.1 9.5 6.1a17 17 0 0 1-3 3.6M6.3 7.4A17.6 17.6 0 0 0 2.5 12S6 18.1 12 18.1c1.5 0 2.85-.4 4.05-1" />
    <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" />
  </Svg>
)

export const IconChevronDown = (p: IconProps) => (
  <Svg {...p}>
    <path d="m6 9 6 6 6-6" />
  </Svg>
)

export const IconUser = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="4" />
    <path d="M4 21a8 8 0 0 1 16 0" />
  </Svg>
)

export const IconInfo = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 11v5M12 8h.01" />
  </Svg>
)

export const IconTrend = (p: IconProps) => (
  <Svg {...p}>
    <path d="m3 17 6-6 4 4 8-8" />
    <path d="M15 7h6v6" />
  </Svg>
)

export const IconClock = (p: IconProps) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
)
