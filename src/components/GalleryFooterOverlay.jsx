// Dynamically overlays the active gallery footer (a translucent branding
// strip) slightly ABOVE the bottom edge of a photo. Applied at render time —
// not baked into any image file — so it covers every current and future
// gallery photo without manual editing. Renders nothing when no footer is set.
const BOTTOM_OFFSET_PCT = 3.5
const BAND_HEIGHT_PCT = 9

export default function GalleryFooterOverlay({ src, className = '' }) {
  if (!src) return null
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 ${className}`}
      style={{ bottom: `${BOTTOM_OFFSET_PCT}%`, height: `${BAND_HEIGHT_PCT}%` }}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        className="w-full h-full object-contain object-bottom select-none"
      />
    </div>
  )
}