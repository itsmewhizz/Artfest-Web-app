// Dynamically overlays the active gallery footer (a translucent branding
// strip) slightly ABOVE the bottom edge of a photo. Applied at render time —
// not baked into any image file — so it covers every current and future
// gallery photo without manual editing. Renders nothing when no footer is set.
const BOTTOM_OFFSET_PCT = 3.5

export default function GalleryFooterOverlay({ src, className = '' }) {
  if (!src) return null
  return (
    <div
      className={`pointer-events-none absolute inset-x-0 overflow-hidden ${className}`}
      style={{ bottom: `${BOTTOM_OFFSET_PCT}%` }}
    >
      <img
        src={src}
        alt=""
        draggable={false}
        className="block w-full h-auto max-h-[28%] object-contain object-bottom select-none"
      />
    </div>
  )
}