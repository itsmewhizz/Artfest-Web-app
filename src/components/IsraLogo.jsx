import { useId } from 'react'

const BG_START = '#115F32' // --accent-purple #7C4DFF
const BG_END = '#228C22' // --accent-purple-deep #5E35B1
const ACCENT = '#D4FFB8' // --accent-purple-soft #EDE7F6
const TEXT_LIGHT = 'rgb(255 255 255)' // #FFFFFF
const TEXT_MUTED = '#8ED06C' // --card-lavender #E8DCF4

function Badge({ uid, children }) {
  return (
    <>
      <defs>
        <linearGradient id={uid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={BG_START} />
          <stop offset="1" stopColor={BG_END} />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="96" height="96" rx="24" fill={`url(#${uid})`} />
      <rect
        x="2"
        y="2"
        width="96"
        height="96"
        rx="24"
        fill="none"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="2"
      />
      <rect
        x="11"
        y="11"
        width="78"
        height="78"
        rx="19"
        fill="none"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1.5"
      />
      {children}
    </>
  )
}

export default function IsraLogo({ variant = 'full', className = '', style, ...props }) {
  const rawId = useId()
  const uid = `isra-${rawId.replace(/[^a-zA-Z0-9]/g, '')}`
  const common = {
    viewBox: '0 0 100 100',
    className,
    style,
    role: 'img',
    'aria-label': 'ISRA Rendezvous Artfest',
    ...props,
  }

  if (variant === 'mark') {
    return (
      <svg {...common}>
        <Badge uid={uid}>
          <rect x="45" y="24" width="10" height="50" rx="5" fill={TEXT_LIGHT} />
          <rect x="38" y="18" width="24" height="8" rx="4" fill={TEXT_LIGHT} />
          <rect x="38" y="72" width="24" height="8" rx="4" fill={TEXT_LIGHT} />
          <rect x="41" y="84" width="18" height="4.5" rx="2.25" fill={ACCENT} />
        </Badge>
      </svg>
    )
  }

  return (
    <svg {...common}>
      <Badge uid={uid}>
        <text
          x="50"
          y="44"
          textAnchor="middle"
          fontFamily="Sora, sans-serif"
          fontSize="26"
          fontWeight="900"
          letterSpacing="1"
          fill={TEXT_LIGHT}
        >
          ISRA
        </text>
        <text
          x="50"
          y="60"
          textAnchor="middle"
          fontFamily="Sora, sans-serif"
          fontSize="7.2"
          fontWeight="700"
          letterSpacing="2.4"
          fill={ACCENT}
        >
          RENDEZVOUS
        </text>
        <text
          x="50"
          y="73"
          textAnchor="middle"
          fontFamily="Sora, sans-serif"
          fontSize="5.6"
          fontWeight="600"
          letterSpacing="3"
          fill={TEXT_MUTED}
        >
          ARTFEST
        </text>
      </Badge>
    </svg>
  )
}
