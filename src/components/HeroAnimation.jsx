import React from 'react'

export default function HeroAnimation({ spotlightImages = [] }) {
  // We use a set of 3 cards per row.
  // Row 1: first 3 images. Row 2: next 3 images (or wrap around).
  const row1Images = spotlightImages.slice(0, 3)
  const row2Images = spotlightImages.length > 3
    ? spotlightImages.slice(3, 6)
    : spotlightImages.slice(0, 3)

  // Fallback for empty images
  const getCardContent = (img) => (
    img?.imageURL ? (
      <img src={img.imageURL} alt="spotlight" className="hero-card-image" />
    ) : (
      <div className="hero-card-placeholder">📸</div>
    )
  )

  return (
    <>
      <style>{`
        .hero-animation-container {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
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
          justify-content: center;
          gap: 60px; /* Spacing between the two rows */
          z-index: 10;
        }

        .card-row {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          height: 440px; /* Card height + some padding */
          position: relative;
          overflow: hidden;
        }

        .marquee-wrapper {
          display: flex;
          gap: 20px;
          will-change: transform;
          padding: 0 10px;
        }

        /*
           INFINITE SCROLL LOGIC:
           The wrapper contains [Set A][Set B].
           Set width = (3 cards * 320px) + (3 gaps * 20px) = 1020px.
        */
        .drift-right {
          animation: heroDriftRight 30s linear 1.8s infinite;
        }

        .drift-left {
          animation: heroDriftLeft 30s linear 1.8s infinite;
        }

        @keyframes heroDriftRight {
          0% { transform: translateX(-1020px); }
          100% { transform: translateX(0); }
        }

        @keyframes heroDriftLeft {
          0% { transform: translateX(0); }
          100% { transform: translateX(-1020px); }
        }

        .hero-card {
          position: relative;
          width: 320px;
          height: 420px;
          border-radius: 32px;
          overflow: hidden;
          box-shadow:
              0 30px 70px rgba(0, 0, 0, 0.5),
              inset 0 0 50px rgba(255, 255, 255, 0.05);
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
          font-size: 64px;
          background: linear-gradient(135deg, #1F5A80 0%, #16405C 100%);
        }

        /*
           Swoop-in entry animations.
           Cards swoop from bottom to their initial row position.
        */
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
          .drift-right, .drift-left {
            animation-duration: 120s; /* Significantly slow down */
          }
          .swoop-entry {
            animation: none;
            opacity: 0.7;
          }
        }

        @media (max-width: 1200px) {
          .hero-card { width: 260px; height: 360px; }
          .card-row { height: 380px; }
          .hero-rows-container { gap: 40px; }

          /* Adjusted for 260px width: (3*260) + (3*20) = 840px */
          .drift-right { animation-duration: 25s; }
          .drift-left { animation-duration: 25s; }
          @keyframes heroDriftRight {
            0% { transform: translateX(-840px); }
            100% { transform: translateX(0); }
          }
          @keyframes heroDriftLeft {
            0% { transform: translateX(0); }
            100% { transform: translateX(-840px); }
          }
        }

        @media (max-width: 768px) {
          .hero-card { width: 200px; height: 280px; }
          .card-row { height: 300px; }
          .hero-rows-container { gap: 20px; }

          /* Adjusted for 200px width: (3*200) + (3*20) = 660px */
          .drift-right { animation-duration: 20s; }
          .drift-left { animation-duration: 20s; }
          @keyframes heroDriftRight {
            0% { transform: translateX(-660px); }
            100% { transform: translateX(0); }
          }
          @keyframes heroDriftLeft {
            0% { transform: translateX(0); }
            100% { transform: translateX(-660px); }
          }
        }
      `}</style>

      <div className="hero-animation-container">
        <div className="hero-animation-bg" />
        <div className="hero-animation-glow" />

        <div className="hero-rows-container">
          {/* Top Row - Moving Right */}
          <div className="card-row row-top">
            <div className="marquee-wrapper drift-right">
              {[...row1Images, ...row1Images].map((img, i) => (
                <div
                  key={i}
                  className="hero-card swoop-entry"
                  style={{
                    '--rot': `${(i % 3 - 1) * 8}deg`,
                    '--swoop-x': `${(i % 3 - 1) * 120}px`,
                    animationDelay: `${(i % 3) * 0.15}s`
                  }}
                >
                  {getCardContent(img)}
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Row - Moving Left */}
          <div className="card-row row-bottom">
            <div className="marquee-wrapper drift-left">
              {[...row2Images, ...row2Images].map((img, i) => (
                <div
                  key={i}
                  className="hero-card swoop-entry"
                  style={{
                    '--rot': `${(i % 3 - 1) * -8}deg`,
                    '--swoop-x': `${(i % 3 - 1) * -120}px`,
                    animationDelay: `${(i % 3) * 0.15}s`
                  }}
                >
                  {getCardContent(img)}
                </div>
              ))}
            </div>
          </div>
        </div}
      </div>
    </>
  )
}
