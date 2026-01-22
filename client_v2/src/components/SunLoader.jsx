import React from 'react';

const SunLoader = () => {
    return (
        <div style={{
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
            background: 'linear-gradient(to bottom, #0f172a 0%, #312e81 100%)',
            display: 'flex', justifyContent: 'center', alignItems: 'center',
            zIndex: 9999, flexDirection: 'column', overflow: 'hidden'
        }}>
            <style>{`
        @keyframes rise {
          0% { transform: translateY(150px); opacity: 0; }
          40% { opacity: 1; }
          100% { transform: translateY(0); opacity: 1; }
        }
        @keyframes skyChange {
          0% { background: linear-gradient(to bottom, #0f172a 0%, #1e1b4b 100%); }
          100% { background: linear-gradient(to bottom, #1e3a8a 0%, #60a5fa 100%); }
        }
        @keyframes glow {
          0% { box-shadow: 0 0 20px 5px rgba(253, 186, 116, 0.4); }
          50% { box-shadow: 0 0 50px 20px rgba(253, 186, 116, 0.8); }
          100% { box-shadow: 0 0 20px 5px rgba(253, 186, 116, 0.4); }
        }
        .sun {
          width: 80px; height: 80px;
          background: linear-gradient(135deg, #fcd34d 0%, #fbbf24 100%);
          border-radius: 50%;
          animation: rise 5s ease-out forwards, glow 3s infinite;
          position: relative;
          z-index: 2;
          box-shadow: 0 0 30px rgba(251, 191, 36, 0.6);
        }
        .mountain {
          width: 200%; height: 200px;
          background: #0f172a;
          border-radius: 50% 50% 0 0;
          position: absolute;
          bottom: -100px;
          z-index: 3;
        }
      `}</style>

            {/* Sun */}
            <div className="sun"></div>

            {/* Mountain Silouette */}
            <div className="mountain"></div>

            <h2 style={{
                marginTop: '2rem', color: 'white', zIndex: 4,
                fontFamily: 'sans-serif', fontWeight: 300, fontSize: '1.2rem',
                opacity: 0, animation: 'fadeIn 2s ease-in 2s forwards'
            }}>
                Sun☀️Shine
            </h2>
        </div>
    );
};

export default SunLoader;
