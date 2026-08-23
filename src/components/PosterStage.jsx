import { useRef, useState } from 'react'
import { canvasFor, FONT_FAMILY_CSS, elementText, elementRows } from '../utils/posterTemplates'

const clamp = (v, min, max) => Math.min(Math.max(v, min), max)
const SNAP_THRESHOLD = 6

export default function PosterStage({
  template,
  source,
  scale = 0.5,
  editable = false,
  selectedId = null,
  onSelect,
  onChangeElement,
  captureRef,
  showGrid = false,
}) {
  const previewWrapRef = useRef(null)
  const dragRef = useRef(null)
  const [snapGuides, setSnapGuides] = useState({ x: null, y: null })

  if (!template) return null

  const { width: W, height: H } = canvasFor(template)

  const bgStyle = (() => {
    const bg = template.background || { kind: 'solid', color: '#5E35B1', gradient: '', imageUrl: '' }
    if (bg.kind === 'image' && bg.imageUrl) {
      return {
        backgroundColor: bg.color || '#5E35B1',
        backgroundImage: `url(${bg.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }
    }
    if (bg.kind === 'gradient' && bg.gradient) {
      return { backgroundImage: bg.gradient }
    }
    return { backgroundColor: bg.color || '#5E35B1' }
  })()

  // The base text style shared by every element.
  const baseTextStyle = (el) => ({
    color: el.fontColor,
    fontFamily: FONT_FAMILY_CSS[el.fontFamily] || FONT_FAMILY_CSS.Sora,
    fontSize: el.fontSize,
    fontWeight: el.fontWeight,
    textAlign: el.textAlign,
    textTransform: el.textTransform || 'none',
    lineHeight: el.lineHeight ?? 1.15,
  })

  // Element box content. `interactive` adds drag/resize affordances and must be
  // placed on a stable, absolutely-positioned box (not a nested absolute div).
  const renderElement = (el, _i, interactive = false) => {
    const rows = elementRows(el, source)
    const boxStyle = {
      position: 'absolute',
      left: el.x,
      top: el.y,
      width: el.width,
      height: el.height,
      boxSizing: 'border-box',
      transform: el.rotation ? `rotate(${el.rotation}deg)` : 'none',
      transformOrigin: 'center center',
      ...(interactive ? { touchAction: 'none', cursor: 'move' } : {}),
    }
    const alignFlex = () => el.textAlign === 'center' ? 'center' : el.textAlign === 'right' ? 'flex-end' : 'flex-start'

    const content = rows > 1 ? (
      <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column' }}>
        {Array.from({ length: rows }, (_, r) => (
          <div
            key={r}
            style={{
              flex: '1 1 0%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: alignFlex(),
              overflow: 'hidden',
              padding: '0 2px',
              ...baseTextStyle(el),
            }}
          >
            <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'pre-wrap', width: '100%' }}>
              {elementText(el, source, r + 1)}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: alignFlex(),
          overflow: 'hidden',
          ...baseTextStyle(el),
        }}
      >
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'pre-wrap' }}>
          {elementText(el, source, 1)}
        </div>
      </div>
    )

    if (!interactive) {
      return (
        <div key={el.id} style={boxStyle}>
          {content}
        </div>
      )
    }

    const selected = selectedId === el.id
    return (
      <div
        key={el.id}
        style={boxStyle}
        onPointerDown={(e) => {
          e.stopPropagation()
          e.preventDefault()
          onSelect?.(el.id)
          startMove(e, el)
        }}
      >
        {content}
        {selected && (
          <>
            <div style={{ position: 'absolute', inset: 0, border: '1.5px solid #7C4DFF', pointerEvents: 'none' }} />
            <div
              onPointerDown={(e) => {
                e.stopPropagation()
                e.preventDefault()
                startResize(e, el)
              }}
              style={{
                position: 'absolute',
                right: -5,
                bottom: -5,
                width: 14,
                height: 14,
                background: '#7C4DFF',
                border: '2px solid #FFFFFF',
                borderRadius: 2,
                cursor: 'nwse-resize',
                touchAction: 'none',
              }}
            />
          </>
        )}
      </div>
    )
  }

  const posterContent = (interactive) => (
    <div className="poster-root" style={{ position: 'relative', width: W, height: H, overflow: 'hidden', ...bgStyle }}>
      {template.elements.map((el, i) => renderElement(el, i, interactive))}
    </div>
  )

  // Drag / resize helpers (canvas coordinates).
  const startMove = (e, el) => {
    dragRef.current = {
      mode: 'move',
      elId: el.id,
      startX: e.clientX,
      startY: e.clientY,
      orig: { x: el.x, y: el.y, width: el.width, height: el.height },
    }
    bindDrag()
  }

  const startResize = (e, el) => {
    dragRef.current = {
      mode: 'resize',
      elId: el.id,
      startX: e.clientX,
      startY: e.clientY,
      orig: { x: el.x, y: el.y, width: el.width, height: el.height },
    }
    bindDrag()
  }

  const bindDrag = () => {
    window.addEventListener('pointermove', handleDragMove)
    window.addEventListener('pointerup', endDrag)
    window.addEventListener('pointercancel', endDrag)
  }

  const unbindDrag = () => {
    window.removeEventListener('pointermove', handleDragMove)
    window.removeEventListener('pointerup', endDrag)
    window.removeEventListener('pointercancel', endDrag)
  }

  const handleDragMove = (e) => {
    const d = dragRef.current
    if (!d) return
    const rect = previewWrapRef.current?.getBoundingClientRect()
    if (!rect) return
    const dx = (e.clientX - d.startX) / scale
    const dy = (e.clientY - d.startY) / scale
    const patch = {}

    if (d.mode === 'move') {
      let rawX = clamp(d.orig.x + dx, 0, W - d.orig.width)
      let rawY = clamp(d.orig.y + dy, 0, H - d.orig.height)

      let snapX = null
      let snapY = null

      // Build target alignment lines from canvas center & other elements
      const targetXs = [W / 2]
      const targetYs = [H / 2]

      template.elements.forEach(other => {
        if (other.id === d.elId) return
        targetXs.push(other.x, other.x + other.width, other.x + other.width / 2)
        targetYs.push(other.y, other.y + other.height, other.y + other.height / 2)
      })

      // Check X snap (left, center, right)
      const myCenterX = rawX + d.orig.width / 2
      const myRightX = rawX + d.orig.width

      for (const tx of targetXs) {
        if (Math.abs(rawX - tx) < SNAP_THRESHOLD) {
          rawX = tx
          snapX = tx
          break
        }
        if (Math.abs(myCenterX - tx) < SNAP_THRESHOLD) {
          rawX = tx - d.orig.width / 2
          snapX = tx
          break
        }
        if (Math.abs(myRightX - tx) < SNAP_THRESHOLD) {
          rawX = tx - d.orig.width
          snapX = tx
          break
        }
      }

      // Check Y snap (top, center, bottom)
      const myCenterY = rawY + d.orig.height / 2
      const myBottomY = rawY + d.orig.height

      for (const ty of targetYs) {
        if (Math.abs(rawY - ty) < SNAP_THRESHOLD) {
          rawY = ty
          snapY = ty
          break
        }
        if (Math.abs(myCenterY - ty) < SNAP_THRESHOLD) {
          rawY = ty - d.orig.height / 2
          snapY = ty
          break
        }
        if (Math.abs(myBottomY - ty) < SNAP_THRESHOLD) {
          rawY = ty - d.orig.height
          snapY = ty
          break
        }
      }

      setSnapGuides({ x: snapX, y: snapY })
      patch.x = Math.round(rawX)
      patch.y = Math.round(rawY)
    } else {
      setSnapGuides({ x: null, y: null })
      patch.width = clamp(d.orig.width + dx, 24, W - d.orig.x)
      patch.height = clamp(d.orig.height + dy, 24, H - d.orig.y)
    }
    onChangeElement?.(d.elId, patch)
  }

  const endDrag = () => {
    dragRef.current = null
    setSnapGuides({ x: null, y: null })
    unbindDrag()
  }

  return (
    <>
      {/* Offscreen natural-size copy for PNG export */}
      <div aria-hidden="true" style={{ position: 'fixed', left: -9999, top: 0, pointerEvents: 'none' }}>
        <div ref={captureRef}>{posterContent(false)}</div>
      </div>

      {/* Scaled, visible preview (and editing surface) */}
      <div
        ref={previewWrapRef}
        style={{ width: W * scale, height: H * scale, position: 'relative', overflow: 'hidden', flexShrink: 0 }}
      >
        <div style={{ width: W, height: H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          <div style={{ position: 'relative', width: W, height: H, ...bgStyle }} onPointerDown={editable ? () => onSelect?.(null) : undefined}>
            {showGrid && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  pointerEvents: 'none',
                  backgroundImage: 'linear-gradient(rgba(124,77,255,0.14) 1px, transparent 1px), linear-gradient(90deg, rgba(124,77,255,0.14) 1px, transparent 1px)',
                  backgroundSize: '54px 54px',
                }}
              />
            )}
            {template.elements.map((el, i) => renderElement(el, i, editable))}

            {/* Snap Alignment Guides */}
            {editable && snapGuides.x !== null && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  left: snapGuides.x,
                  width: 1,
                  background: '#7C4DFF',
                  pointerEvents: 'none',
                  zIndex: 99,
                }}
              />
            )}
            {editable && snapGuides.y !== null && (
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: snapGuides.y,
                  height: 1,
                  background: '#7C4DFF',
                  pointerEvents: 'none',
                  zIndex: 99,
                }}
              />
            )}
          </div>
        </div>
      </div>
    </>
  )
}