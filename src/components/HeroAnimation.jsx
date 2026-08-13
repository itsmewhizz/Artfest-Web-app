import React from 'react'

export default function HeroAnimation({ spotlightImages = [] }) {
  // Get first 3 images, with fallback
  const cardImages = spotlightImages.slice(0, 3)

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
        }

        .hero-animation-bg {
          position: absolute;
          inset: 0;
          /* Deep violet-purple tone consistent with the site's palette */
          background: radial-gradient(circle at center, #3B2A5E 0%, #2D1B4E 100%);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          opacity: 0.9;
        }

        .hero-animation-glow {
          position: absolute;
          inset: -20%;
          background: radial-gradient(ellipse at center, rgba(138, 43, 226, 0.15) 0%, transparent 70%);
          filter: blur(80px);
          pointer-events: none;
          animation: heroGlowPulse 8s ease-in-out infinite;
        }

        @keyframes heroGlowPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.6; }
        }

        .hero-cards-container {
          position: relative;
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10;
        }

        .hero-card {
          position: absolute;
          width: 320px;
          height: 420px;
          border-radius: 32px;
          overflow: hidden;
          box-shadow:
              0 30px 70px rgba(0, 0, 0, 0.5),
              inset 0 0 50px rgba(255, 255, 255, 0.05);
          background: rgba(255, 255, 255, 0.05);
          border: 1px solid rgba(255, 255, 255, 0.15);
          transform-origin: center;
          will-change: transform, opacity;
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
          background: linear-gradient(135deg, #2D1B4E 0%, #1F1531 100%);
        }

        /*
           ANIMATION SEQUENCE:
           1. Swoop In: curved arc from bottom to settled position.
           2. Settle: gentle ease/bounce.
           3. Continuous Drift: slow linear movement to the right.
        */

        /* Card 1 */
        .hero-card:nth-child(1) {
          animation:
              heroSwoopIn1 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0s forwards,
              heroDrift1 30s linear 1.6s infinite;
        }

        @keyframes heroSwoopIn1 {
          0% {
            transform: translate(-300px, 100vh) scale(0.6) rotateZ(-12deg);
            opacity: 0;
          }
          100% {
            transform: translate(-320px, 0) scale(1) rotateZ(0deg);
            opacity: 1;
          }
        }

        @keyframes heroDrift1 {
          0% { transform: translate(-320px, 0) scale(1); }
          100% { transform: translate(100vw, 0) scale(1); }
        }

        /* Card 2 */
        .hero-card:nth-child(2) {
          z-index: 20;
          animation:
              heroSwoopIn2 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s forwards,
              heroDrift2 30s linear 1.8s infinite;
        }

        @keyframes heroSwoopIn2 {
          0% {
            transform: translate(0, 100vh) scale(0.5) rotateZ(0deg);
            opacity: 0;
          }
          100% {
            transform: translate(0, 0) scale(1) rotateZ(0deg);
            opacity: 1;
          }
        }

        @keyframes heroDrift2 {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(100vw, 0) scale(1); }
        }

        /* Card 3 */
        .hero-card:nth-child(3) {
          animation:
              heroSwoopIn3 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s forwards,
              heroDrift3 30s linear 2.0s infinite;
        }

        @keyframes heroSwoopIn3 {
          0% {
            transform: translate(300px, 100vh) scale(0.6) rotateZ(12deg);
            opacity: 0;
          }
          100% {
            transform: translate(320px, 0) scale(1) rotateZ(0deg);
            opacity: 1;
          }
        }

        @keyframes heroDrift3 {
          0% { transform: translate(320px, 0) scale(1); }
          100% { transform: translate(100vw + 320px, 0) scale(1); }
        }

        @media (max-width: 1200px) {
          .hero-card {
            width: 260px;
            height: 360px;
          }
          @keyframes heroSwoopIn1 {
            100% { transform: translate(-260px, 0) scale(1) rotateZ(0deg); opacity: 1; }
          }
          @keyframes heroDrift1 {
            0% { transform: translate(-260px, 0) scale(1); }
          }
          @keyframes heroSwoopIn3 {
            100% { transform: translate(260px, 0) scale(1) rotateZ(0deg); opacity: 1; }
          }
          @keyframes heroDrift3 {
            0% { transform: translate(260px, 0) scale(1); }
          }
        }

        @media (max-width: 768px) {
          .hero-card {
            width: 200px;
            height: 280px;
          }
          @keyframes heroSwoopIn1 {
            100% { transform: translate(-200px, 0) scale(1) rotateZ(0deg); opacity: 1; }
          }
          @keyframes heroDrift1 {
            0% { transform: translate(-200px, 0) scale(1); }
          }
          @keyframes heroSwoopIn3 {
            100% { transform: translate(200px, 0) scale(1) rotateZ(0deg); opacity: 1; }
          }
          @keyframes heroDrift3 {
            0% { transform: translate(200px, 0) scale(1); }
          }
        }
      `}</style>

      <div className="hero-animation-container">
        <div className="hero-animation-bg" />
        <div className="hero-animation-glow" />

        <div className="hero-cards-container">
          <div className="hero-card">
            {cardImages[0]?.imageURL ? (
              <img src={cardImages[0].imageURL} alt="spotlight" className="hero-card-image" />
            ) : (
              <div className="hero-card-placeholder">📸</div>
            )}
          </div>
          <div className="hero-card">
            {cardImages[1]?.imageURL ? (
              <img src={cardImages[1].imageURL} alt="spotlight" className="hero-card-image" />
            ) : (
              <div className="hero-card-placeholder">📸</div>
            )}
          </div>
          <div className="hero-card">
            {cardImages[2]?.imageURL ? (
              <img src={cardImages[2].imageURL} alt="spotlight" className="hero-card-image" />
            ) : (
              <div className="hero-card-placeholder">📸</div>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
