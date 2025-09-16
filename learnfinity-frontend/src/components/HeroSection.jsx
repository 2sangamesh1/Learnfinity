import React from 'react';
import { motion } from 'framer-motion';
import { FiArrowRight } from 'react-icons/fi';
import { Link } from 'react-router-dom';

const HeroSection = () => {
  const text = "Study Smarter, Not Harder.".split("");

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.05,
      },
    },
  };

  const childVariants = {
    hidden: {
      opacity: 0,
      y: 10,
    },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: "easeOut",
      },
    },
  };

  return (
    <div className="text-center flex flex-col items-center justify-center h-[calc(100vh-88px)] px-4">
      <motion.h1
        aria-label="Study Smarter, Not Harder."
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="text-5xl md:text-7xl font-bold tracking-tight mb-4 text-neutral-50"
      >
        {text.map((char, index) => (
          <motion.span
            key={index}
            variants={childVariants}
            style={{ display: 'inline-block' }}
          >
            {char === " " ? "\u00A0" : char}
          </motion.span>
        ))}
      </motion.h1>
      
      <motion.p 
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, delay: 1.8, ease: "easeOut" }}
        className="text-lg md:text-xl text-neutral-300 max-w-2xl mx-auto mb-8"
      >
        Your AI-powered study planner is here. Combine personalized planning, AI quizzes, and spaced repetition to ace your exams.
      </motion.p>
      
      <Link to="/signup">
        <motion.button 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.5, delay: 2.0, type: "spring", stiffness: 120 }}
          whileHover={{ scale: 1.05, boxShadow: "0px 10px 30px rgba(250, 204, 21, 0.4)" }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 bg-yellow-400 text-slate-900 font-bold py-4 px-8 rounded-full text-lg shadow-lg hover:bg-yellow-500 transition-colors"
        >
          Get Started Now <FiArrowRight />
        </motion.button>
      </Link>
    </div>
  );
};

export default HeroSection;