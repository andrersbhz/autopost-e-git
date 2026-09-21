import React from 'react';

const SpaceBackground: React.FC = () => {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-black dark:block hidden">
      {/* Dynamic Deep Space Gradient with movement */}
      <div 
        className="absolute inset-0 opacity-50 bg-[radial-gradient(circle_at_50%_50%,#1a0033_0%,#000000_100%)]"
        style={{ animation: 'rotate-slow 60s linear infinite' }}
      ></div>

      
      {/* Animated Lilac Neons for depth */}
      <div className="absolute inset-0">
        <div className="absolute top-[20%] left-[10%] w-[60%] h-[60%] rounded-full bg-[#b57bff]/15 blur-[150px] animate-nebula-pulse"></div>
        <div className="absolute bottom-[10%] right-[5%] w-[50%] h-[50%] rounded-full bg-[#8a4dff]/15 blur-[130px] animate-nebula-pulse" style={{ animationDelay: '-5s' }}></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(circle_at_center,transparent_0%,rgba(5,0,15,0.8)_100%)]"></div>
      </div>

      {/* Animated stars layers with parallax/depth effect */}
      <div className="stars-container absolute inset-0">
        <div className="stars opacity-60"></div>
        <div className="stars2 opacity-40"></div>
        <div className="stars3 opacity-20"></div>
      </div>

      {/* Intense Neon Lights (Movement + Depth) */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div 
          className="absolute -top-[20%] -left-[10%] w-[100%] h-[100%] opacity-20 bg-[conic-gradient(from_0deg,transparent,rgba(181,123,255,0.14),transparent)]"
          style={{ animation: 'rotate-slow 40s linear infinite' }}
        ></div>
        <div 
          className="absolute -bottom-[20%] -right-[10%] w-[100%] h-[100%] opacity-15 bg-[conic-gradient(from_180deg,transparent,rgba(200,150,255,0.14),transparent)]"
          style={{ animation: 'rotate-slow 50s linear infinite reverse' }}
        ></div>
      </div>
      
      {/* Cosmic Dust with drifting movement */}
      <div className="absolute inset-0 opacity-30 mix-blend-screen" style={{ animation: 'drift 30s ease-in-out infinite' }}>
        <div className="cosmic-dust"></div>
      </div>

      {/* Edge depth shadow */}
      <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.8)]"></div>
    </div>
  );
};

export default SpaceBackground;
