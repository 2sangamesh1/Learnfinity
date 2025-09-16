import React from 'react';
import { motion } from 'framer-motion';

// This component is responsible for displaying and animating the quotes.
const QuoteScroller = ({ quotes, speed = 25 }) => {
  // We duplicate the quotes array to create a seamless, infinite scrolling effect.
  const duplicatedQuotes = [...quotes, ...quotes];
  const duration = duplicatedQuotes.length * (100 / speed);

  return (
    <div className="relative w-full h-12 overflow-hidden">
      {/* This creates the fade effect on the left and right edges for a premium look */}
      <div className="absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-gray-800 to-transparent" />
      <div className="absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-gray-800 to-transparent" />

      <motion.div
        className="absolute top-0 left-0 flex h-full items-center"
        animate={{ x: ['0%', '-100%'] }}
        transition={{ ease: 'linear', duration: duration, repeat: Infinity }}
      >
        {duplicatedQuotes.map((quote, index) => (
          <p key={index} className="text-gray-400 text-md whitespace-nowrap px-10">
            <span className="text-gray-300 font-medium">{`"${quote.text}"`}</span> — {quote.author}
          </p>
        ))}
      </motion.div>
    </div>
  );
};

export default QuoteScroller;