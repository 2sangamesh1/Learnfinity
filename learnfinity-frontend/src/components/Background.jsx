import React from 'react';
import { motion } from 'framer-motion'; // This import is required for the animation

const Background = () => {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden">
      {/* This is the animated gradient */}
      <motion.div
        className="absolute inset-[-200%] w-[400%] h-[400%] bg-[conic-gradient(from_90deg_at_50%_50%,#1e1b4b_0%,#4338ca_50%,#1e1b4b_100%)]"
        animate={{
          transform: ['rotate(0deg)', 'rotate(360deg)'],
        }}
        transition={{
          duration: 20,
          ease: 'linear',
          repeat: Infinity,
        }}
      />
      {/* This adds the noise/grain texture for the "silky" feel */}
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg%20viewBox%3D%220%200%20700%20700%22%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%3E%3Cfilter%20id%3D%22noiseFilter%22%3E%3CfeTurbulence%20type%3D%22fractalNoise%22%20baseFrequency%3D%220.65%22%20numOctaves%3D%223%22%20stitchTiles%3D%22stitch%22%2F%3E%3C%2Ffilter%3E%3Crect%20width%3D%22100%25%22%20height%3D%22100%25%22%20filter%3D%22url(%23noiseFilter)%22%2F%3E%3C%2Fsvg%3E')] opacity-[0.15]"></div>
    </div>
  );
};

export default React.memo(Background);