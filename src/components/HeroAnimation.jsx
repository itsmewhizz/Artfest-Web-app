import React from 'react'

export default function HeroAnimation({ spotlightImages = [] }) {
  // Use a set of 3 cards per row.
  const row1Images = spotlightImages.length > 0
    ? spotlightImages.slice(0, 3)
    : Array(3).fill({ imageURL: null })

  const row2Images = spotlightImages.length > 3
    ? spotlightImages.slice(3, 6)
    : spotlightImages.length > 0
      ? spotlightImages.slice(0, 3)
      : Array(3).fill({ imageURL: null })

  const getCardContent = (img) => (
    img?.imageURL ? (
      <img src={img.imageURL} alt="spotlight" className="hero-card-image" />
    ) : (
      <div className="hero-card-placeholder">&#128248;</div>
    )
  )

  // Each row renders its card set twice back-to-back so the translateX(-50%)
  // loop restarts seamlessly with no visible gap/jump.
  const renderRow = (images, direction) => (
    <div className="card-row">
      <div className={`marquee-track ${direction}`}>
        {[0, 1].map((copy) => (
          <div className="marquee-set" key={copy}>
            {images.map((img, i) => (
              <div
                key={i}
                className="hero-card swoop-entry"
                style={{
                  '--rot': `${(i % 3 - 1) * 6}deg`,
                  '--swoop-x': `${(i % 3 - 1) * 90}px`,
                  animationDelay: `${(i % 3) * 0.12}s`,
                }}
              >
                {getCardContent(img)}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )

  return (
    <>
      <style>{`
        .hero-animation-container {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 0;
          pointer-events: none;
        }

        .hero-animation-bg {
          position: absolute;
          inset: 0;
          background: radial-gradient(circle at center, #2872A1 0%, #1F5A80 100%);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          opacity: 0.9;
        }

        .hero-animation-glow {
          position: absolute;
          inset: -20%;
          background: radial-gradient(ellipse at center, rgba(132, 186, 225, 0.15) 0%, transparent 70%);
          filter: blur(80px);
          pointer-events: none;
          animation: heroGlowPulse 8s ease-in-out infinite;
        }

        @keyframes heroGlowPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }

        .hero-rows-container {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          flex-direction: column;
          z-index: 10;
        }

        .card-row {
          position: relative;
          height: 50%;
          width: 100%;
          display: flex;
          align-items: center;
          overflow: hidden;
        }

        .marquee-track {
          display: flex;
          width: max-content;
          will-change: transform;
        }

        .marquee-set {
          display: flex;
          align-items: center;
          gap: clamp(0.9rem, 2.6vw, 2.25rem);
          padding-right: clamp(0.9rem, 2.6vw, 2.25rem);
        }

        .marquee-set:last-child {
          padding-right: 0;
        }

        /*
          Seamless loop: track holds two identical sets, so -50% of the track
          width is exactly one set width — shifting by it lands pixel-perfect
          back on the same card sequence.
        */
        .drift-right {
          animation: driftRightLane 55s linear infinite;
        }

        .drift-left {
          animation: driftLeftLane 48s linear infinite;
        }

        @keyframes driftRightLane {
          from { transform: translateX(-50%); }
          to   { transform: translateX(0); }
        }

        @keyframes driftLeftLane {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }

        .hero-card {
          position: relative;
          width: clamp(5rem, 15.5vw, 14.5rem);
          aspect-ratio: 3 / 4;
          border-radius: 1.4rem;
          overflow: hidden;
          box-shadow: 0 30px 70px rgba(0, 0, 0, 0.5);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          will-change: transform, opacity;
          opacity: 0.7;
          flex-shrink: 0;
        }

        .hero-card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: brightness(0.9) contrast(1.1);
        }

        .hero-card-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: clamp(1.5rem, 5vw, 3.5rem);
          background: linear-gradient(135deg, #1F5A80 0%, #16405C 100%);
        }

        .swoop-entry {
          animation: heroSwoopIn 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes heroSwoopIn {
          0% {
            transform: translate(var(--swoop-x, 0), 100vh) scale(0.6) rotateZ(var(--rot, 0deg));
            opacity: 0;
          }
          100% {
            transform: translate(0, 0) scale(1) rotateZ(0deg);
            opacity: 0.7;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .drift-right,
          .drift-left {
            animation: none;
          }
          .swoop-entry {
            animation: none;
            opacity: 0.7;
          }
        }
      `}</style>

      <div className="hero-animation-container" aria-hidden>
        <div className="hero-animation-bg" />
        <div className="hero-animation-glow" />

        <div className="hero-rows-container">
          {/* Top Row - Moving Right */}
          {renderRow(row1Images, 'drift-right')}
          {/* Bottom Row - Moving Left */}
          {renderRow(row2Images, 'drift-left')}
        </div>
      </div>
    </>
  )
}
