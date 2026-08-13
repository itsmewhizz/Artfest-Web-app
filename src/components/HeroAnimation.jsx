import React from 'react'

export default function HeroAnimation({ spotlightImages = [] }) {
  // Get first 3 images, with fallback
  const cardImages = spotlightImages.slice(0, 3)

  // We duplicate the cards to create a seamless infinite loop
  const allCards = [...cardImages, ...cardImages]

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

        .hero-cards-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          will-change: transform;
          /* Drift starts after swoop-in (~1.6s) */
          animation: heroInfiniteDrift 30s linear 1.6s infinite;
        }

        @keyframes heroInfiniteDrift {
          0% { transform: translateX(0); }
          100% { transform: translateX(960px); }
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
          opacity: 0.7;
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
           Swoop In Animations
           Only applied to the first 3 cards.
           The clones (4-6) are pre-positioned to the left.
        */
        .hero-card:nth-child(1) {
          animation: heroSwoopIn1 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0s forwards;
        }
        @keyframes heroSwoopIn1 {
          0% { transform: translate(-320px, 100vh) scale(0.6) rotateZ(-12deg); opacity: 0; }
          100% { transform: translate(-320px, 0) scale(1) rotateZ(0deg); opacity: 0.7; }
        }

        .hero-card:nth-child(2) {
          z-index: 20;
          animation: heroSwoopIn2 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s forwards;
        }
        @keyframes heroSwoopIn2 {
          0% { transform: translate(0, 100vh) scale(0.5) rotateZ(0deg); opacity: 0; }
          100% { transform: translate(0, 0) scale(1) rotateZ(0deg); opacity: 0.7; }
        }

        .hero-card:nth-child(3) {
          animation: heroSwoopIn3 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s forwards;
        }
        @keyframes heroSwoopIn3 {
          0% { transform: translate(320px, 100vh) scale(0.6) rotateZ(12deg); opacity: 0; }
          100% { transform: translate(320px, 0) scale(1) rotateZ(0deg); opacity: 0.7; }
        }

        /*
           Clone Positions:
           Set A: -320, 0, 320
           Set B: -1280, -960, -640
        */
        .hero-card:nth-child(4) { transform: translate(-1280px, 0); }
        .hero-card:nth-child(5) { transform: translate(-960px, 0); }
        .hero-card:nth-child(6) { transform: translate(-640px, 0); }

        @media (max-width: 1200px) {
          .hero-card { width: 260px; height: 360px; }
          .hero-cards-wrapper { animation-duration: 25s; }
          @keyframes heroInfiniteDrift {
            0% { transform: translateX(0); }
            100% { transform: translateX(780px); }
          }
          /* Adjusted positions for 260px width */
          .hero-card:nth-child(1) { animation: heroSwoopIn1-sm 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0s forwards; }
          @keyframes heroSwoopIn1-sm { 0% { transform: translate(-260px, 100vh) scale(0.6); opacity: 0; } 100% { transform: translate(-260px, 0) scale(1); opacity: 0.7; } }
          .hero-card:nth-child(2) { animation: heroSwoopIn2-sm 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s forwards; }
          @keyframes heroSwoopIn2-sm { 0% { transform: translate(0, 100vh) scale(0.5); opacity: 0; } 100% { transform: translate(0, 0) scale(1); opacity: 0.7; } }
          .hero-card:nth-child(3) { animation: heroSwoopIn3-sm 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s forwards; }
          @keyframes heroSwoopIn3-sm { 0% { transform: translate(260px, 100vh) scale(0.6); opacity: 0; } 100% { transform: translate(260px, 0) scale(1); opacity: 0.7; } }
          .hero-card:nth-child(4) { transform: translate(-1040px, 0); }
          .hero-card:nth-child(5) { transform: translate(-780px, 0); }
          .hero-card:nth-child(6) { transform: translate(-520px, 0); }
        }

        @media (max-width: 768px) {
          .hero-card { width: 200px; height: 280px; }
          .hero-cards-wrapper { animation-duration: 20s; }
          @keyframes heroInfiniteDrift {
            0% { transform: translateX(0); }
            100% { transform: translateX(600px); }
          }
          /* Adjusted positions for 200px width */
          .hero-card:nth-child(1) { animation: heroSwoopIn1-xs 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0s forwards; }
          @keyframes heroSwoopIn1-xs { 0% { transform: translate(-200px, 100vh) scale(0.6); opacity: 0; } 100% { transform: translate(-200px, 0) scale(1); opacity: 0.7; } }
          .hero-card:nth-child(2) { animation: heroSwoopIn2-xs 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.2s forwards; }
          @keyframes heroSwoopIn2-xs { 0% { transform: translate(0, 100vh) scale(0.5); opacity: 0; } 100% { transform: translate(0, 0) scale(1); opacity: 0.7; } }
          .hero-card:nth-child(3) { animation: heroSwoopIn3-xs 1.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.4s forwards; }
          @keyframes heroSwoopIn3-xs { 0% { transform: translate(200px, 100vh) scale(0.6); opacity: 0; } 100% { transform: translate(200px, 0) scale(1); opacity: 0.7; } }
          .hero-card:nth-child(4) { transform: translate(-800px, 0); }
          .hero-card:nth-child(5) { transform: translate(-600px, 0); }
          .hero-card:nth-child(6) { transform: translate(-400px, 0); }
        }
      `}</style>

      <div className="hero-animation-container">
        <div className="hero-animation-bg" />
        <div className="hero-animation-glow" />

        <div className="hero-cards-wrapper">
          {allCards.map((img, i) => (
            <div key={i} className="hero-card">
              {img?.imageURL ? (
                <img src={img.imageURL} alt="spotlight" className="hero-card-image" />
              ) : (
                <div className="hero-card-placeholder">📸</div>
              )}
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
