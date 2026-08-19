import { useRef } from 'react'
import { canvasFor, FONT_FAMILY_CSS, elementText, elementRows } from '../utils/posterTemplates'

const clamp = (v, min, max) => Math.min(Math.max(v, min), max)

// Renders a poster template with a data source at any scale. Every instance
// keeps a natural-size, non-scaled copy offscreen (via `captureRef`) that
// html2canvas uses for PNG export — the visible preview is a scaled clone.
export default function PosterStage({
  template,
  source,
  scale = 0.5,
  editable = false,
  selectedId = null,
  onSelect,
  onChangeElement,
  captureRef,
}) {
  const previewWrapRef = useRef(null)
  const dragRef = useRef(null)

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
    lineHeight: 1.15,
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
      patch.x = clamp(d.orig.x + dx, 0, W - d.orig.width)
      patch.y = clamp(d.orig.y + dy, 0, H - d.orig.height)
    } else {
      patch.width = clamp(d.orig.width + dx, 24, W - d.orig.x)
      patch.height = clamp(d.orig.height + dy, 24, H - d.orig.y)
    }
    onChangeElement?.(d.elId, patch)
  }

  const endDrag = () => {
    dragRef.current = null
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
          <div style={{ position: 'relative', width: W, height: H }} onPointerDown={editable ? () => onSelect?.(null) : undefined}>
            {template.elements.map((el, i) => renderElement(el, i, editable))}
          </div>
        </div>
      </div>
    </>
  )
}