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
          background: linear-gradient(135deg, #1F5A80 0%, #16405C 50%, #1F5A80 100%);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          opacity: 0.95;
        }

        .hero-animation-glow {
          position: absolute;
          inset: -20%;
          background: radial-gradient(ellipse at center, rgba(232, 132, 92, 0.12) 0%, transparent 70%);
          filter: blur(60px);
          pointer-events: none;
          animation: heroGlowPulse 6s ease-in-out infinite;
        }

        @keyframes heroGlowPulse {
          0%, 100% { opacity: 0.4; }
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
          width: 280px;
          height: 380px;
          border-radius: 28px;
          overflow: hidden;
          box-shadow: 
              0 20px 60px rgba(0, 0, 0, 0.4),
              inset 0 0 40px rgba(132, 186, 225, 0.08);
          backdrop-filter: blur(10px);
          -webkit-backdrop-filter: blur(10px);
          background: linear-gradient(135deg, rgba(31, 90, 128, 0.5), rgba(22, 64, 92, 0.6));
          border: 1px solid rgba(132, 186, 225, 0.15);
          transform-origin: center;
          filter: drop-shadow(0 10px 30px rgba(132, 186, 225, 0.08));
        }

        .hero-card::before {
          content: '';
          position: absolute;
          inset: 0;
          border-radius: 28px;
          background: linear-gradient(
              135deg,
              rgba(232, 132, 92, 0.2) 0%,
              transparent 40%,
              transparent 60%,
              rgba(132, 186, 225, 0.15) 100%
          );
          pointer-events: none;
          opacity: 0;
          animation: heroRimLight 4s ease-in-out infinite;
        }

        @keyframes heroRimLight {
          0%, 100% { opacity: 0; }
          50% { opacity: 1; }
        }

        .hero-card-placeholder {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 48px;
          background: linear-gradient(135deg, #16405C 0%, #1F5A80 100%);
        }

        .hero-card-image {
          width: 100%;
          height: 100%;
          object-fit: cover;
          filter: brightness(0.9) contrast(1.1);
        }

        /* Card 1 */
        .hero-card:nth-child(1) {
          animation: 
              heroSwoopIn1 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) 0s,
              heroSettleIn1 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 1.2s,
              heroSpreadOut1 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 2.2s,
              heroContinuousScroll1 20s linear 3.4s infinite;
        }

        @keyframes heroSwoopIn1 {
          0% {
            transform: translate(-100px, -150px) scale(0.6) rotateZ(-8deg);
            opacity: 0;
          }
          100% {
            transform: translate(-100px, 0) scale(1) rotateZ(0deg);
            opacity: 1;
          }
        }

        @keyframes heroSettleIn1 {
          0% { transform: translate(-100px, 0) scale(1); }
          50% { transform: translate(-100px, -15px) scale(1.02); }
          100% { transform: translate(-100px, 0) scale(1); }
        }

        @keyframes heroSpreadOut1 {
          0% { transform: translate(-100px, 0) scale(1); }
          100% { transform: translate(-280px, 0) scale(1); }
        }

        /* Card 2 */
        .hero-card:nth-child(2) {
          z-index: 20;
          animation: 
              heroSwoopIn2 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) 0.15s,
              heroSettleIn2 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 1.35s,
              heroSpreadOut2 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 2.35s,
              heroContinuousScroll2 20s linear 3.4s infinite;
        }

        @keyframes heroSwoopIn2 {
          0% {
            transform: translate(0, -180px) scale(0.5) rotateZ(0deg);
            opacity: 0;
          }
          100% {
            transform: translate(0, 0) scale(1) rotateZ(0deg);
            opacity: 1;
          }
        }

        @keyframes heroSettleIn2 {
          0% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(0, -18px) scale(1.03); }
          100% { transform: translate(0, 0) scale(1); }
        }

        @keyframes heroSpreadOut2 {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(0, 0) scale(1); }
        }

        /* Card 3 */
        .hero-card:nth-child(3) {
          animation: 
              heroSwoopIn3 1.2s cubic-bezier(0.34, 1.56, 0.64, 1) 0.3s,
              heroSettleIn3 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) 1.5s,
              heroSpreadOut3 1.2s cubic-bezier(0.25, 0.46, 0.45, 0.94) 2.5s,
              heroContinuousScroll3 20s linear 3.4s infinite;
        }

        @keyframes heroSwoopIn3 {
          0% {
            transform: translate(100px, -150px) scale(0.6) rotateZ(8deg);
            opacity: 0;
          }
          100% {
            transform: translate(100px, 0) scale(1) rotateZ(0deg);
            opacity: 1;
          }
        }

        @keyframes heroSettleIn3 {
          0% { transform: translate(100px, 0) scale(1); }
          50% { transform: translate(100px, -15px) scale(1.02); }
          100% { transform: translate(100px, 0) scale(1); }
        }

        @keyframes heroSpreadOut3 {
          0% { transform: translate(100px, 0) scale(1); }
          100% { transform: translate(280px, 0) scale(1); }
        }

        /* Continuous scroll animation - starts after spread out */
        @keyframes heroContinuousScroll1 {
          0% { transform: translate(-280px, 0) scale(1); }
          100% { transform: translate(600px, 0) scale(1); }
        }

        @keyframes heroContinuousScroll2 {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(880px, 0) scale(1); }
        }

        @keyframes heroContinuousScroll3 {
          0% { transform: translate(280px, 0) scale(1); }
          100% { transform: translate(1160px, 0) scale(1); }
        }

        @media (max-width: 1200px) {
          .hero-card {
            width: 240px;
            height: 340px;
            border-radius: 24px;
          }

          @keyframes heroSpreadOut1 {
            0% { transform: translate(-80px, 0) scale(1); }
            100% { transform: translate(-240px, 0) scale(1); }
          }

          @keyframes heroSpreadOut3 {
            0% { transform: translate(80px, 0) scale(1); }
            100% { transform: translate(240px, 0) scale(1); }
          }

          @keyframes heroSwoopIn1 {
            0% { transform: translate(-80px, -150px) scale(0.6) rotateZ(-8deg); opacity: 0; }
            100% { transform: translate(-80px, 0) scale(1) rotateZ(0deg); opacity: 1; }
          }

          @keyframes heroSettleIn1 {
            0% { transform: translate(-80px, 0) scale(1); }
            50% { transform: translate(-80px, -15px) scale(1.02); }
            100% { transform: translate(-80px, 0) scale(1); }
          }

          @keyframes heroSwoopIn3 {
            0% { transform: translate(80px, -150px) scale(0.6) rotateZ(8deg); opacity: 0; }
            100% { transform: translate(80px, 0) scale(1) rotateZ(0deg); opacity: 1; }
          }

          @keyframes heroSettleIn3 {
            0% { transform: translate(80px, 0) scale(1); }
            50% { transform: translate(80px, -15px) scale(1.02); }
            100% { transform: translate(80px, 0) scale(1); }
          }

          @keyframes heroContinuousScroll1 {
            0% { transform: translate(-240px, 0) scale(1); }
            100% { transform: translate(560px, 0) scale(1); }
          }

          @keyframes heroContinuousScroll2 {
            0% { transform: translate(0, 0) scale(1); }
            100% { transform: translate(800px, 0) scale(1); }
          }

          @keyframes heroContinuousScroll3 {
            0% { transform: translate(240px, 0) scale(1); }
            100% { transform: translate(1040px, 0) scale(1); }
          }
        }

        @media (max-width: 768px) {
          .hero-card {
            width: 200px;
            height: 300px;
            border-radius: 20px;
          }

          @keyframes heroSpreadOut1 {
            0% { transform: translate(-60px, 0) scale(1); }
            100% { transform: translate(-200px, 0) scale(1); }
          }

          @keyframes heroSpreadOut3 {
            0% { transform: translate(60px, 0) scale(1); }
            100% { transform: translate(200px, 0) scale(1); }
          }

          @keyframes heroSwoopIn1 {
            0% { transform: translate(-60px, -120px) scale(0.6) rotateZ(-8deg); opacity: 0; }
            100% { transform: translate(-60px, 0) scale(1) rotateZ(0deg); opacity: 1; }
          }

          @keyframes heroSettleIn1 {
            0% { transform: translate(-60px, 0) scale(1); }
            50% { transform: translate(-60px, -12px) scale(1.02); }
            100% { transform: translate(-60px, 0) scale(1); }
          }

          @keyframes heroSwoopIn3 {
            0% { transform: translate(60px, -120px) scale(0.6) rotateZ(8deg); opacity: 0; }
            100% { transform: translate(60px, 0) scale(1) rotateZ(0deg); opacity: 1; }
          }

          @keyframes heroSettleIn3 {
            0% { transform: translate(60px, 0) scale(1); }
            50% { transform: translate(60px, -12px) scale(1.02); }
            100% { transform: translate(60px, 0) scale(1); }
          }

          @keyframes heroContinuousScroll1 {
            0% { transform: translate(-200px, 0) scale(1); }
            100% { transform: translate(480px, 0) scale(1); }
          }

          @keyframes heroContinuousScroll2 {
            0% { transform: translate(0, 0) scale(1); }
            100% { transform: translate(680px, 0) scale(1); }
          }

          @keyframes heroContinuousScroll3 {
            0% { transform: translate(200px, 0) scale(1); }
            100% { transform: translate(880px, 0) scale(1); }
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
