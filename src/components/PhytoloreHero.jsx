import { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import HeroScene from './HeroScene'

// Official Rendezvous'26 Gradient Palette
const RENDEZVOUS_GRADIENT_STOPS = [
  { stop: 0.00, color: '#013157' },
  { stop: 0.16, color: '#017D8B' },
  { stop: 0.33, color: '#01B998' },
  { stop: 0.50, color: '#19BB47' },
  { stop: 0.66, color: '#64D431' },
  { stop: 0.83, color: '#AEE515' },
  { stop: 1.00, color: '#E2FA04' },
]

export default function PhytoloreHero({ onScrollToAbout }) {
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const navigate = useNavigate()

  // 11-step entrance sequence state (1 to 11)
  const [entranceStep, setEntranceStep] = useState(11)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0, targetX: 0, targetY: 0, canvasX: 0, canvasY: 0 })
  const [isHovered, setIsHovered] = useState(false)

  const prefersReducedMotion = useMemo(
    () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches,
    []
  )

  // 11-Step Entrance Timers
  useEffect(() => {
    if (prefersReducedMotion) {
      setEntranceStep(11)
      return
    }

    const t1 = setTimeout(() => setEntranceStep(2), 150)   // Deep blue/green glow
    const t2 = setTimeout(() => setEntranceStep(3), 500)   // Organic ribbon
    const t3 = setTimeout(() => setEntranceStep(4), 950)   // 🍃 Object 01: Large Leaf
    const t4 = setTimeout(() => setEntranceStep(5), 1400)  // 🌰 Object 03: Seed Pod
    const t5 = setTimeout(() => setEntranceStep(6), 1850)  // 🌳 Object 04: Tree Slice
    const t6 = setTimeout(() => setEntranceStep(7), 2300)  // 📜 Object 05: Herbarium Sheet
    const t7 = setTimeout(() => setEntranceStep(8), 2750)  // 🔍 Object 02: Magnifying Lens
    const t8 = setTimeout(() => setEntranceStep(9), 3200)  // RENDEZVOUS'26 Logo
    const t9 = setTimeout(() => setEntranceStep(10), 3650) // DECODING
    const t10 = setTimeout(() => setEntranceStep(11), 4200)// PHYTOLORE & Settle into idle focus

    return () => {
      clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); clearTimeout(t4);
      clearTimeout(t5); clearTimeout(t6); clearTimeout(t7); clearTimeout(t8);
      clearTimeout(t9); clearTimeout(t10);
    }
  }, [prefersReducedMotion])

  // Mouse & Touch Interaction Tracking
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!containerRef.current) return
      const rect = containerRef.current.getBoundingClientRect()
      const x = e.clientX - rect.left
      const y = e.clientY - rect.top
      const normX = (x / rect.width - 0.5) * 2
      const normY = (y / rect.height - 0.5) * 2

      setMousePos({
        targetX: normX,
        targetY: normY,
        canvasX: x,
        canvasY: y
      })
      setIsHovered(true)
    }

    const handleTouchMove = (e) => {
      if (!containerRef.current || !e.touches[0]) return
      const rect = containerRef.current.getBoundingClientRect()
      const touch = e.touches[0]
      const x = touch.clientX - rect.left
      const y = touch.clientY - rect.top
      const normX = (x / rect.width - 0.5) * 2
      const normY = (y / rect.height - 0.5) * 2

      setMousePos({
        targetX: normX,
        targetY: normY,
        canvasX: x,
        canvasY: y
      })
      setIsHovered(true)
    }

    const handleMouseLeave = () => {
      setMousePos(prev => ({ ...prev, targetX: 0, targetY: 0 }))
      setIsHovered(false)
    }

    const el = containerRef.current
    if (el) {
      el.addEventListener('mousemove', handleMouseMove, { passive: true })
      el.addEventListener('mouseleave', handleMouseLeave, { passive: true })
      el.addEventListener('touchmove', handleTouchMove, { passive: true })
      el.addEventListener('touchend', handleMouseLeave, { passive: true })
    }

    return () => {
      if (el) {
        el.removeEventListener('mousemove', handleMouseMove)
        el.removeEventListener('mouseleave', handleMouseLeave)
        el.removeEventListener('touchmove', handleTouchMove)
        el.removeEventListener('touchend', handleMouseLeave)
      }
    }
  }, [])

  // Canvas 2D / 3D Specimen Rendering Engine (Organic Ribbon, Atmospheric Haze, Pollen & Optical Decode)
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationFrameId = 0
    let width = 0
    let height = 0
    let time = 0

    let lerpX = 0
    let lerpY = 0

    // Smooth physical lens lerp position
    let lensX = 0
    let lensY = 0

    const handleResize = () => {
      if (!containerRef.current || !canvas) return
      const rect = containerRef.current.getBoundingClientRect()
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      width = rect.width
      height = rect.height
      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)
    }
    handleResize()
    window.addEventListener('resize', handleResize)

    // Floating Spore / Pollen Particles
    const pollen = Array.from({ length: 26 }, () => ({
      x: Math.random(),
      y: Math.random(),
      size: Math.random() * 2 + 1,
      speedY: Math.random() * 0.0003 + 0.0001,
      swaySpeed: Math.random() * 0.001 + 0.0005,
      phase: Math.random() * Math.PI * 2,
      opacity: Math.random() * 0.4 + 0.2,
    }))

    const render = () => {
      time += 0.012

      lerpX += (mousePos.targetX - lerpX) * 0.05
      lerpY += (mousePos.targetY - lerpY) * 0.05

      // Leaf center position in pixels
      const leafCenterX = width * 0.22 + lerpX * 25
      const leafCenterY = height * 0.38 + lerpY * 18

      // Lens physical target (follows cursor when hovered, floats near leaf otherwise)
      const targetLensX = isHovered && mousePos.canvasX ? mousePos.canvasX : width * 0.29 + Math.sin(time * 0.4) * 15
      const targetLensY = isHovered && mousePos.canvasY ? mousePos.canvasY : height * 0.45 + Math.cos(time * 0.35) * 15

      lensX += (targetLensX - lensX) * 0.06
      lensY += (targetLensY - lensY) * 0.06

      const distToLeaf = Math.hypot(lensX - leafCenterX, lensY - leafCenterY)
      const revealIntensity = Math.max(0, 1 - distToLeaf / (width * 0.35))

      ctx.clearRect(0, 0, width, height)

      // ── 1. CINEMATIC DARK BOTANICAL ATMOSPHERE (Layer 01) ──
      const bgGrad = ctx.createRadialGradient(
        width * 0.5 + lerpX * 20,
        height * 0.4 + lerpY * 15,
        width * 0.1,
        width * 0.5,
        height * 0.5,
        width * 0.85
      )
      bgGrad.addColorStop(0, '#031D28')
      bgGrad.addColorStop(0.5, '#011724')
      bgGrad.addColorStop(1, '#02090D')
      ctx.fillStyle = bgGrad
      ctx.fillRect(0, 0, width, height)

      // ── 2. ORGANIC VASCULAR GRADIENT RIBBON (Layer 04) ──
      if (entranceStep >= 3) {
        ctx.save()
        const ribbonGrad = ctx.createLinearGradient(0, height * 0.85, width, height * 0.15)
        RENDEZVOUS_GRADIENT_STOPS.forEach(s => ribbonGrad.addColorStop(s.stop, s.color))

        ctx.beginPath()
        const rSX = width * -0.05 + lerpX * 30
        const rSY = height * 0.8 + Math.sin(time * 0.4) * 18 + lerpY * 20
        const rCP1X = width * 0.3 + Math.cos(time * 0.5) * 30 + lerpX * 35
        const rCP1Y = height * 0.95 + Math.sin(time * 0.3) * 25 + lerpY * 30
        const rCP2X = width * 0.7 + Math.sin(time * 0.6) * 30 + lerpX * 45
        const rCP2Y = height * 0.15 + Math.cos(time * 0.4) * 25 + lerpY * 20
        const rEX = width * 1.05 + lerpX * 50
        const rEY = height * 0.4 + Math.sin(time * 0.5) * 18 + lerpY * 25

        ctx.moveTo(rSX, rSY)
        ctx.bezierCurveTo(rCP1X, rCP1Y, rCP2X, rCP2Y, rEX, rEY)

        ctx.strokeStyle = ribbonGrad
        ctx.lineWidth = Math.min(width * 0.022, 22)
        ctx.lineCap = 'round'
        ctx.shadowColor = '#64D431'
        ctx.shadowBlur = 18
        ctx.globalAlpha = 0.75
        ctx.stroke()
        ctx.restore()
      }

      // ── 3. OPTICAL DECODE EFFECT (Luminous Vein Glow inside Lens over Leaf) ──
      // Removed redundant 2D decode effect as it is now replaced by 3D GLB models in HeroScene

      // ── 4. FLOATING SPORE PARTICLES ──
      if (entranceStep >= 4) {
        ctx.save()
        pollen.forEach((p) => {
          p.y -= p.speedY
          if (p.y < -0.05) p.y = 1.05
          p.phase += p.swaySpeed

          let px = (p.x + Math.sin(p.phase) * 0.02) * width + lerpX * 30
          let py = p.y * height + lerpY * 20

          if (isHovered) {
            const dx = lensX - px
            const dy = lensY - py
            const dist = Math.hypot(dx, dy)
            if (dist < 200 && dist > 5) {
              px += (dx / dist) * 0.7
              py += (dy / dist) * 0.7
            }
          }

          ctx.beginPath()
          ctx.arc(px, py, p.size, 0, Math.PI * 2)
          ctx.fillStyle = p.size > 2 ? '#AEE515' : '#19BB47'
          ctx.globalAlpha = p.opacity
          ctx.shadowColor = '#64D431'
          ctx.shadowBlur = p.size * 3
          ctx.fill()
        })
        ctx.restore()
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render)
      }
    }

    render()

    return () => {
      cancelAnimationFrame(animationFrameId)
      window.removeEventListener('resize', handleResize)
    }
  }, [entranceStep, isHovered, mousePos, prefersReducedMotion])

  // Parallax Layer Transform Helper
  const layerTransform = (multiplier) => {
    if (prefersReducedMotion) return {}
    const tx = mousePos.targetX * multiplier * 25
    const ty = mousePos.targetY * multiplier * 18
    return {
      transform: `translate3d(${tx}px, ${ty}px, 0)`,
      transition: 'transform 0.2s cubic-bezier(0.1, 0.8, 0.3, 1)'
    }
  }

  return (
    <section
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden select-none flex flex-col justify-between"
      style={{ backgroundColor: 'var(--hero-bg-color)' }}
    >
      {/* Background Interactive WebGL/Canvas (Atmosphere, Ribbon, Pollen & Optical Decode) */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none z-0"
      />

      {/* Atmospheric Depth Glow Overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-0 transition-opacity duration-1000"
        style={{
          background: 'radial-gradient(circle at 50% 45%, rgba(1, 125, 139, 0.18) 0%, rgba(2, 9, 13, 0.88) 75%)',
          opacity: entranceStep >= 2 ? 1 : 0
        }}
      />

      {/* Top Curatorial Badge */}
      <div className="relative z-20 pt-20 sm:pt-24 px-4 text-center pointer-events-none">
        <span className="inline-block text-[10px] sm:text-xs font-mono uppercase tracking-[0.35em] text-[#01B998] opacity-85">
          ISRA RENDEZVOUS’26 · CURATORIAL EDITION
        </span>
      </div>

      {/* ── 3D GLB SPECIMEN OBJECTS LAYER ── */}
      <HeroScene entranceStep={entranceStep} mousePos={mousePos} />

      {/* ── CENTRAL DOMINANT EDITORIAL TYPOGRAPHY & BRANDING ── */}
      <div className="relative z-30 flex-1 flex flex-col items-center justify-center text-center px-4 max-w-5xl mx-auto w-full">
        
        {/* 1. RENDEZVOUS'26 Official Logo Mask Badge (Step 09) */}
        <div
          className="mb-4 sm:mb-6 transition-all duration-1000"
          style={{
            ...layerTransform(0.12),
            opacity: entranceStep >= 9 ? 1 : 0,
            transform: `${layerTransform(0.12).transform || ''} scale(${entranceStep >= 9 ? 1 : 0.92})`,
          }}
        >
          <img
            src="/rendezvous-hero-logo.png"
            alt="RENDEZVOUS 26"
            className="w-full max-w-[260px] sm:max-w-md md:max-w-lg lg:max-w-xl h-auto mx-auto select-none"
          />
        </div>

        {/* 1b. RENDEZVOUS 26 plain text label (Step 09) */}
        <div
          className="mb-2 sm:mb-3 transition-all duration-1000 pointer-events-none"
          style={{
            ...layerTransform(0.14),
            opacity: entranceStep >= 9 ? 1 : 0,
          }}
        >
          <span
            className="font-sora font-extrabold uppercase tracking-[0.25em] leading-none pointer-events-none select-none"
            style={{
              fontSize: 'clamp(0.65rem, 1.6vw, 1.1rem)',
              background: 'linear-gradient(90deg, #01B998, #64D431, #AEE515)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              filter: 'drop-shadow(0 0 18px rgba(100,212,49,0.35))',
            }}
          >
            RENDEZVOUS 26
          </span>
        </div>

        {/* 2. Primary Concept Title: DECODING PHYTOLORE (Step 10 & 11) */}
        <div
          className="transition-all duration-1000 my-2"
          style={{
            ...layerTransform(0.16),
            opacity: entranceStep >= 10 ? 1 : 0,
            transform: `${layerTransform(0.16).transform || ''} translateY(${entranceStep >= 10 ? 0 : 25}px)`
          }}
        >
          <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black font-brand uppercase tracking-tight text-white leading-none drop-shadow-2xl">
            <span className="block text-white drop-shadow-[0_10px_20px_rgba(0,0,0,0.9)]">DECODING</span>
            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#01B998] via-[#64D431] to-[#AEE515] drop-shadow-[0_0_35px_rgba(100,212,49,0.4)]">
              PHYTOLORE
            </span>
          </h1>

          <p className="text-xs sm:text-sm md:text-base font-mono uppercase tracking-[0.3em] text-[#64D431] mt-3 sm:mt-4 opacity-90 drop-shadow-md">
            OBSERVE &nbsp;·&nbsp; FOCUS &nbsp;·&nbsp; DECODE &nbsp;·&nbsp; REVEAL
          </p>
        </div>

        {/* 3. Action Buttons (Step 11) */}
        <div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 sm:gap-4 mt-6 sm:mt-8 transition-all duration-1000"
          style={{
            ...layerTransform(0.20),
            opacity: entranceStep >= 11 ? 1 : 0,
            transform: `${layerTransform(0.20).transform || ''} translateY(${entranceStep >= 11 ? 0 : 20}px)`
          }}
        >
          <button
            onClick={() => navigate('/results')}
            className="w-full sm:w-auto px-7 py-3 rounded-full font-bold text-sm sm:text-base text-black bg-gradient-to-r from-[#19BB47] via-[#64D431] to-[#AEE515] hover:opacity-95 transition-all shadow-[0_0_25px_rgba(100,212,49,0.45)] flex items-center justify-center gap-2 cursor-pointer group pointer-events-auto"
          >
            <span>View Results</span>
            <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
          </button>

          <button
            onClick={onScrollToAbout}
            className="w-full sm:w-auto px-7 py-3 rounded-full font-semibold text-sm sm:text-base text-white bg-black/50 hover:bg-black/70 border border-[#01B998]/40 hover:border-[#64D431] transition-all backdrop-blur-md cursor-pointer pointer-events-auto shadow-lg"
          >
            About Rendezvous
          </button>
        </div>

      </div>

      {/* ── BOTTOM "LOOK CLOSER" SCROLL INDICATOR ── */}
      <div
        className="relative z-30 pb-6 sm:pb-8 flex flex-col items-center justify-center text-center transition-all duration-1000 pointer-events-auto"
        style={{
          opacity: entranceStep >= 11 ? 1 : 0,
          transform: `translateY(${entranceStep >= 11 ? 0 : 15}px)`
        }}
      >
        <button
          onClick={onScrollToAbout}
          className="group flex flex-col items-center gap-2 text-mutedText hover:text-[#AEE515] transition cursor-pointer"
        >
          <span className="text-[11px] font-mono tracking-[0.35em] uppercase font-bold text-[#01B998] group-hover:text-[#AEE515] transition-colors">
            LOOK CLOSER
          </span>
          <div className="w-5 h-8 rounded-full border border-[#01B998]/40 flex items-start justify-center p-1 group-hover:border-[#64D431] transition-colors">
            <div className="w-1 h-2 rounded-full bg-[#64D431] animate-bounce mt-1" />
          </div>
        </button>
      </div>

    </section>
  )
}
