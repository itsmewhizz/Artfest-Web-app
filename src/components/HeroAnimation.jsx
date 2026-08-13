export default function HeroAnimation({ spotlightImages = [] }) {
  const pool = spotlightImages.length > 0 ? spotlightImages : Array(6).fill({ imageURL: null })

  // Each row always gets 3 cards; cycle the pool so the rows stay full with
  // real content even when there are few featured images.
  const pick = (count, offset) =>
    Array.from({ length: count }, (_, i) => pool[(offset + i) % pool.length])

  const row1Images = pick(3, 0)
  const row2Images = pick(3, 3)

  const getCardContent = (img) =>
    img?.imageURL ? (
      <img src={img.imageURL} alt="spotlight" className="hero-card-image" />
    ) : (
      <div className="hero-card-placeholder" />
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
                  '--swoop-x': `${(i % 3 - 1) * 80}px`,
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
          z-index: 1;
          pointer-events: none;
        }

        .hero-animation-bg {
          position: absolute;
          inset: 0;
          background: linear-gradient(
            180deg,
            rgba(18, 58, 96, 0.55) 0%,
            rgba(31, 90, 128, 0.4) 50%,
            rgba(15, 42, 61, 0.55) 100%
          );
          opacity: 0.8;
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
          height: 44%;
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
          gap: clamp(1rem, 3vw, 2.5rem);
          padding-right: clamp(1rem, 3vw, 2.5rem);
        }

        .marquee-set:last-child {
          padding-right: 0;
        }

        /*
          Seamless loop: the track holds two identical sets, so shifting by
          -50% of the track width is exactly one set width — the restart lands
          pixel-perfect on the same card sequence.
        */
        .drift-right {
          animation: driftRightLane 28s linear infinite;
        }

        .drift-left {
          animation: driftLeftLane 28s linear infinite;
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
          width: clamp(7rem, 18vw, 16rem);
          aspect-ratio: 1 / 1;
          border-radius: 1.35rem;
          overflow: hidden;
          box-shadow: 0 24px 50px rgba(2, 12, 20, 0.45);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.16);
          will-change: transform, opacity;
          opacity: 0.75;
          flex-shrink: 0;
        }

        .hero-card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: brightness(0.92) contrast(1.05);
        }

        .hero-card-placeholder {
          width: 100%;
          height: 100%;
          background: linear-gradient(135deg, #1F5A80 0%, #16405C 100%);
        }

        .swoop-entry {
          animation: heroSwoopIn 1.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }

        @keyframes heroSwoopIn {
          0% {
            transform: translate(var(--swoop-x, 0), 100vh) scale(0.6) rotateZ(var(--rot, 0deg));
            opacity: 0;
          }
          100% {
            transform: translate(0, 0) scale(1) rotateZ(0deg);
            opacity: 0.75;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .drift-right,
          .drift-left {
            animation: none;
          }
          .swoop-entry {
            animation: none;
            opacity: 0.75;
          }
        }
      `}</style>

      <div className="hero-animation-container" aria-hidden>
        <div className="hero-animation-bg" />

        <div className="hero-rows-container">
          {/* Top Row - Moving Left → Right */}
          {renderRow(row1Images, 'drift-right')}
          {/* Bottom Row - Moving Right → Left */}
          {renderRow(row2Images, 'drift-left')}
        </div>
      </div>
    </>
  )
}